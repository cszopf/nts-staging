import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User, Phone, Building, ArrowRight, AlertCircle } from 'lucide-react';
import { WCTButton, WCTInput } from './WCTComponents';
import { supabase } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [resetMode, setResetMode] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    brokerage: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      if (resetMode) {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(formData.email, {
          redirectTo: window.location.origin,
        });
        if (resetError) throw resetError;
        setResetSuccess(true);
      } else if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.name,
              phone_number: formData.phone,
              brokerage: formData.brokerage
            }
          }
        });

        if (signUpError) throw signUpError;
        
        if (data.user) {
          setSignupSuccess(true);
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (signInError) throw signInError;
        onSuccess();
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let message = err.message || 'An error occurred during authentication';
      if (message === 'Invalid login credentials') {
        message = 'Invalid email or password. If you just signed up, please ensure you have confirmed your email address.';
      } else if (message === 'User already registered') {
        message = 'This email is already registered. Please try signing in instead. If you forgot your password, use the "Forgot Password" link.';
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="text-xl font-bold text-[#004EA8]">
              {resetSuccess ? 'Check Your Email' : resetMode ? 'Reset Password' : signupSuccess ? 'Account Created' : mode === 'signin' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {!signupSuccess && !resetMode && (
            /* Tabs */
            <div className="flex border-b border-gray-100">
              <button
                className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
                  mode === 'signin' ? 'text-[#004EA8]' : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setMode('signin')}
              >
                Sign In
                {mode === 'signin' && (
                  <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#004EA8]" />
                )}
              </button>
              <button
                className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
                  mode === 'signup' ? 'text-[#004EA8]' : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setMode('signup')}
              >
                Create Account
                {mode === 'signup' && (
                  <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#004EA8]" />
                )}
              </button>
            </div>
          )}

          {/* Content */}
          <div className="p-6 overflow-y-auto">
            {resetSuccess ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Mail className="w-8 h-8 text-[#004EA8]" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h3>
                <p className="text-gray-600 mb-8">
                  If an account exists, we have sent a password reset link to <span className="font-semibold text-gray-900">{formData.email}</span>.
                </p>
                <WCTButton onClick={() => { setResetMode(false); setResetSuccess(false); }} fullWidth>
                  Back to Sign In
                </WCTButton>
              </div>
            ) : signupSuccess ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Mail className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h3>
                <p className="text-gray-600 mb-8">
                  Welcome to World Class Title! We just sent a confirmation link to <span className="font-semibold text-gray-900">{formData.email}</span>. Please click the link in that email to activate your account.
                </p>
                <WCTButton onClick={onClose} fullWidth>
                  Close
                </WCTButton>
              </div>
            ) : (
              <>
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <p>{error}</p>
                  </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {resetMode ? (
                    <>
                      <p className="text-sm text-gray-600 mb-4">
                        Enter your email address and we'll send you a link to reset your password.
                      </p>
                      <WCTInput
                        label="Email Address"
                        icon={Mail}
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        required
                      />
                    </>
                  ) : (
                    <>
                      {mode === 'signup' && (
                        <>
                          <WCTInput
                            label="Full Name"
                            icon={User}
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            required
                          />
                          <WCTInput
                            label="Phone Number"
                            icon={Phone}
                            type="tel"
                            value={formData.phone}
                            onChange={e => setFormData({...formData, phone: e.target.value})}
                            required
                          />
                          <WCTInput
                            label="Brokerage"
                            icon={Building}
                            value={formData.brokerage}
                            onChange={e => setFormData({...formData, brokerage: e.target.value})}
                            required
                          />
                        </>
                      )}
                      
                      <WCTInput
                        label="Email Address"
                        icon={Mail}
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        required
                      />
                      
                      <WCTInput
                        label="Password"
                        icon={Lock}
                        type="password"
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                        required
                      />

                      {mode === 'signin' && (
                        <div className="flex justify-end">
                          <button 
                            type="button"
                            onClick={() => setResetMode(true)}
                            className="text-xs text-[#004EA8] hover:underline font-medium"
                          >
                            Forgot Password?
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  <div className="pt-2">
                    <WCTButton type="submit" fullWidth disabled={loading}>
                      {loading ? (
                        'Processing...'
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          {resetMode ? 'Send Reset Link' : mode === 'signin' ? 'Sign In' : 'Create Account'} 
                          <ArrowRight className="w-4 h-4" />
                        </span>
                      )}
                    </WCTButton>
                  </div>
                  
                  {resetMode && (
                    <button
                      type="button"
                      onClick={() => setResetMode(false)}
                      className="w-full text-center text-sm text-gray-500 hover:text-gray-700 mt-4"
                    >
                      Back to Sign In
                    </button>
                  )}

                  {!resetMode && (
                    <p className="text-xs text-center text-gray-400 mt-4">
                      By continuing, you agree to our Terms of Service and Privacy Policy.
                    </p>
                  )}
                </form>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

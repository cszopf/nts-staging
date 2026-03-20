import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, User, Phone, Building, ArrowRight, AlertCircle } from 'lucide-react';
import { WCTButton, WCTInput } from './WCTComponents';
import { supabase } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkSent, setLinkSent] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    name: '',
    phone: '',
    brokerage: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'signup') {
        // Sign up with magic link — creates account + sends link in one step
        const { error: signUpError } = await supabase.auth.signInWithOtp({
          email: formData.email,
          options: {
            data: {
              full_name: formData.name,
              phone_number: formData.phone,
              brokerage: formData.brokerage
            },
            emailRedirectTo: window.location.origin,
          }
        });

        if (signUpError) throw signUpError;
        setLinkSent(true);
      } else {
        // Sign in with magic link
        const { error: signInError } = await supabase.auth.signInWithOtp({
          email: formData.email,
          options: {
            emailRedirectTo: window.location.origin,
          }
        });

        if (signInError) throw signInError;
        setLinkSent(true);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setLinkSent(false);
    setError(null);
    setMode('signin');
    onClose();
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
              {linkSent ? 'Check Your Email' : mode === 'signin' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {!linkSent && (
            /* Tabs */
            <div className="flex border-b border-gray-100">
              <button
                className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
                  mode === 'signin' ? 'text-[#004EA8]' : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => { setMode('signin'); setError(null); }}
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
                onClick={() => { setMode('signup'); setError(null); }}
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
            {linkSent ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Mail className="w-8 h-8 text-[#004EA8]" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h3>
                <p className="text-gray-600 mb-8">
                  We sent a sign-in link to <span className="font-semibold text-gray-900">{formData.email}</span>. Click the link in that email to {mode === 'signup' ? 'activate your account' : 'sign in'}.
                </p>
                <p className="text-xs text-gray-400 mb-6">
                  The link expires in 1 hour. Check your spam folder if you don't see it.
                </p>
                <WCTButton onClick={handleClose} fullWidth variant="outline">
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

                  <p className="text-xs text-gray-500 text-center">
                    We'll email you a magic link — no password needed.
                  </p>

                  <div className="pt-2">
                    <WCTButton type="submit" fullWidth disabled={loading}>
                      {loading ? (
                        'Sending...'
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          {mode === 'signin' ? 'Send Magic Link' : 'Create Account'}
                          <ArrowRight className="w-4 h-4" />
                        </span>
                      )}
                    </WCTButton>
                  </div>

                  <p className="text-xs text-center text-gray-400 mt-4">
                    By continuing, you agree to our Terms of Service and Privacy Policy.
                  </p>
                </form>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

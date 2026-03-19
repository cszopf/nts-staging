import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Calculator, 
  Target, 
  Lock, 
  ChevronRight, 
  LogOut, 
  User as UserIcon,
  Sparkles,
  Shield,
  LayoutDashboard
} from 'lucide-react';
import { motion } from 'motion/react';
import { WCTButton, WCTCard } from '../components/WCTComponents';

const Home = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const hasProspectorAccess = user?.is_wct_vip || (user?.skip_trace_credits && user.skip_trace_credits > 0);
  const hasScrubberAccess = user?.membership_level === 'Paid' || user?.membership_level === 'MVP' || user?.is_admin || user?.membership_level === 'VIP';

  const firstName = user?.full_name ? user.full_name.split(' ')[0] : 'Agent';

  const handleProspectorClick = () => {
    if (hasProspectorAccess) {
      navigate('/prospector');
    } else {
      alert('Upgrade required. Please contact Hello@WorldClassTitle.com to unlock lead generation.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Top Navigation / Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#004EA8] rounded-lg flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <span className="font-montserrat font-bold text-[#004EA8] tracking-tight hidden sm:block">AGENT HUB</span>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-[#004EA8] transition-colors uppercase tracking-widest flex items-center gap-2"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </button>

            {/* Credits Badge */}
            <div className="bg-[#004EA8]/5 border border-[#004EA8]/10 px-3 py-1.5 rounded-full flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#004EA8]" />
              <span className="text-[11px] font-bold text-[#004EA8] uppercase tracking-wider">
                Skip Trace Credits: {user?.skip_trace_credits || 0}
              </span>
            </div>

            <div className="h-8 w-[1px] bg-slate-200 mx-1"></div>

            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end hidden sm:flex">
                <p className="text-xs font-bold text-slate-900">{user?.full_name || user?.email}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">
                  {user?.is_wct_vip ? 'VIP Member' : 'Standard Agent'}
                </p>
              </div>
              <button 
                onClick={() => signOut()}
                className="p-2 text-slate-400 hover:text-red-500 transition-colors bg-slate-50 rounded-lg"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="mb-12">
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold text-slate-900 mb-2"
          >
            Welcome back, {firstName}
          </motion.h1>
          <p className="text-slate-500">Select a tool below to grow your business today.</p>
        </div>

        {/* Action Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1: Net to Seller Estimate */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <WCTCard className="h-full flex flex-col p-8 bg-white border-none shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-[#004EA8]/5 rounded-2xl flex items-center justify-center mb-6">
                <Calculator className="w-7 h-7 text-[#004EA8]" />
              </div>
              
              <h2 className="text-xl font-bold text-slate-900 mb-3">Net to Seller Estimate</h2>
              <p className="text-slate-500 mb-8 flex-grow leading-relaxed">
                Generate closing estimates and show sellers their bottom line in 60 seconds.
              </p>

              <WCTButton 
                onClick={() => navigate('/calculator')}
                fullWidth
                className="bg-[#004EA8] hover:bg-[#003d82] h-12 text-sm font-bold uppercase tracking-widest"
              >
                Start Estimate
                <ChevronRight className="w-4 h-4 ml-1" />
              </WCTButton>
            </WCTCard>
          </motion.div>

          {/* Card 2: Neighborhood Prospector */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className={`h-full flex flex-col p-8 rounded-3xl transition-all duration-300 ${
              hasProspectorAccess 
                ? 'bg-white shadow-sm hover:shadow-md border-none' 
                : 'bg-gray-50 opacity-75 border border-slate-200'
            }`}>
              <div className="flex justify-between items-start mb-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                  hasProspectorAccess ? 'bg-[#004EA8]/5' : 'bg-slate-200'
                }`}>
                  <Target className={`w-7 h-7 ${hasProspectorAccess ? 'text-[#004EA8]' : 'text-slate-400'}`} />
                </div>
                {!hasProspectorAccess && (
                  <div className="bg-slate-200 p-2 rounded-lg">
                    <Lock className="w-4 h-4 text-slate-500" />
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2 mb-3">
                <h2 className={`text-xl font-bold ${hasProspectorAccess ? 'text-slate-900' : 'text-slate-500'}`}>
                  Neighborhood Prospector
                </h2>
                {!hasProspectorAccess && <Lock className="w-4 h-4 text-slate-400" />}
              </div>
              
              <p className="text-slate-500 mb-8 flex-grow leading-relaxed">
                Pull high-probability seller leads and instantly unlock contact info.
              </p>

              {hasProspectorAccess ? (
                <WCTButton 
                  onClick={handleProspectorClick}
                  fullWidth
                  className="bg-[#004EA8] hover:bg-[#003d82] h-12 text-sm font-bold uppercase tracking-widest"
                >
                  Find Leads
                  <ChevronRight className="w-4 h-4 ml-1" />
                </WCTButton>
              ) : (
                <WCTButton 
                  onClick={handleProspectorClick}
                  fullWidth
                  variant="outline"
                  className="h-12 text-sm font-bold uppercase tracking-widest border-slate-300 text-slate-400 hover:bg-transparent cursor-not-allowed"
                >
                  Premium Feature - Locked
                </WCTButton>
              )}
            </div>
          </motion.div>

          {/* Card 3: Contact Scrubber */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className={`h-full flex flex-col p-8 rounded-3xl transition-all duration-300 ${
              hasScrubberAccess 
                ? 'bg-white shadow-sm hover:shadow-md border-none' 
                : 'bg-gray-50 opacity-75 border border-slate-200'
            }`}>
              <div className="flex justify-between items-start mb-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                  hasScrubberAccess ? 'bg-[#004EA8]/5' : 'bg-slate-200'
                }`}>
                  <Shield className={`w-7 h-7 ${hasScrubberAccess ? 'text-[#004EA8]' : 'text-slate-400'}`} />
                </div>
                {!hasScrubberAccess && (
                  <div className="bg-slate-200 p-2 rounded-lg">
                    <Lock className="w-4 h-4 text-slate-500" />
                  </div>
                )}
              </div>
              
              <h2 className="text-xl font-bold text-slate-900 mb-3">Contact Scrubber</h2>
              <p className="text-slate-500 mb-8 flex-grow leading-relaxed">
                Upload your database to identify who in your sphere is most likely to sell.
              </p>

              <WCTButton 
                onClick={() => navigate('/scrubber')}
                fullWidth
                variant={hasScrubberAccess ? 'primary' : 'outline'}
                className={`h-12 text-sm font-bold uppercase tracking-widest ${
                  !hasScrubberAccess ? 'border-slate-200 text-slate-400' : ''
                }`}
              >
                {hasScrubberAccess ? 'Scrub Contacts' : 'Upgrade to Unlock'}
                <ChevronRight className="w-4 h-4 ml-1" />
              </WCTButton>
            </div>
          </motion.div>
        </div>

        {/* Admin Link (Conditional) */}
        {user?.is_admin && (
          <div className="mt-12 pt-8 border-t border-slate-200 flex justify-center">
            <button 
              onClick={() => navigate('/admin')}
              className="flex items-center gap-2 text-slate-400 hover:text-[#004EA8] transition-colors text-xs font-bold uppercase tracking-widest"
            >
              <Shield className="w-4 h-4" />
              Access Admin Dashboard
            </button>
          </div>
        )}
      </main>

      {/* Footer Branding */}
      <footer className="py-12 text-center">
        <p className="text-[10px] text-slate-400 uppercase tracking-[2px] font-bold">
          Built by Smart, exclusively for World Class Title
        </p>
      </footer>
    </div>
  );
};

export default Home;

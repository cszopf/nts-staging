import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from '../components/AuthModal';
import { motion } from 'motion/react';
import {
  Check,
  ChevronLeft,
  Sparkles,
  Target,
  Shield,
  Zap,
  Building2,
  LayoutDashboard
} from 'lucide-react';
import { WCTButton } from '../components/WCTComponents';

const PLANS = [
  {
    name: 'Starter',
    price: 49,
    priceId: 'price_1TCo5UHeCwA1mbZB1xLEn9Su',
    credits: 100,
    icon: Zap,
    features: [
      '100 skip trace credits/month',
      '1 state coverage',
      'Net-to-Seller calculator',
      'AI email summaries',
      'PDF exports',
    ],
    popular: false,
  },
  {
    name: 'Professional',
    price: 149,
    priceId: 'price_1TCo5bHeCwA1mbZB3qptCbTz',
    credits: 400,
    icon: Target,
    features: [
      '400 skip trace credits/month',
      '3 state coverage',
      'Neighborhood Prospector',
      'Contact Scrubber',
      'CSV lead exports',
      'Priority support',
    ],
    popular: true,
  },
  {
    name: 'Agency',
    price: 399,
    priceId: 'price_1TCo5fHeCwA1mbZBSVEGAiN8',
    credits: 1500,
    icon: Shield,
    features: [
      '1,500 skip trace credits/month',
      '10 state coverage',
      'Everything in Professional',
      'Team seats',
      'White-label reports',
      'VIP access',
    ],
    popular: false,
  },
  {
    name: 'Enterprise',
    price: 999,
    priceId: 'price_1TCo5lHeCwA1mbZBwhb2unde',
    credits: 5000,
    icon: Building2,
    features: [
      '5,000 skip trace credits/month',
      'National coverage (all states)',
      'Everything in Agency',
      'Full platform access',
      'Dedicated account manager',
      'Custom integrations',
    ],
    popular: false,
  },
];

const Pricing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSelectPlan = async (priceId: string) => {
    if (!user) {
      setShowAuth(true);
      return;
    }

    setLoadingPlan(priceId);
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          userId: user.id,
          email: user.email,
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Failed to create checkout session: ' + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-slate-500 hover:text-[#004EA8] transition-colors text-xs uppercase tracking-widest font-bold"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#004EA8] rounded-lg flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <span className="font-montserrat font-bold text-[#004EA8] tracking-tight hidden sm:block">AGENT HUB</span>
          </div>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-[#004EA8]/5 px-4 py-2 rounded-full mb-6"
          >
            <Sparkles className="w-4 h-4 text-[#004EA8]" />
            <span className="text-xs font-bold text-[#004EA8] uppercase tracking-widest">Upgrade Your Toolkit</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl font-bold text-slate-900 mb-4"
          >
            Choose Your Plan
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-slate-500 max-w-xl mx-auto"
          >
            Unlock Neighborhood Prospector, Contact Scrubber, and skip trace credits to find and convert more seller leads.
          </motion.p>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLANS.map((plan, idx) => {
            const Icon = plan.icon;
            const isCurrentPlan = user?.membership_level === plan.name;

            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * idx }}
                className={`relative rounded-3xl p-8 flex flex-col ${
                  plan.popular
                    ? 'bg-[#004EA8] text-white shadow-xl shadow-[#004EA8]/20 ring-2 ring-[#004EA8]'
                    : 'bg-white border border-slate-200 shadow-sm'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#64CCC9] text-white text-[10px] font-bold uppercase tracking-widest px-4 py-1 rounded-full">
                    Most Popular
                  </div>
                )}

                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${
                  plan.popular ? 'bg-white/10' : 'bg-[#004EA8]/5'
                }`}>
                  <Icon className={`w-6 h-6 ${plan.popular ? 'text-white' : 'text-[#004EA8]'}`} />
                </div>

                <h3 className={`text-lg font-bold mb-1 ${plan.popular ? 'text-white' : 'text-slate-900'}`}>
                  {plan.name}
                </h3>
                <div className="mb-6">
                  <span className={`text-4xl font-bold ${plan.popular ? 'text-white' : 'text-slate-900'}`}>
                    ${plan.price}
                  </span>
                  <span className={`text-sm ${plan.popular ? 'text-white/60' : 'text-slate-400'}`}>/month</span>
                </div>

                <ul className="space-y-3 mb-8 flex-grow">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className={`w-4 h-4 mt-0.5 shrink-0 ${plan.popular ? 'text-[#64CCC9]' : 'text-[#64CCC9]'}`} />
                      <span className={`text-sm ${plan.popular ? 'text-white/80' : 'text-slate-600'}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <WCTButton
                  onClick={() => handleSelectPlan(plan.priceId)}
                  disabled={isCurrentPlan || loadingPlan === plan.priceId}
                  fullWidth
                  className={`h-12 text-sm font-bold uppercase tracking-widest ${
                    plan.popular
                      ? 'bg-white text-[#004EA8] hover:bg-white/90'
                      : isCurrentPlan
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-[#004EA8] hover:bg-[#003d82]'
                  }`}
                >
                  {loadingPlan === plan.priceId
                    ? 'Loading...'
                    : isCurrentPlan
                      ? 'Current Plan'
                      : 'Get Started'}
                </WCTButton>
              </motion.div>
            );
          })}
        </div>

        {/* FAQ / Note */}
        <div className="mt-16 text-center">
          <p className="text-sm text-slate-400">
            All plans include the Net-to-Seller calculator. Cancel anytime. Credits reset monthly.
          </p>
          <p className="text-sm text-slate-400 mt-2">
            Need a custom plan? Contact{' '}
            <a href="mailto:Hello@WorldClassTitle.com" className="text-[#004EA8] hover:underline">
              Hello@WorldClassTitle.com
            </a>
          </p>
        </div>
      </main>

      <footer className="py-12 text-center">
        <p className="text-[10px] text-slate-400 uppercase tracking-[2px] font-bold">
          Built by Smart, exclusively for World Class Title
        </p>
      </footer>

      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        onSuccess={() => setShowAuth(false)}
      />
    </div>
  );
};

export default Pricing;

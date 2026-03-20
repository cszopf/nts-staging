import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Target, 
  Search, 
  ArrowRight, 
  AlertTriangle, 
  RefreshCw, 
  Download,
  LayoutDashboard,
  LogOut,
  Sparkles,
  ChevronLeft,
  Shield
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { WCTCard, WCTButton, WCTAlert } from '../components/WCTComponents';
import { AddressAutocomplete } from '../components/AddressAutocomplete';
import { ProspectCard } from '../components/ProspectCard';
import { supabase } from '../lib/supabase';

const thinkingMessages = [
  "Analyzing neighborhood turnover...",
  "Scanning county tax records...",
  "Calculating equity positions...",
  "Identifying high-probability sellers...",
  "Finalizing your lead list..."
];

const NeighborhoodProspector = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  
  const [addressData, setAddressData] = useState<any>(null);
  const [isLoadingProspects, setIsLoadingProspects] = useState(false);
  const [prospects, setProspects] = useState<any[]>([]);
  const [unlockedLeads, setUnlockedLeads] = useState<any[]>([]);
  const [prospectsError, setProspectsError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [thinkingStep, setThinkingStep] = useState(0);

  useEffect(() => {
    if (user?.id) {
      fetchUnlockedLeads();
    }
  }, [user?.id]);

  const fetchUnlockedLeads = async () => {
    const { data, error } = await supabase
      .from('unlocked_leads')
      .select('*')
      .eq('user_id', user.id);
    
    if (!error && data) {
      setUnlockedLeads(data);
    }
  };

  useEffect(() => {
    let interval: any;
    if (isLoadingProspects) {
      interval = setInterval(() => {
        setThinkingStep(prev => (prev + 1) % thinkingMessages.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isLoadingProspects]);

  const handleAddressSelect = (place: any) => {
    const location = place.location || (place.geometry && place.geometry.location);
    const lat = typeof location?.lat === 'function' ? location.lat() : location?.lat;
    const lng = typeof location?.lng === 'function' ? location.lng() : location?.lng;

    setAddressData({
      addressFull: place.formattedAddress || place.formatted_address,
      lat,
      lng
    });
    setHasSearched(false);
    setProspects([]);
    setProspectsError(null);
  };

  const handleFetchProspects = async () => {
    if (!addressData?.lat || !addressData?.lng) return;
    
    setIsLoadingProspects(true);
    setProspectsError(null);
    try {
      const res = await fetch('/api/net-to-seller/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: addressData.lat, lng: addressData.lng })
      });
      const data = await res.json();
      
      if (data.success) {
        setProspects(data.prospects);
        
        // Silent background save to Supabase
        if (user?.id && data.prospects && data.prospects.length > 0) {
          supabase.from('agent_searches').insert({
            user_id: user.id,
            target_address: addressData.addressFull,
            prospect_data: data.prospects
          }).then(({ error }) => {
            if (error) console.error('Silent background save failed:', error);
          });
        }
      } else {
        setProspectsError(data.errorDetail || 'Failed to fetch prospects');
      }
      setHasSearched(true);
    } catch (err: any) {
      console.error("Error fetching prospects:", err);
      setProspectsError(err.message);
    } finally {
      setIsLoadingProspects(false);
    }
  };

  const handleDownloadCSV = () => {
    if (prospects.length === 0) return;
    
    const headers = ['Owner Name', 'Property Address', 'Sell Score', 'Tags'];
    const rows = prospects.map(p => [
      p.ownerName,
      p.address?.oneLine || p.address,
      p.sellScore,
      p.tags.join('; ')
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Prospects_${addressData.addressFull.replace(/[^a-z0-9]/gi, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-[#004EA8]">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#004EA8] rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <span className="font-montserrat font-bold text-[#004EA8] tracking-tight hidden sm:block">PROSPECTOR</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/scrubber')}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-[#004EA8] transition-colors uppercase tracking-widest flex items-center gap-2"
            >
              <Shield className="w-4 h-4" />
              Scrubber
            </button>

            <button 
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-[#004EA8] transition-colors uppercase tracking-widest flex items-center gap-2"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </button>

            <div className="bg-[#004EA8]/5 border border-[#004EA8]/10 px-3 py-1.5 rounded-full flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#004EA8]" />
              <span className="text-[11px] font-bold text-[#004EA8] uppercase tracking-wider">
                Credits: {user?.credit_balance || 0}
              </span>
            </div>
            <button 
              onClick={() => signOut()}
              className="p-2 text-slate-400 hover:text-red-500 transition-colors bg-slate-50 rounded-lg"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Neighborhood Prospector</h1>
          <p className="text-slate-500 max-w-2xl mx-auto">
            Enter an address to identify the top 10 most likely sellers in that immediate area using our predictive AI models.
          </p>
        </div>

        <WCTCard className="p-8 mb-12 bg-white border-none shadow-sm">
          <div className="space-y-6">
            <AddressAutocomplete 
              label="Target Neighborhood (Search Address)" 
              onAddressSelect={handleAddressSelect} 
            />
            
            {addressData && !hasSearched && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-center pt-4"
              >
                <WCTButton 
                  onClick={handleFetchProspects}
                  disabled={isLoadingProspects}
                  className="bg-[#004EA8] hover:bg-[#003d82] px-12 py-4 text-sm font-bold uppercase tracking-widest h-auto"
                >
                  {isLoadingProspects ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Search className="w-4 h-4 mr-2" />
                  )}
                  {isLoadingProspects ? 'Analyzing Neighborhood...' : 'Find High-Probability Leads'}
                </WCTButton>
              </motion.div>
            )}
          </div>
        </WCTCard>

        <AnimatePresence mode="wait">
          {isLoadingProspects ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-20 text-center"
            >
              <div className="w-16 h-16 border-4 border-[#004EA8]/10 border-t-[#004EA8] rounded-full mx-auto mb-8 animate-spin" />
              <motion.p 
                key={thinkingStep}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-xl font-bold text-[#004EA8]"
              >
                {thinkingMessages[thinkingStep]}
              </motion.p>
            </motion.div>
          ) : hasSearched ? (
            <motion.div 
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {prospectsError ? (
                <div className="p-8 bg-red-50 border border-red-200 rounded-3xl text-center">
                  <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-red-900 mb-2">Search Failed</h3>
                  <p className="text-red-700 mb-6">{prospectsError}</p>
                  <WCTButton onClick={handleFetchProspects} variant="outline" className="border-red-200 text-red-700 hover:bg-red-100">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </WCTButton>
                </div>
              ) : prospects.length > 0 ? (
                <>
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-900">
                      {prospects.length} Top Prospects Found
                    </h2>
                    <WCTButton variant="outline" onClick={handleDownloadCSV} className="text-xs h-9">
                      <Download className="w-3.5 h-3.5 mr-2" />
                      Export CSV
                    </WCTButton>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {prospects.map((prospect, idx) => {
                      const address = prospect.address?.oneLine || prospect.address;
                      const unlockedData = unlockedLeads.find(ul => ul.property_address === address);
                      
                      return (
                        <ProspectCard 
                          key={idx} 
                          lead={prospect} 
                          idx={idx} 
                          initialUnlockedData={unlockedData ? {
                            phones: unlockedData.phones,
                            emails: unlockedData.emails,
                            unmaskedName: unlockedData.owner_name,
                            unmaskedAddress: unlockedData.property_address
                          } : null}
                        />
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                  <p className="text-slate-400 font-medium">No high-probability leads found in this immediate area.</p>
                </div>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>

      <footer className="py-12 text-center">
        <p className="text-[10px] text-slate-400 uppercase tracking-[2px] font-bold">
          Built by Smart, exclusively for World Class Title
        </p>
      </footer>
    </div>
  );
};

export default NeighborhoodProspector;

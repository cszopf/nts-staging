import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Mail, Sparkles, Loader2, Phone, MessageSquare } from 'lucide-react';
import { WCTCard, WCTButton } from './WCTComponents';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface ProspectCardProps {
  lead: any;
  idx: number;
  initialUnlockedData?: any;
}

const maskName = (name: string) => {
  if (!name) return "";
  const parts = name.trim().split(' ');
  if (parts.length <= 1) return name;
  const firstName = parts[0];
  const restMasked = parts.slice(1).map(p => p[0] + '***').join(' ');
  return `${firstName} ${restMasked}`;
};

const maskAddress = (address: string) => {
  if (!address) return "";
  return address.replace(/^\S+/, '****');
};

export const ProspectCard: React.FC<ProspectCardProps> = ({ lead, idx, initialUnlockedData }) => {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [liveData, setLiveData] = useState<any>(initialUnlockedData || null);

  useEffect(() => {
    if (liveData?.phones?.length > 0) {
      console.log('ProspectCard: Live data received, expanding UI...', liveData.phones);
    }
  }, [liveData]);

  const isLocked = !user?.is_wct_vip && !liveData;

  const handleUnlock = async () => {
    if (!user) {
      navigate('/pricing');
      return;
    }

    const hasCredits = user?.is_wct_vip || (user?.skip_trace_credits || 0) > 0;
    if (!hasCredits) {
      navigate('/pricing');
      return;
    }

    setIsUnlocking(true);
    try {
      const address = lead.address?.line1 || '';
      const locality = lead.address?.locality || '';
      const zip = lead.address?.postal1 || '43230';

      const payload = {
        address,
        locality,
        zip
      };

      console.log('Sending to Skip Trace:', payload);

      const { data, error } = await supabase.functions.invoke('skip-trace', {
        body: payload
      });
      
      console.log('LIVE DATA RECEIVED:', data);

      if (error || data?.error) {
        console.error("SKIP TRACE ERROR:", error || data);
        setLiveData({
          phones: [],
          emails: [],
          unmaskedName: lead.ownerName,
          unmaskedAddress: lead.address?.oneLine
        });
        return;
      }
      
      let phones = data.phones || [];
      let emails = data.emails || [];

      setLiveData({
        phones,
        emails,
        unmaskedName: data.unmaskedName || lead.ownerName,
        unmaskedAddress: data.unmaskedAddress || lead.address?.oneLine
      }); 
      
      await refreshProfile();
      
    } catch (err: any) {
      console.error("Skip trace failed:", err);
      setLiveData({
        phones: [],
        emails: [],
        unmaskedName: lead.ownerName,
        unmaskedAddress: lead.address?.oneLine
      });
    } finally {
      setIsUnlocking(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.05 }}
    >
      <WCTCard className="p-4 border border-[#A2B2C8]/20 hover:border-[#004EA8]/30 transition-colors shadow-sm hover:shadow-md">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-bold text-[#004EA8]">
                {isLocked ? maskName(lead.ownerName) : lead.ownerName}
              </p>
              {idx < 3 && <span title="High probability lead">🔥</span>}
            </div>
            
            {/* Live Data Display with Animation */}
            <AnimatePresence>
              {liveData && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-3 overflow-hidden"
                >
                  <div className="space-y-2 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Contact Information</p>
                      {liveData.phones && liveData.phones.length > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-tighter">Live</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Phones List */}
                    {liveData.phones && liveData.phones.length > 0 && (
                      <div className="flex flex-col gap-2">
                        {liveData.phones.filter((p: any) => p?.number).map((phone: any, pIdx: number) => (
                          <div key={pIdx} className="flex items-center justify-between gap-2 text-xs text-emerald-700 font-medium">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <Phone className="w-3 h-3 text-emerald-600" />
                                <span className="font-mono tracking-tight">{phone.number}</span>
                              </div>
                              
                              <div className="flex items-center gap-1.5">
                                <a 
                                  href={`tel:${phone?.number?.replace(/\D/g, '') || ''}`}
                                  className="p-1.5 bg-emerald-100 text-emerald-700 rounded-md hover:bg-emerald-200 transition-colors"
                                  title="Call"
                                >
                                  <Phone className="w-3 h-3" />
                                </a>
                                <a 
                                  href={`sms:${phone?.number?.replace(/\D/g, '') || ''}`}
                                  className="p-1.5 bg-emerald-100 text-emerald-700 rounded-md hover:bg-emerald-200 transition-colors"
                                  title="Text"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                </a>
                              </div>

                              {phone.type && phone.type !== 'unknown' && (
                                <span className="text-[9px] opacity-60 uppercase bg-emerald-100/50 px-1.5 py-0.5 rounded leading-none">{phone.type}</span>
                              )}
                            </div>
                            
                            {pIdx === 0 && (
                              <span className="text-[9px] bg-emerald-500 px-1.5 py-0.5 rounded text-white font-bold uppercase tracking-wider flex items-center gap-1">
                                Most Recent
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Emails Section */}
                    {liveData.emails && liveData.emails.length > 0 && (
                      <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-emerald-100/50">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Mail className="w-3 h-3 text-[#004EA8]" />
                          <p className="text-[9px] font-bold text-[#004EA8] uppercase tracking-wider">Email Addresses</p>
                        </div>
                        <div className="flex flex-col gap-2">
                          {liveData.emails.filter((e: any) => e?.address || e?.email).map((email: any, eIdx: number) => (
                            <div key={eIdx} className="flex items-center justify-between gap-2 text-xs text-[#004EA8] font-medium">
                              <a 
                                href={`mailto:${email?.address || email?.email || ''}`}
                                className="flex items-center gap-2 ml-4.5 hover:text-[#003d82] transition-colors no-underline"
                              >
                                <span>{email.address || email.email}</span>
                                {email.type && email.type !== 'unknown' && (
                                  <span className="text-[9px] opacity-60 uppercase bg-blue-50 px-1 rounded">{email.type}</span>
                                )}
                              </a>
                              {eIdx === 0 && (
                                <span className="text-[9px] bg-blue-700 px-1.5 py-0.5 rounded text-white font-bold uppercase tracking-wider flex items-center gap-1">
                                  Primary
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* No Contact Message - Only shown if both arrays are empty */}
                    {(!liveData.phones || liveData.phones.length === 0) && (!liveData.emails || liveData.emails.length === 0) && (
                      <p className="text-xs text-gray-500 italic">No contact info found</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <p className="text-sm text-[#A2B2C8] mb-1">
              {isLocked ? maskAddress(lead.address.oneLine) : lead.address.oneLine}
            </p>
            <p className="text-sm text-gray-500 font-medium mb-3">{lead.estimatedValueRange}</p>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {lead.tags.map((tag: string, tIdx: number) => (
                <span 
                  key={tIdx} 
                  className="px-2 py-1 bg-[#004EA8]/5 text-[#004EA8] text-[10px] font-bold uppercase tracking-wider rounded-md"
                >
                  {tag}
                </span>
              ))}
            </div>

            {!liveData && (
              <WCTButton 
                onClick={handleUnlock}
                disabled={isUnlocking}
                className="flex items-center gap-2 px-4 py-2 text-xs h-9"
              >
                {isUnlocking ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                {isUnlocking ? 'Unlocking...' : 'Unlock Contact Info'}
              </WCTButton>
            )}
          </div>
          
          <div className="text-right">
            <div className="text-[10px] font-bold text-[#A2B2C8] uppercase tracking-widest mb-1">Sell Score</div>
            <div className="text-xl font-bold text-[#004EA8]">{lead.sellScore}</div>
          </div>
        </div>
      </WCTCard>
    </motion.div>
  );
};

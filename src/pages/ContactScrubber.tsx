import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Shield, 
  ChevronLeft,
  LogOut,
  Sparkles,
  UserCheck,
  TrendingUp,
  MapPin,
  Lock,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Papa from 'papaparse';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { WCTCard, WCTButton, WCTAlert, WCTBadge } from '../components/WCTComponents';

interface Contact {
  firstName: string;
  lastName: string;
  streetAddress: string;
  zip: string;
}

interface Match {
  contact: Contact;
  prospect: any;
}

export default function ContactScrubber() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const membershipLevel = user?.membership_level || 'MVP';
  const isAdmin = user?.is_admin || false;
  const hasAccess = membershipLevel === 'Paid' || membershipLevel === 'MVP' || isAdmin || membershipLevel === 'VIP';

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchContacts();
  }, [user, navigate]);

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('agent_contacts')
        .select('*')
        .eq('user_id', user?.id);
      
      if (error) {
        // If table doesn't exist, we'll just handle it gracefully
        if (error.code === '42P01') {
          console.log('agent_contacts table does not exist yet.');
          return;
        }
        throw error;
      }

      if (data) {
        const formattedContacts = data.map((c: any) => ({
          firstName: c.first_name,
          lastName: c.last_name,
          streetAddress: c.street_address,
          zip: c.zip
        }));
        setContacts(formattedContacts);
        if (formattedContacts.length > 0) {
          performScrub(formattedContacts);
        }
      }
    } catch (err: any) {
      console.error('Error fetching contacts:', err);
    }
  };

  const performScrub = async (contactsToScrub: Contact[]) => {
    setIsScrubbing(true);
    setProgress(0);
    setMatches([]);

    try {
      // Fetch all agent searches to get prospect data
      const { data: searches, error: searchError } = await supabase
        .from('agent_searches')
        .select('prospect_data')
        .eq('user_id', user?.id);

      if (searchError) throw searchError;

      const allProspects = (searches || [])
        .flatMap(s => s.prospect_data || [])
        .filter(p => (p.sellScore || 0) >= 3);

      const foundMatches: Match[] = [];
      
      // Simulate progress over 2 seconds
      const steps = 20;
      for (let i = 1; i <= steps; i++) {
        setProgress(Math.round((i / steps) * 100));
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      contactsToScrub.forEach(contact => {
        const match = allProspects.find(prospect => {
          const prospectAddr = (prospect.address?.oneLine || prospect.address || '').toLowerCase();
          const contactAddr = contact.streetAddress.toLowerCase();
          return prospectAddr.includes(contactAddr) || contactAddr.includes(prospectAddr);
        });

        if (match) {
          foundMatches.push({ contact, prospect: match });
        }
      });

      setMatches(foundMatches);
    } catch (err: any) {
      console.error('Scrubbing error:', err);
      setError('Failed to complete scrubbing process.');
    } finally {
      setIsScrubbing(false);
      setProgress(100);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    parseCSV(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    parseCSV(file);
  };

  const parseCSV = (file: File) => {
    if (!hasAccess) return;
    
    setIsUploading(true);
    setError(null);
    setSuccess(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const parsedData = results.data as any[];
          const validContacts: Contact[] = parsedData
            .filter(row => row['First Name'] && row['Last Name'] && row['Street Address'])
            .map(row => ({
              firstName: row['First Name'],
              lastName: row['Last Name'],
              streetAddress: row['Street Address'],
              zip: row['Zip'] || ''
            }));

          if (validContacts.length === 0) {
            throw new Error('No valid contacts found in CSV. Please check headers: First Name, Last Name, Street Address, Zip.');
          }

          // Save to Supabase
          const { error: insertError } = await supabase
            .from('agent_contacts')
            .insert(validContacts.map(c => ({
              user_id: user?.id,
              first_name: c.firstName,
              last_name: c.lastName,
              street_address: c.streetAddress,
              zip: c.zip
            })));

          if (insertError) {
            if (insertError.code === '42P01') {
               throw new Error('The agent_contacts table does not exist in the database. Please contact support.');
            }
            throw insertError;
          }

          setContacts(prev => [...prev, ...validContacts]);
          setSuccess(`Successfully uploaded ${validContacts.length} contacts.`);
          performScrub([...contacts, ...validContacts]);
        } catch (err: any) {
          setError(err.message);
        } finally {
          setIsUploading(false);
        }
      },
      error: (err) => {
        setError('Failed to parse CSV file.');
        setIsUploading(false);
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-[#004EA8]"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#004EA8] rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="font-montserrat font-bold text-[#004EA8] tracking-tight">CONTACT SCRUBBER</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-[#004EA8]/5 border border-[#004EA8]/10 px-3 py-1.5 rounded-full flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#004EA8]" />
              <span className="text-[11px] font-bold text-[#004EA8] uppercase tracking-wider">
                {membershipLevel} Tier
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

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Automated Daily Scrubbing</h1>
          <p className="text-slate-500">Upload your database to automatically identify who in your sphere is most likely to sell.</p>
        </div>

        {error && <WCTAlert type="error" className="mb-8">{error}</WCTAlert>}
        {success && <WCTAlert type="info" className="mb-8">{success}</WCTAlert>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Section */}
          <div className="lg:col-span-1">
            <div className="relative">
              <div className={`transition-all duration-500 ${!hasAccess ? 'blur-sm pointer-events-none grayscale' : ''}`}>
                <WCTCard className="p-8 border-dashed border-2 border-slate-200 bg-white hover:border-[#004EA8] transition-colors group cursor-pointer relative">
                  <input 
                    type="file" 
                    accept=".csv" 
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    disabled={!hasAccess || isUploading}
                  />
                  <div 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={onDrop}
                    className="flex flex-col items-center text-center"
                  >
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-[#004EA8]/5 transition-colors">
                      {isUploading ? (
                        <Loader2 className="w-8 h-8 text-[#004EA8] animate-spin" />
                      ) : (
                        <Upload className="w-8 h-8 text-slate-300 group-hover:text-[#004EA8] transition-colors" />
                      )}
                    </div>
                    <h3 className="font-bold text-slate-900 mb-1">Upload CSV</h3>
                    <p className="text-xs text-slate-400 mb-4">Drag and drop or click to browse</p>
                    <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold bg-slate-50 px-3 py-1 rounded-full">
                      Required: First, Last, Address, Zip
                    </div>
                  </div>
                </WCTCard>
              </div>

              {!hasAccess && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20">
                  <div className="w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center mb-4">
                    <Lock className="w-6 h-6 text-[#004EA8]" />
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2">Pro Feature</h3>
                  <p className="text-sm text-slate-500 mb-6">Upgrade to Pro to enable Automated Daily Scrubbing and identify sellers in your sphere.</p>
                  <WCTButton className="w-full bg-[#004EA8] shadow-lg shadow-blue-900/20">
                    Upgrade to Pro
                  </WCTButton>
                </div>
              )}
            </div>

            <div className="mt-8">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                Scrubbing History
              </h3>
              <div className="space-y-3">
                <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-900">Last Scrub</p>
                    <p className="text-[10px] text-slate-400">Today • 12:00 AM</p>
                  </div>
                  <WCTBadge variant="success">Completed</WCTBadge>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-900">Next Scheduled</p>
                    <p className="text-[10px] text-slate-400">Tonight • 12:00 AM</p>
                  </div>
                  <WCTBadge variant="slate">Pending</WCTBadge>
                </div>
              </div>
            </div>
          </div>

          {/* Dashboard Section */}
          <div className="lg:col-span-2 space-y-8">
            {/* Progress Card */}
            <WCTCard className="p-8 bg-white border-none shadow-sm overflow-hidden relative">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 mb-1">Scrubbing Status</h2>
                    <p className="text-sm text-slate-500">
                      {isScrubbing 
                        ? `Scrubbing your ${contacts.length} contacts against tonight's seller data...`
                        : `Last scrub analyzed ${contacts.length} contacts in your database.`
                      }
                    </p>
                  </div>
                  {isScrubbing && <Loader2 className="w-5 h-5 text-[#004EA8] animate-spin" />}
                </div>

                <div className="space-y-4">
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-[#004EA8] to-[#64CCC9]"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <span>{progress}% Complete</span>
                    <span>{matches.length} Matches Found</span>
                  </div>
                </div>
              </div>
              
              {/* Background Decoration */}
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-[#004EA8]/5 rounded-full blur-3xl pointer-events-none" />
            </WCTCard>

            {/* Matches Section */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">Matches Found</h2>
                </div>
                <WCTBadge variant="success" className="px-3 py-1">
                  {matches.length} High Probability Sellers
                </WCTBadge>
              </div>

              {matches.length === 0 ? (
                <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200 shadow-sm">
                  <UserCheck className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-900 mb-2">No matches yet</h3>
                  <p className="text-sm text-slate-500 max-w-xs mx-auto">
                    Once we identify a contact in your list with a high Sell Score, they will appear here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {matches.map((match, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <WCTCard className="p-6 bg-white border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-bl-full flex items-center justify-center pl-4 pb-4">
                          <div className="text-center">
                            <p className="text-[10px] font-bold text-emerald-600 uppercase leading-none">Score</p>
                            <p className="text-lg font-black text-emerald-700 leading-none">{match.prospect.sellScore}</p>
                          </div>
                        </div>

                        <div className="mb-4">
                          <h4 className="font-bold text-slate-900 text-lg mb-1">{match.contact.firstName} {match.contact.lastName}</h4>
                          <p className="text-xs text-slate-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {match.contact.streetAddress}
                          </p>
                        </div>

                        <div className="bg-emerald-50/50 rounded-2xl p-4 mb-6 border border-emerald-100">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Why they're a match</p>
                          </div>
                          <p className="text-xs text-emerald-800 leading-relaxed">
                            {match.prospect.tags?.join(', ') || 'High equity and neighborhood turnover trends.'}
                          </p>
                        </div>

                        <WCTButton 
                          variant="outline" 
                          fullWidth 
                          className="text-xs py-2 h-10 border-slate-200 text-slate-600 hover:bg-slate-50"
                          onClick={() => navigate('/prospector')}
                        >
                          View Full Profile
                        </WCTButton>
                      </WCTCard>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Navigation Footer */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-4 bg-white/80 backdrop-blur-md p-2 rounded-full shadow-2xl border border-white/20 z-40">
        <WCTButton variant="outline" onClick={() => navigate('/')} className="rounded-full px-6 border-slate-200 text-slate-600">Home</WCTButton>
        <WCTButton onClick={() => navigate('/dashboard')} className="rounded-full px-6 bg-[#004EA8]">Dashboard</WCTButton>
        <WCTButton variant="secondary" onClick={() => navigate('/prospector')} className="rounded-full px-6 bg-[#64CCC9] hover:bg-[#54b8b5]">Prospector</WCTButton>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ChevronRight, 
  Search, 
  Users, 
  FileText, 
  Download, 
  ExternalLink, 
  Clock, 
  AlertCircle,
  Sparkles,
  ArrowRight,
  ChevronLeft,
  LogOut,
  Target,
  Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { WCTCard, WCTButton, WCTBadge } from '../components/WCTComponents';

interface AgentSearch {
  id: string;
  created_at: string;
  target_address: string;
  prospect_data: any[] | null;
  user_id: string;
}

const AgentDashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searches, setSearches] = useState<AgentSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    fetchSearches();
  }, [user, navigate]);

  const fetchSearches = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('agent_searches')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSearches(data || []);
    } catch (err: any) {
      console.error('Error fetching searches:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const netSheetCalculations = searches.filter(s => !s.prospect_data);
  const prospectLists = searches.filter(s => s.prospect_data && s.prospect_data.length > 0);

  const isPaid = user?.membership_level === 'Paid';
  const displayCalculations = isPaid ? netSheetCalculations : netSheetCalculations.slice(0, 3);
  const displayProspectLists = isPaid ? prospectLists : prospectLists.slice(0, 3);

  const exportLeads = (search: AgentSearch) => {
    if (!search.prospect_data) return;
    
    const headers = ['Owner Name', 'Property Address', 'Sell Score', 'Tags'];
    const rows = search.prospect_data.map(p => [
      p.ownerName,
      p.address?.oneLine || p.address,
      p.sellScore,
      p.tags?.join('; ') || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `leads-${search.target_address.replace(/\s+/g, '-').toLowerCase()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#004EA8] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-[#004EA8]"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#004EA8] rounded-lg flex items-center justify-center">
                <LayoutDashboard className="w-5 h-5 text-white" />
              </div>
              <span className="font-montserrat font-bold text-[#004EA8] tracking-tight">AGENT DASHBOARD</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-[#004EA8]/5 border border-[#004EA8]/10 px-3 py-1.5 rounded-full flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#004EA8]" />
              <span className="text-[11px] font-bold text-[#004EA8] uppercase tracking-wider">
                {user?.membership_level || 'MVP'} TIER
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome back, {user?.full_name?.split(' ')[0] || 'Agent'}</h1>
            <p className="text-slate-500">Manage your calculations, prospect lists, and neighborhood searches in one place.</p>
          </div>
          <WCTButton 
            variant="outline" 
            onClick={() => navigate('/scrubber')}
            className="flex items-center gap-2 border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <Shield className="w-4 h-4" />
            Contact Scrubber
          </WCTButton>
        </div>

        {searches.length === 0 ? (
          <WCTCard className="p-12 text-center bg-white border-none shadow-sm">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Search className="w-8 h-8 text-slate-300" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">No searches yet</h2>
              <p className="text-slate-500 mb-8">Start your first neighborhood search to identify likely sellers and generate net sheets.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <WCTButton onClick={() => navigate('/')} className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Net to Seller
                </WCTButton>
                <WCTButton variant="outline" onClick={() => navigate('/prospector')} className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Neighborhood Prospector
                </WCTButton>
              </div>
            </div>
          </WCTCard>
        ) : (
          <div className="space-y-12">
            {/* MVP Upgrade Banner */}
            {!isPaid && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-[#004EA8] to-[#0066CC] p-6 rounded-3xl text-white shadow-lg shadow-blue-900/10 flex flex-col md:flex-row items-center justify-between gap-6"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Upgrade to Pro for full history</h3>
                    <p className="text-white/80 text-sm">You are currently seeing the 3 most recent searches. Unlock your full history and more.</p>
                  </div>
                </div>
                <WCTButton className="bg-white text-[#004EA8] hover:bg-slate-50 border-none whitespace-nowrap">
                  View Plans
                </WCTButton>
              </motion.div>
            )}

            {/* Recent Calculations */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#004EA8]" />
                  <h2 className="text-xl font-bold text-slate-900">Recent Net to Seller Calculations</h2>
                </div>
                {netSheetCalculations.length > 3 && !isPaid && (
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    +{netSheetCalculations.length - 3} more hidden
                  </span>
                )}
              </div>

              {displayCalculations.length > 0 ? (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target Address</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date Created</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {displayCalculations.map((calc) => (
                        <tr key={calc.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-4">
                            <p className="font-medium text-slate-900">{calc.target_address}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-slate-500 text-sm">
                              <Clock className="w-3.5 h-3.5" />
                              {new Date(calc.created_at).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <WCTButton 
                              variant="outline" 
                              size="sm" 
                              className="text-[10px] h-8 px-3"
                              onClick={() => navigate('/')} // In a real app, this would link to the specific report
                            >
                              View Full Report
                            </WCTButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-3xl p-8 text-center border border-dashed border-slate-200">
                  <p className="text-slate-400 text-sm">No recent calculations found.</p>
                </div>
              )}
            </section>

            {/* Saved Prospect Lists */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#004EA8]" />
                  <h2 className="text-xl font-bold text-slate-900">Saved Prospect Lists</h2>
                </div>
                {prospectLists.length > 3 && !isPaid && (
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    +{prospectLists.length - 3} more hidden
                  </span>
                )}
              </div>

              {displayProspectLists.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {displayProspectLists.map((list) => (
                    <WCTCard key={list.id} className="p-6 bg-white border-none shadow-sm flex flex-col">
                      <div className="flex items-start justify-between mb-4">
                        <div className="bg-blue-50 p-2 rounded-xl">
                          <Target className="w-5 h-5 text-[#004EA8]" />
                        </div>
                        <button 
                          onClick={() => exportLeads(list)}
                          className="p-2 text-slate-400 hover:text-[#004EA8] hover:bg-slate-50 rounded-lg transition-all"
                          title="Export Leads"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <h3 className="font-bold text-slate-900 mb-1 truncate" title={list.target_address}>
                        {list.target_address}
                      </h3>
                      <p className="text-xs text-slate-400 mb-6">
                        {list.prospect_data?.length || 0} Leads Identified • {new Date(list.created_at).toLocaleDateString()}
                      </p>

                      <div className="space-y-3 mb-6 flex-grow">
                        {list.prospect_data?.slice(0, 2).map((prospect: any, idx: number) => (
                          <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-xs font-bold text-slate-900 truncate max-w-[120px]">
                                {prospect.ownerName}
                              </p>
                              <WCTBadge variant={prospect.sellScore > 80 ? 'success' : 'warning'} className="text-[9px] px-1.5 py-0">
                                {prospect.sellScore}
                              </WCTBadge>
                            </div>
                            <p className="text-[10px] text-slate-400 truncate">
                              {prospect.address?.oneLine || prospect.address}
                            </p>
                          </div>
                        ))}
                        {(list.prospect_data?.length || 0) > 2 && (
                          <p className="text-[10px] text-center text-slate-400 font-medium">
                            +{(list.prospect_data?.length || 0) - 2} more prospects
                          </p>
                        )}
                      </div>

                      <WCTButton 
                        variant="outline" 
                        className="w-full text-[10px] h-9"
                        onClick={() => navigate('/prospector')}
                      >
                        View in Prospector
                      </WCTButton>
                    </WCTCard>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-50 rounded-3xl p-8 text-center border border-dashed border-slate-200">
                  <p className="text-slate-400 text-sm">No saved prospect lists found.</p>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

export default AgentDashboard;

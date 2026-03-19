import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { 
  WCTCard, 
  WCTButton, 
  WCTInput, 
  WCTAlert 
} from '../components/WCTComponents';
import { motion } from 'motion/react';
import { 
  Users, 
  Shield, 
  ShieldCheck, 
  CreditCard, 
  Search, 
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Settings,
  Save,
  Building2,
  Plus,
  Trash2
} from 'lucide-react';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  brokerage: string;
  is_wct_vip: boolean;
  skip_trace_credits: number;
  created_at: string;
  is_admin: boolean;
  company_name: string | null;
}

interface TitleFees {
  id: number;
  company_name: string;
  buyer_settlement: number;
  buyer_commitment: number;
  buyer_recording: number;
  buyer_binder: number;
  buyer_delivery: number;
  seller_settlement: number;
  seller_search: number;
  seller_admin: number;
  seller_delivery: number;
  seller_deed_prep: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [feesList, setFeesList] = useState<TitleFees[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user?.is_admin) {
        navigate('/');
      } else {
        fetchData();
      }
    }
  }, [user, authLoading, navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Users
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (userError) throw userError;
      setUsers(userData || []);

      // Fetch Fees
      const { data: feeData, error: feeError } = await supabase
        .from('title_fees')
        .select('*')
        .order('company_name');

      if (feeError) throw feeError;
      setFeesList(feeData || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = async () => {
    try {
      const newCompany = {
        company_name: 'New Title Company',
        buyer_settlement: 0,
        buyer_commitment: 0,
        buyer_recording: 0,
        buyer_binder: 0,
        buyer_delivery: 0,
        seller_settlement: 0,
        seller_search: 0,
        seller_admin: 0,
        seller_delivery: 0,
        seller_deed_prep: 0
      };

      const { data, error } = await supabase
        .from('title_fees')
        .insert(newCompany)
        .select()
        .single();

      if (error) throw error;
      
      setFeesList([...feesList, data]);
      setSuccessMessage('New title company created');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateCompany = async (id: number) => {
    setSavingId(id);
    setError(null);
    try {
      const company = feesList.find(f => f.id === id);
      if (!company) return;

      const { error } = await supabase
        .from('title_fees')
        .update(company)
        .eq('id', id);

      if (error) throw error;
      
      setSuccessMessage(`${company.company_name} updated successfully`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteCompany = async (id: number) => {
    if (!confirm('Are you sure you want to delete this company? This may affect users assigned to it.')) return;
    
    try {
      const { error } = await supabase
        .from('title_fees')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setFeesList(feesList.filter(f => f.id !== id));
      setSuccessMessage('Company deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const updateFeeField = (id: number, field: keyof TitleFees, value: string | number) => {
    setFeesList(feesList.map(f => {
      if (f.id === id) {
        return { ...f, [field]: value };
      }
      return f;
    }));
  };

  const toggleVip = async (userId: string, currentStatus: boolean) => {
    setUpdatingId(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_wct_vip: !currentStatus })
        .eq('id', userId);

      if (error) throw error;
      
      setUsers(users.map(u => u.id === userId ? { ...u, is_wct_vip: !currentStatus } : u));
      setSuccessMessage('VIP status updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const updateCredits = async (userId: string, credits: number) => {
    setUpdatingId(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ skip_trace_credits: credits })
        .eq('id', userId);

      if (error) throw error;
      
      setUsers(users.map(u => u.id === userId ? { ...u, skip_trace_credits: credits } : u));
      setSuccessMessage('Credits updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const updateUserCompany = async (userId: string, companyName: string | null) => {
    setUpdatingId(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ company_name: companyName })
        .eq('id', userId);

      if (error) throw error;
      
      setUsers(users.map(u => u.id === userId ? { ...u, company_name: companyName } : u));
      setSuccessMessage('User company assigned');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.brokerage?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-[#004EA8] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <button 
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-[#004EA8] transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to App
            </button>
            <h1 className="text-3xl font-bold text-[#004EA8] flex items-center gap-3">
              <ShieldCheck className="w-8 h-8" />
              Admin Dashboard
            </h1>
            <p className="text-slate-500 mt-1">Multi-tenant SaaS Management: Companies & Users</p>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <WCTButton onClick={handleCreateCompany} variant="outline" className="bg-white">
              <Plus className="w-4 h-4 mr-2" />
              Create New Title Company
            </WCTButton>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#004EA8]/20 focus:border-[#004EA8] bg-white transition-all shadow-sm"
              />
            </div>
          </div>
        </div>

        {error && <WCTAlert type="error" className="mb-6">{error}</WCTAlert>}
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex items-center gap-3"
          >
            <CheckCircle2 className="w-5 h-5" />
            {successMessage}
          </motion.div>
        )}

        {/* Title Company Fee Manager */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <Building2 className="w-6 h-6 text-[#004EA8]" />
            <h2 className="text-2xl font-bold text-slate-900">Title Company Fee Manager</h2>
          </div>
          
          <div className="grid grid-cols-1 gap-8">
            {feesList.map((company) => (
              <WCTCard key={company.id} className="border-slate-200 shadow-lg p-0 overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                  <div className="flex items-center gap-4 flex-1">
                    <Building2 className="w-5 h-5 text-slate-400" />
                    <input 
                      type="text"
                      value={company.company_name}
                      onChange={(e) => updateFeeField(company.id, 'company_name', e.target.value)}
                      className="bg-transparent border-none focus:ring-0 text-lg font-bold text-slate-900 p-0 w-full"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <WCTButton 
                      onClick={() => handleUpdateCompany(company.id)}
                      disabled={savingId === company.id}
                    >
                      {savingId === company.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                      Save Updates
                    </WCTButton>
                    <button 
                      onClick={() => handleDeleteCompany(company.id)}
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                      title="Delete Company"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Buyer's Fees */}
                  <div>
                    <h3 className="text-sm font-bold text-[#004EA8] uppercase tracking-wider mb-4 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#004EA8]" />
                      Buyer's Fees
                    </h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <WCTInput 
                          label="Settlement Fee" 
                          type="number" 
                          value={company.buyer_settlement} 
                          onChange={(e) => updateFeeField(company.id, 'buyer_settlement', parseFloat(e.target.value) || 0)}
                        />
                        <WCTInput 
                          label="Title Commitment" 
                          type="number" 
                          value={company.buyer_commitment} 
                          onChange={(e) => updateFeeField(company.id, 'buyer_commitment', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <WCTInput 
                          label="Recording/Compliance" 
                          type="number" 
                          value={company.buyer_recording} 
                          onChange={(e) => updateFeeField(company.id, 'buyer_recording', parseFloat(e.target.value) || 0)}
                        />
                        <WCTInput 
                          label="Binder" 
                          type="number" 
                          value={company.buyer_binder} 
                          onChange={(e) => updateFeeField(company.id, 'buyer_binder', parseFloat(e.target.value) || 0)}
                        />
                        <WCTInput 
                          label="Delivery" 
                          type="number" 
                          value={company.buyer_delivery} 
                          onChange={(e) => updateFeeField(company.id, 'buyer_delivery', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Seller's Fees */}
                  <div>
                    <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      Seller's Fees
                    </h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <WCTInput 
                          label="Settlement Fee" 
                          type="number" 
                          value={company.seller_settlement} 
                          onChange={(e) => updateFeeField(company.id, 'seller_settlement', parseFloat(e.target.value) || 0)}
                        />
                        <WCTInput 
                          label="Title Search" 
                          type="number" 
                          value={company.seller_search} 
                          onChange={(e) => updateFeeField(company.id, 'seller_search', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <WCTInput 
                          label="Admin" 
                          type="number" 
                          value={company.seller_admin} 
                          onChange={(e) => updateFeeField(company.id, 'seller_admin', parseFloat(e.target.value) || 0)}
                        />
                        <WCTInput 
                          label="Delivery" 
                          type="number" 
                          value={company.seller_delivery} 
                          onChange={(e) => updateFeeField(company.id, 'seller_delivery', parseFloat(e.target.value) || 0)}
                        />
                        <WCTInput 
                          label="Deed Prep" 
                          type="number" 
                          value={company.seller_deed_prep} 
                          onChange={(e) => updateFeeField(company.id, 'seller_deed_prep', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </WCTCard>
            ))}
          </div>
        </div>

        {/* User Management Section */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-6 h-6 text-[#004EA8]" />
            <h2 className="text-2xl font-bold text-slate-900">User Management</h2>
          </div>
          
          <WCTCard className="overflow-hidden border-slate-200 shadow-xl p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">User Details</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Brokerage</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Assigned Company</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">VIP / MVP</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Skip Trace Credits</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{u.full_name || 'No Name'}</span>
                          <span className="text-sm text-slate-500">{u.email}</span>
                          {u.is_admin && (
                            <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-amber-600 uppercase">
                              <Shield className="w-3 h-3" /> Admin
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {u.brokerage || '—'}
                      </td>
                      <td className="px-6 py-4">
                        <select 
                          value={u.company_name || ''}
                          onChange={(e) => updateUserCompany(u.id, e.target.value || null)}
                          disabled={updatingId === u.id}
                          className="w-full text-sm border border-slate-200 rounded-lg focus:ring-[#004EA8] focus:border-[#004EA8] bg-white p-2"
                        >
                          <option value="">No Company Assigned</option>
                          {feesList.map(f => (
                            <option key={f.id} value={f.company_name}>{f.company_name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center">
                          <input 
                            type="checkbox"
                            checked={u.is_wct_vip}
                            onChange={() => toggleVip(u.id, u.is_wct_vip)}
                            disabled={updatingId === u.id}
                            className="w-5 h-5 rounded border-slate-300 text-[#004EA8] focus:ring-[#004EA8] cursor-pointer"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <input 
                            type="number"
                            id={`credits-${u.id}`}
                            defaultValue={u.skip_trace_credits}
                            className="w-20 px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:border-[#004EA8]"
                          />
                          <button 
                            onClick={() => {
                              const input = document.getElementById(`credits-${u.id}`) as HTMLInputElement;
                              const val = parseInt(input.value);
                              if (!isNaN(val)) {
                                updateCredits(u.id, val);
                              }
                            }}
                            disabled={updatingId === u.id}
                            className="text-xs font-bold text-[#004EA8] hover:underline uppercase tracking-wider"
                          >
                            Update
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filteredUsers.length === 0 && (
              <div className="py-20 text-center">
                <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400">No users found matching your search.</p>
              </div>
            )}
          </WCTCard>
        </div>
      </div>
    </div>
  );
}

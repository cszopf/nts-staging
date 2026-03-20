import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  WCTCard, 
  WCTButton, 
  WCTSummaryRow, 
  WCTAlert 
} from '../components/WCTComponents';
import { AuthModal } from '../components/AuthModal';
import { SmartTechModal } from '../components/SmartTechModal';
import { GeminiAssistant } from '../components/GeminiAssistant';
import { ProspectCard } from '../components/ProspectCard';
import { motion, AnimatePresence } from 'motion/react';
import { Share2, Mail, Edit2, CheckCircle2, FileDown, Sparkles, Download, Shield, AlertTriangle, RefreshCw, Lock as LockIcon, LogOut, User as UserIcon, ArrowRight, Target, LayoutDashboard } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { domToCanvas } from 'modern-screenshot';
import jsPDF from 'jspdf';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const Results = () => {
  const navigate = useNavigate();
  const { estimateId } = useParams();
  const { user, signOut } = useAuth();
  const [estimate, setEstimate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showSmartModal, setShowSmartModal] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [savingPdf, setSavingPdf] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [prospects, setProspects] = useState<any[]>([]);
  const [isLoadingProspects, setIsLoadingProspects] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [prospectsError, setProspectsError] = useState<string | null>(null);
  const [thinkingStep, setThinkingStep] = useState(0);
  const resultsRef = React.useRef<HTMLDivElement>(null);

  const hasProspectorAccess = user?.plan === 'Enterprise' || user?.plan === 'Agency' || (user?.credit_balance && user.credit_balance > 0);

  useEffect(() => {
    if (estimate?.lat && estimate?.lng && hasProspectorAccess && !hasSearched && !isLoadingProspects) {
      handleFetchProspects();
    }
  }, [estimate, hasProspectorAccess]);

  const thinkingMessages = [
    "Analyzing neighborhood turnover...",
    "Scanning county tax records...",
    "Calculating sell probability scores...",
    "Identifying high-equity owners...",
    "Finalizing top 10 prospects..."
  ];

  useEffect(() => {
    let interval: any;
    if (isLoadingProspects) {
      interval = setInterval(() => {
        setThinkingStep(prev => (prev + 1) % thinkingMessages.length);
      }, 2000);
    } else {
      setThinkingStep(0);
    }
    return () => clearInterval(interval);
  }, [isLoadingProspects]);

  useEffect(() => {
    const fetchEstimate = async () => {
      try {
        const res = await fetch(`/api/net-to-seller/estimate/${estimateId}`);
        if (!res.ok) throw new Error("Estimate not found");
        const data = await res.json();
        setEstimate(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchEstimate();
  }, [estimateId]);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/calculator/results/${estimateId}?t=${estimate.shareToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveToDashboard = async () => {
    if (!user) {
      setShowAuth(true);
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from('saved_calculations').insert({
        user_id: user.id,
        property_address: estimate.addressFull,
        owner_name: estimate.ownerName || 'Unknown Owner',
        sale_price: estimate.salePrice,
        net_proceeds: estimate.netProceeds ?? estimate.estimatedNetProceeds,
        inputs_json: estimate.inputsJson,
        calc_json: estimate.calcJson
      });

      if (error) throw error;

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error("Error saving calculation:", err);
      alert("Failed to save to dashboard: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateSummary = async () => {
    setGeneratingSummary(true);
    try {
      // @ts-ignore - process.env is injected by the platform
      let apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (apiKey) {
        apiKey = apiKey.replace(/^["']|["']$/g, '');
      }
      if (!apiKey) {
        throw new Error("API Key not found");
      }
      
      const ai = new GoogleGenAI({ apiKey });
      
      const context = `
        You are a professional real estate assistant for World Class Title.
        Generate a professional, friendly email summary for a client based on this Net to Seller estimate.
        
        Property: ${estimate.addressFull}
        Estimated Net Proceeds: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(estimate.estimatedNetProceeds)}
        Sale Price: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(estimate.salePrice)}
        
        Breakdown of costs:
        - Commission: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(estimate.commissionAmount)}
        - Mortgage Payoffs: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(estimate.mortgagePayoffsTotal)}
        - Seller Credits: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(estimate.sellerCreditsTotal)}
        - Home Warranty: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(estimate.homeWarranty || 0)}
        - Closing Costs: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(estimate.estimatedClosingCostsTotal)}
        - Title Insurance: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(estimate.estimatedTitlePremium)}
        - Transfer Tax: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(estimate.estimatedTransferTax)}
        - Tax Proration: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(estimate.estimatedTaxProration)}
        
        The email should be ready to copy-paste. Include a subject line.
        Keep it professional and clear.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: context }] }],
      });

      const text = response.text;
      if (text) {
        setAiSummary(text);
      } else {
        setError("Failed to generate summary.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to generate summary. Please check your connection.");
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleSaveAsPdf = async () => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    if (!resultsRef.current) return;
    setSavingPdf(true);
    try {
      const element = resultsRef.current;
      const canvas = await domToCanvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        filter: (node: Node) => {
          if (node instanceof HTMLElement && node.classList.contains('pdf-hide')) {
            return false;
          }
          return true;
        }
      });
      
      const imgData = canvas.toDataURL('image/png');
      const isLandscape = scenarios.length === 3;
      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`Net-to-Seller-${estimate.addressFull.replace(/[^a-z0-9]/gi, '-')}.pdf`);
    } catch (err) {
      console.error("PDF Generation Error:", err);
      setError("Failed to generate PDF. Please try again.");
    } finally {
      setSavingPdf(false);
    }
  };

  const handleFetchProspects = async () => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    setIsLoadingProspects(true);
    setProspectsError(null);
    try {
      const res = await fetch('/api/net-to-seller/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: estimate.lat, lng: estimate.lng })
      });
      const data = await res.json();
      if (data.success) {
        setProspects(data.prospects);
        
        // Silent background save to Supabase
        if (user?.id && data.prospects && data.prospects.length > 0) {
          supabase.from('agent_searches').insert({
            user_id: user.id,
            target_address: estimate.addressFull,
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
    if (!prospects || prospects.length === 0) return;

    const headers = ["Owner Name", "Property Address", "Est. Value Range", "Sell Score", "Tags"];
    // Check if mailingAddress exists in any prospect to decide if we add the header
    const hasMailing = prospects.some(p => p.mailingAddress);
    if (hasMailing) headers.push("Mailing Address");

    // Add Skip Trace columns
    const hasContactInfo = prospects.some(p => (p.phoneNumbers && p.phoneNumbers.length > 0) || (p.emails && p.emails.length > 0));
    if (hasContactInfo) {
      headers.push("Phone 1", "Phone 2", "Email");
    }

    const csvRows = [
      headers.join(","),
      ...prospects.map(p => {
        const row = [
          `"${p.ownerName.replace(/"/g, '""')}"`,
          `"${p.address.oneLine.replace(/"/g, '""')}"`,
          `"${p.estimatedValueRange}"`,
          p.sellScore,
          `"${p.tags.join("; ")}"`
        ];
        if (hasMailing) {
          row.push(`"${(p.mailingAddress || "").replace(/"/g, '""')}"`);
        }
        if (hasContactInfo) {
          const phone1 = typeof p.phoneNumbers?.[0] === 'string' ? p.phoneNumbers[0] : (p.phoneNumbers?.[0]?.number || p.phoneNumbers?.[0]?.phoneNumber || "");
          const phone2 = typeof p.phoneNumbers?.[1] === 'string' ? p.phoneNumbers[1] : (p.phoneNumbers?.[1]?.number || p.phoneNumbers?.[1]?.phoneNumber || "");
          const email = typeof p.emails?.[0] === 'string' ? p.emails[0] : (p.emails?.[0]?.email || "");
          row.push(`"${phone1}"`, `"${phone2}"`, `"${email}"`);
        }
        return row.join(",");
      })
    ];

    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "hot-leads.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="animate-pulse text-[#004EA8] font-montserrat uppercase tracking-widest">Loading Estimate...</div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-white p-6">
      <WCTCard className="max-w-md w-full text-center">
        <h2 className="text-red-500 mb-4">Error</h2>
        <p className="text-[#A2B2C8] mb-6">{error}</p>
        <Link to="/net-to-seller">
          <WCTButton fullWidth>Back to Calculator</WCTButton>
        </Link>
      </WCTCard>
    </div>
  );

  let calcJson;
  try {
    calcJson = JSON.parse(estimate.calcJson || '{}');
    if (typeof calcJson === 'string') {
      calcJson = JSON.parse(calcJson);
    }
  } catch (e) {
    calcJson = {};
  }
  const scenarios = calcJson.scenarios && calcJson.scenarios.length > 0 ? calcJson.scenarios : [estimate];
  const inputs = estimate.inputsJson ? JSON.parse(estimate.inputsJson) : {};
  const isHomeowner = inputs.policyType === 'homeowner';

  const isLocked = !(user?.plan === 'Enterprise' || user?.plan === 'Agency') && (user?.credit_balance || 0) <= 0;

  return (
    <div className="min-h-screen bg-wct-slate/5 py-12 px-6 flex flex-col items-center">
      {/* Top Navigation */}
      <div className="w-full max-w-7xl flex justify-end mb-8">
        {user ? (
          <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100">
            <div className="flex flex-col items-end">
              <p className="text-xs font-bold text-[#004EA8]">{user.full_name || user.email}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                {(user.plan === 'Enterprise' || user.plan === 'Agency') ? user.plan : 'FREE TIER'} • {user.credit_balance || 0} Credits
              </p>
            </div>
            <button 
              onClick={() => navigate('/scrubber')}
              className="p-2 text-slate-400 hover:text-[#004EA8] transition-colors border-l border-slate-100 ml-2 pl-4"
              title="Contact Scrubber"
            >
              <Shield className="w-4 h-4" />
            </button>
            <button 
              onClick={() => navigate('/dashboard')}
              className="p-2 text-slate-400 hover:text-[#004EA8] transition-colors border-l border-slate-100 ml-2 pl-4"
              title="Agent Dashboard"
            >
              <LayoutDashboard className="w-4 h-4" />
            </button>
            {user.is_admin && (
              <button 
                onClick={() => navigate('/admin')}
                className="p-2 text-slate-400 hover:text-[#004EA8] transition-colors border-l border-slate-100 ml-2 pl-4"
                title="Admin Panel"
              >
                <Shield className="w-4 h-4" />
              </button>
            )}
            <button 
              onClick={() => signOut()}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <WCTButton variant="outline" onClick={() => setShowAuth(true)} className="bg-white">
            <UserIcon className="w-4 h-4" />
            Sign In
          </WCTButton>
        )}
      </div>

      <div className={`max-w-${scenarios.length > 1 ? '7xl' : '3xl'} w-full relative`}>
        {/* Back Button */}
        <Link to="/calculator" className="absolute -top-12 left-0 text-wct-slate hover:text-wct-blue transition-colors p-2 flex items-center gap-1">
          <Edit2 className="w-4 h-4" />
          <span className="text-xs uppercase tracking-widest font-bold">Back</span>
        </Link>

        {estimate.addressFull.toLowerCase().includes('3159 w 11th') && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <WCTAlert type="warning">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎄</span>
                <p className="font-bold">Warning: Buyer must be notified of the 'Major Award' in the front window. Fragile!</p>
              </div>
            </WCTAlert>
          </motion.div>
        )}

        <motion.div
          ref={resultsRef}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white p-8 rounded-3xl"
        >
          <div className="mb-8 text-center">
            <div className="flex justify-center mb-6">
              <img 
                src="https://images.squarespace-cdn.com/content/v1/5f4d40b11b4f1e6a11b920b5/1598967776211-2JVFU1R4U8PQM71BWUVE/WorldClassTitle_Logos-RGB-Primary.png" 
                alt="World Class Title" 
                className="h-16 object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <h1 className="text-3xl md:text-4xl text-[#004EA8] mb-2">Estimated Net Proceeds</h1>
            <p className="text-[#A2B2C8] font-subheader">{estimate.addressFull}</p>
          </div>

          <div className={`grid grid-cols-1 ${scenarios.length === 2 ? 'md:grid-cols-2' : scenarios.length === 3 ? 'md:grid-cols-3' : ''} gap-6 mb-8`}>
            {scenarios.map((scenario: any, index: number) => {
              const netProceeds = scenario.netProceeds ?? scenario.estimatedNetProceeds;
              const salePrice = scenario.salePrice;
              const commission = scenario.commissionAmount;
              const payoffs = scenario.payoffsTotal ?? scenario.mortgagePayoffsTotal;
              const credits = scenario.creditsTotal ?? scenario.sellerCreditsTotal;
              const homeWarranty = scenario.homeWarranty ?? 0;
              const closingCosts = scenario.estimatedClosingCosts ?? scenario.estimatedClosingCostsTotal;
              const titlePremium = scenario.estimatedTitlePremium;
              const transferTax = scenario.estimatedTransferTax;
              const taxProration = scenario.estimatedTaxProration;
              const hoaTransfer = estimate.hoaTransferFee ?? 0;
              const otherCosts = estimate.otherCostsTotal ?? 0;
              const closingDetails = scenario.closingCostsBreakdown;

              return (
                <WCTCard key={index} className="overflow-hidden shadow-2xl shadow-wct-blue/5 h-full flex flex-col">
                  <div className="bg-[#004EA8]/5 -mx-8 -mt-8 p-8 text-center border-b border-[#A2B2C8]/10 mb-8">
                    <span className="text-[#A2B2C8] uppercase text-sm tracking-widest mb-2 block font-bold">
                      {scenarios.length > 1 ? (index === 0 ? 'Primary Estimate' : `Option ${index + 1}`) : 'Estimated Net'}
                    </span>
                    <div className="text-4xl md:text-5xl font-bold text-[#004EA8] font-nunito">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(netProceeds)}
                    </div>
                  </div>

                  <div className="space-y-1 flex-grow">
                    <WCTSummaryRow label="Sale Price" value={salePrice} description="The final agreed-upon price for the property." />
                    <WCTSummaryRow label="Real Estate Commission" value={-commission} description="Fees paid to real estate agents for their services in the sale." />
                    <WCTSummaryRow label="Mortgage Payoffs" value={-payoffs} description="The amount required to pay off the existing mortgage(s) on the property." />
                    <WCTSummaryRow label="Seller Credits" value={-credits} description="Credits given by the seller to the buyer to cover closing costs or repairs." />
                    {homeWarranty > 0 && <WCTSummaryRow label="Home Warranty" value={-homeWarranty} description="Cost of a home warranty policy provided by the seller." />}
                    <WCTSummaryRow 
                      label="Closing Costs" 
                      value={-closingCosts} 
                      details={closingDetails}
                      description="Fees associated with closing the transaction, such as recording fees, settlement fees, etc."
                    />
                    <WCTSummaryRow 
                      label="Title Insurance (OTIRB)" 
                      value={-titlePremium} 
                      description="Insurance policy protecting the owner and lender against title defects." 
                      icon={isHomeowner ? Shield : undefined}
                      infoTooltip={inputs.reissueCredit === 'yes' ? `Reissue Rate Applied: Because this property was last purchased within 10 years (${new Date(inputs.priorSaleDate).getFullYear()}), you qualify for a 30% discount on the title premium for the original purchase amount of ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(inputs.priorPolicyAmount.replace(/[^0-9.]/g, '')))}.` : undefined}
                    />
                    <WCTSummaryRow 
                      label="Transfer Tax" 
                      value={-transferTax} 
                      description="Tax paid to the county or state for transferring the property title." 
                      details={scenario.transferTaxCounty ? [{ label: `${scenario.transferTaxCounty} County (${(scenario.transferTaxRate / 10).toFixed(2)}%)`, value: transferTax }] : undefined}
                      infoTooltip={scenario.transferTaxCounty ? `${scenario.transferTaxCounty} County Rate: $${scenario.transferTaxRate.toFixed(2)} per $1,000` : undefined}
                    />
                    <WCTSummaryRow label="Tax Proration" value={-taxProration} description="Adjustment for property taxes to ensure each party pays for the days they owned the property." />
                    {hoaTransfer > 0 && <WCTSummaryRow label="HOA Transfer Fee" value={-hoaTransfer} description="Fee charged by the Homeowners Association to transfer ownership records." />}
                    {otherCosts > 0 && <WCTSummaryRow label="Other Costs" value={-otherCosts} description="Any additional costs or fees associated with the sale." />}
                    <WCTSummaryRow label="Net Proceeds" value={netProceeds} isTotal description="The estimated amount of money the seller will receive after all costs and payoffs." />
                  </div>
                </WCTCard>
              );
            })}
          </div>

          {/* Selected Comps Section */}
          {calcJson.selectedComps && calcJson.selectedComps.length > 0 && (
            <div className="mb-12 max-w-3xl mx-auto">
              <h3 className="text-xl font-bold text-[#004EA8] mb-4">Market Comparables</h3>
              <div className="space-y-4">
                {calcJson.selectedComps.map((comp: any, idx: number) => (
                  <WCTCard key={idx} className="p-4 border border-[#A2B2C8]/30">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-[#004EA8]">{comp.Address}</p>
                        <p className="text-sm text-[#A2B2C8]">Sold: {comp.SaleDate} • {comp.SqFt} SqFt</p>
                        <p className="text-sm text-[#A2B2C8]">Beds: {comp.Beds} • Baths: {comp.Baths}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(comp.SalePrice)}
                        </p>
                      </div>
                    </div>
                  </WCTCard>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-8 max-w-3xl mx-auto pdf-hide">
            <WCTButton 
              onClick={user ? handleGenerateSummary : () => setShowAuth(true)}
              disabled={generatingSummary}
              className="bg-gradient-to-r from-[#004EA8] to-[#64CCC9] hover:from-[#003d82] hover:to-[#54b8b5] border-none shadow-lg transform hover:scale-[1.02] transition-all"
            >
              {generatingSummary ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : user ? (
                <Sparkles className="w-4 h-4" />
              ) : (
                <LockIcon className="w-4 h-4" />
              )}
              {generatingSummary ? 'Generating...' : 'Generate AI Summary'}
            </WCTButton>
            
            <WCTButton variant="outline" onClick={() => window.history.back()} className="border-[#A2B2C8]/30 text-[#A2B2C8] hover:text-[#004EA8] hover:border-[#004EA8]">
              <Edit2 className="w-4 h-4" /> Edit Estimate
            </WCTButton>

            <WCTButton onClick={handleSaveAsPdf} disabled={savingPdf} className="bg-[#002B5C] hover:bg-[#001f42]">
              {savingPdf ? <Download className="w-4 h-4 animate-bounce" /> : <FileDown className="w-4 h-4" />}
              {savingPdf ? 'Generating PDF...' : 'Save as PDF'}
            </WCTButton>

            <WCTButton variant="secondary" onClick={handleCopyLink} className="bg-[#64CCC9] hover:bg-[#54b8b5]">
              {copied ? <CheckCircle2 className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </WCTButton>

            <WCTButton 
              onClick={handleSaveToDashboard} 
              disabled={isSaving || saveSuccess}
              className={`${saveSuccess ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-[#004EA8] hover:bg-[#003d82]'} sm:col-span-2`}
            >
              {isSaving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : saveSuccess ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Target className="w-4 h-4" />
              )}
              {isSaving ? 'Saving...' : saveSuccess ? 'Saved to Dashboard!' : 'Save to Agent Dashboard'}
            </WCTButton>
          </div>

          {/* AI Summary Display (Conditional) */}
          <AnimatePresence>
            {aiSummary && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-12 max-w-3xl mx-auto pdf-hide overflow-hidden"
              >
                <WCTCard className="p-6 bg-white border border-[#004EA8]/10 shadow-inner">
                  <div className="flex items-center gap-2 mb-4 text-[#004EA8]">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-sm font-bold uppercase tracking-widest">AI Generated Summary</span>
                  </div>
                  <p className="whitespace-pre-wrap text-gray-700 text-sm leading-relaxed">{aiSummary}</p>
                </WCTCard>
              </motion.div>
            )}
          </AnimatePresence>

          {authSuccess && (
            <WCTAlert type="info">
              <div className="flex flex-col gap-2">
                <p className="font-bold text-lg">Account Created!</p>
                <p>Your estimate has been saved to your dashboard. You can now access premium features like AI Summaries and Neighborhood Prospecting.</p>
              </div>
            </WCTAlert>
          )}

          <div className="space-y-6 mt-6">
            <WCTAlert type="info">
              <p className="leading-relaxed">
                <strong>Disclaimer:</strong> Estimates are for illustration only and may vary based on contract terms, prorations, lender requirements, county charges, and underwriting requirements. Final amounts will be confirmed by your World Class Title escrow officer.
              </p>
            </WCTAlert>
            <p className="text-[10px] text-wct-slate text-center italic uppercase tracking-wider font-bold">
              All estimates and assumptions must be consistent with Westcor underwriting guidelines and Ohio rate rules where applicable.
            </p>
          </div>

          {/* Neighborhood Prospector Cross-Sell */}
          <div className="mt-16 pt-12 border-t border-slate-100 max-w-3xl mx-auto pdf-hide">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-[#004EA8]/5 rounded-xl flex items-center justify-center">
                <Target className="w-5 h-5 text-[#004EA8]" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">Likely Sellers in this Neighborhood 🎯</h3>
            </div>

            {hasProspectorAccess ? (
              <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100">
                <AnimatePresence mode="wait">
                  {isLoadingProspects ? (
                    <motion.div 
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="py-12 text-center"
                    >
                      <div className="w-12 h-12 border-4 border-[#004EA8]/10 border-t-[#004EA8] rounded-full mx-auto mb-6 animate-spin" />
                      <motion.p 
                        key={thinkingStep}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-lg font-bold text-[#004EA8]"
                      >
                        {thinkingMessages[thinkingStep]}
                      </motion.p>
                    </motion.div>
                  ) : hasSearched ? (
                    <motion.div 
                      key="results"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                      {prospectsError ? (
                        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-center">
                          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
                          <p className="text-red-700 text-sm mb-4">{prospectsError}</p>
                          <WCTButton onClick={handleFetchProspects} variant="outline" className="text-xs">
                            <RefreshCw className="w-3.5 h-3.5 mr-2" />
                            Retry Search
                          </WCTButton>
                        </div>
                      ) : prospects.length > 0 ? (
                        <>
                          <div className="flex justify-between items-center">
                            <p className="text-xs font-bold text-[#004EA8] uppercase tracking-widest">
                              {prospects.length} High-Probability Leads
                            </p>
                            <WCTButton variant="outline" onClick={handleDownloadCSV} className="text-[10px] h-8 px-3">
                              <Download className="w-3 h-3 mr-1.5" />
                              Export CSV
                            </WCTButton>
                          </div>
                          <div className="grid grid-cols-1 gap-4">
                            {prospects.map((prospect, idx) => (
                              <ProspectCard key={idx} lead={prospect} idx={idx} />
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                          <p className="text-slate-400 text-sm">No high-probability leads found in this immediate area.</p>
                        </div>
                      )}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-3xl p-10 border border-slate-200 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#004EA8] to-[#64CCC9]" />
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-6">
                  <LockIcon className="w-8 h-8 text-slate-400" />
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-3">Premium Feature: Neighborhood Prospector</h4>
                <p className="text-slate-500 mb-8 max-w-md mx-auto">
                  Unlock Neighborhood Prospector: See 15 homeowners near this address statistically likely to sell.
                </p>
                <WCTButton
                  onClick={() => navigate('/pricing')}
                  className="bg-[#004EA8] hover:bg-[#003d82] px-8 text-sm font-bold uppercase tracking-widest"
                >
                  Upgrade to Unlock
                </WCTButton>
              </div>
            )}
          </div>
        </motion.div>
        
        <div className="mt-8 text-center pb-8">
          <button 
            onClick={() => setShowSmartModal(true)}
            className="text-[10px] text-wct-slate uppercase tracking-[2px] font-bold hover:text-wct-blue transition-colors"
          >
            Built by Smart, exclusively for World Class Title
          </button>
        </div>
      </div>
      
      <AuthModal 
        isOpen={showAuth} 
        onClose={() => setShowAuth(false)} 
        onSuccess={() => {
          setShowAuth(false);
          setAuthSuccess(true);
        }}
      />

      <SmartTechModal 
        isOpen={showSmartModal} 
        onClose={() => setShowSmartModal(false)} 
      />
      
      <GeminiAssistant estimate={estimate} />
    </div>
  );
};

export default Results;

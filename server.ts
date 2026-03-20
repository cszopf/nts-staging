import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { WCT_CONFIG } from "./src/constants/config";
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Prioritize supabase_nts_api as requested
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.supabase_nts_api || process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Admin client for credit deduction and vault saving
const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey
);

// Stripe setup
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2025-04-30.basil' });

// Map Stripe price IDs to plan details
const STRIPE_PLANS: Record<string, { name: string; credits: number; level: string }> = {
  'price_1TCo5UHeCwA1mbZB1xLEn9Su': { name: 'WCT Starter', credits: 100, level: 'Starter' },
  'price_1TCo5bHeCwA1mbZB3qptCbTz': { name: 'WCT Professional', credits: 400, level: 'Professional' },
  'price_1TCo5fHeCwA1mbZBSVEGAiN8': { name: 'WCT Agency', credits: 1500, level: 'Agency' },
  'price_1TCo5lHeCwA1mbZBwhb2unde': { name: 'WCT Enterprise', credits: 5000, level: 'Enterprise' },
};

const cleanNum = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val || typeof val !== 'string') return 0;
  const cleaned = Number(val.replace(/[^0-9.-]+/g, ""));
  return isNaN(cleaned) ? 0 : cleaned;
};

const OHIO_COUNTY_TAX_RATES: Record<string, number> = {
  "Huron": 2.00, "Wayne": 2.00,
  "Auglaize": 3.00, "Belmont": 3.00, "Butler": 3.00, "Clinton": 3.00, "Darke": 3.00, "Delaware": 3.00, "Fayette": 3.00, "Franklin": 3.00, "Greene": 3.00, "Hamilton": 3.00, "Hancock": 3.00, "Highland": 3.00, "Knox": 3.00, "Madison": 3.00, "Medina": 3.00, "Miami": 3.00, "Monroe": 3.00, "Montgomery": 3.00, "Morgan": 3.00, "Pickaway": 3.00, "Preble": 3.00, "Warren": 3.00, "Wood": 3.00,
  "Mercer": 3.50,
  "Adams": 4.00, "Allen": 4.00, "Ashland": 4.00, "Ashtabula": 4.00, "Athens": 4.00, "Brown": 4.00, "Carroll": 4.00, "Champaign": 4.00, "Clark": 4.00, "Clermont": 4.00, "Columbiana": 4.00, "Coshocton": 4.00, "Crawford": 4.00, "Cuyahoga": 4.00, "Defiance": 4.00, "Erie": 4.00, "Fairfield": 4.00, "Fulton": 4.00, "Geauga": 4.00, "Guernsey": 4.00, "Hardin": 4.00, "Harrison": 4.00, "Henry": 4.00, "Hocking": 4.00, "Holmes": 4.00, "Jackson": 4.00, "Jefferson": 4.00, "Lake": 4.00, "Lawrence": 4.00, "Licking": 4.00, "Logan": 4.00, "Mahoning": 4.00, "Marion": 4.00, "Meigs": 4.00, "Morrow": 4.00, "Muskingum": 4.00, "Noble": 4.00, "Ottawa": 4.00, "Paulding": 4.00, "Perry": 4.00, "Pike": 4.00, "Portage": 4.00, "Putnam": 4.00, "Richland": 4.00, "Ross": 4.00, "Sandusky": 4.00, "Scioto": 4.00, "Seneca": 4.00, "Shelby": 4.00, "Stark": 4.00, "Summit": 4.00, "Trumbull": 4.00, "Tuscarawas": 4.00, "Union": 4.00, "Van Wert": 4.00, "Vinton": 4.00, "Washington": 4.00, "Williams": 4.00, "Wyandot": 4.00
};

// --- NEW 2026 OTIRB TITLE INSURANCE LOGIC ---
function calculateTitlePremium(salePrice: number, policyType: string, reissueEnabled: boolean, priorAmount: number) {
  const roundedAmount = Math.ceil(salePrice / 1000) * 1000;
  let remainingAmount = roundedAmount;
  let basePremium = 0;
  const breakdown: string[] = [`Base Amount: $${roundedAmount.toLocaleString()}`];

  if (remainingAmount > 0) {
      const tier1 = Math.min(remainingAmount, 250000);
      const tierCost = (tier1 / 1000) * 5.80;
      basePremium += tierCost;
      breakdown.push(`Tier 1 (Up to $250k): $${tier1.toLocaleString()} @ $5.80/k = $${tierCost.toFixed(2)}`);
      remainingAmount -= tier1;
  }
  if (remainingAmount > 0) {
      const tier2 = Math.min(remainingAmount, 250000);
      const tierCost = (tier2 / 1000) * 4.10;
      basePremium += tierCost;
      breakdown.push(`Tier 2 ($250k-$500k): $${tier2.toLocaleString()} @ $4.10/k = $${tierCost.toFixed(2)}`);
      remainingAmount -= tier2;
  }
  if (remainingAmount > 0) {
      const tier3 = Math.min(remainingAmount, 500000);
      const tierCost = (tier3 / 1000) * 3.20;
      basePremium += tierCost;
      breakdown.push(`Tier 3 ($500k-$1M): $${tier3.toLocaleString()} @ $3.20/k = $${tierCost.toFixed(2)}`);
      remainingAmount -= tier3;
  }
  if (remainingAmount > 0) {
      const tier4 = Math.min(remainingAmount, 4000000);
      const tierCost = (tier4 / 1000) * 3.10;
      basePremium += tierCost;
      breakdown.push(`Tier 4 ($1M-$5M): $${tier4.toLocaleString()} @ $3.10/k = $${tierCost.toFixed(2)}`);
      remainingAmount -= tier4;
  }

  let grossPremium = basePremium;
  if (typeof policyType === 'string' && policyType.toLowerCase().includes('homeowner')) {
      const surcharge = basePremium * 0.15;
      grossPremium += surcharge;
      breakdown.push(`Homeowner Surcharge: +$${surcharge.toFixed(2)}`);
  }

  let credit = 0;
  if (reissueEnabled && priorAmount > 0) {
      const cappedPrior = Math.min(priorAmount, salePrice);
      const { premium: priorBasePremium } = calculateTitlePremium(cappedPrior, 'standard', false, 0);
      credit = priorBasePremium * 0.30;
      breakdown.push(`Reissue Credit Applied (30% of prior premium): -$${credit.toFixed(2)}`);
  }

  let finalPremium = grossPremium - credit;

  const min = (typeof policyType === 'string' && policyType.toLowerCase().includes('homeowner')) ? 250 : 225;
  if (finalPremium < min) {
      finalPremium = min;
      breakdown.push(`Using minimum premium: $${min}`);
  }

  return { premium: parseFloat(finalPremium.toFixed(2)), breakdown };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Stripe webhook must be registered BEFORE express.json() to get raw body
  app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not set');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const priceId = session.metadata?.priceId;

      if (userId && priceId && STRIPE_PLANS[priceId]) {
        const plan = STRIPE_PLANS[priceId];
        console.log(`Activating ${plan.name} for user ${userId}: ${plan.credits} credits`);

        await supabaseAdmin
          .from('profiles')
          .update({
            membership_level: plan.level,
            skip_trace_credits: plan.credits,
            is_wct_vip: plan.level === 'Enterprise' || plan.level === 'Agency',
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
          })
          .eq('id', userId);
      }
    }

    if (event.type === 'invoice.paid') {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.subscription as string;

      if (subscriptionId) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id, stripe_subscription_id')
          .eq('stripe_subscription_id', subscriptionId)
          .single();

        if (profile) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = sub.items.data[0]?.price?.id;
          if (priceId && STRIPE_PLANS[priceId]) {
            await supabaseAdmin
              .from('profiles')
              .update({ skip_trace_credits: STRIPE_PLANS[priceId].credits })
              .eq('id', profile.id);
          }
        }
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('stripe_subscription_id', subscription.id)
        .single();

      if (profile) {
        await supabaseAdmin
          .from('profiles')
          .update({
            membership_level: 'Free',
            skip_trace_credits: 0,
            is_wct_vip: false,
            stripe_subscription_id: null,
          })
          .eq('id', profile.id);
      }
    }

    res.json({ received: true });
  });

  app.use(express.json());

  app.post("/api/net-to-seller/property-lookup", async (req, res) => {
    const { placeId, addressFull, lat, lng, city, state, zip } = req.body;
    
    // More robust Ohio check
    const isOhio = (state === 'OH' || state === 'Ohio') || 
                   (addressFull?.toLowerCase().includes("oh") || addressFull?.toLowerCase().includes("ohio"));
    
    if (!isOhio) {
      return res.status(400).json({ error: "This tool is currently available for Ohio properties only." });
    }

    try {
      const attomKey = process.env.ATTOM_API;
      if (!attomKey) {
        console.error("ATTOM API key is missing from environment variables.");
        return res.status(500).json({ error: "ATTOM API key is not configured." });
      }

      console.log('Property Lookup Request:', { addressFull, city, state, zip });

      let address1 = "";
      let address2 = "";

      // Improved parsing logic
      if (city && state) {
        address2 = `${city}, ${state}`;
        if (zip) address2 += ` ${zip}`;
        
        // Try to extract street address from addressFull
        const cityIndex = addressFull.toLowerCase().indexOf(city.toLowerCase());
        if (cityIndex > 0) {
          let part1 = addressFull.substring(0, cityIndex).trim();
          while (part1.endsWith(',')) part1 = part1.slice(0, -1).trim();
          address1 = part1;
        } else {
          const parts = addressFull.split(',');
          address1 = parts[0].trim();
        }
      } else {
        // Fallback to comma splitting
        const parts = addressFull.split(',');
        if (parts.length >= 2) {
          address1 = parts[0].trim();
          address2 = parts.slice(1).join(',').trim();
        } else {
          address1 = addressFull;
          address2 = "";
        }
      }
      
      address2 = address2.replace(', USA', '').replace(', US', '').trim();

      console.log('Parsed Address for ATTOM:', { address1, address2 });

      if (!address1 || !address2) {
        console.warn('Address parsing failed for:', addressFull);
        return res.json({ success: false, message: "Could not parse address into street and city/state. Please verify the address format." });
      }

      let ownerName = "";
      let parcelNumber = "";
      let annualTaxes = 0;
      let propertyType = "";
      let beds = 0;
      let baths = 0;
      let sqft = 0;
      let taxYear = new Date().getFullYear() - 1;
      let priorSalePrice = 0;
      let priorSaleDate = "";
      let comps: any[] = [];
      let avmValue = 0;
      let avmLow = 0;
      let avmHigh = 0;

      const attomUrl = `https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/expandedprofile?address1=${encodeURIComponent(address1)}&address2=${encodeURIComponent(address2)}`;
      const attomResponse = await fetch(attomUrl, { headers: { 'apikey': attomKey, 'Accept': 'application/json' } });

      if (!attomResponse.ok) {
        throw new Error(`ATTOM API responded with status: ${attomResponse.status}`);
      }

      const attomData = await attomResponse.json();
      console.log('ATTOM Response Status:', attomResponse.status);
      console.log('ATTOM Data (first 200 chars):', JSON.stringify(attomData).substring(0, 200));

      const property = attomData.property?.[0];
      
      if (property) {
        console.log('Property found in ATTOM records.');
        const owner1 = property.assessment?.owner?.owner1;
        const owner2 = property.assessment?.owner?.owner2;
        
        let primaryOwner = "";
        if (owner1?.fullName) primaryOwner = owner1.fullName;
        else if (owner1?.fullname) primaryOwner = owner1.fullname;
        else if (owner1?.firstNameAndMi && owner1?.lastName) primaryOwner = `${owner1.firstNameAndMi} ${owner1.lastName}`;
        else if (owner1?.firstname && owner1?.lastname) primaryOwner = `${owner1.firstname} ${owner1.lastname}`;
        
        let secondaryOwner = "";
        if (owner2?.fullName) secondaryOwner = owner2.fullName;
        else if (owner2?.fullname) secondaryOwner = owner2.fullname;
        else if (owner2?.firstNameAndMi && owner2?.lastName) secondaryOwner = `${owner2.firstNameAndMi} ${owner2.lastName}`;
        else if (owner2?.firstname && owner2?.lastname) secondaryOwner = `${owner2.firstname} ${owner2.lastname}`;

        if (primaryOwner && secondaryOwner) {
          ownerName = `${primaryOwner} & ${secondaryOwner}`;
        } else {
          ownerName = primaryOwner || secondaryOwner || "";
        }
        
        if (property.identifier?.apn) parcelNumber = property.identifier.apn;
        if (property.assessment?.tax?.taxAmt) annualTaxes = property.assessment.tax.taxAmt;
        if (property.assessment?.tax?.taxYear) taxYear = parseInt(property.assessment.tax.taxYear);
        if (property.summary?.propclass) propertyType = property.summary.propclass;
        if (property.building?.rooms?.beds) beds = property.building.rooms.beds;
        if (property.building?.rooms?.bathstotal) baths = property.building.rooms.bathstotal;
        if (property.building?.size?.universalsize) sqft = property.building.size.universalsize;
        if (property.sale?.amount?.saleAmt) priorSalePrice = property.sale.amount.saleAmt;
        if (property.sale?.saleTransDate) priorSaleDate = property.sale.saleTransDate;

        try {
          const compsUrl = `https://api.gateway.attomdata.com/property/v2/salescomparables/address/${encodeURIComponent(address1)}/${encodeURIComponent(city || '')}/US/${encodeURIComponent(state || '')}/${encodeURIComponent(zip || '')}?searchType=Radius&minComps=1&maxComps=5&miles=2`;
          const compsResponse = await fetch(compsUrl, { headers: { 'apikey': attomKey, 'Accept': 'application/json' } });
          if (compsResponse.ok) {
            const compsData = await compsResponse.json();
            let properties = compsData.RESPONSE_GROUP?.RESPONSE?.RESPONSE_DATA?.PROPERTY_INFORMATION_RESPONSE_ext?.SUBJECT_PROPERTY_ext?.PROPERTY || [];
            if (!Array.isArray(properties)) properties = [properties];
            
            const filteredProperties = properties.filter((p: any) => p && p.COMPARABLE_PROPERTY_ext);
            comps = filteredProperties.map((p: any) => {
              const comp = p.COMPARABLE_PROPERTY_ext?.PROPERTY;
              if (!comp) return null;
              
              const addressObj = comp.address || {};
              const addressStr = addressObj.oneLine || 
                              `${addressObj.line1 || ''}, ${addressObj.locality || ''}, ${addressObj.countrySubd || ''} ${addressObj.postal1 || ''}`.replace(/^[,\s]+|[,\s]+$/g, '');
              return {
                address: addressStr,
                salePrice: comp.sale?.amount?.saleAmt || 0,
                saleDate: comp.sale?.saleTransDate || '',
                beds: comp.building?.rooms?.beds || 0,
                baths: comp.building?.rooms?.bathstotal || 0,
                sqft: comp.building?.size?.universalsize || 0
              };
            }).filter(Boolean);
          }
        } catch (compsError) {
          console.error("ATTOM Comps Lookup Failed:", compsError);
        }

        try {
          const avmUrl = `https://api.gateway.attomdata.com/propertyapi/v1.0.0/avm/snapshot?address1=${encodeURIComponent(address1)}&address2=${encodeURIComponent(address2)}`;
          const avmResponse = await fetch(avmUrl, { headers: { 'apikey': attomKey, 'Accept': 'application/json' } });
          if (avmResponse.ok) {
            const avmData = await avmResponse.json();
            const avm = avmData.property?.[0]?.avm?.amount;
            avmValue = avm?.value || 0;
            avmLow = avm?.low || 0;
            avmHigh = avm?.high || 0;
          }
        } catch (avmError) {
          console.error("ATTOM AVM Lookup Failed:", avmError);
        }
      } else {
        return res.json({ success: false, message: "Could not find property records." });
      }

      return res.json({
        success: true,
        data: {
          isOhio: true,
          ownerName,
          parcelNumber,
          annualTaxes,
          propertyType,
          beds,
          baths,
          sqft,
          taxYear,
          priorSalePrice,
          priorSaleDate,
          comps,
          avmValue,
          avmLow,
          avmHigh
        }
      });

    } catch (error) {
      console.error("Property Lookup API Error:", error);
      res.json({ success: false, message: "Could not find property records." });
    }
  });

  app.post("/api/net-to-seller/calculate", async (req, res) => {
    const inputs = req.body;
    const companyName = inputs.company_name || 'World Class Title';

    // Fetch fees for the company from Supabase
    let companyFees = null;
    try {
      const { data, error } = await supabase
        .from('title_fees')
        .select('*')
        .eq('company_name', companyName)
        .single();
      
      if (!error && data) {
        companyFees = data;
      }
    } catch (err) {
      console.error("Error fetching company fees:", err);
    }
    
    const calculateForPrice = (price: number) => {
      if (!price) return null;
      
      let commissionAmount = 0;
      if (inputs.payingCommission === 'yes') {
        if (inputs.commissionType === 'percent') {
          const sellerComm = (price * (Number(inputs.sellerCommission || 0) / 100));
          const buyerComm = (price * (Number(inputs.buyerCommission || 0) / 100));
          commissionAmount = sellerComm + buyerComm + cleanNum(inputs.brokerageFee);
        } else {
          commissionAmount = cleanNum(inputs.commissionValue) + cleanNum(inputs.brokerageFee);
        }
      }
        
      const payoffsTotal = (inputs.mortgagePayoffs || []).reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);
      const homeWarranty = Number(inputs.homeWarranty || 0);
      const creditsTotal = Number(inputs.sellerConcessions || 0) + 
                           Number(inputs.repairCredits || 0) + 
                           Number(inputs.otherCredits || 0);
      
      const otherCostsTotal = (inputs.otherCosts || []).reduce((acc: number, c: any) => acc + (Number(c.amount) || 0), 0);
      
      // Use company-specific fees if available, otherwise fallback to global config
      let estimatedClosingCosts = 0;
      let closingCostsBreakdown: { label: string; value: number }[] = [];

      if (companyFees) {
        closingCostsBreakdown = [
          { label: "Settlement Fee", value: Number(companyFees.seller_settlement || 0) },
          { label: "Title Search Fee", value: Number(companyFees.seller_search || 0) },
          { label: "Admin Fee", value: Number(companyFees.seller_admin || 0) },
          { label: "Delivery Fee", value: Number(companyFees.seller_delivery || 0) },
          { label: "Deed Preparation", value: Number(companyFees.seller_deed_prep || 0) },
          { label: "Recording Fee", value: WCT_CONFIG.feeSchedule["Recording Fee"] || 40 }
        ];
        estimatedClosingCosts = closingCostsBreakdown.reduce((a, b) => a + b.value, 0);
      } else {
        const fees = WCT_CONFIG.feeSchedule;
        estimatedClosingCosts = Object.values(fees).reduce((a, b) => a + b, 0);
        closingCostsBreakdown = Object.entries(fees).map(([label, value]) => ({ label, value }));
      }
      
      // Transfer tax based on county
      const rawCounty = inputs.county || '';
      const cleanCounty = rawCounty.replace(/ County$/i, '').trim();
      const countyRate = OHIO_COUNTY_TAX_RATES[cleanCounty] || 4.00;
      const estimatedTransferTax = Math.ceil((price / 1000) * countyRate);

      // Tax proration
      const annualTaxes = Number(inputs.annualTaxes) || 0;
      const estimatedTaxProration = annualTaxes / 2;

      // Title Premium (OTIRB)
      let estimatedTitlePremium = 0;
      let titlePremiumBreakdown: string[] = [];
      
      if (WCT_CONFIG.settings.includeTitlePremium) {
        // Fix 1: Use .includes('yes') to catch "Yes (30% Discount)" from the UI
        const reissueStr = String(inputs.reissueCredit || '').toLowerCase();
        const reissueEnabled = reissueStr.includes('yes') || reissueStr === 'true';
        
        // Fix 2: Safely check both possible variable names for the Prior Policy
        const priorPrice = cleanNum(inputs.priorPolicyAmount) || cleanNum(inputs.priorSalePrice);
        
        console.log("Calculating Title Premium with:", { price, policyType: inputs.policyType, reissueEnabled, priorPrice });
        
        const result = calculateTitlePremium(price, inputs.policyType, reissueEnabled, priorPrice);
        estimatedTitlePremium = result.premium;
        titlePremiumBreakdown = result.breakdown;
      }

      const netProceeds = price - commissionAmount - payoffsTotal - creditsTotal - homeWarranty - 
                          estimatedClosingCosts - estimatedTransferTax - estimatedTaxProration - 
                          estimatedTitlePremium - (Number(inputs.hoaTransferFee) || 0) - otherCostsTotal;

      return {
        salePrice: price,
        commissionAmount,
        payoffsTotal,
        creditsTotal,
        homeWarranty,
        estimatedClosingCosts,
        closingCostsBreakdown,
        estimatedTransferTax,
        estimatedTaxProration,
        estimatedTitlePremium,
        titlePremiumBreakdown,
        netProceeds,
        transferTaxRate: countyRate,
        transferTaxCounty: cleanCounty
      };
    };

    // Use cleanNum to prevent NaN from string formats like "$800,000.00"
    const primary = calculateForPrice(cleanNum(inputs.salePrice));
    const scenario2 = calculateForPrice(cleanNum(inputs.salePrice2));
    const scenario3 = calculateForPrice(cleanNum(inputs.salePrice3));

    // Stream search data to Supabase silently
    if (supabaseUrl && supabaseKey) {
      supabase.from('agent_searches').insert([{
        target_address: inputs.address || inputs.propertyAddress || inputs.addressFull || 'Unknown Address',
        // Only include columns that are likely to exist based on other parts of the app
        // We'll skip net_to_seller and sale_price if they are causing schema errors
      }]).then(({ error }) => {
        if (error) console.error('Supabase Search Log Error:', error.message);
        else console.log('Successfully logged agent search to Supabase.');
      });
    }

    // --- Slack Notification ---
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (slackWebhookUrl) {
      const searchedAddress = inputs.address || inputs.propertyAddress || inputs.addressFull || 'An unknown address';
      const salePriceRaw = cleanNum(inputs.salePrice) || 0;
      
      // Format the number nicely for Slack
      const salePriceFormatted = new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD',
        maximumFractionDigits: 0
      }).format(salePriceRaw);

      const slackPayload = {
        text: `🚨 *New Net-to-Seller Search!*\n*Address:* ${searchedAddress}\n*Est. Sale Price:* ${salePriceFormatted}`
      };

      fetch(slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackPayload)
      }).catch(err => console.error('Slack Webhook Error:', err));
    }
    // --------------------------

    // Legacy response format for primary + scenarios array
    res.json({
      ...primary,
      estimatedNetProceeds: primary?.netProceeds,
      mortgagePayoffsTotal: primary?.payoffsTotal,
      sellerCreditsTotal: primary?.creditsTotal,
      otherCostsTotal: (inputs.otherCosts || []).reduce((acc: number, c: any) => acc + (Number(c.amount) || 0), 0),
      estimatedClosingCostsTotal: primary?.estimatedClosingCosts,
      scenarios: [primary, scenario2, scenario3].filter(Boolean),
      calcJson: JSON.stringify({
        breakdown: primary,
        scenarios: [primary, scenario2, scenario3].filter(Boolean)
      })
    });
  });

  // 4. Share Estimate
  app.post("/api/net-to-seller/share", async (req, res) => {
    const { estimateId, recipientEmail } = req.body;

    const { data: estimate, error: fetchErr } = await supabaseAdmin
      .from('nts_estimates')
      .select('id, share_count')
      .eq('id', estimateId)
      .single();

    if (fetchErr || !estimate) return res.status(404).json({ error: "Estimate not found" });

    // Increment share count
    await supabaseAdmin
      .from('nts_estimates')
      .update({ share_count: (estimate.share_count || 0) + 1 })
      .eq('id', estimateId);

    // In a real app, we would send an email here.
    console.log(`Emailing estimate ${estimateId} to ${recipientEmail}`);

    res.json({ success: true });
  });

  // 3. Create Estimate
  app.post("/api/net-to-seller/create", async (req, res) => {
    const data = req.body;
    const id = crypto.randomUUID();
    const shareToken = crypto.randomUUID().split('-')[0];

    const { error } = await supabaseAdmin
      .from('nts_estimates')
      .insert({
        id,
        user_id: data.userId || null,
        address_full: data.addressFull,
        unit: data.unit,
        city: data.city,
        state: data.state,
        zip: data.zip,
        county: data.county,
        is_ohio: !!data.isOhio,
        place_id: data.placeId,
        lat: data.lat,
        lng: data.lng,
        owner_name: data.ownerName,
        owner_mailing_address: data.ownerMailingAddress,
        parcel_number: data.parcelNumber,
        property_type: data.propertyType,
        beds: data.beds,
        baths: data.baths,
        sqft: data.sqft,
        tax_year: data.taxYear,
        annual_taxes: data.annualTaxes,
        homestead: !!data.homestead,
        sale_price: data.salePrice,
        closing_date: data.closingDate,
        commission_type: data.commissionType,
        commission_value: data.commissionValue,
        commission_amount: data.commissionAmount,
        seller_credits_total: data.sellerCreditsTotal,
        mortgage_payoffs: data.mortgagePayoffs || [],
        mortgage_payoffs_total: data.mortgagePayoffsTotal,
        home_warranty: data.homeWarranty || 0,
        hoa_monthly: data.hoaMonthly,
        hoa_transfer_fee: data.hoaTransferFee,
        other_costs: data.otherCosts || [],
        other_costs_total: data.otherCostsTotal,
        estimated_closing_costs_total: data.estimatedClosingCostsTotal,
        estimated_title_premium: data.estimatedTitlePremium || 0,
        estimated_transfer_tax: data.estimatedTransferTax,
        estimated_tax_proration: data.estimatedTaxProration,
        estimated_net_proceeds: data.estimatedNetProceeds || data.netProceeds || 0,
        inputs_json: data.inputs || {},
        calc_json: data.calcJson || {},
        share_token: shareToken,
        share_count: 0
      });

    if (error) {
      console.error("Create estimate error:", error);
      return res.status(500).json({ error: "Failed to create estimate" });
    }

    res.json({ id, shareToken });
  });

  // 4. Get Estimate (Internal for results page)
  // Returns camelCase keys to match the frontend expectations
  app.get("/api/net-to-seller/estimate/:id", async (req, res) => {
    const { data: estimate, error } = await supabaseAdmin
      .from('nts_estimates')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !estimate) return res.status(404).json({ error: "Estimate not found" });

    // Map snake_case Supabase columns back to camelCase for the frontend
    res.json({
      id: estimate.id,
      userId: estimate.user_id,
      createdAt: estimate.created_at,
      updatedAt: estimate.updated_at,
      addressFull: estimate.address_full,
      unit: estimate.unit,
      city: estimate.city,
      state: estimate.state,
      zip: estimate.zip,
      county: estimate.county,
      isOhio: estimate.is_ohio,
      placeId: estimate.place_id,
      lat: estimate.lat,
      lng: estimate.lng,
      ownerName: estimate.owner_name,
      ownerMailingAddress: estimate.owner_mailing_address,
      parcelNumber: estimate.parcel_number,
      propertyType: estimate.property_type,
      beds: estimate.beds,
      baths: estimate.baths,
      sqft: estimate.sqft,
      taxYear: estimate.tax_year,
      annualTaxes: estimate.annual_taxes,
      homestead: estimate.homestead,
      salePrice: estimate.sale_price,
      closingDate: estimate.closing_date,
      commissionType: estimate.commission_type,
      commissionValue: estimate.commission_value,
      commissionAmount: estimate.commission_amount,
      sellerCreditsTotal: estimate.seller_credits_total,
      mortgagePayoffs: estimate.mortgage_payoffs,
      mortgagePayoffsTotal: estimate.mortgage_payoffs_total,
      homeWarranty: estimate.home_warranty,
      hoaMonthly: estimate.hoa_monthly,
      hoaTransferFee: estimate.hoa_transfer_fee,
      otherCosts: estimate.other_costs,
      otherCostsTotal: estimate.other_costs_total,
      estimatedClosingCostsTotal: estimate.estimated_closing_costs_total,
      estimatedTitlePremium: estimate.estimated_title_premium,
      estimatedTransferTax: estimate.estimated_transfer_tax,
      estimatedTaxProration: estimate.estimated_tax_proration,
      estimatedNetProceeds: estimate.estimated_net_proceeds,
      inputsJson: typeof estimate.inputs_json === 'string' ? estimate.inputs_json : JSON.stringify(estimate.inputs_json),
      calcJson: typeof estimate.calc_json === 'string' ? estimate.calc_json : JSON.stringify(estimate.calc_json),
      shareToken: estimate.share_token,
      shareCount: estimate.share_count
    });
  });

  app.post("/api/net-to-seller/prospects", async (req, res) => {
    const { lat, lng } = req.body;
    const attomKey = process.env.ATTOM_API;

    if (!attomKey || !lat || !lng) {
      return res.json({ success: false, prospects: [] });
    }

    try {
      // Step 1: Get nearby properties via snapshot
      const snapshotUrl = `https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/snapshot?latitude=${lat}&longitude=${lng}&radius=3&pageSize=40&propertytype=SINGLE%20FAMILY%20RESIDENCE`;
      const snapshotRes = await fetch(snapshotUrl, {
        headers: { apikey: attomKey, accept: 'application/json' }
      });

      if (!snapshotRes.ok) {
        const errorText = await snapshotRes.text();
        return res.status(400).json({ 
          success: false, 
          prospects: [], 
          errorDetail: 'ATTOM Snapshot Error: ' + errorText 
        });
      }

      const snapshotData = await snapshotRes.json();
      const initialProps = (snapshotData.property || []).slice(0, 40);
      
      if (initialProps.length === 0) {
        return res.json({ success: true, prospects: [] });
      }

      // Step 2 & 3: Fetch expanded profiles concurrently
      const profilePromises = initialProps.map(async (p: any) => {
        const attomId = p.identifier?.attomId;
        if (!attomId) return null;
        
        try {
          const expandedUrl = `https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/expandedprofile?attomid=${attomId}`;
          const expandedRes = await fetch(expandedUrl, {
            headers: { apikey: attomKey, accept: 'application/json' }
          });
          
          if (!expandedRes.ok) return null;
          const data = await expandedRes.json();
          return data.property?.[0] || null;
        } catch (err) {
          return null;
        }
      });

      const properties = (await Promise.all(profilePromises)).filter(Boolean);

      // Step 4: Map and score detailed data
      const prospects = properties.map((p: any) => {
        let sellScore = 0;
        const tags: string[] = [];

        // Parse Owner Name
        const owner = p.assessment?.owner?.owner1;
        const ownerName = owner?.fullName || owner?.fullname || owner?.label || 'Unknown Owner';

        // Condition 1: Length of Ownership (High Equity / Life Event)
        const saleDateStr = p.sale?.amount?.saleRecDate || p.sale?.amount?.salerecdate;
        if (saleDateStr) {
          const saleDate = new Date(saleDateStr);
          const now = new Date();
          const diffYears = (now.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
          
          if (diffYears >= 15 && saleDate.getFullYear() > 1900) {
            sellScore += 3;
            tags.push("15+ Years Owned");
          } else if (diffYears >= 7 && saleDate.getFullYear() > 1900) {
            sellScore += 2;
            tags.push("7+ Years Owned");
          }
        }

        // Condition 2: Absentee / Investor
        if (p.summary?.absenteeInd === 'A') {
          sellScore += 2;
          tags.push("Absentee Owner");
        }

        // Condition 3: Corporate / Trust Offload
        if (ownerName.match(/\b(LLC|INC|TRUST|PARTNERS|CORP|COMPANY)\b/i)) {
          sellScore += 2;
          tags.push("Corporate/Trust Owner");
        }

        // Condition 4: Financial Distress (Tax Delinquency)
        const delinquentYear = p.assessment?.tax?.delinquentYear;
        if (delinquentYear && delinquentYear > 0) {
          sellScore += 3;
          tags.push("Tax Delinquent");
        }

        // Estimated Value Range Calculation
        let estimatedValueRange = 'Est. Value Unknown';
        const estimatedValue = p.assessment?.market?.mktTtlValue || p.assessment?.assessed?.assdTtlValue;
        
        if (estimatedValue) {
          const low = estimatedValue * 0.95;
          const high = estimatedValue * 1.05;
          
          const formatPrice = (val: number) => {
            if (val >= 1000000) {
              return `$${(val / 1000000).toFixed(1)}M`;
            }
            return `$${Math.round(val / 1000)}k`;
          };

          // User requested Low - High format: $1.4M - $1.7M
          estimatedValueRange = `Est. Value ${formatPrice(low)} - ${formatPrice(high)}`;
        }

        return {
          address: {
            oneLine: p.address?.oneLine || '',
            line1: p.address?.line1 || '',
            locality: p.address?.locality || '',
            countrySubd: p.address?.stateIndicator || '',
            postal1: p.address?.postalMemberCode || ''
          },
          mailingAddress: p.assessment?.owner?.mailingAddress?.oneLine || '',
          ownerName: ownerName,
          sellScore,
          tags,
          estimatedValueRange
        };
      });

      const top15 = prospects
      .filter((p: any) => p.sellScore > 0)
      .sort((a: any, b: any) => b.sellScore - a.sellScore)
      .slice(0, 15);

      // Stream data to Supabase silently
      const leadsToInsert = top15.map((p: any) => ({
        owner_name: p.ownerName || 'Unknown',
        property_address: p.address?.oneLine || p.address?.line1 || 'Unknown Address',
        sell_score: p.sellScore || 0,
        tags: p.tags ? p.tags.join(', ') : ''
      }));

      if (leadsToInsert.length > 0 && supabaseUrl && supabaseKey) {
        // Silently insert into Supabase without awaiting, so we don't slow down the user's UI
        supabase.from('prospect_leads').insert(leadsToInsert).then(({ error }) => {
          if (error) console.error('Supabase Insert Error:', error.message);
          else console.log(`Successfully logged ${leadsToInsert.length} leads to Supabase.`);
        });
      }

      res.json({ success: true, prospects: top15 });
    } catch (error: any) {
      console.error("Prospects API Error:", error);
      res.status(500).json({ 
        success: false, 
        prospects: [], 
        errorDetail: error.message 
      });
    }
  });

  // 5. Register User
  app.post("/api/register", async (req, res) => {
    const { name, email, phone, brokerage, salesRep, estimateId } = req.body;

    if (!name || !email || !phone || !brokerage || !salesRep) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const userId = crypto.randomUUID();

    try {
      const { error: insertErr } = await supabaseAdmin
        .from('nts_users')
        .insert({
          id: userId,
          name,
          email,
          phone,
          brokerage,
          sales_rep: salesRep
        });

      if (insertErr) throw insertErr;

      if (estimateId) {
        await supabaseAdmin
          .from('nts_estimates')
          .update({ user_id: userId })
          .eq('id', estimateId);
      }

      res.json({ success: true, userId });
    } catch (err: any) {
      console.error("Registration error:", err);
      res.status(500).json({ error: "Failed to register user" });
    }
  });

  // Individual Skip Trace Endpoint (BatchData)
  app.post('/api/skip-trace', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No authorization header' });

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const { 
      property_address, 
      owner_name, 
      ownerName,
      firstName, 
      lastName, 
      address, 
      city, 
      locality,
      state, 
      zip 
    } = req.body;

    const searchAddress = address || property_address || "";
    const searchName = ownerName || owner_name || (firstName && lastName ? `${firstName} ${lastName}` : "");
    const searchCity = locality || city || "";

    if (!searchAddress) return res.status(400).json({ error: 'Missing property address' });

    try {
      // 1. Check Profile & Credits
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('is_wct_vip, skip_trace_credits')
        .eq('id', user.id)
        .single();

      if (profileError) throw new Error('Could not verify user profile');

      const isVip = profile?.is_wct_vip === true;
      const credits = profile?.skip_trace_credits || 0;

      if (!isVip && credits <= 0) {
        return res.status(402).json({ error: 'Insufficient credits. Please upgrade your plan.', upgrade: true });
      }

      // 2. Check Vault
      const { data: existingLead } = await supabaseAdmin
        .from('unlocked_leads')
        .select('*')
        .eq('user_id', user.id)
        .eq('property_address', searchAddress)
        .maybeSingle();

      if (existingLead) {
        return res.json({
          phones: existingLead.phones,
          emails: existingLead.emails,
          unmaskedName: existingLead.owner_name,
          unmaskedAddress: existingLead.property_address,
          fromVault: true
        });
      }

      // 3. Call BatchData
      const batchDataKey = process.env.BATCHDATA_API_KEY;
      if (!batchDataKey) throw new Error('BatchData API key not configured');

      // Robust parsing for BatchData
      let finalStreet = searchAddress;
      let finalCity = searchCity;
      let finalState = state || '';
      let finalZip = zip || '';
      let finalFirst = firstName || '';
      let finalLast = lastName || '';

      // If granular fields are missing, try to parse from the full address string
      if (!finalCity || !finalState) {
        const full = property_address || searchAddress || '';
        const parts = full.split(',');
        if (parts.length >= 3) {
          finalStreet = parts[0].trim();
          finalCity = parts[1].trim();
          const sz = parts[2].trim().split(' ');
          finalState = sz[0];
          finalZip = sz[sz.length - 1];
        } else if (parts.length === 2) {
          finalStreet = parts[0].trim();
          const sz = parts[1].trim().split(' ');
          if (sz.length >= 2) {
            finalCity = sz[0];
            finalState = sz[1];
            finalZip = sz[sz.length - 1];
          }
        }
      }

      if (!finalFirst || !finalLast) {
        const name = owner_name || '';
        const parts = name.trim().split(' ');
        finalFirst = parts[0];
        finalLast = parts.slice(1).join(' ');
      }

      const cleanZip = String(finalZip || '').split('-')[0].trim().substring(0, 5);
      
      // BatchData v1 Skip Trace Request Structure
      const batchRequest = {
        propertyAddress: {
          street: finalStreet,
          city: finalCity,
          state: finalState,
          zip: cleanZip
        },
        firstName: finalFirst,
        lastName: finalLast
      };

      console.log('BATCHDATA SKIP TRACE REQUEST:', JSON.stringify({ requests: [batchRequest] }));

      const batchResponse = await fetch('https://api.batchdata.com/api/v1/property/skip-trace', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${batchDataKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [batchRequest]
        })
      });

      if (!batchResponse.ok) {
        const errorText = await batchResponse.text();
        console.error('BatchData API Error Response:', errorText);
        throw new Error(`BatchData API Error: ${batchResponse.status} - ${errorText}`);
      }

      const batchData = await batchResponse.json();
      
      // Handle BatchData's response structure
      // Usually: { results: { persons: [ { phoneNumbers: [], emails: [] } ] } }
      const person = batchData?.results?.persons?.[0] || 
                     batchData?.results?.[0]?.data?.persons?.[0] ||
                     batchData?.results?.[0]?.persons?.[0];

      if (!person) {
        console.log('BatchData returned no person data:', JSON.stringify(batchData));
      }

      const phones = (person?.phoneNumbers || person?.phone_numbers || []).map((p: any) => ({
        number: p.phoneNumber || p.phone || p.number || '',
        type: p.type || 'unknown',
        status: p.status || 'unknown',
        isMostRecent: p.isMostRecent || p.is_most_recent || false
      })).filter((p: any) => p.number);

      const emails = (person?.emails || person?.email_addresses || []).map((e: any) => ({
        email: typeof e === 'string' ? e : e.email || e.email_address || '',
        type: e.type || 'unknown',
        isPrimary: e.isPrimary || e.is_primary || false
      })).filter((e: any) => e.email);

      // 4. Deduct Credits
      if (!isVip) {
        await supabaseAdmin
          .from('profiles')
          .update({ skip_trace_credits: credits - 1 })
          .eq('id', user.id);
      }

      // 5. Save to Vault
      await supabaseAdmin
        .from('unlocked_leads')
        .insert({
          user_id: user.id,
          property_address: searchAddress,
          owner_name: searchName,
          phones: phones,
          emails: emails
        });

      return res.json({
        phones,
        emails,
        unmaskedName: searchName,
        unmaskedAddress: searchAddress
      });

    } catch (err: any) {
      console.error('Skip trace error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // BatchData Skip Trace Endpoint
  app.post('/api/net-to-seller/skiptrace', async (req, res) => {
    const { prospects } = req.body;
    const batchDataKey = process.env.BATCHDATA_API_KEY;

    if (!batchDataKey) {
      return res.status(500).json({ success: false, error: "BatchData API Key not configured" });
    }

    try {
      if (!req.body.prospects || req.body.prospects.length === 0) {
        return res.status(400).json({ success: false, errorDetail: 'Payload is missing the prospects array.' });
      }

      // 1. Map and aggressively parse the address data
      const batchRequests = req.body.prospects.map((p: any) => {
        let state = p.address?.countrySubd || p.state || '';
        let zip = p.address?.postal1 || p.zip || '';

        // Fallback: Parse from oneLine if state or zip are missing
        if ((!state || !zip) && p.address?.oneLine) {
          const parts = p.address.oneLine.split(',');
          const lastPart = parts[parts.length - 1].trim(); // e.g., "OH 43207"
          const stateZip = lastPart.split(' ');
          if (stateZip.length >= 2) {
            state = state || stateZip[0]; // "OH"
            zip = zip || stateZip[stateZip.length - 1]; // "43207"
          }
        }

        const cleanZip = String(zip).split('-')[0].trim().substring(0, 5);

        return {
          propertyAddress: {
            street: String(p.address?.line1 || p.street || '').trim(),
            city: String(p.address?.locality || p.city || '').trim(),
            state: String(state).trim(),
            zip: cleanZip
          }
        };
      }).filter((req: any) => req.propertyAddress.street && req.propertyAddress.city && req.propertyAddress.state && req.propertyAddress.zip);

      if (batchRequests.length === 0) {
        return res.status(400).json({ success: false, errorDetail: 'No valid addresses found after parsing.' });
      }

      // 2. Fetch from BatchData
      const requestBody = { requests: batchRequests };

      const batchResponse = await fetch('https://api.batchdata.com/api/v1/property/skip-trace', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${process.env.BATCHDATA_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!batchResponse.ok) {
        const errorText = await batchResponse.text();
        return res.status(400).json({ success: false, errorDetail: 'BatchData Error: ' + errorText });
      }

      const batchData = await batchResponse.json();

      // 3. Merge back based on street address
      const enrichedProspects = req.body.prospects.map((prospect: any) => {
        // Find where this property was placed in our filtered request array
        const reqIndex = batchRequests.findIndex((req: any) => {
          const reqStreet = req.propertyAddress.street.toLowerCase();
          const pStreet = String(prospect.address?.line1 || prospect.street || '').trim().toLowerCase();
          return reqStreet === pStreet;
        });

        // If we sent it to BatchData, extract the corresponding result
        if (reqIndex !== -1 && batchData.results && Array.isArray(batchData.results.persons)) {
          const person1 = batchData.results.persons[reqIndex];
          
          if (person1) {
            // Capture up to 2 persons (primary and relatives/associates)
            const additionalPhones = person1.relatives ? person1.relatives.flatMap((r: any) => r.phoneNumbers || []) : [];
            const additionalEmails = person1.relatives ? person1.relatives.flatMap((r: any) => r.emails || []) : [];
            
            const phones = [...(person1.phoneNumbers || []), ...additionalPhones]
              .slice(0, 6)
              .map((p: any) => ({
                number: p.phoneNumber || p.number || '',
                type: p.type || 'unknown',
                status: p.status || 'unknown',
                isMostRecent: p.isMostRecent || false
              }))
              .filter((p: any) => p.number);

            const emails = [...(person1.emails || []), ...additionalEmails]
              .slice(0, 4)
              .map((e: any) => ({
                email: typeof e === 'string' ? e : e.email || '',
                type: e.type || 'unknown',
                isPrimary: e.isPrimary || false
              }))
              .filter((e: any) => e.email);

            return { 
              ...prospect, 
              phoneNumbers: phones,
              emails: emails
            };
          }
        }
        
        return prospect;
      });

      return res.json({ success: true, prospects: enrichedProspects });
    } catch (error: any) {
      console.error("Skip Trace API Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ═══ Stripe Checkout ═══
  app.post('/api/stripe/create-checkout', async (req, res) => {
    const { priceId, userId, email } = req.body;

    if (!priceId || !userId) {
      return res.status(400).json({ error: 'Missing priceId or userId' });
    }

    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        customer_email: email,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${req.headers.origin || 'https://nts-staging.onrender.com'}/?checkout=success`,
        cancel_url: `${req.headers.origin || 'https://nts-staging.onrender.com'}/pricing?checkout=cancelled`,
        metadata: { userId, priceId },
      });

      res.json({ url: session.url });
    } catch (err: any) {
      console.error('Stripe checkout error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
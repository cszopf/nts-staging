import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json();
    
    // Safety check: If this is accidentally hit by a prospects request
    if (body.lat || body.lng) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "This endpoint is for property-lookup, but received lat/lng (prospects data). Please check your frontend routing." 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { addressFull, city, state, zip } = body;
    
    const isOhio = addressFull?.toLowerCase().includes("oh") || addressFull?.toLowerCase().includes("ohio");
    if (!isOhio) {
      return new Response(
        JSON.stringify({ error: "This tool is currently available for Ohio properties only." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const attomKey = Deno.env.get('ATTOM_API');
    if (!attomKey) {
      return new Response(
        JSON.stringify({ error: "ATTOM API key is not configured in environment." }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let address1 = "";
    let address2 = "";

    if (city && state) {
      address2 = `${city}, ${state}`;
      if (zip) address2 += ` ${zip}`;
      const cityIndex = addressFull.indexOf(city);
      if (cityIndex > 0) {
        let part1 = addressFull.substring(0, cityIndex).trim();
        while (part1.endsWith(',')) part1 = part1.slice(0, -1).trim();
        address1 = part1;
      } else {
        const parts = addressFull.split(',');
        address1 = parts[0].trim();
      }
    } else {
      const firstCommaIndex = addressFull.indexOf(',');
      if (firstCommaIndex !== -1) {
        address1 = addressFull.substring(0, firstCommaIndex).trim();
        address2 = addressFull.substring(firstCommaIndex + 1).trim();
      } else {
        address1 = addressFull;
      }
    }
    
    address2 = address2.replace(', USA', '').replace(', US', '').trim();

    if (!address1 || !address2) {
      return new Response(
        JSON.stringify({ success: false, message: "Could not parse address into street and city/state." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
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
    let county = "";
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
    const property = attomData.property?.[0];
    
    if (property) {
      // Extract County
      if (property.address?.district) {
        county = property.address.district;
      }
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
      
      // Better Tax Extraction
      if (property.assessment?.tax?.taxAmt) {
        annualTaxes = property.assessment.tax.taxAmt;
      } else if (property.assessment?.tax?.taxAmtTotal) {
        annualTaxes = property.assessment.tax.taxAmtTotal;
      }
      
      if (property.assessment?.tax?.taxYear) taxYear = parseInt(property.assessment.tax.taxYear);
      if (property.summary?.propclass) propertyType = property.summary.propclass;
      if (property.building?.rooms?.beds) beds = property.building.rooms.beds;
      if (property.building?.rooms?.bathstotal) baths = property.building.rooms.bathstotal;
      if (property.building?.size?.universalsize) sqft = property.building.size.universalsize;
      
      // Better Sale Extraction - Look for the most recent "Full" sale if possible
      // In expandedprofile, 'sale' is usually the most recent transaction.
      if (property.sale?.amount?.saleAmt) priorSalePrice = property.sale.amount.saleAmt;
      if (property.sale?.saleTransDate) priorSaleDate = property.sale.saleTransDate;
      
      const priorSaleDocNum = property.sale?.amount?.saleDocNum || "";
      const priorSaleType = property.sale?.amount?.saleDocType || "";

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
      return new Response(
        JSON.stringify({ success: false, message: "Could not find property records." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
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
          priorSaleDocNum,
          priorSaleType,
          county,
          comps,
          avmValue,
          avmLow,
          avmHigh
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Property lookup function error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

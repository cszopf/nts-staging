import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    // 1. Bouncer Logic: Auth Token Extraction & Verification
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')

    // Create a Supabase client with the Auth context of the logged-in user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Get the user from the token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) throw new Error('Unauthorized')

    // Fetch the user's profile to check VIP status and credits
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('is_wct_vip, skip_trace_credits')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      throw new Error('Could not verify user profile')
    }

    const isVip = profile?.is_wct_vip === true
    const credits = profile?.skip_trace_credits || 0

    // VIPs have unlimited access, others need credits
    if (!isVip && credits <= 0) {
      return new Response(
        JSON.stringify({ error: 'Insufficient credits. Please contact WCT Admin to upgrade.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { ownerName, address, locality, zip, property_address, owner_name, firstName, lastName, city, state } = await req.json()
    
    // Construct search parameters with fallback to new keys
    const finalAddress = address || property_address || "";
    const finalCity = locality || city || "";
    const finalZip = zip || "";
    const finalOwnerName = ownerName || owner_name || "";

    if (!finalAddress) throw new Error('Missing property address')

    // 2. Check if this lead is already in the vault for this user (Prevent Double Billing)
    const { data: existingLead } = await supabaseClient
      .from('unlocked_leads')
      .select('*')
      .eq('user_id', user.id)
      .eq('property_address', finalAddress)
      .maybeSingle()

    if (existingLead) {
      console.log(`Lead already unlocked for user ${user.id}: ${finalAddress}`)
      return new Response(
        JSON.stringify({
          phones: existingLead.phones,
          emails: existingLead.emails,
          unmaskedName: existingLead.owner_name,
          unmaskedAddress: existingLead.property_address,
          fromVault: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Implement the Live Fetch to BatchData
    const apiKey = Deno.env.get('BATCHDATA_API_KEY')
    if (!apiKey) throw new Error('BatchData API key not configured in environment')

    console.log(`Performing live skip trace for: ${finalAddress}`)

    // Name splitting logic as requested
    let first = firstName || "";
    let last = lastName || "";
    if (!first && !last && finalOwnerName) {
      const parts = finalOwnerName.trim().split(' ');
      first = parts[0];
      last = parts.slice(1).join(' ');
    }

    const batchRequest: any = {
      propertyAddress: {
        street: finalAddress,
        city: finalCity,
        state: state || "",
        zip: finalZip
      }
    };

    if (first && last) {
      batchRequest.name = {
        first: first,
        last: last
      };
    } else {
      batchRequest.ownerName = finalOwnerName;
    }

    const batchResponse = await fetch('https://api.batchdata.com/api/v1/property/skip-trace', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        requests: [batchRequest]
      })
    })

    if (!batchResponse.ok) {
      const errorText = await batchResponse.text()
      console.error('BatchData API Error:', errorText)
      throw new Error(`BatchData API returned ${batchResponse.status}`)
    }

    const batchData = await batchResponse.json()
    
    // 4. Map the Response - Handle BatchData's array-based results
    const person = batchData?.results?.persons?.[0] || 
                   batchData?.results?.[0]?.data?.persons?.[0] || 
                   batchData?.results?.[0]?.persons?.[0];
    
    // Extract phone numbers with metadata
    const phoneNumbers = person?.phoneNumbers || person?.phone_numbers || [];
    const phones = phoneNumbers.map((p: any) => ({
      number: p.phoneNumber || p.phone || p.number || '',
      type: p.type || 'unknown',
      status: p.status || 'unknown',
      isMostRecent: p.isMostRecent || p.is_most_recent || false
    })).filter((p: any) => p.number) || []
    
    // Extract emails with metadata
    const emailList = person?.emails || person?.email_addresses || [];
    const emails = emailList.map((e: any) => ({
      email: typeof e === 'string' ? e : e.email || e.email_address || '',
      type: e.type || 'unknown',
      isPrimary: e.isPrimary || e.is_primary || false
    })).filter((e: any) => e.email) || []

    // 5. Credit Deduction Logic
    if (!isVip) {
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({ skip_trace_credits: credits - 1 })
        .eq('id', user.id)
      
      if (updateError) {
        console.error('Error deducting credit:', updateError)
      } else {
        console.log(`Deducted 1 credit from user ${user.id}. Remaining: ${credits - 1}`)
      }
    }

    // 6. Save to Vault
    const { error: vaultError } = await supabaseClient
      .from('unlocked_leads')
      .insert({
        user_id: user.id,
        property_address: finalAddress,
        owner_name: finalOwnerName,
        phones: phones,
        emails: emails
      })

    if (vaultError) {
      console.error('Error saving to vault:', vaultError)
    }

    // Return the mapped data
    return new Response(
      JSON.stringify({
        phones,
        emails,
        unmaskedName: finalOwnerName,
        unmaskedAddress: finalAddress
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Skip trace function error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

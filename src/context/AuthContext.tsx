import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext<any>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        console.log("1. Starting single-shot auth check...");
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        console.log("2. Session fetched:", session?.user?.email || 'No session');
        if (sessionError) throw sessionError;

        if (session?.user) {
          console.log("3. User ID found, fetching profile for:", session.user.id);
          
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (profileError) {
            console.error("Profile Fetch Error:", profileError);
          } else {
            console.log("4. Profile Data successfully fetched:", profileData);
          }
          
          if (mounted) {
            console.log("5. Updating user state with merged data...");
            setUser({ ...session.user, ...profileData });
          }
        } else {
          console.log("3. No session user found.");
          if (mounted) setUser(null);
        }
      } catch (err) {
        console.error('Auth Initialization Error:', err);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    // Clean up
    return () => {
      mounted = false;
    };
  }, []); // Strict empty array, no event listeners

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const refreshProfile = async () => {
    if (!user?.id) return;
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (!error && profileData) {
      setUser((prev: any) => ({ ...prev, ...profileData }));
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, signOut, refreshProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext<any>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (sessionUser: any) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .single();

      if (profileError) {
        console.error("Profile Fetch Error:", profileError);
        return { ...sessionUser };
      }
      return { ...sessionUser, ...profileData };
    } catch (err) {
      console.error("Profile fetch failed:", err);
      return { ...sessionUser };
    }
  };

  useEffect(() => {
    let mounted = true;

    // Initial session check
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          const merged = await fetchProfile(session.user);
          if (mounted) setUser(merged);
        } else {
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

    // Listen for auth state changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const merged = await fetchProfile(session.user);
        if (mounted) setUser(merged);
      } else {
        if (mounted) setUser(null);
      }
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = '/';
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

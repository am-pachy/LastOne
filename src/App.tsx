import Movimenti from "./components/Movimenti";
import Debiti from "./components/Debiti";
import Saldo from "./components/Saldo";
import Budget from "./components/Budget";
import Obiettivi from "./components/Obiettivi"
import { useEffect, useState } from 'react';
import LoginScreen from './LoginScreen';
import { MainApp } from './components/MainApp';
import { supabase } from './supabaseClient';

async function ensureUserProfile(user: any) {
  try {
    if (!user?.id) return;
    const emailName = (user.email || 'Utente').split('@')[0] || 'Utente';
    const normalizedName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
    const { error } = await supabase.from('user_profiles').upsert(
      {
        id: user.id,
        first_name: normalizedName,
        partner_name: null,
        custom_categories: [],
      },
      { onConflict: 'id' }
    );
    if (error) console.error('Errore ensureUserProfile:', error);
  } catch (err) {
    console.error('Errore imprevisto ensureUserProfile:', err);
  }
}

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function initSession() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) console.error('Errore getSession:', error);
        if (!mounted) return;
        setSession(data.session ?? null);
        setLoading(false);
        if (data.session?.user) ensureUserProfile(data.session.user);
      } catch (err) {
        console.error('Errore initSession:', err);
        if (mounted) setLoading(false);
      }
    }

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession ?? null);
      setLoading(false);
      if (nextSession?.user) ensureUserProfile(nextSession.user);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) return <div style={{ padding: 40, fontSize: 18 }}>Caricamento...</div>;
  if (!session) return <LoginScreen />;
  return <MainApp userId={session.user.id} />;
}

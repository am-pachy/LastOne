import { useEffect, useState } from 'react';
import { Euro, LayoutGrid, LogOut, PlusCircle, Sparkles, Wallet } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { s } from '../styles';
import { ActiveTab, BudgetRow, DebtRow, GoalRow, MovementRow, ToastState, ToastType, UserProfile } from '../types';
import { APP_WIDTH } from '../utils';
import { SezioneBudget } from './SezioneBudget';
import { SezioneDebiti } from './SezioneDebiti';
import { SezioneMovimenti } from './SezioneMovimenti';
import { SezioneObiettivi } from './SezioneObiettivi';
import { SezioneSaldo } from './SezioneSaldo';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

type ExtendedUserProfile = UserProfile & {
  username?: string | null;
  is_premium?: boolean | null;
  trial_ends_at?: string | null;
  subscription_plan?: string | null;
};

export function MainApp({ userId }: { userId: string }) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('movimenti');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const showToast = (text: string, type: ToastType) => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    setLoading(true);

    const [profileRes, movementsRes, debtsRes, goalsRes, budgetsRes] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('movements').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('debts_credits').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('goals').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('budgets').select('*').eq('user_id', userId).order('month_ref', { ascending: false }),
    ]);

    if (!profileRes.error) setProfile((profileRes.data as UserProfile | null) ?? null);
    if (!movementsRes.error) setMovements((movementsRes.data as MovementRow[]) ?? []);
    if (!debtsRes.error) setDebts((debtsRes.data as DebtRow[]) ?? []);
    if (!goalsRes.error) setGoals((goalsRes.data as GoalRow[]) ?? []);
    if (!budgetsRes.error) setBudgets((budgetsRes.data as BudgetRow[]) ?? []);

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  useEffect(() => {
    const handler = (event: Event) => {
      const e = event as BeforeInstallPromptEvent;
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      showToast('Errore durante il logout.', 'error');
    }
  };

  const handleInstallClick = async () => {
    if (!installPrompt) return;

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;

    if (choice.outcome === 'accepted') {
      setInstallPrompt(null);
      showToast('App installata con successo!', 'success');
    }
  };

  const startCheckout = async (plan: 'monthly' | 'yearly') => {
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, userId }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        showToast(data.error || 'Errore pagamento', 'error');
      }
    } catch {
      showToast('Errore pagamento', 'error');
    }
  };

  const typedProfile = profile as ExtendedUserProfile | null;

  const displayName =
    typedProfile?.username ||
    typedProfile?.first_name ||
    'Utente';

  const isTrialActive =
    !!typedProfile?.trial_ends_at &&
    new Date(typedProfile.trial_ends_at) > new Date();

  const hasAccess = !!typedProfile?.is_premium || isTrialActive;

  const remainingTrialDays =
    typedProfile?.trial_ends_at
      ? Math.max(
          0,
          Math.ceil(
            (new Date(typedProfile.trial_ends_at).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : 0;

  return (
    <div style={s.page}>
      <div style={s.shell}>
        <div style={s.app}>
          {toast ? (
            <div style={{ position: 'sticky', top: '14px', zIndex: 50, padding: '0 20px' }}>
              <div
                style={{
                  backgroundColor: toast.type === 'success' ? '#DCFCE7' : '#FEE2E2',
                  color: toast.type === 'success' ? '#166534' : '#B91C1C',
                  border: `1px solid ${toast.type === 'success' ? '#86EFAC' : '#FCA5A5'}`,
                  borderRadius: '18px',
                  padding: '14px 16px',
                  fontWeight: 700,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                }}
              >
                {toast.text}
              </div>
            </div>
          ) : null}

          <header style={s.header}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: 0, fontSize: '28px', fontWeight: '800', color: '#0F172A' }}>
                  Ciao, {displayName}! 🐍
                </h2>

                {!typedProfile?.is_premium && isTrialActive ? (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '12px 16px',
                      borderRadius: '16px',
                      background: '#FEF3C7',
                      color: '#92400E',
                      fontSize: '14px',
                      fontWeight: 600,
                    }}
                  >
                    🎁 Prova gratuita attiva: ti restano {remainingTrialDays} giorni
                  </div>
                ) : null}

                {!hasAccess ? (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '16px',
                      borderRadius: '16px',
                      background: '#EEF2FF',
                      color: '#1E3A8A',
                      boxShadow: '0 8px 24px rgba(74,108,247,0.08)',
                    }}
                  >
                    <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>
                      Il tuo periodo di prova è terminato
                    </div>
                    <div style={{ fontSize: '14px', marginBottom: '12px', lineHeight: 1.5 }}>
                      Sblocca SalvadaNoi Premium a €0,99/mese oppure €9,99/anno.
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => startCheckout('monthly')}
                        style={{
                          border: 'none',
                          background: '#4A6CF7',
                          color: 'white',
                          padding: '10px 16px',
                          borderRadius: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Mensile €0,99
                      </button>
                      <button
                        onClick={() => startCheckout('yearly')}
                        style={{
                          border: '1px solid #C7D2FE',
                          background: 'white',
                          color: '#3730A3',
                          padding: '10px 16px',
                          borderRadius: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Annuale €9,99
                      </button>
                    </div>
                  </div>
                ) : null}

                {installPrompt ? (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '12px 16px',
                      borderRadius: '16px',
                      background: '#EEF2FF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      boxShadow: '0 8px 24px rgba(74,108,247,0.08)',
                    }}
                  >
                    <span style={{ fontSize: '14px', color: '#3730A3', fontWeight: 600 }}>
                      Installa l’app per accesso rapido 🚀
                    </span>

                    <button
                      onClick={handleInstallClick}
                      style={{
                        border: 'none',
                        background: '#4A6CF7',
                        color: 'white',
                        padding: '8px 14px',
                        borderRadius: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Installa
                    </button>
                  </div>
                ) : null}
              </div>

              <button
                onClick={handleLogout}
                style={{
                  border: 'none',
                  background: 'white',
                  borderRadius: '16px',
                  width: '44px',
                  height: '44px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.05)',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <LogOut size={18} color="#64748B" />
              </button>
            </div>
          </header>

          <main style={{ padding: '0 20px' }}>
            {loading ? (
              <div style={s.card}>
                <p style={{ margin: 0, color: '#64748B' }}>Caricamento dati...</p>
              </div>
            ) : null}

            {!loading && !hasAccess ? (
              <div style={s.card}>
                <p style={{ margin: 0, color: '#64748B', lineHeight: 1.5 }}>
                  La tua prova gratuita è terminata. Attiva Premium per continuare a usare tutte le funzioni.
                </p>
              </div>
            ) : null}

            {!loading && hasAccess && activeTab === 'movimenti' && (
              <SezioneMovimenti
                userId={userId}
                movements={movements}
                customCategories={profile?.custom_categories ?? []}
                onSaved={loadData}
                showToast={showToast}
              />
            )}

            {!loading && hasAccess && activeTab === 'debiti' && (
              <SezioneDebiti userId={userId} debts={debts} onSaved={loadData} showToast={showToast} />
            )}

            {!loading && hasAccess && activeTab === 'saldo' && <SezioneSaldo movements={movements} />}

            {!loading && hasAccess && activeTab === 'budget' && (
              <SezioneBudget
                userId={userId}
                budgets={budgets}
                movements={movements}
                customCategories={profile?.custom_categories ?? []}
                onSaved={loadData}
                showToast={showToast}
              />
            )}

            {!loading && hasAccess && activeTab === 'obiettivi' && (
              <SezioneObiettivi userId={userId} goals={goals} onSaved={loadData} showToast={showToast} />
            )}
          </main>
        </div>

        <div
          style={{
            position: 'fixed',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            maxWidth: `${APP_WIDTH}px`,
            padding: '0 20px',
            boxSizing: 'border-box',
            pointerEvents: 'none',
          }}
        >
          <nav style={s.nav}>
            <button onClick={() => setActiveTab('movimenti')} style={s.navButton}>
              <PlusCircle size={24} color={activeTab === 'movimenti' ? '#3B82F6' : '#94A3B8'} />
            </button>
            <button onClick={() => setActiveTab('debiti')} style={s.navButton}>
              <Wallet size={24} color={activeTab === 'debiti' ? '#5DB386' : '#94A3B8'} />
            </button>
            <button onClick={() => setActiveTab('saldo')} style={s.navButton}>
              <LayoutGrid size={24} color={activeTab === 'saldo' ? '#2563EB' : '#94A3B8'} />
            </button>
            <button onClick={() => setActiveTab('budget')} style={s.navButton}>
              <Euro size={24} color={activeTab === 'budget' ? '#F59E0B' : '#94A3B8'} />
            </button>
            <button onClick={() => setActiveTab('obiettivi')} style={s.navButton}>
              <Sparkles size={24} color={activeTab === 'obiettivi' ? '#8B5CF6' : '#94A3B8'} />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}

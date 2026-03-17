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

export function MainApp({ userId }: { userId: string }) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('movimenti');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);

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

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      showToast('Errore durante il logout.', 'error');
    }
  };

  const firstName = profile?.first_name || 'Anna';
  const partnerName = profile?.partner_name || 'Michele';

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
              <div>
                <h2 style={{ margin: 0, fontSize: '28px', fontWeight: '800', color: '#0F172A' }}>Ciao, {firstName}! 🐍</h2>
                <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#94A3B8' }}>Insieme a {partnerName}</p>
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

            {!loading && activeTab === 'movimenti' && (
              <SezioneMovimenti userId={userId} movements={movements} customCategories={profile?.custom_categories ?? []} onSaved={loadData} showToast={showToast} />
            )}
            {!loading && activeTab === 'debiti' && <SezioneDebiti userId={userId} debts={debts} onSaved={loadData} showToast={showToast} />}
            {!loading && activeTab === 'saldo' && <SezioneSaldo movements={movements} />}
            {!loading && activeTab === 'budget' && (
              <SezioneBudget
                userId={userId}
                budgets={budgets}
                movements={movements}
                customCategories={profile?.custom_categories ?? []}
                onSaved={loadData}
                showToast={showToast}
              />
            )}
            {!loading && activeTab === 'obiettivi' && <SezioneObiettivi userId={userId} goals={goals} onSaved={loadData} showToast={showToast} />}
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

import { useState } from 'react';
import { Euro } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { s } from '../styles';
import { BudgetRow, MovementRow, ToastType } from '../types';
import { formatEuro, getBaseCategories, getMonthInputValue, getMonthlyCategorySpend, monthInputToDate, monthValueToLabel } from '../utils';

export function SezioneBudget({
  userId,
  budgets,
  movements,
  customCategories,
  onSaved,
  showToast,
}: {
  userId: string;
  budgets: BudgetRow[];
  movements: MovementRow[];
  customCategories: string[];
  onSaved: () => Promise<void>;
  showToast: (text: string, type: ToastType) => void;
}) {
  const categorie = getBaseCategories(customCategories);
  const [mese, setMese] = useState(getMonthInputValue());
  const [categoria, setCategoria] = useState(categorie[0] || 'Casa');
  const [importoBudget, setImportoBudget] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('tutte');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [messaggio, setMessaggio] = useState('');

  const budgetsMese = budgets.filter((b) => {
    const monthMatch = b.month_ref.slice(0, 7) === mese;
    const categoryMatch = filtroCategoria === 'tutte' ? true : b.category === filtroCategoria;
    return monthMatch && categoryMatch;
  });

  const alertRows = budgets
    .filter((b) => b.month_ref.slice(0, 7) === mese)
    .map((b) => {
      const spent = getMonthlyCategorySpend(movements, b.category, mese);
      const ratio = b.limit_amount > 0 ? spent / Number(b.limit_amount) : 0;
      return { ...b, spent, ratio, over: spent > Number(b.limit_amount), warning: spent <= Number(b.limit_amount) && ratio >= 0.8 };
    })
    .filter((x) => x.over || x.warning)
    .sort((a, b) => b.ratio - a.ratio);

  const resetForm = () => {
    setEditingId(null);
    setCategoria(categorie[0] || 'Casa');
    setImportoBudget('');
  };

  const salvaBudget = async () => {
    setMessaggio('');
    if (!categoria) return setMessaggio('Seleziona una categoria.');
    if (!importoBudget.trim()) return setMessaggio('Inserisci un importo budget.');

    setSaving(true);
    const amount = Number(importoBudget.replace(',', '.'));
    if (Number.isNaN(amount) || amount <= 0) {
      setMessaggio('Inserisci un importo valido maggiore di 0.');
      setSaving(false);
      return;
    }

    let error: { message: string } | null = null;
    if (editingId) {
      const res = await supabase.from('budgets').update({ month_ref: monthInputToDate(mese), category: categoria, limit_amount: amount }).eq('id', editingId).eq('user_id', userId);
      error = res.error;
    } else {
      const res = await supabase.from('budgets').upsert({ user_id: userId, month_ref: monthInputToDate(mese), category: categoria, limit_amount: amount }, { onConflict: 'user_id,month_ref,category' });
      error = res.error;
    }

    if (error) {
      setMessaggio(error.message);
      showToast(error.message, 'error');
      setSaving(false);
      return;
    }

    showToast(editingId ? 'Budget aggiornato.' : 'Budget salvato.', 'success');
    resetForm();
    setSaving(false);
    await onSaved();
  };

  const eliminaBudget = async (id: string) => {
    if (!window.confirm('Vuoi davvero eliminare questo budget?')) return;
    setDeletingId(id);
    const { error } = await supabase.from('budgets').delete().eq('id', id).eq('user_id', userId);
    if (error) {
      setMessaggio(error.message);
      showToast(error.message, 'error');
      setDeletingId(null);
      return;
    }
    if (editingId === id) resetForm();
    showToast('Budget eliminato.', 'success');
    setDeletingId(null);
    await onSaved();
  };

  const avviaModifica = (budget: BudgetRow) => {
    setEditingId(budget.id);
    setMese(budget.month_ref.slice(0, 7));
    setCategoria(budget.category);
    setImportoBudget(String(budget.limit_amount));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div>
      <div style={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}><Euro color="#F59E0B" /><h3 style={{ margin: 0, fontWeight: 800, color: '#1E293B' }}>Budget mensile</h3></div>
        <label style={s.labelIcon}>MESE</label>
        <input type="month" style={s.input} value={mese} onChange={(e) => setMese(e.target.value)} />
        <label style={s.labelIcon}>CATEGORIA</label>
        <select style={s.input} value={categoria} onChange={(e) => setCategoria(e.target.value)}>{categorie.map((cat) => <option key={cat} value={cat}>{cat}</option>)}</select>
        <label style={s.labelIcon}>IMPORTO BUDGET</label>
        <input style={s.input} placeholder="€" value={importoBudget} onChange={(e) => setImportoBudget(e.target.value)} />
        <button style={{ ...s.btn, backgroundColor: '#F59E0B' }} onClick={salvaBudget} disabled={saving}>{saving ? 'Salvataggio...' : editingId ? 'Aggiorna budget' : 'Salva budget'}</button>
        {editingId && <button onClick={resetForm} style={{ width: '100%', marginTop: '10px', padding: '16px', borderRadius: '20px', border: '1.5px solid #CBD5E1', backgroundColor: 'white', color: '#475569', fontWeight: 700, cursor: 'pointer', fontSize: '15px' }}>Annulla modifica</button>}
        {messaggio ? <p style={{ marginTop: '12px', marginBottom: 0, color: '#DC2626' }}>{messaggio}</p> : null}
      </div>

      {alertRows.length > 0 && (
        <div style={s.card}>
          <div style={{ fontWeight: 800, color: '#1E293B', marginBottom: '14px' }}>Alert sforamento</div>
          <div style={{ display: 'grid', gap: '10px' }}>
            {alertRows.map((row) => (
              <div key={row.id} style={{ padding: '14px 16px', borderRadius: '18px', backgroundColor: row.over ? '#FEE2E2' : '#FEF3C7', border: `1px solid ${row.over ? '#FCA5A5' : '#FCD34D'}` }}>
                <div style={{ fontWeight: 800, color: row.over ? '#B91C1C' : '#92400E' }}>{row.category}</div>
                <div style={{ marginTop: '6px', fontSize: '13px', color: row.over ? '#991B1B' : '#92400E' }}>
                  {row.over ? `Budget sforato: ${formatEuro(row.spent)} / ${formatEuro(Number(row.limit_amount))}` : `Attenzione: sei all'${Math.round(row.ratio * 100)}% (${formatEuro(row.spent)} / ${formatEuro(Number(row.limit_amount))})`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={s.card}>
        <div style={{ fontWeight: 800, color: '#1E293B', marginBottom: '12px' }}>Filtri · {monthValueToLabel(mese)}</div>
        <label style={s.labelIcon}>FILTRA PER CATEGORIA</label>
        <select style={s.input} value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
          <option value="tutte">Tutte</option>
          {categorie.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
        </select>
      </div>

      {budgetsMese.length === 0 ? <div style={s.card}><p style={{ margin: 0, color: '#64748B' }}>Nessun budget impostato per {monthValueToLabel(mese)}.</p></div> : budgetsMese.map((budget) => {
        const spent = getMonthlyCategorySpend(movements, budget.category, mese);
        const limit = Number(budget.limit_amount);
        const progress = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
        const over = spent > limit;
        return (
          <div key={budget.id} style={{ ...s.card, borderLeft: `6px solid ${over ? '#DC2626' : '#F59E0B'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <div style={{ fontWeight: 800, color: '#0F172A' }}>{budget.category}</div>
                <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '6px' }}>{monthValueToLabel(budget.month_ref.slice(0, 7))}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, color: over ? '#DC2626' : '#0F172A' }}>{formatEuro(spent)} / {formatEuro(limit)}</div>
                <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '6px' }}>{over ? `Sforato di ${formatEuro(spent - limit)}` : `Residuo ${formatEuro(Math.max(limit - spent, 0))}`}</div>
              </div>
            </div>
            <div style={{ height: '8px', backgroundColor: '#F1F5F9', borderRadius: '10px', marginTop: '15px' }}><div style={{ width: `${progress}%`, height: '100%', backgroundColor: over ? '#DC2626' : '#F59E0B', borderRadius: '10px' }} /></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <button onClick={() => avviaModifica(budget)} style={{ border: 'none', backgroundColor: '#DBEAFE', color: '#2563EB', borderRadius: '12px', padding: '8px 12px', fontWeight: 700, cursor: 'pointer' }}>Modifica</button>
              <button onClick={() => eliminaBudget(budget.id)} disabled={deletingId === budget.id} style={{ border: 'none', backgroundColor: '#FEE2E2', color: '#DC2626', borderRadius: '12px', padding: '8px 12px', fontWeight: 700, cursor: 'pointer' }}>{deletingId === budget.id ? 'Elimino...' : 'Elimina'}</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

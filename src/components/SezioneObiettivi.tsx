import { useState } from 'react';
import { CheckCircle2, Pencil, Sparkles, Trash2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { s } from '../styles';
import { GoalRow, ToastType } from '../types';
import { formatData, formatEuro } from '../utils';

export function SezioneObiettivi({
  userId,
  goals,
  onSaved,
  showToast,
}: {
  userId: string;
  goals: GoalRow[];
  onSaved: () => Promise<void>;
  showToast: (text: string, type: ToastType) => void;
}) {
  const [nome, setNome] = useState('');
  const [target, setTarget] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [scadenza, setScadenza] = useState('');
  const [saving, setSaving] = useState(false);
  const [messaggio, setMessaggio] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setNome('');
    setTarget('');
    setCurrentAmount('');
    setScadenza('');
  };

  const salvaObiettivo = async () => {
    setMessaggio('');
    if (!nome.trim()) return setMessaggio('Inserisci il nome dell’obiettivo.');
    if (!target.trim()) return setMessaggio('Inserisci l’importo obiettivo.');

    setSaving(true);
    const targetNumber = Number(target.replace(',', '.'));
    const currentAmountNumber = currentAmount.trim() ? Number(currentAmount.replace(',', '.')) : 0;
    if (Number.isNaN(targetNumber) || targetNumber <= 0) {
      setMessaggio('Inserisci un importo obiettivo valido maggiore di 0.');
      setSaving(false);
      return;
    }
    if (Number.isNaN(currentAmountNumber) || currentAmountNumber < 0) {
      setMessaggio('Inserisci un importo già risparmiato valido.');
      setSaving(false);
      return;
    }

    let error: { message: string } | null = null;
    if (editingId) {
      const res = await supabase.from('goals').update({ name: nome.trim(), target_amount: targetNumber, current_amount: currentAmountNumber, deadline: scadenza || null }).eq('id', editingId).eq('user_id', userId);
      error = res.error;
    } else {
      const res = await supabase.from('goals').insert({ user_id: userId, name: nome.trim(), target_amount: targetNumber, current_amount: currentAmountNumber, deadline: scadenza || null });
      error = res.error;
    }

    if (error) {
      setMessaggio(error.message);
      showToast(error.message, 'error');
      setSaving(false);
      return;
    }

    showToast(editingId ? 'Obiettivo aggiornato.' : 'Obiettivo salvato.', 'success');
    resetForm();
    setSaving(false);
    await onSaved();
  };

  const eliminaObiettivo = async (id: string) => {
    if (!window.confirm('Vuoi davvero eliminare questo obiettivo?')) return;
    setDeletingId(id);
    const { error } = await supabase.from('goals').delete().eq('id', id).eq('user_id', userId);
    if (error) {
      setMessaggio(error.message);
      showToast(error.message, 'error');
      setDeletingId(null);
      return;
    }
    if (editingId === id) resetForm();
    showToast('Obiettivo eliminato.', 'success');
    setDeletingId(null);
    await onSaved();
  };

  const avviaModifica = (goal: GoalRow) => {
    setEditingId(goal.id);
    setNome(goal.name);
    setTarget(String(goal.target_amount));
    setCurrentAmount(String(goal.current_amount));
    setScadenza(goal.deadline || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div>
      <div style={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}><Sparkles color="#8B5CF6" /><h3 style={{ margin: 0, fontWeight: 800, color: '#1E293B' }}>Obiettivi</h3></div>
        <input style={s.input} placeholder="Nome dell'obiettivo" value={nome} onChange={(e) => setNome(e.target.value)} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div><label style={s.labelIcon}>Importo Obiettivo</label><input style={s.input} placeholder="€" value={target} onChange={(e) => setTarget(e.target.value)} /></div>
          <div><label style={s.labelIcon}>Già risparmiato</label><input style={s.input} placeholder="€" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)} /></div>
        </div>
        <label style={s.labelIcon}>Scadenza</label>
        <input style={s.input} type="date" value={scadenza} onChange={(e) => setScadenza(e.target.value)} />
        <button style={{ ...s.btn, backgroundColor: '#8B5CF6' }} onClick={salvaObiettivo} disabled={saving}>{saving ? 'Salvataggio...' : editingId ? 'Aggiorna obiettivo' : 'Salva obiettivo'}</button>
        {editingId && <button onClick={resetForm} style={{ width: '100%', marginTop: '10px', padding: '16px', borderRadius: '20px', border: '1.5px solid #CBD5E1', backgroundColor: 'white', color: '#475569', fontWeight: 700, cursor: 'pointer', fontSize: '15px' }}>Annulla modifica</button>}
        {messaggio ? <p style={{ marginTop: '12px', marginBottom: 0, color: '#DC2626' }}>{messaggio}</p> : null}
      </div>

      {goals.map((goal) => {
        const progress = goal.target_amount > 0 ? Math.max(0, Math.min(100, (Number(goal.current_amount) / Number(goal.target_amount)) * 100)) : 0;
        const remaining = Math.max(Number(goal.target_amount) - Number(goal.current_amount), 0);
        const isDone = progress >= 100;
        return (
          <div key={goal.id} style={{ ...s.card, borderLeft: `6px solid ${isDone ? '#16A34A' : '#8B5CF6'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
              <span>{goal.name}</span>
              <span style={{ color: '#94A3B8', fontSize: '12px' }}>{formatData(goal.deadline)}</span>
            </div>
            <div style={{ marginTop: '8px', color: '#64748B', fontSize: '13px' }}>{formatEuro(Number(goal.current_amount))} / {formatEuro(Number(goal.target_amount))}</div>
            <div style={{ marginTop: '6px', color: '#94A3B8', fontSize: '12px', fontWeight: 700 }}>Mancano {formatEuro(remaining)}</div>
            <div style={{ height: '8px', backgroundColor: '#F1F5F9', borderRadius: '10px', marginTop: '15px' }}><div style={{ width: `${progress}%`, height: '100%', backgroundColor: isDone ? '#16A34A' : '#8B5CF6', borderRadius: '10px' }} /></div>
            <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
              <div style={{ color: isDone ? '#16A34A' : '#8B5CF6', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}><CheckCircle2 size={14} /> {isDone ? 'Obiettivo raggiunto' : `${Math.round(progress)}% completato`}</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => avviaModifica(goal)} style={{ border: 'none', backgroundColor: '#DBEAFE', color: '#2563EB', borderRadius: '12px', padding: '8px 12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><Pencil size={14} /> Modifica</button>
                <button onClick={() => eliminaObiettivo(goal.id)} disabled={deletingId === goal.id} style={{ border: 'none', backgroundColor: '#FEE2E2', color: '#DC2626', borderRadius: '12px', padding: '8px 12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><Trash2 size={14} /> {deletingId === goal.id ? 'Elimino...' : 'Elimina'}</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

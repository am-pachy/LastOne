import { useState } from 'react';
import { Briefcase, Car, GraduationCap, Heart, HeartPulse, Home, Pencil, Tag, Trash2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { s } from '../styles';
import { FrequenzaRicorrenza, MovementRow, MovimentoTipo, PeriodicitaTipo, ToastType } from '../types';
import { formatData, formatEuro } from '../utils';

export function SezioneMovimenti({
  userId,
  movements,
  customCategories,
  onSaved,
  showToast,
}: {
  userId: string;
  movements: MovementRow[];
  customCategories: string[];
  onSaved: () => Promise<void>;
  showToast: (text: string, type: ToastType) => void;
}) {
  const [tipo, setTipo] = useState<MovimentoTipo>('uscita');
  const [descrizione, setDescrizione] = useState('');
  const [categoriaSelezionata, setCategoriaSelezionata] = useState('Casa');
  const [importo, setImporto] = useState('');
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [periodicita, setPeriodicita] = useState<PeriodicitaTipo>('fissa');
  const [frequenza, setFrequenza] = useState<FrequenzaRicorrenza>('mensile');
  const [saving, setSaving] = useState(false);
  const [messaggio, setMessaggio] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const categorieBase = [
    { nome: 'Casa', icona: Home },
    { nome: 'Auto', icona: Car },
    { nome: 'Scuola', icona: GraduationCap },
    { nome: 'Animali', icona: Heart },
    { nome: 'Lavoro', icona: Briefcase },
    { nome: 'Sanità', icona: HeartPulse },
  ];

  const categorieExtra = customCategories.filter((cat) => !categorieBase.some((base) => base.nome === cat)).map((cat) => ({ nome: cat, icona: Tag }));
  const categorie = [...categorieBase, ...categorieExtra];

  const resetForm = () => {
    setEditingId(null);
    setTipo('uscita');
    setDescrizione('');
    setCategoriaSelezionata('Casa');
    setImporto('');
    setData(new Date().toISOString().slice(0, 10));
    setPeriodicita('fissa');
    setFrequenza('mensile');
  };

  const salvaMovimento = async () => {
    setMessaggio('');
    if (!descrizione.trim()) return setMessaggio('Inserisci una descrizione.');
    if (!importo.trim()) return setMessaggio('Inserisci un importo.');

    setSaving(true);
    const amountNumber = Number(importo.replace(',', '.'));
    if (Number.isNaN(amountNumber) || amountNumber <= 0) {
      setMessaggio('Inserisci un importo valido maggiore di 0.');
      setSaving(false);
      return;
    }

    const payload = {
      description: descrizione.trim(),
      amount: amountNumber,
      type: tipo,
      nature: periodicita,
      recurrence_frequency: periodicita === 'fissa' ? frequenza : null,
      category: categoriaSelezionata,
      created_at: new Date(`${data}T12:00:00`).toISOString(),
    };

    let error: { message: string } | null = null;
    if (editingId) {
      const res = await supabase.from('movements').update(payload).eq('id', editingId).eq('user_id', userId);
      error = res.error;
    } else {
      const res = await supabase.from('movements').insert({ user_id: userId, ...payload, linked_debt_id: null, is_auto_generated: false });
      error = res.error;
    }

    if (error) {
      setMessaggio(error.message);
      showToast(error.message, 'error');
      setSaving(false);
      return;
    }

    showToast(editingId ? 'Movimento aggiornato.' : 'Movimento salvato.', 'success');
    resetForm();
    setSaving(false);
    await onSaved();
  };

  const eliminaMovimento = async (id: string) => {
    if (!window.confirm('Vuoi davvero eliminare questo movimento?')) return;
    setDeletingId(id);

    const { error } = await supabase.from('movements').delete().eq('id', id).eq('user_id', userId);
    if (error) {
      setMessaggio(error.message);
      showToast(error.message, 'error');
      setDeletingId(null);
      return;
    }

    if (editingId === id) resetForm();
    showToast('Movimento eliminato.', 'success');
    setDeletingId(null);
    await onSaved();
  };

  const avviaModifica = (mov: MovementRow) => {
    setEditingId(mov.id);
    setDescrizione(mov.description);
    setImporto(String(mov.amount));
    setCategoriaSelezionata(mov.category || 'Casa');
    setTipo(mov.type);
    setPeriodicita(mov.nature || 'fissa');
    setFrequenza(mov.recurrence_frequency || 'mensile');
    setData(mov.created_at.slice(0, 10));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div>
      <div style={s.card}>
        <div style={s.toggleW}>
          <button onClick={() => setTipo('uscita')} style={{ ...s.toggleB, backgroundColor: tipo === 'uscita' ? '#E15B51' : 'transparent', color: tipo === 'uscita' ? 'white' : '#94A3B8' }}>USCITA</button>
          <button onClick={() => setTipo('entrata')} style={{ ...s.toggleB, backgroundColor: tipo === 'entrata' ? '#5DB386' : 'transparent', color: tipo === 'entrata' ? 'white' : '#94A3B8' }}>ENTRATA</button>
        </div>

        <label style={s.labelIcon}>DESCRIZIONE</label>
        <input style={s.input} placeholder={tipo === 'uscita' ? 'es. Netflix, Pizza...' : 'es. Stipendio, Rimborso...'} value={descrizione} onChange={(e) => setDescrizione(e.target.value)} />

        <label style={s.labelIcon}>CATEGORIA</label>
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '15px' }}>
          {categorie.map(({ nome, icona: Icona }) => {
            const attiva = categoriaSelezionata === nome;
            return (
              <button
                key={nome}
                type="button"
                onClick={() => setCategoriaSelezionata(nome)}
                style={{
                  padding: '10px 18px', borderRadius: '14px', border: 'none', backgroundColor: attiva ? '#3B82F6' : '#F1F5F9', color: attiva ? 'white' : '#334155', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', flexShrink: 0,
                }}
              >
                <Icona size={14} /> {nome}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <label style={s.labelIcon}>IMPORTO</label>
            <input style={s.input} placeholder="€" value={importo} onChange={(e) => setImporto(e.target.value)} />
          </div>
          <div>
            <label style={s.labelIcon}>DATA</label>
            <input style={s.input} type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
        </div>

        <label style={s.labelIcon}>PERIODICITÀ</label>
        <select style={s.input} value={periodicita} onChange={(e) => setPeriodicita(e.target.value as PeriodicitaTipo)}>
          <option value="fissa">Fissa (Ricorrente)</option>
          <option value="una_tantum">Singola</option>
        </select>

        {periodicita === 'fissa' && (
          <>
            <label style={s.labelIcon}>FREQUENZA</label>
            <select style={s.input} value={frequenza} onChange={(e) => setFrequenza(e.target.value as FrequenzaRicorrenza)}>
              <option value="giornaliera">Giornaliera</option>
              <option value="settimanale">Settimanale</option>
              <option value="mensile">Mensile</option>
              <option value="trimestrale">Trimestrale</option>
              <option value="semestrale">Semestrale</option>
              <option value="annuale">Annuale</option>
            </select>
          </>
        )}

        <button style={{ ...s.btn, backgroundColor: tipo === 'uscita' ? '#E15B51' : '#5DB386', marginTop: '12px' }} onClick={salvaMovimento} disabled={saving}>
          {saving ? 'Salvataggio...' : editingId ? 'Aggiorna movimento' : `Salva ${tipo === 'uscita' ? 'uscita' : 'entrata'}`}
        </button>

        {editingId && (
          <button onClick={resetForm} style={{ width: '100%', marginTop: '10px', padding: '16px', borderRadius: '20px', border: '1.5px solid #CBD5E1', backgroundColor: 'white', color: '#475569', fontWeight: 700, cursor: 'pointer', fontSize: '15px' }}>
            Annulla modifica
          </button>
        )}

        {messaggio ? <p style={{ marginTop: '12px', marginBottom: 0, color: '#DC2626' }}>{messaggio}</p> : null}
      </div>

      <div style={s.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>Ultimi movimenti</h3>
          <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 700 }}>{movements.length}</span>
        </div>

        {movements.length === 0 ? <p style={{ margin: 0, color: '#64748B' }}>Non hai ancora salvato movimenti.</p> : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {movements.slice(0, 8).map((mov) => (
              <div key={mov.id} style={{ padding: '14px 16px', borderRadius: '20px', backgroundColor: '#F8FAFC', border: '1px solid #EEF2F7' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 800, color: '#0F172A' }}>{mov.description}</div>
                    <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '6px' }}>{mov.category || 'Senza categoria'} · {formatData(mov.created_at)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: mov.type === 'entrata' ? '#16A34A' : '#DC2626' }}>{mov.type === 'entrata' ? '+' : '-'}{formatEuro(Number(mov.amount))}</div>
                    <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '6px' }}>{mov.nature === 'una_tantum' ? 'Singola' : mov.recurrence_frequency ? `Fissa · ${mov.recurrence_frequency}` : 'Fissa'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                  <button onClick={() => avviaModifica(mov)} style={{ border: 'none', backgroundColor: '#DBEAFE', color: '#2563EB', borderRadius: '12px', padding: '8px 12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Pencil size={14} /> Modifica
                  </button>
                  <button onClick={() => eliminaMovimento(mov.id)} disabled={deletingId === mov.id} style={{ border: 'none', backgroundColor: '#FEE2E2', color: '#DC2626', borderRadius: '12px', padding: '8px 12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Trash2 size={14} /> {deletingId === mov.id ? 'Elimino...' : 'Elimina'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

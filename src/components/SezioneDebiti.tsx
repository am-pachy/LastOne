import { useState } from 'react';
import { Calendar, Euro, Pencil, Search, Tag, Trash2, User } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { s } from '../styles';
import { DebtFilter, DebtRow, DebitoTipo, MovimentoTipo, ToastType } from '../types';
import { formatDataShort, formatEuro, getDueDateMeta } from '../utils';

export function SezioneDebiti({
  userId,
  debts,
  onSaved,
  showToast,
}: {
  userId: string;
  debts: DebtRow[];
  onSaved: () => Promise<void>;
  showToast: (text: string, type: ToastType) => void;
}) {
  const [tipo, setTipo] = useState<DebitoTipo>('ricevere');
  const [persona, setPersona] = useState('');
  const [causale, setCausale] = useState('');
  const [importo, setImporto] = useState('');
  const [scadenza, setScadenza] = useState('');
  const [filtro, setFiltro] = useState('');
  const [filtroStato, setFiltroStato] = useState<DebtFilter>('tutti');
  const [saving, setSaving] = useState(false);
  const [messaggio, setMessaggio] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const creditiAperti = debts.filter((d) => d.type === 'ricevere' && d.status !== 'saldato').reduce((acc, d) => acc + Number(d.amount), 0);
  const debitiAperti = debts.filter((d) => d.type === 'dare' && d.status !== 'saldato').reduce((acc, d) => acc + Number(d.amount), 0);
  const saldoNetto = creditiAperti - debitiAperti;

  const debitiFiltrati = debts.filter((d) => {
    const matchPersona = d.person_name.toLowerCase().includes(filtro.toLowerCase());
    const matchStato = filtroStato === 'tutti' ? true : filtroStato === 'pendenza' ? d.status !== 'saldato' : d.status === 'saldato';
    return matchPersona && matchStato;
  });

  const resetForm = () => {
    setEditingId(null);
    setTipo('ricevere');
    setPersona('');
    setCausale('');
    setImporto('');
    setScadenza('');
  };

  const salvaDebito = async () => {
    setMessaggio('');
    if (!persona.trim()) return setMessaggio(tipo === 'ricevere' ? 'Inserisci da chi devi ricevere.' : 'Inserisci a chi devi dare.');
    if (!causale.trim()) return setMessaggio('Inserisci una causale.');
    if (!importo.trim()) return setMessaggio('Inserisci un importo.');

    setSaving(true);
    const amountNumber = Number(importo.replace(',', '.'));
    if (Number.isNaN(amountNumber) || amountNumber <= 0) {
      setMessaggio('Inserisci un importo valido maggiore di 0.');
      setSaving(false);
      return;
    }

    let error: { message: string } | null = null;
    if (editingId) {
      const res = await supabase
        .from('debts_credits')
        .update({ person_name: persona.trim(), reason: causale.trim(), amount: amountNumber, due_date: scadenza || null, type: tipo })
        .eq('id', editingId)
        .eq('user_id', userId);
      error = res.error;
    } else {
      const res = await supabase.from('debts_credits').insert({ user_id: userId, person_name: persona.trim(), reason: causale.trim(), amount: amountNumber, due_date: scadenza || null, type: tipo, status: 'pendenza', paid_at: null });
      error = res.error;
    }

    if (error) {
      setMessaggio(error.message);
      showToast(error.message, 'error');
      setSaving(false);
      return;
    }

    showToast(editingId ? 'Debito/credito aggiornato.' : 'Debito/credito salvato.', 'success');
    resetForm();
    setSaving(false);
    await onSaved();
  };

  const cambiaStato = async (item: DebtRow, nuovoStatus: 'pendenza' | 'saldato') => {
    setUpdatingStatusId(item.id);

    if (nuovoStatus === 'saldato') {
      const movimentoTipo: MovimentoTipo = item.type === 'ricevere' ? 'entrata' : 'uscita';
      const { data: existingMovement } = await supabase.from('movements').select('id').eq('linked_debt_id', item.id).eq('user_id', userId).eq('is_auto_generated', true).maybeSingle();

      if (!existingMovement) {
        const { error: movementError } = await supabase.from('movements').insert({
          user_id: userId,
          description: `${item.type === 'ricevere' ? 'Incasso credito' : 'Pagamento debito'} - ${item.person_name}`,
          amount: Number(item.amount),
          type: movimentoTipo,
          nature: 'una_tantum',
          recurrence_frequency: null,
          category: 'Debiti/Crediti',
          created_at: new Date().toISOString(),
          linked_debt_id: item.id,
          is_auto_generated: true,
        });
        if (movementError) {
          setMessaggio(movementError.message);
          showToast(movementError.message, 'error');
          setUpdatingStatusId(null);
          return;
        }
      }

      const { error: statusError } = await supabase.from('debts_credits').update({ status: 'saldato', paid_at: new Date().toISOString() }).eq('id', item.id).eq('user_id', userId);
      if (statusError) {
        setMessaggio(statusError.message);
        showToast(statusError.message, 'error');
        setUpdatingStatusId(null);
        return;
      }

      showToast('Segnato come saldato e registrato nei movimenti.', 'success');
      setUpdatingStatusId(null);
      await onSaved();
      return;
    }

    await supabase.from('movements').delete().eq('linked_debt_id', item.id).eq('user_id', userId).eq('is_auto_generated', true);
    const { error } = await supabase.from('debts_credits').update({ status: 'pendenza', paid_at: null }).eq('id', item.id).eq('user_id', userId);
    if (error) {
      setMessaggio(error.message);
      showToast(error.message, 'error');
      setUpdatingStatusId(null);
      return;
    }

    showToast('Debito/credito riaperto.', 'success');
    setUpdatingStatusId(null);
    await onSaved();
  };

  const eliminaDebito = async (id: string) => {
    if (!window.confirm('Vuoi davvero eliminare questo debito/credito?')) return;
    setDeletingId(id);

    await supabase.from('movements').delete().eq('linked_debt_id', id).eq('user_id', userId).eq('is_auto_generated', true);
    const { error } = await supabase.from('debts_credits').delete().eq('id', id).eq('user_id', userId);
    if (error) {
      setMessaggio(error.message);
      showToast(error.message, 'error');
      setDeletingId(null);
      return;
    }

    if (editingId === id) resetForm();
    showToast('Debito/credito eliminato.', 'success');
    setDeletingId(null);
    await onSaved();
  };

  const avviaModifica = (item: DebtRow) => {
    setEditingId(item.id);
    setTipo(item.type);
    setPersona(item.person_name);
    setCausale(item.reason || '');
    setImporto(String(item.amount));
    setScadenza(item.due_date || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div>
      <div style={s.darkCard}>
        <p style={{ fontSize: '10px', opacity: 0.6, fontWeight: '800' }}>SALDO NETTO</p>
        <h1 style={{ fontSize: '48px', margin: '5px 0', fontWeight: '800' }}>{formatEuro(saldoNetto)}</h1>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
          <span style={{ color: '#5DB386', fontSize: '13px', fontWeight: 600 }}>Ricevi: {formatEuro(creditiAperti)}</span>
          <span style={{ color: '#E15B51', fontSize: '13px', fontWeight: 600 }}>Devi: {formatEuro(debitiAperti)}</span>
        </div>
      </div>

      <div style={s.card}>
        <div style={s.toggleW}>
          <button onClick={() => setTipo('ricevere')} style={{ ...s.toggleB, backgroundColor: tipo === 'ricevere' ? '#5DB386' : 'transparent', color: tipo === 'ricevere' ? 'white' : '#94A3B8' }}>DEVO RICEVERE</button>
          <button onClick={() => setTipo('dare')} style={{ ...s.toggleB, backgroundColor: tipo === 'dare' ? '#E15B51' : 'transparent', color: tipo === 'dare' ? 'white' : '#94A3B8' }}>DEVO DARE</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <label style={s.labelIcon}><User size={12} /> {tipo === 'ricevere' ? 'DA CHI' : 'A CHI'}</label>
            <input style={s.input} placeholder={tipo === 'ricevere' ? 'Chi ti deve pagare?' : 'Chi devi pagare?'} value={persona} onChange={(e) => setPersona(e.target.value)} />
          </div>
          <div>
            <label style={s.labelIcon}><Tag size={12} /> PERCHÉ</label>
            <input style={s.input} placeholder="Causale" value={causale} onChange={(e) => setCausale(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <label style={s.labelIcon}><Euro size={12} /> IMPORTO</label>
            <input style={s.input} placeholder="€" value={importo} onChange={(e) => setImporto(e.target.value)} />
          </div>
          <div>
            <label style={s.labelIcon}><Calendar size={12} /> DATA SCADENZA</label>
            <input style={s.input} type="date" value={scadenza} onChange={(e) => setScadenza(e.target.value)} />
          </div>
        </div>

        <button style={{ ...s.btnPrimary, backgroundColor: tipo === 'ricevere' ? '#5DB386' : '#E15B51' }} onClick={salvaDebito} disabled={saving}>
          {saving ? 'Salvataggio...' : editingId ? 'Aggiorna debito/credito' : tipo === 'ricevere' ? 'Aggiungi credito' : 'Aggiungi debito'}
        </button>

        {editingId && <button onClick={resetForm} style={{ width: '100%', marginTop: '10px', padding: '16px', borderRadius: '20px', border: '1.5px solid #CBD5E1', backgroundColor: 'white', color: '#475569', fontWeight: 700, cursor: 'pointer', fontSize: '15px' }}>Annulla modifica</button>}
        {messaggio ? <p style={{ marginTop: '12px', marginBottom: 0, color: '#DC2626' }}>{messaggio}</p> : null}
      </div>

      <div style={s.card}>
        <div style={s.toggleW}>
          <button onClick={() => setFiltroStato('tutti')} style={{ ...s.toggleB, backgroundColor: filtroStato === 'tutti' ? '#0F172A' : 'transparent', color: filtroStato === 'tutti' ? 'white' : '#94A3B8' }}>TUTTI</button>
          <button onClick={() => setFiltroStato('pendenza')} style={{ ...s.toggleB, backgroundColor: filtroStato === 'pendenza' ? '#F59E0B' : 'transparent', color: filtroStato === 'pendenza' ? 'white' : '#94A3B8' }}>PENDENZA</button>
          <button onClick={() => setFiltroStato('saldati')} style={{ ...s.toggleB, backgroundColor: filtroStato === 'saldati' ? '#16A34A' : 'transparent', color: filtroStato === 'saldati' ? 'white' : '#94A3B8' }}>SALDATI</button>
        </div>
        <div style={{ backgroundColor: '#F8FAFC', padding: '15px 20px', borderRadius: '25px', display: 'flex', alignItems: 'center', border: '1.5px solid #F1F5F9' }}>
          <Search size={18} color="#94A3B8" />
          <input style={{ border: 'none', outline: 'none', marginLeft: '10px', width: '100%', fontSize: '14px', background: 'transparent' }} placeholder="Filtra per persona..." value={filtro} onChange={(e) => setFiltro(e.target.value)} />
        </div>
      </div>

      {debitiFiltrati.map((item) => {
        const dueMeta = item.status === 'saldato' ? null : getDueDateMeta(item.due_date);
        return (
          <div key={item.id} style={{ ...s.card, opacity: item.status === 'saldato' ? 0.78 : 1, borderLeft: item.status === 'saldato' ? '6px solid #16A34A' : '6px solid #F59E0B' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <div style={{ fontWeight: 800, color: '#0F172A' }}>{item.person_name}</div>
                <div style={{ fontSize: '13px', color: '#64748B', marginTop: '6px' }}>{item.reason}</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 800, backgroundColor: item.status === 'saldato' ? '#DCFCE7' : '#FEF3C7', color: item.status === 'saldato' ? '#166534' : '#92400E' }}>
                    {item.status === 'saldato' ? 'SALDATO' : 'IN PENDENZA'}
                  </div>
                  {dueMeta && <div style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 800, backgroundColor: dueMeta.bg, color: dueMeta.color }}>{dueMeta.text}</div>}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, color: item.type === 'ricevere' ? '#16A34A' : '#DC2626' }}>{item.type === 'ricevere' ? '+' : '-'}{formatEuro(Number(item.amount))}</div>
                <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '6px' }}>{formatDataShort(item.due_date)}</div>
              </div>
            </div>

            <div style={{ marginTop: '12px', padding: '12px 14px', backgroundColor: '#F8FAFC', borderRadius: '18px', border: '1px solid #EEF2F7' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', marginBottom: '8px' }}>TIMELINE</div>
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.7 }}>
                <div>Creato: {formatDataShort(item.created_at)}</div>
                <div>Saldato: {item.paid_at ? formatDataShort(item.paid_at) : 'Non ancora'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
              <button onClick={() => cambiaStato(item, item.status === 'saldato' ? 'pendenza' : 'saldato')} disabled={updatingStatusId === item.id} style={{ border: 'none', backgroundColor: item.status === 'saldato' ? '#FEF3C7' : '#DCFCE7', color: item.status === 'saldato' ? '#92400E' : '#166534', borderRadius: '12px', padding: '8px 12px', fontWeight: 700, cursor: 'pointer' }}>
                {updatingStatusId === item.id ? 'Aggiorno...' : item.status === 'saldato' ? 'Riapri' : 'Segna saldato'}
              </button>
              <button onClick={() => avviaModifica(item)} style={{ border: 'none', backgroundColor: '#DBEAFE', color: '#2563EB', borderRadius: '12px', padding: '8px 12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Pencil size={14} /> Modifica
              </button>
              <button onClick={() => eliminaDebito(item.id)} disabled={deletingId === item.id} style={{ border: 'none', backgroundColor: '#FEE2E2', color: '#DC2626', borderRadius: '12px', padding: '8px 12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Trash2 size={14} /> {deletingId === item.id ? 'Elimino...' : 'Elimina'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

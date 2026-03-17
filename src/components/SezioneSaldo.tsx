import { Download } from 'lucide-react';
import { s } from '../styles';
import { MovementRow } from '../types';
import { countOccurrencesInMonth, formatEuro, mesiOrdine, SALDO_INIZIALE } from '../utils';

export function SezioneSaldo({ movements }: { movements: MovementRow[] }) {
  const currentYear = new Date().getFullYear();

  const saldoData = mesiOrdine.map((mese, index) => {
    const monthNumber = (index + 2) % 12;
    const year = monthNumber <= 1 ? currentYear + 1 : currentYear;
    return { mese, year, monthNumber, iniziale: 0, entrate: 0, uscite: 0, finale: 0 };
  });

  movements.forEach((mov) => {
    saldoData.forEach((meseObj) => {
      const monthStart = new Date(meseObj.year, meseObj.monthNumber, 1, 0, 0, 0, 0);
      const monthEnd = new Date(meseObj.year, meseObj.monthNumber + 1, 0, 23, 59, 59, 999);
      const occorrenze = countOccurrencesInMonth(mov, monthStart, monthEnd);
      const totale = occorrenze * Number(mov.amount);
      if (totale <= 0) return;
      if (mov.type === 'entrata') meseObj.entrate += totale;
      else meseObj.uscite += totale;
    });
  });

  let running = SALDO_INIZIALE;
  saldoData.forEach((item) => {
    item.iniziale = running;
    item.finale = item.iniziale + item.entrate - item.uscite;
    running = item.finale;
  });

  const totaleEntrate = saldoData.reduce((acc, item) => acc + item.entrate, 0);
  const totaleUscite = saldoData.reduce((acc, item) => acc + item.uscite, 0);
  const saldoFinaleAnno = saldoData[saldoData.length - 1]?.finale ?? SALDO_INIZIALE;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontWeight: '800', fontSize: '22px', color: '#1E293B' }}>Saldo e Previsioni</h3>
        <button style={{ padding: '10px 18px', borderRadius: '18px', border: '1.5px solid #3B82F6', background: 'white', color: '#3B82F6', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }} onClick={() => alert('Il CSV lo colleghiamo nel prossimo step.')}>
          <Download size={16} /> CSV
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        <div style={{ ...s.card, padding: '16px', marginBottom: 0 }}><div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 800 }}>ENTRATE TOTALI</div><div style={{ marginTop: '8px', fontSize: '18px', fontWeight: 800, color: '#16A34A' }}>{formatEuro(totaleEntrate)}</div></div>
        <div style={{ ...s.card, padding: '16px', marginBottom: 0 }}><div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 800 }}>USCITE TOTALI</div><div style={{ marginTop: '8px', fontSize: '18px', fontWeight: 800, color: '#DC2626' }}>{formatEuro(totaleUscite)}</div></div>
        <div style={{ ...s.card, padding: '16px', marginBottom: 0 }}><div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 800 }}>SALDO FINALE</div><div style={{ marginTop: '8px', fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>{formatEuro(saldoFinaleAnno)}</div></div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '30px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.04)' }}>
        <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', minWidth: '640px', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '18px 10px', textAlign: 'left', fontSize: '11px', color: '#0F172A', fontWeight: 800 }}>MESE</th>
                <th style={{ padding: '18px 10px', textAlign: 'right', fontSize: '11px', color: '#64748B', fontWeight: 800 }}>INIZIALE</th>
                <th style={{ padding: '18px 10px', textAlign: 'right', fontSize: '11px', color: '#10B981', fontWeight: 800 }}>ENTRATE</th>
                <th style={{ padding: '18px 10px', textAlign: 'right', fontSize: '11px', color: '#EF4444', fontWeight: 800 }}>USCITE</th>
                <th style={{ padding: '18px 10px', textAlign: 'right', fontSize: '11px', color: '#0F172A', fontWeight: 800 }}>FINALE</th>
              </tr>
            </thead>
            <tbody>
              {saldoData.map((row) => (
                <tr key={`${row.mese}-${row.year}`} style={{ borderTop: '1px solid #EEF2F7' }}>
                  <td style={{ padding: '16px 10px', fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>{row.mese}</td>
                  <td style={{ padding: '16px 10px', fontSize: '14px', fontWeight: 700, color: '#64748B', textAlign: 'right' }}>{formatEuro(row.iniziale)}</td>
                  <td style={{ padding: '16px 10px', fontSize: '14px', fontWeight: 700, color: '#10B981', textAlign: 'right' }}>{formatEuro(row.entrate)}</td>
                  <td style={{ padding: '16px 10px', fontSize: '14px', fontWeight: 700, color: '#EF4444', textAlign: 'right' }}>{formatEuro(row.uscite)}</td>
                  <td style={{ padding: '16px 10px', fontSize: '14px', fontWeight: 800, color: '#0F172A', textAlign: 'right' }}>{formatEuro(row.finale)}</td>
                </tr>
              ))}
              <tr style={{ backgroundColor: '#3B82F6', color: 'white' }}>
                <td style={{ padding: '18px 10px', fontWeight: 800 }}>TOTALI</td>
                <td style={{ padding: '18px 10px', textAlign: 'right', fontWeight: 800 }}>{formatEuro(SALDO_INIZIALE)}</td>
                <td style={{ padding: '18px 10px', textAlign: 'right', fontWeight: 800 }}>{formatEuro(totaleEntrate)}</td>
                <td style={{ padding: '18px 10px', textAlign: 'right', fontWeight: 800 }}>{formatEuro(totaleUscite)}</td>
                <td style={{ padding: '18px 10px', textAlign: 'right', fontWeight: 800 }}>{formatEuro(saldoFinaleAnno)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

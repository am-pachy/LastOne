import { FrequenzaRicorrenza, MovementRow } from './types';

export const APP_WIDTH = 480;
export const SALDO_INIZIALE = 0;
export const mesiOrdine = ['Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic', 'Gen', 'Feb'];

const euroFormatter = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});

export function formatEuro(value: number) {
  return euroFormatter.format(value || 0);
}

export function formatData(dateString: string | null) {
  if (!dateString) return 'Senza data';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString('it-IT');
}

export function formatDataShort(dateString: string | null) {
  if (!dateString) return 'Senza data';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

export function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getMonthInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function monthInputToDate(monthValue: string) {
  return `${monthValue}-01`;
}

export function monthValueToLabel(monthValue: string) {
  const [year, month] = monthValue.split('-').map(Number);
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
}

export function getBaseCategories(customCategories: string[]) {
  const base = ['Casa', 'Auto', 'Scuola', 'Animali', 'Lavoro', 'Sanità', 'Debiti/Crediti'];
  const extra = customCategories.filter((c) => !base.includes(c));
  return [...base, ...extra];
}

export function addFrequency(date: Date, frequency: FrequenzaRicorrenza) {
  const d = new Date(date);
  if (frequency === 'giornaliera') d.setDate(d.getDate() + 1);
  else if (frequency === 'settimanale') d.setDate(d.getDate() + 7);
  else if (frequency === 'mensile') d.setMonth(d.getMonth() + 1);
  else if (frequency === 'trimestrale') d.setMonth(d.getMonth() + 3);
  else if (frequency === 'semestrale') d.setMonth(d.getMonth() + 6);
  else if (frequency === 'annuale') d.setFullYear(d.getFullYear() + 1);
  return d;
}

export function countOccurrencesInMonth(mov: MovementRow, monthStart: Date, monthEnd: Date) {
  const start = new Date(mov.created_at);
  if (Number.isNaN(start.getTime())) return 0;

  if (mov.nature === 'una_tantum') {
    return start >= monthStart && start <= monthEnd ? 1 : 0;
  }

  if (mov.nature !== 'fissa' || !mov.recurrence_frequency) return 0;

  let count = 0;
  let current = new Date(start);

  while (current <= monthEnd) {
    if (current >= monthStart) count++;
    current = addFrequency(current, mov.recurrence_frequency);
  }

  return count;
}

export function getMonthlyCategorySpend(movements: MovementRow[], category: string, monthValue: string) {
  const [year, month] = monthValue.split('-').map(Number);
  const monthStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

  return movements.reduce((acc, mov) => {
    if (mov.type !== 'uscita') return acc;
    if ((mov.category || 'Generale') !== category) return acc;
    const occorrenze = countOccurrencesInMonth(mov, monthStart, monthEnd);
    return acc + occorrenze * Number(mov.amount);
  }, 0);
}

export function getDueDateMeta(dueDate: string | null) {
  if (!dueDate) return null;

  const today = startOfDay(new Date());
  const target = startOfDay(new Date(dueDate));
  if (Number.isNaN(target.getTime())) return null;

  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { text: `Scaduto da ${Math.abs(diffDays)}g`, bg: '#FEE2E2', color: '#B91C1C' };
  if (diffDays === 0) return { text: 'Scade oggi', bg: '#FEF3C7', color: '#92400E' };
  if (diffDays === 1) return { text: 'Scade domani', bg: '#FEF3C7', color: '#92400E' };
  if (diffDays <= 3) return { text: `Scade tra ${diffDays}g`, bg: '#FEF3C7', color: '#92400E' };

  return { text: `Scade il ${formatDataShort(dueDate)}`, bg: '#E0F2FE', color: '#075985' };
}

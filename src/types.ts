export type ActiveTab = 'movimenti' | 'debiti' | 'saldo' | 'budget' | 'obiettivi';
export type MovimentoTipo = 'uscita' | 'entrata';
export type DebitoTipo = 'ricevere' | 'dare';
export type PeriodicitaTipo = 'fissa' | 'una_tantum';
export type FrequenzaRicorrenza =
  | 'giornaliera'
  | 'settimanale'
  | 'mensile'
  | 'trimestrale'
  | 'semestrale'
  | 'annuale';
export type ToastType = 'success' | 'error';
export type ToastState = { text: string; type: ToastType } | null;
export type DebtFilter = 'tutti' | 'pendenza' | 'saldati';

export type UserProfile = {
  id: string;
  first_name: string | null;
  partner_name: string | null;
  custom_categories: string[] | null;
};

export type MovementRow = {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  type: MovimentoTipo;
  nature: PeriodicitaTipo | null;
  recurrence_frequency: FrequenzaRicorrenza | null;
  category: string | null;
  created_at: string;
  linked_debt_id: string | null;
  is_auto_generated: boolean;
};

export type DebtRow = {
  id: string;
  user_id: string;
  person_name: string;
  reason: string | null;
  amount: number;
  due_date: string | null;
  type: DebitoTipo;
  status: 'pendenza' | 'saldato' | null;
  paid_at: string | null;
  created_at: string;
};

export type GoalRow = {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  created_at: string;
};

export type BudgetRow = {
  id: string;
  user_id: string;
  month_ref: string;
  category: string;
  limit_amount: number;
  created_at: string;
};

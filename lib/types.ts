export type ExpenseCategory =
  | "moebel"
  | "deko"
  | "elektronik"
  | "kueche"
  | "sonstiges";

export type MemberRole = "admin" | "member";

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Household {
  id: string;
  name: string;
  invite_code: string;
  created_by: string | null;
  created_at: string;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
  profile?: Profile;
}

export interface Room {
  id: string;
  household_id: string;
  name: string;
  color: string;
  position_x: number;
  position_y: number;
  size_x: number;
  size_y: number;
  created_at: string;
}

export interface Expense {
  id: string;
  room_id: string;
  created_by: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  receipt_url: string | null;
  date: string;
  created_at: string;
  room?: Room;
  splits?: ExpenseSplit[];
  creator?: Profile;
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  user_id: string;
  paid_amount: number;
  profile?: Profile;
}

export interface SettlementTransfer {
  from_user_id: string;
  to_user_id: string;
  amount: number;
  from_name: string;
  to_name: string;
}

export interface MemberBalance {
  user_id: string;
  display_name: string;
  paid: number;
  fair_share: number;
  balance: number;
}

export interface SettlementResult {
  total_spend: number;
  member_balances: MemberBalance[];
  transfers: SettlementTransfer[];
}

export interface DashboardStats {
  total_spend: number;
  expense_count: number;
  by_category: Record<ExpenseCategory, number>;
  by_member: { user_id: string; display_name: string; paid: number }[];
  settlement: SettlementResult;
}

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  moebel: "Möbel",
  deko: "Deko",
  elektronik: "Elektronik",
  kueche: "Küche",
  sonstiges: "Sonstiges",
};

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "moebel",
  "deko",
  "elektronik",
  "kueche",
  "sonstiges",
];

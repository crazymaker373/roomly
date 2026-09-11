import type {
  Expense,
  ExpenseCategory,
  ExpenseSplit,
  Household,
  HouseholdMember,
  Profile,
  Room,
} from "@/lib/types";

export interface CreateExpenseInput {
  room_id: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  receipt_url?: string | null;
  splits: { user_id: string; paid_amount: number }[];
}

export interface UpdateExpenseInput extends CreateExpenseInput {
  id: string;
}

export interface DataRepository {
  getProfile(userId: string): Promise<Profile | null>;
  updateProfile(userId: string, data: Partial<Profile>): Promise<Profile>;

  getUserMembership(userId: string): Promise<HouseholdMember | null>;
  getHousehold(householdId: string): Promise<Household | null>;
  getHouseholdMembers(householdId: string): Promise<HouseholdMember[]>;
  createHousehold(
    userId: string,
    name: string
  ): Promise<{ household: Household; member: HouseholdMember }>;
  joinHousehold(
    userId: string,
    inviteCode: string
  ): Promise<{ household: Household; member: HouseholdMember }>;

  getRooms(householdId: string): Promise<Room[]>;
  getRoom(roomId: string): Promise<Room | null>;

  getExpenses(householdId: string, roomId?: string): Promise<Expense[]>;
  getExpense(expenseId: string): Promise<Expense | null>;
  createExpense(userId: string, input: CreateExpenseInput): Promise<Expense>;
  updateExpense(userId: string, input: UpdateExpenseInput): Promise<Expense>;
  deleteExpense(userId: string, expenseId: string): Promise<void>;
}

export type { Expense, ExpenseSplit, Household, HouseholdMember, Profile, Room };

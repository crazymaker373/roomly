import { createClient } from "@/lib/supabase/server";
import type {
  CreateExpenseInput,
  DataRepository,
  UpdateExpenseInput,
} from "@/lib/data/repository";
import type {
  Expense,
  Household,
  HouseholdMember,
  Profile,
  Room,
} from "@/lib/types";

function mapProfile(row: Record<string, unknown>): Profile {
  return {
    id: row.id as string,
    display_name: row.display_name as string | null,
    avatar_url: row.avatar_url as string | null,
    created_at: row.created_at as string,
  };
}

function mapHousehold(row: Record<string, unknown>): Household {
  return {
    id: row.id as string,
    name: row.name as string,
    invite_code: row.invite_code as string,
    created_by: row.created_by as string | null,
    created_at: row.created_at as string,
  };
}

function mapMember(row: Record<string, unknown>): HouseholdMember {
  const profile = row.profiles as Record<string, unknown> | null;
  return {
    id: row.id as string,
    household_id: row.household_id as string,
    user_id: row.user_id as string,
    role: row.role as HouseholdMember["role"],
    joined_at: row.joined_at as string,
    profile: profile ? mapProfile(profile) : undefined,
  };
}

function mapRoom(row: Record<string, unknown>): Room {
  return {
    id: row.id as string,
    household_id: row.household_id as string,
    name: row.name as string,
    color: row.color as string,
    position_x: Number(row.position_x),
    position_y: Number(row.position_y),
    size_x: Number(row.size_x),
    size_y: Number(row.size_y),
    created_at: row.created_at as string,
  };
}

function mapExpense(row: Record<string, unknown>): Expense {
  const room = row.rooms as Record<string, unknown> | null;
  const creator = row.profiles as Record<string, unknown> | null;
  const splitsRaw = row.expense_splits as Record<string, unknown>[] | null;

  return {
    id: row.id as string,
    room_id: row.room_id as string,
    created_by: row.created_by as string,
    title: row.title as string,
    amount: Number(row.amount),
    category: row.category as Expense["category"],
    receipt_url: row.receipt_url as string | null,
    date: row.date as string,
    created_at: row.created_at as string,
    room: room ? mapRoom(room) : undefined,
    creator: creator ? mapProfile(creator) : undefined,
    splits: splitsRaw?.map((s) => ({
      id: s.id as string,
      expense_id: s.expense_id as string,
      user_id: s.user_id as string,
      paid_amount: Number(s.paid_amount),
      profile: s.profiles
        ? mapProfile(s.profiles as Record<string, unknown>)
        : undefined,
    })),
  };
}

const expenseSelect = `
  *,
  rooms (*),
  profiles:created_by (*),
  expense_splits (*, profiles (*))
`;

export class SupabaseRepository implements DataRepository {
  async getProfile(userId: string): Promise<Profile | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapProfile(data) : null;
  }

  async updateProfile(
    userId: string,
    updates: Partial<Profile>
  ): Promise<Profile> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapProfile(data);
  }

  async getUserMembership(userId: string): Promise<HouseholdMember | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("household_members")
      .select("*, profiles (*)")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapMember(data) : null;
  }

  async getHousehold(householdId: string): Promise<Household | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("households")
      .select("*")
      .eq("id", householdId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapHousehold(data) : null;
  }

  async getHouseholdMembers(householdId: string): Promise<HouseholdMember[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("household_members")
      .select("*, profiles (*)")
      .eq("household_id", householdId)
      .order("joined_at");
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapMember);
  }

  async createHousehold(
    userId: string,
    name: string
  ): Promise<{ household: Household; member: HouseholdMember }> {
    const supabase = await createClient();
    const inviteCode = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();

    const { data: household, error: hError } = await supabase
      .from("households")
      .insert({ name, invite_code: inviteCode, created_by: userId })
      .select("*")
      .single();
    if (hError) throw new Error(hError.message);

    const { data: member, error: mError } = await supabase
      .from("household_members")
      .insert({
        household_id: household.id,
        user_id: userId,
        role: "admin",
      })
      .select("*, profiles (*)")
      .single();
    if (mError) throw new Error(mError.message);

    const { error: seedError } = await supabase.rpc("seed_default_rooms", {
      household_id: household.id,
    });
    if (seedError) throw new Error(seedError.message);

    return { household: mapHousehold(household), member: mapMember(member) };
  }

  async joinHousehold(
    userId: string,
    inviteCode: string
  ): Promise<{ household: Household; member: HouseholdMember }> {
    const supabase = await createClient();
    const { data: household, error: hError } = await supabase
      .from("households")
      .select("*")
      .eq("invite_code", inviteCode.toUpperCase())
      .maybeSingle();
    if (hError) throw new Error(hError.message);
    if (!household) throw new Error("Ungültiger Einladungscode");

    const { data: member, error: mError } = await supabase
      .from("household_members")
      .insert({
        household_id: household.id,
        user_id: userId,
        role: "member",
      })
      .select("*, profiles (*)")
      .single();
    if (mError) throw new Error(mError.message);

    return { household: mapHousehold(household), member: mapMember(member) };
  }

  async getRooms(householdId: string): Promise<Room[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("household_id", householdId)
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapRoom);
  }

  async getRoom(roomId: string): Promise<Room | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", roomId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapRoom(data) : null;
  }

  async getExpenses(householdId: string, roomId?: string): Promise<Expense[]> {
    const supabase = await createClient();
    const rooms = await this.getRooms(householdId);
    const roomIds = roomId ? [roomId] : rooms.map((r) => r.id);
    if (roomIds.length === 0) return [];

    const { data, error } = await supabase
      .from("expenses")
      .select(expenseSelect)
      .in("room_id", roomIds)
      .order("date", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapExpense);
  }

  async getExpense(expenseId: string): Promise<Expense | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("expenses")
      .select(expenseSelect)
      .eq("id", expenseId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapExpense(data) : null;
  }

  async createExpense(
    userId: string,
    input: CreateExpenseInput
  ): Promise<Expense> {
    const supabase = await createClient();
    const { data: expense, error } = await supabase
      .from("expenses")
      .insert({
        room_id: input.room_id,
        created_by: userId,
        title: input.title,
        amount: input.amount,
        category: input.category,
        date: input.date,
        receipt_url: input.receipt_url ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    if (input.splits.length > 0) {
      const { error: splitError } = await supabase.from("expense_splits").insert(
        input.splits.map((s) => ({
          expense_id: expense.id,
          user_id: s.user_id,
          paid_amount: s.paid_amount,
        }))
      );
      if (splitError) throw new Error(splitError.message);
    } else {
      const { error: splitError } = await supabase.from("expense_splits").insert({
        expense_id: expense.id,
        user_id: userId,
        paid_amount: input.amount,
      });
      if (splitError) throw new Error(splitError.message);
    }

    const created = await this.getExpense(expense.id);
    if (!created) throw new Error("Ausgabe konnte nicht geladen werden");
    return created;
  }

  async updateExpense(
    userId: string,
    input: UpdateExpenseInput
  ): Promise<Expense> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("expenses")
      .update({
        room_id: input.room_id,
        title: input.title,
        amount: input.amount,
        category: input.category,
        date: input.date,
        receipt_url: input.receipt_url ?? null,
      })
      .eq("id", input.id);
    if (error) throw new Error(error.message);

    await supabase.from("expense_splits").delete().eq("expense_id", input.id);

    if (input.splits.length > 0) {
      const { error: splitError } = await supabase.from("expense_splits").insert(
        input.splits.map((s) => ({
          expense_id: input.id,
          user_id: s.user_id,
          paid_amount: s.paid_amount,
        }))
      );
      if (splitError) throw new Error(splitError.message);
    } else {
      const { error: splitError } = await supabase.from("expense_splits").insert({
        expense_id: input.id,
        user_id: userId,
        paid_amount: input.amount,
      });
      if (splitError) throw new Error(splitError.message);
    }

    const updated = await this.getExpense(input.id);
    if (!updated) throw new Error("Ausgabe konnte nicht geladen werden");
    return updated;
  }

  async deleteExpense(_userId: string, expenseId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("expenses").delete().eq("id", expenseId);
    if (error) throw new Error(error.message);
  }
}

let repositoryInstance: SupabaseRepository | null = null;

export function getRepository(): DataRepository {
  if (!repositoryInstance) {
    repositoryInstance = new SupabaseRepository();
  }
  return repositoryInstance;
}

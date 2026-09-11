import { createClient } from "@/lib/supabase/server";
import { getRepository } from "@/lib/data/supabase-repository";
import { ExpenseList } from "@/components/expenses/expense-list";

export default async function ExpensesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const repo = getRepository();
  const membership = await repo.getUserMembership(user.id);
  if (!membership) return null;

  const householdId = membership.household_id;
  const [expenses, rooms, members] = await Promise.all([
    repo.getExpenses(householdId),
    repo.getRooms(householdId),
    repo.getHouseholdMembers(householdId),
  ]);

  return (
    <ExpenseList
      expenses={expenses}
      rooms={rooms}
      members={members}
      currentUserId={user.id}
    />
  );
}

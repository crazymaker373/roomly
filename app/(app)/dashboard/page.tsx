import { createClient } from "@/lib/supabase/server";
import { getRepository } from "@/lib/data/supabase-repository";
import { getDashboardStats } from "@/lib/services/household-service";
import { DashboardClient } from "@/components/floorplan/dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const repo = getRepository();
  const membership = await repo.getUserMembership(user.id);
  if (!membership) return null;

  const householdId = membership.household_id;
  const [rooms, expenses, stats] = await Promise.all([
    repo.getRooms(householdId),
    repo.getExpenses(householdId),
    getDashboardStats(householdId),
  ]);

  return (
    <DashboardClient
      rooms={rooms}
      expenses={expenses}
      stats={{
        total_spend: stats.total_spend,
        expense_count: stats.expense_count,
        by_member: stats.by_member,
      }}
    />
  );
}

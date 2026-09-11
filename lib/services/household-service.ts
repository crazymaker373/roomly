import { getRepository } from "@/lib/data/supabase-repository";
import { calculateSettlement, getCategoryTotals } from "@/lib/services/settlement";
import type { DashboardStats } from "@/lib/types";

export async function getDashboardStats(
  householdId: string
): Promise<DashboardStats> {
  const repo = getRepository();
  const [expenses, members] = await Promise.all([
    repo.getExpenses(householdId),
    repo.getHouseholdMembers(householdId),
  ]);

  const profiles = new Map<string, string>();
  for (const member of members) {
    profiles.set(
      member.user_id,
      member.profile?.display_name ?? "Unbekannt"
    );
  }

  const settlement = calculateSettlement(expenses, members, profiles);
  const byCategory = getCategoryTotals(expenses);

  return {
    total_spend: settlement.total_spend,
    expense_count: expenses.length,
    by_category: byCategory,
    by_member: settlement.member_balances.map((b) => ({
      user_id: b.user_id,
      display_name: b.display_name,
      paid: b.paid,
    })),
    settlement,
  };
}

export async function requireMembership(userId: string) {
  const repo = getRepository();
  const membership = await repo.getUserMembership(userId);
  if (!membership) {
    return null;
  }
  const household = await repo.getHousehold(membership.household_id);
  return { membership, household };
}

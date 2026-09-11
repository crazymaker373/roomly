import { createClient } from "@/lib/supabase/server";
import { getRepository } from "@/lib/data/supabase-repository";
import { getDashboardStats } from "@/lib/services/household-service";
import { SettlementView } from "@/components/stats/settlement-view";

export default async function SettlePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const repo = getRepository();
  const membership = await repo.getUserMembership(user.id);
  if (!membership) return null;

  const stats = await getDashboardStats(membership.household_id);

  return <SettlementView settlement={stats.settlement} />;
}

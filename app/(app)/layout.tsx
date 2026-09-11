import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireMembership } from "@/lib/services/household-service";
import { AppHeader } from "@/components/app-header";
import { getRepository } from "@/lib/data/supabase-repository";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const membershipData = await requireMembership(user.id);
  if (!membershipData) {
    redirect("/onboarding");
  }

  const repo = getRepository();
  const profile = await repo.getProfile(user.id);

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader
        displayName={profile?.display_name ?? user.email?.split("@")[0] ?? "User"}
        email={user.email ?? ""}
        householdName={membershipData.household?.name ?? "WG"}
      />
      <main className="flex-1">{children}</main>
    </div>
  );
}

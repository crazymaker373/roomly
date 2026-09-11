"use client";

import dynamic from "next/dynamic";
import type { Room, Expense } from "@/lib/types";
import { SummaryCards } from "@/components/stats/summary-cards";

const FloorplanView = dynamic(
  () =>
    import("@/components/floorplan/floorplan-view").then((m) => m.FloorplanView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center bg-muted/30 md:h-[calc(100vh-4rem)]">
        <p className="text-muted-foreground">Grundriss wird geladen…</p>
      </div>
    ),
  }
);

interface DashboardClientProps {
  rooms: Room[];
  expenses: Expense[];
  stats: {
    total_spend: number;
    expense_count: number;
    by_member: { user_id: string; display_name: string; paid: number }[];
  };
}

export function DashboardClient({
  rooms,
  expenses,
  stats,
}: DashboardClientProps) {
  return (
    <div className="flex flex-col">
      <div className="border-b p-4">
        <SummaryCards
          totalSpend={stats.total_spend}
          expenseCount={stats.expense_count}
          byMember={stats.by_member}
        />
      </div>
      <FloorplanView rooms={rooms} expenses={expenses} />
    </div>
  );
}

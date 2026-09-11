import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRepository } from "@/lib/data/supabase-repository";
import { formatCurrency, formatDate } from "@/lib/utils";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const repo = getRepository();
  const room = await repo.getRoom(roomId);
  if (!room) notFound();

  const membership = await repo.getUserMembership(user.id);
  if (!membership || membership.household_id !== room.household_id) {
    notFound();
  }

  const expenses = await repo.getExpenses(membership.household_id, roomId);
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <div
              className="h-4 w-4 rounded"
              style={{ backgroundColor: room.color }}
            />
            <h1 className="text-2xl font-bold">{room.name}</h1>
          </div>
          <p className="text-muted-foreground">
            {formatCurrency(total)} · {expenses.length} Ausgaben
          </p>
        </div>
      </div>
      {expenses.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          Noch keine Ausgaben in diesem Raum.
        </p>
      ) : (
        <ul className="space-y-3">
          {expenses.map((expense) => (
            <li key={expense.id} className="rounded-lg border p-4">
              <div className="flex justify-between">
                <div>
                  <p className="font-medium">{expense.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(expense.date)}
                  </p>
                </div>
                <p className="font-bold">{formatCurrency(expense.amount)}</p>
              </div>
              <Badge variant="secondary" className="mt-2">
                {EXPENSE_CATEGORY_LABELS[expense.category]}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

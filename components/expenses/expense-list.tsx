"use client";

import { useState } from "react";
import type { Expense, Room, HouseholdMember, ExpenseCategory } from "@/lib/types";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS } from "@/lib/types";
import {
  createExpenseAction,
  updateExpenseAction,
  deleteExpenseAction,
} from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Plus } from "lucide-react";

interface ExpenseListProps {
  expenses: Expense[];
  rooms: Room[];
  members: HouseholdMember[];
  currentUserId: string;
}

export function ExpenseList({
  expenses,
  rooms,
  members,
  currentUserId,
}: ExpenseListProps) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [filterRoom, setFilterRoom] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const filtered = expenses.filter((e) => {
    if (filterRoom !== "all" && e.room_id !== filterRoom) return false;
    if (filterCategory !== "all" && e.category !== filterCategory) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Ausgaben</h1>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Neue Ausgabe
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={filterRoom} onValueChange={setFilterRoom}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Raum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Räume</SelectItem>
            {rooms.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Kategorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Kategorien</SelectItem>
            {EXPENSE_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {EXPENSE_CATEGORY_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showForm && (
        <ExpenseForm
          rooms={rooms}
          members={members}
          expense={editing}
          currentUserId={currentUserId}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Keine Ausgaben gefunden. Füge die erste Ausgabe hinzu!
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {filtered.map((expense) => (
            <Card key={expense.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{expense.title}</p>
                    <Badge variant="secondary">
                      {EXPENSE_CATEGORY_LABELS[expense.category]}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {expense.room?.name} · {formatDate(expense.date)} ·{" "}
                    {expense.splits?.[0]?.profile?.display_name ?? "Unbekannt"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-bold">{formatCurrency(expense.amount)}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => { setEditing(expense); setShowForm(true); }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={async () => {
                      if (confirm("Ausgabe wirklich löschen?")) {
                        await deleteExpenseAction(expense.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}

function ExpenseForm({
  rooms,
  members,
  expense,
  currentUserId,
  onClose,
}: {
  rooms: Room[];
  members: HouseholdMember[];
  expense: Expense | null;
  currentUserId: string;
  onClose: () => void;
}) {
  const [roomId, setRoomId] = useState(expense?.room_id ?? rooms[0]?.id ?? "");
  const [category, setCategory] = useState<ExpenseCategory>(
    expense?.category ?? "moebel"
  );
  const [payerId, setPayerId] = useState(
    expense?.splits?.[0]?.user_id ?? currentUserId
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{expense ? "Ausgabe bearbeiten" : "Neue Ausgabe"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          action={async (fd) => {
            fd.set("room_id", roomId);
            fd.set("category", category);
            fd.set("payer_id", payerId);
            if (expense) {
              fd.set("id", expense.id);
              await updateExpenseAction(fd);
            } else {
              await createExpenseAction(fd);
            }
            onClose();
          }}
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Bezeichnung</Label>
              <Input
                id="title"
                name="title"
                defaultValue={expense?.title}
                placeholder="z.B. IKEA Regal"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Betrag (€)</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={expense?.amount}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Raum</Label>
              <Select value={roomId} onValueChange={setRoomId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Kategorie</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as ExpenseCategory)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {EXPENSE_CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Datum</Label>
              <Input
                id="date"
                name="date"
                type="date"
                defaultValue={
                  expense?.date ?? new Date().toISOString().split("T")[0]
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Bezahlt von</Label>
              <Select value={payerId} onValueChange={setPayerId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.profile?.display_name ?? "Unbekannt"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit">
              {expense ? "Speichern" : "Hinzufügen"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Abbrechen
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

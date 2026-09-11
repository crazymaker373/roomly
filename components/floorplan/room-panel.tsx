"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { Room, Expense } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface RoomPanelProps {
  room: Room;
  expenses: Expense[];
  total: number;
  count: number;
}

export function RoomPanel({ room, expenses, total, count }: RoomPanelProps) {
  return (
    <AnimatePresence>
      <motion.aside
        initial={{ x: "100%", opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "100%", opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="absolute bottom-0 right-0 top-0 z-10 flex w-full flex-col border-l bg-background/95 backdrop-blur md:w-96"
      >
        <div className="border-b p-4">
          <div className="flex items-center gap-3">
            <div
              className="h-4 w-4 rounded"
              style={{ backgroundColor: room.color }}
            />
            <h2 className="text-lg font-semibold">{room.name}</h2>
          </div>
          <p className="mt-2 text-2xl font-bold">{formatCurrency(total)}</p>
          <p className="text-sm text-muted-foreground">
            {count} {count === 1 ? "Ausgabe" : "Ausgaben"}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {expenses.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              Noch keine Ausgaben in diesem Raum.
            </p>
          ) : (
            <ul className="space-y-3">
              {expenses.map((expense) => (
                <li
                  key={expense.id}
                  className="rounded-lg border p-3 transition-colors hover:bg-accent/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{expense.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(expense.date)}
                      </p>
                    </div>
                    <p className="font-semibold">
                      {formatCurrency(expense.amount)}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="secondary">
                      {EXPENSE_CATEGORY_LABELS[expense.category]}
                    </Badge>
                    {expense.splits?.[0]?.profile?.display_name && (
                      <span className="text-xs text-muted-foreground">
                        bezahlt von {expense.splits[0].profile.display_name}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}

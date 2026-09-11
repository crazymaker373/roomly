import { formatCurrency } from "@/lib/utils";
import type { SettlementResult } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

interface SettlementViewProps {
  settlement: SettlementResult;
}

export function SettlementView({ settlement }: SettlementViewProps) {
  const { member_balances, transfers, total_spend } = settlement;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Auszugs-Abrechnung</h1>
        <p className="mt-1 text-muted-foreground">
          Fair-Share-Bilanz für eure WG-Einrichtung
        </p>
        <p className="mt-4 text-3xl font-bold">
          {formatCurrency(total_spend)}
        </p>
        <p className="text-sm text-muted-foreground">Gesamtausgaben</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Saldo pro Person</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {member_balances.map((member) => (
              <li
                key={member.user_id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">{member.display_name}</p>
                  <p className="text-sm text-muted-foreground">
                    Bezahlt: {formatCurrency(member.paid)} · Anteil:{" "}
                    {formatCurrency(member.fair_share)}
                  </p>
                </div>
                <span
                  className={`font-semibold ${
                    member.balance > 0.01
                      ? "text-green-600 dark:text-green-400"
                      : member.balance < -0.01
                        ? "text-red-600 dark:text-red-400"
                        : ""
                  }`}
                >
                  {member.balance > 0.01
                    ? `+${formatCurrency(member.balance)}`
                    : member.balance < -0.01
                      ? formatCurrency(member.balance)
                      : "±0 €"}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Überweisungen</CardTitle>
        </CardHeader>
        <CardContent>
          {transfers.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Alles ausgeglichen — keine Überweisungen nötig!
            </p>
          ) : (
            <ul className="space-y-3">
              {transfers.map((transfer, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{transfer.from_name}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{transfer.to_name}</span>
                  </div>
                  <span className="font-bold">
                    {formatCurrency(transfer.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

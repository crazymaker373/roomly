import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface SummaryCardsProps {
  totalSpend: number;
  expenseCount: number;
  byMember: { user_id: string; display_name: string; paid: number }[];
}

export function SummaryCards({
  totalSpend,
  expenseCount,
  byMember,
}: SummaryCardsProps) {
  const maxPaid = Math.max(...byMember.map((m) => m.paid), 1);

  return (
    <div className="mx-auto grid max-w-7xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Gesamtausgaben
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{formatCurrency(totalSpend)}</p>
          <p className="text-xs text-muted-foreground">
            {expenseCount} {expenseCount === 1 ? "Posten" : "Posten"}
          </p>
        </CardContent>
      </Card>
      {byMember.slice(0, 3).map((member) => (
        <Card key={member.user_id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {member.display_name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(member.paid)}</p>
            <Progress
              value={(member.paid / maxPaid) * 100}
              className="mt-2 h-1.5"
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

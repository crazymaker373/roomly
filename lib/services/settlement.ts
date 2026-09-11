import type {
  Expense,
  ExpenseCategory,
  HouseholdMember,
  MemberBalance,
  SettlementResult,
  SettlementTransfer,
} from "@/lib/types";

export function calculateSettlement(
  expenses: Expense[],
  members: HouseholdMember[],
  profiles: Map<string, string>
): SettlementResult {
  const memberIds = members.map((m) => m.user_id);
  const paidByMember = new Map<string, number>();
  memberIds.forEach((id) => paidByMember.set(id, 0));

  let totalSpend = 0;
  const byCategory: Record<ExpenseCategory, number> = {
    moebel: 0,
    deko: 0,
    elektronik: 0,
    kueche: 0,
    sonstiges: 0,
  };

  for (const expense of expenses) {
    totalSpend += expense.amount;
    byCategory[expense.category] =
      (byCategory[expense.category] ?? 0) + expense.amount;

    if (expense.splits && expense.splits.length > 0) {
      for (const split of expense.splits) {
        const current = paidByMember.get(split.user_id) ?? 0;
        paidByMember.set(split.user_id, current + split.paid_amount);
      }
    } else {
      const current = paidByMember.get(expense.created_by) ?? 0;
      paidByMember.set(expense.created_by, current + expense.amount);
    }
  }

  const memberCount = members.length || 1;
  const fairShare = totalSpend / memberCount;

  const memberBalances: MemberBalance[] = members.map((member) => {
    const paid = paidByMember.get(member.user_id) ?? 0;
    return {
      user_id: member.user_id,
      display_name:
        profiles.get(member.user_id) ??
        member.profile?.display_name ??
        "Unbekannt",
      paid,
      fair_share: fairShare,
      balance: paid - fairShare,
    };
  });

  const transfers = computeMinimalTransfers(memberBalances);

  return {
    total_spend: totalSpend,
    member_balances: memberBalances,
    transfers,
  };
}

function computeMinimalTransfers(
  balances: MemberBalance[]
): SettlementTransfer[] {
  const debtors = balances
    .filter((b) => b.balance < -0.01)
    .map((b) => ({
      user_id: b.user_id,
      display_name: b.display_name,
      amount: Math.abs(b.balance),
    }))
    .sort((a, b) => b.amount - a.amount);

  const creditors = balances
    .filter((b) => b.balance > 0.01)
    .map((b) => ({
      user_id: b.user_id,
      display_name: b.display_name,
      amount: b.balance,
    }))
    .sort((a, b) => b.amount - a.amount);

  const transfers: SettlementTransfer[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const transferAmount = Math.min(debtors[i].amount, creditors[j].amount);
    if (transferAmount > 0.01) {
      transfers.push({
        from_user_id: debtors[i].user_id,
        to_user_id: creditors[j].user_id,
        amount: Math.round(transferAmount * 100) / 100,
        from_name: debtors[i].display_name,
        to_name: creditors[j].display_name,
      });
    }
    debtors[i].amount -= transferAmount;
    creditors[j].amount -= transferAmount;
    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }

  return transfers;
}

export function getCategoryTotals(
  expenses: Expense[]
): Record<ExpenseCategory, number> {
  const totals: Record<ExpenseCategory, number> = {
    moebel: 0,
    deko: 0,
    elektronik: 0,
    kueche: 0,
    sonstiges: 0,
  };
  for (const expense of expenses) {
    totals[expense.category] += expense.amount;
  }
  return totals;
}

export function getRoomTotals(
  expenses: Expense[],
  roomId: string
): { total: number; count: number } {
  const roomExpenses = expenses.filter((e) => e.room_id === roomId);
  return {
    total: roomExpenses.reduce((sum, e) => sum + e.amount, 0),
    count: roomExpenses.length,
  };
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepository } from "@/lib/data/supabase-repository";
import type { CreateExpenseInput, UpdateExpenseInput } from "@/lib/data/repository";
import type { ExpenseCategory } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

export async function createHouseholdAction(formData: FormData) {
  const user = await requireAuth();
  const name = (formData.get("name") as string)?.trim();
  if (!name) throw new Error("Name erforderlich");

  const repo = getRepository();
  await repo.createHousehold(user.id, name);
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function joinHouseholdAction(formData: FormData) {
  const user = await requireAuth();
  const inviteCode = (formData.get("invite_code") as string)?.trim();
  if (!inviteCode) throw new Error("Einladungscode erforderlich");

  const repo = getRepository();
  await repo.joinHousehold(user.id, inviteCode);
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function createExpenseAction(formData: FormData) {
  const user = await requireAuth();
  const repo = getRepository();

  const roomId = formData.get("room_id") as string;
  const title = (formData.get("title") as string)?.trim();
  const amount = parseFloat(formData.get("amount") as string);
  const category = formData.get("category") as ExpenseCategory;
  const date = formData.get("date") as string;
  const payerId = (formData.get("payer_id") as string) || user.id;

  if (!roomId || !title || isNaN(amount) || amount <= 0) {
    throw new Error("Ungültige Eingaben");
  }

  const input: CreateExpenseInput = {
    room_id: roomId,
    title,
    amount,
    category,
    date: date || new Date().toISOString().split("T")[0],
    splits: [{ user_id: payerId, paid_amount: amount }],
  };

  await repo.createExpense(user.id, input);
  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  revalidatePath(`/rooms/${roomId}`);
}

export async function updateExpenseAction(formData: FormData) {
  const user = await requireAuth();
  const repo = getRepository();

  const id = formData.get("id") as string;
  const roomId = formData.get("room_id") as string;
  const title = (formData.get("title") as string)?.trim();
  const amount = parseFloat(formData.get("amount") as string);
  const category = formData.get("category") as ExpenseCategory;
  const date = formData.get("date") as string;
  const payerId = (formData.get("payer_id") as string) || user.id;

  if (!id || !roomId || !title || isNaN(amount) || amount <= 0) {
    throw new Error("Ungültige Eingaben");
  }

  const input: UpdateExpenseInput = {
    id,
    room_id: roomId,
    title,
    amount,
    category,
    date,
    splits: [{ user_id: payerId, paid_amount: amount }],
  };

  await repo.updateExpense(user.id, input);
  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  revalidatePath(`/rooms/${roomId}`);
}

export async function deleteExpenseAction(expenseId: string) {
  const user = await requireAuth();
  const repo = getRepository();
  await repo.deleteExpense(user.id, expenseId);
  revalidatePath("/dashboard");
  revalidatePath("/expenses");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  redirect("/dashboard");
}

export async function registerAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const displayName = formData.get("display_name") as string;
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
    },
  });
  if (error) return { error: error.message };
  redirect("/onboarding");
}

import { supabase } from "../lib/supabase";
import type { DailyTargets, Supplement } from "../types";

// ── Types for DB rows ────────────────────────────────────────────────────────

interface DbDailyTargets {
  id: string;
  user_id: string;
  calories: number | null;
  deviation_percent: number | null;
  carbs_percent: number | null;
  carbs_calories: number | null;
  carbs_grams: number | null;
  protein_percent: number | null;
  protein_calories: number | null;
  protein_grams: number | null;
  fat_percent: number | null;
  fat_calories: number | null;
  fat_grams: number | null;
  water_text: string | null;
}

interface DbSupplement {
  id: string;
  user_id: string;
  name: string;
  url: string | null;
  intake: string | null;
  sort_order: number;
}

interface DbProfile {
  id: string;
  plan_start_date: string | null;
}

// ── Conversion helpers ───────────────────────────────────────────────────────

function dbTargetsToLocal(row: DbDailyTargets): DailyTargets {
  return {
    calories: row.calories != null ? String(row.calories) : "",
    deviation: row.deviation_percent != null ? String(row.deviation_percent) : "",
    carbsPercent: row.carbs_percent != null ? String(row.carbs_percent) : "",
    carbsCalories: row.carbs_calories != null ? String(row.carbs_calories) : "",
    carbsGrams: row.carbs_grams != null ? String(row.carbs_grams) : "",
    proteinPercent: row.protein_percent != null ? String(row.protein_percent) : "",
    proteinCalories: row.protein_calories != null ? String(row.protein_calories) : "",
    proteinGrams: row.protein_grams != null ? String(row.protein_grams) : "",
    fatPercent: row.fat_percent != null ? String(row.fat_percent) : "",
    fatCalories: row.fat_calories != null ? String(row.fat_calories) : "",
    fatGrams: row.fat_grams != null ? String(row.fat_grams) : "",
    water: row.water_text ?? "",
  };
}

function dbSupplementsToLocal(rows: DbSupplement[]): Supplement[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    url: row.url ?? "",
    intake: row.intake ?? "",
  }));
}

// ── Fetch ────────────────────────────────────────────────────────────────────

export interface FoodData {
  planStartDate: string | null;
  dailyTargets: DailyTargets | null;
  supplements: Supplement[] | null;
}

export async function fetchFoodData(userId: string): Promise<FoodData> {
  if (!supabase) {
    return { planStartDate: null, dailyTargets: null, supplements: null };
  }

  const [profileRes, targetsRes, supplementsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("plan_start_date")
      .eq("id", userId)
      .maybeSingle<DbProfile>(),
    supabase
      .from("daily_targets")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle<DbDailyTargets>(),
    supabase
      .from("supplements")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true })
      .returns<DbSupplement[]>(),
  ]);

  return {
    planStartDate: profileRes.data?.plan_start_date ?? null,
    dailyTargets: targetsRes.data ? dbTargetsToLocal(targetsRes.data) : null,
    supplements: supplementsRes.error
      ? null
      : dbSupplementsToLocal(supplementsRes.data ?? []),
  };
}

// ── Save: plan start date ────────────────────────────────────────────────────

export async function savePlanStartDate(
  userId: string,
  date: string,
): Promise<void> {
  if (!supabase) return;

  const value = date || null;

  await supabase
    .from("profiles")
    .upsert({ id: userId, plan_start_date: value });
}

// ── Save: daily targets ──────────────────────────────────────────────────────

function toNullableInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  return Number.isNaN(num) ? null : num;
}

function toNullableNum(value: string): number | null {
  return toNullableInt(value);
}

export async function saveDailyTargets(
  userId: string,
  targets: DailyTargets,
): Promise<void> {
  if (!supabase) return;

  await supabase.from("daily_targets").upsert(
    {
      user_id: userId,
      calories: toNullableInt(targets.calories),
      deviation_percent: toNullableNum(targets.deviation),
      carbs_percent: toNullableNum(targets.carbsPercent),
      carbs_calories: toNullableInt(targets.carbsCalories),
      carbs_grams: toNullableNum(targets.carbsGrams),
      protein_percent: toNullableNum(targets.proteinPercent),
      protein_calories: toNullableInt(targets.proteinCalories),
      protein_grams: toNullableNum(targets.proteinGrams),
      fat_percent: toNullableNum(targets.fatPercent),
      fat_calories: toNullableInt(targets.fatCalories),
      fat_grams: toNullableNum(targets.fatGrams),
      water_text: targets.water || null,
    },
    { onConflict: "user_id" },
  );
}

// ── Save: supplements ────────────────────────────────────────────────────────

export async function saveSupplement(
  supplement: Supplement,
): Promise<void> {
  if (!supabase) return;

  await supabase.from("supplements").upsert({
    id: supplement.id,
    name: supplement.name,
    url: supplement.url || null,
    intake: supplement.intake || null,
  });
}

export async function addSupplementToDb(
  userId: string,
  supplement: Supplement,
): Promise<void> {
  if (!supabase) return;

  await supabase.from("supplements").insert({
    id: supplement.id,
    user_id: userId,
    name: supplement.name,
    url: supplement.url || null,
    intake: supplement.intake || null,
    sort_order: 0,
  });
}

export async function deleteSupplementFromDb(
  supplementId: string,
): Promise<void> {
  if (!supabase) return;

  await supabase.from("supplements").delete().eq("id", supplementId);
}

import { supabase } from "../lib/supabase";
import type { MealPlanMonth, MealPlanRow, MealSlot, Weekday } from "../types";
import { weekdays, mealSlots } from "../data";

// ── DB row types ─────────────────────────────────────────────────────────────

interface DbProgramMonth {
  id: string;
  user_id: string;
  month_number: number;
  label: string;
  sort_order: number;
}

interface DbMealPlanDay {
  id: string;
  user_id: string;
  month_id: string;
  day_number: number;
  label: string;
  sort_order: number;
}

interface DbMealPlanEntry {
  id: string;
  user_id: string;
  day_id: string;
  meal_slot: string;
  title: string;
  subtitle: string | null;
  highlight: string | null;
  sort_order: number;
}

// ── Slot mapping (DB ↔ UI) ───────────────────────────────────────────────────

const slotDbToUi: Record<string, MealSlot> = {
  breakfast: "ЗАКУСКА",
  morning_snack: "СНАК 1",
  lunch: "ОБЯД",
  afternoon_snack: "СНАК 2",
  dinner: "ВЕЧЕРЯ",
};

const slotUiToDb: Record<MealSlot, string> = {
  "ЗАКУСКА": "breakfast",
  "СНАК 1": "morning_snack",
  "ОБЯД": "lunch",
  "СНАК 2": "afternoon_snack",
  "ВЕЧЕРЯ": "dinner",
};

const slotSortOrder: Record<string, number> = {
  breakfast: 1,
  morning_snack: 2,
  lunch: 3,
  afternoon_snack: 4,
  dinner: 5,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function composeEntryText(entry: DbMealPlanEntry): string {
  return [entry.highlight, entry.title, entry.subtitle]
    .filter(Boolean)
    .join("\n");
}

function dayNumberToWeekday(dayNumber: number): Weekday {
  return weekdays[dayNumber - 1] ?? "ДЕН 1";
}

// ── Fetch regime data ────────────────────────────────────────────────────────

export interface RegimeData {
  mealPlanMonths: MealPlanMonth[];
  /** Map: dayId → { monthId, dayNumber } for write operations */
  dayIdMap: Map<string, { monthId: string; dayNumber: number }>;
}

export async function fetchRegimeData(userId: string): Promise<RegimeData> {
  if (!supabase) {
    return { mealPlanMonths: [], dayIdMap: new Map() };
  }

  const [monthsRes, daysRes, entriesRes] = await Promise.all([
    supabase
      .from("program_months")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true })
      .returns<DbProgramMonth[]>(),
    supabase
      .from("meal_plan_days")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true })
      .returns<DbMealPlanDay[]>(),
    supabase
      .from("meal_plan_entries")
      .select("*")
      .eq("user_id", userId)
      .returns<DbMealPlanEntry[]>(),
  ]);

  if (monthsRes.error) {
    throw new Error(`Грешка при зареждане на месеци: ${monthsRes.error.message}`);
  }
  if (daysRes.error) {
    throw new Error(`Грешка при зареждане на дни: ${daysRes.error.message}`);
  }
  if (entriesRes.error) {
    throw new Error(`Грешка при зареждане на хранения: ${entriesRes.error.message}`);
  }

  const months = monthsRes.data ?? [];
  const days = daysRes.data ?? [];
  const entries = entriesRes.data ?? [];

  // Build lookup: dayId → entries
  const entriesByDayId = new Map<string, DbMealPlanEntry[]>();
  for (const entry of entries) {
    const list = entriesByDayId.get(entry.day_id) ?? [];
    list.push(entry);
    entriesByDayId.set(entry.day_id, list);
  }

  // Build lookup: monthId → days
  const daysByMonthId = new Map<string, DbMealPlanDay[]>();
  for (const day of days) {
    const list = daysByMonthId.get(day.month_id) ?? [];
    list.push(day);
    daysByMonthId.set(day.month_id, list);
  }

  // Build dayId map for write operations
  const dayIdMap = new Map<string, { monthId: string; dayNumber: number }>();
  for (const day of days) {
    dayIdMap.set(day.id, { monthId: day.month_id, dayNumber: day.day_number });
  }

  // Assemble into MealPlanMonth[]
  const mealPlanMonths: MealPlanMonth[] = months.map((m) => {
    const monthDays = daysByMonthId.get(m.id) ?? [];
    monthDays.sort((a, b) => a.sort_order - b.sort_order);

    const rows: MealPlanRow[] = monthDays.map((day) => {
      const dayEntries = entriesByDayId.get(day.id) ?? [];

      const meals: Record<MealSlot, string> = {} as Record<MealSlot, string>;
      for (const slot of mealSlots) {
        meals[slot] = "";
      }

      for (const entry of dayEntries) {
        const uiSlot = slotDbToUi[entry.meal_slot];
        if (uiSlot) {
          meals[uiSlot] = composeEntryText(entry);
        }
      }

      return {
        day: dayNumberToWeekday(day.day_number),
        dayId: day.id,
        meals,
      };
    });

    return {
      id: m.id,
      name: m.label,
      rows,
    };
  });

  return { mealPlanMonths, dayIdMap };
}

// ── Find dayId for a given month + day ───────────────────────────────────────

export function findDayId(
  mealPlanMonths: MealPlanMonth[],
  monthId: string,
  day: Weekday,
): string | null {
  const month = mealPlanMonths.find((m) => m.id === monthId);
  if (!month) return null;
  const row = month.rows.find((r) => r.day === day);
  return row?.dayId ?? null;
}

// ── Upsert a single meal entry ───────────────────────────────────────────────

export async function upsertMealEntry(
  userId: string,
  dayId: string,
  mealSlot: MealSlot,
  value: string,
): Promise<void> {
  if (!supabase) return;

  const dbSlot = slotUiToDb[mealSlot];
  const sortOrder = slotSortOrder[dbSlot] ?? 1;

  // Try to find existing entry for this day+slot
  const { data: existing, error: findError } = await supabase
    .from("meal_plan_entries")
    .select("id, title, subtitle, highlight")
    .eq("user_id", userId)
    .eq("day_id", dayId)
    .eq("meal_slot", dbSlot)
    .maybeSingle();

  if (findError) {
    throw new Error(`Грешка при търсене на хранене: ${findError.message}`);
  }

  if (existing) {
    // Reconstruct the previously composed text to detect what changed
    const previousComposed = [existing.highlight, existing.title, existing.subtitle]
      .filter(Boolean)
      .join("\n");

    if (value === previousComposed) {
      // No actual change — skip update
      return;
    }

    // The user edited the composed textarea. Update title with the full new text.
    // Preserve subtitle/highlight only if the new value still starts/ends with them.
    let newHighlight: string | null = existing.highlight;
    let newTitle = value;
    let newSubtitle: string | null = existing.subtitle;

    if (existing.highlight && value.startsWith(existing.highlight + "\n")) {
      // Highlight is still at the beginning — preserve it
      newTitle = value.slice(existing.highlight.length + 1);
    } else {
      // Highlight was removed or changed — clear it
      newHighlight = null;
    }

    if (existing.subtitle && newTitle.endsWith("\n" + existing.subtitle)) {
      // Subtitle is still at the end — preserve it
      newTitle = newTitle.slice(0, -(existing.subtitle.length + 1));
    } else {
      // Subtitle was removed or changed — clear it
      newSubtitle = null;
    }

    const { error } = await supabase
      .from("meal_plan_entries")
      .update({ title: newTitle, subtitle: newSubtitle, highlight: newHighlight })
      .eq("id", existing.id);

    if (error) {
      throw new Error(`Грешка при запис на хранене: ${error.message}`);
    }
  } else {
    // Insert new entry — store everything as title
    const title = value.trim() || "";

    const { error } = await supabase
      .from("meal_plan_entries")
      .insert({
        user_id: userId,
        day_id: dayId,
        meal_slot: dbSlot,
        title,
        subtitle: null,
        highlight: null,
        sort_order: sortOrder,
      });

    if (error) {
      throw new Error(`Грешка при създаване на хранене: ${error.message}`);
    }
  }
}

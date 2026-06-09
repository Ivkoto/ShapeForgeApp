import { useEffect, useState } from "react";
import { createId, defaultState, storageKey } from "../data";
import type {
  AdviceItem,
  AppState,
  BodyMeasurement,
  Contacts,
  DailyTargets,
  Exercise,
  InfoCardItem,
  MealSlot,
  Recipe,
  RecipeGroup,
  ShoppingCategory,
  ShoppingItem,
  Supplement,
  Weekday,
} from "../types";

type LegacyAppState = Partial<AppState> & {
  diningOut?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeInfoCard(value: unknown, fallbackPrefix: string): InfoCardItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const title = typeof value.title === "string" ? value.title : "";
  const body = typeof value.body === "string" ? value.body : "";
  const accent = typeof value.accent === "string" ? value.accent : "";

  if (!title && !body && !accent) {
    return null;
  }

  return {
    id: typeof value.id === "string" && value.id ? value.id : crypto.randomUUID(),
    title,
    body,
    accent,
  };
}

function normalizeInfoCardList(value: unknown, fallbackPrefix: string): InfoCardItem[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  return value
    .map((item) => normalizeInfoCard(item, fallbackPrefix))
    .filter((item): item is InfoCardItem => item !== null);
}

function migrateDiningOutItems(raw: LegacyAppState): InfoCardItem[] {
  const existing = normalizeInfoCardList(raw.diningOutItems, "dining-out");
  if (existing) {
    return existing;
  }

  // Legacy: old `diningOut` was a single string field
  if (typeof raw.diningOut === "string" && raw.diningOut.trim()) {
    return [{
      id: crypto.randomUUID(),
      title: "Основна препоръка",
      body: raw.diningOut,
      accent: "",
    }];
  }

  return [];
}

function migrateAdvice(raw: LegacyAppState): AdviceItem[] {
  const advice = raw.advice;

  // Already in AdviceItem[] format (check first element for id field)
  if (Array.isArray(advice) && advice.length > 0 && typeof advice[0] === "object" && advice[0] !== null && "id" in advice[0]) {
    return advice as AdviceItem[];
  }

  // Legacy string[] → convert to AdviceItem[]
  if (Array.isArray(advice)) {
    return (advice as unknown as string[]).map((body, index) => ({
      id: crypto.randomUUID(),
      body: body ?? "",
      sortOrder: index,
    }));
  }

  return [];
}

function migrateGeneralInfoItems(raw: LegacyAppState): InfoCardItem[] {
  const existing = normalizeInfoCardList(raw.generalInfoItems, "general-info");
  return existing ?? [];
}

export function normalizeAppState(value: unknown): AppState {
  if (!value || typeof value !== "object") {
    return defaultState;
  }

  const raw = value as LegacyAppState;

  return {
    ...defaultState,
    ...(raw as Partial<AppState>),
    advice: migrateAdvice(raw),
    diningOutItems: migrateDiningOutItems(raw),
    generalInfoItems: migrateGeneralInfoItems(raw),
  };
}

function loadState(): AppState {
  try {
    const saved = localStorage.getItem(storageKey);
    return saved ? normalizeAppState(JSON.parse(saved)) : defaultState;
  } catch {
    return defaultState;
  }
}

export function emptyExercise(): Exercise {
  return {
    id: createId("exercise"),
    name: "Ново упражнение",
    setsReps: "",
    pictureUrl: "",
    videoUrl: "",
    notes: "",
  };
}

export function emptyRecipe(group: RecipeGroup): Recipe {
  return {
    id: createId("recipe"),
    name: "Нова рецепта",
    group,
    ingredients: [{ id: createId("ingredient"), text: "" }],
    preparation: "",
  };
}

export function useAppState() {
  const [state, setState] = useState<AppState>(loadState);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }, [state]);

  // ── Food ────────────────────────────────────────────────────────────────────

  function updateStartDate(date: string) {
    setState((s) => ({ ...s, startDate: date }));
  }

  function updateDailyTargets(patch: Partial<DailyTargets>) {
    setState((s) => ({ ...s, dailyTargets: { ...s.dailyTargets, ...patch } }));
  }

  function updateSupplement(id: string, patch: Partial<Supplement>) {
    setState((s) => ({
      ...s,
      supplements: s.supplements.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    }));
  }

  function addSupplement(id?: string) {
    setState((s) => ({
      ...s,
      supplements: [
        ...s.supplements,
        { id: id ?? createId("supplement"), name: "", url: "", intake: "" },
      ],
    }));
  }

  function removeSupplement(id: string) {
    setState((s) => ({
      ...s,
      supplements: s.supplements.filter((item) => item.id !== id),
    }));
  }

  // ── Advice ──────────────────────────────────────────────────────────────────

  function updateAdviceItem(id: string, patch: Partial<AdviceItem>) {
    setState((s) => ({
      ...s,
      advice: s.advice.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    }));
  }

  function addAdviceItem(id?: string) {
    setState((s) => ({
      ...s,
      advice: [
        ...s.advice,
        { id: id ?? crypto.randomUUID(), body: "", sortOrder: s.advice.length },
      ],
    }));
  }

  function removeAdviceItem(id: string) {
    setState((s) => ({
      ...s,
      advice: s.advice.filter((item) => item.id !== id),
    }));
  }

  // ── Regime ──────────────────────────────────────────────────────────────────

  function updateMeal(monthId: string, day: Weekday, meal: MealSlot, value: string) {
    setState((s) => ({
      ...s,
      mealPlanMonths: s.mealPlanMonths.map((month) =>
        month.id === monthId
          ? {
              ...month,
              rows: month.rows.map((row) =>
                row.day === day ? { ...row, meals: { ...row.meals, [meal]: value } } : row
              ),
            }
          : month
      ),
    }));
  }

  // ── Shopping ────────────────────────────────────────────────────────────────

  function addShoppingItem(monthId: string, category: ShoppingCategory) {
    setState((s) => {
      const item: ShoppingItem = {
        id: createId("shopping"),
        category,
        name: "",
        quantity: "",
        checked: false,
      };
      const existing = s.shoppingLists.find((list) => list.monthId === monthId);
      if (existing) {
        return {
          ...s,
          shoppingLists: s.shoppingLists.map((list) =>
            list.monthId === monthId ? { ...list, items: [...list.items, item] } : list
          ),
        };
      }
      return {
        ...s,
        shoppingLists: [...s.shoppingLists, { monthId, items: [item] }],
      };
    });
  }

  function updateShoppingItem(id: string, patch: Partial<ShoppingItem>) {
    setState((s) => ({
      ...s,
      shoppingLists: s.shoppingLists.map((list) => ({
        ...list,
        items: list.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      })),
    }));
  }

  function removeShoppingItem(id: string) {
    setState((s) => ({
      ...s,
      shoppingLists: s.shoppingLists.map((list) => ({
        ...list,
        items: list.items.filter((item) => item.id !== id),
      })),
    }));
  }

  // ── Dining Out & General Info ─────────────────────────────────────────────

  function updateDiningOutItem(id: string, patch: Partial<Omit<InfoCardItem, "id">>) {
    setState((s) => ({
      ...s,
      diningOutItems: s.diningOutItems.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    }));
  }

  function addDiningOutItem(id?: string) {
    setState((s) => ({
      ...s,
      diningOutItems: [
        ...s.diningOutItems,
        { id: id ?? createId("dining-out"), title: "Нова карта", body: "", accent: "" },
      ],
    }));
  }

  function removeDiningOutItem(id: string) {
    setState((s) => ({
      ...s,
      diningOutItems: s.diningOutItems.filter((item) => item.id !== id),
    }));
  }

  function updateGeneralInfoItem(id: string, patch: Partial<Omit<InfoCardItem, "id">>) {
    setState((s) => ({
      ...s,
      generalInfoItems: s.generalInfoItems.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    }));
  }

  function addGeneralInfoItem(id?: string) {
    setState((s) => ({
      ...s,
      generalInfoItems: [
        ...s.generalInfoItems,
        { id: id ?? createId("general-info"), title: "Нова карта", body: "", accent: "" },
      ],
    }));
  }

  function removeGeneralInfoItem(id: string) {
    setState((s) => ({
      ...s,
      generalInfoItems: s.generalInfoItems.filter((item) => item.id !== id),
    }));
  }

  // ── Macros Cards ──────────────────────────────────────────────────────────

  function updateMacrosCard(id: string, patch: Partial<Omit<InfoCardItem, "id">>) {
    setState((s) => ({
      ...s,
      macrosCards: s.macrosCards.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    }));
  }

  function addMacrosCard(id?: string) {
    setState((s) => ({
      ...s,
      macrosCards: [
        ...s.macrosCards,
        { id: id ?? createId("macros"), title: "Нова карта", body: "", accent: "" },
      ],
    }));
  }

  function removeMacrosCard(id: string) {
    setState((s) => ({
      ...s,
      macrosCards: s.macrosCards.filter((item) => item.id !== id),
    }));
  }

  // ── Recipes ─────────────────────────────────────────────────────────────────

  function addRecipe(group: RecipeGroup): string {
    const recipe = emptyRecipe(group);
    setState((s) => ({ ...s, recipes: [recipe, ...s.recipes] }));
    return recipe.id;
  }

  function removeRecipe(id: string) {
    setState((s) => ({ ...s, recipes: s.recipes.filter((r) => r.id !== id) }));
  }

  function updateRecipe(id: string, patch: Partial<Recipe>) {
    setState((s) => ({
      ...s,
      recipes: s.recipes.map((recipe) =>
        recipe.id === id ? { ...recipe, ...patch } : recipe
      ),
    }));
  }

  function addIngredient(recipeId: string) {
    setState((s) => ({
      ...s,
      recipes: s.recipes.map((recipe) =>
        recipe.id === recipeId
          ? {
              ...recipe,
              ingredients: [
                ...recipe.ingredients,
                { id: createId("ingredient"), text: "" },
              ],
            }
          : recipe
      ),
    }));
  }

  function updateIngredient(recipeId: string, ingredientId: string, patch: Partial<Pick<{ id: string; text: string }, "text">>) {
    setState((s) => ({
      ...s,
      recipes: s.recipes.map((recipe) =>
        recipe.id === recipeId
          ? {
              ...recipe,
              ingredients: recipe.ingredients.map((ingredient) =>
                ingredient.id === ingredientId ? { ...ingredient, ...patch } : ingredient
              ),
            }
          : recipe
      ),
    }));
  }

  function removeIngredient(recipeId: string, ingredientId: string) {
    setState((s) => ({
      ...s,
      recipes: s.recipes.map((recipe) =>
        recipe.id === recipeId
          ? {
              ...recipe,
              ingredients: recipe.ingredients.filter((i) => i.id !== ingredientId),
            }
          : recipe
      ),
    }));
  }

  // ── Training ─────────────────────────────────────────────────────────────────

  function updateWeeklyFocus(day: Weekday, focus: string) {
    setState((s) => ({
      ...s,
      weeklyTraining: s.weeklyTraining.map((item) =>
        item.day === day ? { ...item, focus } : item
      ),
    }));
  }

  function updateWorkoutExercise(
    activeDay: Weekday,
    sectionId: string,
    exerciseId: string,
    patch: Partial<Exercise>
  ) {
    setState((s) => ({
      ...s,
      workouts: s.workouts.map((workout) =>
        workout.day === activeDay
          ? {
              ...workout,
              sections: workout.sections.map((section) =>
                section.id === sectionId
                  ? {
                      ...section,
                      exercises: section.exercises.map((exercise) =>
                        exercise.id === exerciseId ? { ...exercise, ...patch } : exercise
                      ),
                    }
                  : section
              ),
            }
          : workout
      ),
    }));
  }

  function addWorkoutExercise(activeDay: Weekday, sectionId: string) {
    setState((s) => ({
      ...s,
      workouts: s.workouts.map((workout) =>
        workout.day === activeDay
          ? {
              ...workout,
              sections: workout.sections.map((section) =>
                section.id === sectionId
                  ? { ...section, exercises: [...section.exercises, emptyExercise()] }
                  : section
              ),
            }
          : workout
      ),
    }));
  }

  function removeWorkoutExercise(activeDay: Weekday, sectionId: string, exerciseId: string) {
    setState((s) => ({
      ...s,
      workouts: s.workouts.map((workout) =>
        workout.day === activeDay
          ? {
              ...workout,
              sections: workout.sections.map((section) =>
                section.id === sectionId
                  ? {
                      ...section,
                      exercises: section.exercises.filter((e) => e.id !== exerciseId),
                    }
                  : section
              ),
            }
          : workout
      ),
    }));
  }

  function updateTrainingGoalInfo(info: string) {
    setState((s) => ({ ...s, trainingGoal: { ...s.trainingGoal, info } }));
  }

  function updateTrainingMeta(patch: Partial<AppState["trainingMeta"]>) {
    setState((s) => ({ ...s, trainingMeta: { ...s.trainingMeta, ...patch } }));
  }

  // ── Abs & Stretching ─────────────────────────────────────────────────────────

  function updateAbsExercise(id: string, patch: Partial<Exercise>) {
    setState((s) => ({
      ...s,
      absExercises: s.absExercises.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  }

  function addAbsExercise() {
    setState((s) => ({
      ...s,
      absExercises: [...s.absExercises, { id: createId("exercise"), name: "", setsReps: "", pictureUrl: "", videoUrl: "", notes: "" }],
    }));
  }

  function removeAbsExercise(id: string) {
    setState((s) => ({ ...s, absExercises: s.absExercises.filter((e) => e.id !== id) }));
  }

  function updateStretchingExercise(id: string, patch: Partial<Exercise>) {
    setState((s) => ({
      ...s,
      stretchingExercises: s.stretchingExercises.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  }

  function addStretchingExercise() {
    setState((s) => ({
      ...s,
      stretchingExercises: [...s.stretchingExercises, { id: createId("exercise"), name: "", setsReps: "", pictureUrl: "", videoUrl: "", notes: "" }],
    }));
  }

  function removeStretchingExercise(id: string) {
    setState((s) => ({ ...s, stretchingExercises: s.stretchingExercises.filter((e) => e.id !== id) }));
  }

  // ── Body Measurements ─────────────────────────────────────────────────────

  function addBodyMeasurement(id?: string) {
    const lastMeasurement = state.bodyMeasurements[0];
    const measurement: BodyMeasurement = {
      id: id ?? createId("measurement"),
      date: new Date().toISOString().split("T")[0],
      height: lastMeasurement?.height ?? "",
      neck: "",
      waistNavel: "",
      waistAbove: "",
      hips: "",
      thigh: "",
      calf: "",
      bicep: "",
      bust: "",
    };
    setState((s) => ({
      ...s,
      bodyMeasurements: [measurement, ...s.bodyMeasurements],
    }));
  }

  function updateBodyMeasurement(id: string, patch: Partial<BodyMeasurement>) {
    setState((s) => {
      const updated = s.bodyMeasurements.map((m) =>
        m.id === id ? { ...m, ...patch } : m
      );
      // If height changed on first measurement, propagate to all
      if (patch.height && updated[0]?.id === id) {
        return {
          ...s,
          bodyMeasurements: updated.map((m) => ({ ...m, height: patch.height! })),
        };
      }
      return { ...s, bodyMeasurements: updated };
    });
  }

  function removeBodyMeasurement(id: string) {
    setState((s) => ({
      ...s,
      bodyMeasurements: s.bodyMeasurements.filter((m) => m.id !== id),
    }));
  }

  // ── Contacts ─────────────────────────────────────────────────────────────────

  function updateContacts(patch: Partial<Contacts>) {
    setState((s) => ({ ...s, contacts: { ...s.contacts, ...patch } }));
  }

  function replaceState(nextState: unknown) {
    setState(normalizeAppState(nextState));
  }

  return {
    state,
    replaceState,
    // food
    updateStartDate,
    updateDailyTargets,
    updateSupplement,
    addSupplement,
    removeSupplement,
    updateAdviceItem,
    addAdviceItem,
    removeAdviceItem,
    // regime
    updateMeal,
    // shopping
    addShoppingItem,
    updateShoppingItem,
    removeShoppingItem,
    // diningOut + general info + macros
    updateDiningOutItem,
    addDiningOutItem,
    removeDiningOutItem,
    updateGeneralInfoItem,
    addGeneralInfoItem,
    removeGeneralInfoItem,
    updateMacrosCard,
    addMacrosCard,
    removeMacrosCard,
    // recipes
    addRecipe,
    removeRecipe,
    updateRecipe,
    addIngredient,
    updateIngredient,
    removeIngredient,
    // training
    updateWeeklyFocus,
    updateWorkoutExercise,
    addWorkoutExercise,
    removeWorkoutExercise,
    updateTrainingGoalInfo,
    updateTrainingMeta,
    updateAbsExercise,
    addAbsExercise,
    removeAbsExercise,
    updateStretchingExercise,
    addStretchingExercise,
    removeStretchingExercise,
    // contacts
    updateContacts,
    // body measurements
    addBodyMeasurement,
    updateBodyMeasurement,
    removeBodyMeasurement,
  };
}

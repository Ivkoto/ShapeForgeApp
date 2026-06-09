export type Weekday = "ДЕН 1" | "ДЕН 2" | "ДЕН 3" | "ДЕН 4" | "ДЕН 5" | "ДЕН 6" | "ДЕН 7";

export type MealSlot = "ЗАКУСКА" | "СНАК 1" | "ОБЯД" | "СНАК 2" | "ВЕЧЕРЯ";

export type ShoppingCategory =
  | "ПЛОДОВЕ и ЗЕЛЕНЧУЦИ"
  | "МЕСО, РИБА и ЯЙЦА"
  | "МЛЕЧНИ ПРОДУКТИ"
  | "ЗЪРНЕНИ, БОБОВИ, ЯДКИ и СЕМЕНА"
  | "ДРУГИ";

export type Supplement = {
  id: string;
  name: string;
  url: string;
  intake: string;
};

export type AdviceItem = {
  id: string;
  body: string;
  sortOrder: number;
};

export type DailyTargets = {
  calories: string;
  deviation: string;
  carbsPercent: string;
  carbsCalories: string;
  carbsGrams: string;
  proteinPercent: string;
  proteinCalories: string;
  proteinGrams: string;
  fatPercent: string;
  fatCalories: string;
  fatGrams: string;
  water: string;
};

export type MacroInfo = {
  id: string;
  title: string;
  description: string;
  sources: string;
};

export type InfoCardItem = {
  id: string;
  title: string;
  body: string;
  accent: string;
};

export type MealPlanRow = {
  day: Weekday;
  dayId?: string;
  meals: Record<MealSlot, string>;
};

export type MealPlanMonth = {
  id: string;
  name: string;
  rows: MealPlanRow[];
};

export type ShoppingItem = {
  id: string;
  category: ShoppingCategory;
  name: string;
  quantity: string;
  checked: boolean;
};

export type MonthlyShoppingList = {
  monthId: string;
  items: ShoppingItem[];
};

export type Ingredient = {
  id: string;
  text: string;
};

export type RecipeGroup = "Закуска" | "Снак" | "Обяд" | "Вечеря";

export type Recipe = {
  id: string;
  name: string;
  group: RecipeGroup;
  ingredients: Ingredient[];
  preparation: string;
};

export type TrainingGoal = {
  info: string;
  bullets: string[];
};

export type TrainingMeta = {
  bmr: string;
  specification: string;
  forbiddenExercises: string;
};

export type WeeklyTrainingItem = {
  day: Weekday;
  focus: string;
};

export type Exercise = {
  id: string;
  name: string;
  setsReps: string;
  pictureUrl: string;
  videoUrl: string;
  notes: string;
};

export type WorkoutSection = {
  id: string;
  title: "Загрявка" | "Същинска част" | "Финал" | "Охлаждане";
  exercises: Exercise[];
};

export type WorkoutDay = {
  day: Weekday;
  heading: string;
  sections: WorkoutSection[];
};

export type Contacts = {
  trainerName: string;
  phone: string;
  email: string;
  notes: string;
};

export type BodyMeasurement = {
  id: string;
  date: string;
  height: string;
  neck: string;
  waistNavel: string;
  waistAbove: string;
  hips: string;
  thigh: string;
  calf: string;
  bicep: string;
  bust: string;
};

export type AppState = {
  startDate: string;
  supplements: Supplement[];
  advice: AdviceItem[];
  diningOutItems: InfoCardItem[];
  generalInfoItems: InfoCardItem[];
  macros: MacroInfo[];
  macrosCards: InfoCardItem[];
  dailyTargets: DailyTargets;
  mealPlanMonths: MealPlanMonth[];
  shoppingLists: MonthlyShoppingList[];
  recipes: Recipe[];
  trainingGoal: TrainingGoal;
  trainingMeta: TrainingMeta;
  trainingSpecifics: string;
  trainingAdditions: string[];
  exerciseUnderstanding: MacroInfo[];
  weeklyTraining: WeeklyTrainingItem[];
  workouts: WorkoutDay[];
  absExercises: Exercise[];
  stretchingExercises: Exercise[];
  contacts: Contacts;
  bodyMeasurements: BodyMeasurement[];
};

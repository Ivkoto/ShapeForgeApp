import type {
  AdviceItem,
  AppState,
  Exercise,
  InfoCardItem,
  MealSlot,
  ShoppingCategory,
  Supplement,
  Weekday,
  WorkoutSection,
} from "./types";

export const storageKey = "shapeforge-state-v2";

export const weekdays: Weekday[] = ["ДЕН 1", "ДЕН 2", "ДЕН 3", "ДЕН 4", "ДЕН 5", "ДЕН 6", "ДЕН 7"];

export const mealSlots: MealSlot[] = ["ЗАКУСКА", "СНАК 1", "ОБЯД", "СНАК 2", "ВЕЧЕРЯ"];

export const shoppingCategories: ShoppingCategory[] = [
  "ПЛОДОВЕ и ЗЕЛЕНЧУЦИ",
  "МЕСО, РИБА и ЯЙЦА",
  "МЛЕЧНИ ПРОДУКТИ",
  "ЗЪРНЕНИ, БОБОВИ, ЯДКИ и СЕМЕНА",
  "ДРУГИ",
];

export const workoutSectionTitles: WorkoutSection["title"][] = ["Загрявка", "Същинска част", "Финал", "Охлаждане"];

export function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)}`;
}

function exercise(name: string, setsReps: string, notes = ""): Exercise {
  return {
    id: createId("exercise"),
    name,
    setsReps,
    pictureUrl: "",
    videoUrl: "",
    notes,
  };
}

function workoutDay(day: Weekday, heading: string) {
  return {
    day,
    heading,
    sections: [
      {
        id: createId("section"),
        title: "Загрявка" as const,
        exercises: [exercise("5 минути динамичен стречинг", "5 мин"), exercise("Класически клек", "3 x 20")],
      },
      {
        id: createId("section"),
        title: "Същинска част" as const,
        exercises: [
          exercise("Пулсиращи напади", "3 x 15 на крак"),
          exercise("Степ ъп на стол/диван", "3 x 12"),
          exercise("Едностранно гребане", "3 x 12 на ръка"),
          exercise("Абдукторно разтваряне с ластик", "3 x 20"),
        ],
      },
      {
        id: createId("section"),
        title: "Финал" as const,
        exercises: [exercise("Коремни упражнения", "5 x 20")],
      },
      {
        id: createId("section"),
        title: "Охлаждане" as const,
        exercises: [exercise("Статичен стречинг", "5 мин")],
      },
    ],
  };
}

export const defaultState: AppState = {
  startDate: "",
  supplements: [] as Supplement[],
  advice: [] as AdviceItem[],
  diningOutItems: [] as InfoCardItem[],
  generalInfoItems: [] as InfoCardItem[],
  macros: [],
  macrosCards: [] as InfoCardItem[],
  dailyTargets: {
    calories: "",
    deviation: "",
    carbsPercent: "",
    carbsCalories: "",
    carbsGrams: "",
    proteinPercent: "",
    proteinCalories: "",
    proteinGrams: "",
    fatPercent: "",
    fatCalories: "",
    fatGrams: "",
    water: "",
  },
  mealPlanMonths: [],
  shoppingLists: [
    {
      monthId: "month-1",
      items: shoppingCategories.map((category) => ({
        id: createId("shopping"),
        category,
        name: "",
        quantity: "",
        checked: false,
      })),
    },
    { monthId: "month-2", items: [] },
    { monthId: "month-3", items: [] },
  ],
  recipes: [
    {
      id: "recipe-placeholder",
      name: "Примерна рецепта",
      group: "Закуска",
      ingredients: [{ id: "ingredient-placeholder", text: "Основни продукти и количества" }],
      preparation: "Начинът на приготвяне ще бъде попълнен тук.",
    },
  ],
  trainingGoal: {
    info:
      "С този тренировъчен план си поставяме за цел да изчистим максимално подкожните мазнини, да повишим здравословното тегло и мускулната маса и да подобрим цялостната визия на тялото.",
    bullets: [
      "Редуциране на теглото",
      "Забързване на метаболизма",
      "Изчистване на задържана вода",
      "Повишаване на енергия и тонус",
      "Изгаряне на подкожни мазнини",
      "Стягане и оформяне на проблемни зони",
    ],
  },
  trainingMeta: {
    bmr: "1692 калории на ден",
    specification: "Комбинация от силови и интервални тренировки",
    forbiddenExercises: "",
  },
  trainingSpecifics: "Тук ще добавим спецификите в тренировките.",
  trainingAdditions: [
    "Преди всяка тренировка отделяй по 5 мин. за загрявка.",
    "По време на тренировка консумирай минимум 500 мл. вода.",
    "Всяка тренировка завършва със 100 коремни преси по избор.",
    "Продължителност на тренировката: 60-90 минути.",
    "Почивка между серии: 30-60 секунди.",
    "Почивка между упражнения: 90-120 секунди.",
  ],
  exerciseUnderstanding: [
    {
      id: "understanding-aerobic",
      title: "Аеробни тренировки",
      description: "Изискват продължителност и дават отличен ефект върху сърдечно-съдовата система.",
      sources: "Пример: тичане",
    },
    {
      id: "understanding-anaerobic",
      title: "Анаеробни тренировки",
      description: "Подобряват експлозивната сила, мускулната маса и подпомагат изгарянето на мазнини.",
      sources: "Пример: вдигане на тежести",
    },
    {
      id: "understanding-stretching",
      title: "Стречинг",
      description: "Подпомага възстановяването, стойката, баланса и координацията.",
      sources: "Динамичен и статичен стречинг",
    },
  ],
  weeklyTraining: [
    { day: "ДЕН 1", focus: "Цяло тяло" },
    { day: "ДЕН 2", focus: "Почивка" },
    { day: "ДЕН 3", focus: "Цяло тяло / Дупе и бедра" },
    { day: "ДЕН 4", focus: "Почивка" },
    { day: "ДЕН 5", focus: "Цяло тяло / Горна част" },
    { day: "ДЕН 6", focus: "Цяло тяло" },
    { day: "ДЕН 7", focus: "Почивка" },
  ],
  workouts: weekdays.map((day) => workoutDay(day, `${day} тренировъчен план`)),
  absExercises: [exercise("Коремни преси", "5 x 20"), exercise("Планк", "3 x 45 сек")],
  stretchingExercises: [exercise("Статичен стречинг", "5 мин"), exercise("Разтягане за бедра и седалище", "5 мин")],
  contacts: {
    trainerName: "",
    phone: "0883 388 307",
    email: "rori@rorifit.com",
    notes: "",
  },
  bodyMeasurements: [],
};

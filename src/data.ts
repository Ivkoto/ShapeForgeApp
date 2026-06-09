import type {
  AdviceItem,
  AppState,
  Exercise,
  MealPlanMonth,
  MealPlanRow,
  MealSlot,
  ShoppingCategory,
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

function emptyMealRow(day: Weekday): MealPlanRow {
  return {
    day,
    meals: {
      "ЗАКУСКА": "",
      "СНАК 1": "",
      "ОБЯД": "",
      "СНАК 2": "",
      "ВЕЧЕРЯ": "",
    },
  };
}

function month(id: string, name: string): MealPlanMonth {
  return {
    id,
    name,
    rows: weekdays.map(emptyMealRow),
  };
}

function mealRow(day: Weekday, breakfast: string, snack1: string, lunch: string, snack2: string, dinner: string): MealPlanRow {
  return {
    day,
    meals: {
      "ЗАКУСКА": breakfast,
      "СНАК 1": snack1,
      "ОБЯД": lunch,
      "СНАК 2": snack2,
      "ВЕЧЕРЯ": dinner,
    },
  };
}

const monthOneRows: MealPlanRow[] = [
  mealRow(
    "ДЕН 1",
    "Хладка вода\nЕлдена закуска със сирене",
    "200 г плод по избор",
    "Риба с печен сладък картоф\nСалата",
    "2 варени яйца + 1 краставица",
    "Пуешко с киноа и зеленчуци\n(приготви 2 порции)\nСалата"
  ),
  mealRow(
    "ДЕН 2",
    "Хладка вода\nБъркани яйца с котидж сирене\nЗеленчуци",
    "200 г плод по избор",
    "Пуешко с киноа и зеленчуци\nСалата",
    "200 г йогурт + 1 ч.л. лешников тахан",
    "Пилешко със зеленчуци\n(приготви две порции)\nСалата"
  ),
  mealRow(
    "ДЕН 3",
    "Хладка вода\nОвесена каша с ябълка и канела",
    "200 г плод по избор",
    "Пилешко със зеленчуци\nСалата",
    "200 г йогурт + 1 ч.л. лешников тахан",
    "Пилешки кюфтета\n(приготви 2 порции)\nСалата"
  ),
  mealRow(
    "ДЕН 4",
    "Хладка вода\nСладък картоф с яйца и авокадо",
    "200 г плод по избор",
    "Пилешки кюфтета\nСалата",
    "200 г йогурт + 1 ч.л. лешников тахан",
    "Гювеч с пиле и зеленчуци\n(приготви 2 порции)\nСалата"
  ),
  mealRow(
    "ДЕН 5",
    "Хладка вода\nЕлдена закуска със сирене",
    "200 г плод по избор",
    "Гювеч с пиле и зеленчуци + 30 гр. киноа (110 kcal)\nСалата",
    "2 яйца + 1 краставица",
    "Риба с лимон и маслини\n(приготви 2 порции)\nСалата"
  ),
  mealRow(
    "ДЕН 6",
    "Хладка вода\nОвесена каша с ябълка и канела",
    "200 г плод по избор",
    "Риба с лимон и маслини\nСалата",
    "200 г йогурт + 1 ч.л. лешников тахан",
    "Пълнени чушки с яйце и котидж сирене\n(приготви 2 порции)\nСалата"
  ),
  mealRow(
    "ДЕН 7",
    "Хладка вода\nБананово-овесена палачинка",
    "200 г плод по избор",
    "Пълнени чушки с яйце и котидж сирене\nСалата",
    "200 г йогурт + 1 ч.л. лешников тахан",
    "Риба с печен сладък картоф\nСалата"
  ),
];

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
  supplements: [
    {
      id: "supp-omega",
      name: "Омега 3",
      url: "https://www.silabg.com/bg/11682-now-omega-3-fish-oil-1000-mg-500-softgels.html",
      intake: "1 капсула дневно със закуската или обяда",
    },
    {
      id: "supp-vitamin-c",
      name: "Витамин Ц",
      url: "https://www.silabg.com/bg/39038-haya-labs-vitamin-c-with-bioflavonoids-and-rose-hips-1000-mg-100-tabs.html",
      intake: "1 капсула дневно със закуската или обяда",
    },
    {
      id: "supp-magnesium",
      name: "Магнезий",
      url: "https://www.silabg.com/bg/26205-BIOTECH-USA-Magnesium-Chelate-60-Caps.html",
      intake: "2 капсули дневно вечер преди сън",
    },
    {
      id: "supp-zinc",
      name: "Цинк",
      url: "https://www.silabg.com/bg/26207-BIOTECH-USA-Zinc-Chelate-60-Tabs.html",
      intake: "1 таблетка с обяда",
    },
    {
      id: "supp-collagen",
      name: "Колаген",
      url: "https://realfood.bg/",
      intake: "Сутрин или следобед. Код RORI",
    },
  ],
  advice: [
    { id: "a7e3f1b2-4c5d-4e6f-8901-23456789abcd", body: "Не пий кафе или чай на празен стомах.", sortOrder: 0 },
    { id: "b8f4e2c3-5d6e-4f7a-9012-34567890bcde", body: "Храни се редовно и не пропускай закуска.", sortOrder: 1 },
    { id: "c9a5f3d4-6e7f-4a8b-0123-45678901cdef", body: "Започвай деня си всяка сутрин с 200 мл. топла/хладка вода.", sortOrder: 2 },
    { id: "d0b6a4e5-7f8a-4b9c-1234-56789012defa", body: "Времето между храненията е около 4 часа.", sortOrder: 3 },
    { id: "e1c7b5f6-8a9b-4c0d-2345-67890123efab", body: "Грамажите на протеините са дадени в готов вид.", sortOrder: 4 },
    { id: "f2d8c6a7-9b0c-4d1e-3456-78901234fabc", body: "Грамажите на въглехидратите са в суров вид. Винаги.", sortOrder: 5 },
    { id: "a3e9d7b8-0c1d-4e2f-4567-89012345abcd", body: "Задължително използвай кухненска везна поне в началото.", sortOrder: 6 },
    { id: "b4f0e8c9-1d2e-4f3a-5678-90123456bcde", body: "Месата приготвяй на фурна, скара, грил тиган или на пара.", sortOrder: 7 },
    { id: "c5a1f9d0-2e3f-4a4b-6789-01234567cdef", body: "Овкусявай салатите с 1 с.л. зехтин, лимон/ябълков оцет и малко сол.", sortOrder: 8 },
  ] as AdviceItem[],
  diningOutItems: [
    {
      id: "dining-out-core",
      title: "Основна препоръка",
      body: "Когато се храниш навън, избирай чист протеин, свежи салати без сосове, задушени или грил зеленчуци, ориз/елда/киноа и искай дресинга отделно.",
      accent: "",
    },
    {
      id: "dining-out-carbs",
      title: "Въглехидрати",
      body:
        "За предпочитане са непреработените храни като плодове, зеленчуци, житни и бобови култури и пълнозърнести продукти.",
      accent: "Плодове, зеленчуци, ориз",
    },
    {
      id: "dining-out-protein",
      title: "Белтъчини",
      body:
        "Белтъчините са градивните единици на тялото и подпомагат поддържането на мускулна маса и ситост.",
      accent: "Месо, риба, яйца, растителни източници",
    },
    {
      id: "dining-out-fat",
      title: "Мазнини",
      body:
        "Тялото има нужда от полезни мазнини за енергия и правилно функциониране на клетките.",
      accent: "Зехтин, ядкови масла, маслини, авокадо, риба и морски дарове",
    },
  ],
  generalInfoItems: [
    {
      id: "general-info-weighing",
      title: "Проследяване на прогреса",
      body: "Използвай кухненска везна и записвай резултатите си редовно, за да следиш реалния напредък.",
      accent: "Постоянството носи точни резултати.",
    },
    {
      id: "general-info-consistency",
      title: "Последователност",
      body: "Спазвай режима ежедневно и адаптирай порциите според целите, активността и обратната връзка от тялото.",
      accent: "Фокусът е върху дългосрочни устойчиви навици.",
    },
  ],
  macros: [
    {
      id: "macro-carbs",
      title: "Въглехидрати",
      description:
        "За предпочитане са непреработените храни като плодове, зеленчуци, житни и бобови култури и пълнозърнести продукти.",
      sources: "Плодове, зеленчуци, ориз",
    },
    {
      id: "macro-protein",
      title: "Белтъчини",
      description:
        "Белтъчините са градивните единици на тялото и подпомагат поддържането на мускулна маса и ситост.",
      sources: "Месо, риба, яйца, растителни източници",
    },
    {
      id: "macro-fat",
      title: "Мазнини",
      description:
        "Тялото има нужда от полезни мазнини за енергия и правилно функциониране на клетките.",
      sources: "Зехтин, ядкови масла, маслини, авокадо, риба и морски дарове",
    },
  ],
  dailyTargets: {
    calories: "1600",
    deviation: "3",
    carbsPercent: "40",
    carbsCalories: "640",
    carbsGrams: "160",
    proteinPercent: "30",
    proteinCalories: "480",
    proteinGrams: "120",
    fatPercent: "30",
    fatCalories: "480",
    fatGrams: "53",
    water: "Минимум 2 л. вода + 500 мл. по време на тренировка.",
  },
  mealPlanMonths: [{ ...month("month-1", "МЕСЕЦ 1"), rows: monthOneRows }, month("month-2", "МЕСЕЦ 2"), month("month-3", "МЕСЕЦ 3")],
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

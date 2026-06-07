import {
  BookOpenText,
  CalendarDays,
  ChefHat,
  Dumbbell,
  ListChecks,
  Pencil,
  Phone,
  ShoppingBasket,
} from "lucide-react";
import { Suspense, lazy, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { MonthSelect } from "./components/MonthSelect";
import { useAppState } from "./store/useAppState";

type PageId = "food" | "regime" | "shopping" | "recipes" | "training" | "contacts";

const pages: { id: PageId; label: string; shortLabel: string; icon: ReactNode }[] = [
  { id: "food", label: "План", shortLabel: "План", icon: <BookOpenText size={18} /> },
  { id: "regime", label: "Хранителен режим", shortLabel: "Режим", icon: <CalendarDays size={18} /> },
  { id: "shopping", label: "Списък пазаруване", shortLabel: "Пазар", icon: <ShoppingBasket size={18} /> },
  { id: "recipes", label: "Библиотека", shortLabel: "Рецепти", icon: <ChefHat size={18} /> },
  { id: "training", label: "Тренировъчен план", shortLabel: "Тренировки", icon: <Dumbbell size={18} /> },
  { id: "contacts", label: "Контакти", shortLabel: "Контакти", icon: <Phone size={18} /> },
];

const pageLoaders: Record<PageId, () => Promise<unknown>> = {
  food: () => import("./pages/FoodPage"),
  regime: () => import("./pages/RegimePage"),
  shopping: () => import("./pages/ShoppingPage"),
  recipes: () => import("./pages/RecipesPage"),
  training: () => import("./pages/TrainingPage"),
  contacts: () => import("./pages/ContactsPage"),
};

const fallbackPage: PageId = "food";
const fallbackMonthId = "month-1";

function getStoredValue(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setStoredValue(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage write failures.
  }
}

function isPageId(value: string | null): value is PageId {
  return value !== null && Object.prototype.hasOwnProperty.call(pageLoaders, value);
}

function getInitialActivePage(): PageId {
  const saved = getStoredValue("active-page");
  return isPageId(saved) ? saved : fallbackPage;
}

function getInitialActiveMonthId() {
  return getStoredValue("active-month") || fallbackMonthId;
}

function getSafeMonthId(activeMonthId: string, monthIds: string[]) {
  if (monthIds.includes(activeMonthId)) {
    return activeMonthId;
  }

  return monthIds[0] || fallbackMonthId;
}

function preloadInitialPageChunk() {
  if (typeof window === "undefined") {
    return;
  }

  const initialPage = getInitialActivePage();
  void pageLoaders[initialPage]();
}

preloadInitialPageChunk();

const FoodPage = lazy(() => pageLoaders.food().then((module) => ({ default: (module as { FoodPage: typeof import("./pages/FoodPage").FoodPage }).FoodPage })));
const RegimePage = lazy(() =>
  pageLoaders.regime().then((module) => ({ default: (module as { RegimePage: typeof import("./pages/RegimePage").RegimePage }).RegimePage })),
);
const ShoppingPage = lazy(() =>
  pageLoaders.shopping().then((module) => ({ default: (module as { ShoppingPage: typeof import("./pages/ShoppingPage").ShoppingPage }).ShoppingPage })),
);
const RecipesPage = lazy(() =>
  pageLoaders.recipes().then((module) => ({ default: (module as { RecipesPage: typeof import("./pages/RecipesPage").RecipesPage }).RecipesPage })),
);
const TrainingPage = lazy(() =>
  pageLoaders.training().then((module) => ({ default: (module as { TrainingPage: typeof import("./pages/TrainingPage").TrainingPage }).TrainingPage })),
);
const ContactsPage = lazy(() =>
  pageLoaders.contacts().then((module) => ({ default: (module as { ContactsPage: typeof import("./pages/ContactsPage").ContactsPage }).ContactsPage })),
);

export function App() {
  const [activePage, setActivePage] = useState<PageId>(() => {
    return getInitialActivePage();
  });
  const [activeMonthId, setActiveMonthId] = useState(() => {
    return getInitialActiveMonthId();
  });
  const [isEditingFood, setIsEditingFood] = useState(false);
  const [isEditingRegime, setIsEditingRegime] = useState(false);
  const [isEditingShopping, setIsEditingShopping] = useState(false);
  const [isEditingRecipes, setIsEditingRecipes] = useState(false);
  const [isEditingTraining, setIsEditingTraining] = useState(false);
  const [isEditingContacts, setIsEditingContacts] = useState(false);

  const actions = useAppState();
  const { state } = actions;
  const monthIds = state.mealPlanMonths.map((month) => month.id);
  const safeActiveMonthId = getSafeMonthId(activeMonthId, monthIds);

  useEffect(() => {
    setStoredValue("active-page", activePage);
  }, [activePage]);

  useEffect(() => {
    if (safeActiveMonthId !== activeMonthId) {
      setActiveMonthId(safeActiveMonthId);
      return;
    }

    setStoredValue("active-month", safeActiveMonthId);
  }, [activeMonthId, safeActiveMonthId]);

  const pageTitle = pages.find((p) => p.id === activePage)?.label ?? "ShapeForge";

  return (
    <div className={`app-shell page-${activePage}`}>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <ListChecks size={10} />
          </span>
          <span>Моят режим RORI TEAM</span>
        </div>
        <nav className="nav-list" aria-label="Основна навигация">
          {pages.map((page) => (
            <button
              key={page.id}
              className={page.id === activePage ? "active" : ""}
              onClick={() => setActivePage(page.id)}
              type="button"
            >
              {page.icon}
              <span>{page.shortLabel}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <h1>{pageTitle}</h1>
          </div>
          {activePage === "food" && (
            <button
              type="button"
              className="icon-button icon-button-sm"
              onClick={() => setIsEditingFood((v) => !v)}
              aria-label="Редактирай хранителен план"
            >
              <Pencil size={14} />
            </button>
          )}
          {activePage === "regime" && (
            <div className="topbar-actions">
              <button
                type="button"
                className="icon-button icon-button-sm"
                onClick={() => setIsEditingRegime((v) => !v)}
                aria-label="Редактирай режим"
              >
                <Pencil size={14} />
              </button>
              <MonthSelect
                activeMonthId={safeActiveMonthId}
                months={state.mealPlanMonths}
                onChange={setActiveMonthId}
              />
            </div>
          )}
          {activePage === "shopping" && (
            <div className="topbar-actions">
              <button
                type="button"
                className="icon-button icon-button-sm"
                onClick={() => setIsEditingShopping((v) => !v)}
                aria-label="Редактирай списък за пазаруване"
              >
                <Pencil size={14} />
              </button>
              <MonthSelect
                activeMonthId={safeActiveMonthId}
                months={state.mealPlanMonths}
                onChange={setActiveMonthId}
              />
            </div>
          )}
          {activePage === "recipes" && (
            <button
              type="button"
              className="icon-button icon-button-sm"
              onClick={() => setIsEditingRecipes((v) => !v)}
              aria-label="Редактирай рецепти"
            >
              <Pencil size={14} />
            </button>
          )}
          {activePage === "training" && (
            <button
              type="button"
              className="icon-button icon-button-sm"
              onClick={() => setIsEditingTraining((v) => !v)}
              aria-label="Редактирай тренировки"
            >
              <Pencil size={14} />
            </button>
          )}
          {activePage === "contacts" && (
            <button
              type="button"
              className="icon-button icon-button-sm"
              onClick={() => setIsEditingContacts((v) => !v)}
              aria-label="Редактирай контакти"
            >
              <Pencil size={14} />
            </button>
          )}
        </header>

        <Suspense fallback={<div className="panel muted">Зареждане...</div>}>
          {activePage === "food" && (
            <FoodPage
              startDate={state.startDate}
              dailyTargets={state.dailyTargets}
              supplements={state.supplements}
              advice={state.advice}
              diningOut={state.diningOut}
              macros={state.macros}
              bodyMeasurements={state.bodyMeasurements}
              isEditing={isEditingFood}
              updateStartDate={actions.updateStartDate}
              updateDailyTargets={actions.updateDailyTargets}
              updateSupplement={actions.updateSupplement}
              addSupplement={actions.addSupplement}
              removeSupplement={actions.removeSupplement}
              updateAdvice={actions.updateAdvice}
              addAdvice={actions.addAdvice}
              removeAdvice={actions.removeAdvice}
              addBodyMeasurement={actions.addBodyMeasurement}
              updateBodyMeasurement={actions.updateBodyMeasurement}
              removeBodyMeasurement={actions.removeBodyMeasurement}
              updateDiningOut={actions.updateDiningOut}
            />
          )}

          {activePage === "regime" && (
            <RegimePage
              mealPlanMonths={state.mealPlanMonths}
              activeMonthId={safeActiveMonthId}
              onMonthChange={setActiveMonthId}
              updateMeal={actions.updateMeal}
              isEditing={isEditingRegime}
              startDate={state.startDate}
            />
          )}

          {activePage === "shopping" && (
            <ShoppingPage
              mealPlanMonths={state.mealPlanMonths}
              shoppingLists={state.shoppingLists}
              activeMonthId={safeActiveMonthId}
              onMonthChange={setActiveMonthId}
              isEditing={isEditingShopping}
              addShoppingItem={actions.addShoppingItem}
              updateShoppingItem={actions.updateShoppingItem}
              removeShoppingItem={actions.removeShoppingItem}
            />
          )}

          {activePage === "recipes" && (
            <RecipesPage
              recipes={state.recipes}
              isEditing={isEditingRecipes}
              addRecipe={actions.addRecipe}
              removeRecipe={actions.removeRecipe}
              updateRecipe={actions.updateRecipe}
              addIngredient={actions.addIngredient}
              updateIngredient={actions.updateIngredient}
              removeIngredient={actions.removeIngredient}
            />
          )}

          {activePage === "training" && (
            <TrainingPage
              trainingGoal={state.trainingGoal}
              trainingMeta={state.trainingMeta}
              weeklyTraining={state.weeklyTraining}
              workouts={state.workouts}
              absExercises={state.absExercises}
              stretchingExercises={state.stretchingExercises}
              startDate={state.startDate}
              isEditing={isEditingTraining}
              updateTrainingGoalInfo={actions.updateTrainingGoalInfo}
              updateTrainingMeta={actions.updateTrainingMeta}
              updateWeeklyFocus={actions.updateWeeklyFocus}
              updateWorkoutExercise={actions.updateWorkoutExercise}
              addWorkoutExercise={actions.addWorkoutExercise}
              removeWorkoutExercise={actions.removeWorkoutExercise}
              updateAbsExercise={actions.updateAbsExercise}
              addAbsExercise={actions.addAbsExercise}
              removeAbsExercise={actions.removeAbsExercise}
              updateStretchingExercise={actions.updateStretchingExercise}
              addStretchingExercise={actions.addStretchingExercise}
              removeStretchingExercise={actions.removeStretchingExercise}
            />
          )}

          {activePage === "contacts" && (
            <ContactsPage
              contacts={state.contacts}
              isEditing={isEditingContacts}
              updateContacts={actions.updateContacts}
            />
          )}
        </Suspense>
      </main>
    </div>
  );
}

import {
  BookOpenText,
  CalendarDays,
  ChefHat,
  Dumbbell,
  ListChecks,
  LogOut,
  Pencil,
  Phone,
  ShoppingBasket,
} from "lucide-react";
import { Suspense, lazy } from "react";
import type { ReactNode } from "react";
import { MonthSelect } from "../components/MonthSelect";
import type { useAppState } from "../store/useAppState";

export type PageId = "food" | "regime" | "shopping" | "recipes" | "training" | "contacts";

const pages: { id: PageId; label: string; shortLabel: string; icon: ReactNode }[] = [
  { id: "food", label: "План", shortLabel: "План", icon: <BookOpenText size={18} /> },
  { id: "regime", label: "Хранителен режим", shortLabel: "Режим", icon: <CalendarDays size={18} /> },
  { id: "shopping", label: "Списък пазаруване", shortLabel: "Пазар", icon: <ShoppingBasket size={18} /> },
  { id: "recipes", label: "Библиотека", shortLabel: "Рецепти", icon: <ChefHat size={18} /> },
  { id: "training", label: "Тренировъчен план", shortLabel: "Тренировки", icon: <Dumbbell size={18} /> },
  { id: "contacts", label: "Контакти", shortLabel: "Контакти", icon: <Phone size={18} /> },
];

export const pageLoaders: Record<PageId, () => Promise<unknown>> = {
  food: () => import("../pages/FoodPage"),
  regime: () => import("../pages/RegimePage"),
  shopping: () => import("../pages/ShoppingPage"),
  recipes: () => import("../pages/RecipesPage"),
  training: () => import("../pages/TrainingPage"),
  contacts: () => import("../pages/ContactsPage"),
};

const FoodPage = lazy(() =>
  pageLoaders.food().then((module) => ({ default: (module as { FoodPage: typeof import("../pages/FoodPage").FoodPage }).FoodPage })),
);
const RegimePage = lazy(() =>
  pageLoaders.regime().then((module) => ({ default: (module as { RegimePage: typeof import("../pages/RegimePage").RegimePage }).RegimePage })),
);
const ShoppingPage = lazy(() =>
  pageLoaders.shopping().then((module) => ({ default: (module as { ShoppingPage: typeof import("../pages/ShoppingPage").ShoppingPage }).ShoppingPage })),
);
const RecipesPage = lazy(() =>
  pageLoaders.recipes().then((module) => ({ default: (module as { RecipesPage: typeof import("../pages/RecipesPage").RecipesPage }).RecipesPage })),
);
const TrainingPage = lazy(() =>
  pageLoaders.training().then((module) => ({ default: (module as { TrainingPage: typeof import("../pages/TrainingPage").TrainingPage }).TrainingPage })),
);
const ContactsPage = lazy(() =>
  pageLoaders.contacts().then((module) => ({ default: (module as { ContactsPage: typeof import("../pages/ContactsPage").ContactsPage }).ContactsPage })),
);

type AppActions = ReturnType<typeof useAppState>;

interface AppShellProps {
  activePage: PageId;
  setActivePage: (page: PageId) => void;
  safeActiveMonthId: string;
  setActiveMonthId: (monthId: string) => void;
  isEditingFood: boolean;
  isEditingRegime: boolean;
  isEditingShopping: boolean;
  isEditingRecipes: boolean;
  isEditingTraining: boolean;
  isEditingContacts: boolean;
  toggleEditingFood: () => void;
  toggleEditingRegime: () => void;
  toggleEditingShopping: () => void;
  toggleEditingRecipes: () => void;
  toggleEditingTraining: () => void;
  toggleEditingContacts: () => void;
  onLogout: () => void;
  syncError: string | null;
  state: AppActions["state"];
  actions: AppActions;
}

export function AppShell({
  activePage,
  setActivePage,
  safeActiveMonthId,
  setActiveMonthId,
  isEditingFood,
  isEditingRegime,
  isEditingShopping,
  isEditingRecipes,
  isEditingTraining,
  isEditingContacts,
  toggleEditingFood,
  toggleEditingRegime,
  toggleEditingShopping,
  toggleEditingRecipes,
  toggleEditingTraining,
  toggleEditingContacts,
  onLogout,
  syncError,
  state,
  actions,
}: AppShellProps) {
  const pageTitle = pages.find((p) => p.id === activePage)?.label ?? "ShapeForge";

  return (
    <div className={`app-shell page-${activePage}`}>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <ListChecks size={10} />
          </span>
          <span>Моят режим RORI TEAM</span>
          <button
            type="button"
            className="icon-button icon-button-sm brand-logout"
            onClick={onLogout}
            aria-label="Изход"
            title="Изход"
          >
            <LogOut size={14} />
          </button>
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
        {syncError ? <p className="auth-error inline-error">{syncError}</p> : null}
        <header className="topbar">
          <div>
            <h1>{pageTitle}</h1>
          </div>
          {activePage === "food" && (
            <button
              type="button"
              className="icon-button icon-button-sm"
              onClick={toggleEditingFood}
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
                onClick={toggleEditingRegime}
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
                onClick={toggleEditingShopping}
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
              onClick={toggleEditingRecipes}
              aria-label="Редактирай рецепти"
            >
              <Pencil size={14} />
            </button>
          )}
          {activePage === "training" && (
            <button
              type="button"
              className="icon-button icon-button-sm"
              onClick={toggleEditingTraining}
              aria-label="Редактирай тренировки"
            >
              <Pencil size={14} />
            </button>
          )}
          {activePage === "contacts" && (
            <button
              type="button"
              className="icon-button icon-button-sm"
              onClick={toggleEditingContacts}
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
              diningOutItems={state.diningOutItems}
              generalInfoItems={state.generalInfoItems}
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
              updateDiningOutItem={actions.updateDiningOutItem}
              addDiningOutItem={actions.addDiningOutItem}
              removeDiningOutItem={actions.removeDiningOutItem}
              updateGeneralInfoItem={actions.updateGeneralInfoItem}
              addGeneralInfoItem={actions.addGeneralInfoItem}
              removeGeneralInfoItem={actions.removeGeneralInfoItem}
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

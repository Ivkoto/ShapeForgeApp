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
import { Suspense, lazy, useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { MonthSelect } from "./components/MonthSelect";
import { supabase, supabaseConfigError } from "./lib/supabase";
import { normalizeAppState, useAppState } from "./store/useAppState";

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

type AuthMode = "signin" | "signup";

type AppStateRow = {
  data: unknown;
  updated_at: string;
};

function formatSupabaseError(context: string, message: string) {
  return `${context}: ${message}`;
}

function getAuthHashError() {
  if (typeof window === "undefined" || !window.location.hash) {
    return null;
  }

  const params = new URLSearchParams(window.location.hash.slice(1));
  const description = params.get("error_description");
  const code = params.get("error_code");

  if (!description && !code) {
    return null;
  }

  window.history.replaceState(null, "", window.location.pathname + window.location.search);

  if (code === "otp_expired") {
    return "Линкът за потвърждение е изтекъл или вече е използван. Влез с имейл и парола, или направи нова регистрация.";
  }

  return description ? description.replace(/\+/g, " ") : "Authentication link failed.";
}

function FullscreenStatus({ title, message }: { title: string; message?: string }) {
  return (
    <div className="auth-shell">
      <section className="panel auth-panel">
        <h1 className="auth-title">{title}</h1>
        {message ? <p className="muted auth-message">{message}</p> : null}
      </section>
    </div>
  );
}

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  const [appLoading, setAppLoading] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

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
  const { state, replaceState } = actions;
  const monthIds = state.mealPlanMonths.map((month) => month.id);
  const safeActiveMonthId = getSafeMonthId(activeMonthId, monthIds);

  const latestStateRef = useRef(state);
  const skipNextSaveRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  const lastLocalEditAtRef = useRef(0);
  const pendingRemoteStateRef = useRef<unknown | null>(null);

  useEffect(() => {
    latestStateRef.current = state;
  }, [state]);

  function applyRemoteState(nextState: unknown) {
    pendingRemoteStateRef.current = null;
    skipNextSaveRef.current = true;
    replaceState(normalizeAppState(nextState));
  }

  useEffect(() => {
    const client = supabase;
    if (!client) {
      setAuthLoading(false);
      setAppLoading(false);
      return;
    }

    let isMounted = true;

    const initSession = async () => {
      const hashError = getAuthHashError();
      if (hashError) {
        setAuthError(hashError);
      }

      const { data, error } = await client.auth.getSession();
      if (!isMounted) {
        return;
      }

      if (error) {
        setAuthError(formatSupabaseError("Authentication failed", error.message));
      }

      setSession(data.session ?? null);
      setAuthLoading(false);
    };

    void initSession();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, nextSession) => {
      if (!isMounted) {
        return;
      }

      setSession(nextSession);
      setSyncError(null);
      if (event !== "INITIAL_SESSION") {
        setAuthError(null);
      }
      setAuthMessage(null);
      setAppLoading(true);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

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

  useEffect(() => {
    const client = supabase;
    if (!client || authLoading) {
      return;
    }

    if (!session) {
      setAppLoading(false);
      return;
    }

    let cancelled = false;

    const loadOrCreateState = async () => {
      setAppLoading(true);
      setSyncError(null);

      const userId = session.user.id;
      const { data, error } = await client
        .from("app_state")
        .select("data, updated_at")
        .eq("user_id", userId)
        .maybeSingle<AppStateRow>();

      if (cancelled) {
        return;
      }

      if (error) {
        setSyncError(formatSupabaseError("Could not load synced state", error.message));
        setAppLoading(false);
        return;
      }

      if (data?.data) {
        applyRemoteState(data.data);
        setAppLoading(false);
        return;
      }

      const createdAt = new Date().toISOString();
      const { error: insertError } = await client
        .from("app_state")
        .upsert({
          user_id: userId,
          data: latestStateRef.current,
          updated_at: createdAt,
        });

      if (cancelled) {
        return;
      }

      if (insertError) {
        setSyncError(formatSupabaseError("Could not create synced state", insertError.message));
      }

      setAppLoading(false);
    };

    void loadOrCreateState();

    return () => {
      cancelled = true;
    };
  }, [authLoading, session?.user.id]);

  useEffect(() => {
    const client = supabase;
    if (!client || !session || authLoading || appLoading) {
      return;
    }

    const userId = session.user.id;
    const channel = client
      .channel(`app-state-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "app_state",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as AppStateRow | undefined;
          if (!row || typeof row.data === "undefined") {
            return;
          }

          const editedRecently = Date.now() - lastLocalEditAtRef.current < 1500;
          if (editedRecently) {
            pendingRemoteStateRef.current = row.data;
            return;
          }

          applyRemoteState(row.data);
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [authLoading, appLoading, session?.user.id]);

  useEffect(() => {
    if (!pendingRemoteStateRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (!pendingRemoteStateRef.current) {
        return;
      }

      const editedRecently = Date.now() - lastLocalEditAtRef.current < 1500;
      if (editedRecently) {
        return;
      }

      applyRemoteState(pendingRemoteStateRef.current);
    }, 1800);

    return () => {
      window.clearTimeout(timer);
    };
  }, [state]);

  useEffect(() => {
    const client = supabase;
    if (!client || !session || authLoading || appLoading) {
      return;
    }

    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    lastLocalEditAtRef.current = Date.now();

    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(async () => {
      const updatedAt = new Date().toISOString();
      const { error } = await client
        .from("app_state")
        .upsert({
          user_id: session.user.id,
          data: latestStateRef.current,
          updated_at: updatedAt,
        });

      if (error) {
        setSyncError(formatSupabaseError("Could not save synced state", error.message));
      }
    }, 700);

    return () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [state, authLoading, appLoading, session?.user.id]);

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const client = supabase;
    if (!client) {
      return;
    }

    setAuthBusy(true);
    setAuthError(null);
    setAuthMessage(null);

    if (authMode === "signin") {
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) {
        setAuthError(formatSupabaseError("Sign in failed", error.message));
      }
      setAuthBusy(false);
      return;
    }

    const { data, error } = await client.auth.signUp({ email, password });
    if (error) {
      setAuthError(formatSupabaseError("Sign up failed", error.message));
      setAuthBusy(false);
      return;
    }

    if (!data.session) {
      setAuthMessage("Account created. Confirm the email if required, then sign in.");
    }

    setAuthBusy(false);
  }

  async function handleLogout() {
    const client = supabase;
    if (!client) {
      return;
    }

    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    const { error } = await client.auth.signOut();
    if (error) {
      setSyncError(formatSupabaseError("Sign out failed", error.message));
    }
  }

  if (supabaseConfigError) {
    return (
      <FullscreenStatus
        title="Supabase configuration is missing"
        message={supabaseConfigError}
      />
    );
  }

  if (authLoading || (session && appLoading)) {
    return <FullscreenStatus title="Зареждане..." message="Подготвяме синхронизацията на данните." />;
  }

  if (!session) {
    return (
      <div className="auth-shell">
        <section className="panel auth-panel">
          <h1 className="auth-title">ShapeForge</h1>
          <p className="muted auth-message">Вход за синхронизиране на данните между устройства.</p>

          <form className="auth-form" onSubmit={handleAuthSubmit}>
            <label className="field" htmlFor="auth-email">
              Имейл
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label className="field" htmlFor="auth-password">
              Парола
              <input
                id="auth-password"
                type="password"
                autoComplete={authMode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
              />
            </label>

            <button type="submit" className="secondary-button auth-submit" disabled={authBusy}>
              {authBusy ? "Моля изчакайте..." : authMode === "signin" ? "Вход" : "Регистрация"}
            </button>
          </form>

          <div className="auth-switch-row">
            <button
              type="button"
              className="ghost-button"
              onClick={() => {
                setAuthMode((mode) => (mode === "signin" ? "signup" : "signin"));
                setAuthError(null);
                setAuthMessage(null);
              }}
            >
              {authMode === "signin"
                ? "Нямаш акаунт? Регистрирай се"
                : "Имаш акаунт? Влез"}
            </button>
          </div>

          {authError ? <p className="auth-error">{authError}</p> : null}
          {authMessage ? <p className="muted auth-message">{authMessage}</p> : null}
        </section>
      </div>
    );
  }

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
        <button
          type="button"
          className="ghost-button sidebar-logout"
          onClick={handleLogout}
          aria-label="Изход"
        >
          <LogOut size={14} />
          Изход
        </button>
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

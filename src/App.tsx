import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { AppShell, pageLoaders } from "./app/AppShell";
import type { PageId } from "./app/AppShell";
import { supabase, supabaseConfigError } from "./clients/supabase";
import {
  fetchPlanData,
  savePlanStartDate,
  saveDailyTargets,
  saveSupplement,
  addSupplementToDb,
  deleteSupplementFromDb,
  fetchBodyMeasurements,
  saveBodyMeasurement,
  deleteBodyMeasurementFromDb,
  fetchAdviceItems,
  saveAdviceItem,
  deleteAdviceItem,
  syncAdviceSortOrders,
  fetchPlanInfoCards,
  savePlanInfoCard,
  deletePlanInfoCardFromDb,
  syncInfoCardSortOrders,
} from "./services/planService";
import { fetchRegimeData, findDayId, upsertMealEntry } from "./services/foodService";
import {
  fetchShoppingData,
  addShoppingItemToDb,
  updateShoppingItemInDb,
  deleteShoppingItemFromDb,
} from "./services/shoppingService";
import {
  fetchRecipesData,
  addRecipeToDb,
  updateRecipeInDb,
  deleteRecipeFromDb,
  addIngredientToDb,
  updateIngredientInDb,
  deleteIngredientFromDb,
} from "./services/recipesService";
import { fetchContacts, saveContacts } from "./services/contactsService";
import { useAppState } from "./store/useAppState";
import type { AdviceItem, AppState, BodyMeasurement, Contacts, DailyTargets, InfoCardItem, MealSlot, Recipe, RecipeGroup, ShoppingCategory, ShoppingItem, Supplement, Weekday } from "./types";

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

function getFullMonthsSince(startDate: Date, currentDate: Date) {
  let months =
    (currentDate.getFullYear() - startDate.getFullYear()) * 12 +
    currentDate.getMonth() -
    startDate.getMonth();

  if (currentDate.getDate() < startDate.getDate()) {
    months -= 1;
  }

  return Math.max(months, 0);
}

function preloadInitialPageChunk() {
  if (typeof window === "undefined") {
    return;
  }

  const initialPage = getInitialActivePage();
  void pageLoaders[initialPage]();
}

preloadInitialPageChunk();

type AuthMode = "signin" | "signup";

function formatSupabaseError(context: string, message: string) {
  return `${context}: ${message}`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
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
  const { state, mergeState } = actions;
  const monthIds = state.mealPlanMonths.map((month) => month.id);
  const safeActiveMonthId = getSafeMonthId(activeMonthId, monthIds);

  useEffect(() => {
    const client = supabase;
    if (!client) {
      setAuthLoading(false);
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

  // ── Auto-select month from startDate on initial load ───────────────────────

  const hasAutoSelectedMonth = useRef(false);

  useEffect(() => {
    // Only auto-select once after initial DB load
    if (hasAutoSelectedMonth.current) return;
    if (!state.startDate || state.mealPlanMonths.length === 0) return;

    hasAutoSelectedMonth.current = true;

    const start = new Date(state.startDate);
    const today = new Date();
    start.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffMs = today.getTime() - start.getTime();

    if (diffMs < 0) {
      // Before start date → select first month
      setActiveMonthId(state.mealPlanMonths[0].id);
      return;
    }

    const monthIndex = Math.min(
      getFullMonthsSince(start, today),
      state.mealPlanMonths.length - 1,
    );

    setActiveMonthId(state.mealPlanMonths[monthIndex].id);
  }, [state.startDate, state.mealPlanMonths]);

  // ── Load Plan data from normalized tables ──────────────────────────────────

  useEffect(() => {
    if (authLoading || !session) {
      return;
    }

    let cancelled = false;

    const loadPlanData = async () => {
      try {
        const planData = await fetchPlanData(session.user.id);
        if (cancelled) return;

        const hasData =
          planData.planStartDate !== null ||
          planData.dailyTargets !== null ||
          planData.supplements !== null;

        if (!hasData) return;

        setSyncError(null);
        mergeState({
          ...(planData.planStartDate !== null && { startDate: planData.planStartDate }),
          ...(planData.dailyTargets !== null && { dailyTargets: planData.dailyTargets }),
          ...(planData.supplements !== null && { supplements: planData.supplements }),
        });
      } catch (error) {
        if (!cancelled) {
          setSyncError(formatSupabaseError("Could not load Plan data", getErrorMessage(error)));
        }
      }
    };

    void loadPlanData();

    return () => {
      cancelled = true;
    };
  }, [authLoading, session?.user.id]);

  // ── Load body measurements ─────────────────────────────────────────────────

  useEffect(() => {
    if (authLoading || !session) {
      return;
    }

    let cancelled = false;

    const loadMeasurements = async () => {
      try {
        const measurements = await fetchBodyMeasurements(session.user.id);
        if (cancelled) return;

        if (measurements === null) return;

        mergeState({
          bodyMeasurements: measurements,
        });
      } catch (error) {
        if (!cancelled) {
          setSyncError(formatSupabaseError("Could not load measurements", getErrorMessage(error)));
        }
      }
    };

    void loadMeasurements();

    return () => {
      cancelled = true;
    };
  }, [authLoading, session?.user.id]);

  // ── Load advice ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (authLoading || !session) {
      return;
    }

    let cancelled = false;

    const loadAdvice = async () => {
      try {
        const advice = await fetchAdviceItems(session.user.id);
        if (cancelled) return;

        if (advice === null) return; // error → fall back

        
        mergeState({
          advice,
        });
      } catch (error) {
        if (!cancelled) {
          setSyncError(formatSupabaseError("Could not load advice", getErrorMessage(error)));
        }
      }
    };

    void loadAdvice();

    return () => {
      cancelled = true;
    };
  }, [authLoading, session?.user.id]);

  // ── Load plan info cards (eating_out, macros & general_info) ────────────

  useEffect(() => {
    if (authLoading || !session) {
      return;
    }

    let cancelled = false;

    const loadCards = async () => {
      try {
        const [eatingOut, macrosCards, generalInfo] = await Promise.all([
          fetchPlanInfoCards(session.user.id, "eating_out"),
          fetchPlanInfoCards(session.user.id, "macros"),
          fetchPlanInfoCards(session.user.id, "general_info"),
        ]);
        if (cancelled) return;

        const patch: Partial<AppState> = {};

        if (eatingOut !== null) {
          patch.diningOutItems = eatingOut;
        }
        if (macrosCards !== null) {
          patch.macrosCards = macrosCards;
        }
        if (generalInfo !== null) {
          patch.generalInfoItems = generalInfo;
        }

        if (Object.keys(patch).length === 0) return;

        
        mergeState(patch);
      } catch (error) {
        if (!cancelled) {
          setSyncError(formatSupabaseError("Could not load Plan info cards", getErrorMessage(error)));
        }
      }
    };

    void loadCards();

    return () => {
      cancelled = true;
    };
  }, [authLoading, session?.user.id]);

  // ── Load regime data (months, days, entries) ───────────────────────────────

  useEffect(() => {
    if (authLoading || !session) {
      return;
    }

    let cancelled = false;

    const loadRegime = async () => {
      try {
        const regimeData = await fetchRegimeData(session.user.id);
        if (cancelled) return;

        mergeState({
          mealPlanMonths: regimeData.mealPlanMonths,
        });
      } catch (error) {
        if (!cancelled) {
          setSyncError(formatSupabaseError("Could not load regime data", getErrorMessage(error)));
        }
      }
    };

    void loadRegime();

    return () => {
      cancelled = true;
    };
  }, [authLoading, session?.user.id]);

  // ── Load shopping data (categories, items) ─────────────────────────────────

  useEffect(() => {
    if (authLoading || !session) {
      return;
    }

    let cancelled = false;

    const loadShopping = async () => {
      try {
        const shoppingData = await fetchShoppingData(session.user.id);
        if (cancelled) return;

        mergeState({
          shoppingCategories: shoppingData.categories,
          shoppingLists: shoppingData.shoppingLists,
        });
      } catch (error) {
        if (!cancelled) {
          setSyncError(formatSupabaseError("Could not load shopping data", getErrorMessage(error)));
        }
      }
    };

    void loadShopping();

    return () => {
      cancelled = true;
    };
  }, [authLoading, session?.user.id]);

  // ── Load recipes data ──────────────────────────────────────────────────────

  const recipeGroupMapRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (authLoading || !session) {
      return;
    }

    let cancelled = false;

    const loadRecipes = async () => {
      try {
        const data = await fetchRecipesData(session.user.id);
        if (cancelled) return;

        recipeGroupMapRef.current = data.groupNameToId;

        mergeState({
          recipes: data.recipes,
        });
      } catch (error) {
        if (!cancelled) {
          setSyncError(formatSupabaseError("Could not load recipes", getErrorMessage(error)));
        }
      }
    };

    void loadRecipes();

    return () => {
      cancelled = true;
    };
  }, [authLoading, session?.user.id]);

  // ── Load contacts ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (authLoading || !session) {
      return;
    }

    let cancelled = false;

    const loadContacts = async () => {
      try {
        const data = await fetchContacts(session.user.id);
        if (cancelled) return;

        if (data !== null) {
          mergeState({ contacts: data });
        }
      } catch (error) {
        if (!cancelled) {
          setSyncError(formatSupabaseError("Could not load contacts", getErrorMessage(error)));
        }
      }
    };

    void loadContacts();

    return () => {
      cancelled = true;
    };
  }, [authLoading, session?.user.id]);


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

  if (authLoading) {
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

  // ── Food action wrappers (local + Supabase normalized tables) ────────────

  const foodActions = {
    ...actions,
    updateStartDate: (date: string) => {
      actions.updateStartDate(date);
      if (session) {
        savePlanStartDate(session.user.id, date).catch(() => {});
      }
    },
    updateDailyTargets: (patch: Partial<DailyTargets>) => {
      actions.updateDailyTargets(patch);
      if (session) {
        const merged = { ...state.dailyTargets, ...patch };
        saveDailyTargets(session.user.id, merged).catch(() => {});
      }
    },
    updateSupplement: (id: string, patch: Partial<Supplement>) => {
      actions.updateSupplement(id, patch);
      if (session) {
        const existing = state.supplements.find((s) => s.id === id);
        if (existing) {
          saveSupplement({ ...existing, ...patch }).catch(() => {});
        }
      }
    },
    addSupplement: () => {
      const newId = crypto.randomUUID();
      actions.addSupplement(newId);
      if (session) {
        addSupplementToDb(session.user.id, {
          id: newId,
          name: "",
          url: "",
          intake: "",
        }).catch(() => {});
      }
    },
    removeSupplement: (id: string) => {
      actions.removeSupplement(id);
      if (session) {
        deleteSupplementFromDb(id).catch(() => {});
      }
    },
    addBodyMeasurement: () => {
      const newId = crypto.randomUUID();
      const lastMeasurement = state.bodyMeasurements[0];
      const measurement: BodyMeasurement = {
        id: newId,
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
      actions.addBodyMeasurement(newId);
      if (session) {
        saveBodyMeasurement(session.user.id, measurement).catch(() => {});
      }
    },
    updateBodyMeasurement: (id: string, patch: Partial<BodyMeasurement>) => {
      actions.updateBodyMeasurement(id, patch);
      if (session) {
        const existing = state.bodyMeasurements.find((m) => m.id === id);
        if (existing) {
          saveBodyMeasurement(session.user.id, { ...existing, ...patch }).catch(() => {});
        }
      }
    },
    removeBodyMeasurement: (id: string) => {
      actions.removeBodyMeasurement(id);
      if (session) {
        deleteBodyMeasurementFromDb(id).catch(() => {});
      }
    },
    // ── Advice (per-row CRUD) ────────────────────────────────────────────
    updateAdviceItem: (id: string, patch: Partial<AdviceItem>) => {
      actions.updateAdviceItem(id, patch);
      if (session) {
        const existing = state.advice.find((item) => item.id === id);
        if (existing) {
          saveAdviceItem(session.user.id, { ...existing, ...patch }).catch(() => {});
        }
      }
    },
    addAdviceItem: () => {
      const newId = crypto.randomUUID();
      const sortOrder = state.advice.length;
      actions.addAdviceItem(newId);
      if (session) {
        saveAdviceItem(session.user.id, {
          id: newId,
          body: "",
          sortOrder,
        }).catch(() => {});
      }
    },
    removeAdviceItem: (id: string) => {
      actions.removeAdviceItem(id);
      if (session) {
        // After local remove, sync sort_orders for remaining items
        const remaining = state.advice.filter((item) => item.id !== id);
        deleteAdviceItem(id)
          .then(() => syncAdviceSortOrders(session.user.id, remaining))
          .catch(() => {});
      }
    },
    // ── Dining Out cards ──────────────────────────────────────────────────
    updateDiningOutItem: (id: string, patch: Partial<Omit<InfoCardItem, "id">>) => {
      actions.updateDiningOutItem(id, patch);
      if (session) {
        const existingIndex = state.diningOutItems.findIndex((item) => item.id === id);
        if (existingIndex !== -1) {
          savePlanInfoCard(session.user.id, { ...state.diningOutItems[existingIndex], ...patch }, "eating_out", existingIndex).catch(() => {});
        }
      }
    },
    addDiningOutItem: () => {
      const newId = crypto.randomUUID();
      const sortOrder = state.diningOutItems.length;
      actions.addDiningOutItem(newId);
      if (session) {
        savePlanInfoCard(session.user.id, {
          id: newId,
          title: "Нова карта",
          body: "",
          accent: "",
        }, "eating_out", sortOrder).catch(() => {});
      }
    },
    removeDiningOutItem: (id: string) => {
      actions.removeDiningOutItem(id);
      if (session) {
        const remaining = state.diningOutItems.filter((item) => item.id !== id);
        deletePlanInfoCardFromDb(id)
          .then(() => syncInfoCardSortOrders(session.user.id, "eating_out", remaining))
          .catch(() => {});
      }
    },
    // ── General Info cards ────────────────────────────────────────────────
    updateGeneralInfoItem: (id: string, patch: Partial<Omit<InfoCardItem, "id">>) => {
      actions.updateGeneralInfoItem(id, patch);
      if (session) {
        const existingIndex = state.generalInfoItems.findIndex((item) => item.id === id);
        if (existingIndex !== -1) {
          savePlanInfoCard(session.user.id, { ...state.generalInfoItems[existingIndex], ...patch }, "general_info", existingIndex).catch(() => {});
        }
      }
    },
    addGeneralInfoItem: () => {
      const newId = crypto.randomUUID();
      const sortOrder = state.generalInfoItems.length;
      actions.addGeneralInfoItem(newId);
      if (session) {
        savePlanInfoCard(session.user.id, {
          id: newId,
          title: "Нова карта",
          body: "",
          accent: "",
        }, "general_info", sortOrder).catch(() => {});
      }
    },
    removeGeneralInfoItem: (id: string) => {
      actions.removeGeneralInfoItem(id);
      if (session) {
        const remaining = state.generalInfoItems.filter((item) => item.id !== id);
        deletePlanInfoCardFromDb(id)
          .then(() => syncInfoCardSortOrders(session.user.id, "general_info", remaining))
          .catch(() => {});
      }
    },
    // ── Macros cards ──────────────────────────────────────────────────────
    updateMacrosCard: (id: string, patch: Partial<Omit<InfoCardItem, "id">>) => {
      actions.updateMacrosCard(id, patch);
      if (session) {
        const existingIndex = state.macrosCards.findIndex((item) => item.id === id);
        if (existingIndex !== -1) {
          savePlanInfoCard(session.user.id, { ...state.macrosCards[existingIndex], ...patch }, "macros", existingIndex).catch(() => {});
        }
      }
    },
    addMacrosCard: () => {
      const newId = crypto.randomUUID();
      const sortOrder = state.macrosCards.length;
      actions.addMacrosCard(newId);
      if (session) {
        savePlanInfoCard(session.user.id, {
          id: newId,
          title: "Нова карта",
          body: "",
          accent: "",
        }, "macros", sortOrder).catch(() => {});
      }
    },
    removeMacrosCard: (id: string) => {
      actions.removeMacrosCard(id);
      if (session) {
        const remaining = state.macrosCards.filter((item) => item.id !== id);
        deletePlanInfoCardFromDb(id)
          .then(() => syncInfoCardSortOrders(session.user.id, "macros", remaining))
          .catch(() => {});
      }
    },
    // ── Regime (meal plan entries) ────────────────────────────────────────
    updateMeal: (monthId: string, day: Weekday, meal: MealSlot, value: string) => {
      actions.updateMeal(monthId, day, meal, value);
      if (session) {
        const dayId = findDayId(state.mealPlanMonths, monthId, day);
        if (dayId) {
          upsertMealEntry(session.user.id, dayId, meal, value).catch((error) => {
            setSyncError(formatSupabaseError("Could not save meal entry", getErrorMessage(error)));
          });
        }
      }
    },
    // ── Shopping ──────────────────────────────────────────────────────────
    addShoppingItem: (monthId: string, categoryOrItem: ShoppingCategory | ShoppingItem) => {
      // ShoppingPage passes category name as string
      const category = typeof categoryOrItem === "string" ? categoryOrItem : categoryOrItem.category;
      const catInfo = state.shoppingCategories.find((c) => c.name === category);
      if (!catInfo) {
        setSyncError("Категорията не е намерена в базата данни.");
        return;
      }

      const newId = crypto.randomUUID();
      const activeShopping = state.shoppingLists.find((l) => l.monthId === monthId);
      const sortOrder = activeShopping?.items.filter((i) => i.category === category).length ?? 0;

      const newItem: ShoppingItem = {
        id: newId,
        category,
        categoryId: catInfo.id,
        name: "",
        quantity: "",
        checked: false,
      };

      actions.addShoppingItem(monthId, newItem);

      if (session) {
        addShoppingItemToDb(session.user.id, monthId, catInfo.id, {
          id: newId,
          name: "",
          quantity: "",
          sortOrder,
        }).catch((error) => {
          setSyncError(formatSupabaseError("Could not add shopping item", getErrorMessage(error)));
        });
      }
    },
    updateShoppingItem: (id: string, patch: Partial<ShoppingItem>) => {
      actions.updateShoppingItem(id, patch);
      if (session) {
        const dbPatch: { name?: string; quantity?: string; is_checked?: boolean; category_id?: string } = {};
        if (patch.name !== undefined) dbPatch.name = patch.name;
        if (patch.quantity !== undefined) dbPatch.quantity = patch.quantity;
        if (patch.checked !== undefined) dbPatch.is_checked = patch.checked;
        if (patch.categoryId !== undefined) dbPatch.category_id = patch.categoryId;

        if (Object.keys(dbPatch).length > 0) {
          updateShoppingItemInDb(id, dbPatch).catch((error) => {
            setSyncError(formatSupabaseError("Could not update shopping item", getErrorMessage(error)));
          });
        }
      }
    },
    removeShoppingItem: (id: string) => {
      actions.removeShoppingItem(id);
      if (session) {
        deleteShoppingItemFromDb(id).catch((error) => {
          setSyncError(formatSupabaseError("Could not delete shopping item", getErrorMessage(error)));
        });
      }
    },
    // ── Recipes ───────────────────────────────────────────────────────────
    addRecipe: (group: RecipeGroup) => {
      const recipeId = crypto.randomUUID();
      const ingredientId = crypto.randomUUID();

      if (!session) {
        // No session — just add locally
        return actions.addRecipe(group, recipeId, ingredientId);
      }

      const groupId = recipeGroupMapRef.current.get(group);
      if (!groupId) {
        setSyncError("Групата рецепти не е намерена в базата данни.");
        return recipeId;
      }

      const sortOrder = state.recipes.filter((r) => r.group === group).length;

      addRecipeToDb(session.user.id, groupId, {
        id: recipeId,
        name: "Нова рецепта",
        preparation: "",
        sortOrder,
      }).then(() =>
        addIngredientToDb(session.user.id, recipeId, {
          id: ingredientId,
          text: "",
          sortOrder: 0,
        }),
      ).then(() => {
        // Only add to local state after DB success
        actions.addRecipe(group, recipeId, ingredientId);
      }).catch((error) => {
        setSyncError(formatSupabaseError("Could not add recipe", getErrorMessage(error)));
      });

      return recipeId;
    },
    updateRecipe: (id: string, patch: Partial<Recipe>) => {
      actions.updateRecipe(id, patch);
      if (session) {
        const dbPatch: { name?: string; preparation?: string } = {};
        if (patch.name !== undefined) dbPatch.name = patch.name;
        if (patch.preparation !== undefined) dbPatch.preparation = patch.preparation;
        if (Object.keys(dbPatch).length > 0) {
          updateRecipeInDb(session.user.id, id, dbPatch).catch((error) => {
            setSyncError(formatSupabaseError("Could not update recipe", getErrorMessage(error)));
          });
        }
      }
    },
    removeRecipe: (id: string) => {
      actions.removeRecipe(id);
      if (session) {
        deleteRecipeFromDb(session.user.id, id).catch((error) => {
          setSyncError(formatSupabaseError("Could not delete recipe", getErrorMessage(error)));
        });
      }
    },
    addIngredient: (recipeId: string) => {
      const newId = crypto.randomUUID();
      actions.addIngredient(recipeId, newId);
      if (session) {
        const recipe = state.recipes.find((r) => r.id === recipeId);
        const sortOrder = recipe?.ingredients.length ?? 0;
        addIngredientToDb(session.user.id, recipeId, {
          id: newId,
          text: "",
          sortOrder,
        }).catch((error) => {
          setSyncError(formatSupabaseError("Could not add ingredient", getErrorMessage(error)));
        });
      }
    },
    updateIngredient: (recipeId: string, ingredientId: string, patch: Partial<Pick<{ id: string; text: string }, "text">>) => {
      actions.updateIngredient(recipeId, ingredientId, patch);
      if (session && patch.text !== undefined) {
        updateIngredientInDb(session.user.id, ingredientId, patch.text).catch((error) => {
          setSyncError(formatSupabaseError("Could not update ingredient", getErrorMessage(error)));
        });
      }
    },
    removeIngredient: (recipeId: string, ingredientId: string) => {
      actions.removeIngredient(recipeId, ingredientId);
      if (session) {
        deleteIngredientFromDb(session.user.id, ingredientId).catch((error) => {
          setSyncError(formatSupabaseError("Could not delete ingredient", getErrorMessage(error)));
        });
      }
    },
    // ── Contacts ──────────────────────────────────────────────────────────
    updateContacts: (patch: Partial<Contacts>) => {
      actions.updateContacts(patch);
      if (session) {
        const merged = { ...state.contacts, ...patch };
        saveContacts(session.user.id, merged).catch((error) => {
          setSyncError(formatSupabaseError("Could not save contacts", getErrorMessage(error)));
        });
      }
    },
  };

  return (
    <AppShell
      activePage={activePage}
      setActivePage={setActivePage}
      safeActiveMonthId={safeActiveMonthId}
      setActiveMonthId={setActiveMonthId}
      isEditingFood={isEditingFood}
      isEditingRegime={isEditingRegime}
      isEditingShopping={isEditingShopping}
      isEditingRecipes={isEditingRecipes}
      isEditingTraining={isEditingTraining}
      isEditingContacts={isEditingContacts}
      toggleEditingFood={() => setIsEditingFood((v) => !v)}
      toggleEditingRegime={() => setIsEditingRegime((v) => !v)}
      toggleEditingShopping={() => setIsEditingShopping((v) => !v)}
      toggleEditingRecipes={() => setIsEditingRecipes((v) => !v)}
      toggleEditingTraining={() => setIsEditingTraining((v) => !v)}
      toggleEditingContacts={() => setIsEditingContacts((v) => !v)}
      onLogout={handleLogout}
      syncError={syncError}
      state={state}
      actions={foodActions}
    />
  );
}

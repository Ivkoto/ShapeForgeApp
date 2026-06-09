import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { AppShell, pageLoaders } from "./app/AppShell";
import type { PageId } from "./app/AppShell";
import { supabase, supabaseConfigError } from "./lib/supabase";
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
import { normalizeAppState, useAppState } from "./store/useAppState";
import type { AdviceItem, BodyMeasurement, DailyTargets, InfoCardItem, Supplement } from "./types";

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
  const sessionUserIdRef = useRef<string | null>(null);

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

      const nextSession = data.session ?? null;
      sessionUserIdRef.current = nextSession?.user.id ?? null;
      setSession(nextSession);
      setAuthLoading(false);
    };

    void initSession();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, nextSession) => {
      if (!isMounted) {
        return;
      }

      const previousUserId = sessionUserIdRef.current;
      const nextUserId = nextSession?.user.id ?? null;
      const userChanged = previousUserId !== nextUserId;

      sessionUserIdRef.current = nextUserId;

      setSession(nextSession);
      setSyncError(null);
      if (event !== "INITIAL_SESSION") {
        setAuthError(null);
      }
      setAuthMessage(null);

      if (userChanged) {
        setAppLoading(nextUserId !== null);
      }
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
    if (authLoading || !session || !appLoading) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSyncError("Синхронизацията отнема твърде дълго. Зареждаме локалните данни и ще продължим опита за синхронизация във фонов режим.");
      setAppLoading(false);
    }, 12000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [authLoading, appLoading, session?.user.id]);

  // ── Load food data from normalized tables ─────────────────────────────────

  useEffect(() => {
    if (authLoading || appLoading || !session) {
      return;
    }

    let cancelled = false;

    const loadPlanData = async () => {
      try {
        const foodData = await fetchPlanData(session.user.id);
        if (cancelled) return;

        // If any normalized data exists, merge it into local state
        const hasData =
          foodData.planStartDate !== null ||
          foodData.dailyTargets !== null ||
          foodData.supplements !== null;

        if (!hasData) return;

        setSyncError(null);
        skipNextSaveRef.current = true;
        replaceState({
          ...latestStateRef.current,
          ...(foodData.planStartDate !== null && { startDate: foodData.planStartDate }),
          ...(foodData.dailyTargets !== null && { dailyTargets: foodData.dailyTargets }),
          ...(foodData.supplements !== null && { supplements: foodData.supplements }),
        });
      } catch {
        // Silently fall back to local state.
      }
    };

    void loadPlanData();

    return () => {
      cancelled = true;
    };
  }, [authLoading, appLoading, session?.user.id]);

  // ── Load body measurements from normalized table ──────────────────────────

  useEffect(() => {
    if (authLoading || appLoading || !session) {
      return;
    }

    let cancelled = false;

    const loadMeasurements = async () => {
      try {
        const measurements = await fetchBodyMeasurements(session.user.id);
        if (cancelled) return;

        // null means error → fall back to local state silently.
        // An array (even empty) means success → use DB data.
        if (measurements === null) return;

        skipNextSaveRef.current = true;
        replaceState({
          ...latestStateRef.current,
          bodyMeasurements: measurements,
        });
      } catch {
        // Silently fall back to local state.
      }
    };

    void loadMeasurements();

    return () => {
      cancelled = true;
    };
  }, [authLoading, appLoading, session?.user.id]);

  // ── Load advice from normalized table ─────────────────────────────────────

  useEffect(() => {
    if (authLoading || appLoading || !session) {
      return;
    }

    let cancelled = false;

    const loadAdvice = async () => {
      try {
        const advice = await fetchAdviceItems(session.user.id);
        if (cancelled) return;

        if (advice === null) return; // error → fall back

        skipNextSaveRef.current = true;
        replaceState({
          ...latestStateRef.current,
          advice,
        });
      } catch {
        // Silently fall back to local state.
      }
    };

    void loadAdvice();

    return () => {
      cancelled = true;
    };
  }, [authLoading, appLoading, session?.user.id]);

  // ── Load plan info cards (eating_out & general_info) ──────────────────────

  useEffect(() => {
    if (authLoading || appLoading || !session) {
      return;
    }

    let cancelled = false;

    const loadCards = async () => {
      try {
        const [eatingOut, generalInfo] = await Promise.all([
          fetchPlanInfoCards(session.user.id, "eating_out"),
          fetchPlanInfoCards(session.user.id, "general_info"),
        ]);
        if (cancelled) return;

        const patch: Partial<typeof latestStateRef.current> = {};

        if (eatingOut !== null) {
          patch.diningOutItems = eatingOut;
        }
        if (generalInfo !== null) {
          patch.generalInfoItems = generalInfo;
        }

        if (Object.keys(patch).length === 0) return;

        skipNextSaveRef.current = true;
        replaceState({
          ...latestStateRef.current,
          ...patch,
        });
      } catch {
        // Silently fall back to local state.
      }
    };

    void loadCards();

    return () => {
      cancelled = true;
    };
  }, [authLoading, appLoading, session?.user.id]);

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

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { AppShell, pageLoaders } from "./app/AppShell";
import type { PageId } from "./app/AppShell";
import { supabase, supabaseConfigError } from "./lib/supabase";
import {
  fetchFoodData,
  savePlanStartDate,
  saveDailyTargets,
  saveSupplement,
  addSupplementToDb,
  deleteSupplementFromDb,
} from "./services/foodService";
import { normalizeAppState, useAppState } from "./store/useAppState";
import { createId } from "./data";
import type { DailyTargets, Supplement } from "./types";

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

    const loadFoodData = async () => {
      try {
        const foodData = await fetchFoodData(session.user.id);
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

    void loadFoodData();

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
      const newId = createId("supplement");
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

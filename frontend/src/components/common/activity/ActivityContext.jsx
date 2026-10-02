import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const ActivityContext = createContext(null);
const ACTIVITY_REVEAL_DELAY = 350;
const SUCCESS_VISIBLE_DURATION = 1800;
const activityTypes = new Set([
  "default",
  "upload",
  "download",
  "save",
  "delete",
  "generate",
]);

export function ActivityProvider({ children }) {
  const [activities, setActivities] = useState([]);
  const timers = useRef(new Map());
  const activityGroups = useRef(new Map());

  const clearTimer = useCallback((id) => {
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const removeActivity = useCallback(
    (id) => {
      clearTimer(id);
      setActivities((current) =>
        current.map((activity) =>
          activity.id === id && activity.visible
            ? { ...activity, exiting: true }
            : activity,
        ),
      );
      timers.current.set(
        id,
        window.setTimeout(() => {
          timers.current.delete(id);
          setActivities((current) =>
            current.filter((activity) => activity.id !== id),
          );
        }, 180),
      );
    },
    [clearTimer],
  );

  const startActivity = useCallback(
    ({ title, message = "", type = "default" }) => {
      const id =
        globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
      const activity = {
        id,
        title: title || "جارٍ تنفيذ العملية",
        message,
        type: activityTypes.has(type) ? type : "default",
        status: "loading",
        progress: null,
        createdAt: new Date().toISOString(),
        visible: false,
      };
      setActivities((current) => [...current, activity]);
      timers.current.set(
        id,
        window.setTimeout(() => {
          timers.current.delete(id);
          setActivities((current) =>
            current.map((item) =>
              item.id === id && item.status === "loading"
                ? { ...item, visible: true }
                : item,
            ),
          );
        }, ACTIVITY_REVEAL_DELAY),
      );
      return id;
    },
    [],
  );

  const updateActivity = useCallback((id, updates = {}) => {
    setActivities((current) =>
      current.map((activity) => {
        if (activity.id !== id) return activity;
        const next = { ...activity, ...updates };
        if (updates.progress !== undefined && updates.progress !== null) {
          next.progress = Math.min(
            100,
            Math.max(0, Number(updates.progress) || 0),
          );
        }
        if (updates.type !== undefined && !activityTypes.has(updates.type)) {
          next.type = "default";
        }
        return next;
      }),
    );
  }, []);

  const finishActivity = useCallback(
    (id, { status = "success", message } = {}) => {
      clearTimer(id);
      setActivities((current) => {
        const activity = current.find((item) => item.id === id);
        if (!activity || !activity.visible)
          return current.filter((item) => item.id !== id);
        return current.map((item) =>
          item.id === id
            ? {
                ...item,
                status: status === "error" ? "error" : "success",
                message: message ?? item.message,
                progress: null,
              }
            : item,
        );
      });
      if (status !== "error") {
        timers.current.set(
          id,
          window.setTimeout(() => removeActivity(id), SUCCESS_VISIBLE_DURATION),
        );
      }
    },
    [clearTimer, removeActivity],
  );

  const clearActivities = useCallback(() => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current.clear();
    activityGroups.current.clear();
    setActivities([]);
  }, []);

  useEffect(
    () => () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current.clear();
      activityGroups.current.clear();
    },
    [],
  );

  const value = useMemo(
    () => ({
      activities,
      startActivity,
      updateActivity,
      finishActivity,
      removeActivity,
      clearActivities,
      activityGroups,
      clearTimer,
      timers,
    }),
    [
      activities,
      startActivity,
      updateActivity,
      finishActivity,
      removeActivity,
      clearActivities,
      clearTimer,
      timers,
    ],
  );

  return (
    <ActivityContext.Provider value={value}>
      {children}
    </ActivityContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useActivity() {
  const context = useContext(ActivityContext);
  if (!context)
    throw new Error("useActivity must be used within an ActivityProvider");
  return context;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useActivityAction() {
  const { startActivity, finishActivity } = useActivity();
  const activeKeys = useRef(new Set());

  return useCallback(
    async (key, options, action) => {
      if (activeKeys.current.has(key)) return { skipped: true };
      activeKeys.current.add(key);
      const startedAt = Date.now();
      const activityId = startActivity(options);
      try {
        const value = await action();
        const succeeded =
          options.isSuccess?.(value) !== false && value?.success !== false;
        finishActivity(activityId, {
          status: succeeded ? "success" : "error",
          message: succeeded
            ? options.successMessage || "تمت العملية بنجاح."
            : `فشلت العملية: ${options.title || "عملية النظام"}`,
        });
        return {
          skipped: false,
          value,
          visible: Date.now() - startedAt >= 350,
        };
      } catch (error) {
        finishActivity(activityId, {
          status: "error",
          message: `فشلت العملية: ${options.title || "عملية النظام"}`,
        });
        throw error;
      } finally {
        activeKeys.current.delete(key);
      }
    },
    [finishActivity, startActivity],
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGroupedActivityAction() {
  const context = useActivity();
  const { startActivity, finishActivity, updateActivity } = context;
  const activityGroups = context.activityGroups;
  const clearTimer = context.clearTimer;
  const timers = context.timers;

  return useCallback(
    async (key, options, action, settleDelay = 800) => {
      let group = activityGroups.current.get(key);
      if (!group) {
        group = {
          activityId: startActivity(options),
          generation: 0,
          inFlight: 0,
          outcome: { status: "success", message: options.successMessage },
          timer: null,
        };
        activityGroups.current.set(key, group);
      }

      if (group.timer) {
        clearTimer(`activity-group:${key}`);
        group.timer = null;
      }
      group.generation += 1;
      const generation = group.generation;
      group.inFlight += 1;
      updateActivity(group.activityId, {
        title: options.title,
        message: options.message,
        status: "loading",
      });

      try {
        const value = await action();
        if (generation === group.generation) {
          const succeeded = value?.success !== false;
          group.outcome = {
            status: succeeded ? "success" : "error",
            message: succeeded
              ? options.successMessage
              : `فشلت العملية: ${options.title || "عملية النظام"}`,
          };
        }
        return value;
      } catch (error) {
        if (generation === group.generation) {
          group.outcome = {
            status: "error",
            message: `فشلت العملية: ${options.title || "عملية النظام"}`,
          };
        }
        throw error;
      } finally {
        group.inFlight -= 1;
        if (group.inFlight === 0) {
          const settledGeneration = group.generation;
          group.timer = window.setTimeout(() => {
            clearTimer(`activity-group:${key}`);
            if (
              activityGroups.current.get(key) !== group ||
              group.inFlight !== 0 ||
              group.generation !== settledGeneration
            )
              return;
            activityGroups.current.delete(key);
            finishActivity(group.activityId, group.outcome);
          }, settleDelay);
          timers.current.set(`activity-group:${key}`, group.timer);
        }
      }
    },
    [
      activityGroups,
      clearTimer,
      finishActivity,
      startActivity,
      timers,
      updateActivity,
    ],
  );
}

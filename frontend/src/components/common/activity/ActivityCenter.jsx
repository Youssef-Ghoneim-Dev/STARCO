import {
  HiOutlineCheck,
  HiOutlineExclamation,
  HiOutlineX,
} from "react-icons/hi";
import { useActivity } from "./ActivityContext";
import "./activityCenter.css";

const statusIcon = (status) => {
  if (status === "success") return <HiOutlineCheck aria-hidden="true" />;
  if (status === "error") return <HiOutlineExclamation aria-hidden="true" />;
  return <span className="activity-center-spinner" aria-hidden="true" />;
};

const textDirection = (text) => {
  const firstLetter = String(text || "").match(/\p{L}/u)?.[0] || "";
  return /\p{Script=Arabic}/u.test(firstLetter) ? "rtl" : "ltr";
};

function ActivityProgress({ activity }) {
  if (activity.status !== "loading") return null;
  const hasProgress =
    Number.isFinite(Number(activity.progress)) && activity.progress !== null;
  return (
    <div
      className={`activity-center-progress${hasProgress ? " is-determinate" : " is-indeterminate"}`}
      role="progressbar"
      aria-label={activity.title}
      aria-valuemin={hasProgress ? 0 : undefined}
      aria-valuemax={hasProgress ? 100 : undefined}
      aria-valuenow={hasProgress ? activity.progress : undefined}
    >
      <span
        style={hasProgress ? { width: `${activity.progress}%` } : undefined}
      />
    </div>
  );
}

function ActivityRow({ activity, onRemove, compact = false }) {
  const title =
    activity.status === "success" || activity.status === "error"
      ? activity.message || activity.title
      : activity.title;
  return (
    <article
      className={`activity-center-row status-${activity.status} type-${activity.type}${activity.exiting ? " is-exiting" : ""}`}
    >
      <span className="activity-center-icon">
        {statusIcon(activity.status)}
      </span>
      <div className="activity-center-copy">
        <strong dir={textDirection(title)}>{title}</strong>
        {activity.status === "loading" && activity.message && (
          <span dir={textDirection(activity.message)}>{activity.message}</span>
        )}
        {compact && activity.status === "loading" && (
          <ActivityProgress activity={activity} />
        )}
      </div>
      {activity.status === "error" && (
        <button
          type="button"
          className="activity-center-dismiss"
          onClick={() => onRemove(activity.id)}
          aria-label="إغلاق رسالة الخطأ"
          title="إغلاق"
        >
          <HiOutlineX />
        </button>
      )}
      {!compact && <ActivityProgress activity={activity} />}
    </article>
  );
}

function ActivityCenter() {
  const { activities, removeActivity } = useActivity();
  const visibleActivities = activities.filter((activity) => activity.visible);
  if (!visibleActivities.length) return null;

  const loadingCount = visibleActivities.filter(
    (activity) => activity.status === "loading",
  ).length;
  const multiple = visibleActivities.length > 1;

  return (
    <aside
      className={`activity-center${multiple ? " has-multiple" : ""}`}
      aria-live="polite"
      aria-relevant="additions text"
    >
      {multiple ? (
        <>
          <header className="activity-center-heading">
            <strong>
              {loadingCount ? "العمليات الجارية" : "آخر العمليات"}
            </strong>
            <span>{visibleActivities.length}</span>
          </header>
          <div className="activity-center-list">
            {visibleActivities.map((activity) => (
              <ActivityRow
                key={activity.id}
                activity={activity}
                onRemove={removeActivity}
                compact
              />
            ))}
          </div>
        </>
      ) : (
        <ActivityRow
          activity={visibleActivities[0]}
          onRemove={removeActivity}
        />
      )}
    </aside>
  );
}

export default ActivityCenter;

import { useState } from "react";
import { createPortal } from "react-dom";
import { HiOutlineExclamation, HiOutlinePencilAlt } from "react-icons/hi";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { panelMarketingEditableStatuses } from "../../utils/panelEditing";

export default function PanelEditAction({ panel, onStart, className = "", label = "تعديل اللوحة" }) {
  const { user } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [starting, setStarting] = useState(false);
  const allowedRole = ["Marketer", "OwnerManager"].includes(user?.role);
  const canEdit = allowedRole && panelMarketingEditableStatuses.has(panel?.status) && !panel?.marketingEditSession?.active;
  const engineerIsWorking = Boolean(
    panel?.engineerId &&
    ["pricing", "editing"].includes(panel?.status),
  );
  if (!canEdit) return null;

  const confirm = async () => {
    setStarting(true);
    const result = await onStart({ forceStopEngineer: engineerIsWorking });
    setStarting(false);
    if (!result?.success) return toast.error(result?.message || "تعذر فتح اللوحة للتعديل.");
    setConfirming(false);
    toast.success(result.notification || "تم فتح اللوحة للتعديل.");
  };

  return <>
    <button type="button" className={`panel-edit-action ${className}`.trim()} onClick={(event) => { event.stopPropagation(); setConfirming(true); }}><HiOutlinePencilAlt /> {label}</button>
    {confirming && createPortal(<div className="panel-edit-confirm-overlay" role="presentation" onMouseDown={() => !starting && setConfirming(false)}>
      <section className="panel-edit-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="panel-edit-dialog-title" dir="rtl" onMouseDown={(event) => event.stopPropagation()}>
        <span className="panel-edit-confirm-icon"><HiOutlineExclamation /></span>
        <h2 id="panel-edit-dialog-title">تعديل هذه اللوحة؟</h2>
        <p>سيتم فتح مسودة تعديل لهذه اللوحة وحدها، ولن تتغير أي لوحة أخرى داخل المشروع.</p>
        {engineerIsWorking && <div className="panel-edit-engineer-warning">المهندس يعمل على هذه اللوحة حاليًا. عند التأكيد سنرسل له إشعارًا بالتوقف عن العمل، وسنمنع تعديل اللوحة لديه حتى تنتهي من تعديلاتك.</div>}
        <div><button type="button" onClick={() => setConfirming(false)} disabled={starting}>إلغاء</button><button type="button" className="confirm" onClick={confirm} disabled={starting}>{starting ? "جاري فتح التعديل..." : "تأكيد وفتح التعديل"}</button></div>
      </section>
    </div>, document.body)}
  </>;
}

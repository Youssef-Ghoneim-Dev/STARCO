import { HiOutlineClipboardCopy, HiOutlineDotsVertical, HiOutlineTrash } from "react-icons/hi";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getPanelNameDirection } from "../../utils/panelNameDirection";
const states = { draft: ["مسودة", "draft"], pendingPricing: ["بانتظار التسعير", "pending"], pricing: ["قيد التسعير", "working"], quoteCompleted: ["عرض السعر جاهز", "ready"], editing: ["قيد التعديل", "editing"], executionPdfRequested: ["مطلوب PDF تنفيذ", "pending"], executionPdfReady: ["PDF التنفيذ جاهز", "ready"], executionConfirmed: ["تم تأكيد التنفيذ", "working"], manufacturingFilesPending: ["بانتظار ملفات التصنيع", "pending"], manufacturingFilesReady: ["ملفات التصنيع جاهزة", "ready"], pendingLaserDownload: ["بانتظار تنزيل الليزر", "pending"], laser: ["مرحلة الليزر", "working"], manufacturing: ["مرحلة التصنيع", "working"], painting: ["مرحلة الرش", "working"], assembly: ["مرحلة التجميع", "working"], completed: ["مكتملة", "complete"] };
export default function PanelCard({ panel, onOpen, onDelete, canDelete }) {
  const { user } = useAuth();
  const [menu, setMenu] = useState(false);
  const [label, tone] = panel.status === "draft" && panel.marketerSaved
    ? ["مسودة محفوظة", "ready"]
    : (states[panel.status] || [panel.status, "draft"]);
  const copy = async (event) => { event.stopPropagation(); await navigator.clipboard.writeText(panel.panelCode); setMenu(false); };
  return <article className="panel-folder-card" onClick={onOpen} dir="rtl"><div className="panel-folder-card-top"><span className={`panel-folder-status ${tone}`}>{label}</span><button type="button" onClick={(event) => { event.stopPropagation(); setMenu((value) => !value); }}><HiOutlineDotsVertical /></button></div>
    {menu && <div className="panel-card-menu" onClick={(event) => event.stopPropagation()}><button type="button" onClick={onOpen}>فتح اللوحة</button><button type="button" onClick={copy}><HiOutlineClipboardCopy /> نسخ رقم اللوحة</button>{canDelete && <button type="button" className="danger" onClick={onDelete}><HiOutlineTrash /> حذف اللوحة</button>}</div>}
    <div className="panel-folder-icon">P{String(panel.sequence).padStart(2, "0")}</div><h2><bdi dir={getPanelNameDirection(panel.panelName)}>{panel.panelName || `لوحة ${panel.sequence}`}</bdi></h2><code>{panel.panelCode}</code><dl><div><dt>النوع</dt><dd>{panel.panelType || panel.marketerData?.panelType || "غير محدد"}</dd></div><div><dt>المهندس</dt><dd>{user?.role === "OwnerManager" && panel.assignedEngineer?.name ? panel.assignedEngineer.name : panel.engineerId ? "تم الإسناد" : "غير مسندة"}</dd></div></dl></article>;
}

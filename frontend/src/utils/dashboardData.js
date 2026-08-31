const DAY = 24 * 60 * 60 * 1000;

export const PANEL_STATUS_META = {
  draft: { label: "مسودة", group: "new", progress: 4 },
  pendingPricing: { label: "جديدة للتسعير", group: "new", progress: 10 },
  pricing: { label: "قيد التسعير", group: "pricing", progress: 22 },
  quoteCompleted: { label: "عرض السعر جاهز", group: "quote", progress: 34 },
  editing: { label: "قيد التعديل", group: "editing", progress: 24 },
  executionPdfRequested: { label: "في انتظار PDF التنفيذ", group: "pdf", progress: 43 },
  executionPdfReady: { label: "PDF التنفيذ جاهز للمراجعة", group: "pdf", progress: 53 },
  executionConfirmed: { label: "تم تأكيد التنفيذ", group: "execution", progress: 60 },
  manufacturingFilesPending: { label: "بانتظار ملفات التصنيع", group: "manufacturing", progress: 66 },
  manufacturingFilesReady: { label: "ملفات التصنيع جاهزة", group: "manufacturing", progress: 72 },
  pendingLaserDownload: { label: "بانتظار التنزيل إلى الليزر", group: "production", progress: 76 },
  laser: { label: "في الليزر", group: "production", progress: 82 },
  manufacturing: { label: "في التصنيع", group: "production", progress: 88 },
  painting: { label: "في الرش والدهان", group: "production", progress: 93 },
  assembly: { label: "في التجميع", group: "production", progress: 97 },
  completed: { label: "مكتملة", group: "completed", progress: 100 },
};

export const statusMeta = (item) => PANEL_STATUS_META[String(item?.status || "")] || { label: "حالة غير محددة", group: "new", progress: 0 };
export const statusLabel = (item) => statusMeta(item).label;
export const statusProgress = (item) => statusMeta(item).progress;
export const itemName = (item) => item?.panelName?.trim() || item?.panels?.[0]?.panelName?.trim() || item?.project?.client?.name || item?.client?.name || "لوحة بدون اسم";
export const itemCode = (item) => item?.panelCode || item?.project?.projectCode || item?.projectNumber || item?.code || String(item?._id || "").slice(-8).toUpperCase() || "—";
export const itemClient = (item) => item?.project?.client?.name || item?.client?.name || "عميل غير محدد";
export const itemDate = (item) => new Date(item?.updatedAt || item?.createdAt || 0);
export const itemLink = (item) => item?.project?._id && item?._id ? `/projects/${item.project._id}/panels/${item._id}` : `/projects/${item?._id}`;
export const sameDay = (value, target) => {
  if (!value || !target) return false;
  const date = new Date(value);
  return date.getFullYear() === target.getFullYear() && date.getMonth() === target.getMonth() && date.getDate() === target.getDate();
};
export const isThisMonth = (value, now = new Date()) => {
  if (!value) return false;
  const date = new Date(value);
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
};

const validDate = (value) => value && !Number.isNaN(new Date(value).getTime());
const duration = (start, end) => validDate(start) && validDate(end) ? Math.max(0, new Date(end) - new Date(start)) : null;
const average = (values, minimum = 5) => {
  const samples = values.filter((value) => Number.isFinite(value) && value >= 0);
  return { samples: samples.length, ready: samples.length >= minimum, milliseconds: samples.length ? samples.reduce((sum, value) => sum + value, 0) / samples.length : 0 };
};
export const formatAverage = (result) => {
  if (!result?.ready) return `بعد ${Math.max(0, 5 - (result?.samples || 0))} عينات`;
  const hours = result.milliseconds / 3600000;
  return hours < 24 ? `${Math.max(1, Math.round(hours))} ساعة` : `${(hours / 24).toFixed(1)} يوم`;
};
export const workflowAverages = (panels = []) => ({
  quote: average(panels.map((panel) => duration(panel.assignedAt || panel.createdAt, panel.quoteCompletedAt))),
  executionPdf: average(panels.map((panel) => duration(panel.executionPdf?.requestedAt, panel.executionPdf?.readyAt))),
  manufacturingFiles: average(panels.map((panel) => {
    const firstFile = [...(panel.manufacturing?.files || [])].sort((a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt))[0];
    return duration(panel.executionPdf?.confirmedAt, firstFile?.uploadedAt);
  })),
  stage: (key) => average(panels.map((panel) => {
    const stage = panel.manufacturing?.productionStages?.find((entry) => entry.key === key);
    return duration(stage?.startedAt, stage?.completedAt);
  })),
});

export const manufacturingFilesUploadedOn = (panels, date) => panels.reduce((count, panel) => count + (panel.manufacturing?.files || []).filter((file) => sameDay(file.uploadedAt, date)).length, 0);

export const deliveryDate = (panel) => validDate(panel?.deliverySchedule?.requestedDate) ? new Date(panel.deliverySchedule.requestedDate) : null;
export const daysLate = (panel, now = new Date()) => {
  const due = deliveryDate(panel);
  if (!due || panel?.status === "completed" || due >= now) return 0;
  return Math.max(1, Math.ceil((now - due) / DAY));
};
export const isDelayed = (panel, now = new Date()) => daysLate(panel, now) > 0 || (panel?.manufacturing?.productionStages || []).some((stage) => stage.delayReason || stage.delayedAt);

export const currentAction = (panel, role) => {
  const status = panel?.status;
  if (role === "Engineer") {
    if (["pendingPricing", "pricing", "editing"].includes(status)) return "إتمام عرض السعر";
    if (status === "executionPdfRequested") return "تجهيز PDF التنفيذ";
    if (status === "manufacturingFilesPending") return "رفع ملفات التصنيع";
  }
  if (role === "ProductionManager") {
    if (panel?.deliverySchedule?.status === "pending") return "اعتماد موعد الانتهاء";
    if (["manufacturingFilesReady", "pendingLaserDownload"].includes(status)) return "تنزيل الملفات إلى الليزر";
    if (["laser", "manufacturing", "painting", "assembly"].includes(status)) return "تحديث مرحلة الإنتاج";
  }
  if (["Marketer", "MarketingManager"].includes(role)) {
    if (panel?.deliverySchedule?.status === "rejected") return "اختيار موعد انتهاء جديد";
    if (status === "quoteCompleted") return "مراجعة عرض السعر";
    if (status === "executionPdfReady") return "مراجعة PDF التنفيذ";
  }
  return "";
};

export const taskOutcome = (panel, role) => {
  const action = currentAction(panel, role);
  if (action) return { state: "pending", label: "قيد الانتظار", action };
  if (panel?.deliverySchedule?.status === "rejected") return { state: "refused", label: "مرفوض", action: "موعد الانتهاء" };
  return { state: "success", label: "تم", action: statusLabel(panel) };
};

export const realDelayReasons = (panels = []) => {
  const counts = new Map();
  panels.forEach((panel) => (panel.manufacturing?.productionStages || []).forEach((stage) => {
    if (!stage.delayReason) return;
    counts.set(stage.delayReason, (counts.get(stage.delayReason) || 0) + 1);
  }));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
};

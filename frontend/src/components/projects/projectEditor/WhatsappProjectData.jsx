import { useEffect, useMemo, useRef, useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import { IoPause, IoPlay, IoTrashOutline } from "react-icons/io5";
import toast from "react-hot-toast";
import { useProject } from "../../../context/ProjectContext";
import { deleteProjectMedia, getProjectMedia, getProjectMediaFile, getProjectMediaWhatsappLink, uploadProjectMedia } from "../../../services/projectsAPI";

const ReadOnlyField = ({ label, value }) => <label className="whatsapp-readonly-field"><span>{label}</span><input value={value || "—"} disabled /></label>;

function AudioPlayer({ url, shouldPlay, onStart, onEnded }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const toggle = async () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      onStart();
      await audioRef.current.play();
    }
    else audioRef.current.pause();
  };
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (shouldPlay && audio.paused) audio.play().catch(() => undefined);
    if (!shouldPlay && !audio.paused) audio.pause();
  }, [shouldPlay]);
  const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;
  return <div className="starco-audio-player">
    <audio ref={audioRef} src={url} onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)} onPlay={() => { setPlaying(true); onStart(); }} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setProgress(0); onEnded(); }} onTimeUpdate={(event) => setProgress(event.currentTarget.duration ? (event.currentTarget.currentTime / event.currentTarget.duration) * 100 : 0)} />
    <button type="button" onClick={toggle} aria-label={playing ? "إيقاف التسجيل" : "تشغيل التسجيل"}>{playing ? <IoPause /> : <IoPlay />}</button>
    <div className="starco-audio-progress"><i style={{ width: `${progress}%` }} /></div><span>تسجيل صوتي</span><time>{duration ? formatTime(duration) : "..."}</time>
  </div>;
}

function MediaItem({ item, url, onOpen, audioProps, onDelete }) {
  if (!url) return <p className="whatsapp-media-loading">جاري تحميل المرفق...</p>;
  const removeButton = onDelete && <button type="button" className="project-media-delete" onClick={onDelete} aria-label="حذف المرفق"><IoTrashOutline /></button>;
  if (item.type === "image") return <div className="project-media-item"><button type="button" className="whatsapp-image-thumb" onClick={onOpen}><img src={url} alt="مرفق من المندوب" /></button>{removeButton}</div>;
  if (item.type === "audio") return <div className="project-media-item project-audio-item"><AudioPlayer url={url} {...audioProps} />{removeButton}</div>;
  return <p className="whatsapp-media-loading">نوع المرفق غير مدعوم للعرض.</p>;
}

function WhatsappProjectData({ editable = false }) {
  const { project, activePanel } = useProject();
  const [media, setMedia] = useState([]);
  const [urls, setUrls] = useState({});
  const [mediaError, setMediaError] = useState("");
  const [viewerIndex, setViewerIndex] = useState(null);
  const [activeAudioId, setActiveAudioId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadRefresh, setUploadRefresh] = useState(0);
  const [showUploadChoice, setShowUploadChoice] = useState(false);
  const [openingWhatsapp, setOpeningWhatsapp] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState(null);
  const [deletingMedia, setDeletingMedia] = useState(false);
  const uploadInputRef = useRef(null);
  useEffect(() => {
    if (!project?._id) return;
    let alive = true;
    getProjectMedia(project._id).then(({ data }) => { if (alive) setMedia(Array.isArray(data) ? data : []); }).catch(() => alive && setMediaError("تعذر تحميل مرفقات المشروع الآن."));
    return () => { alive = false; };
  }, [project?._id, uploadRefresh]);
  useEffect(() => {
    let alive = true;
    const createdUrls = [];
    const loadFiles = async () => {
      const entries = await Promise.all(media.map(async (item) => {
        try { const { data } = await getProjectMediaFile(project._id, item.id); const url = URL.createObjectURL(data); createdUrls.push(url); return [item.id, url]; }
        catch { return [item.id, ""]; }
      }));
      if (alive) setUrls(Object.fromEntries(entries));
    };
    if (project?._id && media.length) loadFiles(); else setUrls({});
    return () => { alive = false; createdUrls.forEach((url) => URL.revokeObjectURL(url)); };
  }, [media, project?._id]);

  const panel = project?.panels?.[activePanel] || project?.panels?.[0] || {};
  const panelMedia = useMemo(() => media.filter((item) => String(item.panelId || "") === String(panel.panelId || "")), [media, panel.panelId]);
  const images = panelMedia.filter((item) => item.type === "image");
  const audio = panelMedia.filter((item) => item.type === "audio");
  const copper = panel.copperDetails || {};
  const gallerySlides = images.map((item) => ({ src: urls[item.id], alt: "مرفق من المندوب" })).filter((slide) => slide.src);
  const startNextAudio = (itemId) => {
    const currentIndex = audio.findIndex((item) => item.id === itemId);
    const next = audio[currentIndex + 1];
    setActiveAudioId(next?.id || "");
  };
  const uploadFiles = async (event) => {
    const files = [...(event.target.files || [])];
    event.target.value = "";
    if (!files.length || !panel.panelId) return;
    setUploading(true);
    try {
      await Promise.all(files.map((file) => uploadProjectMedia(project._id, panel.panelId, file)));
      setUploadRefresh((value) => value + 1);
    } catch (error) {
      toast.error(error?.response?.data?.message || "تعذر رفع أحد المرفقات.");
    } finally { setUploading(false); }
  };
  const removeMedia = async () => {
    if (!mediaToDelete) return;
    setDeletingMedia(true);
    try {
      await deleteProjectMedia(project._id, mediaToDelete.id);
      setMedia((current) => current.filter((entry) => entry.id !== mediaToDelete.id));
      setMediaToDelete(null);
    } catch (error) {
      toast.error(error?.response?.data?.message || "تعذر حذف المرفق.");
    } finally { setDeletingMedia(false); }
  };
  const chooseLocalUpload = () => {
    setShowUploadChoice(false);
    uploadInputRef.current?.click();
  };
  const chooseWhatsappUpload = async () => {
    setOpeningWhatsapp(true);
    try {
      const { data } = await getProjectMediaWhatsappLink(project._id, panel.panelId);
      setShowUploadChoice(false);
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error?.response?.data?.message || "تعذر فتح WhatsApp لإرسال المرفقات.");
    } finally { setOpeningWhatsapp(false); }
  };
  return <section className="whatsapp-project-data" dir="rtl">
    <div className="whatsapp-data-heading"><h2>مرفقات المشروع</h2><p>{editable ? "أضف الصور والتسجيلات الخاصة باللوحة الحالية." : "الصور والتسجيلات التي أضيفت إلى المشروع."}</p></div>
    {!editable && <><div className="whatsapp-readonly-grid"><ReadOnlyField label="نوع اللوحة" value={panel.panelType} /><ReadOnlyField label="هل يوجد نحاس" value={panel.hasCopper === true ? "نعم" : panel.hasCopper === false ? "لا" : ""} />{panel.panelType === "كنترول" && <ReadOnlyField label="تركيب لوحة الكنترول" value={panel.controlInstallation} />}<ReadOnlyField label="تفاصيل إضافية" value={panel.additionalDetails} /></div>
    {panel.hasCopper === true && <div className="whatsapp-copper-data"><h3>بيانات النحاس</h3><div className="whatsapp-readonly-grid"><ReadOnlyField label="نوع المفاتيح" value={copper.switches} /><ReadOnlyField label="الرئيسي" value={copper.main} /><ReadOnlyField label="الفرعيات" value={copper.branches} /></div></div>}</>}
    <div className="whatsapp-media-accordions">
      <details open><summary>صور المشروع <b>{images.length}</b></summary><div className="whatsapp-images-grid">{images.length ? images.map((item) => <MediaItem key={item.id} item={item} url={urls[item.id]} onOpen={() => setViewerIndex(gallerySlides.findIndex((slide) => slide.src === urls[item.id]))} onDelete={editable ? () => setMediaToDelete(item) : null} />) : <p>لا توجد صور لهذه اللوحة.</p>}</div></details>
      <details><summary>التسجيلات الصوتية <b>{audio.length}</b></summary><div className="whatsapp-audio-list">{audio.length ? audio.map((item) => <MediaItem key={item.id} item={item} url={urls[item.id]} audioProps={{ shouldPlay: activeAudioId === item.id, onStart: () => setActiveAudioId(item.id), onEnded: () => startNextAudio(item.id) }} onDelete={editable ? () => setMediaToDelete(item) : null} />) : <p>لا توجد تسجيلات لهذه اللوحة.</p>}</div></details>
      {mediaError && <p className="whatsapp-media-error">{mediaError}</p>}
    </div>
    {editable && <><input ref={uploadInputRef} className="marketing-upload-input" type="file" accept="image/*,audio/*" multiple disabled={uploading} onChange={uploadFiles} /><button type="button" className="marketing-upload-control" onClick={() => setShowUploadChoice(true)} disabled={uploading}>{uploading ? "جاري رفع المرفقات..." : "إضافة صور أو تسجيلات صوتية"}</button>{showUploadChoice && <div className="media-choice-backdrop" role="dialog" aria-modal="true"><div className="media-choice-dialog"><h3>إضافة مرفقات المشروع</h3><p>اختر طريقة الإضافة المناسبة لك.</p><div className="media-choice-actions"><button type="button" onClick={chooseLocalUpload}>من مساحة التخزين</button><button type="button" className="media-choice-whatsapp" onClick={chooseWhatsappUpload} disabled={openingWhatsapp}>{openingWhatsapp ? "جاري فتح WhatsApp..." : "عن طريق WhatsApp"}</button></div><div className="media-choice-note"><strong>مهم:</strong> عند اختيار WhatsApp سيفتح لك نص جاهز. لا تحذف ولا تغيّر أي حرف منه؛ أرسله كما هو، ثم أرسل الصور أو التسجيلات، وبعد الانتهاء أرسل: <b>تم</b> أو <b>تمام</b> أو <b>خلصت</b>.</div><button type="button" className="media-choice-cancel" onClick={() => setShowUploadChoice(false)} disabled={openingWhatsapp}>إلغاء</button></div></div>}</>}
    {mediaToDelete && <div className="media-choice-backdrop" role="dialog" aria-modal="true"><div className="media-choice-dialog media-delete-dialog"><h3>حذف المرفق</h3><p>هل تريد حذف هذا المرفق من المشروع؟</p><div className="media-delete-actions"><button type="button" onClick={() => setMediaToDelete(null)} disabled={deletingMedia}>إلغاء</button><button type="button" className="media-delete-confirm" onClick={removeMedia} disabled={deletingMedia}>{deletingMedia ? "جاري الحذف..." : "حذف"}</button></div></div></div>}
    <Lightbox open={viewerIndex !== null} close={() => setViewerIndex(null)} index={viewerIndex || 0} slides={gallerySlides} plugins={[Zoom]} zoom={{ maxZoomPixelRatio: 3, scrollToZoom: true }} />
  </section>;
}

export default WhatsappProjectData;

const MAX_NOTES = 50;
const MAX_NOTE_LENGTH = 500;

const serializeNote = (note) => ({
    id: String(note._id),
    text: note.text,
    createdAt: note.createdAt
});

const ensureEngineer = (req, res) => {
    if (req.user?.role !== "Engineer") {
        res.status(403).json({ status: "error", message: "الملاحظات السريعة متاحة للمهندس فقط." });
        return false;
    }
    return true;
};

const listNotes = async (req, res, next) => {
    try {
        if (!ensureEngineer(req, res)) return;
        const notes = [...(req.user.dashboardNotes || [])]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map(serializeNote);
        return res.status(200).json({ status: "ok", notes });
    } catch (error) {
        next(error);
    }
};

const addNote = async (req, res, next) => {
    try {
        if (!ensureEngineer(req, res)) return;
        const text = String(req.body?.text || "").trim();
        if (!text) return res.status(400).json({ status: "error", message: "اكتب الملاحظة أولًا." });
        if (text.length > MAX_NOTE_LENGTH) {
            return res.status(400).json({ status: "error", message: `الملاحظة لا يمكن أن تتجاوز ${MAX_NOTE_LENGTH} حرفًا.` });
        }

        req.user.dashboardNotes = req.user.dashboardNotes || [];
        req.user.dashboardNotes.push({ text, createdAt: new Date() });
        if (req.user.dashboardNotes.length > MAX_NOTES) {
            req.user.dashboardNotes = req.user.dashboardNotes.slice(-MAX_NOTES);
        }
        await req.user.save();
        const saved = req.user.dashboardNotes[req.user.dashboardNotes.length - 1];
        return res.status(201).json({ status: "ok", note: serializeNote(saved) });
    } catch (error) {
        next(error);
    }
};

const deleteNote = async (req, res, next) => {
    try {
        if (!ensureEngineer(req, res)) return;
        const note = req.user.dashboardNotes?.id(req.params.noteId);
        if (!note) return res.status(404).json({ status: "error", message: "الملاحظة غير موجودة." });
        note.deleteOne();
        await req.user.save();
        return res.status(200).json({ status: "ok" });
    } catch (error) {
        next(error);
    }
};

module.exports = { listNotes, addNote, deleteNote };

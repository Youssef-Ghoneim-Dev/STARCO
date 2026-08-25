function AddPartModal({ open, onClose, onSelect, options = [] }) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="add-part-modal" onClick={(e) => e.stopPropagation()}>
        <h2>إضافة جزء جديد</h2>

        <p>اختر الجزء الذي تريد إضافته</p>

        <div className="part-options">
          {options.map((part) => (
            <button
              key={part.id}
              className="part-option"
              onClick={() => {
                onSelect(part);
                onClose();
              }}
            >
              {part.label}
            </button>
          ))}
        </div>

        <button className="cancel-btn" onClick={onClose}>
          إلغاء
        </button>
      </div>
    </div>
  );
}

export default AddPartModal;

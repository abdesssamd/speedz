export function AdminDialog({
  open,
  title,
  subtitle,
  onClose,
  children,
  size = "md",
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className={`modal-card modal-${size}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-head">
          <div>
            <p className="eyebrow">Formulaire</p>
            <h3>{title}</h3>
            {subtitle ? <p className="muted">{subtitle}</p> : null}
          </div>
          <div className="modal-actions">
            <button type="button" className="ghost small icon-button" onClick={onClose} aria-label="Fermer">
              ×
            </button>
          </div>
        </div>
        {children}
        <div className="modal-footer">
          <button type="button" className="ghost" onClick={onClose}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

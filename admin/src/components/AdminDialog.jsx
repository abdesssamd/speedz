import { useEffect, useRef } from "react";
import { X } from "lucide-react";

/**
 * AdminDialog — Modal de formulaire améliorée
 *
 * Bonnes pratiques appliquées :
 * - Focus piégé à l'intérieur (focus trap) via tabIndex et gestion clavier
 * - Fermeture par Escape
 * - aria-modal + aria-labelledby pour l'accessibilité screen readers
 * - Header structuré : eyebrow / title / subtitle
 * - Footer slot pour les actions de soumission (passé via `actions` prop)
 * - Scroll du corps uniquement (header et footer sticky)
 * - Indicateur d'étapes optionnel (prop `step` / `totalSteps`)
 */
export function AdminDialog({
  open,
  title,
  subtitle,
  onClose,
  children,
  size = "md",
  /** Actions de footer : bouton submit + éventuellement bouton Annuler custom */
  actions,
  /** Pour les formulaires longs multi-étapes */
  step,
  totalSteps,
}) {
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement;

    const focusable = dialogRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable?.length) {
      const firstField = Array.from(focusable).find(
        (el) => el.getAttribute("aria-label") !== "Fermer la fenêtre"
      );
      (firstField || focusable[0]).focus();
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab") return;
      const allFocusable = Array.from(
        dialogRef.current?.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) || []
      );
      if (!allFocusable.length) return;

      const first = allFocusable[0];
      const last = allFocusable[allFocusable.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const titleId = `dialog-title-${(title || "modal").replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="presentation"
      aria-hidden="false"
    >
      <div
        ref={dialogRef}
        className={`modal-card modal-${size}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {/* ── HEADER sticky ─────────────────────────────────────────── */}
        <div className="modal-head">
          <div className="modal-head-content">
            <p className="eyebrow">Formulaire</p>
            <h3 id={titleId}>{title}</h3>
            {subtitle ? <p className="muted modal-subtitle">{subtitle}</p> : null}

            {/* Indicateur d'étapes pour les longs formulaires */}
            {totalSteps && step ? (
              <div
                className="modal-steps"
                aria-label={`Étape ${step} sur ${totalSteps}`}
                role="status"
              >
                {Array.from({ length: totalSteps }, (_, i) => (
                  <span
                    key={i}
                    className={`modal-step-dot ${i + 1 <= step ? "active" : ""}`}
                  />
                ))}
                <span className="modal-step-label">
                  {step} / {totalSteps}
                </span>
              </div>
            ) : null}
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              aria-label="Fermer la fenêtre"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── CORPS scrollable ──────────────────────────────────────── */}
        <div className="modal-body">
          {children}
        </div>

        {/* ── FOOTER sticky ─────────────────────────────────────────── */}
        <div className="modal-footer">
          {actions ? (
            actions
          ) : (
            <button type="button" className="ghost" onClick={onClose}>
              Annuler
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

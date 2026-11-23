import { useState } from "react";
import { CatalogModal } from "./CatalogPage/CatalogPage";

// A confirm dialog that asks why. Used for credential status changes, wallet recovery, burn requests and rejections:
// every one of those is recorded with its reason. `children` can add fields above the reason (e.g. a status choice).
export function ReasonModal({ title, intro, submitLabel = "Confirm", placeholder = "Why?", onClose, onSubmit, children, canSubmit = true }) {
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      await onSubmit(reason.trim());
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <CatalogModal title={title} submitLabel={submitLabel} isSaving={isSaving || !canSubmit || reason.trim().length < 3} onClose={onClose} onSubmit={submit}>
      <div className="space-y-4">
        {intro && <div className="text-[13px] text-ink/75">{intro}</div>}
        {children}
        <div className="space-y-1.5">
          <label htmlFor="reason-text" className="field-label block">
            Reason <span className="text-ink/40">(kept in the history)</span>
          </label>
          <textarea
            id="reason-text"
            className="input-field h-auto resize-none py-2"
            rows={3}
            required
            minLength={3}
            maxLength={500}
            autoFocus
            placeholder={placeholder}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
      </div>
    </CatalogModal>
  );
}

export default function ConfirmDialog({ title, message, confirmLabel = "Confirm", onCancel, onConfirm }) {
  return <div className="modal-backdrop">
    <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <p className="eyebrow">PLEASE CONFIRM</p>
      <h2 id="confirm-title">{title}</h2>
      <p className="muted">{message}</p>
      <div className="form-actions">
        <button className="button button-quiet" onClick={onCancel}>Cancel</button>
        <button className="button button-danger" onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </section>
  </div>;
}

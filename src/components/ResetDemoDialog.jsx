import React from "react";
import ReactDOM from "react-dom";

export default function ResetDemoDialog({onClose}) {
  const doReset = () => {
    Object.keys(localStorage)
      .filter(k => k.startsWith("pt_"))
      .forEach(k => localStorage.removeItem(k));
    window.location.reload();
  };
  return ReactDOM.createPortal(
    <div className="reset-overlay" onClick={onClose}>
      <div className="reset-dialog" onClick={e=>e.stopPropagation()}>
        <div className="reset-dialog-title">⚠️ Reset demo</div>
        <div className="reset-dialog-body">
          Tutti i dati verranno cancellati (schede, sessioni, atleti, calendario). Continuare?
        </div>
        <div className="reset-dialog-actions">
          <button className="btn-ghost" onClick={onClose}>Annulla</button>
          <button className="btn-danger" onClick={doReset}>Reset</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

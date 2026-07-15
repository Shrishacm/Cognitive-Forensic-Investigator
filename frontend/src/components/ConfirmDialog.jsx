import React from 'react'
import { AlertTriangle, X } from 'lucide-react'

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  confirmClassName = 'bg-danger hover:bg-red-600 text-white',
  onConfirm,
  onCancel
}) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-surface-2 border border-line rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-danger/20 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-danger" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-ink-0 text-base">{title}</h2>
            <p className="text-sm text-ink-2 mt-1">{message}</p>
          </div>
          <button
            onClick={onCancel}
            className="text-ink-2 hover:text-ink-0 p-1 transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            id="confirm-dialog-cancel"
            onClick={onCancel}
            className="px-4 py-2 bg-surface-4 text-ink-1 rounded-xl text-sm transition-colors hover:text-ink-0"
          >
            Cancel
          </button>
          <button
            id="confirm-dialog-confirm"
            onClick={() => {
              onConfirm()
              onCancel()
            }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${confirmClassName}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

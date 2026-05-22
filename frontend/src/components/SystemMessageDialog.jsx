import { Info, AlertTriangle, CheckCircle2 } from 'lucide-react'

const VARIANT_ICON = {
  info: Info,
  warning: AlertTriangle,
  error: AlertTriangle,
  success: CheckCircle2,
}

const VARIANT_BUBBLE = {
  info: 'bg-[#0078d4] text-white',
  warning: 'bg-amber-500 text-white',
  error: 'bg-red-600 text-white',
  success: 'bg-emerald-600 text-white',
}

/**
 * Diálogo tipo ventana de sistema (validación / confirmación).
 */
export function SystemMessageDialog({ open, title, message, variant = 'info', onConfirm }) {
  if (!open) return null

  const Icon = VARIANT_ICON[variant] ?? VARIANT_ICON.info
  const bubbleClass = VARIANT_BUBBLE[variant] ?? VARIANT_BUBBLE.info

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/35 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="system-msg-title"
      aria-describedby="system-msg-body"
    >
      <div className="w-full max-w-md overflow-hidden rounded border border-[#adadad] bg-[#f0f0f0] shadow-[2px_2px_12px_rgba(0,0,0,0.35)]">
        <div
          id="system-msg-title"
          className="flex items-center justify-between border-b border-[#adadad] bg-gradient-to-b from-[#ffffff] to-[#ececec] px-3 py-1.5"
        >
          <span className="text-sm font-semibold text-[#000000]">{title}</span>
          <button
            type="button"
            onClick={onConfirm}
            className="flex h-6 w-6 items-center justify-center rounded text-[#666] hover:bg-black/10"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        <div className="bg-white px-4 py-4">
          <div className="flex gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${bubbleClass}`}>
              <Icon className="h-6 w-6" strokeWidth={2} />
            </div>
            <p id="system-msg-body" className="pt-1 text-sm leading-relaxed text-[#1a1a1a]">
              {message}
            </p>
          </div>
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={onConfirm}
              className="min-w-[88px] rounded border border-[#adadad] bg-gradient-to-b from-[#ffffff] to-[#e1e1e1] px-4 py-1.5 text-sm font-medium text-[#000000] shadow-sm hover:from-[#f8f8f8] hover:to-[#d8d8d8] active:border-[#0078d4]"
            >
              Aceptar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

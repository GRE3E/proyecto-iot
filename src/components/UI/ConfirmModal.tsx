import { AlertTriangle, X } from "lucide-react";
import { useThemeByTime } from "../../hooks/useThemeByTime";

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "danger" | "warning" | "info";
}

export default function ConfirmModal({
  isOpen,
  title = "Confirmar acción",
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  onConfirm,
  onCancel,
  variant = "danger",
}: ConfirmModalProps) {
  const { colors } = useThemeByTime();

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: "text-red-500",
      button:
        "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800",
      border: "border-red-500/30",
    },
    warning: {
      icon: "text-amber-500",
      button:
        "bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800",
      border: "border-amber-500/30",
    },
    info: {
      icon: "text-cyan-500",
      button:
        "bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800",
      border: "border-cyan-500/30",
    },
  };

  const style = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div
        className={`relative z-10 w-full max-w-md mx-4 ${colors.cardBg} rounded-2xl shadow-2xl border ${style.border} animate-in fade-in zoom-in-95 duration-200`}
      >
        {/* Close button */}
        <button
          onClick={onCancel}
          className={`absolute top-4 right-4 p-1 rounded-lg ${colors.chipBg} hover:bg-slate-600/50 transition-colors`}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className={`p-3 rounded-xl ${colors.chipBg} ${style.icon}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className={`text-lg font-bold ${colors.text} mb-2`}>
                {title}
              </h3>
              <p className={`text-sm ${colors.mutedText}`}>{message}</p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancel}
              className={`px-4 py-2.5 rounded-xl font-semibold ${colors.chipBg} ${colors.chipText} hover:bg-slate-600/50 transition-all`}
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2.5 rounded-xl font-semibold text-white ${style.button} transition-all shadow-lg`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

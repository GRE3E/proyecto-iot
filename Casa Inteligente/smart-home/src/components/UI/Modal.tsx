"use client";

import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useThemeByTime } from "../../hooks/useThemeByTime";

interface ModalProps {
  title?: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  closeLabel?: string;
  panelClassName?: string;
  backdropClassName?: string;
}

export default function Modal({
  title,
  isOpen,
  onClose,
  children,
  className = "",
  closeLabel = "Cerrar",
  panelClassName = "max-w-md",
  backdropClassName = "bg-black/60",
}: ModalProps) {
  if (typeof window === "undefined") return null; // seguridad SSR
  const { colors } = useThemeByTime();

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal-backdrop"
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className={`absolute inset-0 ${backdropClassName}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="modal-panel"
            className={`relative w-[94%] ${panelClassName} rounded-2xl p-6 ${colors.cardBg} shadow-lg ${colors.text} ${className}`}
            initial={{ y: 20, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 12, scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
          >
            {/* Botón cerrar */}
            <button
              onClick={onClose}
              aria-label={closeLabel}
              className="absolute top-3 right-3 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Título */}
            {title && <h3 className="text-xl font-semibold mb-4">{title}</h3>}

            {/* Contenido */}
            <div>{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body // 🔥 se renderiza sobre todo
  );
}

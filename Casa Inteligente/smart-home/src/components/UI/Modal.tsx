//Ventanas emergentes o confirmacion
"use client";

import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface ModalProps {
  title?: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  closeLabel?: string;
}

export default function Modal({
  title,
  isOpen,
  onClose,
  children,
  className = "",
  closeLabel = "Cerrar",
}: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal panel */}
          <motion.div
            key="modal-panel"
            className={`relative w-[90%] max-w-md rounded-2xl p-6 bg-slate-900 shadow-lg text-white ${className}`}
            initial={{ y: 20, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 12, scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              aria-label={closeLabel}
              className="absolute top-3 right-3 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Title */}
            {title && <h3 className="text-xl font-semibold mb-4">{title}</h3>}

            {/* Content */}
            <div>{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

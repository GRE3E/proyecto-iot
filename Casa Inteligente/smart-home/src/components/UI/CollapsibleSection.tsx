"use client";
import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useThemeByTime } from "../../hooks/useThemeByTime";

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  children,
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { colors } = useThemeByTime();

  return (
    <div className="rounded-xl border border-slate-700/40 bg-slate-800/40 p-4">
      <button
        className="flex w-full items-center justify-between text-sm font-semibold text-slate-200"
        onClick={() => setIsOpen(!isOpen)}
      >
        {title}
        <ChevronDown
          className={`h-5 w-5 transform transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      {isOpen && <div className="mt-4">{children}</div>}
    </div>
  );
};

export default CollapsibleSection;
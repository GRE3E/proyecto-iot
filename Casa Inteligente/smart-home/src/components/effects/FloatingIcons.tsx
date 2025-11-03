// src/components/effects/FloatingIcons.tsx
"use client";

import React, { useMemo } from "react";
import { Lock, User } from "lucide-react";

interface FloatingIconsProps {
  variant?: "default" | "extended" | "minimal";
}

const FloatingIcons: React.FC<FloatingIconsProps> = ({}) => {
  const colors = [
    "text-blue-400/40",
    "text-indigo-400/40",
    "text-slate-400/40",
    "text-blue-300/40",
    "text-cyan-400/35",
    "text-purple-400/40",
    "text-sky-400/40",
    "text-violet-400/40",
    "text-teal-400/40",
    "text-emerald-400/40",
  ];

  const generateIcons = useMemo(() => {
    const lockIcons = Array.from({ length: 20 }, (_, i) => ({
      Icon: Lock,
      delay: `${(i * 0.5) % 10}s`,
      color: colors[i % colors.length],
      left: `${Math.random() * 90 + 5}%`,
      top: `${Math.random() * 90 + 5}%`,
      id: `lock-${i}`,
    }));

    const userIcons = Array.from({ length: 20 }, (_, i) => ({
      Icon: User,
      delay: `${(i * 0.5 + 5) % 10}s`,
      color: colors[i % colors.length],
      left: `${Math.random() * 90 + 5}%`,
      top: `${Math.random() * 90 + 5}%`,
      id: `user-${i}`,
    }));

    return [...lockIcons, ...userIcons];
  }, []);

  const icons = generateIcons;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {icons.map(({ Icon, delay, color, left, top, id }) => (
        <div
          key={id}
          className={`absolute ${color} animate-float-slow`}
          style={{ left, top, animationDelay: delay }}
        >
          <Icon size={32} strokeWidth={1} />
        </div>
      ))}
    </div>
  );
};

export default FloatingIcons;
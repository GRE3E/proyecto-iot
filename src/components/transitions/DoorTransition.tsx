import React from "react";

interface DoorTransitionProps {
  theme: "dark" | "light";
}

const DoorTransition: React.FC<DoorTransitionProps> = ({ theme }) => {
  const themeBackground =
    theme === "light"
      ? "linear-gradient(180deg, rgba(240,244,250,0.95) 0%, rgba(230,236,245,0.95) 100%)"
      : "linear-gradient(180deg, rgba(8,12,24,0.95) 0%, rgba(6,10,20,0.95) 100%)";

  const lightGradient =
    theme === "light"
      ? "linear-gradient(180deg, rgba(180,200,255,0.95), rgba(140,180,255,0.9))"
      : "linear-gradient(180deg, rgba(165,180,252,0.95), rgba(139,92,246,0.9))";

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black">
      <div
        className="absolute inset-0"
        style={{
          background: themeBackground,
          filter: "blur(14px)",
          opacity: 0.9,
          transform: "scale(1.02)",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          style={{
            width: 260,
            height: 420,
            background: lightGradient,
            filter: "blur(100px)",
            opacity: 0.65,
            borderRadius: 999,
          }}
          className="animate-light-reveal"
        />
      </div>

      <div className="absolute inset-0" style={{ perspective: "2000px" }}>
        <div
          className="absolute left-0 top-0 w-1/2 h-full origin-left animate-door-open-left"
          style={{ transformStyle: "preserve-3d" }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#071022] via-[#0d1424] to-[#0f1b37] shadow-[inset_-60px_0_120px_rgba(0,120,255,0.12)]" />
          <div className="absolute right-[6%] top-1/2 -translate-y-1/2 w-[10px] h-[60px] rounded-full bg-gradient-to-b from-gray-200 to-gray-500" />
        </div>
        <div
          className="absolute right-0 top-0 w-1/2 h-full origin-right animate-door-open-right"
          style={{ transformStyle: "preserve-3d" }}
        >
          <div className="absolute inset-0 bg-gradient-to-l from-[#071022] via-[#0d1424] to-[#0f1b37] shadow-[inset_60px_0_120px_rgba(130,60,255,0.08)]" />
          <div className="absolute left-[6%] top-1/2 -translate-y-1/2 w-[10px] h-[60px] rounded-full bg-gradient-to-b from-gray-200 to-gray-500" />
        </div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          style={{
            width: 10,
            height: "75%",
            background: lightGradient,
            filter: "blur(24px)",
            opacity: 0.85,
          }}
          className="animate-light-pulse"
        />
      </div>
    </div>
  );
};

export default DoorTransition;

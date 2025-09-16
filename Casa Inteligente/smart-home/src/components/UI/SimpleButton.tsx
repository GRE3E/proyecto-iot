"use client"
import React from "react"

const SimpleButton = React.memo(({ children, onClick, active = false, className = "" }: any) => (
  <button
    onClick={onClick}
    className={`px-6 py-3 rounded-xl font-semibold transition-all duration-500 transform hover:scale-105 ${
      active
        ? "bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25"
        : "bg-slate-800/50 text-slate-300 border border-slate-600/50 hover:bg-slate-700/60 hover:border-slate-500/60 hover:shadow-md hover:shadow-cyan-500/10"
    } ${className}`}
  >
    {children}
  </button>
))

export default SimpleButton

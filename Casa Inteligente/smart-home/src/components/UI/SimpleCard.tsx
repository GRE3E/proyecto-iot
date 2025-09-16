"use client"
import React from "react"

const SimpleCard = React.memo(({ children, className = "" }: any) => (
  <div
    className={`bg-slate-800/30 backdrop-blur-xl border border-slate-600/30 rounded-2xl transition-all duration-500 hover:bg-slate-800/40 hover:border-slate-500/40 hover:shadow-lg hover:shadow-purple-500/10 ${className}`}
  >
    {children}
  </div>
))

export default SimpleCard

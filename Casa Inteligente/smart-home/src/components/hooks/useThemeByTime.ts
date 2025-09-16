import { useState, useEffect } from "react"

type Theme = "day" | "afternoon" | "night"

export function useThemeByTime() {
  const [themeByTime, setThemeByTime] = useState<Theme>("night")

  useEffect(() => {
    const updateTheme = () => {
      const hour = new Date().getHours()

      if (hour >= 6 && hour < 12) {
        setThemeByTime("day")
      } else if (hour >= 12 && hour < 18) {
        setThemeByTime("afternoon")
      } else {
        setThemeByTime("night")
      }
    }

    updateTheme()
    const interval = setInterval(updateTheme, 60000)
    return () => clearInterval(interval)
  }, [])

  return themeByTime
}

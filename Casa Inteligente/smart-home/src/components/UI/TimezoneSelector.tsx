// ============================================
// components/UI/TimezoneSelector.tsx
// ============================================
"use client"

import { Globe } from "lucide-react"
import SimpleCard from "./Card"
import type { TimezoneConfig } from "../../hooks/useZonaHoraria"
import { useThemeByTime } from "../../hooks/useThemeByTime"

interface TimezoneSelectorProps {
  selectedTimezone: TimezoneConfig | null
  onTimezoneChange: (timezoneString: string) => void
}

export default function TimezoneSelector({
  selectedTimezone,
  onTimezoneChange,
}: TimezoneSelectorProps) {
  const { colors } = useThemeByTime()
  return (
    <SimpleCard className="p-4 flex items-center justify-between">
      <div>
        <div className={`${colors.text} flex items-center gap-2 font-medium text-sm`}>
          <Globe className="w-4 h-4" /> Zona horaria
        </div>
        <div className={`text-xs ${colors.mutedText}`}>
          {selectedTimezone?.region || "Selecciona una zona"}
        </div>
      </div>
      <select
        value={selectedTimezone?.timezone || ""}
        onChange={(e) => onTimezoneChange(e.target.value)}
        className={`${colors.inputBg} ${colors.text} rounded px-2 py-1 text-sm border ${colors.inputBorder} hover:border-blue-500 transition-colors`}
      >
        <option value="">Selecciona una zona horaria</option>
        <optgroup label="América">
          <option value="America/Anchorage">(UTC-09:00) Alaska</option>
          <option value="America/Vancouver">(UTC-08:00) Pacific Time - Vancouver</option>
          <option value="America/Los_Angeles">(UTC-08:00) Pacific Time - Los Angeles</option>
          <option value="America/Denver">(UTC-07:00) Mountain Time - Denver</option>
          <option value="America/Phoenix">(UTC-07:00) Mountain Time - Phoenix</option>
          <option value="America/Chicago">(UTC-06:00) Central Time - Chicago</option>
          <option value="America/Mexico_City">(UTC-06:00) Central Time - Mexico City</option>
          <option value="America/New_York">(UTC-05:00) Eastern Time - New York</option>
          <option value="America/Toronto">(UTC-05:00) Eastern Time - Toronto</option>
          <option value="America/Bogota">(UTC-05:00) Bogotá</option>
          <option value="America/Lima">(UTC-05:00) Lima</option>
          <option value="America/Caracas">(UTC-04:00) Caracas</option>
          <option value="America/La_Paz">(UTC-04:00) La Paz</option>
          <option value="America/Santiago">(UTC-03:00) Santiago</option>
          <option value="America/Argentina/Buenos_Aires">(UTC-03:00) Buenos Aires</option>
          <option value="America/Sao_Paulo">(UTC-03:00) São Paulo</option>
          <option value="America/Godthab">(UTC-03:00) Greenland</option>
        </optgroup>
        <optgroup label="Europa">
          <option value="Europe/London">(UTC+00:00) London</option>
          <option value="Europe/Lisbon">(UTC+00:00) Lisbon</option>
          <option value="Africa/Casablanca">(UTC+00:00) Casablanca</option>
          <option value="Europe/Paris">(UTC+01:00) Paris</option>
          <option value="Europe/Madrid">(UTC+01:00) Madrid</option>
          <option value="Europe/Berlin">(UTC+01:00) Berlin</option>
          <option value="Europe/Rome">(UTC+01:00) Rome</option>
          <option value="Europe/Amsterdam">(UTC+01:00) Amsterdam</option>
          <option value="Europe/Brussels">(UTC+01:00) Brussels</option>
          <option value="Europe/Vienna">(UTC+01:00) Vienna</option>
          <option value="Europe/Prague">(UTC+01:00) Prague</option>
          <option value="Europe/Budapest">(UTC+01:00) Budapest</option>
          <option value="Europe/Warsaw">(UTC+01:00) Warsaw</option>
          <option value="Europe/Istanbul">(UTC+03:00) Istanbul</option>
          <option value="Europe/Moscow">(UTC+03:00) Moscow</option>
        </optgroup>
        <optgroup label="Asia">
          <option value="Asia/Dubai">(UTC+04:00) Dubai</option>
          <option value="Asia/Kolkata">(UTC+05:30) India</option>
          <option value="Asia/Bangkok">(UTC+07:00) Bangkok</option>
          <option value="Asia/Ho_Chi_Minh">(UTC+07:00) Ho Chi Minh</option>
          <option value="Asia/Shanghai">(UTC+08:00) Shanghai</option>
          <option value="Asia/Hong_Kong">(UTC+08:00) Hong Kong</option>
          <option value="Asia/Singapore">(UTC+08:00) Singapore</option>
          <option value="Asia/Tokyo">(UTC+09:00) Tokyo</option>
          <option value="Asia/Seoul">(UTC+09:00) Seoul</option>
          <option value="Australia/Sydney">(UTC+10:00) Sydney</option>
          <option value="Pacific/Auckland">(UTC+12:00) Auckland</option>
        </optgroup>
        <optgroup label="África">
          <option value="Africa/Cairo">(UTC+02:00) Cairo</option>
          <option value="Africa/Johannesburg">(UTC+02:00) Johannesburg</option>
          <option value="Africa/Lagos">(UTC+01:00) Lagos</option>
          <option value="Africa/Nairobi">(UTC+03:00) Nairobi</option>
        </optgroup>
      </select>
    </SimpleCard>
  )
}
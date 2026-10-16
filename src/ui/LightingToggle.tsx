import type { LightingMode } from '../config/lighting'

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
      <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
      <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" />
    </svg>
  )
}

function SunsetIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
      <path d="M7 16a5 5 0 0 1 10 0" fill="currentColor" stroke="none" />
      <path d="M2.5 16.5h19M5.5 20h13M12 4.5v3M4.9 8.9l1.7 1.7M19.1 8.9l-1.7 1.7" />
    </svg>
  )
}

const OPTIONS: { mode: LightingMode; label: string; Icon: () => React.JSX.Element }[] = [
  { mode: 'daylight', label: 'Daylight', Icon: SunIcon },
  { mode: 'sunset', label: 'Sunset', Icon: SunsetIcon },
]

interface LightingToggleProps {
  mode: LightingMode
  onChange: (mode: LightingMode) => void
}

/** Two-way Daylight / Sunset switch that sits beside the Guide button. */
export function LightingToggle({ mode, onChange }: LightingToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Lighting"
      className="flex items-center gap-0.5 rounded-full border border-illini-blue/10 bg-cream p-1 shadow-chip"
    >
      {OPTIONS.map(({ mode: option, label, Icon }) => {
        const active = option === mode
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => onChange(option)}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 font-display text-[0.78rem] font-bold transition-colors duration-300 ${
              active ? 'bg-illini-blue text-cream shadow-[0_2px_0_var(--color-illini-orange)]' : 'text-illini-blue/65 hover:bg-illini-blue/[0.06] hover:text-illini-blue'
            }`}
          >
            <span className={active ? 'text-illini-orange' : ''}>
              <Icon />
            </span>
            <span className="max-sm:hidden">{label}</span>
          </button>
        )
      })}
    </div>
  )
}

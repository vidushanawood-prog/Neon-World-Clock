import React from 'react';

interface AnalogClockProps {
  hour24: number;
  minute: number;
  second: number;
  isDaytime: boolean;
  showSeconds?: boolean;
  size?: number;
}

const HOUR_TICKS = Array.from({ length: 12 }, (_, i) => i);

export const AnalogClock: React.FC<AnalogClockProps> = React.memo(
  ({ hour24, minute, second, isDaytime, showSeconds = true, size = 104 }) => {
    const hourAngle = ((hour24 % 12) + minute / 60 + second / 3600) * 30;
    const minuteAngle = (minute + second / 60) * 6;
    const secondAngle = second * 6;

    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        role="img"
        aria-label={`Analog clock showing ${hour24 % 12 || 12}:${String(minute).padStart(2, '0')}`}
        className="shrink-0 select-none"
      >
        {/* Outer dial ring */}
        <circle
          cx="60"
          cy="60"
          r="55"
          className={
            isDaytime
              ? 'fill-slate-100/80 stroke-amber-400/50 dark:fill-slate-950/85 dark:stroke-amber-400/35'
              : 'fill-slate-100/80 stroke-indigo-400/50 dark:fill-slate-950/90 dark:stroke-indigo-400/35'
          }
          strokeWidth="2"
        />

        {/* Subtle inner chapter ring */}
        <circle
          cx="60"
          cy="60"
          r="48"
          className="fill-none stroke-slate-300/60 dark:stroke-white/[0.07]"
          strokeWidth="1"
        />

        {/* 12 hour indices */}
        {HOUR_TICKS.map((idx) => {
          const isCardinal = idx % 3 === 0;
          const angle = idx * 30;
          return (
            <line
              key={idx}
              x1="60"
              y1={isCardinal ? '11' : '13'}
              x2="60"
              y2={isCardinal ? '19' : '17'}
              transform={`rotate(${angle} 60 60)`}
              strokeLinecap="round"
              className={
                isCardinal
                  ? 'stroke-slate-700 dark:stroke-slate-200'
                  : 'stroke-slate-400 dark:stroke-slate-500'
              }
              strokeWidth={isCardinal ? '2.2' : '1.4'}
            />
          );
        })}

        {/* Hour hand */}
        <line
          x1="60"
          y1="65"
          x2="60"
          y2="32"
          strokeLinecap="round"
          strokeWidth="3.4"
          transform={`rotate(${hourAngle} 60 60)`}
          className="stroke-slate-900 dark:stroke-white"
        />

        {/* Minute hand */}
        <line
          x1="60"
          y1="66"
          x2="60"
          y2="20"
          strokeLinecap="round"
          strokeWidth="2.4"
          transform={`rotate(${minuteAngle} 60 60)`}
          className="stroke-slate-700 dark:stroke-slate-200"
        />

        {/* Second hand */}
        {showSeconds && (
          <line
            x1="60"
            y1="72"
            x2="60"
            y2="16"
            strokeLinecap="round"
            strokeWidth="1.2"
            transform={`rotate(${secondAngle} 60 60)`}
            className={
              isDaytime
                ? 'stroke-amber-500 dark:stroke-amber-400'
                : 'stroke-sky-500 dark:stroke-sky-400'
            }
          />
        )}

        {/* Center pinion cap */}
        <circle
          cx="60"
          cy="60"
          r="3.4"
          className={
            isDaytime
              ? 'fill-amber-500 dark:fill-amber-400'
              : 'fill-sky-500 dark:fill-sky-400'
          }
        />
        <circle cx="60" cy="60" r="1.4" className="fill-white dark:fill-slate-950" />
      </svg>
    );
  }
);

AnalogClock.displayName = 'AnalogClock';

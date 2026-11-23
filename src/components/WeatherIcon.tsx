import React from 'react';
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Moon,
  Sun,
} from 'lucide-react';
import type { WeatherIconKind } from '../services/intelligence';

interface WeatherIconProps {
  kind: WeatherIconKind;
  className?: string;
}

export const WeatherIcon: React.FC<WeatherIconProps> = ({ kind, className = 'h-3.5 w-3.5' }) => {
  switch (kind) {
    case 'clear-day':
      return <Sun className={`${className} text-amber-500 dark:text-amber-300`} aria-hidden="true" />;
    case 'clear-night':
      return <Moon className={`${className} text-indigo-500 dark:text-indigo-300`} aria-hidden="true" />;
    case 'partly-cloudy':
      return <CloudSun className={`${className} text-amber-500 dark:text-amber-300`} aria-hidden="true" />;
    case 'cloudy':
      return <Cloud className={`${className} text-slate-400 dark:text-slate-300`} aria-hidden="true" />;
    case 'fog':
      return <CloudFog className={`${className} text-slate-400 dark:text-slate-300`} aria-hidden="true" />;
    case 'rain':
      return <CloudRain className={`${className} text-sky-500 dark:text-sky-400`} aria-hidden="true" />;
    case 'snow':
      return <CloudSnow className={`${className} text-cyan-400 dark:text-cyan-200`} aria-hidden="true" />;
    case 'storm':
      return <CloudLightning className={`${className} text-amber-500 dark:text-yellow-300`} aria-hidden="true" />;
    default:
      return <Cloud className={`${className} text-slate-400`} aria-hidden="true" />;
  }
};

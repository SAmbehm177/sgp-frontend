import React from 'react';

interface ProgressBarProps {
  progress: number; // 0 to 100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
  colorClass?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  size = 'md',
  showLabel = true,
  className = '',
  colorClass,
}) => {
  const clamped = Math.min(100, Math.max(0, Math.round(progress)));

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  // Automatic color gradient if not provided
  const fillBg =
    colorClass ||
    (clamped >= 100
      ? 'bg-emerald-600'
      : clamped >= 60
      ? 'bg-blue-600'
      : clamped >= 30
      ? 'bg-amber-500'
      : 'bg-slate-500');

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1 text-xs">
          <span className="text-slate-500 font-medium">Avancement</span>
          <span className="font-mono tabular-nums font-semibold text-slate-800">{clamped}%</span>
        </div>
      )}
      <div className={`w-full bg-slate-200/80 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className={`${fillBg} ${sizeClasses[size]} rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
};

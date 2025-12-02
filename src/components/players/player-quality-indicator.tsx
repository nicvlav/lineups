/**
 * Player Quality Indicator Component
 *
 * Displays player quality level with visual indicators (stars, labels, colors).
 * Uses centralized quality thresholds for consistency across the app.
 */

import React from 'react';
import { getRatingTierScheme } from '@/lib/color-system';

interface PlayerQualityIndicatorProps {
  overall: number;
  showLabel?: boolean;
  showDescription?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact' | 'badge';
}

const PlayerQualityIndicator: React.FC<PlayerQualityIndicatorProps> = ({
  overall,
  showLabel = true,
  showDescription = false,
  size = 'md',
  variant = 'default'
}) => {
  const quality = getRatingTierScheme(overall);

  // Size configurations
  const sizeConfig = {
    sm: {
      star: 'w-3 h-3',
      text: 'text-xs',
      gap: 'gap-1',
      padding: 'px-2 py-1'
    },
    md: {
      star: 'w-4 h-4',
      text: 'text-sm',
      gap: 'gap-1.5',
      padding: 'px-3 py-1.5'
    },
    lg: {
      star: 'w-5 h-5',
      text: 'text-base',
      gap: 'gap-2',
      padding: 'px-4 py-2'
    }
  };

  const config = sizeConfig[size];

  // Render variants
  if (variant === 'badge') {
    return (
      <div
        className={`inline-flex items-center ${config.gap} ${config.padding} rounded-full ${quality.subtle} border ${quality.solid} font-semibold ${config.text}`}
      >
        <span>{quality.label}</span>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center ${config.gap} ${quality.solidBg}`}>
        {showLabel && <span className={`font-semibold ${config.text}`}>{quality.label}</span>}
      </div>
    );
  }

  // Default variant
  return (
    <div className={`flex flex-col ${config.gap}`}>
      <div className={`flex items-center ${config.gap}`}>
        {showLabel && (
          <span className={`font-semibold ${config.text} ${quality.solidBg}`}>
            {quality.label}
          </span>
        )}
      </div>
      {showDescription && (
        <span className={`text-xs text-muted-foreground`}>{quality.label}</span>
      )}
    </div>
  );
};

export default PlayerQualityIndicator;

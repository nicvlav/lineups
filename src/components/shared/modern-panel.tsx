/**
 * Modern Panel Component
 *
 * Smart, responsive panel component that adapts to content.
 * Supports grid layouts with automatic stacking on mobile.
 */

import React from 'react';
import { motion } from 'framer-motion';

interface ModernPanelProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'card' | 'glass' | 'flat';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  minWidth?: string;
  maxWidth?: string;
}

const ModernPanel: React.FC<ModernPanelProps> = ({
  children,
  className = '',
  variant = 'default',
  padding = 'md',
  minWidth,
  maxWidth
}) => {
  // Variant styles
  const variantStyles = {
    default: 'bg-muted/20 backdrop-blur-sm border border-border/20 shadow-lg',
    card: 'bg-background border border-border/40 shadow-md',
    glass: 'bg-background/50 backdrop-blur-md border border-border/30 shadow-xl',
    flat: 'bg-background/80 border border-border/20'
  };

  // Padding styles
  const paddingStyles = {
    none: 'p-0',
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6'
  };

  // Inline styles for min/max width
  const style: React.CSSProperties = {
    minWidth: minWidth,
    maxWidth: maxWidth
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`rounded-lg overflow-hidden ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`}
      style={style}
    >
      {children}
    </motion.div>
  );
};

/**
 * Grid Panel Section
 * Automatically stacks on mobile, grid on desktop
 */
interface GridPanelSectionProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const GridPanelSection: React.FC<GridPanelSectionProps> = ({
  children,
  columns = 2,
  gap = 'md',
  className = ''
}) => {
  const gapStyles = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6'
  };

  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  };

  return (
    <div className={`grid ${gridCols[columns]} ${gapStyles[gap]} ${className}`}>
      {children}
    </div>
  );
};

/**
 * Panel Section with Header
 */
interface PanelSectionProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
}

export const PanelSection: React.FC<PanelSectionProps> = ({
  title,
  subtitle,
  children,
  className = '',
  headerAction
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {(title || subtitle || headerAction) && (
        <div className="flex items-start justify-between">
          <div>
            {title && (
              <h3 className="font-bold text-sm tracking-wide text-foreground uppercase">
                {title}
              </h3>
            )}
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

export default ModernPanel;

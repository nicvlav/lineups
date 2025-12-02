/**
 * Relative Archetype Bars Component
 *
 * Modern, sleek archetype visualization that shows all archetypes relative to the player's best score.
 * - Always normalizes to best score = 100%
 * - Uses logarithmic scaling for better visual distinction
 * - Shows perfect score indicator (100.0) for top archetypes
 * - Expandable to show all archetypes
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { getArchetypeById } from '@/types/archetypes';
import { getArchetypeBarColor, getArchetypeTextColor } from '@/lib/color-system';
import { calculateRelativeScore, applyVisualScaling } from '@/lib/utils/relative-scoring';

interface ArchetypeScore {
  archetypeId: string;
  score: number;
  relativeScore: number;
  visualWidth: number; // Logarithmically scaled for display (0-100)
}

interface RelativeArchetypeBarsProps {
  archetypes: Array<{ archetypeId: string; score: number }>;
  bestScore: number;
  maxVisibleDefault?: number;
  showNumbers?: boolean;
  compact?: boolean;
}

// Visual scaling and relative scoring now imported from unified system
// This ensures consistency with player dialog and all other components

const RelativeArchetypeBars: React.FC<RelativeArchetypeBarsProps> = ({
  archetypes,
  bestScore,
  maxVisibleDefault = 5,
  showNumbers = false,
  compact = false
}) => {
  const [expanded, setExpanded] = useState(false);

  const processedArchetypes: ArchetypeScore[] = archetypes
    .map(({ archetypeId, score }) => {
      // Use unified relative score calculation
      const relativeScore = calculateRelativeScore(score, bestScore);

      return {
        archetypeId,
        score,
        relativeScore,
        visualWidth: applyVisualScaling(relativeScore),
      };
    })
    .sort((a, b) => b.score - a.score); // Sort by actual score

  // Split into visible and expandable
  const visibleArchetypes = processedArchetypes.slice(0, maxVisibleDefault);
  const hiddenArchetypes = processedArchetypes.slice(maxVisibleDefault);
  const hasHidden = hiddenArchetypes.length > 0;

  const displayedArchetypes = expanded ? processedArchetypes : visibleArchetypes;

  const relativeMax = visibleArchetypes
    .reduce((prev, curr) => {
      return Math.max(prev, curr.score);
    }, 0)

  return (
    <div className="space-y-1.5">
      {displayedArchetypes.map(({ archetypeId, score, relativeScore, visualWidth }) => {
        const archetype = getArchetypeById(archetypeId);
        if (!archetype) return null;

        return (
          <motion.div
            key={archetypeId}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2"
          >
            {/* Archetype Name & Badges */}
            <div className="flex items-center gap-1.5 min-w-[140px]">
              <span
                className={`text-xs ${score == relativeMax
                  ? 'font-semibold text-foreground'
                  : 'font-normal text-muted-foreground'
                  } ${compact ? 'text-[11px]' : ''}`}
              >
                {archetype.name}
              </span>
            </div>

            {/* Relative Bar with Logarithmic Scaling */}
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-muted/50 rounded-full overflow-hidden relative">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${visualWidth}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className={`h-1.5 rounded-full ${getArchetypeBarColor(
                    relativeScore
                  )}`}
                />
              </div>

              {/* Score Display */}
              {showNumbers && (
                <div className="flex items-center gap-1">
                  <span
                    className={`text-xs font-semibold w-8 text-right tabular-nums ${getArchetypeTextColor(
                      relativeScore
                    )}`}
                  >
                    {Math.round(score)}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        );
      })}

      {/* Expand/Collapse Button */}
      {hasHidden && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-2 px-2 py-1 rounded hover:bg-accent/50"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3 h-3" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" />
              Show {hiddenArchetypes.length} more
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default RelativeArchetypeBars;

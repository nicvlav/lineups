/**
 * Player Quality & Specialist Determination System
 *
 * Centralized system for determining player quality levels and specialist roles.
 * This provides consistent player ratings across the entire application.
 */

import type { Position, StarZoneClassification } from '@/types/positions';
import type { PlayerArchetypeScores } from '@/types/players';
import { getArchetypeById } from '@/types/archetypes';
import type { ZoneScores } from "@/types/players";

// ============ Quality Tiers ============

export type QualityTier = 'elite' | 'impactful' | 'good' | 'solid';

export interface QualityInfo {
  tier: QualityTier;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

/**
 * Quality thresholds based on overall rating
 * Matches star distribution system (87+ for star players)
 */
export const QUALITY_THRESHOLDS = {
  ELITE: 93,    // Elite world-class players
  IMPACTFUL: 85,     // Star players, game changers
  GOOD: 75,    // Solid reliable performers
  SOLID: 0,     // Squad depth players
} as const;

/**
 * Get quality tier from overall rating
 */
export function getQualityTier(overall: number): QualityTier {
  if (overall >= QUALITY_THRESHOLDS.ELITE) return 'elite';
  if (overall >= QUALITY_THRESHOLDS.IMPACTFUL) return 'impactful';
  if (overall >= QUALITY_THRESHOLDS.GOOD) return 'good';
  return 'solid';
}

/**
 * Get quality information for display
 */
export function getQualityInfo(overall: number): QualityInfo {
  const tier = getQualityTier(overall);

  const qualityMap: Record<QualityTier, QualityInfo> = {
    elite: {
      tier: 'elite',
      label: 'Elite',
      description: 'Key player',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/20',
      borderColor: 'border-emerald-400/70'
    },
    impactful: {
      tier: 'impactful',
      label: 'impactful',
      description: 'Key player',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      borderColor: 'border-blue-400/70'
    },
    good: {
      tier: 'good',
      label: 'Good Player',
      description: 'Good Player',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/20',
      borderColor: 'border-amber-400/70'
    },
    solid: {
      tier: 'solid',
      label: 'Solid',
      description: 'eliable performer',
      color: 'text-slate-400',
      bgColor: 'bg-slate-500/20',
      borderColor: 'border-slate-400/70'
    }
  };

  return qualityMap[tier];
}

// ============ Specialist Determination ============
/**
 * Specialist threshold: difference between best and second-best position
 */
export const SPECIALIST_THRESHOLD = 3;

/**
 * Determine if player is a specialist and get their primary role
 */
export function getPrimaryArchetypeId(archetypeScores: PlayerArchetypeScores): string | null {
  // Get all position scores (excluding GK for now)
  const positions = Object.entries(archetypeScores)
    .filter(([pos]) => pos !== 'GK')
    .map(([_, data]) => ({
      score: data.bestScore,
      archetypeId: data.bestArchetypeId
    }))
    .sort((a, b) => b.score - a.score);

  return positions.length ? positions[0].archetypeId : null;
}

/**
 * Generate play style buzzwords based on archetype strengths
 */
export function getPlayStyleBuzzwords(archetypeId: string | null): string[] {
  if (!archetypeId) return [];

  const archetype = getArchetypeById(archetypeId);
  if (!archetype) return [];

  // Return up to 3 strength labels as buzzwords
  return archetype.strengthLabels.slice(0, 3);
}

// ============ Zone Classification (Generic) ============

/**
 * Classifies a star player by their zone specialization using relative weighting
 *
 * Uses a gradient system instead of hard thresholds:
 * - Calculates defensive vs attacking lean as a continuous value (-1 to +1)
 * - -1.0 = pure defensive specialist
 * - +1.0 = pure attacking specialist
 * -  0.0 = perfectly balanced all-rounder
 *
 * Classification labels are just for readability - the lean value is what matters.
 *
 * @param player The star player to classify
 * @returns Classification with specialist type and lean
 */
/**
 * Position zone weights - accounts for hybrid positions
 * Each position's weights sum to 1.0
 */
const POSITION_ZONE_WEIGHTS: Record<Position, { def: number; mid: number; att: number }> = {
  // Pure Defensive
  CB: { def: 1.0, mid: 0.0, att: 0.0 },
  FB: { def: 0.7, mid: 0.3, att: 0.0 }, // FB overlaps into midfield

  // Defensive Midfield
  DM: { def: 0.6, mid: 0.4, att: 0.0 }, // DM is hybrid def/mid

  // Pure Midfield
  CM: { def: 0.0, mid: 1.0, att: 0.0 },
  WM: { def: 0.0, mid: 0.7, att: 0.3 }, // WM can push forward

  // Attacking Midfield
  AM: { def: 0.0, mid: 0.7, att: 0.3 }, // AM is hybrid mid/att

  // Pure Attack
  ST: { def: 0.0, mid: 0.0, att: 1.0 },
  WR: { def: 0.0, mid: 0.0, att: 1.0 },

  // Goalkeeper (not used in classification)
  GK: { def: 0.0, mid: 0.0, att: 0.0 }
};

export function classifyPlayerByZone(zoneFit: ZoneScores): StarZoneClassification {
  // Find best scores in defensive and attacking zones
  const bestDefensiveScore = Math.max(zoneFit.CB, zoneFit.FB);
  const bestMidfieldScore = Math.max(zoneFit.DM, zoneFit.CM, zoneFit.WM);
  const bestAttackingScore = Math.max(zoneFit.ST, zoneFit.WR, zoneFit.AM);
  const bestScore = Math.max(bestDefensiveScore, bestMidfieldScore, bestAttackingScore);
  let sum = 0;
  let count = 0;

  const qualifyingPositions: Position[] = [];

  Object.keys(zoneFit).forEach(key => {
    const pos = key as Position;
    const score = zoneFit[pos];
    sum += score;
    count++;
    if ((score >= 90) || (score >= (bestScore - 3))) {
      qualifyingPositions.push(pos);
    }
  });

  const averageScore = count > 0 ? sum / count : 0.0;

  // Calculate weighted zone scores
  let defScore = 0;
  let midScore = 0;
  let attScore = 0;

  for (const pos of qualifyingPositions) {
    const weights = POSITION_ZONE_WEIGHTS[pos];
    defScore += weights.def;
    midScore += weights.mid;
    attScore += weights.att;
  }

  let specialistType: 'Defender' | 'Attacker' | 'Midfielder' | 'All-rounder';

  const totalWeightedScore = (defScore + midScore + attScore) * bestScore;

  if (totalWeightedScore === 0) {
    specialistType = 'All-rounder';
  } else {
    // Calculate weighted proportions
    const defProp = defScore * bestDefensiveScore / totalWeightedScore;
    const midProp = midScore * bestMidfieldScore / totalWeightedScore;
    const attProp = attScore * bestAttackingScore / totalWeightedScore;

    const maxProp = Math.max(defProp, midProp, attProp);
    const SPECIALIST_THRESHOLD = 0.5; // Need 50%+ in one zone to be specialist

    // Classify based on weighted proportions
    if (maxProp >= SPECIALIST_THRESHOLD) {
      // Clear specialist - one zone has majority
      if (maxProp === defProp) {
        specialistType = 'Defender';
      } else if (maxProp === midProp) {
        specialistType = 'Midfielder';
      } else {
        specialistType = 'Attacker';
      }
    } else {
      // No clear dominance - all-rounder
      specialistType = 'All-rounder';
    }
  }

  return {
    specialistType,
    bestDefensiveScore,
    bestMidfieldScore,
    bestAttackingScore,
    bestScore,
    averageScore,
  };
}


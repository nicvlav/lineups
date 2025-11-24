/**
 * Player Archetype Definitions
 *
 * Defines playstyles and specializations within each position.
 * Each archetype belongs to exactly ONE position and has unique stat weightings.
 */

import type { Position } from './positions';
import type { StatsKey } from './stats';

/**
 * Archetype definition with stat weights and metadata
 */
export interface Archetype {
  id: string;
  name: string;
  position: Position;
  strengthLabels: string[]; // 3-5 descriptive strengths for tooltips
  weights: Partial<Record<StatsKey, number>>; // Stat weights (missing = 0)
}

/**
 * All archetype definitions
 * Organized by position with 2-4 archetypes each
 */
export const ARCHETYPES: Archetype[] = [
  // ========== STRIKERS (ST) ==========
  {
    id: 'Poacher',
    name: 'Poacher',
    position: 'ST',
    strengthLabels: ['Lethal finishing', 'Ice cold composure', 'Clinical', 'Movement in box'],
    weights: {
      finishing: 1000,
      positioning: 1000,
      composure: 1000,
      offTheBall: 800,
      anticipation: 700,
      technique: 400,
      firstTouch: 650,
      passing: 200,
      determination: 200,
      agility: 50,
    }
  },
  {
    id: 'target-man',
    name: 'Target Man',
    position: 'ST',
    strengthLabels: ['Aerial dominance', 'Physical presence', 'Hold-up play', 'Link-up ability'],
    weights: {
      heading: 1000,
      strength: 1000,
      positioning: 900,
      finishing: 800,
      firstTouch: 700,
      passing: 400,
      technique: 400,
      aggression: 300,
      determination: 300,
      teamwork: 200,
    }
  },
  {
    id: 'pressing-forward',
    name: 'Pressing Forward',
    position: 'ST',
    strengthLabels: ['High press', 'Defensive work rate', 'Ball recovery', 'Tireless running'],
    weights: {
      attWorkrate: 1000,
      defWorkrate: 800,
      stamina: 800,
      aggression: 700,
      determination: 700,
      anticipation: 600,
      positioning: 600,
      finishing: 500,
      tackling: 300,
      teamwork: 400,
    }
  },

  // ========== WINGERS (WR) ==========
  {
    id: 'inverted-winger',
    name: 'Inverted Winger',
    position: 'WR',
    strengthLabels: ['Cutting inside', 'Shooting threat', 'Link-up play', 'Goal contribution'],
    weights: {
      finishing: 900,
      dribbling: 800,
      technique: 800,
      longShots: 700,
      composure: 700,
      passing: 600,
      offTheBall: 600,
      firstTouch: 700,
      agility: 500,
      flair: 400,
    }
  },
  {
    id: 'traditional-winger',
    name: 'Traditional Winger',
    position: 'WR',
    strengthLabels: ['Crossing ability', 'Provides width', 'Delivery quality', 'Stretches play'],
    weights: {
      crossing: 1000,
      dribbling: 800,
      firstTouch: 750,
      technique: 600,
      passing: 500,
      stamina: 600,
      speed: 900,
      teamwork: 400,
      attWorkrate: 500,
      vision: 300,
    }
  },

  // ========== ATTACKING MIDS (AM) - 3 archetypes ==========
  {
    id: 'classic-10',
    name: 'Classic #10',
    position: 'AM',
    strengthLabels: ['Vision', 'Through balls', 'Creative passing', 'Sets tempo'],
    weights: {
      passing: 1000,
      vision: 1000,
      technique: 800,
      composure: 1000,
      firstTouch: 700,
      anticipation: 600,
      decisions: 600,
      teamwork: 400,
      flair: 400,
      dribbling: 500,
    }
  },
  {
    id: 'shadow-striker',
    name: 'Shadow Striker',
    position: 'AM',
    strengthLabels: ['Late runs', 'Goal threat', 'Box arrival', 'Second striker'],
    weights: {
      offTheBall: 1000,
      finishing: 900,
      positioning: 800,
      anticipation: 800,
      composure: 700,
      attWorkrate: 700,
      firstTouch: 600,
      passing: 400,
      determination: 400,
      agility: 400,
    }
  },

  // ========== WIDE MIDS (WM) - 2 archetypes ==========
  {
    id: 'box-to-box-wide',
    name: 'Box-to-Box Wide',
    position: 'WM',
    strengthLabels: ['All-action', 'High stamina', 'Both phases', 'Covers ground'],
    weights: {
      stamina: 1000,
      attWorkrate: 800,
      defWorkrate: 800,
      crossing: 700,
      passing: 600,
      tackling: 400,
      determination: 600,
      teamwork: 700,
      marking: 300,
      positioning: 400,
    }
  },
  {
    id: 'wide-playmaker',
    name: 'Wide Playmaker',
    position: 'WM',
    strengthLabels: ['Creative from wide', 'Crossing', 'Vision', 'Delivery'],
    weights: {
      crossing: 1000,
      passing: 800,
      vision: 700,
      technique: 700,
      firstTouch: 600,
      composure: 600,
      teamwork: 500,
      attWorkrate: 400,
      stamina: 500,
      dribbling: 400,
    }
  },

  // ========== CENTRAL MIDS (CM) - 3 archetypes ==========
  {
    id: 'box-to-box',
    name: 'Box-to-Box',
    position: 'CM',
    strengthLabels: ['All-action midfielder', 'Covers everything', 'High stamina', 'Complete player'],
    weights: {
      stamina: 1000,
      passing: 800,
      attWorkrate: 700,
      defWorkrate: 700,
      teamwork: 600,
      determination: 600,
      composure: 700,
      tackling: 400,
      positioning: 400,
      decisions: 600,
    }
  },
  {
    id: 'mezzala',
    name: 'Mezzala',
    position: 'CM',
    strengthLabels: ['Roaming midfielder', 'Forward runs', 'Late arrival', 'Box threat'],
    weights: {
      offTheBall: 900,
      passing: 800,
      attWorkrate: 700,
      stamina: 700,
      composure: 600,
      finishing: 500,
      longShots: 600,
      technique: 600,
      positioning: 500,
      teamwork: 500,
    }
  },

  // ========== DEFENSIVE MIDS (DM) - 3 archetypes ==========
  {
    id: 'regista',
    name: 'Regista',
    position: 'DM',
    strengthLabels: ['Deep playmaker', 'Dictates tempo', 'Vision', 'Composure on ball'],
    weights: {
      passing: 1000,
      vision: 800,
      composure: 1000,
      technique: 800,
      anticipation: 800,
      decisions: 800,
      firstTouch: 700,
      concentration: 500,
      positioning: 500,
      teamwork: 500,
    }
  },
  {
    id: 'anchor',
    name: 'Anchor',
    position: 'DM',
    strengthLabels: ['Shielding defense', 'Positional sense', 'Interceptions', 'Organizer'],
    weights: {
      positioning: 1000,
      anticipation: 1000,
      composure: 900,
      concentration: 800,
      marking: 600,
      tackling: 600,
      passing: 700,
      decisions: 800,
      teamwork: 600,
      leadership: 400,
    }
  },

  // ========== CENTER BACKS (CB) - 3 archetypes ==========
  {
    id: 'ball-playing-defender',
    name: 'Ball-Playing Defender',
    position: 'CB',
    strengthLabels: ['Passing from back', 'Composure on ball', 'Building from back', 'Technical ability'],
    weights: {
      passing: 800,
      composure: 900,
      anticipation: 900,
      technique: 600,
      positioning: 800,
      tackling: 800,
      marking: 700,
      firstTouch: 500,
      decisions: 600,
      concentration: 600,
    }
  },
  {
    id: 'stopper',
    name: 'Stopper',
    position: 'CB',
    strengthLabels: ['Aggressive defending', 'Steps up', 'Physical duels', 'Proactive'],
    weights: {
      tackling: 1000,
      aggression: 900,
      anticipation: 900,
      marking: 900,
      strength: 800,
      positioning: 700,
      determination: 700,
      heading: 600,
      concentration: 600,
      defWorkrate: 500,
    }
  },

  // ========== FULL BACKS (FB) - 2 archetypes ==========
  {
    id: 'attacking-fullback',
    name: 'Attacking Full Back',
    position: 'FB',
    strengthLabels: ['Overlapping runs', 'Crossing', 'High stamina', 'Width provider'],
    weights: {
      stamina: 1000,
      crossing: 800,
      attWorkrate: 800,
      speed: 600,
      positioning: 500,
      tackling: 500,
      defWorkrate: 500,
      teamwork: 600,
      dribbling: 400,
      marking: 400,
    }
  },
  {
    id: 'defensive-fullback',
    name: 'Defensive Full Back',
    position: 'FB',
    strengthLabels: ['Solid defending', 'Positioning', 'Tackles', 'Stays back'],
    weights: {
      tackling: 900,
      positioning: 800,
      marking: 800,
      anticipation: 700,
      defWorkrate: 900,
      concentration: 600,
      stamina: 600,
      determination: 500,
      teamwork: 500,
      strength: 400,
    }
  },

  // ========== GOALKEEPERS (GK) - 1 archetype ==========
  {
    id: 'sweeper-keeper',
    name: 'Sweeper Keeper',
    position: 'GK',
    strengthLabels: ['Command of area', 'Anticipation', 'Positioning', 'Composure', 'Distribution'],
    weights: {
      anticipation: 1000,
      positioning: 1000,
      composure: 800,
      concentration: 800,
      passing: 400,
      firstTouch: 400,
      agility: 300,
      strength: 300,
      decisions: 500,
      vision: 300,
    }
  },
];

/**
 * Get all archetypes for a specific position
 */
export function getArchetypesForPosition(position: Position): Archetype[] {
  return ARCHETYPES.filter(a => a.position === position);
}

/**
 * Get archetype by ID
 */
export function getArchetypeById(id: string): Archetype | undefined {
  return ARCHETYPES.find(a => a.id === id);
}

/**
 * Get number of archetypes per position
 */
export function getArchetypeCountByPosition(): Record<Position, number> {
  const counts = {} as Record<Position, number>;
  for (const archetype of ARCHETYPES) {
    counts[archetype.position] = (counts[archetype.position] || 0) + 1;
  }
  return counts;
}

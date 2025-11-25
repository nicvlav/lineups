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
      finishing: 1600,
      positioning: 2500,
      composure: 1500,
      offTheBall: 800,
      attWorkrate: 850,
      anticipation: 400,
      decisions: 200,
      firstTouch: 600,
      speed: 300,
      technique: 100,
      concentration: 600,
      passing: 25,
      determination: 1000,
      heading: 200,
    }
  },
  {
    id: 'target-man',
    name: 'Target Man',
    position: 'ST',
    strengthLabels: ['Aerial dominance', 'Physical presence', 'Hold-up play', 'Link-up ability'],
    weights: {
      heading: 900,
      strength: 500,
      positioning: 1500,
      finishing: 850,
      attWorkrate: 800,
      offTheBall: 700,
      firstTouch: 700,
      composure: 700,
      decisions: 700,
      teamwork: 1000,
      passing: 700,
      technique: 400,
      aggression: 300,
      determination: 300,
      concentration: 300,
      speed: 50,
      anticipation: 100,
      flair: 10,
    }
  },
  {
    id: 'complete-forward',
    name: 'Complete Forward',
    position: 'ST',
    strengthLabels: ['All-round striker', 'Technical excellence', 'Explosive pace', 'Clinical finisher'],
    weights: {
      finishing: 1000,
      dribbling: 1000,
      speed: 600,
      firstTouch: 1100,
      technique: 1000,
      composure: 1500,
      flair: 100,
      agility: 250,
      offTheBall: 700,
      anticipation: 400,
      decisions: 700,
      attWorkrate: 700,
      positioning: 700,
      strength: 50,
      determination: 300,
      heading: 50,
      teamwork: 350,
      concentration: 300,
      stamina: 400,
    }
  },

  // ========== WINGERS (WR) ==========
  {
    id: 'inverted-winger',
    name: 'Inverted Winger',
    position: 'WR',
    strengthLabels: ['Cutting inside', 'Shooting threat', 'Link-up play', 'Goal contribution'],
    weights: {
      // Core winger stats (shared with traditional)
      dribbling: 1200,
      speed: 850,
      firstTouch: 800,
      flair: 700,
      passing: 1500,
      teamwork: 500,

      // Inverted specialization: shooting and playmaking
      longShots: 800,
      finishing: 850,
      vision: 700,
      crossing: 600,

      // Supporting stats
      technique: 750,
      composure: 700,
      offTheBall: 600,
      agility: 500,
      attWorkrate: 700,
      decisions: 500,
      concentration: 300,
      determination: 300,
      stamina: 600,
    }
  },
  {
    id: 'traditional-winger',
    name: 'Traditional Winger',
    position: 'WR',
    strengthLabels: ['Crossing ability', 'Provides width', 'Delivery quality', 'Stretches play'],
    weights: {
      // Core winger stats (shared with inverted)
      dribbling: 900,
      speed: 850,
      firstTouch: 800,
      flair: 700,
      passing: 500,
      teamwork: 500,

      // Traditional specialization: crossing and width
      crossing: 1500,
      vision: 200,

      // Supporting stats
      technique: 700,
      stamina: 650,
      attWorkrate: 800,
      decisions: 450,
      composure: 400,
      concentration: 300,
      determination: 300,
      agility: 400,
    }
  },

  // ========== ATTACKING MIDS (AM) - 3 archetypes ==========
  {
    id: 'classic-10',
    name: 'Classic #10',
    position: 'AM',
    strengthLabels: ['Vision', 'Through balls', 'Creative passing', 'Sets tempo'],
    weights: {
      passing: 1500,
      vision: 2000,
      composure: 1000,
      technique: 800,
      teamwork: 900,
      firstTouch: 700,
      attWorkrate: 650,
      anticipation: 600,
      decisions: 800,
      dribbling: 500,
      flair: 200,
      concentration: 300,
      determination: 300,
    }
  },
  {
    id: 'shadow-striker',
    name: 'Shadow Striker',
    position: 'AM',
    strengthLabels: ['Late runs', 'Goal threat', 'Box arrival', 'Second striker'],
    weights: {
      offTheBall: 1000,
      vision: 1000,
      passing: 450,
      finishing: 1100,
      positioning: 800,
      anticipation: 800,
      composure: 850,
      attWorkrate: 850,
      firstTouch: 900,
      determination: 400,
      decisions: 600,
      agility: 400,
      concentration: 300,
      teamwork: 600,
      longShots: 750,
      speed: 500,
      stamina: 600,
      technique: 1000
    }
  },

  // ========== WIDE MIDS (WM) - 2 archetypes ==========
  {
    id: 'box-to-box-wide',
    name: 'Box-to-Box Wide',
    position: 'WM',
    strengthLabels: ['All-action', 'High stamina', 'Both phases', 'Covers ground'],
    weights: {
      stamina: 1200,
      passing: 800,
      attWorkrate: 800,
      defWorkrate: 800,
      crossing: 900,
      teamwork: 700,
      determination: 900,
      composure: 500,
      tackling: 400,
      decisions: 400,
      positioning: 400,
      concentration: 300,
      marking: 300,
      firstTouch: 400,
    }
  },
  {
    id: 'wide-playmaker',
    name: 'Wide Playmaker',
    position: 'WM',
    strengthLabels: ['Creative from wide', 'Crossing', 'Vision', 'Delivery'],
    weights: {
      crossing: 1000,
      passing: 1000,
      vision: 1500,
      technique: 700,
      composure: 700,
      firstTouch: 600,
      teamwork: 500,
      stamina: 500,
      dribbling: 600,
      decisions: 400,
      attWorkrate: 400,
      concentration: 300,
      determination: 300,
    }
  },

  // ========== CENTRAL MIDS (CM) - 3 archetypes ==========
  {
    id: 'box-to-box',
    name: 'Box-to-Box',
    position: 'CM',
    strengthLabels: ['All-action midfielder', 'Covers everything', 'High stamina', 'Complete player'],
    weights: {
      stamina: 1500,
      passing: 800,
      firstTouch: 700,
      attWorkrate: 800,
      defWorkrate: 800,
      composure: 700,
      teamwork: 800,
      determination: 900,
      decisions: 600,
      tackling: 400,
      positioning: 400,
      vision: 400,
      concentration: 300,
    }
  },
  {
    id: 'classic-8',
    name: 'Classic #8',
    position: 'CM',
    strengthLabels: ['Engine of the team', 'All-around midfielder', 'Drive and energy', 'Complete game'],
    weights: {
      stamina: 400,
      determination: 900,
      passing: 850,
      attWorkrate: 800,
      decisions: 800,
      anticipation: 750,
      firstTouch: 700,
      composure: 700,
      defWorkrate: 650,
      teamwork: 650,
      technique: 600,
      offTheBall: 600,
      vision: 500,
      positioning: 500,
      tackling: 450,
      longShots: 400,
      concentration: 400,
      finishing: 50,
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
      composure: 1000,
      vision: 800,
      anticipation: 800,
      decisions: 800,
      technique: 800,
      firstTouch: 700,
      concentration: 500,
      positioning: 500,
      teamwork: 500,
      leadership: 400,
      determination: 300,
      defWorkrate: 800,
      attWorkrate: 100
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
      decisions: 900,
      composure: 900,
      concentration: 800,
      firstTouch: 700,
      passing: 700,
      marking: 600,
      tackling: 600,
      teamwork: 600,
      leadership: 400,
      determination: 300,
      vision: 200,
      defWorkrate: 1000,
    }
  },

  // ========== CENTER BACKS (CB) - 3 archetypes ==========
  {
    id: 'ball-playing-defender',
    name: 'Ball-Playing Defender',
    position: 'CB',
    strengthLabels: ['Passing from back', 'Composure on ball', 'Building from back', 'Technical ability'],
    weights: {
      composure: 950,
      anticipation: 900,
      positioning: 900,
      passing: 1000,
      tackling: 800,
      marking: 800,
      concentration: 800,
      technique: 600,
      decisions: 800,
      firstTouch: 500,
      leadership: 300,
      determination: 300,
      teamwork: 300,
      defWorkrate: 500,
      aggression: 100,
      strength: 400,
      heading: 200,
      vision: 400,
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
      decisions: 600,
      heading: 600,
      concentration: 600,
      defWorkrate: 650,
      composure: 300,
      leadership: 300,
      teamwork: 300,
    }
  },

  // ========== FULL BACKS (FB) - 2 archetypes ==========
  {
    id: 'attacking-fullback',
    name: 'Attacking Full Back',
    position: 'FB',
    strengthLabels: ['Overlapping runs', 'Crossing', 'High stamina', 'Width provider'],
    weights: {
      stamina: 900,
      crossing: 600,
      attWorkrate: 800,
      speed: 650,
      teamwork: 800,
      positioning: 500,
      tackling: 500,
      defWorkrate: 750,
      dribbling: 400,
      marking: 400,
      composure: 300,
      concentration: 300,
      determination: 600,
      firstTouch: 200,
    }
  },
  {
    id: 'defensive-fullback',
    name: 'Defensive Full Back',
    position: 'FB',
    strengthLabels: ['Solid defending', 'Positioning', 'Tackles', 'Stays back'],
    weights: {
      tackling: 900,
      defWorkrate: 900,
      positioning: 800,
      marking: 850,
      anticipation: 700,
      aggression: 600,
      concentration: 600,
      decisions: 600,
      heading: 600,
      stamina: 800,
      determination: 850,
      teamwork: 500,
      strength: 400,
      speed: 550,
      composure: 300,
      leadership: 300,
      firstTouch: 200,
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

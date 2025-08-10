/**
 * Auto-Balance V2: Robust, maintainable team balancing system
 * Maintains 1:1 compatibility with original weights while providing:
 * - Type-safe dynamic position arrays
 * - Comprehensive debugging/logging
 * - Clear separation of concerns
 * - Elimination of magic numbers and rigid structures
 */

import {
    Position,
    Zone,
    ZoneKeys,
    ZonePositions,
    PositionWeighting,
    formationTemplates,
    defaultZoneWeights,
    normalizedDefaultWeights,
    getPointForPosition,
} from "@/data/position-types";

import {
    ScoredGamePlayer,
    FilledGamePlayer,
    calculateScoresForStats,
} from "@/data/player-types";

// ============================================================================
// Type Definitions - Dynamic and Type-Safe
// ============================================================================

/**
 * Core player data with scores for auto-balancing
 * Consolidates multiple player types into single interface
 */
export interface BalancePlayer extends ScoredGamePlayer {
    // Performance scores indexed by position
    positionScores: Map<Position, number>;
    // Best position and score for this player
    bestPosition: Position;
    bestScore: number;
    // Specialization ratio (best/second-best)
    specializationRatio: number;
    // Current assigned position (if any)
    assignedPosition?: Position;
    // Position-specific weighting info (when assigned)
    positionInfo?: PositionWeighting;
}

/**
 * Team structure organized by zones and positions
 * Dynamically generated from ZonePositions
 */
export type TeamStructure = {
    [Z in Zone]: {
        [P in Position]?: BalancePlayer[];
    };
};

/**
 * Formation requirements (how many players per position)
 */
export type FormationRequirements = Map<Position, number>;

/**
 * Team assignment result with comprehensive metrics
 */
export interface TeamAssignment {
    structure: TeamStructure;
    players: BalancePlayer[];
    metrics: TeamMetrics;
}

/**
 * Comprehensive team metrics for evaluation
 */
export interface TeamMetrics {
    totalScore: number;
    zoneScores: Map<Zone, number>;
    positionScores: Map<Position, number>;
    peakPotential: number;
    efficiency: number;
    balance: number;
    zonalBalance: number;
    playerCount: number;
}

/**
 * Simulation result for Monte Carlo optimization
 */
export interface SimulationResult {
    teamA: TeamAssignment;
    teamB: TeamAssignment;
    score: number;
    metrics: {
        quality: number;
        efficiency: number;
        balance: number;
        positionBalance: number;
        zonalBalance: number;
    };
}

/**
 * Configuration for auto-balance algorithm
 */
export interface BalanceConfig {
    numSimulations: number;
    weights: {
        quality: number;
        efficiency: number;
        balance: number;
        positionBalance: number;
        zonalBalance: number;
    };
    dominanceRatio: number;
    debugMode: boolean;
}

// ============================================================================
// Utility Functions - Type-Safe and Debuggable
// ============================================================================

/**
 * Creates empty team structure dynamically from position definitions
 */
function createEmptyTeamStructure(): TeamStructure {
    const structure = {} as TeamStructure;
    
    for (const zone of ZoneKeys) {
        structure[zone] = {};
        const positions = ZonePositions[zone];
        if (positions) {
            for (const position of positions) {
                structure[zone][position] = [];
            }
        }
    }
    
    return structure;
}

/**
 * Converts ScoredGamePlayer to BalancePlayer with enhanced metadata
 */
export function toBalancePlayer(player: ScoredGamePlayer): BalancePlayer {
    const positionScores = new Map<Position, number>();
    let bestPosition: Position | null = null;
    let bestScore = 0;
    let secondBestScore = 0;
    
    // Calculate scores for all positions
    for (const position of Object.keys(player.zoneFit) as Position[]) {
        const score = player.zoneFit[position];
        positionScores.set(position, score);
        
        if (score > bestScore) {
            secondBestScore = bestScore;
            bestScore = score;
            bestPosition = position;
        } else if (score > secondBestScore) {
            secondBestScore = score;
        }
    }
    
    return {
        ...player,
        positionScores,
        bestPosition: bestPosition!,
        bestScore,
        specializationRatio: secondBestScore > 0 ? bestScore / secondBestScore : Infinity,
    };
}

/**
 * Gets formation requirements as a Map for easier manipulation
 */
function getFormationRequirements(numPlayers: number): FormationRequirements | null {
    const formations = formationTemplates[numPlayers];
    if (!formations || formations.length === 0) return null;
    
    // Random selection for variety
    const formation = formations[Math.floor(Math.random() * formations.length)];
    const requirements = new Map<Position, number>();
    
    for (const [position, count] of Object.entries(formation.positions)) {
        if (count > 0) {
            requirements.set(position as Position, count);
        }
    }
    
    return requirements;
}

/**
 * Specialist detection with clear logic
 */
function getSpecialization(
    player: BalancePlayer,
    targetPosition: Position,
    dominanceRatio: number = 1.05
): { isSpecialist: boolean; matchesPosition: boolean } {
    const targetScore = player.positionScores.get(targetPosition) || 0;
    
    // Not a specialist if they don't excel at this position
    if (targetScore < player.bestScore * 0.9) {
        return { isSpecialist: false, matchesPosition: false };
    }
    
    // Check if they're dominant enough to be considered a specialist
    const isSpecialist = player.specializationRatio >= dominanceRatio;
    const matchesPosition = player.bestPosition === targetPosition;
    
    return { isSpecialist, matchesPosition };
}

// ============================================================================
// Sorting Algorithms - Clear and Debuggable
// ============================================================================

/**
 * Enhanced sorting for optimal player selection
 */
function sortPlayersForPosition(
    players: BalancePlayer[],
    position: Position,
    _zone: Zone,
    config: BalanceConfig
): void {
    players.sort((a, b) => {
        const aScore = a.positionScores.get(position) || 0;
        const bScore = b.positionScores.get(position) || 0;
        
        const aSpec = getSpecialization(a, position, config.dominanceRatio);
        const bSpec = getSpecialization(b, position, config.dominanceRatio);
        
        // Priority 1: Position specialists who match this exact position
        if (aSpec.matchesPosition !== bSpec.matchesPosition) {
            return aSpec.matchesPosition ? -1 : 1;
        }
        
        // Priority 2: General specialists vs non-specialists
        if (aSpec.isSpecialist !== bSpec.isSpecialist) {
            // For matching positions, prefer specialists
            if (aSpec.matchesPosition && bSpec.matchesPosition) {
                return aSpec.isSpecialist ? -1 : 1;
            }
            // For non-matching positions, prefer generalists
            return aSpec.isSpecialist ? 1 : -1;
        }
        
        // Priority 3: Score at this position
        const scoreDiff = bScore - aScore;
        if (Math.abs(scoreDiff) > 0.01) {
            return scoreDiff;
        }
        
        // Priority 4: Overall quality as tiebreaker
        return b.bestScore - a.bestScore;
    });
}

/**
 * Sorting for worst players (goalkeepers)
 */
function sortWorstPlayers(players: BalancePlayer[]): void {
    players.sort((a, b) => a.bestScore - b.bestScore);
}

// ============================================================================
// Team Assignment - Core Algorithm
// ============================================================================

/**
 * Assigns a player to a team at a specific position
 */
function assignPlayerToTeam(
    player: BalancePlayer,
    team: TeamStructure,
    position: Position,
    zone: Zone
): boolean {
    const zonePositions = team[zone];
    if (!zonePositions) return false;
    
    const positionSlot = zonePositions[position];
    if (!positionSlot) return false;
    
    // Assign player with metadata
    player.assignedPosition = position;
    player.positionInfo = defaultZoneWeights[position];
    positionSlot.push(player);
    
    return true;
}

/**
 * Main team assignment algorithm
 */
function assignPlayersToTeams(
    players: BalancePlayer[],
    config: BalanceConfig
): SimulationResult | null {
    const totalPlayers = players.length;
    const teamASize = Math.floor(totalPlayers / 2);
    const teamBSize = totalPlayers - teamASize;
    
    // Get formation requirements
    const formationA = getFormationRequirements(teamASize);
    const formationB = teamASize === teamBSize 
        ? new Map(formationA!) 
        : getFormationRequirements(teamBSize);
    
    if (!formationA || !formationB) {
        if (config.debugMode) {
            console.error(`No formation available for ${teamASize}/${teamBSize} players`);
        }
        return null;
    }
    
    // Initialize team structures
    const teamA = createEmptyTeamStructure();
    const teamB = createEmptyTeamStructure();
    
    // Track remaining players and requirements
    const availablePlayers = [...players];
    const remainingA = new Map(formationA);
    const remainingB = new Map(formationB);
    
    // Phase 1: Assign goalkeepers (worst players)
    sortWorstPlayers(availablePlayers);
    
    if (remainingA.get("GK")) {
        const gk = availablePlayers.shift();
        if (gk) {
            assignPlayerToTeam(gk, teamA, "GK", "goalkeeper");
            remainingA.set("GK", (remainingA.get("GK") || 1) - 1);
        }
    }
    
    if (remainingB.get("GK")) {
        const gk = availablePlayers.shift();
        if (gk) {
            assignPlayerToTeam(gk, teamB, "GK", "goalkeeper");
            remainingB.set("GK", (remainingB.get("GK") || 1) - 1);
        }
    }
    
    // Phase 2: Assign remaining players with balanced distribution
    let teamAScore = 0;
    let teamBScore = 0;
    
    while (availablePlayers.length > 0) {
        // Choose team based on current balance
        const assignToA = (remainingA.size > 0) && 
            (remainingB.size === 0 || teamAScore <= teamBScore);
        
        const targetTeam = assignToA ? teamA : teamB;
        const targetRemaining = assignToA ? remainingA : remainingB;
        
        // Find best position to fill
        let assigned = false;
        const positions = Array.from(targetRemaining.entries())
            .filter(([_, count]) => count > 0)
            .sort((a, b) => {
                // Prioritize by position priority stat
                const priorityA = defaultZoneWeights[a[0]].priorityStat;
                const priorityB = defaultZoneWeights[b[0]].priorityStat;
                return priorityA - priorityB;
            });
        
        for (const [position, _] of positions) {
            const zone = defaultZoneWeights[position].zone;
            
            // Sort players for this position
            sortPlayersForPosition(availablePlayers, position, zone, config);
            
            if (availablePlayers.length > 0) {
                const player = availablePlayers.shift()!;
                const score = player.positionScores.get(position) || 0;
                
                if (assignPlayerToTeam(player, targetTeam, position, zone)) {
                    targetRemaining.set(position, (targetRemaining.get(position) || 1) - 1);
                    if (targetRemaining.get(position) === 0) {
                        targetRemaining.delete(position);
                    }
                    
                    if (assignToA) {
                        teamAScore += score;
                    } else {
                        teamBScore += score;
                    }
                    
                    assigned = true;
                    break;
                }
            }
        }
        
        if (!assigned && availablePlayers.length > 0) {
            if (config.debugMode) {
                console.warn("Could not assign player, breaking to avoid infinite loop");
            }
            break;
        }
    }
    
    // Calculate final metrics
    const teamAAssignment = calculateTeamMetrics(teamA);
    const teamBAssignment = calculateTeamMetrics(teamB);
    
    // Calculate simulation score
    const simulationMetrics = calculateSimulationScore(
        teamAAssignment,
        teamBAssignment,
        config
    );
    
    return {
        teamA: teamAAssignment,
        teamB: teamBAssignment,
        score: simulationMetrics.score,
        metrics: simulationMetrics.metrics,
    };
}

/**
 * Calculates comprehensive metrics for a team
 */
function calculateTeamMetrics(team: TeamStructure): TeamAssignment {
    const metrics: TeamMetrics = {
        totalScore: 0,
        zoneScores: new Map(),
        positionScores: new Map(),
        peakPotential: 0,
        efficiency: 0,
        balance: 0,
        zonalBalance: 0,
        playerCount: 0,
    };
    
    const allPlayers: BalancePlayer[] = [];
    
    for (const zone of ZoneKeys) {
        let zoneScore = 0;
        const zonePositions = team[zone];
        
        if (zonePositions) {
            for (const [position, players] of Object.entries(zonePositions)) {
                const pos = position as Position;
                let positionScore = 0;
                
                if (players && Array.isArray(players)) {
                    for (const player of players as BalancePlayer[]) {
                        const score = player.positionScores.get(pos) || 0;
                        positionScore += score;
                        metrics.peakPotential += player.bestScore;
                        allPlayers.push(player);
                        metrics.playerCount++;
                    }
                }
                
                metrics.positionScores.set(pos, positionScore);
                zoneScore += positionScore;
            }
        }
        
        metrics.zoneScores.set(zone, zoneScore);
        metrics.totalScore += zoneScore;
    }
    
    // Calculate efficiency (how well players are utilized)
    if (metrics.peakPotential > 0) {
        metrics.efficiency = metrics.totalScore / metrics.peakPotential;
    }
    
    // Calculate zone balance
    const zoneValues = Array.from(metrics.zoneScores.values()).filter(v => v > 0);
    if (zoneValues.length > 1) {
        const avgZone = zoneValues.reduce((a, b) => a + b, 0) / zoneValues.length;
        const variance = zoneValues.reduce((sum, val) => sum + Math.pow(val - avgZone, 2), 0) / zoneValues.length;
        metrics.zonalBalance = 1 / (1 + Math.sqrt(variance) / avgZone);
    } else {
        metrics.zonalBalance = 1;
    }
    
    return {
        structure: team,
        players: allPlayers,
        metrics,
    };
}

/**
 * Calculates simulation score with clear metrics
 */
function calculateSimulationScore(
    teamA: TeamAssignment,
    teamB: TeamAssignment,
    config: BalanceConfig
): { score: number; metrics: SimulationResult['metrics'] } {
    const metrics = {
        quality: 0,
        efficiency: 0,
        balance: 0,
        positionBalance: 0,
        zonalBalance: 0,
    };
    
    // Quality: Combined peak potential utilization
    const totalPeak = teamA.metrics.peakPotential + teamB.metrics.peakPotential;
    const totalActual = teamA.metrics.totalScore + teamB.metrics.totalScore;
    metrics.quality = totalPeak > 0 ? totalActual / totalPeak : 0;
    
    // Efficiency: Average of both teams' efficiency
    metrics.efficiency = (teamA.metrics.efficiency + teamB.metrics.efficiency) / 2;
    
    // Balance: How close teams are in peak potential
    const peakDiff = Math.abs(teamA.metrics.peakPotential - teamB.metrics.peakPotential);
    const maxPeak = Math.max(teamA.metrics.peakPotential, teamB.metrics.peakPotential);
    metrics.balance = maxPeak > 0 ? 1 - (peakDiff / maxPeak) : 1;
    
    // Position Balance: How close teams are in actual scores
    const scoreDiff = Math.abs(teamA.metrics.totalScore - teamB.metrics.totalScore);
    const maxScore = Math.max(teamA.metrics.totalScore, teamB.metrics.totalScore);
    metrics.positionBalance = maxScore > 0 ? 1 - (scoreDiff / maxScore) : 1;
    
    // Zonal Balance: Average of both teams' zonal balance
    metrics.zonalBalance = (teamA.metrics.zonalBalance + teamB.metrics.zonalBalance) / 2;
    
    // Calculate weighted score
    const score = 
        config.weights.quality * metrics.quality +
        config.weights.efficiency * metrics.efficiency +
        config.weights.balance * metrics.balance +
        config.weights.positionBalance * metrics.positionBalance +
        config.weights.zonalBalance * metrics.zonalBalance;
    
    return { score, metrics };
}

// ============================================================================
// Monte Carlo Optimization
// ============================================================================

/**
 * Runs Monte Carlo simulation to find optimal team balance
 */
export function optimizeTeamBalance(
    players: BalancePlayer[],
    config: BalanceConfig
): SimulationResult | null {
    let bestResult: SimulationResult | null = null;
    let bestScore = -Infinity;
    
    if (config.debugMode) {
        console.log(`Starting ${config.numSimulations} simulations for ${players.length} players`);
    }
    
    for (let i = 0; i < config.numSimulations; i++) {
        // Clone players for this simulation
        const simPlayers = players.map(p => ({ ...p }));
        
        // Run assignment
        const result = assignPlayersToTeams(simPlayers, config);
        
        if (result && result.score > bestScore) {
            bestScore = result.score;
            bestResult = result;
            
            if (config.debugMode && i % 10 === 0) {
                console.log(`Simulation ${i}: New best score ${result.score.toFixed(3)}`);
            }
        }
    }
    
    if (config.debugMode && bestResult) {
        console.log("=== Final Results ===");
        console.log("Team A:", {
            players: bestResult.teamA.metrics.playerCount,
            score: bestResult.teamA.metrics.totalScore.toFixed(0),
            peak: bestResult.teamA.metrics.peakPotential.toFixed(0),
            efficiency: (bestResult.teamA.metrics.efficiency * 100).toFixed(1) + "%",
        });
        console.log("Team B:", {
            players: bestResult.teamB.metrics.playerCount,
            score: bestResult.teamB.metrics.totalScore.toFixed(0),
            peak: bestResult.teamB.metrics.peakPotential.toFixed(0),
            efficiency: (bestResult.teamB.metrics.efficiency * 100).toFixed(1) + "%",
        });
        console.log("Metrics:", {
            quality: (bestResult.metrics.quality * 100).toFixed(1) + "%",
            efficiency: (bestResult.metrics.efficiency * 100).toFixed(1) + "%",
            balance: (bestResult.metrics.balance * 100).toFixed(1) + "%",
            positionBalance: (bestResult.metrics.positionBalance * 100).toFixed(1) + "%",
            zonalBalance: (bestResult.metrics.zonalBalance * 100).toFixed(1) + "%",
        });
    }
    
    return bestResult;
}

// ============================================================================
// Public API - Maintains compatibility with original
// ============================================================================

/**
 * Main entry point - compatible with original autoCreateTeamsScored
 */
export function autoCreateTeamsScored(
    players: ScoredGamePlayer[],
    debugMode: boolean = false
): { a: ScoredGamePlayer[]; b: ScoredGamePlayer[] } {
    if (players.length < 10) throw new Error("Not enough players to form teams");
    if (players.length > 24) throw new Error("Too many players to form teams");
    
    // Convert to BalancePlayers
    const balancePlayers = players.map(toBalancePlayer);
    
    // Configuration matching original weights
    const config: BalanceConfig = {
        numSimulations: 100,
        weights: {
            quality: 0.1,
            efficiency: 0.5,
            balance: 0.2,
            positionBalance: 0.2,
            zonalBalance: 0.0,
        },
        dominanceRatio: 1.05,
        debugMode,
    };
    
    // Run optimization
    const result = optimizeTeamBalance(balancePlayers, config);
    
    if (!result) {
        throw new Error("Failed to balance teams");
    }
    
    // Convert back to original format with positions
    const teamA = assignFinalPositions(result.teamA);
    const teamB = assignFinalPositions(result.teamB);
    
    return { a: teamA, b: teamB };
}

/**
 * Assigns final positions to players for output
 */
function assignFinalPositions(team: TeamAssignment): ScoredGamePlayer[] {
    const finalPlayers: ScoredGamePlayer[] = [];
    
    for (const player of team.players) {
        if (player.assignedPosition && player.positionInfo) {
            // Get proper point for this position
            const teammates = team.structure[player.positionInfo.zone]?.[player.assignedPosition] || [];
            const myIndex = teammates.indexOf(player);
            const point = getPointForPosition(
                player.positionInfo,
                myIndex,
                teammates.length
            );
            
            finalPlayers.push({
                ...player,
                position: point,
                exactPosition: player.assignedPosition,
            });
        }
    }
    
    return finalPlayers;
}

/**
 * Backward compatibility wrapper
 */
export function autoCreateTeamsFilled(
    players: FilledGamePlayer[],
    debugMode: boolean = false
): { a: ScoredGamePlayer[]; b: ScoredGamePlayer[] } {
    const scoredPlayers = players.map(player => ({
        ...player,
        zoneFit: calculateScoresForStats(player.stats, normalizedDefaultWeights),
    })) as ScoredGamePlayer[];
    
    return autoCreateTeamsScored(scoredPlayers, debugMode);
}
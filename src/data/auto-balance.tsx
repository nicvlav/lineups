/**
 * Auto-Balance System v2
 * 
 * Professional-grade team balancing algorithm using Monte Carlo optimization.
 * Provides fair team distribution based on player skills and positions.
 * 
 * Features:
 * - High-performance implementation using TypedArrays
 * - Type-safe position and formation handling
 * - Configurable balancing weights
 * - Comprehensive debugging and metrics
 * - 100% backward compatible API
 * 
 * @module auto-balance
 */

import {
    Position,
    Formation,
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

// Re-export the old types for backward compatibility
export { 
    toArrayScoredGamePlayers,
    assignPositions,
    calculateScores,
} from "@/data/auto-balance-types";

// ============================================================================
// Constants and Configuration
// ============================================================================

/**
 * 🔍 GLOBAL DEBUG SWITCH
 * ═══════════════════════════════════════════════════════════════════════════
 * Set this to true/false to enable/disable ALL debug output
 * This overrides any other debug settings in the code
 * ═══════════════════════════════════════════════════════════════════════════
 */
const ENABLE_DEBUG = true;  // ← CHANGE THIS TO false TO DISABLE DEBUG

/** Position indices for array-based operations */
const POSITION_INDICES = {
    GK: 0, CB: 1, FB: 2, DM: 3, CM: 4, WM: 5, AM: 6, ST: 7, WR: 8
} as const;

/** Reverse mapping from index to position */
const INDEX_TO_POSITION: readonly Position[] = ['GK', 'CB', 'FB', 'DM', 'CM', 'WM', 'AM', 'ST', 'WR'];

/** Total number of positions */
const POSITION_COUNT = 9;

/** Zone groupings for metric calculation */
const ZONE_POSITIONS = [
    [0],           // Goalkeeper
    [1, 2],        // Defense
    [3, 4, 5, 6],  // Midfield
    [7, 8],        // Attack
] as const;

/** Default Monte Carlo configuration */
const DEFAULT_CONFIG: BalanceConfig = {
    numSimulations: 100,
    weights: {
        quality: 0.00,      // Reduced: raw quality less important
        efficiency: 0.0,   // Increased: position fit is critical
        balance: 0.45,      // Slightly reduced but still important
        positionBalance: 0.45,  // Keep teams balanced
        zonalBalance: 0.1,
    },
    dominanceRatio: 1.03,  // Very low threshold: 5% better = specialist (e.g., 77 vs 73)
    recursive: true,
    recursiveDepth: 15,
    debugMode: false,  // Use ENABLE_DEBUG flag instead
} as const;

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Configuration for the auto-balance algorithm
 */
export interface BalanceConfig {
    /** Number of Monte Carlo simulations to run */
    numSimulations: number;
    
    /** Weights for different optimization criteria (must sum to 1.0) */
    weights: {
        /** Overall team quality (higher stats = better) */
        quality: number;
        /** Player position efficiency (right player in right position) */
        efficiency: number;
        /** Team strength balance (equal total strength) */
        balance: number;
        /** Position-specific balance between teams */
        positionBalance: number;
        /** Zone balance within each team */
        zonalBalance: number;
    };
    
    /** Ratio for specialist detection (higher = stricter) */
    dominanceRatio: number;
    
    /** Enable recursive optimization for better results */
    recursive: boolean;
    
    /** Depth of recursive optimization */
    recursiveDepth: number;
    
    /** Enable debug logging */
    debugMode: boolean;
}

/**
 * Performance-optimized player representation
 * Uses TypedArrays for cache-friendly access patterns
 */
interface FastPlayer {
    /** Reference to original player data */
    original: ScoredGamePlayer;
    
    /** Flat array of position scores for O(1) access */
    scores: Float32Array;
    
    /** Pre-calculated best score */
    bestScore: number;
    
    /** Index of best position */
    bestPosition: number;
    
    /** Second best score for versatility calculation */
    secondBestScore: number;
    
    /** Specialization ratio (best/secondBest) */
    specializationRatio: number;
    
    /** Currently assigned position index (-1 if unassigned) */
    assignedPosition: number;
    
    /** Assigned team */
    team: 'A' | 'B' | null;
}

/**
 * Optimized team structure
 */
interface FastTeam {
    /** Players grouped by position index */
    positions: FastPlayer[][];
    
    /** Total team score */
    totalScore: number;
    
    /** Scores by zone [GK, DEF, MID, ATT] */
    zoneScores: Float32Array;
    
    /** Total player count */
    playerCount: number;
    
    /** Peak potential score */
    peakPotential: number;
    
    /** Formation used for this team */
    formation: Formation | null;
}

/**
 * Result of a simulation run
 */
interface SimulationResult {
    teamA: FastTeam;
    teamB: FastTeam;
    score: number;
    metrics: BalanceMetrics;
}

/**
 * Detailed balance metrics
 */
interface BalanceMetrics {
    quality: number;
    efficiency: number;
    balance: number;
    positionBalance: number;
    zonalBalance: number;
}

// ============================================================================
// Player Conversion and Caching
// ============================================================================

/**
 * Converts a scored player to optimized format
 * Pre-calculates frequently accessed values
 */
function toFastPlayer(player: ScoredGamePlayer): FastPlayer {
    const scores = new Float32Array(POSITION_COUNT);
    let bestScore = 0;
    let bestPosition = -1;
    let secondBestScore = 0;
    
    // Fill score array and find best positions
    for (let i = 0; i < POSITION_COUNT; i++) {
        const position = INDEX_TO_POSITION[i];
        const score = player.zoneFit[position] || 0;
        scores[i] = score;
        
        if (score > bestScore) {
            secondBestScore = bestScore;
            bestScore = score;
            bestPosition = i;
        } else if (score > secondBestScore) {
            secondBestScore = score;
        }
    }
    
    return {
        original: player,
        scores,
        bestScore,
        bestPosition,
        secondBestScore,
        specializationRatio: secondBestScore > 0 ? bestScore / secondBestScore : Infinity,
        assignedPosition: -1,
        team: null,
    };
}

/**
 * Creates an empty team structure
 */
function createFastTeam(): FastTeam {
    const positions: FastPlayer[][] = [];
    for (let i = 0; i < POSITION_COUNT; i++) {
        positions[i] = [];
    }
    
    return {
        positions,
        totalScore: 0,
        zoneScores: new Float32Array(4),
        playerCount: 0,
        peakPotential: 0,
        formation: null,
    };
}

// ============================================================================
// Formation Management
// ============================================================================

/**
 * Gets formation requirements as an optimized array
 * Returns both the array and the original formation for reference
 */
function getFastFormation(numPlayers: number): { array: Int8Array; formation: Formation } | null {
    const formations = formationTemplates[numPlayers];
    if (!formations || formations.length === 0) {
        return null;
    }
    
    // Random selection for variety
    const selectedFormation = formations[Math.floor(Math.random() * formations.length)];
    
    // Convert to array
    const arr = new Int8Array(POSITION_COUNT);
    for (let i = 0; i < POSITION_COUNT; i++) {
        const position = INDEX_TO_POSITION[i];
        arr[i] = selectedFormation.positions[position] || 0;
    }
    
    return { array: arr, formation: selectedFormation };
}

// ============================================================================
// Sorting Algorithms
// ============================================================================

/**
 * Creates an optimized comparator for position-based sorting
 * MASSIVELY prefers specialists over versatile players
 */
function createPositionComparator(
    positionIdx: number,
    dominanceRatio: number
): (a: FastPlayer, b: FastPlayer) => number {
    return (a: FastPlayer, b: FastPlayer): number => {
        const aScore = a.scores[positionIdx];
        const bScore = b.scores[positionIdx];
        
        // Calculate specialization for THIS specific position
        // A specialist is someone whose score at this position dominates their other scores
        const aIsPositionSpecialist = a.bestPosition === positionIdx && a.specializationRatio >= dominanceRatio;
        const bIsPositionSpecialist = b.bestPosition === positionIdx && b.specializationRatio >= dominanceRatio;
        
        // Priority 1: MASSIVE preference for specialists at this exact position
        if (aIsPositionSpecialist !== bIsPositionSpecialist) {
            // Specialist vs non-specialist: HUGE sorting difference
            return aIsPositionSpecialist ? -1000 : 1000;
        }
        
        // Priority 2: If both are specialists for this position, prefer stronger specialization
        if (aIsPositionSpecialist && bIsPositionSpecialist) {
            // Higher specialization ratio = more specialized
            const ratioDiff = b.specializationRatio - a.specializationRatio;
            // Even tiny differences matter for specialists
            if (Math.abs(ratioDiff) > 0.01) {
                return ratioDiff > 0 ? 100 : -100;
            }
        }
        
        // Priority 3: Efficiency - how good are they at THIS position relative to their best?
        const aEfficiency = a.bestScore > 0 ? aScore / a.bestScore : 0;
        const bEfficiency = b.bestScore > 0 ? bScore / b.bestScore : 0;
        
        // Strong penalty for players who would be "wasted" at this position
        const efficiencyDiff = bEfficiency - aEfficiency;
        if (Math.abs(efficiencyDiff) > 0.02) { // Even 2% efficiency difference matters
            return efficiencyDiff > 0 ? 50 : -50;
        }
        
        // Priority 4: Raw score at this position
        const scoreDiff = bScore - aScore;
        if (Math.abs(scoreDiff) > 0.01) {
            return scoreDiff;
        }
        
        // Priority 5: Overall quality as final tiebreaker
        return b.bestScore - a.bestScore;
    };
}

/**
 * Sorts players by worst overall score (for goalkeeper selection)
 */
function sortWorstInPlace(players: FastPlayer[]): void {
    players.sort((a, b) => a.bestScore - b.bestScore);
}

// ============================================================================
// Team Assignment Algorithm
// ============================================================================

/**
 * Core team assignment algorithm
 * Assigns players to teams based on formation and balance
 */
function assignPlayersToTeams(
    players: FastPlayer[],
    config: BalanceConfig
): SimulationResult | null {
    const totalPlayers = players.length;
    const teamASize = Math.floor(totalPlayers / 2);
    const teamBSize = totalPlayers - teamASize;
    
    // Get formations
    const formationDataA = getFastFormation(teamASize);
    const formationDataB = teamASize === teamBSize 
        ? formationDataA 
        : getFastFormation(teamBSize);
    
    if (!formationDataA || !formationDataB) {
        if (config.debugMode) {
            console.warn(`No formation available for ${teamASize}/${teamBSize} players`);
        }
        return null;
    }
    
    const formationA = formationDataA.array.slice();
    const formationB = formationDataB.array.slice();
    
    // Initialize teams
    const teamA = createFastTeam();
    const teamB = createFastTeam();
    
    // Store formations for position calculation
    teamA.formation = formationDataA.formation;
    teamB.formation = formationDataB.formation;
    
    // Clone players for manipulation
    const available = [...players];
    
    // Reset assignment state
    for (const player of available) {
        player.assignedPosition = -1;
        player.team = null;
    }
    
    // Phase 1: Assign goalkeepers (worst overall players)
    sortWorstInPlace(available);
    
    const gkIdx = POSITION_INDICES.GK;
    if (formationA[gkIdx] > 0 && available.length > 0) {
        const gk = available.shift()!;
        gk.assignedPosition = gkIdx;
        gk.team = 'A';
        teamA.positions[gkIdx].push(gk);
        teamA.totalScore += gk.scores[gkIdx];
        teamA.peakPotential += gk.bestScore;
        teamA.playerCount++;
        formationA[gkIdx]--;
    }
    
    if (formationB[gkIdx] > 0 && available.length > 0) {
        const gk = available.shift()!;
        gk.assignedPosition = gkIdx;
        gk.team = 'B';
        teamB.positions[gkIdx].push(gk);
        teamB.totalScore += gk.scores[gkIdx];
        teamB.peakPotential += gk.bestScore;
        teamB.playerCount++;
        formationB[gkIdx]--;
    }
    
    // Phase 2: Assign remaining players with dynamic balancing
    const comparators = new Map<number, (a: FastPlayer, b: FastPlayer) => number>();
    for (let i = 0; i < POSITION_COUNT; i++) {
        comparators.set(i, createPositionComparator(i, config.dominanceRatio));
    }
    
    // Track which zones have available positions
    const getAvailableZones = (formation: Int8Array): number[] => {
        const zones: number[] = [];
        for (let zoneIdx = 0; zoneIdx < 4; zoneIdx++) {
            for (const posIdx of ZONE_POSITIONS[zoneIdx]) {
                if (formation[posIdx] > 0) {
                    zones.push(zoneIdx);
                    break;
                }
            }
        }
        return zones;
    };
    
    while (available.length > 0) {
        // Choose team based on current balance
        const aZones = getAvailableZones(formationA);
        const bZones = getAvailableZones(formationB);
        
        if (aZones.length === 0 && bZones.length === 0) break;
        
        const assignToA = aZones.length > 0 && 
            (bZones.length === 0 || teamA.totalScore <= teamB.totalScore);
        
        const targetTeam = assignToA ? teamA : teamB;
        const targetFormation = assignToA ? formationA : formationB;
        const availableZones = assignToA ? aZones : bZones;
        
        // RANDOMIZATION: Pick a random zone to fill (like original)
        const randomZone = availableZones[Math.floor(Math.random() * availableZones.length)];
        const zonePositions = ZONE_POSITIONS[randomZone];
        
        // Within the zone, still respect priority order
        let assigned = false;
        
        // Collect all available positions in this zone with their priorities
        const availablePositions: { posIdx: number; priority: number }[] = [];
        for (const posIdx of zonePositions) {
            if (targetFormation[posIdx] > 0) {
                const position = INDEX_TO_POSITION[posIdx];
                const weight = defaultZoneWeights[position];
                availablePositions.push({ posIdx, priority: weight.priorityStat });
            }
        }
        
        // Sort by priority (but could randomize within same priority for more variety)
        availablePositions.sort((a, b) => {
            if (a.priority !== b.priority) {
                return a.priority - b.priority;
            }
            // Add small randomization for same priority positions
            return Math.random() - 0.5;
        });
        
        // Try to assign to positions in this zone
        for (const { posIdx } of availablePositions) {
            if (assigned) break;
            
            // Sort available players for this position
            available.sort(comparators.get(posIdx)!);
            
            if (available.length > 0) {
                const player = available.shift()!;
                const score = player.scores[posIdx];
                
                player.assignedPosition = posIdx;
                player.team = assignToA ? 'A' : 'B';
                targetTeam.positions[posIdx].push(player);
                targetTeam.totalScore += score;
                targetTeam.peakPotential += player.bestScore;
                targetTeam.playerCount++;
                targetFormation[posIdx]--;
                
                assigned = true;
            }
        }
        
        if (!assigned && available.length > 0) {
            if (config.debugMode) {
                console.warn("Could not assign player in zone", randomZone);
            }
            // Try any position as fallback
            for (let posIdx = 0; posIdx < POSITION_COUNT; posIdx++) {
                if (targetFormation[posIdx] > 0) {
                    available.sort(comparators.get(posIdx)!);
                    if (available.length > 0) {
                        const player = available.shift()!;
                        player.assignedPosition = posIdx;
                        player.team = assignToA ? 'A' : 'B';
                        targetTeam.positions[posIdx].push(player);
                        targetTeam.totalScore += player.scores[posIdx];
                        targetTeam.peakPotential += player.bestScore;
                        targetTeam.playerCount++;
                        targetFormation[posIdx]--;
                        break;
                    }
                }
            }
        }
    }
    
    // Calculate zone scores
    for (let zoneIdx = 0; zoneIdx < 4; zoneIdx++) {
        for (const posIdx of ZONE_POSITIONS[zoneIdx]) {
            for (const player of teamA.positions[posIdx]) {
                teamA.zoneScores[zoneIdx] += player.scores[posIdx];
            }
            for (const player of teamB.positions[posIdx]) {
                teamB.zoneScores[zoneIdx] += player.scores[posIdx];
            }
        }
    }
    
    // Calculate balance metrics
    const metrics = calculateMetrics(teamA, teamB, config);
    
    return {
        teamA,
        teamB,
        score: metrics.score,
        metrics: metrics.details,
    };
}

// ============================================================================
// Metrics and Evaluation
// ============================================================================

/**
 * Calculates comprehensive balance metrics
 */
function calculateMetrics(
    teamA: FastTeam,
    teamB: FastTeam,
    config: BalanceConfig
): { score: number; details: BalanceMetrics } {
    const metrics: BalanceMetrics = {
        quality: 0,
        efficiency: 0,
        balance: 0,
        positionBalance: 0,
        zonalBalance: 0,
    };
    
    // Quality: Overall team strength utilization
    const totalActual = teamA.totalScore + teamB.totalScore;
    const totalPossible = (teamA.playerCount + teamB.playerCount) * 100;
    metrics.quality = totalPossible > 0 ? totalActual / totalPossible : 0;
    
    // Efficiency: How well players are positioned (penalize waste)
    // Calculate efficiency per player to detect mismatches
    let totalEfficiency = 0;
    let playerCount = 0;
    
    // Check each position for efficiency
    for (let posIdx = 0; posIdx < POSITION_COUNT; posIdx++) {
        // Team A players at this position
        for (const player of teamA.positions[posIdx]) {
            const actualScore = player.scores[posIdx];
            const bestScore = player.bestScore;
            if (bestScore > 0) {
                // Efficiency is how close this position is to their best
                // 1.0 = perfect fit, 0.5 = wasted at wrong position
                const efficiency = actualScore / bestScore;
                // Penalize severe mismatches more heavily
                totalEfficiency += Math.pow(efficiency, 1.5);
                playerCount++;
            }
        }
        
        // Team B players at this position
        for (const player of teamB.positions[posIdx]) {
            const actualScore = player.scores[posIdx];
            const bestScore = player.bestScore;
            if (bestScore > 0) {
                const efficiency = actualScore / bestScore;
                totalEfficiency += Math.pow(efficiency, 1.5);
                playerCount++;
            }
        }
    }
    
    metrics.efficiency = playerCount > 0 ? totalEfficiency / playerCount : 0;
    
    // Balance: Peak potential balance between teams
    const peakDiff = Math.abs(teamA.peakPotential - teamB.peakPotential);
    const maxPeak = Math.max(teamA.peakPotential, teamB.peakPotential);
    metrics.balance = maxPeak > 0 ? 1 - (peakDiff / maxPeak) : 1;
    
    // Position Balance: Actual score balance
    const scoreDiff = Math.abs(teamA.totalScore - teamB.totalScore);
    const maxScore = Math.max(teamA.totalScore, teamB.totalScore);
    metrics.positionBalance = maxScore > 0 ? 1 - (scoreDiff / maxScore) : 1;
    
    // Zonal Balance: Internal team balance
    const calcZonalBalance = (team: FastTeam) => {
        const nonGkZones = [team.zoneScores[1], team.zoneScores[2], team.zoneScores[3]];
        const avg = nonGkZones.reduce((a, b) => a + b, 0) / 3;
        if (avg === 0) return 1;
        const variance = nonGkZones.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / 3;
        return 1 / (1 + Math.sqrt(variance) / avg);
    };
    
    metrics.zonalBalance = (calcZonalBalance(teamA) + calcZonalBalance(teamB)) / 2;
    
    // Calculate weighted score
    const score = 
        config.weights.quality * metrics.quality +
        config.weights.efficiency * metrics.efficiency +
        config.weights.balance * metrics.balance +
        config.weights.positionBalance * metrics.positionBalance +
        config.weights.zonalBalance * metrics.zonalBalance;
    
    return { score, details: metrics };
}

// ============================================================================
// Monte Carlo Optimization
// ============================================================================

/**
 * Runs Monte Carlo simulation to find optimal team balance
 */
function runMonteCarlo(
    players: FastPlayer[],
    config: BalanceConfig
): SimulationResult | null {
    let bestResult: SimulationResult | null = null;
    let bestScore = -Infinity;
    
    for (let i = 0; i < config.numSimulations; i++) {
        const result = assignPlayersToTeams(players, config);
        
        if (result && result.score > bestScore) {
            bestScore = result.score;
            bestResult = result;
            
            if (config.debugMode && i % 10 === 0) {
                console.log(`Simulation ${i}/${config.numSimulations}: Score=${result.score.toFixed(3)}`);
            }
        }
    }
    
    return bestResult;
}

/**
 * Recursive optimization for better results
 */
function runRecursiveOptimization(
    players: FastPlayer[],
    config: BalanceConfig
): SimulationResult | null {
    // Run initial optimization
    let bestResult = runMonteCarlo(players, config);
    if (!bestResult) return null;
    
    // Recursive refinement
    const subConfig: BalanceConfig = {
        ...config,
        numSimulations: Math.max(5, Math.floor(config.numSimulations / config.recursiveDepth)),
        recursive: false,
        weights: {
            quality: 0.0,
            efficiency: 0.0,   // Even more focus on efficiency in refinement
            balance: 0.1,
            positionBalance: 0.5,
            zonalBalance: 0.4,
        },
    };
    
    for (let depth = 0; depth < config.recursiveDepth; depth++) {
        const refined = runMonteCarlo(players, subConfig);
        if (refined && refined.score > bestResult.score) {
            bestResult = refined;
        }
    }
    
    return bestResult;
}

// ============================================================================
// Result Conversion
// ============================================================================

/**
 * Converts optimized result back to original format
 */
function convertToGamePlayers(
    result: SimulationResult
): { a: ScoredGamePlayer[]; b: ScoredGamePlayer[] } {
    const teamA: ScoredGamePlayer[] = [];
    const teamB: ScoredGamePlayer[] = [];
    
    // Process each position
    for (let posIdx = 0; posIdx < POSITION_COUNT; posIdx++) {
        const position = INDEX_TO_POSITION[posIdx];
        const weight = defaultZoneWeights[position];
        
        // Team A players
        const teamAPlayers = result.teamA.positions[posIdx];
        teamAPlayers.forEach((player, idx) => {
            // Pass formation for CM positioning
            const point = getPointForPosition(
                weight, 
                idx, 
                teamAPlayers.length, 
                result.teamA.formation || undefined
            );
            teamA.push({
                ...player.original,
                position: point,
                exactPosition: position,
                team: 'A',
            });
        });
        
        // Team B players
        const teamBPlayers = result.teamB.positions[posIdx];
        teamBPlayers.forEach((player, idx) => {
            // Pass formation for CM positioning
            const point = getPointForPosition(
                weight, 
                idx, 
                teamBPlayers.length, 
                result.teamB.formation || undefined
            );
            teamB.push({
                ...player.original,
                position: point,
                exactPosition: position,
                team: 'B',
            });
        });
    }
    
    return { a: teamA, b: teamB };
}

// ============================================================================
// Logging and Debugging
// ============================================================================

/**
 * Logs detailed balance results with comprehensive metrics
 */
function logResults(result: SimulationResult, config: BalanceConfig): void {
    // Always use ENABLE_DEBUG flag
    if (!ENABLE_DEBUG && !config.debugMode) return;
    
    console.log("\n" + "═".repeat(60));
    console.log("              AUTO-BALANCE RESULTS SUMMARY");
    console.log("═".repeat(60));
    
    // Team sizes
    console.log("\n📊 TEAM DISTRIBUTION");
    console.log("─".repeat(40));
    console.log(`  Team A: ${result.teamA.playerCount} players`);
    console.log(`  Team B: ${result.teamB.playerCount} players`);
    
    // Peak potential scores (best possible if everyone played their best position)
    console.log("\n⭐ PEAK POTENTIAL SCORES (if all players at best positions)");
    console.log("─".repeat(40));
    const peakDiff = result.teamA.peakPotential - result.teamB.peakPotential;
    const peakPercent = result.teamB.peakPotential > 0 
        ? ((Math.abs(peakDiff) / result.teamB.peakPotential) * 100).toFixed(1)
        : "0.0";
    console.log(`  Team A Peak: ${result.teamA.peakPotential.toFixed(0)}`);
    console.log(`  Team B Peak: ${result.teamB.peakPotential.toFixed(0)}`);
    console.log(`  Difference:  ${peakDiff > 0 ? '+' : ''}${peakDiff.toFixed(0)} (${peakPercent}%)`);
    console.log(`  ${peakDiff > 0 ? 'Team A stronger' : peakDiff < 0 ? 'Team B stronger' : 'Perfectly balanced'}`);
    
    // Actual positional scores
    console.log("\n🎯 ACTUAL POSITIONAL SCORES (at assigned positions)");
    console.log("─".repeat(40));
    const posDiff = result.teamA.totalScore - result.teamB.totalScore;
    const posPercent = result.teamB.totalScore > 0
        ? ((Math.abs(posDiff) / result.teamB.totalScore) * 100).toFixed(1)
        : "0.0";
    console.log(`  Team A Score: ${result.teamA.totalScore.toFixed(0)}`);
    console.log(`  Team B Score: ${result.teamB.totalScore.toFixed(0)}`);
    console.log(`  Difference:   ${posDiff > 0 ? '+' : ''}${posDiff.toFixed(0)} (${posPercent}%)`);
    console.log(`  ${posDiff > 0 ? 'Team A advantage' : posDiff < 0 ? 'Team B advantage' : 'Perfectly balanced'}`);
    
    // Efficiency comparison
    const efficiencyA = result.teamA.peakPotential > 0 
        ? (result.teamA.totalScore / result.teamA.peakPotential * 100).toFixed(1)
        : "0.0";
    const efficiencyB = result.teamB.peakPotential > 0
        ? (result.teamB.totalScore / result.teamB.peakPotential * 100).toFixed(1)
        : "0.0";
    console.log("\n  Position Efficiency:");
    console.log(`    Team A: ${efficiencyA}% of peak potential`);
    console.log(`    Team B: ${efficiencyB}% of peak potential`);
    
    // Zone breakdown with averages
    console.log("\n🏆 ZONE ANALYSIS (skills by field zone)");
    console.log("─".repeat(40));
    console.log("  Zone     | Team A      | Team B      | Diff");
    console.log("  ---------|-------------|-------------|--------");
    
    const zones = ['GK', 'DEF', 'MID', 'ATT'];
    const zonePlayerCounts = [
        [result.teamA.positions[0].length, result.teamB.positions[0].length], // GK
        [result.teamA.positions[1].length + result.teamA.positions[2].length, 
         result.teamB.positions[1].length + result.teamB.positions[2].length], // DEF
        [result.teamA.positions[3].length + result.teamA.positions[4].length + 
         result.teamA.positions[5].length + result.teamA.positions[6].length,
         result.teamB.positions[3].length + result.teamB.positions[4].length + 
         result.teamB.positions[5].length + result.teamB.positions[6].length], // MID
        [result.teamA.positions[7].length + result.teamA.positions[8].length,
         result.teamB.positions[7].length + result.teamB.positions[8].length], // ATT
    ];
    
    for (let i = 0; i < 4; i++) {
        const scoreA = result.teamA.zoneScores[i];
        const scoreB = result.teamB.zoneScores[i];
        const countA = zonePlayerCounts[i][0];
        const countB = zonePlayerCounts[i][1];
        const avgA = countA > 0 ? scoreA / countA : 0;
        const avgB = countB > 0 ? scoreB / countB : 0;
        const diff = scoreA - scoreB;
        
        const aStr = `${scoreA.toFixed(0)} (${avgA.toFixed(0)})`;
        const bStr = `${scoreB.toFixed(0)} (${avgB.toFixed(0)})`;
        const diffStr = `${diff > 0 ? '+' : ''}${diff.toFixed(0)}`;
        
        console.log(`  ${zones[i].padEnd(8)} | ${aStr.padEnd(11)} | ${bStr.padEnd(11)} | ${diffStr}`);
    }
    console.log("\n  Format: Total (Average per player)");
    
    // Overall zone balance
    const totalZoneA = Array.from(result.teamA.zoneScores).reduce((a, b) => a + b, 0);
    const totalZoneB = Array.from(result.teamB.zoneScores).reduce((a, b) => a + b, 0);
    const totalDiff = totalZoneA - totalZoneB;
    console.log("\n  Zone Totals:");
    console.log(`    Team A: ${totalZoneA.toFixed(0)}`);
    console.log(`    Team B: ${totalZoneB.toFixed(0)}`);
    console.log(`    Difference: ${totalDiff > 0 ? '+' : ''}${totalDiff.toFixed(0)}`);
    
    console.log("\nBalance Metrics:");
    console.log(`  Quality:          ${(result.metrics.quality * 100).toFixed(1)}%`);
    console.log(`  Efficiency:       ${(result.metrics.efficiency * 100).toFixed(1)}%`);
    console.log(`  Team Balance:     ${(result.metrics.balance * 100).toFixed(1)}%`);
    console.log(`  Position Balance: ${(result.metrics.positionBalance * 100).toFixed(1)}%`);
    console.log(`  Zonal Balance:    ${(result.metrics.zonalBalance * 100).toFixed(1)}%`);
    console.log(`  Overall Score:    ${result.score.toFixed(3)}`);
    
    // Show position assignments to debug mismatches
    if (config.debugMode) {
        console.log("\nPosition Assignments:");
        for (let posIdx = 0; posIdx < POSITION_COUNT; posIdx++) {
            const position = INDEX_TO_POSITION[posIdx];
            const teamAPlayers = result.teamA.positions[posIdx];
            const teamBPlayers = result.teamB.positions[posIdx];
            
            if (teamAPlayers.length > 0) {
                console.log(`  ${position} (Team A):`);
                for (const player of teamAPlayers) {
                    const efficiency = player.bestScore > 0 ? player.scores[posIdx] / player.bestScore : 0;
                    const bestPos = INDEX_TO_POSITION[player.bestPosition];
                    const isSpecialist = player.bestPosition === posIdx && player.specializationRatio >= config.dominanceRatio;
                    console.log(`    Score: ${player.scores[posIdx].toFixed(0)}, ` +
                        `Best: ${player.bestScore.toFixed(0)} @ ${bestPos}, ` +
                        `Eff: ${(efficiency * 100).toFixed(0)}%, ` +
                        `${isSpecialist ? '⭐ SPECIALIST' : ''}`);
                }
            }
            
            if (teamBPlayers.length > 0) {
                console.log(`  ${position} (Team B):`);
                for (const player of teamBPlayers) {
                    const efficiency = player.bestScore > 0 ? player.scores[posIdx] / player.bestScore : 0;
                    const bestPos = INDEX_TO_POSITION[player.bestPosition];
                    const isSpecialist = player.bestPosition === posIdx && player.specializationRatio >= config.dominanceRatio;
                    console.log(`    Score: ${player.scores[posIdx].toFixed(0)}, ` +
                        `Best: ${player.bestScore.toFixed(0)} @ ${bestPos}, ` +
                        `Eff: ${(efficiency * 100).toFixed(0)}%, ` +
                        `${isSpecialist ? '⭐ SPECIALIST' : ''}`);
                }
            }
        }
    }
    
    // Summary
    console.log("\n" + "═".repeat(60));
    
    // Need to recalculate posDiff here since it's in function scope
    const actualPosDiff = Math.abs(result.teamA.totalScore - result.teamB.totalScore);
    const overallBalance = actualPosDiff < 50 ? "⭐ EXCELLENT" 
        : actualPosDiff < 100 ? "✅ GOOD" 
        : actualPosDiff < 200 ? "⚠️ ACCEPTABLE" 
        : "❌ NEEDS IMPROVEMENT";
    
    console.log("SUMMARY:", result.teamA.playerCount > result.teamB.playerCount 
        ? "Team A has more players" 
        : result.teamB.playerCount > result.teamA.playerCount
        ? "Team B has more players"
        : "Teams have equal players");
    console.log("Balance Quality:", overallBalance);
    console.log("═".repeat(60));
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Main entry point for team auto-balancing
 * 
 * @param players - Array of scored players to balance
 * @param debugMode - Enable debug logging
 * @returns Balanced teams with assigned positions
 * @throws Error if player count is invalid
 * 
 * @example
 * ```typescript
 * const teams = autoCreateTeamsScored(players);
 * console.log(`Team A: ${teams.a.length} players`);
 * console.log(`Team B: ${teams.b.length} players`);
 * ```
 */
export function autoCreateTeamsScored(
    players: ScoredGamePlayer[],
    debugMode: boolean = false
): { a: ScoredGamePlayer[]; b: ScoredGamePlayer[] } {
    // Validate input
    if (players.length < 10) {
        throw new Error("Not enough players to form teams (minimum: 10)");
    }
    if (players.length > 24) {
        throw new Error("Too many players to form teams (maximum: 24)");
    }
    
    // Convert to optimized format
    const fastPlayers = players.map(toFastPlayer);
    
    // Configure algorithm - ENABLE_DEBUG overrides everything
    const config: BalanceConfig = {
        ...DEFAULT_CONFIG,
        debugMode: ENABLE_DEBUG || debugMode,
    };
    
    if (config.debugMode) {
        console.log("\n🔍 DEBUG MODE ENABLED (set ENABLE_DEBUG to false to disable)");
        console.log(`Running auto-balance for ${players.length} players...`);
    }
    
    // Run optimization
    const result = config.recursive 
        ? runRecursiveOptimization(fastPlayers, config)
        : runMonteCarlo(fastPlayers, config);
    
    if (!result) {
        throw new Error("Failed to balance teams - no valid formation found");
    }
    
    // Log results if debugging
    logResults(result, config);
    
    // Convert and return
    return convertToGamePlayers(result);
}

/**
 * Convenience wrapper for filled game players
 * 
 * @param players - Array of players with stats
 * @param debugMode - Enable debug logging
 * @returns Balanced teams with assigned positions
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

/**
 * Advanced API with custom configuration
 * 
 * @param players - Array of scored players
 * @param customConfig - Custom balance configuration
 * @returns Balanced teams with detailed metrics
 */
export function autoBalanceWithConfig(
    players: ScoredGamePlayer[],
    customConfig: Partial<BalanceConfig> = {}
): {
    teams: { a: ScoredGamePlayer[]; b: ScoredGamePlayer[] };
    metrics: BalanceMetrics;
} {
    // Validate input
    if (players.length < 10 || players.length > 24) {
        throw new Error(`Invalid player count: ${players.length} (must be 10-24)`);
    }
    
    // Merge with defaults
    const config: BalanceConfig = {
        ...DEFAULT_CONFIG,
        ...customConfig,
        weights: {
            ...DEFAULT_CONFIG.weights,
            ...customConfig.weights,
        },
    };
    
    // Validate weights sum to 1
    const weightSum = Object.values(config.weights).reduce((a, b) => a + b, 0);
    if (Math.abs(weightSum - 1.0) > 0.01) {
        throw new Error(`Weights must sum to 1.0 (current: ${weightSum})`);
    }
    
    // Convert and optimize
    const fastPlayers = players.map(toFastPlayer);
    const result = config.recursive 
        ? runRecursiveOptimization(fastPlayers, config)
        : runMonteCarlo(fastPlayers, config);
    
    if (!result) {
        throw new Error("Failed to balance teams");
    }
    
    logResults(result, config);
    
    return {
        teams: convertToGamePlayers(result),
        metrics: result.metrics,
    };
}

/**
 * Gets available formations for a player count
 * 
 * @param playerCount - Number of players
 * @returns Available formation templates
 */
export function getAvailableFormations(playerCount: number): Formation[] {
    return formationTemplates[playerCount] || [];
}

/**
 * Validates if auto-balance is possible for given player count
 * 
 * @param playerCount - Number of players to check
 * @returns Whether balancing is possible
 */
export function canAutoBalance(playerCount: number): boolean {
    if (playerCount < 10 || playerCount > 24) return false;
    
    const teamSize1 = Math.floor(playerCount / 2);
    const teamSize2 = playerCount - teamSize1;
    
    return !!(formationTemplates[teamSize1]?.length && formationTemplates[teamSize2]?.length);
}
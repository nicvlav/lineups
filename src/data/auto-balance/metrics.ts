/**
 * Auto-Balance Metrics Calculation
 * 
 * Functions for calculating team balance metrics and scores.
 * 
 * @module auto-balance/metrics
 */

import type { FastTeam, BalanceConfig, BalanceMetrics } from "./types";
import { AGGRESSION_EXPONENT } from "./constants";

/**
 * Calculates energy balance between teams
 * Uses smart system that heavily penalizes directional imbalances
 */
function calculateEnergyBalance(teamA: FastTeam, teamB: FastTeam): number {
    // Calculate individual component differences
    const staminaDiff = teamA.staminaScore - teamB.staminaScore;
    const attackDiff = teamA.attackWorkRateScore - teamB.attackWorkRateScore;
    const defenseDiff = teamA.defensiveWorkRateScore - teamB.defensiveWorkRateScore;

    // Calculate base balance for each component
    const staminaBalance = calculateStaminaBalanceWithCompensation(
        teamA.staminaScore, teamB.staminaScore,
        teamA.attackWorkRateScore + teamA.defensiveWorkRateScore,
        teamB.attackWorkRateScore + teamB.defensiveWorkRateScore
    );

    const workRateBalance = calculateWorkRateBalanceWithCancellation(
        teamA.attackWorkRateScore, teamB.attackWorkRateScore,
        teamA.defensiveWorkRateScore, teamB.defensiveWorkRateScore
    );

    // Calculate directional imbalance penalty
    const directionalPenalty = calculateDirectionalImbalancePenalty(staminaDiff, attackDiff, defenseDiff);

    // Apply directional penalty to the combined score
    return (staminaBalance * workRateBalance) * directionalPenalty;
}

/**
 * Calculates penalty for when all components favor the same team
 * The more components that favor one team, the harsher the penalty
 */
function calculateDirectionalImbalancePenalty(staminaDiff: number, attackDiff: number, defenseDiff: number): number {
    // Count how many components favor each team
    const teamAFavors = [staminaDiff > 0, attackDiff > 0, defenseDiff > 0].filter(Boolean).length;
    const teamBFavors = [staminaDiff < 0, attackDiff < 0, defenseDiff < 0].filter(Boolean).length;

    const maxFavors = Math.max(teamAFavors, teamBFavors);

    // No penalty if perfectly balanced (all diffs = 0)
    if (staminaDiff === 0 && attackDiff === 0 && defenseDiff === 0) return 1.0;

    // Calculate penalty based on directional clustering
    switch (maxFavors) {
        case 0: // Impossible case
        case 1: return 1.0;      // Only 1 component favors a team = no penalty
        case 2: return 0.85;     // 2 components favor same team = 15% penalty
        case 3: return 0.50;     // All 3 components favor same team = 50% penalty (HARSH!)
        default: return 1.0;
    }
}

/**
 * Calculates work rate balance emphasizing minimal differences with some cancellation
 * Teams with opposite work rate imbalances should partially cancel out
 */
function calculateWorkRateBalanceWithCancellation(
    teamAAttack: number, teamBAttack: number,
    teamADefense: number, teamBDefense: number
): number {
    const totalAttack = teamAAttack + teamBAttack;
    const totalDefense = teamADefense + teamBDefense;

    if (totalAttack === 0 && totalDefense === 0) return 1;

    // Calculate individual differences (emphasize raw differences)
    const attackDiff = Math.abs(teamAAttack - teamBAttack);
    const defenseDiff = Math.abs(teamADefense - teamBDefense);

    // Calculate balance for each component individually first
    const attackBalance = totalAttack > 0 ? 1 - (attackDiff / totalAttack) : 1;
    const defenseBalance = totalDefense > 0 ? 1 - (defenseDiff / totalDefense) : 1;

    // Apply moderate curve to each component (exponent 1.8 = moderately punitive)
    // Linear 96.7% becomes ~93%, Linear 98.6% becomes ~97%
    const attackBalanceCurved = Math.pow(attackBalance, 3);
    const defenseBalanceCurved = Math.pow(defenseBalance, 3);

    // Combine with slight cancellation bonus for opposite imbalances
    const signedAttackDiff = teamAAttack - teamBAttack;
    const signedDefenseDiff = teamADefense - teamBDefense;
    const cancellationBonus = (signedAttackDiff * signedDefenseDiff) < 0 ? 1.05 : 1.0; // 5% bonus for opposite signs

    // Take geometric mean of the two components with cancellation bonus
    return Math.sqrt(attackBalanceCurved * defenseBalanceCurved) * Math.min(cancellationBonus, 1.0);
}

/**
 * Calculates stamina balance emphasizing minimal differences with work rate compensation
 * Teams with lower total work rates should have higher stamina to compensate
 */
function calculateStaminaBalanceWithCompensation(
    teamAStamina: number, teamBStamina: number,
    teamATotalWorkRate: number, teamBTotalWorkRate: number
): number {
    const totalStamina = teamAStamina + teamBStamina;
    const totalWorkRate = teamATotalWorkRate + teamBTotalWorkRate;

    if (totalStamina === 0) return 1;

    // Calculate raw stamina difference (emphasize minimizing absolute differences)
    const rawStaminaDiff = Math.abs(teamAStamina - teamBStamina);
    const rawStaminaPercent = rawStaminaDiff / totalStamina;

    // Calculate work rate compensation factor
    // Team with lower work rate should be allowed slightly higher stamina
    let compensationFactor = 1.0;
    if (totalWorkRate > 0) {
        const workRateDiff = Math.abs(teamATotalWorkRate - teamBTotalWorkRate);
        const workRatePercent = workRateDiff / totalWorkRate;
        // Reduce penalty by up to 15% based on work rate imbalance (less compensation)
        compensationFactor = 1.0 - (workRatePercent * 0.15);
    }

    // Apply compensation and then moderate curve (exponent 2.5 = moderately harsh)
    const adjustedPercent = rawStaminaPercent * compensationFactor;
    // Linear 99.4% becomes ~92%, Linear 95% becomes ~84%
    return Math.pow(1 - adjustedPercent, 5);
}

/**
 * Calculates comprehensive balance metrics
 * A well balanced team needs to meet a bunch of criteria
 * Which can include : overall player skill on each team, how suitable each player is to their position, etc
 */
export function calculateMetrics(
    teamA: FastTeam,
    teamB: FastTeam,
    config: BalanceConfig
): { score: number; details: BalanceMetrics } {
    const metrics: BalanceMetrics = {
        balance: 0,
        positionBalance: 0,
        zonalBalance: 0,
        attackDefenseBalance: 0,
        energy: 0,
    };
    
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
    
    // Attack/Defense Balance: Equal distribution of attacking and defensive talent
    // This prevents scenarios where one team gets all defenders and the other all attackers
    const calcAttackDefenseBalance = () => {
        // Calculate percentage of total score in each category for each team
        const teamATotalCat = teamA.defensiveScore + teamA.neutralScore + teamA.attackingScore;
        const teamBTotalCat = teamB.defensiveScore + teamB.neutralScore + teamB.attackingScore;
        
        if (teamATotalCat === 0 || teamBTotalCat === 0) return 0;
        
        // Get percentages for each category
        const teamADefPct = teamA.defensiveScore / teamATotalCat;
        const teamANeuPct = teamA.neutralScore / teamATotalCat;
        const teamAAttPct = teamA.attackingScore / teamATotalCat;
        
        const teamBDefPct = teamB.defensiveScore / teamBTotalCat;
        const teamBNeuPct = teamB.neutralScore / teamBTotalCat;
        const teamBAttPct = teamB.attackingScore / teamBTotalCat;
        
        // Calculate balance for each category (1 = perfect balance, 0 = total imbalance)
        const defBalance = 1 - Math.abs(teamADefPct - teamBDefPct);
        const neuBalance = 1 - Math.abs(teamANeuPct - teamBNeuPct);
        const attBalance = 1 - Math.abs(teamAAttPct - teamBAttPct);
        
        // AGGRESSIVE SCALING: Use power function to harshly penalize imbalances
        // Using exponent of 0.4 (between square root 0.5 and cube root 0.33)
        
        // Calculate absolute differences with aggressive scaling
        const defAbsDiff = Math.abs(teamA.defensiveScore - teamB.defensiveScore);
        const attAbsDiff = Math.abs(teamA.attackingScore - teamB.attackingScore);
        const neuAbsDiff = Math.abs(teamA.neutralScore - teamB.neutralScore);
        
        const maxDef = Math.max(teamA.defensiveScore, teamB.defensiveScore, 1);
        const maxAtt = Math.max(teamA.attackingScore, teamB.attackingScore, 1);
        const maxNeu = Math.max(teamA.neutralScore, teamB.neutralScore, 1);
        
        // Apply aggressive power scaling: small differences get amplified
        // Example: 6/378 = 0.016 becomes 0.126 with exponent 0.4
        const defAbsBalance = 1 - Math.pow(defAbsDiff / maxDef, AGGRESSION_EXPONENT);
        const attAbsBalance = 1 - Math.pow(attAbsDiff / maxAtt, AGGRESSION_EXPONENT);
        const neuAbsBalance = 1 - Math.pow(neuAbsDiff / maxNeu, AGGRESSION_EXPONENT);
        
        // Combine percentage and absolute balance with aggressive absolute weighting
        // Increased absolute balance weights to emphasize the aggressive scaling
        return (defBalance * 0.2 + neuBalance * 0.05 + attBalance * 0.2 + 
                defAbsBalance * 0.25 + attAbsBalance * 0.25 + neuAbsBalance * 0.05);
    };
    
    metrics.attackDefenseBalance = calcAttackDefenseBalance();

    // Energy Balance: Equal distribution of stamina and work rates between teams
    metrics.energy = calculateEnergyBalance(teamA, teamB);

    // Calculate weighted score
    const score =
        config.weights.balance * metrics.balance +
        config.weights.positionBalance * metrics.positionBalance +
        config.weights.zonalBalance * metrics.zonalBalance +
        config.weights.attackDefenseBalance * metrics.attackDefenseBalance +
        config.weights.energy * metrics.energy;
    
    return { score, details: metrics };
}
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
 * Calculates comprehensive balance metrics
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
    
    // Calculate weighted score
    const score = 
        config.weights.balance * metrics.balance +
        config.weights.positionBalance * metrics.positionBalance +
        config.weights.zonalBalance * metrics.zonalBalance +
        config.weights.attackDefenseBalance * metrics.attackDefenseBalance;
    
    return { score, details: metrics };
}
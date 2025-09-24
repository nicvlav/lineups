/**
 * Auto-Balance Debug and Logging Utilities
 * 
 * Functions for debug output and result visualization.
 * 
 * @module auto-balance/debug
 */

import type { SimulationResult, BalanceConfig } from "./types";
import { ENABLE_DEBUG, INDEX_TO_POSITION, POSITION_COUNT, AGGRESSION_EXPONENT } from "./constants";

/**
 * Debug helper functions that replicate the energy balance calculations
 */
function calculateWorkRateBalanceWithCancellationDebug(
    teamAAttack: number, teamBAttack: number,
    teamADefense: number, teamBDefense: number
): number {
    const totalAttack = teamAAttack + teamBAttack;
    const totalDefense = teamADefense + teamBDefense;

    if (totalAttack === 0 && totalDefense === 0) return 1;

    const attackDiff = Math.abs(teamAAttack - teamBAttack);
    const defenseDiff = Math.abs(teamADefense - teamBDefense);

    const attackBalance = totalAttack > 0 ? 1 - (attackDiff / totalAttack) : 1;
    const defenseBalance = totalDefense > 0 ? 1 - (defenseDiff / totalDefense) : 1;

    const attackBalanceCurved = Math.pow(attackBalance, 3);
    const defenseBalanceCurved = Math.pow(defenseBalance, 3);

    const signedAttackDiff = teamAAttack - teamBAttack;
    const signedDefenseDiff = teamADefense - teamBDefense;
    const cancellationBonus = (signedAttackDiff * signedDefenseDiff) < 0 ? 1.05 : 1.0;

    return Math.sqrt(attackBalanceCurved * defenseBalanceCurved) * Math.min(cancellationBonus, 1.0);
}

function calculateStaminaBalanceWithCompensationDebug(
    teamAStamina: number, teamBStamina: number,
    teamATotalWorkRate: number, teamBTotalWorkRate: number
): number {
    const totalStamina = teamAStamina + teamBStamina;
    const totalWorkRate = teamATotalWorkRate + teamBTotalWorkRate;

    if (totalStamina === 0) return 1;

    const rawStaminaDiff = Math.abs(teamAStamina - teamBStamina);
    const rawStaminaPercent = rawStaminaDiff / totalStamina;

    let compensationFactor = 1.0;
    if (totalWorkRate > 0) {
        const workRateDiff = Math.abs(teamATotalWorkRate - teamBTotalWorkRate);
        const workRatePercent = workRateDiff / totalWorkRate;
        compensationFactor = 1.0 - (workRatePercent * 0.15);
    }

    const adjustedPercent = rawStaminaPercent * compensationFactor;
    return Math.pow(1 - adjustedPercent, 4);
}

/**
 * Logs detailed balance results with comprehensive metrics
 */
export function logResults(result: SimulationResult, config: BalanceConfig): void {
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
    
    // Attack/Defense Analysis
    console.log("\n⚔️ ATTACK/DEFENSE DISTRIBUTION");
    console.log("─".repeat(40));
    console.log("  Category  | Team A      | Team B      | Diff");
    console.log("  ----------|-------------|-------------|--------");
    
    const categories = [
        { name: 'Defense', a: result.teamA.defensiveScore, b: result.teamB.defensiveScore },
        { name: 'Neutral', a: result.teamA.neutralScore, b: result.teamB.neutralScore },
        { name: 'Attack', a: result.teamA.attackingScore, b: result.teamB.attackingScore },
    ];
    
    for (const cat of categories) {
        const diff = cat.a - cat.b;
        const aStr = cat.a.toFixed(0);
        const bStr = cat.b.toFixed(0);
        const diffStr = `${diff > 0 ? '+' : ''}${diff.toFixed(0)}`;
        console.log(`  ${cat.name.padEnd(9)} | ${aStr.padEnd(11)} | ${bStr.padEnd(11)} | ${diffStr}`);
    }
    
    // Calculate and display percentage distribution
    const teamATotal = result.teamA.defensiveScore + result.teamA.neutralScore + result.teamA.attackingScore;
    const teamBTotal = result.teamB.defensiveScore + result.teamB.neutralScore + result.teamB.attackingScore;
    
    if (teamATotal > 0 && teamBTotal > 0) {
        console.log("\n  Percentage Distribution:");
        console.log(`    Team A: Def ${(result.teamA.defensiveScore/teamATotal*100).toFixed(0)}% | Neu ${(result.teamA.neutralScore/teamATotal*100).toFixed(0)}% | Att ${(result.teamA.attackingScore/teamATotal*100).toFixed(0)}%`);
        console.log(`    Team B: Def ${(result.teamB.defensiveScore/teamBTotal*100).toFixed(0)}% | Neu ${(result.teamB.neutralScore/teamBTotal*100).toFixed(0)}% | Att ${(result.teamB.attackingScore/teamBTotal*100).toFixed(0)}%`);
        
        // Show impact of aggressive scaling
        const defDiff = Math.abs(result.teamA.defensiveScore - result.teamB.defensiveScore);
        const attDiff = Math.abs(result.teamA.attackingScore - result.teamB.attackingScore);
        const maxDef = Math.max(result.teamA.defensiveScore, result.teamB.defensiveScore, 1);
        const maxAtt = Math.max(result.teamA.attackingScore, result.teamB.attackingScore, 1);
        
        if (defDiff > 0 || attDiff > 0) {
            console.log("\n  Balance Impact (with aggressive scaling ^0.4):");
            if (defDiff > 0) {
                const linearPenalty = defDiff / maxDef;
                const aggressivePenalty = Math.pow(linearPenalty, AGGRESSION_EXPONENT);
                console.log(`    Defense: ${(linearPenalty * 100).toFixed(1)}% diff → ${(aggressivePenalty * 100).toFixed(1)}% penalty`);
            }
            if (attDiff > 0) {
                const linearPenalty = attDiff / maxAtt;
                const aggressivePenalty = Math.pow(linearPenalty, AGGRESSION_EXPONENT);
                console.log(`    Attack:  ${(linearPenalty * 100).toFixed(1)}% diff → ${(aggressivePenalty * 100).toFixed(1)}% penalty`);
            }
        }
    }

    // Energy Analysis
    console.log("\n⚡ ENERGY ANALYSIS (stamina + work rates)");
    console.log("─".repeat(40));
    console.log("  Component | Team A      | Team B      | Diff");
    console.log("  ----------|-------------|-------------|--------");

    const energyComponents = [
        { name: 'Stamina', a: result.teamA.staminaScore, b: result.teamB.staminaScore },
        { name: 'Att Work', a: result.teamA.attackWorkRateScore, b: result.teamB.attackWorkRateScore },
        { name: 'Def Work', a: result.teamA.defensiveWorkRateScore, b: result.teamB.defensiveWorkRateScore },
    ];

    for (const comp of energyComponents) {
        const diff = comp.a - comp.b;
        const aStr = comp.a.toFixed(0);
        const bStr = comp.b.toFixed(0);
        const diffStr = `${diff > 0 ? '+' : ''}${diff.toFixed(0)}`;
        console.log(`  ${comp.name.padEnd(9)} | ${aStr.padEnd(11)} | ${bStr.padEnd(11)} | ${diffStr}`);
    }

    // Calculate individual component balances and show the multiplicative effect
    const staminaTotal = result.teamA.staminaScore + result.teamB.staminaScore;
    const attackWorkTotal = result.teamA.attackWorkRateScore + result.teamB.attackWorkRateScore;
    const defenseWorkTotal = result.teamA.defensiveWorkRateScore + result.teamB.defensiveWorkRateScore;

    if (staminaTotal > 0 || attackWorkTotal > 0 || defenseWorkTotal > 0) {
        console.log("\n  Smart Energy Balance Calculation:");

        // Calculate work rate differences and cancellation
        const attackDiff = result.teamA.attackWorkRateScore - result.teamB.attackWorkRateScore;
        const defenseDiff = result.teamA.defensiveWorkRateScore - result.teamB.defensiveWorkRateScore;
        const netWorkRateImbalance = Math.abs(attackDiff - defenseDiff);
        const maxWorkRateImbalance = Math.abs(attackDiff) + Math.abs(defenseDiff);

        console.log(`    Attack Work Diff:    ${attackDiff > 0 ? '+' : ''}${attackDiff.toFixed(0)} (Team ${attackDiff > 0 ? 'A' : 'B'} stronger)`);
        console.log(`    Defense Work Diff:   ${defenseDiff > 0 ? '+' : ''}${defenseDiff.toFixed(0)} (Team ${defenseDiff > 0 ? 'A' : 'B'} stronger)`);

        if (maxWorkRateImbalance > 0) {
            const cancellationPercent = (1 - netWorkRateImbalance / maxWorkRateImbalance) * 100;
            console.log(`    Cancellation Effect: ${cancellationPercent.toFixed(1)}% (opposite imbalances partially cancel)`);
        }

        // Calculate using the smart system
        const workRateBalance = calculateWorkRateBalanceWithCancellationDebug(
            result.teamA.attackWorkRateScore, result.teamB.attackWorkRateScore,
            result.teamA.defensiveWorkRateScore, result.teamB.defensiveWorkRateScore
        );

        const staminaBalance = calculateStaminaBalanceWithCompensationDebug(
            result.teamA.staminaScore, result.teamB.staminaScore,
            result.teamA.attackWorkRateScore + result.teamA.defensiveWorkRateScore,
            result.teamB.attackWorkRateScore + result.teamB.defensiveWorkRateScore
        );

        const overallEnergyBalance = staminaBalance * workRateBalance;

        // Show linear comparisons for reference
        const staminaLinear = 1 - (Math.abs(result.teamA.staminaScore - result.teamB.staminaScore) / staminaTotal);

        console.log("\n  Final Balance Scores:");

        // Calculate individual work rate balances for detailed display
        const attackLinear = attackWorkTotal > 0 ? 1 - (Math.abs(attackDiff) / attackWorkTotal) : 1;
        const defenseLinear = defenseWorkTotal > 0 ? 1 - (Math.abs(defenseDiff) / defenseWorkTotal) : 1;

        console.log(`    Attack Work Balance: ${(Math.pow(attackLinear, 1.8) * 100).toFixed(1)}% (vs linear: ${(attackLinear * 100).toFixed(1)}%) [MODERATE CURVE 1.8]`);
        console.log(`    Defense Work Balance:${(Math.pow(defenseLinear, 1.8) * 100).toFixed(1)}% (vs linear: ${(defenseLinear * 100).toFixed(1)}%) [MODERATE CURVE 1.8]`);
        console.log(`    Combined Work Rate:  ${(workRateBalance * 100).toFixed(1)}% (geometric mean + 5% cancellation bonus)`);
        console.log(`    Stamina Balance:     ${(staminaBalance * 100).toFixed(1)}% (vs linear: ${(staminaLinear * 100).toFixed(1)}%) [MODERATE CURVE 2.5 + compensation]`);
        console.log(`    Overall Energy:      ${(overallEnergyBalance * 100).toFixed(1)}% (multiplicative)`);
        console.log("    Note: Curves emphasize minimizing absolute differences");
    }

    console.log("\nBalance Metrics:");
    console.log(`  Team Balance:        ${(result.metrics.balance * 100).toFixed(1)}%`);
    console.log(`  Position Balance:    ${(result.metrics.positionBalance * 100).toFixed(1)}%`);
    console.log(`  Zonal Balance:       ${(result.metrics.zonalBalance * 100).toFixed(1)}%`);
    console.log(`  Attack/Def Balance:  ${(result.metrics.attackDefenseBalance * 100).toFixed(1)}%`);
    console.log(`  Energy Balance:      ${(result.metrics.energy * 100).toFixed(1)}%`);
    console.log(`  Overall Score:       ${result.score.toFixed(3)}`);
    
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
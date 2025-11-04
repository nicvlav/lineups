/**
 * Auto-Balance V3 Demo
 *
 * Run this to see the new professional calibrated system in action!
 *
 * Usage:
 * 1. Import your actual player data
 * 2. Call autoBalanceV3 with debug mode enabled
 * 3. Marvel at the beautiful, informative output!
 */

// import { autoBalanceV3, DEFAULT_BALANCE_CONFIG } from "./index";
// import type { ScoredGamePlayer } from "@/data/player-types";

//  /**
//  * Demo 1: Basic usage with default config
//  */
// export function demoBasicUsage(players: ScoredGamePlayer[]) {
//     console.log("\n" + "=".repeat(80));
//     console.log("DEMO 1: Basic Usage with Full Debug Output");
//     console.log("=".repeat(80));

//     const result = autoBalanceV3(players, undefined, true);

//     console.log("\n📋 RESULT SUMMARY:");
//     console.log(`   Final Score: ${result.score.toFixed(3)}`);
//     console.log(`   Team A: ${result.teams.a.length} players`);
//     console.log(`   Team B: ${result.teams.b.length} players`);

//     console.log("\n📊 INDIVIDUAL METRICS:");
//     Object.entries(result.metrics).forEach(([key, value]) => {
//         const emoji = getMetricEmoji(key);
//         console.log(`   ${emoji} ${formatMetricName(key)}: ${value.toFixed(3)}`);
//     });

//     return result;
// }

// /**
//  * Demo 2: Emphasize star distribution
//  */
// export function demoStarEmphasis(players: ScoredGamePlayer[]) {
//     console.log("\n" + "=".repeat(80));
//     console.log("DEMO 2: Custom Config - Emphasize Star Distribution");
//     console.log("=".repeat(80));

//     const result = autoBalanceV3(players, {
//         weights: {
//             primary: {
//                 starDistribution: 0.40,  // Increased from 0.30
//                 scoreBalance: 0.25,       // Decreased from 0.30
//                 peakPotential: 0.15,        // Same
//             }
//         }
//     }, true);

//     console.log("\n⭐ Star distribution is now weighted 40% instead of 30%");
//     console.log(`   Star Distribution Score: ${result.metrics.talentDistributionBalance.toFixed(3)}`);
//     console.log(`   Contribution to Final: ${(result.metrics.talentDistributionBalance * 0.40).toFixed(3)}`);

//     return result;
// }

// /**
//  * Demo 3: Stricter quality requirements
//  */
// export function demoStrictThresholds(players: ScoredGamePlayer[]) {
//     console.log("\n" + "=".repeat(80));
//     console.log("DEMO 3: Stricter Thresholds for Higher Quality");
//     console.log("=".repeat(80));

//     const result = autoBalanceV3(players, {
//         thresholds: {
//             scoreBalance: {
//                 perfect: 0.995,   // Within 0.5% instead of 1%
//                 acceptable: 0.98, // Within 2% instead of 3%
//                 poor: 0.92,       // >8% instead of >10%
//             }
//         },
//         monteCarlo: {
//             maxIterations: 300,  // More iterations to find stricter result
//         }
//     }, true);

//     console.log("\n🎯 Using stricter thresholds:");
//     console.log(`   Perfect: ≥0.995 (was ≥0.99)`);
//     console.log(`   Acceptable: ≥0.98 (was ≥0.97)`);
//     console.log(`   Final Score: ${result.score.toFixed(3)}`);

//     return result;
// }

// /**
//  * Demo 4: Compare default vs custom config
//  */
// export function demoComparison(players: ScoredGamePlayer[]) {
//     console.log("\n" + "=".repeat(80));
//     console.log("DEMO 4: Side-by-Side Comparison");
//     console.log("=".repeat(80));

//     console.log("\n🔵 Running with DEFAULT config...");
//     const defaultResult = autoBalanceV3(players, undefined, false);

//     console.log("\n🟢 Running with CUSTOM config (star emphasis)...");
//     const customResult = autoBalanceV3(players, {
//         weights: {
//             primary: {
//                 starDistribution: 0.50,  // Maximum emphasis
//                 scoreBalance: 0.20,
//                 zoneBalance: 0.10,
//             }
//         }
//     }, false);

//     console.log("\n📊 COMPARISON:");
//     console.log("─".repeat(80));
//     console.log("Metric                          Default         Custom (Star Emphasis)");
//     console.log("─".repeat(80));

//     const metrics = [
//         'talentDistributionBalance',
//         'positionalScoreBalance',
//         'zonalDistributionBalance',
//         'overallStrengthBalance',
//         'allStatBalance',
//     ];

//     metrics.forEach(metric => {
//         const defaultVal = defaultResult.metrics[metric as keyof typeof defaultResult.metrics];
//         const customVal = customResult.metrics[metric as keyof typeof customResult.metrics];
//         const diff = customVal - defaultVal;
//         const diffStr = diff >= 0 ? `+${diff.toFixed(3)}` : diff.toFixed(3);

//         console.log(
//             `${formatMetricName(metric).padEnd(30)} ${defaultVal.toFixed(3)}         ${customVal.toFixed(3)} (${diffStr})`
//         );
//     });

//     console.log("─".repeat(80));
//     console.log(`FINAL SCORE:                    ${defaultResult.score.toFixed(3)}         ${customResult.score.toFixed(3)}`);
//     console.log("─".repeat(80));

//     return { defaultResult, customResult };
// }

// /**
//  * Demo 5: Show all available configuration options
//  */
// export function demoShowConfig() {
//     console.log("\n" + "=".repeat(80));
//     console.log("DEMO 5: Current Default Configuration");
//     console.log("=".repeat(80));

//     const config = DEFAULT_BALANCE_CONFIG;

//     console.log("\n⚖️  WEIGHTS:");
//     console.log("   Primary:");
//     console.log(`     - Score Balance:      ${config.weights.primary.scoreBalance}`);
//     console.log(`     - Star Distribution:  ${config.weights.primary.starDistribution}`);
//     console.log(`     - Zone Balance:       ${config.weights.primary.zoneBalance}`);
//     console.log("   Secondary:");
//     console.log(`     - Peak Potential:     ${config.weights.secondary.peakPotential}`);
//     console.log(`     - All-Stat Balance:   ${config.weights.secondary.allStatBalance}`);
//     console.log(`     - Energy:             ${config.weights.secondary.energy}`);
//     console.log(`     - Creativity:         ${config.weights.secondary.creativity}`);
//     console.log(`     - Striker:            ${config.weights.secondary.striker}`);

//     console.log("\n🎯 THRESHOLDS (Score Balance Example):");
//     console.log(`     - Perfect:    ≥${config.thresholds.scoreBalance.perfect} (<1% difference)`);
//     console.log(`     - Acceptable: ≥${config.thresholds.scoreBalance.acceptable} (<3% difference)`);
//     console.log(`     - Poor:       ≤${config.thresholds.scoreBalance.poor} (>10% difference)`);

//     console.log("\n🎲 ALGORITHM:");
//     console.log(`     - Proximity Threshold:  ${config.algorithm.proximityThreshold} points`);
//     console.log(`     - Base Top N:           ${config.algorithm.baseTopN} candidates`);
//     console.log(`     - Selection Weights:    ${config.algorithm.selectionWeights.map(w => `${(w*100).toFixed(0)}%`).join(', ')}`);

//     console.log("\n🎰 MONTE CARLO:");
//     console.log(`     - Max Iterations:       ${config.monteCarlo.maxIterations}`);
//     console.log(`     - Early Exit:           ${config.monteCarlo.earlyExitThreshold}`);
//     console.log(`     - Track Top N:          ${config.monteCarlo.trackTopN}`);

//     console.log("\n⭐ STAR PLAYERS:");
//     console.log(`     - Absolute Minimum:     ${config.starPlayers.absoluteMinimum} rating`);
//     console.log(`     - Superstar Bonus:      +${config.starPlayers.superstarBonus} points`);
//     console.log(`     - Solid Range:          -${config.starPlayers.solidRange} points`);

//     console.log("\n📐 FORMULAS:");
//     console.log("   Creativity:");
//     console.log(`     - Vision: ${config.formulas.creativity.vision}x`);
//     console.log(`     - Passing: ${config.formulas.creativity.passing}x`);
//     console.log(`     - Teamwork: ${config.formulas.creativity.teamwork}x`);
//     console.log("   Striker:");
//     console.log(`     - Finishing: ${config.formulas.striker.finishing}x`);
//     console.log(`     - Off The Ball: ${config.formulas.striker.offTheBall}x`);
//     console.log(`     - Technique: ${config.formulas.striker.technique}x`);

//     console.log("\n💡 TIP: All of these can be customized in autoBalanceV3()!");
// }

// // Helper functions
// function getMetricEmoji(metricName: string): string {
//     const emojiMap: Record<string, string> = {
//         talentDistributionBalance: '⭐',
//         positionalScoreBalance: '⚖️',
//         zonalDistributionBalance: '🎯',
//         overallStrengthBalance: '💎',
//         allStatBalance: '📊',
//         energyBalance: '⚡',
//         creativityBalance: '🎨',
//         strikerBalance: '⚽',
//     };
//     return emojiMap[metricName] || '📌';
// }

// function formatMetricName(metricName: string): string {
//     return metricName
//         .replace(/([A-Z])/g, ' $1')
//         .replace(/^./, str => str.toUpperCase())
//         .trim();
// }

/**
 * Run all demos
 */
// export function runAllDemos(players: ScoredGamePlayer[]) {
//     console.log("\n");
//     console.log("╔════════════════════════════════════════════════════════════════════════╗");
//     console.log("║         AUTO-BALANCE V3 - COMPREHENSIVE DEMO                          ║");
//     console.log("║         Professional Calibrated Metrics System                        ║");
//     console.log("╚════════════════════════════════════════════════════════════════════════╝");

//     demoShowConfig();

//     const basic = demoBasicUsage(players);
//     const starEmphasis = demoStarEmphasis(players);
//     const strict = demoStrictThresholds(players);
//     const comparison = demoComparison(players);

//     console.log("\n" + "=".repeat(80));
//     console.log("✅ ALL DEMOS COMPLETE!");
//     console.log("=".repeat(80));
//     console.log("\n📚 See V3_USAGE_GUIDE.md for detailed documentation");
//     console.log("🔧 See metrics-config.ts for all configuration options");
//     console.log("🎯 See metric-transformations.ts for calibration details");
//     console.log("\n");

//     return {
//         basic,
//         starEmphasis,
//         strict,
//         comparison,
//     };
// }

// Example usage:
/*
import { runAllDemos } from "@/data/auto-balance/DEMO_V3";
import { myPlayers } from "./my-data";

runAllDemos(myPlayers);
*/

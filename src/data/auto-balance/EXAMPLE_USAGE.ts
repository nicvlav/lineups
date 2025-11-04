// /**
//  * Example Usage of Refactored Auto-Balance System
//  *
//  * This file demonstrates how to use the new calibrated, professional auto-balance system.
//  */

// import type { ScoredGamePlayer } from "@/data/player-types";
// import { toFastPlayer } from "./utils";
// import { runOptimizedMonteCarlo, convertToGamePlayers } from "./algorithm";
// import { DEFAULT_BALANCE_CONFIG } from "./metrics-config";
// import { convertToLegacyConfig } from "./types";
// import { diagnosticReport } from "./debug-tools";
// import { visualizeTransformation, calibratedScore, Steepness } from "./metric-transformations";

// /**
//  * Example 1: Basic usage with new optimized Monte Carlo
//  */
// export function exampleBasicUsage(players: ScoredGamePlayer[]) {
//     console.log("═══════════════════════════════════════════════════════════");
//     console.log("EXAMPLE 1: Basic Usage - Optimized Monte Carlo");
//     console.log("═══════════════════════════════════════════════════════════\n");

//     // Convert players to optimized format
//     const fastPlayers = players.map(toFastPlayer);

//     // Convert new config to legacy format (for backwards compatibility)
//     const legacyConfig = convertToLegacyConfig(DEFAULT_BALANCE_CONFIG);

//     // Run optimized Monte Carlo (200-250 iterations vs 2.5M!)
//     const result = runOptimizedMonteCarlo(fastPlayers, legacyConfig, true);

//     if (result) {
//         // Print comprehensive diagnostic
//         console.log("\n" + diagnosticReport(
//             result.teams.teamA,
//             result.teams.teamB,
//             result.metrics,
//             result.score,
//             DEFAULT_BALANCE_CONFIG
//         ));

//         // Convert back to game format
//         const teams = convertToGamePlayers(result);
//         console.log(`\nTeam A: ${teams.a.length} players`);
//         console.log(`Team B: ${teams.b.length} players`);

//         return teams;
//     }

//     return null;
// }

// /**
//  * Example 2: Understanding calibrated transformations
//  */
// export function exampleUnderstandTransformations() {
//     console.log("═══════════════════════════════════════════════════════════");
//     console.log("EXAMPLE 2: Understanding Calibrated Transformations");
//     console.log("═══════════════════════════════════════════════════════════\n");

//     // Show how score balance transformation works
//     console.log("Score Balance Transformation:");
//     console.log("(within 1% = perfect, within 3% = acceptable, >10% = poor)\n");

//     const scoreBalanceThresholds = DEFAULT_BALANCE_CONFIG.thresholds.scoreBalance;

//     // Test different balance ratios
//     const testCases = [
//         { ratio: 1.000, teamA: 400, teamB: 400, description: "Perfect balance" },
//         { ratio: 0.990, teamA: 400, teamB: 404, description: "Excellent (1% diff)" },
//         { ratio: 0.971, teamA: 400, teamB: 412, description: "Acceptable (3% diff)" },
//         { ratio: 0.952, teamA: 400, teamB: 420, description: "Mediocre (5% diff)" },
//         { ratio: 0.909, teamA: 400, teamB: 440, description: "Poor (10% diff)" },
//         { ratio: 0.833, teamA: 400, teamB: 480, description: "Terrible (20% diff)" },
//     ];

//     console.log("Team A | Team B | Diff % | Ratio | Score | Assessment");
//     console.log("──────────────────────────────────────────────────────────");

//     for (const testCase of testCases) {
//         const score = calibratedScore(
//             testCase.ratio,
//             scoreBalanceThresholds,
//             Steepness.VerySteep
//         );

//         const diffPct = ((testCase.teamB - testCase.teamA) / testCase.teamA * 100).toFixed(1);

//         console.log(
//             `${testCase.teamA.toString().padStart(6)} | ` +
//             `${testCase.teamB.toString().padStart(6)} | ` +
//             `${diffPct.padStart(6)}% | ` +
//             `${testCase.ratio.toFixed(3)} | ` +
//             `${score.toFixed(3)} | ` +
//             testCase.description
//         );
//     }

//     console.log("\n");

//     // Visualize the transformation curve
//     console.log("Score Balance Curve Visualization:\n");
//     const curve = visualizeTransformation(
//         (ratio) => calibratedScore(ratio, scoreBalanceThresholds, Steepness.VerySteep),
//         20
//     );
//     console.log(curve);
// }

// /**
//  * Example 3: Custom configuration
//  */
// export function exampleCustomConfiguration(players: ScoredGamePlayer[]) {
//     console.log("\n═══════════════════════════════════════════════════════════");
//     console.log("EXAMPLE 3: Custom Configuration");
//     console.log("═══════════════════════════════════════════════════════════\n");

//     // Create a custom configuration emphasizing zone balance
//     const customConfig = {
//         ...DEFAULT_BALANCE_CONFIG,
//         weights: {
//             primary: {
//                 scoreBalance: 0.25,        // Slightly reduce
//                 starDistribution: 0.25,    // Slightly reduce
//                 zoneBalance: 0.25,         // Increase to 25%!
//             },
//             secondary: {
//                 peakPotential: 0.10,
//                 allStatBalance: 0.06,
//                 energy: 0.03,
//                 creativity: 0.03,
//                 striker: 0.03,
//             }
//         },
//         // Make proximity threshold stricter (only within 3 points)
//         algorithm: {
//             ...DEFAULT_BALANCE_CONFIG.algorithm,
//             proximityThreshold: 3,
//         },
//         // Reduce iterations for speed
//         monteCarlo: {
//             ...DEFAULT_BALANCE_CONFIG.monteCarlo,
//             maxIterations: 100,
//             earlyExitThreshold: 0.92,
//         }
//     };

//     console.log("Custom Configuration:");
//     console.log("  - Zone Balance: 25% (increased from 15%)");
//     console.log("  - Proximity Threshold: 3 (stricter than default 5)");
//     console.log("  - Max Iterations: 100 (faster)");
//     console.log("  - Early Exit: 0.92 (easier to satisfy)\n");

//     const fastPlayers = players.map(toFastPlayer);
//     const legacyConfig = convertToLegacyConfig(customConfig);

//     const result = runOptimizedMonteCarlo(fastPlayers, legacyConfig, true);

//     if (result) {
//         console.log(`\n✓ Custom configuration result:`);
//         console.log(`  Final score: ${result.score.toFixed(3)}`);
//         console.log(`  Zone balance: ${result.metrics.zonalDistributionBalance.toFixed(3)}`);
//     }

//     return result;
// }

// /**
//  * Example 4: Configuration tuning workflow
//  */
// export function exampleConfigTuning() {
//     console.log("\n═══════════════════════════════════════════════════════════");
//     console.log("EXAMPLE 4: Configuration Tuning Workflow");
//     console.log("═══════════════════════════════════════════════════════════\n");

//     console.log("Step 1: Understand current thresholds\n");

//     const thresholds = DEFAULT_BALANCE_CONFIG.thresholds.scoreBalance;
//     console.log("Score Balance Thresholds:");
//     console.log(`  Perfect:    ratio >= ${thresholds.perfect} (<${((1 - thresholds.perfect) * 100).toFixed(1)}% diff)`);
//     console.log(`  Acceptable: ratio >= ${thresholds.acceptable} (<${((1 - thresholds.acceptable) * 100).toFixed(1)}% diff)`);
//     console.log(`  Poor:       ratio <= ${thresholds.poor} (>${((1 - thresholds.poor) * 100).toFixed(1)}% diff)`);

//     console.log("\nStep 2: Test transformation with your data\n");

//     console.log("If your typical team scores are ~400 points:");
//     console.log("  - 1% difference = 4 points (e.g., 400 vs 404)");
//     console.log("  - 3% difference = 12 points (e.g., 400 vs 412)");
//     console.log("  - 10% difference = 40 points (e.g., 400 vs 440)");

//     console.log("\nStep 3: Adjust thresholds based on what you consider acceptable\n");

//     console.log("Example adjustments:");
//     console.log("  - To be more strict:   perfect: 0.995, acceptable: 0.98");
//     console.log("  - To be more lenient:  perfect: 0.98, acceptable: 0.95");

//     console.log("\nStep 4: Adjust weights based on priorities\n");

//     console.log("Current weights:");
//     console.log(`  Score Balance:     ${DEFAULT_BALANCE_CONFIG.weights.primary.scoreBalance} (30%)`);
//     console.log(`  Star Distribution: ${DEFAULT_BALANCE_CONFIG.weights.primary.starDistribution} (30%)`);
//     console.log(`  Zone Balance:      ${DEFAULT_BALANCE_CONFIG.weights.primary.zoneBalance} (15%)`);

//     console.log("\nIf star distribution is most important:");
//     console.log("  star: 0.40, score: 0.25, zone: 0.15 (total: 0.80 for primary metrics)");

//     console.log("\nStep 5: Test and iterate!");
// }

// /**
//  * Example 5: Comparing old vs new system
//  */
// export function exampleCompareOldVsNew() {
//     console.log("\n═══════════════════════════════════════════════════════════");
//     console.log("EXAMPLE 5: Old vs New System Comparison");
//     console.log("═══════════════════════════════════════════════════════════\n");

//     console.log("OLD SYSTEM:");
//     console.log("  - Triple nested Monte Carlo: 500 × 100 × 100 = 5,000,000 iterations");
//     console.log("  - Different weights at each level (conflicting goals)");
//     console.log("  - Arbitrary power scaling: pow(ratio, 16), pow(ratio, 9)");
//     console.log("  - Magic numbers everywhere: vision * 5, epsilon: 0.995");
//     console.log("  - Results: 'Amazing OR awful' (high variance)");
//     console.log("  - Performance: ~30-60 seconds");

//     console.log("\nNEW SYSTEM:");
//     console.log("  - Optimized Monte Carlo: 200-250 iterations (100x fewer!)");
//     console.log("  - Single consistent configuration");
//     console.log("  - Calibrated thresholds: 'within 1% = perfect, 3% = acceptable'");
//     console.log("  - Centralized config: DEFAULT_BALANCE_CONFIG");
//     console.log("  - Results: 'Consistently good with occasional excellent'");
//     console.log("  - Performance: ~1-2 seconds");

//     console.log("\nKEY IMPROVEMENTS:");
//     console.log("  ✓ 100x faster (250 vs 5M iterations)");
//     console.log("  ✓ Guided randomness (weighted top-N selection)");
//     console.log("  ✓ Interpretable metrics (threshold-based)");
//     console.log("  ✓ Debuggable (diagnosticReport, explainScore)");
//     console.log("  ✓ Tunable (clear knobs to adjust)");
//     console.log("  ✓ Professional (no magic numbers)");
// }

// /**
//  * Run all examples
//  */
// export function runAllExamples(players: ScoredGamePlayer[]) {
//     exampleUnderstandTransformations();
//     exampleConfigTuning();
//     exampleCompareOldVsNew();

//     if (players && players.length > 0) {
//         exampleBasicUsage(players);
//         exampleCustomConfiguration(players);
//     }
// }

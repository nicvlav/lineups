/**
 * Auto-Balance Debug Tools
 *
 * Introspection and diagnostic utilities to understand metric behavior,
 * compare results, and debug balance issues.
 *
 * @module auto-balance/debug-tools
 */

import type { FastTeam, BalanceMetrics } from "./types";
import type { BalanceConfiguration, MetricWeights } from "./metrics-config";
import { getTotalWeight } from "./metrics-config";

/**
 * Metric contribution breakdown
 * Shows how much each metric contributed to the final score
 */
export interface MetricContribution {
    metricName: string;
    rawValue: number;
    weight: number;
    contribution: number;
    percentage: number;
}

/**
 * Detailed score explanation
 * Complete breakdown of how a score was calculated
 */
export interface ScoreExplanation {
    finalScore: number;
    weightedScore: number;
    contributions: MetricContribution[];
    topContributors: MetricContribution[];
    weakestMetrics: MetricContribution[];
}

/**
 * Explain how a score was calculated
 *
 * Shows contribution of each metric to the final score.
 * Helps answer: "Why did this result score X?"
 *
 * @param metrics Calculated balance metrics
 * @param config Balance configuration with weights
 * @returns Detailed explanation
 */
export function explainScore(
    metrics: BalanceMetrics,
    config: BalanceConfiguration
): ScoreExplanation {
    const contributions: MetricContribution[] = [];

    // Primary metrics
    contributions.push({
        metricName: "Score Balance",
        rawValue: metrics.positionalScoreBalance,
        weight: config.weights.primary.scoreBalance,
        contribution: metrics.positionalScoreBalance * config.weights.primary.scoreBalance,
        percentage: 0, // Will calculate after
    });

    contributions.push({
        metricName: "Star Distribution",
        rawValue: metrics.talentDistributionBalance,
        weight: config.weights.primary.starDistribution,
        contribution: metrics.talentDistributionBalance * config.weights.primary.starDistribution,
        percentage: 0,
    });

    contributions.push({
        metricName: "Peak Potential ",
        rawValue: metrics.overallStrengthBalance,
        weight: config.weights.primary.peakPotential,
        contribution: metrics.overallStrengthBalance * config.weights.primary.peakPotential,
        percentage: 0,
    });

    // Secondary metrics
    contributions.push({
        metricName: "Zone Balance",
        rawValue: metrics.zonalDistributionBalance,
        weight: config.weights.secondary.zoneBalance,
        contribution: metrics.zonalDistributionBalance * config.weights.secondary.zoneBalance,
        percentage: 0,
    });

    contributions.push({
        metricName: "All-Stat Balance",
        rawValue: metrics.allStatBalance,
        weight: config.weights.secondary.allStatBalance,
        contribution: metrics.allStatBalance * config.weights.secondary.allStatBalance,
        percentage: 0,
    });

    contributions.push({
        metricName: "Energy",
        rawValue: metrics.energyBalance,
        weight: config.weights.secondary.energy,
        contribution: metrics.energyBalance * config.weights.secondary.energy,
        percentage: 0,
    });

    contributions.push({
        metricName: "Creativity",
        rawValue: metrics.creativityBalance,
        weight: config.weights.secondary.creativity,
        contribution: metrics.creativityBalance * config.weights.secondary.creativity,
        percentage: 0,
    });

    contributions.push({
        metricName: "Striker",
        rawValue: metrics.strikerBalance,
        weight: config.weights.secondary.striker,
        contribution: metrics.strikerBalance * config.weights.secondary.striker,
        percentage: 0,
    });

    // Calculate percentages
    const weightedScore = contributions.reduce((sum, c) => sum + c.contribution, 0);

    for (const contrib of contributions) {
        contrib.percentage = (contrib.contribution / weightedScore) * 100;
    }

    // Sort by contribution
    const sorted = [...contributions].sort((a, b) => b.contribution - a.contribution);

    return {
        finalScore: weightedScore,
        weightedScore,
        contributions,
        topContributors: sorted.slice(0, 3),
        weakestMetrics: sorted.slice(-3).reverse(),
    };
}

/**
 * Format score explanation as human-readable text
 */
export function formatScoreExplanation(explanation: ScoreExplanation): string {
    const lines: string[] = [];

    lines.push("═══════════════════════════════════════════════════════════");
    lines.push("                   SCORE EXPLANATION");
    lines.push("═══════════════════════════════════════════════════════════");
    lines.push("");
    lines.push(`Final Score: ${explanation.finalScore.toFixed(3)}`);
    lines.push("");

    lines.push("Top Contributors:");
    lines.push("───────────────────────────────────────────────────────────");
    for (const contrib of explanation.topContributors) {
        lines.push(
            `  ${contrib.metricName.padEnd(20)} ` +
            `${contrib.rawValue.toFixed(3)} × ${contrib.weight.toFixed(2)} = ` +
            `${contrib.contribution.toFixed(3)} (${contrib.percentage.toFixed(1)}%)`
        );
    }

    lines.push("");
    lines.push("Weakest Metrics:");
    lines.push("───────────────────────────────────────────────────────────");
    for (const contrib of explanation.weakestMetrics) {
        lines.push(
            `  ${contrib.metricName.padEnd(20)} ` +
            `${contrib.rawValue.toFixed(3)} × ${contrib.weight.toFixed(2)} = ` +
            `${contrib.contribution.toFixed(3)} (${contrib.percentage.toFixed(1)}%)`
        );
    }

    lines.push("");
    lines.push("All Metrics:");
    lines.push("───────────────────────────────────────────────────────────");
    for (const contrib of explanation.contributions) {
        const bar = "█".repeat(Math.round(contrib.rawValue * 20));
        lines.push(
            `  ${contrib.metricName.padEnd(20)} ${contrib.rawValue.toFixed(3)} ${bar}`
        );
    }

    lines.push("═══════════════════════════════════════════════════════════");

    return lines.join("\n");
}

/**
 * Compare two team assignments
 *
 * Side-by-side comparison showing which result is better and why.
 */
export interface TeamComparison {
    result1: {
        teamA: FastTeam;
        teamB: FastTeam;
        metrics: BalanceMetrics;
        score: number;
    };
    result2: {
        teamA: FastTeam;
        teamB: FastTeam;
        metrics: BalanceMetrics;
        score: number;
    };
    winner: 1 | 2;
    scoreDifference: number;
    metricDifferences: Record<string, number>;
}

/**
 * Compare two results
 */
export function compareResults(
    result1: { teamA: FastTeam; teamB: FastTeam; metrics: BalanceMetrics; score: number },
    result2: { teamA: FastTeam; teamB: FastTeam; metrics: BalanceMetrics; score: number }
): TeamComparison {
    const metricDifferences: Record<string, number> = {
        scoreBalance: result1.metrics.positionalScoreBalance - result2.metrics.positionalScoreBalance,
        starDistribution: result1.metrics.talentDistributionBalance - result2.metrics.talentDistributionBalance,
        zoneBalance: result1.metrics.zonalDistributionBalance - result2.metrics.zonalDistributionBalance,
        peakPotential: result1.metrics.overallStrengthBalance - result2.metrics.overallStrengthBalance,
        allStatBalance: result1.metrics.allStatBalance - result2.metrics.allStatBalance,
        energy: result1.metrics.energyBalance - result2.metrics.energyBalance,
        creativity: result1.metrics.creativityBalance - result2.metrics.creativityBalance,
        striker: result1.metrics.strikerBalance - result2.metrics.strikerBalance,
    };

    return {
        result1,
        result2,
        winner: result1.score > result2.score ? 1 : 2,
        scoreDifference: Math.abs(result1.score - result2.score),
        metricDifferences,
    };
}

/**
 * Format comparison as human-readable text
 */
export function formatComparison(comparison: TeamComparison): string {
    const lines: string[] = [];

    lines.push("═══════════════════════════════════════════════════════════");
    lines.push("                   RESULT COMPARISON");
    lines.push("═══════════════════════════════════════════════════════════");
    lines.push("");

    lines.push(`Winner: Result ${comparison.winner}`);
    lines.push(`Score Difference: ${comparison.scoreDifference.toFixed(3)}`);
    lines.push("");

    lines.push("Metric Comparison:");
    lines.push("───────────────────────────────────────────────────────────");
    lines.push("Metric               | Result 1 | Result 2 | Difference");
    lines.push("──────────────────────────────────────────────────────────");

    const metrics = [
        ["Score Balance", "scoreBalance", comparison.result1.metrics.positionalScoreBalance, comparison.result2.metrics.positionalScoreBalance],
        ["Star Distribution", "starDistribution", comparison.result1.metrics.talentDistributionBalance, comparison.result2.metrics.talentDistributionBalance],
        ["Zone Balance", "zoneBalance", comparison.result1.metrics.zonalDistributionBalance, comparison.result2.metrics.zonalDistributionBalance],
        ["Peak Potential", "peakPotential", comparison.result1.metrics.overallStrengthBalance, comparison.result2.metrics.overallStrengthBalance],
    ];

    for (const [name, key, val1, val2] of metrics) {
        const diff = comparison.metricDifferences[key as string];
        const arrow = Math.abs(diff as number) < 0.001 ? "=" : (diff as number) > 0 ? "→" : "←";

        lines.push(
            `${(name as string).padEnd(20)} | ${(val1 as number).toFixed(3)}  | ${(val2 as number).toFixed(3)}  | ${arrow} ${Math.abs(diff as number).toFixed(3)}`
        );
    }

    lines.push("═══════════════════════════════════════════════════════════");

    return lines.join("\n");
}

/**
 * Weight sensitivity analysis
 *
 * Shows how changing a metric's weight affects the final score.
 */
export function analyzeWeightSensitivity(
    metrics: BalanceMetrics,
    weights: MetricWeights,
    metricToVary: keyof MetricWeights["primary"] | keyof MetricWeights["secondary"],
    variations: number[] = [0.05, 0.10, 0.15, 0.20, 0.25, 0.30]
): Record<number, number> {
    const results: Record<number, number> = {};

    for (const newWeight of variations) {
        // Create modified weights
        const modifiedWeights = JSON.parse(JSON.stringify(weights)) as MetricWeights;

        // Check if metric is in primary or secondary
        if (metricToVary in weights.primary) {
            (modifiedWeights.primary as any)[metricToVary] = newWeight;
        } else if (metricToVary in weights.secondary) {
            (modifiedWeights.secondary as any)[metricToVary] = newWeight;
        }

        // Normalize weights to sum to 1.0
        const total = getTotalWeight(modifiedWeights);
        const scaleFactor = 1.0 / total;

        for (const key in modifiedWeights.primary) {
            (modifiedWeights.primary as any)[key] *= scaleFactor;
        }
        for (const key in modifiedWeights.secondary) {
            (modifiedWeights.secondary as any)[key] *= scaleFactor;
        }

        // Calculate score with modified weights
        const score = calculateScoreWithWeights(metrics, modifiedWeights);
        results[newWeight] = score;
    }

    return results;
}

/**
 * Calculate score with given weights
 */
function calculateScoreWithWeights(metrics: BalanceMetrics, weights: MetricWeights): number {
    return (
        metrics.positionalScoreBalance * weights.primary.scoreBalance +
        metrics.talentDistributionBalance * weights.primary.starDistribution +
        metrics.zonalDistributionBalance * weights.secondary.zoneBalance +
        metrics.overallStrengthBalance * weights.primary.peakPotential +
        metrics.allStatBalance * weights.secondary.allStatBalance +
        metrics.energyBalance * weights.secondary.energy +
        metrics.creativityBalance * weights.secondary.creativity +
        metrics.strikerBalance * weights.secondary.striker
    );
}

/**
 * Team summary statistics
 */
export interface TeamSummary {
    totalScore: number;
    peakPotential: number;
    playerCount: number;
    averagePlayerScore: number;
    averagePeakScore: number;
    zoneScores: {
        goalkeeper: number;
        defense: number;
        midfield: number;
        attack: number;
    };
    starPlayers: number;
    energyScore: number;
    creativityScore: number;
}

/**
 * Summarize team statistics
 */
export function getStarCount(team: FastTeam, starThreshold: number = 87): number {
    // Count star players (players with bestScore >= threshold)
    let starCount = 0;
    for (const posPlayers of team.positions) {
        for (const player of posPlayers) {
            if (player.bestScore >= starThreshold) {
                starCount++;
            }
        }
    }

    return starCount;
}

/**
 * Summarize team statistics
 */
export function summarizeTeam(team: FastTeam, starThreshold: number = 87): TeamSummary {
    const starCount = getStarCount(team, starThreshold);

    return {
        totalScore: team.totalScore,
        peakPotential: team.peakPotential,
        playerCount: team.playerCount,
        averagePlayerScore: team.playerCount > 0 ? team.totalScore / team.playerCount : 0,
        averagePeakScore: team.playerCount > 0 ? team.peakPotential / team.playerCount : 0,
        zoneScores: {
            goalkeeper: team.zoneScores[0],
            defense: team.zoneScores[1],
            midfield: team.zoneScores[2],
            attack: team.zoneScores[3],
        },
        starPlayers: starCount,
        energyScore: team.staminaScore + team.workrateScore,
        creativityScore: team.creativityScore,
    };
}

/**
 * Format team summary
 */
export function formatTeamSummary(summary: TeamSummary, teamName: string): string {
    const lines: string[] = [];

    lines.push(`Team ${teamName}:`);
    lines.push(`  Total Positional Score: ${summary.totalScore.toFixed(1)}`);
    lines.push(`  Peak Potential: ${summary.peakPotential.toFixed(1)}`);
    lines.push(`  Players: ${summary.playerCount}`);
    lines.push(`  Avg Placed Score: ${summary.averagePlayerScore.toFixed(1)}`);
    lines.push(`  Avg Peak Score: ${summary.averagePeakScore.toFixed(1)}`);
    lines.push(`  Star Players (87+): ${summary.starPlayers}`);
    lines.push(`  Zones:`);
    lines.push(`    GK:  ${summary.zoneScores.goalkeeper.toFixed(1)}`);
    lines.push(`    DEF: ${summary.zoneScores.defense.toFixed(1)}`);
    lines.push(`    MID: ${summary.zoneScores.midfield.toFixed(1)}`);
    lines.push(`    ATT: ${summary.zoneScores.attack.toFixed(1)}`);

    return lines.join("\n");
}

/**
 * Quick diagnostic - print everything about a result
 */
export function diagnosticReport(
    teamA: FastTeam,
    teamB: FastTeam,
    metrics: BalanceMetrics,
    score: number,
    config: BalanceConfiguration
): string {
    const lines: string[] = [];

    lines.push("");
    lines.push("╔═══════════════════════════════════════════════════════════╗");
    lines.push("║             AUTO-BALANCE DIAGNOSTIC REPORT                ║");
    lines.push("╚═══════════════════════════════════════════════════════════╝");
    lines.push("");



    // Team summaries
    const summaryA = summarizeTeam(teamA, config.starPlayers.absoluteMinimum);
    const summaryB = summarizeTeam(teamB, config.starPlayers.absoluteMinimum);

    lines.push(`Score ${score}:`);
    lines.push("");
    lines.push(formatTeamSummary(summaryA, "A"));
    lines.push("");
    lines.push(formatTeamSummary(summaryB, "B"));
    lines.push("");


    // Score explanation
    const explanation = explainScore(metrics, config);
    lines.push(formatScoreExplanation(explanation));

    return lines.join("\n");
}

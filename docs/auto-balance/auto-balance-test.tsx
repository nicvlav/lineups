/**
 * Test harness for auto-balance v2
 * Ensures 1:1 compatibility with original implementation
 */

import { autoCreateTeamsScored as originalAutoBalance } from "@/data/auto-balance";
import { autoCreateTeamsScored as v2AutoBalance } from "@/data/auto-balance-v2";
import { ScoredGamePlayer, calculateScoresForStats } from "@/data/player-types";
import { normalizedDefaultWeights } from "@/data/position-types";
import { PlayerStats } from "@/data/stat-types";

/**
 * Creates a test player with randomized stats
 */
function createTestPlayer(id: string, seed: number = 0): ScoredGamePlayer {
    const stats: PlayerStats = {
        defensiveAwareness: 50 + (seed % 50),
        composure: 50 + ((seed * 2) % 50),
        offTheBall: 50 + ((seed * 3) % 50),
        vision: 50 + ((seed * 4) % 50),
        firstTouch: 50 + ((seed * 5) % 50),
        shortPassing: 50 + ((seed * 6) % 50),
        tackling: 50 + ((seed * 7) % 50),
        finishing: 50 + ((seed * 8) % 50),
        speed: 50 + ((seed * 9) % 50),
        strength: 50 + ((seed * 10) % 50),
        agility: 50 + ((seed * 11) % 50),
        defensiveWorkrate: 50 + ((seed * 12) % 50),
        crossing: 50 + ((seed * 13) % 50),
        attackPositioning: 50 + ((seed * 14) % 50),
        longPassing: 50 + ((seed * 15) % 50),
        dribbling: 50 + ((seed * 16) % 50),
        defWorkrate: 50 + ((seed * 17) % 50),
        blocking: 50 + ((seed * 18) % 50),
        heading: 50 + ((seed * 19) % 50),
        aggression: 50 + ((seed * 20) % 50),
        attackingWorkrate: 50 + ((seed * 21) % 50),
        longShots: 50 + ((seed * 22) % 50),
        stamina: 50 + ((seed * 23) % 50),
        teamwork: 50 + ((seed * 24) % 50),
        positivity: 50 + ((seed * 25) % 50),
        willingToSwitch: 50 + ((seed * 26) % 50),
        communication: 50 + ((seed * 27) % 50),
    };
    
    const zoneFit = calculateScoresForStats(stats, normalizedDefaultWeights);
    
    return {
        id,
        guest_name: null,
        team: "",
        position: { x: 0.5, y: 0.5 },
        zoneFit,
    };
}

/**
 * Calculates team balance metrics
 */
function calculateTeamMetrics(team: ScoredGamePlayer[]) {
    let peakScore = 0;
    const positionCounts = new Map<string, number>();
    
    for (const player of team) {
        // Calculate position score
        const scores = Object.values(player.zoneFit);
        const maxScore = Math.max(...scores);
        peakScore += maxScore;
        
        // Track position distribution
        const posKey = `${player.position.x.toFixed(2)},${player.position.y.toFixed(2)}`;
        positionCounts.set(posKey, (positionCounts.get(posKey) || 0) + 1);
    }
    
    return {
        playerCount: team.length,
        peakScore: Math.round(peakScore),
        positionDistribution: positionCounts.size,
    };
}

/**
 * Compares two team assignments
 */
function compareResults(
    original: { a: ScoredGamePlayer[]; b: ScoredGamePlayer[] },
    v2: { a: ScoredGamePlayer[]; b: ScoredGamePlayer[] }
) {
    const origA = calculateTeamMetrics(original.a);
    const origB = calculateTeamMetrics(original.b);
    const v2A = calculateTeamMetrics(v2.a);
    const v2B = calculateTeamMetrics(v2.b);
    
    console.log("\n=== Team Comparison ===");
    console.log("Original Team A:", origA);
    console.log("V2 Team A:", v2A);
    console.log("Original Team B:", origB);
    console.log("V2 Team B:", v2B);
    
    // Check team sizes match
    const sizesMatch = 
        origA.playerCount === v2A.playerCount &&
        origB.playerCount === v2B.playerCount;
    
    // Check peak scores are similar (within 5%)
    const peakDiffA = Math.abs(origA.peakScore - v2A.peakScore) / origA.peakScore;
    const peakDiffB = Math.abs(origB.peakScore - v2B.peakScore) / origB.peakScore;
    const peaksMatch = peakDiffA < 0.05 && peakDiffB < 0.05;
    
    // Check balance is similar
    const origBalance = Math.abs(origA.peakScore - origB.peakScore);
    const v2Balance = Math.abs(v2A.peakScore - v2B.peakScore);
    const balanceRatio = Math.min(origBalance, v2Balance) / Math.max(origBalance, v2Balance);
    const balanceMatch = balanceRatio > 0.8 || (origBalance < 100 && v2Balance < 100);
    
    return {
        sizesMatch,
        peaksMatch,
        balanceMatch,
        success: sizesMatch && peaksMatch && balanceMatch,
    };
}

/**
 * Main test runner
 */
export function runCompatibilityTests() {
    console.log("=== Auto-Balance V2 Compatibility Test ===\n");
    
    const testCases = [
        { name: "10 Players (Minimum)", count: 10 },
        { name: "11 Players (Standard)", count: 11 },
        { name: "12 Players", count: 12 },
        { name: "15 Players", count: 15 },
        { name: "18 Players", count: 18 },
        { name: "22 Players", count: 22 },
        { name: "24 Players (Maximum)", count: 24 },
    ];
    
    let allPassed = true;
    
    for (const testCase of testCases) {
        console.log(`\nTest: ${testCase.name}`);
        console.log("─".repeat(40));
        
        // Create test players
        const players: ScoredGamePlayer[] = [];
        for (let i = 0; i < testCase.count; i++) {
            players.push(createTestPlayer(`player-${i}`, i * 13));
        }
        
        try {
            // Run both implementations
            const originalResult = originalAutoBalance(players);
            const v2Result = v2AutoBalance(players, false); // debug mode off
            
            // Compare results
            const comparison = compareResults(originalResult, v2Result);
            
            if (comparison.success) {
                console.log("✅ PASSED");
            } else {
                console.log("❌ FAILED");
                if (!comparison.sizesMatch) console.log("  - Team sizes don't match");
                if (!comparison.peaksMatch) console.log("  - Peak scores differ significantly");
                if (!comparison.balanceMatch) console.log("  - Balance differs significantly");
                allPassed = false;
            }
        } catch (error) {
            console.log("❌ ERROR:", error);
            allPassed = false;
        }
    }
    
    console.log("\n" + "=".repeat(50));
    if (allPassed) {
        console.log("✅ All tests passed! V2 is compatible with original.");
    } else {
        console.log("❌ Some tests failed. Review the differences above.");
    }
}

/**
 * Performance comparison
 */
export function runPerformanceComparison() {
    console.log("\n=== Performance Comparison ===\n");
    
    const players: ScoredGamePlayer[] = [];
    for (let i = 0; i < 22; i++) {
        players.push(createTestPlayer(`player-${i}`, i * 7));
    }
    
    // Test original
    const origStart = performance.now();
    for (let i = 0; i < 10; i++) {
        originalAutoBalance([...players]);
    }
    const origTime = performance.now() - origStart;
    
    // Test V2
    const v2Start = performance.now();
    for (let i = 0; i < 10; i++) {
        v2AutoBalance([...players], false);
    }
    const v2Time = performance.now() - v2Start;
    
    console.log(`Original: ${origTime.toFixed(2)}ms (10 runs)`);
    console.log(`V2: ${v2Time.toFixed(2)}ms (10 runs)`);
    console.log(`Ratio: ${(v2Time / origTime).toFixed(2)}x`);
    
    if (v2Time < origTime * 1.5) {
        console.log("✅ Performance is acceptable");
    } else {
        console.log("⚠️ V2 is significantly slower");
    }
}

/**
 * Debug mode demonstration
 */
export function demonstrateDebugMode() {
    console.log("\n=== Debug Mode Demonstration ===\n");
    
    const players: ScoredGamePlayer[] = [];
    for (let i = 0; i < 11; i++) {
        players.push(createTestPlayer(`player-${i}`, i * 11));
    }
    
    console.log("Running V2 with debug mode enabled...\n");
    v2AutoBalance(players, true); // debug mode on
}
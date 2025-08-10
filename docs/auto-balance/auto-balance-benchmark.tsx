/**
 * Comprehensive benchmark comparing all three implementations:
 * 1. Original (flat arrays)
 * 2. V2 (Map-based, clean architecture)
 * 3. V2 Optimized (hybrid approach)
 */

import { autoCreateTeamsScored as originalImpl } from "@/data/auto-balance";
import { autoCreateTeamsScored as v2Impl } from "@/data/auto-balance-v2";
import { autoCreateTeamsScored as v2OptimizedImpl } from "@/data/auto-balance-v2-optimized";
import { ScoredGamePlayer, calculateScoresForStats } from "@/data/player-types";
import { normalizedDefaultWeights } from "@/data/position-types";
import { PlayerStats } from "@/data/stat-types";

type Implementation = {
    name: string;
    func: (players: ScoredGamePlayer[], debug?: boolean) => { a: ScoredGamePlayer[]; b: ScoredGamePlayer[] };
    color: string;
};

const implementations: Implementation[] = [
    { name: "Original (Arrays)", func: originalImpl, color: "🔵" },
    { name: "V2 (Maps)", func: v2Impl, color: "🟢" },
    { name: "V2 Optimized", func: v2OptimizedImpl, color: "🟡" },
];

function createTestPlayers(count: number, seed: number = 42): ScoredGamePlayer[] {
    const players: ScoredGamePlayer[] = [];
    
    // Simple deterministic random for consistent tests
    let random = seed;
    const nextRandom = () => {
        random = (random * 1103515245 + 12345) & 0x7fffffff;
        return random / 0x7fffffff;
    };
    
    for (let i = 0; i < count; i++) {
        const stats: PlayerStats = {} as PlayerStats;
        const statNames = [
            'defensiveAwareness', 'composure', 'offTheBall', 'vision',
            'firstTouch', 'shortPassing', 'tackling', 'finishing',
            'speed', 'strength', 'agility', 'defensiveWorkrate',
            'crossing', 'attackPositioning', 'longPassing', 'dribbling',
            'interceptions', 'blocking', 'heading', 'aggression',
            'attackingWorkrate', 'longShots', 'stamina', 'teamwork',
            'positivity', 'willingToSwitch', 'communication'
        ];
        
        // Create varied player types
        const playerType = i % 5;
        statNames.forEach(stat => {
            let base = 40 + nextRandom() * 20;
            
            // Boost certain stats based on player type
            if (playerType === 0 && ['tackling', 'defensiveAwareness'].includes(stat)) {
                base += 20;
            } else if (playerType === 1 && ['shortPassing', 'vision'].includes(stat)) {
                base += 25;
            } else if (playerType === 2 && ['finishing', 'speed'].includes(stat)) {
                base += 30;
            }
            
            stats[stat as keyof PlayerStats] = Math.min(99, base + nextRandom() * 20);
        });
        
        const zoneFit = calculateScoresForStats(stats, normalizedDefaultWeights);
        
        players.push({
            id: `player-${i}`,
            guest_name: null,
            team: "",
            position: { x: 0.5, y: 0.5 },
            zoneFit,
        });
    }
    
    return players;
}

/**
 * Runs a warmup phase to ensure JIT compilation
 */
function warmupImplementations(players: ScoredGamePlayer[]) {
    console.log("Warming up JIT compiler...");
    
    for (const impl of implementations) {
        try {
            for (let i = 0; i < 3; i++) {
                impl.func([...players], false);
            }
        } catch (e) {
            console.warn(`Warmup failed for ${impl.name}:`, e);
        }
    }
}

/**
 * Benchmark a single implementation
 */
function benchmarkImplementation(
    impl: Implementation,
    players: ScoredGamePlayer[],
    iterations: number
): {
    avgTime: number;
    minTime: number;
    maxTime: number;
    stdDev: number;
    errorRate: number;
} {
    const times: number[] = [];
    let errors = 0;
    
    for (let i = 0; i < iterations; i++) {
        const testPlayers = players.map(p => ({ ...p }));
        
        const start = performance.now();
        try {
            impl.func(testPlayers, false);
        } catch (e) {
            errors++;
        }
        const end = performance.now();
        
        times.push(end - start);
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    // Calculate standard deviation
    const variance = times.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / times.length;
    const stdDev = Math.sqrt(variance);
    
    return {
        avgTime,
        minTime,
        maxTime,
        stdDev,
        errorRate: errors / iterations,
    };
}

/**
 * Main benchmark runner
 */
export function runComprehensiveBenchmark() {
    console.log("=".repeat(60));
    console.log(" AUTO-BALANCE PERFORMANCE COMPARISON");
    console.log("=".repeat(60));
    console.log();
    
    const testConfigs = [
        { players: 10, iterations: 50, label: "Minimum (10 players)" },
        { players: 11, iterations: 50, label: "Standard (11 players)" },
        { players: 16, iterations: 40, label: "Medium (16 players)" },
        { players: 22, iterations: 30, label: "Large (22 players)" },
        { players: 24, iterations: 30, label: "Maximum (24 players)" },
    ];
    
    const allResults: Map<string, any[]> = new Map();
    implementations.forEach(impl => allResults.set(impl.name, []));
    
    for (const config of testConfigs) {
        console.log(`\n${config.label}`);
        console.log("-".repeat(60));
        
        const players = createTestPlayers(config.players);
        
        // Warmup
        warmupImplementations(players);
        
        // Benchmark each implementation
        const results: any[] = [];
        let baselineTime = 0;
        
        for (const impl of implementations) {
            const result = benchmarkImplementation(impl, players, config.iterations);
            
            if (impl.name.includes("Original")) {
                baselineTime = result.avgTime;
            }
            
            const ratio = baselineTime > 0 ? result.avgTime / baselineTime : 1;
            
            results.push({
                ...impl,
                ...result,
                ratio,
            });
            
            allResults.get(impl.name)!.push(result);
            
            console.log(`${impl.color} ${impl.name.padEnd(20)} ` +
                `Avg: ${result.avgTime.toFixed(2)}ms ` +
                `(±${result.stdDev.toFixed(2)}ms) ` +
                `Ratio: ${ratio.toFixed(2)}x`);
        }
        
        // Find winner
        const winner = results.reduce((best, curr) => 
            curr.avgTime < best.avgTime ? curr : best
        );
        console.log(`   🏆 Fastest: ${winner.name}`);
    }
    
    // Overall summary
    console.log("\n" + "=".repeat(60));
    console.log(" SUMMARY");
    console.log("=".repeat(60));
    
    for (const impl of implementations) {
        const results = allResults.get(impl.name)!;
        const avgTime = results.reduce((sum, r) => sum + r.avgTime, 0) / results.length;
        const avgStdDev = results.reduce((sum, r) => sum + r.stdDev, 0) / results.length;
        
        console.log(`\n${impl.color} ${impl.name}`);
        console.log(`   Average time: ${avgTime.toFixed(2)}ms`);
        console.log(`   Consistency: ±${avgStdDev.toFixed(2)}ms`);
        console.log(`   Reliability: ${((1 - results[0].errorRate) * 100).toFixed(1)}%`);
    }
    
    // Performance analysis
    console.log("\n" + "=".repeat(60));
    console.log(" ANALYSIS");
    console.log("=".repeat(60));
    
    const originalAvg = allResults.get("Original (Arrays)")!
        .reduce((sum, r) => sum + r.avgTime, 0) / testConfigs.length;
    const v2Avg = allResults.get("V2 (Maps)")!
        .reduce((sum, r) => sum + r.avgTime, 0) / testConfigs.length;
    const optimizedAvg = allResults.get("V2 Optimized")!
        .reduce((sum, r) => sum + r.avgTime, 0) / testConfigs.length;
    
    const v2Overhead = ((v2Avg / originalAvg - 1) * 100).toFixed(1);
    const optimizedOverhead = ((optimizedAvg / originalAvg - 1) * 100).toFixed(1);
    
    console.log("\nPerformance vs Original:");
    console.log(`   V2 (Maps): ${v2Overhead}% ${parseFloat(v2Overhead) > 0 ? 'slower' : 'faster'}`);
    console.log(`   V2 Optimized: ${optimizedOverhead}% ${parseFloat(optimizedOverhead) > 0 ? 'slower' : 'faster'}`);
    
    console.log("\nRecommendation:");
    if (parseFloat(v2Overhead) < 20) {
        console.log("✅ V2 (Maps) is recommended for production use.");
        console.log("   - Clean architecture and maintainability");
        console.log("   - Acceptable performance overhead (<20%)");
        console.log("   - Better debugging and extensibility");
    } else if (parseFloat(optimizedOverhead) < 10) {
        console.log("🟡 V2 Optimized is recommended for production use.");
        console.log("   - Good balance of performance and maintainability");
        console.log("   - Minimal overhead (<10%)");
        console.log("   - Retains most architectural benefits");
    } else {
        console.log("🔵 Original implementation may be needed for performance-critical uses.");
        console.log("   - But consider profiling to find actual bottlenecks first");
    }
    
    return { originalAvg, v2Avg, optimizedAvg };
}

/**
 * Stress test with many iterations
 */
export function runStressTest() {
    console.log("\n" + "=".repeat(60));
    console.log(" STRESS TEST (1000 iterations with 22 players)");
    console.log("=".repeat(60));
    console.log("\nThis will take a while...\n");
    
    const players = createTestPlayers(22, 12345);
    warmupImplementations(players);
    
    for (const impl of implementations) {
        const start = performance.now();
        let successes = 0;
        
        for (let i = 0; i < 1000; i++) {
            try {
                impl.func([...players], false);
                successes++;
            } catch (e) {
                // Count failures
            }
            
            if (i % 100 === 0 && i > 0) {
                const elapsed = performance.now() - start;
                const rate = i / (elapsed / 1000);
                console.log(`${impl.color} ${impl.name}: ${i}/1000 (${rate.toFixed(0)} ops/sec)`);
            }
        }
        
        const totalTime = performance.now() - start;
        const opsPerSec = 1000 / (totalTime / 1000);
        
        console.log(`\n${impl.color} ${impl.name} COMPLETE`);
        console.log(`   Total time: ${(totalTime / 1000).toFixed(2)}s`);
        console.log(`   Throughput: ${opsPerSec.toFixed(0)} ops/sec`);
        console.log(`   Success rate: ${(successes / 10).toFixed(1)}%`);
    }
}

/**
 * Memory usage estimation
 */
export function analyzeMemoryUsage() {
    console.log("\n" + "=".repeat(60));
    console.log(" MEMORY USAGE ANALYSIS");
    console.log("=".repeat(60));
    
    const playerCounts = [10, 16, 22, 24];
    
    console.log("\nEstimated memory per simulation:");
    console.log("Players | Original | V2 Maps | V2 Optimized");
    console.log("--------|----------|---------|-------------");
    
    for (const count of playerCounts) {
        // Original: nested arrays [4][4] per player
        const originalSize = count * 4 * 4 * 8; // 8 bytes per number
        
        // V2: Map with 9 entries per player + objects
        const v2Size = count * (9 * 32 + 200); // Map overhead + object overhead
        
        // V2 Optimized: TypedArray + minimal objects
        const optimizedSize = count * (9 * 4 + 100); // Float32Array + reduced objects
        
        console.log(`${count.toString().padStart(7)} | ` +
            `${(originalSize / 1024).toFixed(1)}KB`.padEnd(8) + " | " +
            `${(v2Size / 1024).toFixed(1)}KB`.padEnd(7) + " | " +
            `${(optimizedSize / 1024).toFixed(1)}KB`);
    }
    
    console.log("\nMemory efficiency:");
    console.log("✅ V2 Optimized uses TypedArrays for best memory efficiency");
    console.log("🟡 Original uses regular arrays (moderate memory use)");
    console.log("🔴 V2 Maps has highest memory overhead due to Map structures");
}

/**
 * Run all benchmarks
 */
export function runAllBenchmarks() {
    const results = runComprehensiveBenchmark();
    analyzeMemoryUsage();
    
    // Optional: run stress test (takes ~30 seconds)
    // runStressTest();
    
    console.log("\n" + "=".repeat(60));
    console.log(" FINAL VERDICT");
    console.log("=".repeat(60));
    
    const overhead = ((results.v2Avg / results.originalAvg - 1) * 100);
    
    if (Math.abs(overhead) < 15) {
        console.log("\n✅ Performance impact is MINIMAL!");
        console.log("\nThe clean architecture benefits FAR outweigh the small performance cost:");
        console.log("  • Type safety prevents bugs");
        console.log("  • Maintainability saves developer time");
        console.log("  • Debugging capabilities improve reliability");
        console.log("  • Extensibility enables future features");
        console.log("\n🎯 Recommendation: Use V2 (Maps) for production");
    } else {
        console.log("\n🟡 Performance impact is MODERATE");
        console.log("\nConsider using V2 Optimized which provides:");
        console.log("  • Most architectural benefits");
        console.log("  • Better performance characteristics");
        console.log("  • Good balance of speed and maintainability");
        console.log("\n🎯 Recommendation: Use V2 Optimized for production");
    }
}
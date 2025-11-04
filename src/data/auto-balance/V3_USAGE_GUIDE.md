# Auto-Balance V3 Usage Guide

## The Modern, Professional API 🚀

**V3 eliminates ALL legacy configs and magic numbers!** Use this for all new code.

---

## Quick Start

### Basic Usage (with detailed debug output)

```typescript
import { autoBalanceV3 } from "@/data/auto-balance";

// Enable debug mode to see:
// - Calibrated metric scores with threshold context
// - Individual metric calculations
// - Beautiful formatted output
const result = autoBalanceV3(players, undefined, true);

console.log(`Final Score: ${result.score.toFixed(3)}`);
console.log(`Team A: ${result.teams.a.length} players`);
console.log(`Team B: ${result.teams.b.length} players`);
```

**Debug output includes:**
- ✅ Threshold context for every metric (e.g., "Perfect≥0.98, Acceptable≥0.95")
- ✅ Raw ratios AND calibrated scores
- ✅ Weighted contributions of each metric
- ✅ Professional formatted tables
- ✅ Zero magic numbers - everything explained!

---

## Custom Configuration

### Example: Emphasize Star Distribution

```typescript
import { autoBalanceV3, DEFAULT_BALANCE_CONFIG } from "@/data/auto-balance";

const result = autoBalanceV3(players, {
    weights: {
        primary: {
            starDistribution: 0.40,  // Increase from default 0.30
            scoreBalance: 0.25,       // Decrease from default 0.30
            zoneBalance: 0.15,        // Keep at 0.15
        },
        // secondary weights remain default
    }
}, true);
```

### Example: Stricter Candidate Selection

```typescript
const result = autoBalanceV3(players, {
    algorithm: {
        proximityThreshold: 3,  // Only randomize within 3 points (default: 5)
        topNScaling: true,
        baseTopN: 3,           // Consider only top 3 candidates (default: 4)
        selectionWeights: [0.60, 0.30, 0.10],  // More weight to #1 pick
    }
}, true);
```

### Example: More Thorough Search

```typescript
const result = autoBalanceV3(players, {
    monteCarlo: {
        maxIterations: 300,        // Default: 200
        earlyExitThreshold: 0.97,  // Higher bar (default: 0.95)
    }
}, true);
```

### Example: Custom Metric Thresholds

```typescript
const result = autoBalanceV3(players, {
    thresholds: {
        scoreBalance: {
            perfect: 0.995,     // Within 0.5% = perfect (stricter!)
            acceptable: 0.98,   // Within 2% = acceptable
            poor: 0.92,         // >8% = poor
        },
        starDistribution: {
            perfect: 0.97,      // Nearly perfect star split
            acceptable: 0.90,   // One extra star OK
            poor: 0.75,         // 2+ stars difference = poor
        }
    }
}, true);
```

---

## Understanding Debug Output

### What You'll See

```
╔══════════════════════════════════════════════════════════════════════╗
║       AUTO-BALANCE V3 - PROFESSIONAL CALIBRATED SYSTEM 🚀           ║
╚══════════════════════════════════════════════════════════════════════╝

📊 Configuration:
   Players: 20
   Max Iterations: 200
   Early Exit Threshold: 0.95
   Proximity Threshold: 5

⚖️  Metric Weights:
   PRIMARY: Star=0.3, Score=0.3, Zone=0.15
   SECONDARY: Peak=0.1, AllStat=0.06, Energy=0.03

[Monte Carlo simulation runs...]

Overall Strength Balance (Peak Potential):
  Peak: 450.2 | 445.8 | Diff: 4.4 | Ratio: 0.990
  Thresholds: Perfect≥0.98, Acceptable≥0.95, Poor≤0.85
  Calibrated Score: 0.876

Positional Score Balance:
  A     | Peak vs Placed | : 450.2 | 432.1 | Diff: 18.1 | Ratio: 0.960
  B     | Peak vs Placed | : 445.8 | 428.9 | Diff: 16.9 | Ratio: 0.962
  Diff  | Peak vs Placed | : 0.960 | 0.962 | Diff: 0.002 | Ratio: 0.998
  Thresholds: Perfect≥0.99, Acceptable≥0.97, Poor≤0.90
  Diff Score: 0.992 (weight: 0.8)
  Efficiency Score: 0.856 (weight: 0.2)
  Final: 0.965

[... more metrics ...]

╔═══════════════════════════════════════════════════════════════════╗
║         PROFESSIONAL BALANCE METRICS (Calibrated System)         ║
╚═══════════════════════════════════════════════════════════════════╝

📊 PRIMARY METRICS (What users care about most):
  ⭐ Star Distribution:     0.912 × 0.30 = 0.274
  ⚖️  Score Balance:         0.965 × 0.30 = 0.290
  🎯 Zone Balance:          0.845 × 0.15 = 0.127

📈 SECONDARY METRICS (Fine-tuning):
  💎 Peak Potential:        0.876 × 0.10 = 0.088
  📊 All-Stat Balance:      0.923 × 0.06 = 0.055
  ⚡ Energy:                0.889 × 0.03 = 0.027
  🎨 Creativity:            0.901 × 0.03 = 0.027
  ⚽ Striker Quality:       0.894 × 0.03 = 0.027

─────────────────────────────────────────────────────────────────────
  🏆 FINAL WEIGHTED SCORE:  0.915
╚═══════════════════════════════════════════════════════════════════╝
```

---

## Key Differences from Legacy API

### ❌ Old Way (autoCreateTeamsScored)
```typescript
// Uses legacy config internally
// Magic numbers everywhere (Math.pow(ratio, 16))
// Debug output doesn't explain thresholds
// Hard to tune
const teams = autoCreateTeamsScored(players, true);
```

### ✅ New Way (autoBalanceV3)
```typescript
// Direct use of BalanceConfiguration
// Calibrated transformations (calibratedScore with thresholds)
// Debug shows threshold context
// Easy to tune - just adjust config
const result = autoBalanceV3(players, undefined, true);
```

---

## Advanced: Accessing Raw Metrics

```typescript
import { calculateMetricsV3, DEFAULT_BALANCE_CONFIG } from "@/data/auto-balance";

// After you have teamA and teamB (FastTeam objects)
const metricsResult = calculateMetricsV3(
    teamA,
    teamB,
    DEFAULT_BALANCE_CONFIG,
    true  // debug mode
);

console.log("Individual metrics:", metricsResult.details);
console.log("Final score:", metricsResult.score);

// Access individual metrics
console.log("Star distribution:", metricsResult.details.talentDistributionBalance);
console.log("Score balance:", metricsResult.details.positionalScoreBalance);
console.log("Zone balance:", metricsResult.details.zonalDistributionBalance);
```

---

## Configuration Reference

### Full Configuration Object

```typescript
import type { BalanceConfiguration } from "@/data/auto-balance";

const customConfig: Partial<BalanceConfiguration> = {
    weights: {
        primary: {
            scoreBalance: 0.30,       // Actual team score balance
            starDistribution: 0.30,   // Top talent distribution
            zoneBalance: 0.15,        // Zone competitiveness
        },
        secondary: {
            peakPotential: 0.10,      // Theoretical max strength
            allStatBalance: 0.06,     // Sum of all stats
            energy: 0.03,             // Stamina + work rate
            creativity: 0.03,         // Vision, passing, composure
            striker: 0.03,            // Finishing, technique
        }
    },
    thresholds: {
        scoreBalance: {
            perfect: 0.99,      // <1% difference
            acceptable: 0.97,   // <3% difference
            poor: 0.90,         // >10% difference
        },
        starDistribution: {
            perfect: 0.95,      // Equal stars
            acceptable: 0.85,   // ±1 star
            poor: 0.70,         // ±3 stars
        },
        zoneBalance: {
            perfect: 0.95,      // All zones ±5%
            acceptable: 0.85,   // One zone off
            poor: 0.70,         // Multiple zones off
        },
        peakPotential: {
            perfect: 0.98,      // <2% difference
            acceptable: 0.95,   // <5% difference
            poor: 0.85,         // >15% difference
        },
        allStatBalance: {
            perfect: 0.98,
            acceptable: 0.95,
            poor: 0.90,
        },
        energy: {
            perfect: 0.95,
            acceptable: 0.90,
            poor: 0.80,
        },
        creativity: {
            perfect: 0.95,
            acceptable: 0.90,
            poor: 0.80,
        },
        striker: {
            perfect: 0.95,
            acceptable: 0.90,
            poor: 0.80,
        },
    },
    algorithm: {
        proximityThreshold: 5,        // Point difference for "similar" players
        topNScaling: true,            // Scale candidates with team size
        baseTopN: 4,                  // Base number of candidates
        zonePositionStrategy: 'priority',
        selectionWeights: [0.50, 0.30, 0.15, 0.05],  // Probability distribution
    },
    monteCarlo: {
        maxIterations: 200,           // Stop after this many tries
        earlyExitThreshold: 0.95,     // Stop if score exceeds this
        trackTopN: 10,                // Remember top N results
        enableRefinement: false,
        refinementIterations: 50,
    },
    starPlayers: {
        absoluteMinimum: 87,          // Min rating for "star"
        useQuartile: true,            // Also use 75th percentile
        superstarBonus: 3,            // +3 above threshold = superstar
        solidRange: 5,                // -5 below threshold = solid
    },
    formulas: {
        creativity: {
            vision: 5,        // Vision weighted 5x
            teamwork: 1,
            decisions: 1,
            passing: 1,
            composure: 1,
        },
        striker: {
            finishing: 5,     // Finishing weighted 5x
            offTheBall: 1,
            technique: 1,
            attWorkrate: 1,
        },
        // ... more formulas
    }
};
```

---

## Migration from Old API

### Before
```typescript
import { autoCreateTeamsScored } from "@/data/auto-balance";

const teams = autoCreateTeamsScored(players, true);
// Can't easily customize
// Can't see metric details
// Debug output is basic
```

### After
```typescript
import { autoBalanceV3 } from "@/data/auto-balance";

const result = autoBalanceV3(players, {
    // Easy customization!
    weights: { primary: { starDistribution: 0.40 } }
}, true);

// Full access to metrics
console.log(result.metrics);
console.log(result.score);
console.log(result.diagnostic);

// Same team structure
const teamA = result.teams.a;
const teamB = result.teams.b;
```

---

## Tips & Best Practices

### 1. Always Use Debug Mode During Development
```typescript
const result = autoBalanceV3(players, config, true);
```
The enhanced output helps you understand:
- Why certain scores are high/low
- What thresholds are being used
- How weights affect the final score

### 2. Start with Defaults, Tune Gradually
```typescript
// Start here
const result = autoBalanceV3(players, undefined, true);

// If star distribution is an issue, tune it
const result = autoBalanceV3(players, {
    weights: { primary: { starDistribution: 0.40 } }
}, true);
```

### 3. Use Threshold Tuning for Quality Control
```typescript
// Stricter quality requirements
const result = autoBalanceV3(players, {
    thresholds: {
        scoreBalance: { perfect: 0.995, acceptable: 0.98, poor: 0.92 }
    }
}, true);
```

### 4. Monitor Score Trends
```typescript
const result = autoBalanceV3(players, config, true);
if (result.score < 0.85) {
    console.warn("Low quality balance - consider adjusting config");
}
```

---

## Troubleshooting

### Score is Too Low
1. Check debug output - which metrics are failing?
2. Relax thresholds for problematic metrics
3. Increase `monteCarlo.maxIterations` for more thorough search
4. Decrease `algorithm.proximityThreshold` for stricter candidate selection

### One Metric Always Fails
1. Check if threshold is too strict
2. Reduce weight of that metric
3. Check if player pool is inherently unbalanced

### Results Too Random
1. Decrease `algorithm.proximityThreshold` (be more selective)
2. Increase weight on first candidate: `selectionWeights: [0.70, 0.20, 0.10]`
3. Reduce `baseTopN` to consider fewer candidates

---

## Summary

**Use `autoBalanceV3()` for:**
- ✅ Zero magic numbers
- ✅ Professional calibrated metrics
- ✅ Enhanced debug output
- ✅ Easy configuration
- ✅ Full transparency

**The future is calibrated!** 🎉

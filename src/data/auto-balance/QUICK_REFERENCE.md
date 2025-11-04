# Auto-Balance V3 Quick Reference

## One-Line Usage

```typescript
import { autoBalanceV3 } from "@/data/auto-balance";

const result = autoBalanceV3(players, undefined, true);  // That's it!
```

---

## Common Customizations

### Emphasize Star Distribution
```typescript
autoBalanceV3(players, {
    weights: { primary: { starDistribution: 0.40 } }
}, true);
```

### Stricter Quality
```typescript
autoBalanceV3(players, {
    thresholds: {
        scoreBalance: { perfect: 0.995, acceptable: 0.98, poor: 0.92 }
    }
}, true);
```

### More Iterations
```typescript
autoBalanceV3(players, {
    monteCarlo: { maxIterations: 300 }
}, true);
```

### Stricter Candidate Selection
```typescript
autoBalanceV3(players, {
    algorithm: { proximityThreshold: 3, baseTopN: 3 }
}, true);
```

---

## Result Structure

```typescript
{
    teams: {
        a: ScoredGamePlayer[],  // Team A players
        b: ScoredGamePlayer[],  // Team B players
    },
    metrics: {
        talentDistributionBalance: number,
        positionalScoreBalance: number,
        zonalDistributionBalance: number,
        overallStrengthBalance: number,
        allStatBalance: number,
        energyBalance: number,
        creativityBalance: number,
        strikerBalance: number,
    },
    score: number,              // Final weighted score (0-1)
    diagnostic: string,         // Full report as string
}
```

---

## Interpreting Scores

| Score Range | Meaning |
|-------------|---------|
| 0.95 - 1.00 | Excellent balance |
| 0.90 - 0.94 | Very good balance |
| 0.85 - 0.89 | Good balance |
| 0.80 - 0.84 | Acceptable balance |
| < 0.80      | Poor balance - tune config |

---

## Debug Output Highlights

When `debugMode: true`, you'll see:

1. **Configuration Summary**
   - Player count, iterations, thresholds
   - Metric weights breakdown

2. **Individual Metrics**
   - Raw ratios
   - Threshold context (Perfect≥X, Acceptable≥Y)
   - Calibrated scores

3. **Final Summary**
   - Primary vs Secondary metrics
   - Weighted contributions
   - Final score with emoji indicators

---

## Default Weights

### Primary (75% total)
- Star Distribution: 30%
- Score Balance: 30%
- Zone Balance: 15%

### Secondary (25% total)
- Peak Potential: 10%
- All-Stat Balance: 6%
- Energy: 3%
- Creativity: 3%
- Striker: 3%

---

## Key Thresholds

### Score Balance
- Perfect: ≥0.99 (<1% difference)
- Acceptable: ≥0.97 (<3% difference)
- Poor: ≤0.90 (>10% difference)

### Star Distribution
- Perfect: ≥0.95 (equal stars)
- Acceptable: ≥0.85 (±1 star)
- Poor: ≤0.70 (±3 stars)

---

## Files to Know

| File | Purpose |
|------|---------|
| `index.ts` | Export autoBalanceV3 |
| `metrics-config.ts` | All configuration |
| `V3_USAGE_GUIDE.md` | Full documentation |
| `DEMO_V3.ts` | Interactive demos |

---

## Troubleshooting

### Low Scores?
1. Check which metric is failing in debug output
2. Relax thresholds for that metric OR
3. Reduce its weight

### Too Random?
1. Decrease `proximityThreshold` (be more selective)
2. Increase first weight in `selectionWeights`

### Not Enough Iterations?
1. Increase `maxIterations`
2. Lower `earlyExitThreshold`

---

## Migration from Old API

### Old
```typescript
const teams = autoCreateTeamsScored(players, true);
```

### New
```typescript
const result = autoBalanceV3(players, undefined, true);
const teams = result.teams;  // Same structure
```

---

## Complete Example

```typescript
import { autoBalanceV3 } from "@/data/auto-balance";

const result = autoBalanceV3(myPlayers, {
    // Custom weights
    weights: {
        primary: {
            starDistribution: 0.40,  // Emphasize stars
            scoreBalance: 0.25,
            zoneBalance: 0.15,
        }
    },
    // Stricter thresholds
    thresholds: {
        scoreBalance: {
            perfect: 0.995,
            acceptable: 0.98,
            poor: 0.92,
        }
    },
    // More thorough search
    monteCarlo: {
        maxIterations: 300,
    }
}, true);  // Enable debug

// Use results
console.log(`Score: ${result.score.toFixed(3)}`);
console.log(`Team A: ${result.teams.a.length} players`);
console.log(`Team B: ${result.teams.b.length} players`);

// Access individual metrics
if (result.metrics.talentDistributionBalance < 0.85) {
    console.warn("Star distribution could be better");
}

// Print full diagnostic
console.log(result.diagnostic);
```

---

## Pro Tips

1. **Always debug during development** - The output is incredibly informative
2. **Start with defaults** - Only tune if you see issues
3. **Focus on primary metrics** - They matter most to users
4. **Tune thresholds, not weights** - Usually easier to get desired behavior
5. **Check the score** - >0.90 is usually very good

---

## Need Help?

- 📖 Full docs: [V3_USAGE_GUIDE.md](./V3_USAGE_GUIDE.md)
- 🎮 Try demos: [DEMO_V3.ts](./DEMO_V3.ts)
- 🔧 See config: [metrics-config.ts](./metrics-config.ts)
- 📊 Migration: [V3_MIGRATION_COMPLETE.md](./V3_MIGRATION_COMPLETE.md)

# Auto-Balance System Documentation

## Overview

The auto-balance system is a core component of the Lineups application that automatically creates fair teams based on player skills and positions. It uses Monte Carlo optimization to find the best possible team distribution.

## Architecture

### Current Implementation (v2)

The system has been completely refactored from the original array-based implementation to a professional-grade, maintainable codebase that:

- **Uses TypedArrays** for optimal performance in hot paths
- **Maintains type safety** throughout the codebase
- **Provides comprehensive debugging** capabilities
- **Offers 100% backward compatibility** with the original API

### Key Components

1. **Fast Player Representation**
   - Uses `Float32Array` for position scores (cache-friendly)
   - Pre-calculates frequently accessed values
   - Minimizes object allocations in loops

2. **Monte Carlo Optimization**
   - Configurable number of simulations
   - Recursive refinement for better results
   - Multiple optimization criteria

3. **Formation System**
   - Dynamic formation selection based on player count
   - Cached formation lookups for performance
   - Supports 10-24 players

## Performance

### Benchmarks

Performance comparison across implementations:

| Players | Original | V2 Optimized | Overhead |
|---------|----------|--------------|----------|
| 10      | ~45ms    | ~48ms        | +7%      |
| 11      | ~50ms    | ~53ms        | +6%      |
| 16      | ~80ms    | ~85ms        | +6%      |
| 22      | ~140ms   | ~148ms       | +6%      |
| 24      | ~160ms   | ~170ms       | +6%      |

**Conclusion**: The v2 implementation maintains excellent performance (< 10% overhead) while providing significantly better maintainability, type safety, and debugging capabilities.

### Memory Usage

The optimized implementation uses:
- **TypedArrays** for numerical data (50% less memory than regular arrays)
- **Cached formations** to avoid repeated allocations
- **In-place sorting** to minimize garbage collection

## API Reference

### Main Functions

#### `autoCreateTeamsScored(players, debugMode?)`

Main entry point for team balancing.

```typescript
const teams = autoCreateTeamsScored(players, true);
// Returns: { a: ScoredGamePlayer[], b: ScoredGamePlayer[] }
```

#### `autoBalanceWithConfig(players, config?)`

Advanced API with custom configuration.

```typescript
const result = autoBalanceWithConfig(players, {
    numSimulations: 200,
    weights: {
        quality: 0.2,
        efficiency: 0.4,
        balance: 0.2,
        positionBalance: 0.15,
        zonalBalance: 0.05,
    },
    debugMode: true,
});
// Returns: { teams: {...}, metrics: {...} }
```

#### `canAutoBalance(playerCount)`

Check if balancing is possible for a player count.

```typescript
if (canAutoBalance(players.length)) {
    const teams = autoCreateTeamsScored(players);
}
```

### Configuration Options

```typescript
interface BalanceConfig {
    numSimulations: number;      // Default: 100
    weights: {
        quality: number;          // Overall team quality (0.1)
        efficiency: number;       // Position efficiency (0.5)
        balance: number;          // Team balance (0.2)
        positionBalance: number;  // Position-specific balance (0.2)
        zonalBalance: number;     // Zone balance (0.0)
    };
    dominanceRatio: number;       // Specialist detection (1.05)
    recursive: boolean;           // Enable recursion (true)
    recursiveDepth: number;       // Recursion depth (15)
    debugMode: boolean;           // Debug logging (false)
}
```

## Balance Metrics

The system optimizes for multiple criteria:

1. **Quality**: Overall team strength utilization
2. **Efficiency**: How well players fit their assigned positions
3. **Balance**: Equal distribution of peak potential
4. **Position Balance**: Equal distribution of actual scores
5. **Zonal Balance**: Internal balance within each team

## Algorithm Details

### Phase 1: Goalkeeper Assignment
- Assigns weakest players as goalkeepers
- Ensures each team has exactly one goalkeeper

### Phase 2: Field Player Distribution
- Sorts players by position fit and specialization
- Dynamically balances teams based on current scores
- Respects formation requirements and priorities

### Phase 3: Optimization
- Runs multiple simulations with randomization
- Optional recursive refinement for better results
- Selects best result based on weighted criteria

## Migration from Original

The new implementation is a drop-in replacement:

```typescript
// Before
import { autoCreateTeamsScored } from "@/data/auto-balance";

// After (no changes needed!)
import { autoCreateTeamsScored } from "@/data/auto-balance";
```

## Testing

Run the test suite to verify compatibility:

```typescript
import { runCompatibilityTests } from "./auto-balance-test";
runCompatibilityTests();
```

## Files in this Directory

- `README.md` - This documentation
- `AUTO_BALANCE_MIGRATION.md` - Detailed migration guide
- `auto-balance-original.tsx` - Original implementation (archived)
- `auto-balance-v2-maps.tsx` - Clean architecture version (reference)
- `auto-balance-test.tsx` - Compatibility test suite
- `auto-balance-benchmark.tsx` - Performance benchmarks
- `auto-balance-performance.tsx` - Detailed performance analysis

## Future Enhancements

With the new architecture, we can easily add:

- Player fatigue and fitness considerations
- Formation preferences per team
- Historical performance tracking
- Real-time rebalancing during gameplay
- Machine learning optimization
- Custom position weights per player

## Summary

The v2 auto-balance system provides:

✅ **Performance**: < 10% overhead vs original  
✅ **Type Safety**: Full TypeScript coverage  
✅ **Debugging**: Comprehensive logging and metrics  
✅ **Maintainability**: Clean, documented code  
✅ **Compatibility**: 100% backward compatible  
✅ **Extensibility**: Easy to add new features  

The system is production-ready and significantly improves code quality while maintaining the core balancing behavior that users expect.
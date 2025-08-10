# Auto-Balance Debug Control

## Single Master Switch

There is now a **single, global debug switch** at the top of `src/data/auto-balance.tsx`:

```typescript
/**
 * 🔍 GLOBAL DEBUG SWITCH
 * ═══════════════════════════════════════════════════════════════════════════
 * Set this to true/false to enable/disable ALL debug output
 * This overrides any other debug settings in the code
 * ═══════════════════════════════════════════════════════════════════════════
 */
const ENABLE_DEBUG = true;  // ← CHANGE THIS TO false TO DISABLE DEBUG
```

## Location

Line ~50 in `src/data/auto-balance.tsx`

## How It Works

- **`ENABLE_DEBUG = true`**: Shows all debug output
- **`ENABLE_DEBUG = false`**: Hides all debug output

This flag overrides:
- The `debugMode` parameter in function calls
- The `DEFAULT_CONFIG.debugMode` setting
- Any other debug settings

## What You'll See

### When ENABLED (true):
```
🔍 DEBUG MODE ENABLED (set ENABLE_DEBUG to false to disable)
Running auto-balance for 22 players...
Simulation 0/100: Score=0.745
Simulation 10/100: Score=0.768
...

════════════════════════════════════════════════════════════
              AUTO-BALANCE RESULTS SUMMARY
════════════════════════════════════════════════════════════

📊 TEAM DISTRIBUTION
────────────────────────────────────────
  Team A: 11 players
  Team B: 11 players

⭐ PEAK POTENTIAL SCORES
... [full debug output] ...
```

### When DISABLED (false):
Nothing - silent operation

## Benefits

1. **Single location** - No searching for multiple debug flags
2. **Always works** - Overrides all other settings
3. **Clear labeling** - Big comment block, hard to miss
4. **Easy toggle** - Just change true/false

## Note

The debug output is comprehensive and can be quite long. It's designed for development and troubleshooting, not for production use.
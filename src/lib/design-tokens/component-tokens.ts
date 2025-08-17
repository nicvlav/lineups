/**
 * Component-specific Design Tokens
 * 
 * Reusable token combinations for consistent component styling.
 * These tokens ensure all shared components maintain the same "vibe" across the app.
 */

import { 
  GAP, 
  PADDING, 
  PADDING_X, 
  PADDING_Y, 
  SIZES, 
  RADIUS, 
  SHADOWS,
  SPACING_Y 
} from '../design-tokens';
import { cn } from '@/lib/utils/cn';

/**
 * Shared component token patterns
 * Use these for consistent styling across all UI components
 */
export const COMPONENT_TOKENS = {
  button: {
    padding: {
      xs: cn(PADDING_X.sm, PADDING_Y.xs),      // px-2 py-1
      sm: cn('px-3', PADDING_Y.xs),            // px-3 py-1
      default: cn(PADDING_X.md, PADDING_Y.sm), // px-4 py-2
      lg: cn(PADDING_X.lg, PADDING_Y.sm),      // px-6 py-2
      icon: SIZES.button.md,                   // h-9 for icon buttons
    },
    height: SIZES.button,
    gap: GAP.sm,           // gap-2 between icon and text
    radius: RADIUS.md,     // rounded-md
    iconSize: {
      default: SIZES.icon.xs,  // size-4
      sm: 'size-3.5',          // slightly smaller for sm buttons
      lg: SIZES.icon.sm,       // size-5 for lg buttons
    }
  },
  
  card: {
    base: cn(RADIUS.xl, SHADOWS.sm, 'border bg-card text-card-foreground'),
    padding: {
      header: PADDING.lg,                   // p-6
      content: cn(PADDING_X.lg, 'pt-0'),   // px-6 pt-0
      footer: cn(PADDING.lg, 'pt-0'),      // p-6 pt-0
      compact: PADDING.md,                  // p-4 for smaller cards
    },
    gap: {
      sm: GAP.md,     // gap-4
      default: GAP.lg, // gap-6
      lg: GAP.xl,     // gap-8
    },
    radius: RADIUS.xl,
    shadow: SHADOWS.sm,
  },
  
  input: {
    base: cn(
      'flex w-full border border-input bg-background text-sm',
      'file:border-0 file:bg-transparent file:text-sm file:font-medium',
      'placeholder:text-muted-foreground',
      'disabled:cursor-not-allowed disabled:opacity-50'
    ),
    padding: cn(PADDING_X.sm, PADDING_Y.sm), // px-3 py-2
    height: SIZES.input,
    radius: RADIUS.lg,     // rounded-lg
    focus: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  },
  
  dialog: {
    overlay: cn(
      'fixed inset-0 z-50 bg-black/80',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
    ),
    content: cn(
      'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg',
      'translate-x-[-50%] translate-y-[-50%]',
      GAP.md,           // gap-4
      PADDING.lg,       // p-6
      RADIUS.xl,        // rounded-xl
      'border bg-background shadow-lg duration-200',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
      'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
      'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]'
    ),
    header: cn('flex flex-col', SPACING_Y.xs),  // space-y-1.5
    footer: cn('flex flex-col-reverse sm:flex-row sm:justify-end', GAP.sm), // gap-2
    padding: PADDING.lg,
    gap: GAP.md,
    radius: RADIUS.xl,
    maxWidth: 'max-w-lg',
  },
  
  actionBar: {
    base: cn(
      'flex items-center h-10',  // Fixed 40px height
      PADDING.xs,                 // p-1
      GAP.xs,                     // gap-1
      RADIUS.xl,                  // rounded-xl
      'bg-muted/20',
      'transition-all duration-200'
    ),
    height: 'h-10',  // Consistent 40px
    padding: PADDING.xs,
    gap: GAP.xs,
    radius: RADIUS.xl,
    compact: cn('h-12', PADDING.xs, GAP.xs), // For smaller screens
  },
  
  badge: {
    base: cn(
      'inline-flex items-center font-semibold transition-colors',
      'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
    ),
    padding: {
      default: cn('px-2.5', PADDING_Y.xs), // px-2.5 py-0.5
      sm: cn(PADDING_X.sm, 'py-0'),        // px-2 py-0
      lg: cn(PADDING_X.sm, PADDING_Y.xs),  // px-3 py-1
    },
    radius: RADIUS.full,  // rounded-full
    text: {
      default: 'text-xs',
      sm: 'text-[10px]',
      lg: 'text-sm',
    }
  },
  
  separator: {
    horizontal: 'h-[1px] w-full bg-border',
    vertical: 'w-[1px] h-full bg-border',
  },
  
  skeleton: {
    base: cn('animate-pulse bg-primary/10', RADIUS.md),
  },
  
  tooltip: {
    content: cn(
      'z-50 overflow-hidden bg-primary text-primary-foreground',
      PADDING_X.sm,
      PADDING_Y.xs,
      RADIUS.md,
      SHADOWS.md,
      'text-sm'
    ),
  },
  
  select: {
    trigger: cn(
      'flex w-full items-center justify-between',
      SIZES.input.md,     // h-10
      PADDING_X.sm,        // px-3
      PADDING_Y.sm,        // py-2
      RADIUS.md,           // rounded-md
      'border border-input bg-background text-sm',
      'disabled:cursor-not-allowed disabled:opacity-50',
      '[&>span]:line-clamp-1'
    ),
    content: cn(
      'relative z-50 max-h-96 min-w-[8rem] overflow-hidden',
      RADIUS.md,
      'border bg-popover text-popover-foreground',
      SHADOWS.md,
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
    ),
    item: cn(
      'relative flex w-full cursor-default select-none items-center',
      PADDING_Y.xs,        // py-1.5
      PADDING_X.sm,        // px-2
      'text-sm outline-none',
      'focus:bg-accent focus:text-accent-foreground',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
    ),
  },
  
  table: {
    container: cn('relative w-full overflow-auto'),
    table: 'w-full caption-bottom text-sm',
    header: '[&_tr]:border-b',
    body: '[&_tr:last-child]:border-0',
    row: cn(
      'border-b transition-colors',
      'hover:bg-muted/50',
      'data-[state=selected]:bg-muted'
    ),
    head: cn(
      'h-10',              // Fixed height
      PADDING_X.md,        // px-4
      'text-left align-middle font-medium text-muted-foreground',
      '[&:has([role=checkbox])]:pr-0',
      '[&>[role=checkbox]]:translate-y-[2px]'
    ),
    cell: cn(
      PADDING.md,          // p-4
      'align-middle',
      '[&:has([role=checkbox])]:pr-0',
      '[&>[role=checkbox]]:translate-y-[2px]'
    ),
  },
  
  tabs: {
    list: cn(
      'inline-flex items-center justify-center',
      PADDING.xs,          // p-1
      GAP.xs,             // gap-1
      RADIUS.lg,          // rounded-lg
      'bg-muted text-muted-foreground'
    ),
    trigger: cn(
      'inline-flex items-center justify-center whitespace-nowrap',
      PADDING_X.sm,       // px-3
      PADDING_Y.xs,       // py-1
      RADIUS.md,          // rounded-md
      'text-sm font-medium transition-all',
      'focus-visible:outline-none focus-visible:ring-2',
      'focus-visible:ring-ring focus-visible:ring-offset-2',
      'disabled:pointer-events-none disabled:opacity-50',
      'data-[state=active]:bg-background',
      'data-[state=active]:text-foreground',
      'data-[state=active]:shadow'
    ),
    content: cn(
      'mt-2',
      'focus-visible:outline-none focus-visible:ring-2',
      'focus-visible:ring-ring focus-visible:ring-offset-2'
    ),
  },
} as const;

/**
 * Helper to get component tokens with optional overrides
 */
export function getComponentTokens<T extends keyof typeof COMPONENT_TOKENS>(
  component: T,
  overrides?: Partial<typeof COMPONENT_TOKENS[T]>
): typeof COMPONENT_TOKENS[T] {
  return {
    ...COMPONENT_TOKENS[component],
    ...overrides,
  } as typeof COMPONENT_TOKENS[T];
}
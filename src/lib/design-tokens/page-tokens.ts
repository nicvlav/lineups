/**
 * Page-level Design Tokens
 * 
 * Standardized layouts and patterns for consistent page structure.
 * These tokens ensure all pages maintain the same spacing and layout rhythm.
 */

import { cn } from '@/lib/utils/cn';
import { PADDING, SPACING_Y, GAP } from '../design-tokens';

/**
 * Standard page layout patterns
 * Use these for consistent page structure across the app
 */
export const PAGE_LAYOUT = {
  /**
   * Main page container
   * Full height flex column with standard padding and spacing
   */
  container: cn(
    "flex flex-col h-full w-full overflow-hidden",
    PADDING.md,        // p-4
    SPACING_Y.lg       // space-y-6
  ),
  
  /**
   * Page header section
   * Contains title and description with consistent spacing
   */
  header: {
    wrapper: cn(SPACING_Y.sm),  // space-y-2
    title: "text-2xl font-bold tracking-tight",
    description: "text-muted-foreground",
  },
  
  /**
   * Action bar container
   * Fixed height for consistent UI across pages
   */
  actionBar: {
    wrapper: "h-10 flex-shrink-0",  // Fixed 40px height
    compact: "h-12 flex-shrink-0",  // Compact variant 48px
  },
  
  /**
   * Main content area
   * Flexible height with overflow handling
   */
  content: {
    wrapper: "flex-1 overflow-hidden",
    scrollable: "flex-1 overflow-y-auto",
    withPadding: cn("flex-1 overflow-y-auto", PADDING.md),
  },
  
  /**
   * Grid layouts for cards and items
   */
  grid: {
    cards: cn(
      "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
      GAP.md  // gap-4
    ),
    compact: cn(
      "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
      GAP.sm  // gap-2
    ),
    list: cn(
      "flex flex-col",
      GAP.sm  // gap-2
    ),
  },
  
  /**
   * Section patterns within pages
   */
  section: {
    wrapper: cn(SPACING_Y.md),      // space-y-4
    title: "text-lg font-semibold",
    content: cn(SPACING_Y.sm),      // space-y-2
  },
  
  /**
   * Form layouts
   */
  form: {
    wrapper: cn(SPACING_Y.md),      // space-y-4
    fieldGroup: cn(SPACING_Y.sm),   // space-y-2
    buttonGroup: cn("flex", GAP.sm), // gap-2
  },
  
  /**
   * Empty state patterns
   */
  emptyState: {
    wrapper: cn(
      "flex flex-col items-center justify-center",
      "text-center",
      PADDING.xl,      // p-8
      SPACING_Y.md     // space-y-4
    ),
    icon: "text-muted-foreground mb-4",
    title: "text-lg font-semibold",
    description: "text-sm text-muted-foreground",
  },
  
  /**
   * Loading state patterns
   */
  loadingState: {
    wrapper: cn(
      "flex items-center justify-center h-full",
      SPACING_Y.md     // space-y-4
    ),
    spinner: "animate-spin h-8 w-8 text-primary",
    text: "text-sm text-muted-foreground",
  },
  
  /**
   * Error state patterns
   */
  errorState: {
    wrapper: cn(
      "flex flex-col items-center justify-center",
      "text-center",
      PADDING.lg,      // p-6
      SPACING_Y.sm     // space-y-2
    ),
    icon: "text-destructive mb-2",
    title: "text-lg font-semibold text-destructive",
    description: "text-sm text-muted-foreground",
    retry: "mt-4",
  },
};

/**
 * Common page templates
 */
export const PAGE_TEMPLATES = {
  
  /**
   * List page with search/filter bar
   */
  list: {
    container: PAGE_LAYOUT.container,
    header: PAGE_LAYOUT.header,
    filters: cn("flex items-center", GAP.sm),
    content: PAGE_LAYOUT.content.scrollable,
  },
  
  /**
   * Detail page with back navigation
   */
  detail: {
    container: PAGE_LAYOUT.container,
    backButton: "mb-4",
    header: PAGE_LAYOUT.header,
    content: PAGE_LAYOUT.content.withPadding,
  },
  
  /**
   * Settings/form page
   */
  settings: {
    container: cn(PAGE_LAYOUT.container, "max-w-2xl mx-auto"),
    header: PAGE_LAYOUT.header,
    form: PAGE_LAYOUT.form,
  },
};

/**
 * Helper to create consistent page structure
 */
export function createPageLayout(config: {
  title: string;
  description?: string;
  actionBar?: React.ReactNode;
  variant?: 'list' | 'detail' | 'settings';
}) {
  const template = config.variant ? PAGE_TEMPLATES[config.variant] : undefined;
  
  return {
    containerClass: PAGE_LAYOUT.container,
    headerClass: PAGE_LAYOUT.header,
    actionBarClass: PAGE_LAYOUT.actionBar,
    contentClass: PAGE_LAYOUT.content,
    template,
  };
}
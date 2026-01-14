/**
 * Design System Tokens
 *
 * Centralized design tokens for consistent spacing, sizing, and styling
 * across the application. Use these constants instead of hardcoded values.
 */

export const SPACING = {
    xs: "space-x-1", // 4px
    sm: "space-x-2", // 8px
    md: "space-x-4", // 16px
    lg: "space-x-6", // 24px
    xl: "space-x-8", // 32px
    "2xl": "space-x-12", // 48px
    "3xl": "space-x-16", // 64px
} as const;

export const GAP = {
    xs: "gap-1", // 4px
    sm: "gap-2", // 8px
    md: "gap-4", // 16px
    lg: "gap-6", // 24px
    xl: "gap-8", // 32px
    "2xl": "gap-12", // 48px
    "3xl": "gap-16", // 64px
} as const;

export const PADDING = {
    xs: "p-1", // 4px
    sm: "p-2", // 8px
    md: "p-4", // 16px
    lg: "p-6", // 24px
    xl: "p-8", // 32px
    "2xl": "p-12", // 48px
    "3xl": "p-16", // 64px
} as const;

export const MARGIN = {
    xs: "m-1", // 4px
    sm: "m-2", // 8px
    md: "m-4", // 16px
    lg: "m-6", // 24px
    xl: "m-8", // 32px
    "2xl": "m-12", // 48px
    "3xl": "m-16", // 64px
} as const;

export const SIZES = {
    icon: {
        xs: "size-4", // 16px
        sm: "size-5", // 20px
        md: "size-6", // 24px
        lg: "size-8", // 32px
        xl: "size-10", // 40px
    },
    button: {
        sm: "h-8", // 32px
        md: "h-10", // 40px
        lg: "h-12", // 48px
    },
    input: {
        sm: "h-8", // 32px
        md: "h-10", // 40px
        lg: "h-12", // 48px
    },
} as const;

export const RADIUS = {
    none: "rounded-none",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    xl: "rounded-xl",
    full: "rounded-full",
} as const;

export const LAYOUT = {
    header: {
        height: "h-16", // 64px
        maxWidth: "max-w-7xl", // 1280px
        padding: "px-4", // 16px horizontal
    },
    container: {
        maxWidth: "max-w-7xl",
        padding: "px-4 sm:px-6 lg:px-8",
        margin: "mx-auto",
    },
    section: {
        padding: "py-8 md:py-12 lg:py-16",
    },
} as const;

export const BREAKPOINTS = {
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1280px",
    "2xl": "1536px",
} as const;

export const ANIMATIONS = {
    transition: {
        fast: "transition-all duration-150",
        normal: "transition-all duration-200",
        slow: "transition-all duration-300",
    },
    hover: {
        scale: "hover:scale-105",
        opacity: "hover:opacity-80",
        lift: "hover:-translate-y-0.5 hover:shadow-lg",
    },
} as const;

export const SHADOWS = {
    sm: "shadow-sm",
    md: "shadow-md",
    lg: "shadow-lg",
    xl: "shadow-xl",
    inner: "shadow-inner",
} as const;

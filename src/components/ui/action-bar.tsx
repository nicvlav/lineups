import React from "react";
import { ANIMATIONS, GAP } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

interface ActionBarProps {
    children: React.ReactNode;
    className?: string;
    variant?: "default" | "compact";
}

interface ActionBarSectionProps {
    children: React.ReactNode;
    className?: string;
    alignment?: "left" | "center" | "right";
}

interface ActionBarGroupProps {
    children: React.ReactNode;
    className?: string;
    variant?: "default" | "compact" | "outlined";
}

/**
 * Main ActionBar container - provides consistent spacing and styling
 */
export const ActionBar: React.FC<ActionBarProps> = ({ children, className, variant = "default" }) => {
    return (
        <div
            className={cn(
                "flex items-center w-full",
                "bg-linear-to-r from-muted/10 via-muted/5 to-muted/10",
                "border border-border/50 rounded-2xl shadow-md backdrop-blur-sm",
                "dark:border-border/80 dark:shadow-lg dark:shadow-black/20",
                variant === "compact" ? "p-2 h-12" : "p-3 h-14",
                "mb-4",
                ANIMATIONS.transition.normal,
                className
            )}
        >
            {children}
        </div>
    );
};

/**
 * ActionBar section - for organizing content within the action bar
 */
export const ActionBarSection: React.FC<ActionBarSectionProps> = ({ children, className, alignment = "left" }) => {
    const alignmentClasses = {
        left: "justify-start",
        center: "justify-center",
        right: "justify-end",
    };

    return (
        <div
            className={cn(
                "flex items-center",
                alignmentClasses[alignment],
                alignment === "center" ? "flex-1" : "",
                className
            )}
        >
            {children}
        </div>
    );
};

/**
 * ActionBar group - for grouping related controls with visual separation
 */
export const ActionBarGroup: React.FC<ActionBarGroupProps> = ({ children, className, variant = "default" }) => {
    const variantClasses = {
        default: "bg-background/50 border-border/20",
        compact: "bg-muted/20",
        outlined: "bg-background/80 border-border/40 ring-1 ring-border/10",
    };

    return (
        <div
            className={cn(
                "inline-flex items-center rounded-xl border",
                "p-1.5 shadow-sm",
                variantClasses[variant],
                GAP.xs, // gap-1
                ANIMATIONS.transition.normal,
                className
            )}
        >
            {children}
        </div>
    );
};

/**
 * Predefined layouts for common action bar patterns
 */

// Layout: Left content | Center content | Right actions
export const ActionBarThreeColumn: React.FC<{
    left?: React.ReactNode;
    center?: React.ReactNode;
    right?: React.ReactNode;
    variant?: "default" | "compact";
    className?: string;
}> = ({ left, center, right, variant = "default", className }) => {
    return (
        <ActionBar variant={variant} className={cn("grid grid-cols-3", className)}>
            <ActionBarSection alignment="left">{left}</ActionBarSection>
            <ActionBarSection alignment="center">{center}</ActionBarSection>
            <ActionBarSection alignment="right">{right}</ActionBarSection>
        </ActionBar>
    );
};

// Layout: Left content | Right actions (most common)
export const ActionBarTwoColumn: React.FC<{
    left?: React.ReactNode;
    right?: React.ReactNode;
    variant?: "default" | "compact";
    className?: string;
}> = ({ left, right, variant = "default", className }) => {
    return (
        <ActionBar variant={variant} className={cn("justify-between", className)}>
            <ActionBarSection alignment="left">{left}</ActionBarSection>
            <ActionBarSection alignment="right">{right}</ActionBarSection>
        </ActionBar>
    );
};

// Layout: Single centered content
export const ActionBarSingle: React.FC<{
    children: React.ReactNode;
    variant?: "default" | "compact";
    className?: string;
}> = ({ children, variant = "default", className }) => {
    return (
        <ActionBar variant={variant} className={cn("justify-center", className)}>
            <ActionBarSection alignment="center">{children}</ActionBarSection>
        </ActionBar>
    );
};

// Layout: Multiple sections with flex spacing
export const ActionBarFlex: React.FC<{
    children: React.ReactNode;
    variant?: "default" | "compact";
    spacing?: "none" | "sm" | "md" | "lg";
    className?: string;
}> = ({ children, variant = "default", spacing = "md", className }) => {
    const spacingClasses = {
        none: "gap-0",
        sm: "gap-2",
        md: "gap-4",
        lg: "gap-6",
    };

    return (
        <ActionBar variant={variant} className={cn(spacingClasses[spacing], className)}>
            {children}
        </ActionBar>
    );
};

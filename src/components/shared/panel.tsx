/**
 * Panel Component
 *
 * Unified panel component with flexible variants and layouts.
 */

import { motion } from "framer-motion";
import React from "react";
import { cn } from "@/lib/utils";

interface PanelProps {
    children: React.ReactNode;
    className?: string;
    variant?: "default" | "card" | "glass" | "flat" | "game";
    padding?: "none" | "sm" | "md" | "lg";
}

const Panel: React.FC<PanelProps> = ({ children, className = "", variant = "default", padding = "md" }) => {
    // Variant styles
    const variantStyles = {
        default: "bg-muted/20 backdrop-blur-sm border border-border/20 shadow-lg",
        card: "bg-background border border-border/40 shadow-md",
        glass: "bg-background/50 backdrop-blur-md border border-border/30 shadow-xl",
        flat: "bg-background/80 border border-border/20",
        game: "h-full w-full flex flex-col min-h-0", // Special variant for game layout
    };

    // Padding styles
    const paddingStyles = {
        none: "p-0",
        sm: "p-2",
        md: "p-4",
        lg: "p-6",
    };

    // Game variant has special structure
    if (variant === "game") {
        return (
            <div className="h-full w-full flex flex-col min-h-0">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className={cn(
                        "flex-1 min-h-0 flex flex-col bg-muted/20 backdrop-blur-sm rounded-lg border border-border/20 shadow-lg overflow-hidden",
                        className
                    )}
                >
                    <div className="flex-1 min-h-0 overflow-y-auto p-4">{children}</div>
                </motion.div>
            </div>
        );
    }

    // Standard variants
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={cn("rounded-lg overflow-hidden", variantStyles[variant], paddingStyles[padding], className)}
        >
            {children}
        </motion.div>
    );
};

/**
 * Grid Panel Section
 * Automatically stacks on mobile, grid on desktop
 */
interface GridPanelSectionProps {
    children: React.ReactNode;
    columns?: 1 | 2 | 3 | 4;
    gap?: "sm" | "md" | "lg";
    className?: string;
}

export const GridPanelSection: React.FC<GridPanelSectionProps> = ({
    children,
    columns = 2,
    gap = "md",
    className = "",
}) => {
    const gapStyles = {
        sm: "gap-2",
        md: "gap-4",
        lg: "gap-6",
    };

    const gridCols = {
        1: "grid-cols-1",
        2: "grid-cols-1 md:grid-cols-2",
        3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
        4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
    };

    return <div className={cn("grid", gridCols[columns], gapStyles[gap], className)}>{children}</div>;
};

/**
 * Panel Section with Header
 */
interface PanelSectionProps {
    title?: string;
    subtitle?: string;
    children: React.ReactNode;
    className?: string;
    headerAction?: React.ReactNode;
}

export const PanelSection: React.FC<PanelSectionProps> = ({
    title,
    subtitle,
    children,
    className = "",
    headerAction,
}) => {
    return (
        <div className={cn("space-y-3", className)}>
            {(title || subtitle || headerAction) && (
                <div className="flex items-start justify-between">
                    <div>
                        {title && (
                            <h3 className="font-bold text-sm tracking-wide text-foreground uppercase">{title}</h3>
                        )}
                        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
                    </div>
                    {headerAction && <div>{headerAction}</div>}
                </div>
            )}
            {children}
        </div>
    );
};

export default Panel;

import { ModeToggle } from "@/components/mode-toggle"
import { Users, Home, Wand2, BookDashed, type LucideIcon } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LAYOUT, GAP, ANIMATIONS } from "@/lib/design-tokens";

interface HeaderBarProps {
    compact: boolean;
    canEdit: boolean;
}

interface TabIconProps {
    icon: LucideIcon;
    to: string;
    label: string;
}

const HeaderBar: React.FC<HeaderBarProps> = ({ compact, canEdit }) => {
    const iconSize = compact ? 16 : 20;

    const TabIcon = ({ icon: Icon, to, label }: TabIconProps) => (
        <NavLink
            to={to}
            className={({ isActive }) =>
                cn(
                    "relative group inline-flex items-center justify-center",
                    compact ? "size-10" : "size-12",
                    "rounded-xl border border-transparent",
                    ANIMATIONS.transition.normal, // transition-all duration-200
                    "hover:bg-accent/60 hover:text-accent-foreground hover:border-border/30",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "active:scale-95 active:bg-accent/80", // Add press feedback
                    isActive 
                        ? "bg-gradient-to-br from-primary/90 to-primary text-primary-foreground shadow-lg border-primary/20 ring-1 ring-primary/30" 
                        : "text-muted-foreground hover:text-foreground"
                )
            }
            aria-label={label}
        >
            {({ isActive }) => (
                <>
                    <Icon size={iconSize} className="shrink-0" />
                    <span className="sr-only">{label}</span>
                    {/* Active indicator */}
                    {isActive && (
                        <div className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary-foreground rounded-full opacity-80" />
                    )}
                </>
            )}
        </NavLink>
    );

    return (
        <header className="w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b-2 border-border">
            <div className={cn(
                "flex items-center w-full",
                LAYOUT.header.height, // h-16
                compact ? "px-4" : "px-4"
            )}>
                {/* Brand/Logo - Far left edge */}
                <h1 className={cn(
                    "font-bold text-foreground select-none tracking-tight",
                    "bg-gradient-to-r from-muted/40 to-muted/20 rounded-xl",
                    compact ? "text-lg px-3 py-1.5" : "text-xl px-4 py-2"
                )}>
                    LM
                </h1>

                {/* Navigation - Absolute center of screen */}
                <div className="flex-1 flex justify-center">
                    <nav 
                        className={cn(
                            "flex items-center justify-center",
                            "bg-muted/10 rounded-2xl p-1",
                            "backdrop-blur-sm",
                            GAP.xs
                        )} // gap-1
                        role="navigation" 
                        aria-label="Main navigation"
                    >
                        <TabIcon icon={Home} to="/" label="Home" />
                        {canEdit && (
                            <TabIcon icon={Users} to="/players" label="Players" />
                        )}
                        <TabIcon icon={BookDashed} to="/cards" label="Cards" />
                        <TabIcon icon={Wand2} to="/generate" label="Generate Teams" />
                    </nav>
                </div>

                {/* Actions - Far right edge */}
                <div className={cn(
                    "bg-gradient-to-l from-muted/40 to-muted/20 rounded-xl",
                    compact ? "p-1.5" : "p-2"
                )}>
                    <ModeToggle />
                </div>
            </div>
        </header>
    );
};

export default HeaderBar;

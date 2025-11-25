import { ModeToggle } from "@/components/layout/mode-toggle"
import { Home, ListChecks , SquareUser, Vote, LogIn, LogOut, User, type LucideIcon } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LAYOUT, GAP, ANIMATIONS } from "@/lib/design-tokens";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { PlayerAssociation } from "@/components/auth/dialogs/player-association";
import { useState } from "react";

interface HeaderBarProps {
    compact: boolean;
}

interface TabIconProps {
    icon: LucideIcon;
    to: string;
    label: string;
}

const HeaderBar: React.FC<HeaderBarProps> = ({ compact }) => {
    const { user, signOut } = useAuth();
    const [showPlayerAssociation, setShowPlayerAssociation] = useState(false);
    const iconSize = compact ? 16 : 20;

    // Detect staging environment
    const isStaging = window.location.hostname.includes('staging');

    const canVote = user !== null;
    
    const handleSignOut = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        try {
            console.log('🚪 HEADER: Initiating sign out...');
            const result = await signOut();

            if (result.error) {
                console.error('HEADER: Sign out failed:', result.error);
                // Still continue - auth context should have cleared local state
            } else {
                console.log('✅ HEADER: Sign out successful');
            }
        } catch (error) {
            console.error('HEADER: Unexpected sign out error:', error);
            // Even if error, auth context should have cleared state
        }
    };

    const TabIcon = ({ icon: Icon, to, label }: TabIconProps) => (
        <NavLink
            to={to}
            onClick={() => {
                console.log(`HeaderBar: Navigation clicked - ${label} to ${to}`);
                // Use unique timer names with timestamp to avoid conflicts
                const timerId = `HeaderBar: Navigate to ${to} - ${Date.now()}`;
                console.time(timerId);
                setTimeout(() => console.timeEnd(timerId), 100);
            }}
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
        <>
            <header className="w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b-2 border-border">
                <div className={cn(
                    "grid grid-cols-3 items-center w-full",
                    "sm:grid-cols-3 grid-cols-[auto_1fr_auto]", // On mobile: auto-sized sides, flexible center
                    LAYOUT.header.height, // h-16
                    compact ? "px-4" : "px-4"
                )}>
                    {/* Brand/Logo - Left column */}
                    <div className="flex justify-start">
                        <h1 className={cn(
                            "font-bold text-foreground select-none tracking-tight rounded-xl",
                            isStaging
                                ? "bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30"
                                : "bg-gradient-to-r from-muted/40 to-muted/20",
                            compact ? "text-lg px-3 py-1.5" : "text-xl px-4 py-2"
                        )}>
                            {isStaging ? "LM 🚧" : "LM"}
                        </h1>
                    </div>

                    {/* Navigation - Center column (always centered) */}
                    <div className="flex justify-center">
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
            
                            <TabIcon icon={SquareUser} to="/cards" label="Cards" />
                           
                            <TabIcon icon={ListChecks } to="/generate" label="Generate Teams" />
                            {canVote && (
                                <TabIcon icon={Vote} to="/vote" label="Vote" />
                            )}

                        </nav>
                    </div>

                    {/* Actions - Right column */}
                    <div className="flex justify-end">
                        <div className={cn(
                            "flex items-center gap-2",
                            "bg-gradient-to-l from-muted/40 to-muted/20 rounded-xl",
                            compact ? "p-1.5" : "p-2"
                        )}>
                            {user ? (
                                <>
                                    <Button
                                        variant="ghost"
                                        size={compact ? "sm" : "default"}
                                        onClick={() => setShowPlayerAssociation(true)}
                                        className="text-muted-foreground hover:text-foreground"
                                        title="Associate with player profile"
                                    >
                                        <User className={cn("mr-1", compact ? "h-3 w-3" : "h-4 w-4")} />
                                        {!compact && "Profile"}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size={compact ? "sm" : "default"}
                                        onClick={handleSignOut}
                                        className="text-muted-foreground hover:text-foreground"
                                    >
                                        <LogOut className={cn("mr-1", compact ? "h-3 w-3" : "h-4 w-4")} />
                                        {!compact && "Sign Out"}
                                    </Button>
                                </>
                            ) : (
                                <Button
                                    asChild
                                    variant="ghost"
                                    size={compact ? "sm" : "default"}
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    <NavLink to="/auth/sign-in">
                                        <LogIn className={cn("mr-1", compact ? "h-3 w-3" : "h-4 w-4")} />
                                        {!compact && "Sign In"}
                                    </NavLink>
                                </Button>
                            )}
                            <ModeToggle />
                        </div>
                    </div>
                </div>
            </header>

            {showPlayerAssociation && (
                <PlayerAssociation
                    open={showPlayerAssociation}
                    onClose={() => setShowPlayerAssociation(false)}
                />
            )}
        </>
    );
};

export default HeaderBar;

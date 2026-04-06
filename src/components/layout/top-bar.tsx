import { motion } from "framer-motion";
import { Home, ListChecks, LogIn, LogOut, SquareUser, TableProperties, Vote } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { ModeToggle } from "@/components/layout/mode-toggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

const ROUTE_TITLES: Record<string, string> = {
    "/": "Lineups",
    "/cards": "Player Cards",
    "/generate": "Generate",
    "/manage": "Manage",
    "/vote": "Evaluate",
};

const NAV_TABS = [
    { icon: Home, label: "Home", to: "/" },
    { icon: SquareUser, label: "Cards", to: "/cards" },
    { icon: ListChecks, label: "Generate", to: "/generate" },
    { icon: TableProperties, label: "Manage", to: "/manage", authRequired: true },
    { icon: Vote, label: "Vote", to: "/vote", authRequired: true },
];

interface TopBarProps {
    isCompact: boolean;
}

export function TopBar({ isCompact }: TopBarProps) {
    const { user, canVote, signOut } = useAuth();
    const { pathname } = useLocation();

    const isStaging = window.location.hostname.includes("staging");
    const pageTitle = ROUTE_TITLES[pathname] ?? "";

    const visibleTabs = NAV_TABS.filter((tab) => !tab.authRequired || canVote);

    // Match active tab — exact for "/" , startsWith for others
    const activeTab = visibleTabs.find((tab) => (tab.to === "/" ? pathname === "/" : pathname.startsWith(tab.to)));

    const handleSignOut = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        try {
            logger.debug("TOP BAR: Initiating sign out");
            const result = await signOut();

            if (result.error) {
                logger.error("TOP BAR: Sign out failed", result.error);
            } else {
                logger.info("TOP BAR: Sign out successful");
            }
        } catch (error) {
            logger.error("TOP BAR: Unexpected sign out error", error);
        }
    };

    return (
        <header className="w-full bg-background/95 backdrop-blur-md border-b border-border/30 pt-[env(safe-area-inset-top)]">
            <div className="flex items-center h-11 px-4">
                {/* Logo */}
                <div className="flex items-center shrink-0">
                    <h1
                        className={cn(
                            "font-bold text-sm text-foreground select-none tracking-tight rounded-lg px-2.5 py-0.5",
                            isStaging
                                ? "bg-linear-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30"
                                : "bg-muted/30"
                        )}
                    >
                        {isStaging ? "LM 🚧" : "LM"}
                    </h1>
                </div>

                {/* Desktop: inline nav tabs with sliding indicator | Mobile: page title */}
                {isCompact ? (
                    <div className="flex-1 flex justify-center">
                        <span className="text-sm font-medium text-muted-foreground select-none">{pageTitle}</span>
                    </div>
                ) : (
                    <nav className="flex-1 flex items-center justify-center gap-1" aria-label="Main navigation">
                        {visibleTabs.map((tab) => {
                            const isActive = activeTab?.to === tab.to;
                            return (
                                <NavLink
                                    key={tab.to}
                                    to={tab.to}
                                    end={tab.to === "/"}
                                    className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200"
                                >
                                    {/* Sliding background indicator */}
                                    {isActive && (
                                        <motion.span
                                            layoutId="nav-indicator"
                                            className="absolute inset-0 rounded-lg bg-(--quality-elite-soft)/40"
                                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                        />
                                    )}
                                    <span
                                        className={cn(
                                            "relative z-10 flex items-center gap-1.5",
                                            isActive
                                                ? "text-(--quality-elite)"
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <tab.icon size={14} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                                        {tab.label}
                                    </span>
                                </NavLink>
                            );
                        })}
                    </nav>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                    {user ? (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSignOut}
                            className="text-muted-foreground hover:text-foreground h-7 w-7 p-0"
                        >
                            <LogOut className="h-3.5 w-3.5" />
                        </Button>
                    ) : (
                        <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-foreground h-7 w-7 p-0"
                        >
                            <NavLink to="/auth/sign-in">
                                <LogIn className="h-3.5 w-3.5" />
                            </NavLink>
                        </Button>
                    )}
                    <ModeToggle />
                </div>
            </div>
        </header>
    );
}

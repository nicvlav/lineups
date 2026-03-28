import { LogIn, LogOut } from "lucide-react";
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

export function TopBar() {
    const { user, signOut } = useAuth();
    const { pathname } = useLocation();

    const isStaging = window.location.hostname.includes("staging");
    const pageTitle = ROUTE_TITLES[pathname] ?? "";

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
            <div className="grid grid-cols-3 items-center h-11 px-4">
                {/* Logo */}
                <div className="flex justify-start">
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

                {/* Page title — contextual center */}
                <div className="flex justify-center">
                    <span className="text-sm font-medium text-muted-foreground select-none">{pageTitle}</span>
                </div>

                {/* Actions */}
                <div className="flex justify-end items-center gap-1">
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

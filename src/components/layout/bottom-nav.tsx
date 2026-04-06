import { motion } from "framer-motion";
import { Home, ListChecks, type LucideIcon, SquareUser, TableProperties, Vote } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";

interface NavTab {
    icon: LucideIcon;
    label: string;
    to: string;
    authRequired?: boolean;
}

const TABS: NavTab[] = [
    { icon: Home, label: "Home", to: "/" },
    { icon: SquareUser, label: "Cards", to: "/cards" },
    { icon: ListChecks, label: "Generate", to: "/generate" },
    { icon: TableProperties, label: "Manage", to: "/manage", authRequired: true },
    { icon: Vote, label: "Vote", to: "/vote", authRequired: true },
];

export function BottomNav() {
    const { canVote } = useAuth();

    const visibleTabs = TABS.filter((tab) => !tab.authRequired || canVote);

    return (
        <nav
            className="fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-md border-t border-border/50 pb-[env(safe-area-inset-bottom)]"
            aria-label="Main navigation"
        >
            <div
                className="grid h-16 mx-auto max-w-lg"
                style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, 1fr)` }}
            >
                {visibleTabs.map((tab) => (
                    <motion.div
                        key={tab.to}
                        whileTap={{ scale: 0.92 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    >
                        <NavLink
                            to={tab.to}
                            end={tab.to === "/"}
                            className={({ isActive }) =>
                                cn(
                                    "flex flex-col items-center justify-center gap-0.5 h-16",
                                    "transition-colors duration-200",
                                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                                )
                            }
                            aria-label={tab.label}
                        >
                            {({ isActive }) => (
                                <>
                                    <tab.icon size={20} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                                    <span className="text-[11px] font-medium">{tab.label}</span>
                                </>
                            )}
                        </NavLink>
                    </motion.div>
                ))}
            </div>
        </nav>
    );
}

import { ModeToggle } from "@/components/mode-toggle"
import { usePlayers } from "@/data/players-provider"
import { Users, Home, Settings, Share } from "lucide-react";
import { NavLink } from "react-router-dom";
import { encodeStateToURL } from "@/data/state-manager";
import { Button } from "@/components/ui/button"

// import { Separator } from "@/components/ui/separator"

interface HeaderBarProps {
    compact: boolean;
}

const HeaderBar: React.FC<HeaderBarProps> = ({ compact }) => {
    const { gamePlayers } = usePlayers();
    const iconSize = compact ? 15 : 18;

    const TabIcon = ({ icon: Icon, to }: { icon: any; to: string }) => (
        <NavLink
            to={to}
            className={({ isActive }) =>
                `relative group inline-flex items-center justify-center w-10 h-10 rounded-full ${isActive ? "text-blue-500" : "text-foreground hover:bg-white/5"
                }`
            }
        >
            <Icon size={iconSize} />
        </NavLink>
    );

    const handleShare = () => {
        const shareUrl = encodeStateToURL(gamePlayers);
        navigator.clipboard.writeText(shareUrl).then(() => alert("Shareable link copied!"));
    };

    return (
        <div className="w-full flex items-center justify-center h-[60px] min-h-[60px] max-h-[60px] overflow-hidden">
            {/* Sidebar button and title */}
            {!compact && (
                <div className="flex items-center space-x-3 flex-shrink-0 min-w-[50px]">
                    <h1 className="font-bold text-lg truncate" style={{ fontSize: "1.25rem" }}>LM</h1>
                </div>
            )}

            {/* Buttons container (ensures shrink behavior) */}
            <div className="flex flex-1 justify-center space-x-2 min-w-0 overflow-hidden ml-1">
                <TabIcon icon={Home} to="/" />
                <TabIcon icon={Users} to="/players" />
                <TabIcon icon={Settings} to="/settings" />
            </div>

            <div className="flex">
                {!compact && (
                    <Button variant="ghost"
                        className={`flex-1 flex items-center justify-center p-2  transition-all duration-200`}
                        onClick={handleShare}>
                        <Share size={iconSize} />
                    </Button>
                )}

                <ModeToggle></ModeToggle>
            </div>


        </div>
    );
};

export default HeaderBar;

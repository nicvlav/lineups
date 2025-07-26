import { ModeToggle } from "@/components/mode-toggle"
import { Users, Home, Wand2, BookDashed } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useEffect } from "react";

interface HeaderBarProps {
    compact: boolean;
    canEdit: boolean;
}

const HeaderBar: React.FC<HeaderBarProps> = ({ compact, canEdit }) => {
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

    return (
        <div className="w-full flex items-center justify-center h-[60px] min-h-[60px] max-h-[60px] overflow-hidden">
            {/* title */}

            <div className="flex items-center space-x-3 flex-shrink-0 min-w-[50px]">
                <h1 className="font-bold text-lg truncate" style={{ fontSize: "1.25rem" }}>LM</h1>
            </div>

            {/* Buttons container (ensures shrink behavior) */}
            <div className="flex flex-1 justify-center space-x-2 min-w-0 overflow-hidden ml-1">
                <TabIcon icon={Home} to="/" />

                {canEdit && (
                    <TabIcon icon={Users} to="/players" />
                )}

                <TabIcon icon={BookDashed} to="/cards" />
                <TabIcon icon={Wand2} to="/generate" />
            </div>

            <div className="flex">
                <ModeToggle></ModeToggle>
            </div>
        </div>
    );
};

export default HeaderBar;

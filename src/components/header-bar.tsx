import { ModeToggle } from "@/components/mode-toggle"
import { Users, Home, Wand2, BookDashed } from "lucide-react";
import { NavLink } from "react-router-dom";

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
        <div className="w-full flex items-center w-full h-[40px] min-h-[40px] max-h-[40px] overflow-hidden">
            {/* title */}

            <div className="flex justify-center items-center h-full w-[40px] pl-1">
                <h1 className="font-bold text-left text-lg truncate" style={{ fontSize: "1.25rem" }}>LM</h1>
            </div>

            {/* Buttons container (ensures shrink behavior) */}
            <div className="flex flex-1  justify-center min-w-0 overflow-hidden">
                <TabIcon icon={Home} to="/" />

                {canEdit && (
                    <TabIcon icon={Users} to="/players" />
                )}

                <TabIcon icon={BookDashed} to="/cards" />
                <TabIcon icon={Wand2} to="/generate" />
            </div>

            <div className="flex items-center h-full w-[40px]  ">

                <ModeToggle></ModeToggle>

            </div>
        </div>
    );
};

export default HeaderBar;

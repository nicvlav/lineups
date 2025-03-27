import { useState, useEffect } from "react";
import { usePlayers } from "@/data/players-provider"
import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { Users, Wand2, Trash2, Share } from "lucide-react";
import { encodeStateToURL } from "@/data/state-manager";
import PlayerTable from "@/components/dialogs/player-table";
import TeamGenerator from "@/components/dialogs/team-generator";
// import AutoTeamSelector from "../global/AutoTeamSelector.jsx";

interface HeaderBarProps {
    iconSize: number;
    showIconText: boolean;
}

const HeaderBar: React.FC<HeaderBarProps> = ({ iconSize, showIconText }) => {
    const { clearGame, gamePlayers } = usePlayers();
    const [isPlayerModalOpen, setPlayerModalOpen] = useState(false);
    const [isAutoTeamModalOpen, setAutoTeamModalOpen] = useState(false);

    const handleShare = () => {
        const shareUrl = encodeStateToURL(gamePlayers);
        navigator.clipboard.writeText(shareUrl).then(() => alert("Shareable link copied!"));
    };

    useEffect(() => {
        if (isAutoTeamModalOpen) { setAutoTeamModalOpen(false); }
    }, [gamePlayers]);

    return (
        <div className="w-full flex items-center justify-between h-[60px] min-h-[60px] max-h-[60px] overflow-hidden">
            {/* Sidebar button and title */}
            <div className="flex items-center space-x-3 flex-shrink-0 min-w-[50px]">
                <h1 className="font-bold text-lg truncate" style={{ fontSize: "1.25rem" }}>LM</h1>
            </div>

            {/* Buttons container (ensures shrink behavior) */}
            <div className="flex flex-1 justify-end space-x-2 min-w-0 overflow-hidden ml-1">
                <Button variant="secondary"
                    onClick={() => setPlayerModalOpen(true)}>
                    <Users size={iconSize} style={{ marginRight: '4px' }} />
                    {showIconText && (
                        <span>Players</span>
                    )}
                </Button>
                <Button variant="secondary"
                    onClick={() => setAutoTeamModalOpen(true)}>
                    <Wand2 size={iconSize} style={{ marginRight: '4px' }} />
                    {showIconText && (
                        <span>Generate</span>
                    )}
                </Button>

                <Button variant="secondary"
                    onClick={handleShare}>
                    <Share size={iconSize} style={{ marginRight: '4px' }} />
                    {showIconText && (
                        <span>Share</span>
                    )}
                </Button>

                <Button variant="secondary"
                    style={{ color: 'red' }} onClick={clearGame}>
                    <Trash2 size={iconSize} style={{ marginRight: '4px' }} />
                    {showIconText && (
                        <span>Clear</span>
                    )}
                </Button>
                <ModeToggle></ModeToggle>
            </div>

            {/* Player Attributes Modal */}
            <PlayerTable isOpen={isPlayerModalOpen} onClose={() => setPlayerModalOpen(false)} />

            {/* Team Generator Modal */}
            <TeamGenerator isOpen={isAutoTeamModalOpen} onClose={() => setAutoTeamModalOpen(false)} />
        </div>
    );
};

export default HeaderBar;


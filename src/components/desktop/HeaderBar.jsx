import React, { useState, useContext, useEffect } from "react";
import { PlayersContext } from "../../utility/PlayersContext.jsx";
import PlayerTable from "../global/PlayerTable.jsx";
import AutoTeamSelector from "../global/AutoTeamSelector.jsx";
import Modal from "../global/Modal.jsx"; // Import the new Modal component
import { encodeStateToURL } from "../../utility/StateManager.jsx";
import { Menu, Users, Wand2, Trash2, Share } from "lucide-react";

const HeaderBar = ({ toggleSidebar }) => {
    const { clearGame, players } = useContext(PlayersContext);
    const [isPlayerModalOpen, setPlayerModalOpen] = useState(false);
    const [isAutoTeamModalOpen, setAutoTeamModalOpen] = useState(false);

    const handleShare = () => {
        const shareUrl = encodeStateToURL(players);
        navigator.clipboard.writeText(shareUrl).then(() => alert("Shareable link copied!"));
    };

    useEffect(() => {
        if (isAutoTeamModalOpen) { setAutoTeamModalOpen(false); }
    }, [players]);

    return (
        <header className="w-full bg-gray-800 text-white p-4 flex items-center justify-between shadow-md h-[60px] min-h-[60px] max-h-[60px] overflow-hidden">
            {/* Sidebar button and title */}
            <div className="flex items-center space-x-3 flex-shrink-0 min-w-[50px]">
                <button onClick={toggleSidebar} className="text-white p-2 flex-shrink-0">
                    <Menu size={28} />
                </button>
                <h1 className="font-bold text-lg truncate" style={{ fontSize: "1.25rem" }}>LM</h1>
            </div>

            {/* Buttons container (ensures shrink behavior) */}
            <div className="flex flex-1 justify-end space-x-2 min-w-0 overflow-hidden ml-2">
                <button className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg shadow-md flex-shrink align-middle text-xs sm:text-sm md:text-base truncate flex items-center py-2 px-3 border border-gray-300 cursor-pointer"
                    onClick={() => setPlayerModalOpen(true)}>
                    <Users size={16} style={{ marginRight: '4px' }} />
                    <span>Players</span>
                </button>
                <button className="bg-green-600 hover:bg-green-500 text-white p-2 rounded-lg shadow-md flex-shrink text-xs sm:text-sm md:text-base truncate flex items-center py-2 px-3 border border-gray-300 cursor-pointer"
                    onClick={() => setAutoTeamModalOpen(true)}>
                    <Wand2 size={16} style={{ marginRight: '4px' }} />
                    <span>Generate</span>
                </button>

                <button className="bg-red-500 text-white hover:text-red-500 p-2 rounded-lg shadow-md flex-shrink text-xs sm:text-sm md:text-base truncate flex items-center py-2 px-3 border border-gray-300 cursor-pointer"
                    onClick={handleShare}>
                    <Share size={16} style={{ marginRight: '4px' }} />
                    <span>Share</span>
                </button>

                <button className="bg-red-500 text-white hover:text-red-500 p-2 rounded-lg shadow-md flex-shrink text-xs sm:text-sm md:text-base truncate flex items-center py-2 px-3 border border-gray-300 cursor-pointer"
                    style={{ color: 'red' }} onClick={clearGame}>
                    <Trash2 size={16} style={{ marginRight: '4px' }} />
                    <span>Clear</span>
                </button>
            </div>

            {/* Player Attributes Modal */}
            <Modal title="Player Attributes" isOpen={isPlayerModalOpen} onClose={() => setPlayerModalOpen(false)}>
                <PlayerTable />
            </Modal>

            {/* Team Generator Modal */}
            <Modal title="Team Generator" isOpen={isAutoTeamModalOpen} onClose={() => setAutoTeamModalOpen(false)}>
                <AutoTeamSelector />
            </Modal>
        </header>
    );
};

export default HeaderBar;


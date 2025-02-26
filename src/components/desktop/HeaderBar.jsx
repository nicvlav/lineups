import React, { useState, useContext, useEffect } from "react";
import { Menu } from "lucide-react";
import { PlayersContext } from "../../utility/PlayersContext.jsx";
import PlayerTable from "../global/PlayerTable.jsx";
import AutoTeamSelector from "../global/AutoTeamSelector.jsx";
import ShareButton from "../global/ShareButton.jsx";
import Modal from "../global/Modal.jsx"; // Import the new Modal component

const HeaderBar = ({ toggleSidebar }) => {
    const { clearGame, players } = useContext(PlayersContext);
    const [isPlayerModalOpen, setPlayerModalOpen] = useState(false);
    const [isAutoTeamModalOpen, setAutoTeamModalOpen] = useState(false);

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
                <button className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg shadow-md flex-shrink text-xs sm:text-sm md:text-base truncate"
                    onClick={() => setPlayerModalOpen(true)}>
                    Players
                </button>
                <button className="bg-green-600 hover:bg-green-500 text-white p-2 rounded-lg shadow-md flex-shrink text-xs sm:text-sm md:text-base truncate"
                    onClick={() => setAutoTeamModalOpen(true)}>
                    Generate
                </button>
                <ShareButton className="bg-yellow-600 hover:bg-yellow-500 text-white p-2 rounded-lg shadow-md flex-shrink text-xs sm:text-sm md:text-base truncate" />
                <button className="bg-red-600 hover:bg-red-500 text-white p-2 rounded-lg shadow-md flex-shrink text-xs sm:text-sm md:text-base truncate"
                    onClick={clearGame}>
                    Clear
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


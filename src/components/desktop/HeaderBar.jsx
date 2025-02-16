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
        <header className="w-full bg-gray-800 text-white p-4 flex items-center justify-between shadow-md">
            <div className="flex items-center space-x-3">
                <button onClick={toggleSidebar} className="text-white p-2">
                    <Menu size={28} />
                </button>
                <h1 className="font-bold" style={{ fontSize: "1.75rem" }}>Lineup Manager</h1>
            </div>

            <div className="flex space-x-4">
                <button className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-lg shadow-md"
                    onClick={() => setPlayerModalOpen(true)}>
                    Players
                </button>
                <button className="bg-green-600 hover:bg-green-500 text-white p-3 rounded-lg shadow-md"
                    onClick={() => setAutoTeamModalOpen(true)}>
                    Generate
                </button>
                <button className="bg-red-600 hover:bg-red-500 text-white p-3 rounded-lg shadow-md"
                    onClick={clearGame}>
                    Clear Game
                </button>
                <ShareButton className="bg-yellow-600 hover:bg-yellow-500 text-white p-3 rounded-lg shadow-md" />
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

import React, { useState, useEffect, useContext } from "react";
import PlayerTable from "../PlayerTable";
import AutoTeamSelector from "../AutoTeamSelector";
import ShareButton from "../ShareButton";
import Modal from "../Modal"; // Import the new Modal component
import { PlayersContext } from "../../utility/PlayersContext.jsx";

const MobileSidebar = ({ className }) => {
    const { players } = useContext(PlayersContext);
    const [isPlayerModalOpen, setPlayerModalOpen] = useState(false);
    const [isAutoTeamModalOpen, setAutoTeamModalOpen] = useState(false);

    useEffect(() => {
        if (isAutoTeamModalOpen) { setAutoTeamModalOpen(false); }
    }, [players]);

    return (
        <div className={`h-full flex flex-col gap-4 bg-gray-900 p-4 rounded-lg shadow-lg ${className}`}>
            {/* Content here */}

            <div className="flex flex-col gap-8 ">
                <button className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-lg shadow-md"
                    onClick={() => setPlayerModalOpen(true)}>
                    Players
                </button>
                <button className="bg-green-600 hover:bg-green-500 text-white p-3 rounded-lg shadow-md"
                    onClick={() => setAutoTeamModalOpen(true)}>
                    Generate
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

        </div>
    );
};


export default MobileSidebar;

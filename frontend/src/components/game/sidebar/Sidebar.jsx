import React, { useState, useContext } from "react";
import PlayerList from "./PlayerList";
import FormationSelector from "./FormationSelector";
import { Drawer } from "antd";
import PlayerTable from "./PlayerTable";
import AutoTeamSelector from "./AutoTeamSelector"; // The AI-based team generation drawer
import ShareButton from "./ShareButton"; // The AI-based team generation drawer
import { PlayersContext } from "../../global/PlayersContext.jsx";

const Sidebar = () => {
    const { clearGame } = useContext(PlayersContext);
    const [isPlayerDrawerOpen, setPlayerDrawerOpen] = useState(false);
    const [isAutoTeamDrawerOpen, setAutoTeamDrawerOpen] = useState(false);

    return (
        <div className="w-[300px] h-full p-4 bg-gray-900 rounded-lg shadow-lg flex flex-col gap-4">
            {/* Auto Team Generator Button */}
            <ShareButton
                className="mt-2 w-full bg-green-600 hover:bg-green-500 text-white p-3 rounded-lg shadow-md transition duration-300"
                onClick={() => setAutoTeamDrawerOpen(true)}
            />
            {/* Auto Team Generator Button */}
            <button
                className="mt-2 w-full bg-green-600 hover:bg-green-500 text-white p-3 rounded-lg shadow-md transition duration-300"
                onClick={() => clearGame()}
            >
                Clear Game
            </button>

            {/* Formation Selector */}
            <div className="p-4 bg-gray-800 rounded-lg shadow-md">
                <FormationSelector />
            </div>

            {/* Player List */}
            <div className="p-4 bg-gray-800 rounded-lg shadow-md">
                <PlayerList />
            </div>

            {/* Manage Players Button */}
            <button
                className="mt-4 w-full bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-lg shadow-md transition duration-300"
                onClick={() => setPlayerDrawerOpen(true)}
            >
                Manage Players
            </button>

            {/* Auto Team Generator Button */}
            <button
                className="mt-2 w-full bg-green-600 hover:bg-green-500 text-white p-3 rounded-lg shadow-md transition duration-300"
                onClick={() => setAutoTeamDrawerOpen(true)}
            >
                Auto Create Team
            </button>


            {/* Reusable Drawer Component */}
            <CustomDrawer
                title="Player Attributes"
                isOpen={isPlayerDrawerOpen}
                onClose={() => setPlayerDrawerOpen(false)}
            >
                <PlayerTable />
            </CustomDrawer>

            <CustomDrawer
                title="AI Team Generator"
                isOpen={isAutoTeamDrawerOpen}
                onClose={() => setAutoTeamDrawerOpen(false)}
            >
                <AutoTeamSelector />
            </CustomDrawer>
        </div>
    );
};

// Reusable Drawer Component
const CustomDrawer = ({ title, isOpen, onClose, children }) => {
    return (
        <Drawer
            title={<span className="text-lg font-semibold">{title}</span>}
            placement="right"
            closable
            onClose={onClose}
            open={isOpen}
            width={600}
            styles={{ background: "#000", color: "white" }}
        >
            <div className="p-6">{children}</div>
        </Drawer>
    );
};

export default Sidebar;

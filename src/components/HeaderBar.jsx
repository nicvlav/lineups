import React, { useState, useContext, useEffect } from "react";
import { Menu } from "lucide-react"; // Icon library for the burger menu
import { PlayersContext } from "../utility/PlayersContext.jsx";
import { Drawer } from "antd";
import PlayerTable from "./PlayerTable";
import AutoTeamSelector from "./AutoTeamSelector"; // The AI-based team generation drawer
import ShareButton from "./ShareButton"; // The AI-based team generation drawer

const HeaderBar = ({ toggleSidebar }) => {
    const { clearGame, players } = useContext(PlayersContext);
    const [isPlayerDrawerOpen, setPlayerDrawerOpen] = useState(false);
    const [isAutoTeamDrawerOpen, setAutoTeamDrawerOpen] = useState(false);

    useEffect(() => {
        if (isAutoTeamDrawerOpen) { setAutoTeamDrawerOpen(false); }
    }, [players]);

    return (
        <header className="w-full bg-gray-800 text-white p-4 flex items-center justify-between shadow-md">
            {/* Left: Menu Icon & Title */}
            <div className="flex items-center space-x-3">
                <button onClick={toggleSidebar} className="text-white p-2">
                    <Menu size={28} />
                </button>
                <h1 className="font-bold" style={{ fontSize: "1.75rem" }}>Lineup Manager</h1>
            </div>

            {/* Right: Controls */}
            <div className="flex space-x-4">
                <button className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-lg shadow-md flex-shrink-0 min-h-[40px]"
                    onClick={() => setPlayerDrawerOpen(true)}>
                    Players
                </button>
                <button className="bg-green-600 hover:bg-green-500 text-white p-3 rounded-lg shadow-md flex-shrink-0 min-h-[40px]"
                    onClick={() => setAutoTeamDrawerOpen(true)}>
                    Generate
                </button>
                <button className="bg-green-600 hover:bg-green-500 text-white p-3 rounded-lg shadow-md flex-shrink-0 min-h-[40px]"
                    onClick={() => clearGame()}>
                    Clear Game
                </button>
                <ShareButton className="bg-green-600 hover:bg-green-500 text-white p-3 rounded-lg shadow-md flex-shrink-0 min-h-[40px]" />
            </div>

            <CustomDrawer title="Player Attributes" isOpen={isPlayerDrawerOpen} onClose={() => setPlayerDrawerOpen(false)}>
                <PlayerTable />
            </CustomDrawer>

            <CustomDrawer title="Team Generator" isOpen={isAutoTeamDrawerOpen} onClose={() => setAutoTeamDrawerOpen(false)}>
                <AutoTeamSelector />
            </CustomDrawer>
        </header>
    );
};

// Reusable Drawer Component
const CustomDrawer = ({ title, isOpen, onClose, children }) => {
    return (
        <Drawer
            title={<span className="text-lg font-semibold">{title}</span>}
            placement="bottom"
            closable
            onClose={onClose}
            open={isOpen}
            height={'80vh'}
            styles={{ background: "#000", color: "white", close: { color: "#ff5733", border: "none" } }}
        >
            <div className="p-6">{children}</div>
        </Drawer>
    );
};

export default HeaderBar;

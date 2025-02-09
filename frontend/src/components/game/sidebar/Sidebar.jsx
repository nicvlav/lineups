import React, { useState } from "react";
import PlayerList from "./PlayerList";
import FormationSelector from "./FormationSelector";
import { Button, Drawer } from "antd";
import PlayerTable from "./PlayerTable";

const Sidebar = () => {
    const [isDrawerOpen, setDrawerOpen] = useState(false);

    return (
        <div className="w-[300px] h-full p-4 bg-gray-900 rounded-lg shadow-lg flex flex-col gap-4">
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
                onClick={() => setDrawerOpen(true)}
            >
                Manage Players
            </button>

            {/* Drawer for PlayerTable */}
            <Drawer
                className="bg-black"
                title={<span className=" text-lg font-semibold">Player Attributes</span>}
                placement="right"
                closable
                onClose={() => setDrawerOpen(false)}
                open={isDrawerOpen}
                width={600}
                styles={{ background: "#000000", color: "black" }}
            >
                <div className="p-6">
                    <PlayerTable />
                </div>
            </Drawer>
        </div>
    );
};

export default Sidebar;

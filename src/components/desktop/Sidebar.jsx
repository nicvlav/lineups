import React from "react";
import PlayerList from "./PlayerList";
import FormationSelector from "../global/FormationSelector";

const Sidebar = ({ className }) => {

    return (
        <div className={`h-full flex flex-col gap-4 bg-gray-900 p-4 rounded-lg shadow-lg ${className}`}>
      {/* Content here */}

            <div className="p-4 bg-gray-900 rounded-lg shadow-md flex-shrink-0">
                <FormationSelector />
            </div>

            {/* Player List - This will expand to fill remaining space */}
            <div className="p-0 bg-gray-900 rounded-lg shadow-md flex-grow overflow-y-auto">
                <PlayerList />
            </div>


        </div>
    );
};


export default Sidebar;

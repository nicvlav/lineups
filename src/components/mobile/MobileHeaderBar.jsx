import React, { useContext } from "react";
import { Menu } from "lucide-react";
import { PlayersContext } from "../../utility/PlayersContext.jsx";
import FormationSelector from "../global/FormationSelector.jsx";

const MobileHeaderBar = ({ toggleSidebar }) => {
    const { clearGame } = useContext(PlayersContext);

    return (
        <header className="w-full bg-gray-800 text-white p-4 flex items-center justify-between shadow-md h-[60px] min-h-[60px] max-h-[60px] overflow-hidden">
            {/* Left Side: Burger Menu and Title */}
            <div className="flex items-center space-x-3 flex-shrink-0 min-w-[50px]">
                <button onClick={toggleSidebar} className="text-white p-2 flex-shrink-0">
                    <Menu size={28} />
                </button>
                <h1 className="font-bold text-lg truncate" style={{ fontSize: "1.25rem" }}>LM</h1>
            </div>

            {/* Right Side: Actions */}
            <div className="flex flex-1 justify-end space-x-2 min-w-0 overflow-hidden">
                <div className="p-2 bg-gray-800 text-white">
                    <FormationSelector />
                </div>
                <button className="bg-red-600 hover:bg-red-500 text-white p-2 rounded-lg shadow-md flex-shrink text-xs sm:text-sm md:text-base truncate"
                    onClick={clearGame}>
                    Clear
                </button>
            </div>
        </header>
    );
};

export default MobileHeaderBar;

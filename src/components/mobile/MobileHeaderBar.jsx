import React, { useContext } from "react";
import { Menu } from "lucide-react";
import { PlayersContext } from "../../utility/PlayersContext.jsx";
import FormationSelector from "../sidebar/FormationSelector";

const MobileHeaderBar = ({ toggleSidebar }) => {
    const { clearGame } = useContext(PlayersContext);

    return (
        <header className="w-full bg-gray-800 text-white p-4 flex items-center justify-between shadow-md">
            {/* Left Side: Burger Menu */}
            <div className="flex">
                <button onClick={toggleSidebar} className="text-white p-2">
                    <Menu size={20} />
                </button>
                <h1 className="font-bold p-4" style={{ fontSize: "1.25rem" }}>LM</h1>
            </div>

            {/* Right Side: Actions */}
            <div className="flex">
                <div className="flex-grow p-3 text-center">
                    <FormationSelector />
                </div>

                <button className="bg-red-600 hover:bg-red-500 text-white p-2 rounded-lg shadow-md"
                    onClick={clearGame}>
                    Clear
                </button>
            </div>
        </header>
    );
};

export default MobileHeaderBar;

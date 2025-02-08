import React from "react";
import PlayerList from "./PlayerList";
import FormationSelector from ".//FormationSelector"; // Create this if not done yet

const Sidebar = () => {
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                width: "300px", // Adjust as needed
                padding: "8px",
                gap: "12px",
                backgroundColor: "#8B6F57",
                height: "100%",
            }}
        >
            <FormationSelector />
            <PlayerList />
        </div>
    );
};

export default Sidebar;

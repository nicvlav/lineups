import React, { useContext } from "react";
import { PlayersContext } from "../global/PlayersContext.jsx";

const FormationSelector = () => {
    const { formations, selectedFormation, applyFormation } = useContext(PlayersContext);

    const handleChange = (event) => {
        applyFormation(event.target.value);
    };

    // Group formations by num_players
    const groupedFormations = formations.reduce((groups, formation) => {
        if (!groups[formation.num_players]) {
            groups[formation.num_players] = [];
        }
        groups[formation.num_players].push(formation);
        return groups;
    }, {});

    return (
        <div className="relative bg-quaternary">
            <label htmlFor="formation-select">Formation:</label>
            <select className="relative bg-quaternary" id="formation-select" value={selectedFormation} onChange={handleChange}>
                <option value="custom">Custom</option>
                {Object.keys(groupedFormations)
                    .sort((a, b) => a - b) // Ensure sorted order (e.g., 5, 7, 11 players)
                    .map((numPlayers) => (
                        <optgroup key={numPlayers} label={`${numPlayers} Players`}>
                            {groupedFormations[numPlayers].map((formation) => (
                                <option key={formation.id} value={formation.id}>
                                    {formation.name}
                                </option>
                            ))}
                        </optgroup>
                    ))}
            </select>
        </div>
    );
};

export default FormationSelector;

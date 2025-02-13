import React, { useRef, useContext } from "react";
import { PlayersContext } from "../global/PlayersContext.jsx";
import formations from "../global/Formations"

const FormationSelector = () => {
    const selectRef = useRef(null);
    const { applyFormation } = useContext(PlayersContext);

    const handleChange = (event) => {
        applyFormation(event.target.value);
        selectRef.current.value = "";
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
        <div className="relative">
            <select
                className="relative bg-gray-900"
                id="formation-select"
                onChange={handleChange}
                ref={selectRef} // Attach ref to select element
            >
                <option value="">Change Formation</option> {/* Option for no selection */}
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

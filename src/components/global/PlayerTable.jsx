import { useContext, useState } from "react";
import { PlayersContext } from "../../utility/PlayersContext";
import { Table, InputNumber } from "antd";
import { FaTimes } from "react-icons/fa";

const PlayerTable = () => {
    const { players, updatePlayerAttributes, addPlayer, deletePlayer } = useContext(PlayersContext);
    const [newPlayerName, setNewPlayerName] = useState("");
    const [editingPlayer, setEditingPlayer] = useState(null);
    const [editedName, setEditedName] = useState("");
    const [sortingMode, setSortingMode] = useState("alphabetical");
    const [searchQuery, setSearchQuery] = useState("");

    const handleAttributeChange = (uid, field, value) => {
        updatePlayerAttributes(uid, { [field]: value });
    };

    const handleAddPlayer = () => {
        if (newPlayerName.trim() !== "") {
            addPlayer(newPlayerName.trim());
            setNewPlayerName("");
        }
    };

    const handleEditName = (uid, name) => {
        setEditingPlayer(uid);
        setEditedName(name);
    };

    const handleSaveName = (uid) => {
        if (editedName.trim() !== "") {
            handleAttributeChange(uid, "name", editedName.trim());
        }
        setEditingPlayer(null);
    };

    const getNonTemps = () => {
        if (!players || !Array.isArray(players)) {
            console.warn("Invalid players format:", players);
            return [];
        }
        return players.filter(player => player.temp_formation !== true);
    };

    const nonTempPlayers = getNonTemps();

    // Filter players based on the search query
    const filteredPlayers = nonTempPlayers.filter(player =>
        player.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort players based on the selected sorting mode.
    const sortedPlayers = [...filteredPlayers].sort((a, b) => {
        switch (sortingMode) {
            case "alphabetical":
                return a.name.localeCompare(b.name);
            case "attack":
                return b.attack - a.attack;
            case "defense":
                return b.defense - a.defense;
            case "athleticism":
                return b.athleticism - a.athleticism;
            default:
                return 0;
        }
    });

    const columns = [
        {
            title: "Player",
            dataIndex: "name",
            key: "name",
            render: (text, record) => (
                <div className="flex gap-2">
                    <button
                        onClick={() => deletePlayer(record.id)}
                        className="text-red-500 hover:text-red-700 flex items-center mt-2"
                    >
                        <FaTimes size={16} />
                    </button>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3">
                        {editingPlayer === record.id ? (
                            <input
                                type="text"
                                value={editedName}
                                onChange={(e) => setEditedName(e.target.value)}
                                onBlur={() => handleSaveName(record.id)}
                                onKeyDown={(e) => e.key === "Enter" && handleSaveName(record.id)}
                                className="p-1 text-white bg-gray-800 rounded w-full focus:outline-none"
                                autoFocus
                            />
                        ) : (
                            <span
                                className="font-medium text-white truncate cursor-pointer max-w-[150px]"
                                onClick={() => handleEditName(record.id, text)}
                                title={text}
                            >
                                {text}
                            </span>
                        )}
                    </div>
                </div>
            ),
        },
        {
            title: "Attributes",
            key: "attributes",
            width: "40%",
            render: (_, record) => (
                <div className="flex flex-wrap gap-2">
                    <div className="flex flex-col items-center">
                        <span className="text-xs text-gray-400">Attack</span>
                        <InputNumber
                            min={1}
                            max={10}
                            value={record.attack}
                            onChange={(value) => handleAttributeChange(record.id, "attack", value)}
                            className="w-10 border-none bg-gray-700 text-white text-center rounded"
                        />
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-xs text-gray-400">Defense</span>
                        <InputNumber
                            min={1}
                            max={10}
                            value={record.defense}
                            onChange={(value) => handleAttributeChange(record.id, "defense", value)}
                            className="w-10 border-none bg-gray-700 text-white text-center rounded"
                        />
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-xs text-gray-400">Athleticism</span>
                        <InputNumber
                            min={1}
                            max={10}
                            value={record.athleticism}
                            onChange={(value) => handleAttributeChange(record.id, "athleticism", value)}
                            className="w-10 border-none bg-gray-700 text-white text-center rounded"
                        />
                    </div>
                </div>
            ),
        },
    ];

    return (
        <div className="p-2 bg-gray-900 rounded-xl shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="flex flex-col space-y-4">
                <div className="flex items-center mb-4 space-x-2">
                    <input
                        type="text"
                        value={newPlayerName}
                        onChange={(e) => setNewPlayerName(e.target.value)}
                        placeholder="Enter player name"
                        className="p-2 text-white bg-gray-800 rounded w-full focus:outline-none"
                    />
                    <button
                        onClick={handleAddPlayer}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Add
                    </button>
                </div>
                <div className="flex items-center mb-4 space-x-2 w-full">
                    <input
                        type="text"
                        placeholder="Search players..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="p-2 flex-[1] min-w-0 bg-gray-800 text-white rounded focus:outline-none"
                    />
                    <select
                        value={sortingMode}
                        onChange={(e) => setSortingMode(e.target.value)}
                        className="p-2 flex-[1] min-w-0 bg-gray-800 text-white rounded focus:outline-none max-w-[100px]"
                    >
                        <option value="alphabetical">(A-Z)</option>
                        <option value="attack">Attack</option>
                        <option value="defense">Defense</option>
                        <option value="athleticism">Athleticism</option>
                    </select>
                </div>

                <Table
                    dataSource={sortedPlayers}
                    columns={columns}
                    rowKey="id"
                    pagination={{ pageSize: 5 }}
                    className="bg-gray-800 rounded-lg"
                />
            </div>
        </div>
    );
};

export default PlayerTable;

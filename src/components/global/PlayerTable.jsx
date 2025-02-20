import { useContext, useState } from "react";
import { PlayersContext } from "../../utility/PlayersContext";
import { Table, InputNumber } from "antd";
import { FaTimes } from "react-icons/fa";

const PlayerTable = () => {
    const { players, updatePlayerAttributes, addPlayer, deletePlayer } = useContext(PlayersContext);
    const [newPlayerName, setNewPlayerName] = useState("");
    const [editingPlayer, setEditingPlayer] = useState(null);
    const [editedName, setEditedName] = useState("");

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

    const columns = [
        {
            title: "Player",
            dataIndex: "name",
            key: "name",
            width: 200,
            render: (text, record) => (
                <div className="flex items-center space-x-3">
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
                            className="font-medium text-white truncate max-w-[180px] cursor-pointer"
                            onClick={() => handleEditName(record.id, text)}
                            title={text}
                        >
                            {text}
                        </span>
                    )}
                </div>
            ),
        },
        {
            title: "Attack",
            dataIndex: "attack",
            key: "attack",
            render: (text, record) => (
                <InputNumber
                    min={1}
                    max={10}
                    value={record.attack}
                    onChange={(value) => handleAttributeChange(record.id, "attack", value)}
                    className="w-16 border-none bg-gray-700 text-white text-center rounded"
                />
            ),
        },
        {
            title: "Defense",
            dataIndex: "defense",
            key: "defense",
            render: (text, record) => (
                <InputNumber
                    min={1}
                    max={10}
                    value={record.defense}
                    onChange={(value) => handleAttributeChange(record.id, "defense", value)}
                    className="w-16 border-none bg-gray-700 text-white text-center rounded"
                />
            ),
        },
        {
            title: "Athleticism",
            dataIndex: "athleticism",
            key: "athleticism",
            render: (text, record) => (
                <InputNumber
                    min={1}
                    max={10}
                    value={record.athleticism}
                    onChange={(value) => handleAttributeChange(record.id, "athleticism", value)}
                    className="w-16 border-none bg-gray-700 text-white text-center rounded"
                />
            ),
        },
        {
            title: "Remove",
            key: "remove",
            render: (_, record) => (
                <button onClick={() => deletePlayer(record.id)} className="text-red-500 hover:text-red-700">
                    <FaTimes size={16} />
                </button>
            ),
        },
    ];

    return (
        <div className="p-6 bg-gray-900 rounded-xl shadow-xl max-h-[65vh] overflow-y-auto">
            <h2 className="text-2xl font-semibold text-white text-center mb-4">Player Attributes</h2>
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
            <Table
                dataSource={nonTempPlayers}
                columns={columns}
                rowKey="id"
                pagination={{ pageSize: 5 }}
                className="bg-gray-800 rounded-lg"
            />
        </div>
    );
};

export default PlayerTable;

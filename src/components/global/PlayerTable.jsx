import { Table, InputNumber } from "antd";
import { useContext } from "react";
import { PlayersContext } from "../../utility/PlayersContext";

const PlayerTable = () => {
    const { players, updatePlayerAttributes } = useContext(PlayersContext);

    const handleAttributeChange = (uid, field, value) => {
        updatePlayerAttributes(uid, { [field]: value });
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
            render: (text, record) => (
                <div className="flex items-center space-x-3">
                    <span className="font-medium text-white">{text}</span>
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
    ];

    return (
        <div className="p-6 bg-gray-900 rounded-xl shadow-xl  max-h-[65vh] overflow-y-auto">
            <h2 className="text-2xl font-semibold text-white text-center mb-4">Player Attributes</h2>
            <Table
                dataSource={nonTempPlayers}
                columns={columns}
                rowKey="uid"
                pagination={{ pageSize: 5 }}
                className="bg-gray-800 rounded-lg"
            />
        </div>
    );
};

export default PlayerTable;

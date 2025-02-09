import { Table, InputNumber } from "antd";
import { useContext } from "react";
import { PlayersContext } from "../../global/PlayersContext";

const PlayerTable = () => {
    const { players, updatePlayerAttributes } = useContext(PlayersContext);

    const handleAttributeChange = (uid, field, value) => {
        updatePlayerAttributes(uid, { [field]: value });
    };

    const columns = [
        {
            title: "Player",
            dataIndex: "name",
            key: "name",
            render: (text, record) => (
                <div className="flex items-center space-x-3">
                    <span className="font-medium text-black">{text}</span>
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
                    onChange={(value) => handleAttributeChange(record.uid, "attack", value)}
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
                    onChange={(value) => handleAttributeChange(record.uid, "defense", value)}
                    className="w-16 border-none bg-gray-700 text-black text-center rounded"
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
                    onChange={(value) => handleAttributeChange(record.uid, "athleticism", value)}
                    className="w-16 border-none bg-gray-700 text-black text-center rounded"
                />
            ),
        },
    ];

    return (
        <div className="p-6 bg-gray-900 rounded-xl shadow-xl">
            <h2 className="text-2xl font-semibold text-white text-center mb-4">Player Attributes</h2>
            <Table
                dataSource={players}
                columns={columns}
                rowKey="uid"
                pagination={{ pageSize: 8 }}
                className="bg-gray-800 rounded-lg"
            />
        </div>
    );
};

export default PlayerTable;

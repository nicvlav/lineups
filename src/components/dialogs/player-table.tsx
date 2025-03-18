import { useState } from "react";
import { usePlayers } from "@/data/players-provider";
import { List, ChartPie } from "lucide-react";
import CompactPlayerTable from "@/components/dialogs/compact-player-table";
import PlayerCharts from "@/components/dialogs/player-charts";
import Modal from "@/components/dialogs/modal";
interface PlayerTableProps {
    isOpen: boolean;
    onClose: () => void;
}

const PlayerTable: React.FC<PlayerTableProps> = ({ isOpen, onClose }) => {
    const { players, updatePlayerAttributes, addPlayer, deletePlayer } = usePlayers();
    const [activeTab, setActiveTab] = useState("chart");

    const [selectedPlayer1, setSelectedPlayer1] = useState<string | null>(null);
    const [selectedPlayer2, setSelectedPlayer2] = useState<string | null>(null);

    return (
        <Modal title="Player Attributes" isOpen={isOpen} onClose={onClose}>
            <div className="flex gap-2 w-full max-h-[40px]">
                <button
                    className={`flex-1 flex items-center justify-center p-2 rounded-lg border border-gray-200 transition-all duration-200 ${activeTab === "chart" ? "bg-blue-100 text-blue-600 shadow-sm" : ""}`}
                    onClick={() => setActiveTab("chart")}
                >
                    <ChartPie size={16} className="mr-2" />
                    <span>Charts</span>
                </button>
                <button
                    className={`flex-1 flex items-center justify-center p-2 rounded-lg border border-gray-200 transition-all duration-200 ${activeTab === "compact" ? "bg-blue-100 text-blue-600 shadow-sm" : ""}`}
                    onClick={() => setActiveTab("compact")}
                >
                    <List size={16} className="mr-2" />
                    <span>Data</span>
                </button>
            </div>

            {/* Main Content Area - Flexbox Container */}
            <div className="flex-1 flex flex-col  ">
                {activeTab === "chart" ? (
                    <PlayerCharts
                        players={players}
                        selectedPlayer1={selectedPlayer1}
                        setSelectedPlayer1={setSelectedPlayer1}
                        selectedPlayer2={selectedPlayer2}
                        setSelectedPlayer2={setSelectedPlayer2}
                        updatePlayerAttributes={updatePlayerAttributes}
                    />
                ) : (
                    <CompactPlayerTable
                        players={players}
                        updatePlayerAttributes={updatePlayerAttributes}
                        addPlayer={addPlayer}
                        deletePlayer={deletePlayer}
                    />
                )}
            </div>
        </Modal>
    );
};

export default PlayerTable;

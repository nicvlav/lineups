import { useState } from "react";
import { usePlayers } from "@/data/players-provider";
import { List, ChartPie } from "lucide-react";
import CompactPlayerTable from "@/components/dialogs/compact-player-table";
import PlayerCharts from "@/components/dialogs/player-charts";

interface TableProps {
    isCompact: boolean;
}

const PlayerTable: React.FC<TableProps> = ({ isCompact }) => {
    const { players, updatePlayerAttributes, addPlayer, deletePlayer } = usePlayers();
    const [activeTab, setActiveTab] = useState("chart");

    const [selectedPlayer1, setSelectedPlayer1] = useState<string | null>(null);
    const [selectedPlayer2, setSelectedPlayer2] = useState<string | null>(null);

    return (
        <div className="flex-1 min-h-0 flex flex-col h-full border">
            {/* Main Content Area - Flexbox Container */}
            {isCompact && (
                <div className="flex-1 min-h-0 flex flex-col h-full border">
                    <div className="flex gap-2 w-full max-h-[40px]">
                        <button
                            className={`flex-1 flex items-center justify-center p-2  transition-all duration-200 ${activeTab === "compact" ? " text-blue-600 shadow-sm" : ""}`}
                            onClick={() => setActiveTab("compact")}
                        >
                            <List size={16} className="mr-2" />

                        </button>
                        <button
                            className={`flex-1 flex items-center justify-center p-2  transition-all duration-200 ${activeTab === "chart" ? " text-blue-600 shadow-sm" : ""}`}
                            onClick={() => setActiveTab("chart")}
                        >
                            <ChartPie size={16} className="mr-2" />

                        </button>
                    </div>
                    <div className="flex-1 min-h-0 flex flex-col h-full border">
                        {activeTab === "compact" ? (
                            <CompactPlayerTable
                                players={players}
                                updatePlayerAttributes={updatePlayerAttributes}
                                addPlayer={addPlayer}
                                deletePlayer={deletePlayer}
                            />
                        ) : (

                            <PlayerCharts
                                players={players}
                                selectedPlayer1={selectedPlayer1}
                                setSelectedPlayer1={setSelectedPlayer1}
                                selectedPlayer2={selectedPlayer2}
                                setSelectedPlayer2={setSelectedPlayer2}
                                updatePlayerAttributes={updatePlayerAttributes}
                            />

                        )}
                    </div>
                </div>
            )
            }

            {/* Layout for large screens (side by side) */}
            {
                !isCompact && (
                    <div className="flex flex-1 h-full gap-2">
                        <div className="flex-5">
                            <CompactPlayerTable
                                players={players}
                                updatePlayerAttributes={updatePlayerAttributes}
                                addPlayer={addPlayer}
                                deletePlayer={deletePlayer}
                            />
                        </div>
                        <div className="flex-3 max-w-[500px]">
                            <PlayerCharts
                                players={players}
                                selectedPlayer1={selectedPlayer1}
                                setSelectedPlayer1={setSelectedPlayer1}
                                selectedPlayer2={selectedPlayer2}
                                setSelectedPlayer2={setSelectedPlayer2}
                                updatePlayerAttributes={updatePlayerAttributes}
                            />
                        </div>
                    </div>
                )
            }

        </div >
    );
};

export default PlayerTable;

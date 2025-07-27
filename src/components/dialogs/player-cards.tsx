import { usePlayers } from "@/context/players-provider";
import { getZoneAverages, getTopPositions } from "@/data/player-types";
import PlayerCard from "@/components/dialogs/player-card";

interface TeamGeneratorProps {
    isCompact: boolean;
}
const PlayerCards: React.FC<TeamGeneratorProps> = ({ isCompact }) => {
    isCompact
    const { players, } = usePlayers();

    const withScores = Object.values(players).map((player) => {
        const topScores = getTopPositions(player);
        return { player, overall: Math.round(Math.max(...topScores.map((t) => t.score))), topPositions: topScores.slice(0, 3).map((t) => t.position).join(", "), averages: getZoneAverages(player) }
    }).sort((a, b) => {
        return b.overall - a.overall;
    });

    return (
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {withScores.map((item) => (

                <PlayerCard key={item.player.id} playerName={item.player.name} stats={item.player.stats} overall={item.overall} top3Positions={item.topPositions} averages={item.averages} />
            ))}
        </div>
    );
};

export default PlayerCards;

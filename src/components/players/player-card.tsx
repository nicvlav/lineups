import type React from "react";
import { useState } from "react";
import PlayerStatsModal from "@/components/players/player-stats-modal";
import { useTapHandler } from "@/hooks/use-tap-handler";
import { getStatBarColor, getTierBorderClass, getTierCssVar } from "@/lib/color-system";
import { getTopArchetypes } from "@/lib/positions/calculator";
import { getArchetypeById } from "@/types/archetypes";
import type { Player, PlayerArchetypeScores, ZoneAverages } from "@/types/players";
import type { Position } from "@/types/positions";
import type { CardViewMode } from "./player-cards";

interface PlayerCardProps {
    player: Player;
    playerName: string;
    overall: number;
    archetypeScores: PlayerArchetypeScores;
    averages: ZoneAverages;
    stats: Record<string, number>;
    viewMode: CardViewMode;
}

/** Group archetypes by position for cluster display */
function groupByPosition(archetypes: ReturnType<typeof getTopArchetypes>) {
    const groups = new Map<string, { position: Position; names: string[] }>();
    for (const a of archetypes) {
        const arch = getArchetypeById(a.archetypeId);
        if (!arch) continue;
        const existing = groups.get(a.position);
        if (existing) {
            existing.names.push(arch.name);
        } else {
            groups.set(a.position, { position: a.position as Position, names: [arch.name] });
        }
    }
    return [...groups.values()];
}

const PlayerCard: React.FC<PlayerCardProps> = ({
    player,
    playerName,
    overall,
    archetypeScores,
    averages,
    stats,
    viewMode,
}) => {
    const [open, setOpen] = useState(false);

    const tapHandlers = useTapHandler({
        onTap: () => setOpen(true),
        threshold: 10,
    });

    const overallRounded = Math.round(overall);
    const tierBorder = getTierBorderClass(overallRounded);
    const tierVar = getTierCssVar(overallRounded);

    const topArchetypes = getTopArchetypes(archetypeScores);
    const positionClusters = groupByPosition(topArchetypes);

    return (
        <>
            <div
                {...tapHandlers}
                className={`select-none flex flex-col h-full border border-border/20 border-l-[3px] ${tierBorder} rounded-lg p-3 cursor-pointer group hover:border-border/40 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg`}
                style={{
                    background: `linear-gradient(135deg, color-mix(in oklch, var(${tierVar}), transparent 94%), transparent 60%)`,
                }}
            >
                {/* Header: Name + top position badge */}
                <div className="flex items-center gap-2 mb-2">
                    {player.avatarUrl && (
                        <img
                            src={player.avatarUrl}
                            alt={playerName}
                            className="w-8 h-8 object-cover rounded-full"
                            onError={(e) => {
                                e.currentTarget.style.display = "none";
                            }}
                        />
                    )}
                    <span className="font-semibold text-sm text-foreground truncate flex-1">{playerName}</span>
                    {positionClusters[0] && (
                        <span
                            className="text-[11px] font-bold px-1.5 py-0.5 rounded shrink-0"
                            style={{
                                color: `var(${tierVar})`,
                                backgroundColor: `color-mix(in oklch, var(${tierVar}), transparent 85%)`,
                            }}
                        >
                            {positionClusters[0].position}
                        </span>
                    )}
                </div>

                {/* View: Minimal */}
                {viewMode === "minimal" && <div className="h-1" />}

                {/* View: Archetypes — position clusters */}
                {viewMode === "archetypes" && (
                    <div className="space-y-1.5 mb-1">
                        {positionClusters.map((cluster) => (
                            <div key={cluster.position} className="flex items-start gap-2 text-xs">
                                <span className="font-bold w-6 shrink-0 mt-px" style={{ color: `var(${tierVar})` }}>
                                    {cluster.position}
                                </span>
                                <span className="text-muted-foreground leading-snug">{cluster.names.join(" · ")}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* View: Face Stats — category average bars */}
                {viewMode === "face-stats" && (
                    <div className="space-y-1.5 mb-1">
                        {(
                            [
                                { label: "ATK", value: averages.attacking },
                                { label: "CRE", value: averages.creative },
                                { label: "DEF", value: averages.defending },
                                { label: "PHY", value: averages.physical },
                                { label: "MEN", value: averages.mental },
                            ] as const
                        ).map((stat) => {
                            const v = Math.round(stat.value);
                            return (
                                <div key={stat.label} className="flex items-center gap-2">
                                    <span className="text-[11px] font-medium text-muted-foreground w-6 uppercase">
                                        {stat.label}
                                    </span>
                                    <div className="flex-1 h-2 bg-muted/40 rounded-full overflow-hidden">
                                        <div
                                            className={`${getStatBarColor(v)} h-full rounded-full transition-all duration-300`}
                                            style={{ width: `${Math.min(v, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <PlayerStatsModal
                player={player}
                isOpen={open}
                onClose={() => setOpen(false)}
                overall={overall}
                archetypeScores={archetypeScores}
                averages={averages}
                stats={stats}
            />
        </>
    );
};

export default PlayerCard;

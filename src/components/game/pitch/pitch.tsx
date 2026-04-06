import { useCallback, useEffect, useRef, useState } from "react";
import PitchPlayer from "@/components/game/pitch/pitch-player";
import { usePlayers } from "@/hooks/use-players";
import { cn } from "@/lib/utils";
import type { ScoredGamePlayer } from "@/types/players";

interface PlayerContainerProps {
    team: string;
    teamPlayers: ScoredGamePlayer[];
    playerSize: number;
}

const getPlayerPosition = (
    player: ScoredGamePlayer,
    playerSize: number,
    containerWidth: number,
    containerHeight: number
) => {
    const halfSize = playerSize / 2;
    const maxWidth = containerWidth - halfSize;
    const maxHeight = containerHeight - halfSize;

    const left = player.position ? Math.max(halfSize, Math.min(player.position.x * containerWidth, maxWidth)) : 0;
    const top = player.position ? Math.max(halfSize, Math.min(player.position.y * containerHeight, maxHeight)) : 0;

    return { left, top };
};

const PlayerContainer: React.FC<PlayerContainerProps> = ({ team, teamPlayers, playerSize }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { data: players = {} } = usePlayers();
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

    const updateContainerSize = useCallback(() => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setContainerSize({ width: rect.width, height: rect.height });
        }
    }, []);

    useEffect(() => {
        updateContainerSize();
        window.addEventListener("resize", updateContainerSize);
        return () => window.removeEventListener("resize", updateContainerSize);
    }, [updateContainerSize]);

    useEffect(() => {
        const observer = new ResizeObserver(updateContainerSize);
        if (containerRef.current) {
            observer.observe(containerRef.current);
        }
        return () => {
            if (containerRef.current) {
                observer.unobserve(containerRef.current);
            }
            observer.disconnect();
        };
    }, [updateContainerSize]);

    const findPlayerName = (player: ScoredGamePlayer) => {
        if (!player.isGuest && player.id in players) {
            return players[player.id].name;
        }
        return player.name;
    };

    const isTeamA = team === "A";

    return (
        <div
            ref={containerRef}
            className={cn(
                "relative w-full h-full rounded-lg overflow-visible",
                isTeamA ? "pitch-team-a" : "pitch-team-b"
            )}
        >
            {/* Floodlight glow — subtle radial from top center */}
            <div
                className="absolute inset-0 rounded-lg pointer-events-none"
                style={{
                    background: isTeamA
                        ? "radial-gradient(ellipse 70% 50% at 50% 0%, hsl(200 80% 60%/0.08), transparent)"
                        : "radial-gradient(ellipse 70% 50% at 50% 0%, hsl(84 70% 55%/0.08), transparent)",
                }}
            />

            {/* Pitch line markings — faint geometric suggestion */}
            <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                preserveAspectRatio="none"
                aria-hidden="true"
            >
                {/* Center circle */}
                <circle
                    cx="50%"
                    cy="50%"
                    r="15%"
                    fill="none"
                    stroke="currentColor"
                    strokeOpacity={0.06}
                    strokeWidth={1}
                    className="text-foreground"
                />
                {/* Halfway line (horizontal for vertical pitch) */}
                <line
                    x1="0%"
                    y1="50%"
                    x2="100%"
                    y2="50%"
                    stroke="currentColor"
                    strokeOpacity={0.06}
                    strokeWidth={1}
                    className="text-foreground"
                />
                {/* Penalty area top */}
                <rect
                    x="20%"
                    y="0%"
                    width="60%"
                    height="18%"
                    fill="none"
                    stroke="currentColor"
                    strokeOpacity={0.05}
                    strokeWidth={1}
                    className="text-foreground"
                    rx={4}
                />
                {/* Penalty area bottom */}
                <rect
                    x="20%"
                    y="82%"
                    width="60%"
                    height="18%"
                    fill="none"
                    stroke="currentColor"
                    strokeOpacity={0.05}
                    strokeWidth={1}
                    className="text-foreground"
                    rx={4}
                />
            </svg>

            {/* Players */}
            {teamPlayers.map((player) => {
                const { left, top } = getPlayerPosition(player, playerSize, containerSize.width, containerSize.height);

                return (
                    <PitchPlayer
                        key={player.id || -1}
                        player={player}
                        name={findPlayerName(player)}
                        playerSize={playerSize}
                        initialLeft={left}
                        initialTop={top}
                        containerWidth={containerSize.width}
                        containerHeight={containerSize.height}
                    />
                );
            })}
        </div>
    );
};

export default PlayerContainer;

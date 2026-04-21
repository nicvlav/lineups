import { useCallback, useEffect, useRef, useState } from "react";
import type { GamePlayer } from "@/context/game-provider";
import { cn } from "@/lib/utils";

interface MiniPitchProps {
    team: string;
    teamPlayers: GamePlayer[];
    currentPlayerId: string;
    onPlayerTap: (playerId: string) => void;
}

/** First name + last initial — matches the main pitch's naming style */
function shortName(fullName: string): string {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length <= 1) return fullName;
    return `${parts.slice(0, -1).join(" ")} ${parts[parts.length - 1][0]}`;
}

const TOKEN_SIZE = 28;

const MiniPitch: React.FC<MiniPitchProps> = ({ team, teamPlayers, currentPlayerId, onPlayerTap }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });

    const update = useCallback(() => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setSize({ width: rect.width, height: rect.height });
        }
    }, []);

    useEffect(() => {
        update();
        const observer = new ResizeObserver(update);
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [update]);

    const isTeamA = team === "A";
    const half = TOKEN_SIZE / 2;

    return (
        <div
            ref={containerRef}
            className={cn(
                "relative w-full h-full rounded-lg overflow-hidden",
                isTeamA ? "pitch-team-a" : "pitch-team-b"
            )}
        >
            <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                preserveAspectRatio="none"
                aria-hidden="true"
            >
                <circle
                    cx="50%"
                    cy="50%"
                    r="14%"
                    fill="none"
                    stroke="currentColor"
                    strokeOpacity={0.08}
                    strokeWidth={1}
                    className="text-foreground"
                />
                <line
                    x1="0%"
                    y1="50%"
                    x2="100%"
                    y2="50%"
                    stroke="currentColor"
                    strokeOpacity={0.08}
                    strokeWidth={1}
                    className="text-foreground"
                />
            </svg>

            {teamPlayers.map((p) => {
                if (!p.position) return null;
                const left = Math.max(half, Math.min(p.position.x * size.width, size.width - half));
                const top = Math.max(half, Math.min(p.position.y * size.height, size.height - half));
                const isCurrent = p.id === currentPlayerId;

                return (
                    <button
                        type="button"
                        key={p.id}
                        onClick={() => !isCurrent && onPlayerTap(p.id)}
                        disabled={isCurrent}
                        className={cn(
                            "absolute flex flex-col items-center gap-0.5 transition-transform",
                            !isCurrent && "hover:scale-110 cursor-pointer",
                            isCurrent && "cursor-default"
                        )}
                        style={{
                            left: `${left}px`,
                            top: `${top}px`,
                            transform: "translate(-50%, -50%)",
                        }}
                    >
                        <div
                            className={cn(
                                "rounded-full border-2 flex items-center justify-center font-bold select-none",
                                isTeamA
                                    ? "bg-cyan-400 border-cyan-300/60 text-white"
                                    : "bg-lime-400 border-lime-300/60 text-gray-900",
                                isCurrent && "ring-2 ring-offset-2 ring-offset-background ring-primary"
                            )}
                            style={{
                                width: `${TOKEN_SIZE}px`,
                                height: `${TOKEN_SIZE}px`,
                                fontSize: "10px",
                            }}
                        >
                            {p.exactPosition}
                        </div>
                        <span className="text-[9px] font-medium text-foreground/80 leading-tight whitespace-nowrap max-w-16 truncate">
                            {shortName(p.name)}
                        </span>
                    </button>
                );
            })}
        </div>
    );
};

export default MiniPitch;

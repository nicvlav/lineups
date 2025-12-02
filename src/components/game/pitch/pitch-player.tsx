import { useState, useEffect, useRef } from "react";
import { User } from "lucide-react";
import { ScoredGamePlayer } from "@/types/players";
import { usePlayers } from "@/context/players-provider";
import { usePitchAnimation } from "@/context/pitch-animation-context";
import PitchPlayerDialog from "@/components/players/player-dialog";

interface PitchPlayerProps {
  player: ScoredGamePlayer;
  name: string;
  playerSize: number;
  initialLeft: number;
  initialTop: number;
  containerWidth: number;
  containerHeight: number;
}

const PitchPlayer: React.FC<PitchPlayerProps> = ({
  player,
  name,
  playerSize,
  initialLeft,
  initialTop,
  containerWidth,
  containerHeight,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { players } = usePlayers();
  const { shouldAnimate, animationSource } = usePitchAnimation();
  const [hasAnimated, setHasAnimated] = useState(false);
  const previousPositionRef = useRef({ left: initialLeft, top: initialTop });

  // Get the full Player data (with avatar_url) from the players record
  const fullPlayer = player.id ? players[player.id] : null;

  const handleOpenDialog = (event: React.MouseEvent) => {
    event.preventDefault();
    setIsDialogOpen(true);
  };

  const circleSize = Math.max(playerSize * 0.8, 40);
  const iconSize = circleSize * 0.4;
  const nameOffset = -(circleSize / 2);

  const halfCircle = circleSize / 2;
  const minLeft = halfCircle;
  const maxLeft = containerWidth - halfCircle;

  const minTop = halfCircle;
  const maxTop = containerHeight - halfCircle;

  // Split name into words by spaces
  const words = name.trim().split(/\s+/); // split on any whitespace, ignoring multiple spaces

  const maxLines = 3;
  // Number of lines = number of words (words.length)
  const numLines = Math.min(words.length, maxLines);

  const adjustedNameOffset = nameOffset - (numLines - 1) * 15;

  const clampedLeft = Math.min(Math.max(initialLeft, minLeft), maxLeft);
  const clampedTop = Math.min(Math.max(initialTop, minTop), maxTop);

  // Track if position actually changed (not just a re-render)
  useEffect(() => {
    const positionChanged =
      Math.abs(previousPositionRef.current.left - clampedLeft) > 1 ||
      Math.abs(previousPositionRef.current.top - clampedTop) > 1;

    if (positionChanged && shouldAnimate && !hasAnimated) {
      // Position changed and we should animate
      setHasAnimated(true);
      previousPositionRef.current = { left: clampedLeft, top: clampedTop };
    } else if (!shouldAnimate) {
      // Reset animation state when animations are turned off
      setHasAnimated(false);
      previousPositionRef.current = { left: clampedLeft, top: clampedTop };
    }
  }, [clampedLeft, clampedTop, shouldAnimate, hasAnimated]);

  // Calculate animation delay based on player index (staggered effect)
  const getAnimationDelay = () => {
    if (!shouldAnimate || !hasAnimated) return 0;

    // Use player ID to generate a consistent but pseudo-random delay
    const hashCode = (player.id || '').split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);

    const baseDelay = animationSource === 'formation' ? 20 : 10;
    const maxDelay = animationSource === 'formation' ? 300 : 200;
    return Math.abs(hashCode) % maxDelay + baseDelay;
  };

  const animationDelay = getAnimationDelay();
  const shouldPlayAnimation = shouldAnimate && hasAnimated;

  return (
    <div>
      <div
        onClick={handleOpenDialog}
        onContextMenu={handleOpenDialog}
        className={`
          absolute flex flex-col items-center touch-none z-0
          cursor-pointer hover:scale-105
          ${shouldPlayAnimation ? 'transition-all duration-500' : 'transition-all duration-300'}
        `}
        style={{
          left: `${clampedLeft}px`,
          top: `${clampedTop}px`,
          transform: "translate(-50%, -50%)",
          ...(shouldPlayAnimation ? {
            animation: `pitchPlayerEntry 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${animationDelay}ms both`,
          } : {}),
        }}
      >
        <div
          className={`
    absolute text-foreground drop-shadow-lg text-xs font-bold rounded-md
    p pointer-events-none text-center flex flex-col
  `}
          style={{ top: `${adjustedNameOffset}px` }}
        >
          {name.split(" ").map((word, i) => (
            <span key={i} style={{ whiteSpace: "nowrap", marginBottom: "0.1em" }}>
              {word}
            </span>
          ))}
        </div>


        <div
          className={`z-200 rounded-full border-2 shadow-sm flex items-center justify-center overflow-hidden transition-all duration-200 ${
            player.team === 'A'
              ? 'bg-cyan-400 border-cyan-500 text-white shadow-cyan-400/20'
              : 'bg-lime-400 border-lime-500 text-gray-900 shadow-lime-400/20'
          }`}
          style={{
            width: `${circleSize}px`,
            height: `${circleSize}px`,
            fontSize: `${Math.max(circleSize * 0.4, 14)}px`,
          }}
        >
          <div>
            {fullPlayer?.avatar_url ? (
              <img
                src={fullPlayer.avatar_url}
                alt={name}
                className="w-full h-full object-cover rounded-full"
                onError={(e) => {
                  // Fallback to User icon if image fails to load
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : (
              <User size={iconSize} />
            )}
            {fullPlayer?.avatar_url && (
              <User size={iconSize} className="hidden" />
            )}
          </div>
        </div>
      </div>

      <PitchPlayerDialog
        player={player}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </div>
  );
};

export default PitchPlayer;

import { useState } from "react";
import { Player } from "@/data/player-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle, Edit3 } from "lucide-react";
import { PlayerVoting } from "@/components/voting/player-voting-dialog";
import { useVoting } from "@/context/voting-provider";

interface PlayerVoteCardProps {
  player: Player;
  hasVoted: boolean;
  userVote?: any;
  onVoteComplete?: () => void;
}

export const PlayerVoteCard = ({ player, hasVoted, userVote, onVoteComplete }: PlayerVoteCardProps) => {
  const [isVoting, setIsVoting] = useState(false);
  const { submitVote } = useVoting();

  const handleOpenVoting = () => {
    setIsVoting(true);
  };

  const handleCloseVoting = () => {
    setIsVoting(false);
    onVoteComplete?.();
  };

  const handleVoteSubmit = async (voteData: { playerId: string; votes: Record<string, number> }) => {
    await submitVote(voteData);
    handleCloseVoting();
  };

  return (
    <>
      <div className="flex items-center justify-between py-3 px-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
        <div className="flex items-center gap-3 flex-1">
          {hasVoted ? (
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          )}

          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{player.name}</div>
            {hasVoted && userVote && (
              <div className="text-xs text-muted-foreground">
                Voted on {new Date(userVote.created_at).toLocaleDateString()}
              </div>
            )}
          </div>

          {player.vote_count > 0 && (
            <Badge variant="secondary" className="flex-shrink-0">
              {player.vote_count} {player.vote_count === 1 ? 'vote' : 'votes'}
            </Badge>
          )}
        </div>

        <Button
          variant={hasVoted ? "ghost" : "default"}
          size="sm"
          onClick={handleOpenVoting}
          className="ml-3 flex-shrink-0"
        >
          {hasVoted ? (
            <>
              <Edit3 className="h-3 w-3 mr-1" />
              Edit
            </>
          ) : (
            <>Vote</>
          )}
        </Button>
      </div>

      {isVoting && (
        <PlayerVoting
          player={player}
          onVoteComplete={handleVoteSubmit}
          onClose={handleCloseVoting}
          isEditing={hasVoted}
          existingVotes={userVote}
        />
      )}
    </>
  );
};

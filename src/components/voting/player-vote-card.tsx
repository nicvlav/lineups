import { CheckCircle, Circle, Edit3 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlayerVoting } from "@/components/voting/player-voting-dialog";
import type { UserVoteEntry } from "@/hooks/use-voting";
import { useSubmitVote } from "@/hooks/use-voting";
import type { Player } from "@/types/players";

interface PlayerVoteCardProps {
    player: Player;
    hasVoted: boolean;
    userVote?: UserVoteEntry;
    onVoteComplete?: () => void;
}

export const PlayerVoteCard = ({ player, hasVoted, userVote, onVoteComplete }: PlayerVoteCardProps) => {
    const [isVoting, setIsVoting] = useState(false);
    const submitVoteMutation = useSubmitVote();

    const handleOpenVoting = () => {
        setIsVoting(true);
    };

    const handleCloseVoting = () => {
        setIsVoting(false);
        onVoteComplete?.();
    };

    const handleVoteSubmit = async (voteData: { playerId: string; votes: Record<string, number> }) => {
        await submitVoteMutation.mutateAsync(voteData);
        handleCloseVoting();
    };

    return (
        <>
            <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    {hasVoted ? (
                        <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                    ) : (
                        <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}

                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{player.name}</div>
                        {hasVoted && userVote && (
                            <div className="text-[10px] text-muted-foreground">
                                {new Date(userVote.created_at).toLocaleDateString()}
                            </div>
                        )}
                    </div>
                </div>

                <Button
                    variant={hasVoted ? "ghost" : "outline"}
                    size="sm"
                    onClick={handleOpenVoting}
                    className="ml-3 shrink-0 text-xs"
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

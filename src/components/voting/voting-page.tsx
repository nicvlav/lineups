import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { usePlayers } from "@/contexts/players-provider";
import { PlayerVoting } from "@/components/voting/player-voting";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Vote, CheckCircle, Users, RotateCcw, Edit3 } from "lucide-react";
import { StatsKey } from "@/lib/types/stat-types";
import { PAGE_LAYOUT } from "@/lib/design-tokens/page-tokens";
import { cn } from "@/lib/utils/cn";
import { SPACING_Y, SIZES, GAP, PADDING, PADDING_X, PADDING_Y } from "@/lib/design-tokens";

interface VoteData {
  playerId: string;
  votes: Record<StatsKey, number>;
}

export default function VotingPage() {
  const { user, canVote, isVerified } = useAuth();
  const {
    players: playersRecord,
    submitVote,
    votingStats,
    userVotes,
    resetVotingProgress,
    votingSession,
    setCurrentVotingPlayer,
    getNextPlayerToVote,
  } = usePlayers();
  const players = Object.values(playersRecord);
  const [showVoting, setShowVoting] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
  const [currentVotingPlayerId, setCurrentVotingPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    if (!user) return;

    // All data now comes from PlayersProvider - no queries needed!
    setLoading(false);
  }, [user]);

  // Set initial voting player
  useEffect(() => {
    if (user && !loading) {
      const currentPlayer = votingSession?.currentPlayerId || getNextPlayerToVote();
      if (currentPlayer) {
        setCurrentVotingPlayerId(currentPlayer);
        if (currentPlayer !== votingSession?.currentPlayerId) {
          setCurrentVotingPlayer(currentPlayer);
        }
      }
    }
  }, [user, loading, votingSession, getNextPlayerToVote, setCurrentVotingPlayer]);

  const handleVoteSubmit = async (voteData: VoteData) => {
    if (!user) return;

    try {
      // Submit the vote
      await submitVote(voteData);

      // Find next player to vote on
      const nextPlayer = getNextPlayerToVote();

      if (nextPlayer) {
        setCurrentVotingPlayerId(nextPlayer);
        setCurrentVotingPlayer(nextPlayer);
      } else {
        // No more players to vote on
        setCurrentVotingPlayerId(null);
        setShowVoting(false);
      }
    } catch (error) {
      console.error('Error submitting vote:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className={PAGE_LAYOUT.loadingState.wrapper}>
        <div className={cn("text-center", SPACING_Y.md)}>
          <Vote className={cn(SIZES.button.xl, "w-12 animate-pulse mx-auto text-muted-foreground")} />
          <p className={PAGE_LAYOUT.loadingState.text}>Loading voting data...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center h-full">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Vote className={cn(SIZES.button.xl, "w-12 mx-auto text-muted-foreground")} />
            <CardTitle>Sign In Required</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              You need to be signed in to participate in player voting.
            </p>
            <Button onClick={() => window.location.href = '/'}>
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!canVote || !isVerified) {
    return (
      <div className="flex justify-center items-center h-full">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Vote className={cn(SIZES.button.xl, "w-12 mx-auto text-muted-foreground")} />
            <CardTitle>Squad Verification Required</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              You need to complete squad verification and player association to access voting features.
            </p>
            <div className={cn(SPACING_Y.sm, "text-sm text-muted-foreground")}>
              <p>• Join an authorized squad</p>
              <p>• Associate with a player profile</p>
              <p>• Complete verification process</p>
            </div>
            <Button className="mt-4" onClick={() => window.location.href = '/'}>
              Complete Verification
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter out user's associated player from voting options
  const eligiblePlayers = players.filter(player => {
    const isAssociatedPlayer = user?.profile?.associated_player_id === player.id;
    return !isAssociatedPlayer;
  });

  const unvotedPlayers = eligiblePlayers.filter(player => !userVotes.has(player.id));
  const votedPlayers = eligiblePlayers.filter(player => userVotes.has(player.id));
  const progressPercent = eligiblePlayers.length > 0 ? (votedPlayers.length / eligiblePlayers.length) * 100 : 0;

  const associatedPlayer = user?.profile?.associated_player_id
    ? players.find(p => p.id === user.profile?.associated_player_id)
    : null;

  return (
    <div className={PAGE_LAYOUT.container}>
      {/* Header - Consistent with other pages */}
      <div className={PAGE_LAYOUT.header.wrapper}>
        <h1 className={PAGE_LAYOUT.header.title}>Player Voting</h1>
        <p className={PAGE_LAYOUT.header.description}>
          Rate player skills to help create balanced teams
        </p>
      </div>

      {/* Status Bar - Consistent height */}
      <div className={cn(PAGE_LAYOUT.actionBar.wrapper, "flex items-center")}>
        <div className={cn("flex items-center bg-muted/20 rounded-xl overflow-x-auto", GAP.xs, PADDING.xs)}>
          <div className={cn("flex items-center text-sm whitespace-nowrap", GAP.md, PADDING_X.sm, PADDING_Y.xs)}>
            <div className="flex items-center gap-2">
              <CheckCircle className={cn(SIZES.icon.xs, "text-muted-foreground")} />
              <span className="font-medium">
                {votedPlayers.length}/{eligiblePlayers.length} rated
              </span>
              <span className="text-muted-foreground">
                ({progressPercent.toFixed(0)}% complete)
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className={SIZES.icon.xs} />
              <span>{votingStats.totalVoters} voters</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className={cn("flex-1 overflow-y-auto", SPACING_Y.lg)}>
        {/* Start Voting Panel */}
        <Card>
        <CardContent className="pt-6">
          <div className={cn("flex flex-col sm:flex-row sm:items-center sm:justify-between", GAP.md)}>
            <div className={cn("flex items-center", GAP.md)}>
              <div className={cn("rounded-full bg-primary/10 flex items-center justify-center", SIZES.button.xl, "w-12")}>
                <Vote className={cn(SIZES.icon.md, "text-primary")} />
              </div>
              <div>
                <h3 className="font-semibold text-lg">
                  {unvotedPlayers.length === 0 ? 'All Done!' : 'Ready to Vote?'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {unvotedPlayers.length === 0 
                    ? `Great job! You've rated all ${eligiblePlayers.length} players.`
                    : `${unvotedPlayers.length} players remaining • ~${Math.ceil(unvotedPlayers.length * 2.5)} min`
                  }
                </p>
                {associatedPlayer && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Excluding {associatedPlayer.name} (your profile)
                  </p>
                )}
              </div>
            </div>
            <div className={cn("flex items-center justify-end sm:justify-start", GAP.sm)}>
              <Button
                onClick={() => setShowVoting(true)}
                disabled={unvotedPlayers.length === 0}
                className={cn("flex items-center", GAP.sm)}
              >
                <Vote className={SIZES.icon.xs} />
                {unvotedPlayers.length === 0 ? 'Complete!' : 'Start Voting'}
              </Button>
              {votedPlayers.length > 0 && (
                <Button
                  variant="outline"
                  onClick={resetVotingProgress}
                  className={cn("flex items-center", GAP.sm)}
                  title="Reset voting progress (keeps player order)"
                >
                  <RotateCcw className={SIZES.icon.xs} />
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

        {/* Clean History Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Your Vote History
              <Badge variant="secondary">{votedPlayers.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {votedPlayers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No votes submitted yet. Click "Start Voting" above to begin rating players.
              </p>
            ) : (
              <div className={cn("max-h-[40vh] overflow-y-auto", SPACING_Y.sm)}>
                {votedPlayers
                  .sort((a, b) => {
                    const aVote = userVotes.get(a.id);
                    const bVote = userVotes.get(b.id);
                    const aDate = new Date(aVote?.created_at || 0);
                    const bDate = new Date(bVote?.created_at || 0);
                    return bDate.getTime() - aDate.getTime(); // Most recent first
                  })
                  .map(player => {
                    const voteData = userVotes.get(player.id);
                    const voteDate = new Date(voteData?.created_at).toLocaleDateString();
                    return (
                      <div key={player.id} className="flex justify-between items-center py-3 border-b last:border-b-0">
                        <div className="flex-1">
                          <span className="font-medium">{player.name}</span>
                          <div className="text-xs text-muted-foreground">
                            Voted on {voteDate}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingPlayer(player.id)}
                          className={cn("flex items-center h-8 px-2", GAP.xs)}
                          title={`Edit vote for ${player.name}`}
                        >
                          <Edit3 className="h-3 w-3" />
                          Edit
                        </Button>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showVoting && currentVotingPlayerId && playersRecord[currentVotingPlayerId] && (
        <PlayerVoting
          player={playersRecord[currentVotingPlayerId]}
          onVoteComplete={handleVoteSubmit}
          onClose={() => setShowVoting(false)}
        />
      )}

      {editingPlayer && playersRecord[editingPlayer] && (
        <PlayerVoting
          player={playersRecord[editingPlayer]}
          onVoteComplete={handleVoteSubmit}
          onClose={() => setEditingPlayer(null)}
          isEditing={true}
          existingVotes={userVotes.get(editingPlayer)}
        />
      )}
    </div>
  );
}
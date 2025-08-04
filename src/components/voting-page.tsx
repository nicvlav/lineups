import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/auth-context";
import { usePlayers } from "@/context/players-provider";
import { PlayerVoting } from "@/components/dialogs/player-voting";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Vote, CheckCircle, Users, BarChart3 } from "lucide-react";
import { StatsKey } from "@/data/stat-types";

interface VoteData {
  playerId: string;
  votes: Record<StatsKey, number>;
}

export default function VotingPage() {
  console.log('VotingPage: Component rendering/mounting');
  
  // Use unique timer ID to avoid conflicts
  const timerIdRef = useRef(`VotingPage: Component lifecycle - ${Date.now()}`);
  console.time(timerIdRef.current);
  
  const { user, canVote, isVerified } = useAuth();
  const { 
    players: playersRecord, 
    submitVote, 
    getPendingVoteCount,
    votingStats,
    playersWithVotes,
    userVotes,
  } = usePlayers();
  const players = Object.values(playersRecord);
  const [showVoting, setShowVoting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Component lifecycle tracking
  useEffect(() => {
    console.log('VotingPage: Component mounted');
    return () => {
      console.log('VotingPage: Component unmounting');
      console.timeEnd(timerIdRef.current);
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    const loadTimerId = `VotingPage: Load data - ${Date.now()}`;
    console.time(loadTimerId);
    console.log('VotingPage: All data comes from PlayersProvider cache - instant loading');
    
    // All data now comes from PlayersProvider - no queries needed!
    setLoading(false);
    console.timeEnd(loadTimerId);

  }, [user]);

  const handleVoteSubmit = async (voteData: VoteData) => {
    console.log('handleVoteSubmit called with:', voteData.playerId);
    
    if (!user) {
      console.log('No user, aborting vote submit');
      return;
    }

    try {
      console.log('Calling submitVote from PlayersProvider...');
      // Use centralized vote submission from PlayersProvider
      await submitVote(voteData);
      console.log('submitVote completed successfully');

      // All optimistic updates now handled by PlayersProvider

      console.log(`Vote submitted successfully for player ${voteData.playerId}`);
    } catch (error) {
      console.error('Error submitting vote:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="text-center space-y-4">
          <BarChart3 className="h-12 w-12 animate-pulse mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Loading voting data...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center h-full">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Vote className="h-12 w-12 mx-auto text-muted-foreground" />
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
            <Vote className="h-12 w-12 mx-auto text-muted-foreground" />
            <CardTitle>Squad Verification Required</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              You need to complete squad verification and player association to access voting features.
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
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
  const pendingCount = getPendingVoteCount();

  const associatedPlayer = user?.profile?.associated_player_id
    ? players.find(p => p.id === user.profile?.associated_player_id)
    : null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Player Evaluation</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Help build fair team selections by rating players across key football skills.
          Your votes contribute to community-driven player statistics.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Progress</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {votedPlayers.length}/{eligiblePlayers.length}
              {pendingCount > 0 && (
                <span className="text-xs text-orange-500 ml-2">
                  (+{pendingCount} pending)
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {progressPercent.toFixed(0)}% completed
              {pendingCount > 0 && ' • Background sync active'}
            </p>
            {associatedPlayer && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Excluding {associatedPlayer.name} (your profile)
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Community Voters</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{votingStats.totalVoters}</div>
            <p className="text-xs text-muted-foreground">
              total participants
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Players Rated</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {playersWithVotes.size}/{votingStats.totalPlayers}
            </div>
            <p className="text-xs text-muted-foreground">
              have community ratings
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Vote className="h-5 w-5" />
              Start Voting
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Rate players on a guided form covering all key football skills.
              Each player takes about 2-3 minutes to evaluate thoroughly.
            </p>
            <div className="flex items-center gap-4">
              <Button
                onClick={() => setShowVoting(true)}
                disabled={unvotedPlayers.length === 0}
                className="flex items-center gap-2"
              >
                <Vote className="h-4 w-4" />
                {unvotedPlayers.length === 0 ? 'All Players Rated' : `Rate ${unvotedPlayers.length} Players`}
              </Button>
              {unvotedPlayers.length > 0 && (
                <Badge variant="outline">
                  ~{Math.ceil(unvotedPlayers.length * 2.5)} min remaining
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Recent Votes</CardTitle>
          </CardHeader>
          <CardContent>
            {votedPlayers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No votes submitted yet. Start voting to see your recent evaluations here.
              </p>
            ) : (
              <div className="space-y-2">
                {votedPlayers.slice(0, 5).map(player => {
                  const voteData = userVotes.get(player.id);
                  const voteDate = new Date(voteData?.created_at).toLocaleDateString();
                  return (
                    <div key={player.id} className="flex justify-between items-center py-2 border-b">
                      <span className="font-medium">{player.name}</span>
                      <Badge variant="outline">{voteDate}</Badge>
                    </div>
                  );
                })}
                {votedPlayers.length > 5 && (
                  <p className="text-xs text-muted-foreground">
                    +{votedPlayers.length - 5} more votes
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showVoting && unvotedPlayers.length > 0 && (
        <PlayerVoting
          players={unvotedPlayers}
          onVoteComplete={handleVoteSubmit}
          onClose={() => setShowVoting(false)}
        />
      )}
    </div>
  );
}
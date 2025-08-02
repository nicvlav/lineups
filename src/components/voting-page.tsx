import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { usePlayers } from "@/context/players-provider";
import { supabase } from "@/lib/supabase";
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
  const { user } = useAuth();
  const { players: playersRecord } = usePlayers();
  const players = Object.values(playersRecord);
  const [showVoting, setShowVoting] = useState(false);
  const [userVotes, setUserVotes] = useState<Map<string, any>>(new Map());
  const [votingStats, setVotingStats] = useState<{
    totalPlayers: number;
    playersVoted: number;
    totalVoters: number;
  }>({ totalPlayers: 0, playersVoted: 0, totalVoters: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const loadUserVotes = async () => {
      const { data, error } = await supabase
        .from('player_votes')
        .select('player_id, votes, created_at')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading user votes:', error);
        return;
      }

      const votesMap = new Map();
      data?.forEach(vote => {
        votesMap.set(vote.player_id, vote);
      });
      setUserVotes(votesMap);
    };

    const loadVotingStats = async () => {
      const [playersResponse, votesResponse] = await Promise.all([
        supabase.from('players').select('id, vote_count'),
        supabase.from('player_votes').select('user_id')
      ]);

      if (playersResponse.data && votesResponse.data) {
        const totalPlayers = playersResponse.data.length;
        const playersVoted = playersResponse.data.filter((p: any) => p.vote_count > 0).length;
        const totalVoters = new Set(votesResponse.data.map((v: any) => v.user_id)).size;
        
        setVotingStats({ totalPlayers, playersVoted, totalVoters });
      }
    };

    Promise.all([loadUserVotes(), loadVotingStats()]).finally(() => {
      setLoading(false);
    });
  }, [user]);

  const handleVoteSubmit = async (voteData: VoteData) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('player_votes')
        .upsert({
          user_id: user.id,
          player_id: voteData.playerId,
          votes: voteData.votes,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,player_id'
        });

      if (error) throw error;

      // Update local state
      setUserVotes(prev => new Map(prev.set(voteData.playerId, {
        player_id: voteData.playerId,
        votes: voteData.votes,
        created_at: new Date().toISOString()
      })));

      // Update voting stats
      setVotingStats(prev => ({
        ...prev,
        playersVoted: Math.max(prev.playersVoted, userVotes.size + 1)
      }));

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

  const unvotedPlayers = players.filter(player => !userVotes.has(player.id));
  const votedPlayers = players.filter(player => userVotes.has(player.id));
  const progressPercent = (votedPlayers.length / players.length) * 100;

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
              {votedPlayers.length}/{players.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {progressPercent.toFixed(0)}% completed
            </p>
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
              {votingStats.playersVoted}/{votingStats.totalPlayers}
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
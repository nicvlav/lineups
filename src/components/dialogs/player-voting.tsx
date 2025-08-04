import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Save } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Player } from "@/data/player-types";
import { StatsKey, statLabelMap, StatCategory, CategorizedStats, StatCategoryNameMap } from "@/data/stat-types";

interface VoteData {
  playerId: string;
  votes: Record<StatsKey, number>;
}

interface PlayerVotingProps {
  players: Player[];
  onVoteComplete: (voteData: VoteData) => Promise<void>;
  onClose: () => void;
}

interface VotingSession {
  currentPlayerIndex: number;
  currentCategoryIndex: number;
  currentCategory: StatCategory;
  playerOrder: string[];
  partialVotes: Record<StatsKey, number>;
  completedVotes: string[];
  timestamp: number;
}

export function PlayerVoting({ players, onVoteComplete, onClose }: PlayerVotingProps) {
  const { user } = useAuth();
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [randomizedPlayers, setRandomizedPlayers] = useState<Player[]>([]);
  const [votes, setVotes] = useState<Record<StatsKey, number>>({} as Record<StatsKey, number>);
  const [completedVotes, setCompletedVotes] = useState<Set<string>>(new Set());
  const [currentCategory, setCurrentCategory] = useState<StatCategory>("pace");
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionRestored, setSessionRestored] = useState(false);

  const categories: StatCategory[] = ["pace", "attacking", "passing", "dribbling", "defending", "physical", "morale"];

  // Session persistence functions
  const saveVotingSession = () => {
    if (!user) return;
    
    const session: VotingSession = {
      currentPlayerIndex,
      currentCategoryIndex: categoryIndex,
      currentCategory,
      playerOrder: randomizedPlayers.map(p => p.id),
      partialVotes: votes,
      completedVotes: Array.from(completedVotes),
      timestamp: Date.now()
    };
    
    localStorage.setItem(`voting_session_${user.id}`, JSON.stringify(session));
  };

  const loadVotingSession = (): VotingSession | null => {
    if (!user) return null;
    
    try {
      const stored = localStorage.getItem(`voting_session_${user.id}`);
      if (!stored) return null;
      
      const session: VotingSession = JSON.parse(stored);
      
      // Check if session is recent (within 24 hours)
      if (Date.now() - session.timestamp > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(`voting_session_${user.id}`);
        return null;
      }
      
      return session;
    } catch (error) {
      console.error('Error loading voting session:', error);
      return null;
    }
  };

  const clearVotingSession = () => {
    if (!user) return;
    localStorage.removeItem(`voting_session_${user.id}`);
  };

  // Smart player ordering - favor players with lowest vote counts
  useEffect(() => {
    // Try to restore session first
    if (!sessionRestored && user) {
      const savedSession = loadVotingSession();
      
      if (savedSession) {
        // Restore session state
        const savedPlayers = savedSession.playerOrder
          .map(id => players.find(p => p.id === id))
          .filter((p): p is Player => p !== undefined);
        
        // Only restore if we have the same players
        if (savedPlayers.length === savedSession.playerOrder.length) {
          setRandomizedPlayers(savedPlayers);
          setCurrentPlayerIndex(savedSession.currentPlayerIndex);
          setCategoryIndex(savedSession.currentCategoryIndex);
          setCurrentCategory(savedSession.currentCategory);
          setVotes(savedSession.partialVotes);
          setCompletedVotes(new Set(savedSession.completedVotes));
          setSessionRestored(true);
          return;
        }
      }
      
      setSessionRestored(true);
    }
    // Don't reorder if we're already voting (preserves current position)
    if (randomizedPlayers.length > 0 && currentPlayerIndex > 0) {
      return;
    }
    
    const smartOrdered = [...players].sort((a, b) => {
      // Primary sort: vote count (ascending - lowest first)
      const voteCountA = a.vote_count || 0;
      const voteCountB = b.vote_count || 0;
      
      if (voteCountA !== voteCountB) {
        return voteCountA - voteCountB;
      }
      
      // Secondary sort: randomize players with same vote count
      return Math.random() - 0.5;
    });
    
    // Apply some randomization but keep the bias toward lower vote counts
    const weightedRandom = smartOrdered.map((player, index) => ({
      player,
      // Higher weight for earlier positions (lower vote counts)
      weight: Math.max(0.1, 1 - (index / smartOrdered.length))
    }));
    
    // Shuffle with weights - players with lower vote counts more likely to stay near front
    const finalOrder: Player[] = [];
    const remaining = [...weightedRandom];
    
    while (remaining.length > 0) {
      // Calculate cumulative weights
      const totalWeight = remaining.reduce((sum, item) => sum + item.weight, 0);
      let random = Math.random() * totalWeight;
      
      for (let i = 0; i < remaining.length; i++) {
        random -= remaining[i].weight;
        if (random <= 0) {
          finalOrder.push(remaining[i].player);
          remaining.splice(i, 1);
          break;
        }
      }
    }
    
    setRandomizedPlayers(finalOrder);
  }, [players, currentPlayerIndex, randomizedPlayers.length]);

  // Save session whenever state changes (with throttling to prevent excessive saves)
  useEffect(() => {
    if (sessionRestored && randomizedPlayers.length > 0) {
      const timeoutId = setTimeout(() => {
        saveVotingSession();
      }, 500); // Debounce session saves
      
      return () => clearTimeout(timeoutId);
    }
  }, [currentPlayerIndex, categoryIndex, currentCategory, votes, completedVotes, sessionRestored, randomizedPlayers.length]);

  // Cleanup session when voting completes
  useEffect(() => {
    return () => {
      // Only clear if we actually completed voting, not if component unmounts for other reasons
      if (currentPlayerIndex >= randomizedPlayers.length - 1) {
        clearVotingSession();
      }
    };
  }, [currentPlayerIndex, randomizedPlayers.length]);

  // Initialize votes for current player
  useEffect(() => {
    if (randomizedPlayers.length > 0) {
      const initialVotes = {} as Record<StatsKey, number>;
      Object.keys(statLabelMap).forEach(key => {
        initialVotes[key as StatsKey] = 5; // Default to middle value (now 5 out of 1-10)
      });
      setVotes(initialVotes);
    }
  }, [currentPlayerIndex, randomizedPlayers]);

  const currentPlayer = randomizedPlayers[currentPlayerIndex];
  const currentStats = CategorizedStats[currentCategory];
  const progress = ((currentPlayerIndex) / randomizedPlayers.length) * 100;

  if (!currentPlayer || !user) return null;

  const handleVoteChange = (statKey: StatsKey, value: number, event?: React.MouseEvent) => {
    event?.preventDefault();
    setVotes(prev => ({
      ...prev,
      [statKey]: value
    }));
  };

  const handleNextCategory = () => {
    if (isSubmitting) {
      return;
    }
    
    if (categoryIndex < categories.length - 1) {
      setCategoryIndex(prev => prev + 1);
      setCurrentCategory(categories[categoryIndex + 1]);
    } else {
      // Finished all categories for this player
      handleSubmitPlayerVotes();
    }
  };

  const handleSubmitPlayerVotes = async () => {
    if (!currentPlayer || isSubmitting) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await onVoteComplete({
        playerId: currentPlayer.id,
        votes
      });
      
      setCompletedVotes(prev => new Set([...prev, currentPlayer.id]));
      
      // Move to next player
      if (currentPlayerIndex < randomizedPlayers.length - 1) {
        setCurrentPlayerIndex(prev => prev + 1);
        setCategoryIndex(0);
        setCurrentCategory("pace");
      } else {
        // All players completed - clear session and close
        clearVotingSession();
        onClose();
      }
    } catch (error) {
      console.error('Error submitting votes:', error);
    } finally {
      setIsSubmitting(false);
    }
  };


  const VoteSlider = ({ statKey }: { statKey: StatsKey }) => (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium">{statLabelMap[statKey]}</label>
        <Badge variant="outline" className="min-w-[3rem] justify-center">
          {votes[statKey]}/10
        </Badge>
      </div>
      
      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: 10 }, (_, i) => (
          <button
            key={i + 1}
            type="button"
            onClick={(e) => handleVoteChange(statKey, i + 1, e)}
            className={`
              h-10 w-full rounded-md border-2 transition-all duration-150 text-xs font-medium
              flex items-center justify-center touch-manipulation
              ${votes[statKey] === i + 1 
                ? 'border-primary bg-primary text-primary-foreground shadow-md' 
                : 'border-muted bg-background hover:border-primary/50 hover:bg-muted'
              }
            `}
          >
            {i + 1}
          </button>
        ))}
      </div>
      
      <div className="flex justify-between text-xs text-muted-foreground px-1">
        <span>Poor (1-3)</span>
        <span>Average (4-6)</span>
        <span>Excellent (7-10)</span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-hidden">
      <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col">
        <CardHeader className="flex-shrink-0 space-y-4 pb-4">
          <div className="flex justify-between items-start">
            <CardTitle className="text-xl">Player Evaluation</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>×</Button>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress: {currentPlayerIndex + 1} of {randomizedPlayers.length} players</span>
              <span>{completedVotes.size} completed</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold text-lg">{currentPlayer.name}</h3>
            <p className="text-sm text-muted-foreground">
              Rating {StatCategoryNameMap[currentCategory]} skills 
              ({categoryIndex + 1} of {categories.length} categories)
            </p>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col flex-1 min-h-0 px-6 py-0">
          {/* Scrollable middle section with better spacing */}
          <div className="flex-1 overflow-y-auto py-4 -mx-2 px-2">
            <div className="space-y-6">
              {currentStats.map(statKey => (
                <VoteSlider key={statKey} statKey={statKey} />
              ))}
            </div>
          </div>

          {/* Fixed button at bottom with better spacing */}
          <div className="flex-shrink-0 pt-4 pb-6 border-t mt-2">
            <Button 
              onClick={handleNextCategory}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 h-12"
            >
              {isSubmitting ? (
                "Saving..."
              ) : categoryIndex < categories.length - 1 ? (
                <>Next Category</>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Submit & Next Player
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
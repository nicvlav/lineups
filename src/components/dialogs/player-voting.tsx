import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { SkipForward, Save } from "lucide-react";
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

export function PlayerVoting({ players, onVoteComplete, onClose }: PlayerVotingProps) {
  const { user } = useAuth();
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [randomizedPlayers, setRandomizedPlayers] = useState<Player[]>([]);
  const [votes, setVotes] = useState<Record<StatsKey, number>>({} as Record<StatsKey, number>);
  const [completedVotes, setCompletedVotes] = useState<Set<string>>(new Set());
  const [currentCategory, setCurrentCategory] = useState<StatCategory>("pace");
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories: StatCategory[] = ["pace", "attacking", "passing", "dribbling", "defending", "physical", "morale"];

  // Randomize players on mount
  useEffect(() => {
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    setRandomizedPlayers(shuffled);
  }, [players]);

  // Initialize votes for current player
  useEffect(() => {
    if (randomizedPlayers.length > 0) {
      const initialVotes = {} as Record<StatsKey, number>;
      Object.keys(statLabelMap).forEach(key => {
        initialVotes[key as StatsKey] = 5; // Default to middle value
      });
      setVotes(initialVotes);
    }
  }, [currentPlayerIndex, randomizedPlayers]);

  const currentPlayer = randomizedPlayers[currentPlayerIndex];
  const currentStats = CategorizedStats[currentCategory];
  const progress = ((currentPlayerIndex) / randomizedPlayers.length) * 100;

  if (!currentPlayer || !user) return null;

  const handleVoteChange = (statKey: StatsKey, value: number) => {
    setVotes(prev => ({
      ...prev,
      [statKey]: value
    }));
  };

  const handleNextCategory = () => {
    if (categoryIndex < categories.length - 1) {
      setCategoryIndex(prev => prev + 1);
      setCurrentCategory(categories[categoryIndex + 1]);
    } else {
      // Finished all categories for this player
      handleSubmitPlayerVotes();
    }
  };

  const handleSubmitPlayerVotes = async () => {
    if (!currentPlayer) return;
    
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
        // All players completed
        onClose();
      }
    } catch (error) {
      console.error('Error submitting votes:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipPlayer = () => {
    if (currentPlayerIndex < randomizedPlayers.length - 1) {
      setCurrentPlayerIndex(prev => prev + 1);
      setCategoryIndex(0);
      setCurrentCategory("pace");
    } else {
      onClose();
    }
  };

  const VoteSlider = ({ statKey }: { statKey: StatsKey }) => (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium">{statLabelMap[statKey]}</label>
        <Badge variant="outline" className="min-w-[3rem] justify-center">
          {votes[statKey]}/10
        </Badge>
      </div>
      <div className="flex items-center space-x-3">
        <span className="text-xs text-muted-foreground w-4">0</span>
        <input
          type="range"
          min="0"
          max="10"
          step="1"
          value={votes[statKey] || 5}
          onChange={(e) => handleVoteChange(statKey, parseInt(e.target.value))}
          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
        />
        <span className="text-xs text-muted-foreground w-4">10</span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <CardHeader className="space-y-4">
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

        <CardContent className="space-y-6 max-h-[50vh] overflow-y-auto">
          <div className="space-y-4">
            {currentStats.map(statKey => (
              <VoteSlider key={statKey} statKey={statKey} />
            ))}
          </div>

          <div className="flex gap-2 pt-4 border-t sticky bottom-0 bg-background">
            <Button 
              variant="outline" 
              onClick={handleSkipPlayer}
              className="flex items-center gap-2"
            >
              <SkipForward className="h-4 w-4" />
              Skip Player
            </Button>
            
            <Button 
              onClick={handleNextCategory}
              disabled={isSubmitting}
              className="flex-1 flex items-center gap-2"
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
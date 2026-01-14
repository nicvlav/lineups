import { ChevronLeft, ChevronRight, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/context/auth-context";
import { logger } from "@/lib/logger";
import { Player } from "@/types/players";
import { CategorizedStats, StatCategory, StatCategoryNameMap, StatsKey, statLabelMap } from "@/types/stats";

interface VoteData {
    playerId: string;
    votes: Record<StatsKey, number>;
}

interface PlayerVotingProps {
    player: Player;
    onVoteComplete: (voteData: VoteData) => Promise<void>;
    onClose: () => void;
    isEditing?: boolean;
    existingVotes?: any;
}

export function PlayerVoting({ player, onVoteComplete, onClose, isEditing = false, existingVotes }: PlayerVotingProps) {
    const { user } = useAuth();
    const [votes, setVotes] = useState<Record<StatsKey, number>>({} as Record<StatsKey, number>);
    const [currentCategory, setCurrentCategory] = useState<StatCategory>("technical");
    const [categoryIndex, setCategoryIndex] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const categories: StatCategory[] = ["technical", "tactical", "mental", "physical"];

    // Initialize votes on mount
    useEffect(() => {
        if (isEditing && existingVotes?.votes) {
            try {
                logger.debug("Existing votes data:", existingVotes.votes);
                // Check if it's already an object or needs parsing
                let existingVoteData;
                if (typeof existingVotes.votes === "string") {
                    existingVoteData = JSON.parse(existingVotes.votes);
                } else {
                    existingVoteData = existingVotes.votes;
                }
                setVotes(existingVoteData);
            } catch (error) {
                logger.error("Error parsing existing votes:", error, "Raw data:", existingVotes.votes);
                // Fall back to defaults if parsing fails
                const initialVotes = {} as Record<StatsKey, number>;
                Object.keys(statLabelMap).forEach((key) => {
                    initialVotes[key as StatsKey] = 5;
                });
                setVotes(initialVotes);
            }
        } else {
            // Initialize with defaults
            const initialVotes = {} as Record<StatsKey, number>;
            Object.keys(statLabelMap).forEach((key) => {
                initialVotes[key as StatsKey] = 5;
            });
            setVotes(initialVotes);
        }
    }, [isEditing, existingVotes]);

    const currentStats = CategorizedStats[currentCategory];

    if (!player || !user) return null;

    const handleVoteChange = (statKey: StatsKey, value: number, event?: React.MouseEvent) => {
        event?.preventDefault();
        setVotes((prev) => ({
            ...prev,
            [statKey]: value,
        }));
    };

    const handlePreviousCategory = () => {
        if (isSubmitting || categoryIndex <= 0) {
            return;
        }

        setCategoryIndex((prev) => prev - 1);
        setCurrentCategory(categories[categoryIndex - 1]);
    };

    const handleNextCategory = () => {
        if (isSubmitting) {
            return;
        }

        if (categoryIndex < categories.length - 1) {
            setCategoryIndex((prev) => prev + 1);
            setCurrentCategory(categories[categoryIndex + 1]);
        } else {
            // Finished all categories for this player
            handleSubmitPlayerVotes();
        }
    };

    const handleSubmitPlayerVotes = async () => {
        if (!player || isSubmitting) {
            return;
        }

        setIsSubmitting(true);

        try {
            await onVoteComplete({
                playerId: player.id,
                votes,
            });

            // Always close after submission - parent will handle next player
            onClose();
        } catch (error) {
            logger.error("Error submitting votes:", error);
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
              ${
                  votes[statKey] === i + 1
                      ? "border-primary bg-primary text-primary-foreground shadow-md"
                      : "border-muted bg-background hover:border-primary/50 hover:bg-muted"
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
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader className="flex-shrink-0 space-y-4">
                    <DialogTitle>{isEditing ? "Edit Player Evaluation" : "Player Evaluation"}</DialogTitle>

                    <div className="bg-muted p-4 rounded-lg">
                        <h3 className="font-semibold text-lg">{player.name}</h3>
                        <p className="text-sm text-muted-foreground">
                            Rating {StatCategoryNameMap[currentCategory]} skills ({categoryIndex + 1} of{" "}
                            {categories.length} categories)
                        </p>
                    </div>
                </DialogHeader>

                <div className="flex flex-col flex-1 min-h-0">
                    {/* Scrollable middle section with better spacing */}
                    <div className="flex-1 overflow-y-auto py-4 space-y-6">
                        {currentStats.map((statKey) => (
                            <VoteSlider key={statKey} statKey={statKey} />
                        ))}
                    </div>

                    {/* Fixed button at bottom with better spacing */}
                    <div className="flex-shrink-0 pt-4 border-t">
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={handlePreviousCategory}
                                disabled={isSubmitting || categoryIndex <= 0}
                                className="flex items-center justify-center gap-2 h-12"
                                title="Previous category"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Back
                            </Button>

                            <Button
                                onClick={handleNextCategory}
                                disabled={isSubmitting}
                                className="flex-1 flex items-center justify-center gap-2 h-12"
                            >
                                {isSubmitting ? (
                                    "Saving..."
                                ) : categoryIndex < categories.length - 1 ? (
                                    <>
                                        Next Category
                                        <ChevronRight className="h-4 w-4" />
                                    </>
                                ) : isEditing ? (
                                    <>
                                        <Save className="h-4 w-4" />
                                        Update Vote
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4" />
                                        Submit & Next Player
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

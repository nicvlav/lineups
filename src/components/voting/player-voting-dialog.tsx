/**
 * Player Voting Dialog (V2)
 *
 * 11 trait sliders on 1-100 scale with snap-to-5 behavior.
 * Single page — no category pagination needed with only 11 traits.
 */

import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/context/auth-context";
import type { UserVoteEntry } from "@/hooks/use-voting";
import { logger } from "@/lib/logger";
import type { Player } from "@/types/players";
import type { TraitKey } from "@/types/traits";
import { TRAIT_KEYS, traitLabelMap } from "@/types/traits";

interface VoteData {
    playerId: string;
    votes: Record<string, number>;
}

interface PlayerVotingProps {
    player: Player;
    onVoteComplete: (voteData: VoteData) => Promise<void>;
    onClose: () => void;
    isEditing?: boolean;
    existingVotes?: UserVoteEntry;
}

/** Snap a value to the nearest 5 */
function snapToFive(value: number): number {
    return Math.max(5, Math.round(value / 5) * 5);
}

const ANCHOR_LABELS: Record<number, string> = {
    25: "Weak",
    50: "Average",
    75: "Strong",
};

export function PlayerVoting({ player, onVoteComplete, onClose, isEditing = false, existingVotes }: PlayerVotingProps) {
    const { user } = useAuth();
    const [votes, setVotes] = useState<Record<TraitKey, number>>({} as Record<TraitKey, number>);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isEditing && existingVotes?.votes) {
            try {
                const existing =
                    typeof existingVotes.votes === "string" ? JSON.parse(existingVotes.votes) : existingVotes.votes;
                setVotes(existing);
            } catch (error) {
                logger.error("Error parsing existing votes:", error);
                const defaults = {} as Record<TraitKey, number>;
                for (const key of TRAIT_KEYS) defaults[key] = 50;
                setVotes(defaults);
            }
        } else {
            const defaults = {} as Record<TraitKey, number>;
            for (const key of TRAIT_KEYS) defaults[key] = 50;
            setVotes(defaults);
        }
    }, [isEditing, existingVotes]);

    if (!player || !user) return null;

    const handleSliderChange = (key: TraitKey, rawValue: number) => {
        setVotes((prev) => ({ ...prev, [key]: snapToFive(rawValue) }));
    };

    const handleSubmit = async () => {
        if (!player || isSubmitting) return;
        setIsSubmitting(true);

        try {
            await onVoteComplete({ playerId: player.id, votes });
            onClose();
        } catch (error) {
            logger.error("Error submitting votes:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
                <DialogHeader className="shrink-0 space-y-4">
                    <DialogTitle>{isEditing ? "Edit Player Evaluation" : "Player Evaluation"}</DialogTitle>
                    <div className="bg-muted p-4 rounded-lg">
                        <h3 className="font-semibold text-lg">{player.name}</h3>
                        <p className="text-sm text-muted-foreground">Rate 11 traits (1-100)</p>
                    </div>
                </DialogHeader>

                <div className="flex flex-col flex-1 min-h-0">
                    <div className="flex-1 overflow-y-auto py-4 space-y-5">
                        {TRAIT_KEYS.map((key) => (
                            <TraitSlider
                                key={key}
                                traitKey={key}
                                value={votes[key] ?? 50}
                                onChange={(val) => handleSliderChange(key, val)}
                            />
                        ))}
                    </div>

                    <div className="shrink-0 pt-4 border-t">
                        <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full h-12 gap-2">
                            {isSubmitting ? (
                                "Saving..."
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    {isEditing ? "Update Vote" : "Submit & Next Player"}
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function TraitSlider({
    traitKey,
    value,
    onChange,
}: {
    traitKey: TraitKey;
    value: number;
    onChange: (val: number) => void;
}) {
    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{traitLabelMap[traitKey]}</span>
                <Badge variant="outline" className="min-w-14 justify-center tabular-nums">
                    {value}
                </Badge>
            </div>

            <input
                type="range"
                min={5}
                max={100}
                step={5}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
            />

            <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
                {Object.entries(ANCHOR_LABELS).map(([pos, label]) => (
                    <span key={pos}>{label}</span>
                ))}
            </div>
        </div>
    );
}

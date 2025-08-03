import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { usePlayers } from "@/context/players-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, User, Users, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Squad {
  id: string;
  name: string;
  description: string | null;
}

interface SquadVerificationProps {
  open: boolean;
  onClose: () => void;
  mandatory?: boolean;
}

export function SquadVerification({ open, onClose, mandatory = false }: SquadVerificationProps) {
  const { verifySquadAndPlayer, getAvailableSquads, forceSignOut } = useAuth();
  const { players: playersRecord } = usePlayers();
  const players = Object.values(playersRecord);
  
  const [squads, setSquads] = useState<Squad[]>([]);
  const [selectedSquadId, setSelectedSquadId] = useState<string>("");
  const [squadIdInput, setSquadIdInput] = useState<string>("");
  const [playerChoice, setPlayerChoice] = useState<"existing" | "new">("existing");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [newPlayerName, setNewPlayerName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"squad" | "player">("squad");

  useEffect(() => {
    if (open) {
      loadSquads();
    }
  }, [open]);

  const loadSquads = async () => {
    const squadsList = await getAvailableSquads();
    setSquads(squadsList);
  };

  const handleSquadVerification = () => {
    const squadId = selectedSquadId || squadIdInput.trim();
    
    if (!squadId) {
      toast.error("Please select or enter a squad ID");
      return;
    }

    // Check if the entered/selected squad ID is valid
    const validSquad = squads.find(s => s.id === squadId);
    if (!validSquad && !squadIdInput) {
      toast.error("Invalid squad ID");
      return;
    }

    setStep("player");
  };

  const handleComplete = async () => {
    const squadId = selectedSquadId || squadIdInput.trim();
    const playerId = playerChoice === "existing" ? selectedPlayerId : null;
    const createNew = playerChoice === "new";
    const playerName = createNew ? newPlayerName.trim() : undefined;

    if (!squadId) {
      toast.error("Squad ID is required");
      return;
    }

    if (playerChoice === "existing" && !playerId) {
      toast.error("Please select an existing player");
      return;
    }

    if (playerChoice === "new" && (!playerName || playerName.length < 2)) {
      toast.error("Please enter a valid player name (minimum 2 characters)");
      return;
    }

    setLoading(true);
    try {
      const { error } = await verifySquadAndPlayer(squadId, playerId, createNew, playerName);
      
      if (error) {
        toast.error(`Verification failed: ${error.message}`);
      } else {
        toast.success("Successfully verified! You can now access voting features.");
        onClose();
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const canClose = !mandatory;

  const handleForceSignOut = async () => {
    if (confirm('This will sign you out and clear all cached data. Continue?')) {
      await forceSignOut();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={canClose ? onClose : undefined}>
      <DialogContent className="max-w-md" onPointerDownOutside={canClose ? undefined : (e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Squad Verification Required
          </DialogTitle>
          <DialogDescription>
            {mandatory 
              ? "Complete verification to access voting features"
              : "Verify your squad membership and player association"
            }
          </DialogDescription>
        </DialogHeader>

        {step === "squad" && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Squad Selection
                </CardTitle>
                <CardDescription className="text-xs">
                  Choose from available squads or enter your squad ID
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {squads.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Available Squads:</Label>
                    <Select value={selectedSquadId} onValueChange={setSelectedSquadId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a squad..." />
                      </SelectTrigger>
                      <SelectContent>
                        {squads.map(squad => (
                          <SelectItem key={squad.id} value={squad.id}>
                            <div className="flex flex-col items-start">
                              <span className="font-medium">{squad.name}</span>
                              {squad.description && (
                                <span className="text-xs text-muted-foreground">{squad.description}</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="squadId" className="text-xs font-medium">
                    Or enter Squad ID:
                  </Label>
                  <Input
                    id="squadId"
                    placeholder="00000000-0000-0000-0000-000000000000"
                    value={squadIdInput}
                    onChange={(e) => setSquadIdInput(e.target.value)}
                    disabled={!!selectedSquadId}
                  />
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    <AlertCircle className="h-3 w-3 inline mr-1" />
                    <strong>Note:</strong> You need a valid squad ID from your team administrator to proceed.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between gap-2">
              <div>
                {mandatory && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleForceSignOut}
                    className="text-red-600 hover:text-red-700 dark:text-red-400"
                  >
                    Sign Out & Clear Cache
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                {canClose && (
                  <Button variant="outline" onClick={onClose} disabled={loading}>
                    Cancel
                  </Button>
                )}
                <Button onClick={handleSquadVerification} disabled={loading}>
                  Continue to Player Selection
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === "player" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle className="h-4 w-4" />
              Squad verified! Now select your player profile.
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Player Association
                </CardTitle>
                <CardDescription className="text-xs">
                  Choose an existing player or create a new profile
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <RadioGroup value={playerChoice} onValueChange={(value: "existing" | "new") => setPlayerChoice(value)}>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="existing" id="existing" />
                      <Label htmlFor="existing" className="text-sm">Select existing player</Label>
                    </div>
                    
                    {playerChoice === "existing" && (
                      <div className="ml-6 space-y-2">
                        <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a player..." />
                          </SelectTrigger>
                          <SelectContent>
                            {players
                              .sort((a, b) => a.name.localeCompare(b.name))
                              .map(player => (
                                <SelectItem key={player.id} value={player.id}>
                                  {player.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="new" id="new" />
                      <Label htmlFor="new" className="text-sm">Create new player profile</Label>
                    </div>
                    
                    {playerChoice === "new" && (
                      <div className="ml-6 space-y-2">
                        <Input
                          placeholder="Enter your player name"
                          value={newPlayerName}
                          onChange={(e) => setNewPlayerName(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          A new player profile will be created with default stats
                        </p>
                      </div>
                    )}
                  </div>
                </RadioGroup>

                <div className="bg-orange-50 dark:bg-orange-950/30 p-3 rounded-lg">
                  <p className="text-xs text-orange-700 dark:text-orange-300">
                    <AlertCircle className="h-3 w-3 inline mr-1" />
                    <strong>Important:</strong> You will be excluded from voting on your own player's stats.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between gap-2">
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("squad")} disabled={loading}>
                  Back
                </Button>
                {mandatory && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleForceSignOut}
                    className="text-red-600 hover:text-red-700 dark:text-red-400"
                  >
                    Sign Out & Clear Cache
                  </Button>
                )}
              </div>
              <Button onClick={handleComplete} disabled={loading}>
                {loading ? "Completing..." : "Complete Verification"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
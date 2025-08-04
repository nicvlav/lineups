import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { usePlayers } from "@/context/players-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Users, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface PlayerAssignmentProps {
  open: boolean;
  onClose: () => void;
  mandatory?: boolean;
}

export function PlayerAssignment({ open, onClose, mandatory = false }: PlayerAssignmentProps) {
  const { user, assignPlayer, forceSignOut } = useAuth();
  const { players: playersRecord } = usePlayers();
  const players = Object.values(playersRecord);
  
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handlePlayerAssignment = async () => {
    if (!selectedPlayerId) {
      toast.error("Please select a player");
      return;
    }
    
    setLoading(true);
    
    try {
      const { error } = await assignPlayer(selectedPlayerId);
      
      if (error) {
        toast.error(`Player assignment failed: ${error.message}`);
      } else {
        toast.success("Player assigned successfully! You can now participate in voting.");
        onClose();
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const canClose = !mandatory;

  return (
    <Dialog open={open} onOpenChange={canClose ? onClose : undefined}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Player Assignment Required
          </DialogTitle>
          <DialogDescription>
            Your squad ({user?.profile?.squad_id?.slice(0, 8)}...) is verified. Now select which player you are.
          </DialogDescription>
        </DialogHeader>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-4 w-4" />
              Select Your Player
            </CardTitle>
            <CardDescription>
              Choose which player from your squad represents you in the system.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="player">Player</Label>
              <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a player..." />
                </SelectTrigger>
                <SelectContent>
                  {players.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      <div className="flex items-center gap-2">
                        <span>{player.name}</span>
                        {player.vote_count > 0 && (
                          <span className="text-xs text-muted-foreground">
                            ({player.vote_count} votes)
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-muted p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-1">Almost Done!</p>
                  <p className="text-xs">
                    After selecting your player, you'll be able to participate in voting and use all features.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handlePlayerAssignment}
                disabled={loading || !selectedPlayerId}
                className="flex-1"
              >
                {loading ? "Assigning..." : "Assign Player"}
              </Button>
              
              {canClose && (
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
              )}
            </div>

            {mandatory && (
              <div className="text-center pt-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={forceSignOut}
                  className="text-muted-foreground hover:text-destructive"
                >
                  Sign out instead
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
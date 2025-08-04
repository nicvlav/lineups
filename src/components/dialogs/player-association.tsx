import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { usePlayers } from "@/context/players-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { User, UserCheck } from "lucide-react";
import { toast } from "sonner";

interface PlayerAssociationProps {
  open: boolean;
  onClose: () => void;
}

export function PlayerAssociation({ open, onClose }: PlayerAssociationProps) {
  const { user, updateAssociatedPlayer } = useAuth();
  const { players: playersRecord } = usePlayers();
  const players = Object.values(playersRecord);
  
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(
    user?.profile?.associated_player_id || null
  );
  const [loading, setLoading] = useState(false);

  const currentAssociatedPlayer = user?.profile?.associated_player_id 
    ? playersRecord[user.profile.associated_player_id]
    : null;

  const handleSave = async () => {
    if (!selectedPlayerId) {
      toast.error("Please select a player to associate with");
      return;
    }

    setLoading(true);
    try {
      const { error } = await updateAssociatedPlayer(selectedPlayerId);
      if (error) {
        toast.error(`Failed to update association: ${error.message}`);
      } else {
        toast.success(`Successfully associated with ${playersRecord[selectedPlayerId]?.name}`);
        onClose();
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Player Association
          </DialogTitle>
          <DialogDescription>
            Associate your account with a player profile. This will exclude that player from your voting options.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {currentAssociatedPlayer && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Currently associated with:</span>
              </div>
              <div className="mt-1">
                <Badge variant="secondary">{currentAssociatedPlayer.name}</Badge>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium">Select Player:</Label>
            <Select 
              value={selectedPlayerId || ""} 
              onValueChange={setSelectedPlayerId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a player to associate with..." />
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


          <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <strong>Note:</strong> Associating with a player will prevent you from voting on that player's stats, 
              ensuring fair and unbiased community ratings.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={loading || !selectedPlayerId || selectedPlayerId === user?.profile?.associated_player_id}
            >
              {loading ? "Saving..." : "Save Association"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
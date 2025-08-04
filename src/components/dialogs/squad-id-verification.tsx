import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface SquadIdVerificationProps {
  open: boolean;
  onClose: () => void;
  mandatory?: boolean;
}

export function SquadIdVerification({ open, onClose, mandatory = false }: SquadIdVerificationProps) {
  const { verifySquad, forceSignOut } = useAuth();
  const [squadIdInput, setSquadIdInput] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleSquadVerification = async () => {
    const squadId = squadIdInput.trim();
    
    if (!squadId) {
      toast.error("Please enter a squad ID");
      return;
    }

    // Basic UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(squadId)) {
      toast.error("Please enter a valid squad ID format");
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await verifySquad(squadId);
      
      if (error) {
        toast.error(`Squad verification failed: ${error.message}`);
      } else {
        toast.success("Squad verified! You can now assign your player from your profile.");
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
            <Shield className="h-5 w-5" />
            Squad Verification Required
          </DialogTitle>
          <DialogDescription>
            Enter your squad ID to continue. You'll assign your player later from your profile.
          </DialogDescription>
        </DialogHeader>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Enter Squad ID
            </CardTitle>
            <CardDescription>
              Your squad admin should have provided you with a unique squad ID.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="squadId">Squad ID</Label>
              <Input
                id="squadId"
                placeholder="00000000-0000-0000-0000-000000000000"
                value={squadIdInput}
                onChange={(e) => setSquadIdInput(e.target.value)}
                className="font-mono"
              />
            </div>

            <div className="bg-muted p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-1">Next Steps:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• After squad verification, visit your profile</li>
                    <li>• Select which player you are from the list</li>
                    <li>• Once assigned, you can participate in voting</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleSquadVerification}
                disabled={loading || !squadIdInput.trim()}
                className="flex-1"
              >
                {loading ? "Verifying..." : "Verify Squad"}
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
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Users, Check, X, Mail } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function PendingInvites() {
  const navigate = useNavigate();
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(null);

  useEffect(() => {
    fetchInvites();
  }, []);

  const fetchInvites = async () => {
    try {
      const response = await axios.get(`${API}/users/invites`, { withCredentials: true });
      setInvites(response.data);
    } catch (error) {
      console.error("Failed to load invites:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (inviteId, accept) => {
    setResponding(inviteId);
    try {
      const response = await axios.post(
        `${API}/users/invites/${inviteId}/respond`,
        { accept },
        { withCredentials: true }
      );
      
      if (accept) {
        toast.success("Welcome to the group!");
        // Navigate to the group
        navigate(`/groups/${response.data.group_id}`);
      } else {
        toast.info("Invite declined");
      }
      
      // Remove from list
      setInvites(invites.filter(i => i.invite_id !== inviteId));
    } catch (error) {
      toast.error("Failed to respond to invite");
    } finally {
      setResponding(null);
    }
  };

  if (loading) {
    return null;
  }

  if (invites.length === 0) {
    return null;
  }

  return (
    <Card className="bg-card border-primary/50 border-2 mb-6" data-testid="pending-invites">
      <CardHeader className="pb-2">
        <CardTitle className="font-bold flex items-center gap-2 text-primary">
          <Mail className="w-5 h-5" />
          PENDING INVITATIONS ({invites.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {invites.map((invite) => (
            <div
              key={invite.invite_id}
              className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{invite.group?.name || "Unknown Group"}</p>
                  <p className="text-sm text-muted-foreground">
                    Invited by {invite.inviter?.name || "Someone"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRespond(invite.invite_id, false)}
                  disabled={responding === invite.invite_id}
                  className="border-destructive/50 text-destructive hover:bg-destructive/10"
                >
                  <X className="w-4 h-4 mr-1" />
                  Decline
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleRespond(invite.invite_id, true)}
                  disabled={responding === invite.invite_id}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Check className="w-4 h-4 mr-1" />
                  {responding === invite.invite_id ? "Joining..." : "Accept"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

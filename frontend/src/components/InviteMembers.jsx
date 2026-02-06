import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, UserPlus, Mail, Check, Clock, X } from "lucide-react";
import debounce from "lodash.debounce";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function InviteMembers({ groupId, onInviteSent }) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(null);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [mode, setMode] = useState("search"); // "search" or "email"

  useEffect(() => {
    if (open && groupId) {
      fetchPendingInvites();
    }
  }, [open, groupId]);

  const fetchPendingInvites = async () => {
    try {
      const response = await axios.get(`${API}/groups/${groupId}/invites`, { withCredentials: true });
      setPendingInvites(response.data.filter(i => i.status === "pending"));
    } catch (error) {
      // User might not be admin, that's ok
    }
  };

  // Debounced search function
  const searchUsers = useCallback(
    debounce(async (query) => {
      if (query.length < 2) {
        setSearchResults([]);
        setSearching(false);
        return;
      }

      setSearching(true);
      try {
        const response = await axios.get(`${API}/users/search?query=${encodeURIComponent(query)}`, {
          withCredentials: true
        });
        setSearchResults(response.data);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setSearching(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    searchUsers(searchQuery);
  }, [searchQuery, searchUsers]);

  const handleInviteUser = async (userId, userEmail) => {
    setInviting(userId || userEmail);
    try {
      const response = await axios.post(
        `${API}/groups/${groupId}/invite`,
        { email: userEmail },
        { withCredentials: true }
      );
      
      toast.success(response.data.message);
      
      if (response.data.status === "pending_registration") {
        toast.info(response.data.note, { duration: 5000 });
      }
      
      // Clear search
      setSearchQuery("");
      setEmail("");
      setSearchResults([]);
      
      // Refresh pending invites
      fetchPendingInvites();
      
      if (onInviteSent) onInviteSent();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to send invite");
    } finally {
      setInviting(null);
    }
  };

  const handleEmailInvite = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter an email");
      return;
    }
    await handleInviteUser(null, email.trim());
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="invite-member-btn">
          <UserPlus className="w-4 h-4 mr-2" />
          Invite
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-bold text-xl">INVITE MEMBERS</DialogTitle>
        </DialogHeader>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={mode === "search" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("search")}
            className={mode === "search" ? "bg-primary text-primary-foreground" : ""}
          >
            <Search className="w-4 h-4 mr-1" />
            Search Users
          </Button>
          <Button
            variant={mode === "email" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("email")}
            className={mode === "email" ? "bg-primary text-primary-foreground" : ""}
          >
            <Mail className="w-4 h-4 mr-1" />
            Invite by Email
          </Button>
        </div>

        {mode === "search" ? (
          <div className="space-y-4">
            <div>
              <Label>Search by name or email</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Start typing to search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-secondary/50 border-border"
                  data-testid="search-users-input"
                />
              </div>
            </div>

            {/* Search Results */}
            <div className="max-h-60 overflow-y-auto space-y-2">
              {searching && (
                <p className="text-sm text-muted-foreground text-center py-4">Searching...</p>
              )}
              
              {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-muted-foreground text-sm mb-2">No users found</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEmail(searchQuery);
                      setMode("email");
                    }}
                  >
                    <Mail className="w-4 h-4 mr-1" />
                    Invite &quot;{searchQuery}&quot; by email
                  </Button>
                </div>
              )}

              {searchResults.map((user) => (
                <div
                  key={user.user_id}
                  className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={user.picture} />
                      <AvatarFallback>{user.name?.[0] || "?"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                        {user.level && (
                          <span className="text-xs px-1.5 py-0.5 bg-primary/20 text-primary rounded">
                            {user.level}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleInviteUser(user.user_id, user.email)}
                    disabled={inviting === user.user_id}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {inviting === user.user_id ? "Sending..." : "Invite"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <form onSubmit={handleEmailInvite} className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="friend@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-secondary/50 border-border"
                  data-testid="invite-email-input"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                If they&apos;re not registered, the invite will be waiting when they sign up!
              </p>
            </div>
            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={inviting === email}
            >
              {inviting === email ? "Sending..." : "Send Invite"}
            </Button>
          </form>
        )}

        {/* Pending Invites */}
        {pendingInvites.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Pending Invites ({pendingInvites.length})
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {pendingInvites.map((invite) => (
                <div
                  key={invite.invite_id}
                  className="flex items-center justify-between p-2 bg-secondary/20 rounded text-sm"
                >
                  <span className="text-muted-foreground truncate">{invite.invited_email}</span>
                  <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-500 rounded">
                    Pending
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

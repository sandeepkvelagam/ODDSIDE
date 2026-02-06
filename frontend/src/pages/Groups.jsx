import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Users, ChevronRight, DollarSign, Coins } from "lucide-react";
import Navbar from "@/components/Navbar";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

const BUY_IN_OPTIONS = [5, 10, 20, 50, 100];
const CHIP_OPTIONS = [10, 20, 50, 100];

export default function Groups() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    default_buy_in: 20,
    chips_per_buy_in: 20
  });

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await axios.get(`${API}/groups`, { withCredentials: true });
      setGroups(response.data);
    } catch (error) {
      toast.error("Failed to load groups");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Group name is required");
      return;
    }
    
    setCreating(true);
    try {
      const response = await axios.post(`${API}/groups`, formData, { withCredentials: true });
      toast.success("Group created!");
      setDialogOpen(false);
      setFormData({ name: "", description: "", default_buy_in: 20, chips_per_buy_in: 20 });
      fetchGroups();
      navigate(`/groups/${response.data.group_id}`);
    } catch (error) {
      toast.error("Failed to create group");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight">MY GROUPS</h1>
            <p className="text-muted-foreground mt-1">Manage your poker circles</p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-primary text-black hover:bg-primary/90"
                data-testid="create-group-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Group
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="font-heading text-2xl font-bold">CREATE GROUP</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="name">Group Name</Label>
                  <Input
                    id="name"
                    data-testid="group-name-input"
                    placeholder="Friday Night Fellas"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-secondary/50 border-border"
                    autoFocus
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description (optional)</Label>
                  <Input
                    id="description"
                    data-testid="group-description-input"
                    placeholder="Our weekly home game"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="bg-secondary/50 border-border"
                  />
                </div>
                <div>
                  <Label htmlFor="buy_in">Default Buy-In ($)</Label>
                  <Select
                    value={formData.default_buy_in.toString()}
                    onValueChange={(value) => setFormData({ ...formData, default_buy_in: parseFloat(value) })}
                  >
                    <SelectTrigger className="bg-secondary/50 border-border" data-testid="group-buyin-select">
                      <SelectValue placeholder="Select buy-in" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUY_IN_OPTIONS.map((amount) => (
                        <SelectItem key={amount} value={amount.toString()}>
                          ${amount}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="chips">Chips per Buy-In</Label>
                  <Select
                    value={formData.chips_per_buy_in.toString()}
                    onValueChange={(value) => setFormData({ ...formData, chips_per_buy_in: parseInt(value) })}
                  >
                    <SelectTrigger className="bg-secondary/50 border-border" data-testid="group-chips-select">
                      <SelectValue placeholder="Select chips" />
                    </SelectTrigger>
                    <SelectContent>
                      {CHIP_OPTIONS.map((chips) => (
                        <SelectItem key={chips} value={chips.toString()}>
                          {chips} chips
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Chip value: ${(formData.default_buy_in / formData.chips_per_buy_in).toFixed(2)} per chip
                  </p>
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={creating}
                  data-testid="submit-create-group-btn"
                >
                  {creating ? "Creating..." : "Create Group"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Groups List */}
        {groups.length === 0 ? (
          <Card className="bg-card border-border/50 border-dashed">
            <CardContent className="p-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-heading text-xl font-bold mb-2">No Groups Yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first group to start tracking poker nights with friends.
              </p>
              <Button 
                onClick={() => setDialogOpen(true)}
                className="bg-primary text-black hover:bg-primary/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Group
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map(group => (
              <Card 
                key={group.group_id}
                className="bg-card border-border/50 cursor-pointer card-hover"
                onClick={() => navigate(`/groups/${group.group_id}`)}
                data-testid={`group-card-${group.group_id}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                    <span className="text-xs px-2 py-1 bg-secondary rounded-full text-muted-foreground uppercase">
                      {group.user_role}
                    </span>
                  </div>
                  <h3 className="font-heading text-xl font-bold mb-1">{group.name}</h3>
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                    {group.description || "No description"}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {group.member_count} member{group.member_count !== 1 ? 's' : ''}
                    </span>
                    <div className="flex items-center text-muted-foreground">
                      <DollarSign className="w-4 h-4 mr-1" />
                      {group.default_buy_in} buy-in
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

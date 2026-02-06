import { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Trophy, Star, Target, TrendingUp } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function UserBadges({ compact = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBadges();
  }, []);

  const fetchBadges = async () => {
    try {
      const response = await axios.get(`${API}/users/me/badges`, { withCredentials: true });
      setData(response.data);
    } catch (error) {
      console.error("Failed to load badges:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse bg-secondary/30 rounded-lg h-32" />
    );
  }

  if (!data) return null;

  const { level, progress, stats, badges, earned_count, total_badges } = data;

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full">
          <span className="text-lg">{level.icon}</span>
          <span className="font-bold text-primary">{level.name}</span>
        </div>
        {progress && (
          <span className="text-xs text-muted-foreground">
            {progress.games_needed} games to {progress.next_level}
          </span>
        )}
      </div>
    );
  }

  return (
    <Card className="bg-card border-border/50">
      <CardHeader>
        <CardTitle className="font-bold flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          LEVEL & BADGES
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Level */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/20 to-primary/5 rounded-xl">
          <div className="flex items-center gap-4">
            <div className="text-4xl">{level.icon}</div>
            <div>
              <h3 className="text-2xl font-bold">{level.name}</h3>
              <p className="text-muted-foreground text-sm">
                {stats.total_games} games played • ${stats.total_profit >= 0 ? '+' : ''}{stats.total_profit.toFixed(0)} lifetime
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{stats.win_rate}%</p>
            <p className="text-xs text-muted-foreground">Win Rate</p>
          </div>
        </div>

        {/* Progress to Next Level */}
        {progress && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress to {progress.next_level}</span>
              <span className="font-medium">{Math.round(progress.games_progress)}%</span>
            </div>
            <Progress value={progress.games_progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{progress.games_needed} more games needed</span>
              {progress.profit_needed > 0 && (
                <span>${progress.profit_needed.toFixed(0)} more profit needed</span>
              )}
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-secondary/30 rounded-lg">
            <Target className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
            <p className="font-bold text-lg">{stats.total_games}</p>
            <p className="text-xs text-muted-foreground">Games</p>
          </div>
          <div className="text-center p-3 bg-secondary/30 rounded-lg">
            <Star className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
            <p className="font-bold text-lg">{stats.wins}</p>
            <p className="text-xs text-muted-foreground">Wins</p>
          </div>
          <div className="text-center p-3 bg-secondary/30 rounded-lg">
            <TrendingUp className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className={`font-bold text-lg ${stats.total_profit >= 0 ? 'text-primary' : 'text-destructive'}`}>
              ${stats.total_profit >= 0 ? '+' : ''}{stats.total_profit.toFixed(0)}
            </p>
            <p className="text-xs text-muted-foreground">Profit</p>
          </div>
        </div>

        {/* Badges */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-bold">Badges</h4>
            <span className="text-sm text-muted-foreground">{earned_count}/{total_badges} earned</span>
          </div>
          <TooltipProvider>
            <div className="flex flex-wrap gap-2">
              {badges.map((badge) => (
                <Tooltip key={badge.id}>
                  <TooltipTrigger>
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl transition-all ${
                      badge.earned 
                        ? 'bg-primary/20 hover:bg-primary/30' 
                        : 'bg-secondary/30 opacity-40 grayscale'
                    }`}>
                      {badge.icon}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-bold">{badge.name}</p>
                    <p className="text-xs text-muted-foreground">{badge.description}</p>
                    {!badge.earned && <p className="text-xs text-primary mt-1">Not yet earned</p>}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}

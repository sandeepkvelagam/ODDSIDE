import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Zap,
  Plus,
  ArrowLeft,
  Trash2,
  Play,
  Clock,
  Bell,
  Mail,
  CreditCard,
  CalendarPlus,
  FileText,
  UserCheck,
  MoreVertical,
  ChevronRight,
  History,
  Settings,
  AlertCircle,
  RefreshCcw,
  Heart,
  Activity,
  Gauge,
} from "lucide-react";
import Navbar from "@/components/Navbar";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

const TRIGGER_ICONS = {
  game_ended: "🏁",
  game_created: "🎮",
  settlement_generated: "💰",
  payment_due: "💳",
  payment_overdue: "⚠️",
  payment_received: "✅",
  player_confirmed: "👤",
  all_players_confirmed: "👥",
  schedule: "🕐",
};

const ACTION_ICONS = {
  send_notification: Bell,
  send_email: Mail,
  send_payment_reminder: CreditCard,
  auto_rsvp: UserCheck,
  create_game: CalendarPlus,
  generate_summary: FileText,
};

const HEALTH_STATUS = {
  healthy: { label: "Healthy", color: "bg-green-500", textColor: "text-green-700", bgLight: "bg-green-50" },
  warning: { label: "Warning", color: "bg-yellow-500", textColor: "text-yellow-700", bgLight: "bg-yellow-50" },
  critical: { label: "Critical", color: "bg-red-500", textColor: "text-red-700", bgLight: "bg-red-50" },
  disabled: { label: "Disabled", color: "bg-gray-400", textColor: "text-gray-600", bgLight: "bg-gray-50" },
  new: { label: "New", color: "bg-blue-500", textColor: "text-blue-700", bgLight: "bg-blue-50" },
};

export default function Automations() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [automations, setAutomations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showHistory, setShowHistory] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [costBudget, setCostBudget] = useState(null);

  // Create form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formTriggerType, setFormTriggerType] = useState("");
  const [formActionType, setFormActionType] = useState("");
  const [formActionTitle, setFormActionTitle] = useState("");
  const [formActionMessage, setFormActionMessage] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user?.user_id) {
      fetchAutomations();
      fetchCostBudget();
    }
  }, [user?.user_id]);

  const fetchAutomations = async () => {
    try {
      const res = await axios.get(`${API}/automations`);
      setAutomations(res.data?.data?.automations || []);
    } catch (error) {
      toast.error("Failed to load automations");
    } finally {
      setLoading(false);
    }
  };

  const fetchCostBudget = async () => {
    try {
      const res = await axios.get(`${API}/automations/usage/cost-budget`);
      setCostBudget(res.data?.data || null);
    } catch {
      // Non-critical — silently fail
    }
  };

  const handleReplay = async (automationId) => {
    try {
      const res = await axios.post(`${API}/automations/${automationId}/replay`);
      toast.success(res.data?.message || "Replay completed");
      fetchAutomations();
      fetchCostBudget();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Replay failed");
    }
  };

  const handleToggle = async (automationId) => {
    try {
      const res = await axios.post(`${API}/automations/${automationId}/toggle`);
      toast.success(res.data?.message || "Automation toggled");
      fetchAutomations();
    } catch (error) {
      toast.error("Failed to toggle automation");
    }
  };

  const handleDelete = async (automationId) => {
    if (!window.confirm("Delete this automation? This cannot be undone.")) return;
    try {
      await axios.delete(`${API}/automations/${automationId}`);
      toast.success("Automation deleted");
      fetchAutomations();
    } catch (error) {
      toast.error("Failed to delete automation");
    }
  };

  const handleDryRun = async (automationId) => {
    try {
      const res = await axios.post(`${API}/automations/${automationId}/run`);
      toast.success(res.data?.message || "Dry run completed");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Dry run failed");
    }
  };

  const handleViewHistory = async (automationId) => {
    setShowHistory(automationId);
    setHistoryLoading(true);
    try {
      const res = await axios.get(`${API}/automations/${automationId}/history`);
      setHistoryData(res.data?.data || []);
    } catch (error) {
      toast.error("Failed to load history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const res = await axios.get(`${API}/automations/templates`);
      setTemplates(res.data?.data?.templates || []);
      setShowTemplates(true);
    } catch (error) {
      toast.error("Failed to load templates");
    }
  };

  const applyTemplate = (template) => {
    setFormName(template.name || "");
    setFormDescription(template.description || "");
    setFormTriggerType(template.trigger?.type || "");
    if (template.actions?.length > 0) {
      setFormActionType(template.actions[0].type || "");
      setFormActionTitle(template.actions[0].params?.title || "");
      setFormActionMessage(template.actions[0].params?.message || template.actions[0].params?.body || "");
    }
    setShowTemplates(false);
    setShowCreate(true);
  };

  const handleCreate = async () => {
    if (!formName || !formTriggerType || !formActionType) {
      toast.error("Please fill in name, trigger, and action");
      return;
    }

    setCreating(true);
    try {
      const actionParams = {};
      if (formActionTitle) actionParams.title = formActionTitle;
      if (formActionMessage) {
        actionParams.message = formActionMessage;
        actionParams.body = formActionMessage;
        actionParams.subject = formActionTitle;
      }

      await axios.post(`${API}/automations`, {
        name: formName,
        description: formDescription,
        trigger: { type: formTriggerType },
        actions: [{ type: formActionType, params: actionParams }],
      });
      toast.success("Automation created!");
      setShowCreate(false);
      resetForm();
      fetchAutomations();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create automation");
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormTriggerType("");
    setFormActionType("");
    setFormActionTitle("");
    setFormActionMessage("");
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "Never";
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-4xl mx-auto p-6 flex items-center justify-center" style={{ minHeight: "60vh" }}>
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Zap className="w-6 h-6 text-primary" />
                Automations
              </h1>
              <p className="text-sm text-muted-foreground">
                IFTTT-style rules that run automatically
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {costBudget && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground border rounded-md px-2 py-1">
                <Gauge className="w-3.5 h-3.5" />
                <span>{costBudget.cost_budget_remaining}/{costBudget.max_daily_cost_points} pts</span>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={loadTemplates}>
              Templates
            </Button>
            <Button size="sm" onClick={() => { resetForm(); setShowCreate(true); }}>
              <Plus className="w-4 h-4 mr-1" />
              New
            </Button>
          </div>
        </div>

        {/* Empty State */}
        {automations.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Zap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No automations yet</h3>
              <p className="text-muted-foreground mb-4">
                Create rules that trigger automatically — like auto-RSVP to games,
                payment reminders, or post-game summaries.
              </p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={loadTemplates}>
                  Browse Templates
                </Button>
                <Button onClick={() => { resetForm(); setShowCreate(true); }}>
                  <Plus className="w-4 h-4 mr-1" />
                  Create Automation
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Automations List */}
        <div className="space-y-3">
          {automations.map((auto) => {
            const ActionIcon = ACTION_ICONS[auto.actions?.[0]?.type] || Zap;
            const health = auto.health || {};
            const healthConfig = HEALTH_STATUS[health.status] || HEALTH_STATUS.new;
            return (
              <Card key={auto.automation_id} className={!auto.enabled ? "opacity-60" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{TRIGGER_ICONS[auto.trigger?.type] || "⚡"}</span>
                        <h3 className="font-semibold truncate">{auto.name}</h3>
                        {/* Health indicator */}
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${healthConfig.bgLight} ${healthConfig.textColor}`}
                          title={health.reasons?.join(", ") || ""}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${healthConfig.color}`} />
                          {healthConfig.label}
                          {health.score !== undefined && health.status !== "new" && health.status !== "disabled" && (
                            <span className="opacity-70">{health.score}</span>
                          )}
                        </span>
                        {auto.engine_version && (
                          <span className="text-[10px] text-muted-foreground font-mono">{auto.engine_version}</span>
                        )}
                      </div>
                      {auto.description && (
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {auto.description}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="text-xs font-normal">
                          {auto.trigger?.type?.replace(/_/g, " ")}
                        </Badge>
                        <span>→</span>
                        {auto.actions?.map((a, i) => (
                          <Badge key={i} variant="outline" className="text-xs font-normal">
                            {a.type?.replace(/_/g, " ")}
                          </Badge>
                        ))}
                        {auto.run_count > 0 && (
                          <span className="ml-2">
                            {auto.run_count} runs
                            {auto.error_count > 0 && ` · ${auto.error_count} errors`}
                            {auto.last_run && ` · Last: ${formatDate(auto.last_run)}`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Test (dry run)"
                        onClick={() => handleDryRun(auto.automation_id)}
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Force replay"
                        onClick={() => handleReplay(auto.automation_id)}
                      >
                        <RefreshCcw className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="History"
                        onClick={() => handleViewHistory(auto.automation_id)}
                      >
                        <History className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        title="Delete"
                        onClick={() => handleDelete(auto.automation_id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Switch
                        checked={auto.enabled}
                        onCheckedChange={() => handleToggle(auto.automation_id)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              New Automation
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="auto-name">Name</Label>
              <Input
                id="auto-name"
                placeholder="e.g., Auto-RSVP to Friday games"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="auto-desc">Description (optional)</Label>
              <Input
                id="auto-desc"
                placeholder="What does this automation do?"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>
            <div>
              <Label>When this happens (Trigger)</Label>
              <Select value={formTriggerType} onValueChange={setFormTriggerType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a trigger..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="game_created">🎮 Game Created</SelectItem>
                  <SelectItem value="game_ended">🏁 Game Ended</SelectItem>
                  <SelectItem value="settlement_generated">💰 Settlement Generated</SelectItem>
                  <SelectItem value="payment_due">💳 Payment Due</SelectItem>
                  <SelectItem value="payment_overdue">⚠️ Payment Overdue</SelectItem>
                  <SelectItem value="payment_received">✅ Payment Received</SelectItem>
                  <SelectItem value="player_confirmed">👤 Player Confirmed</SelectItem>
                  <SelectItem value="all_players_confirmed">👥 All Players Confirmed</SelectItem>
                  <SelectItem value="schedule">🕐 On a Schedule</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Do this (Action)</Label>
              <Select value={formActionType} onValueChange={setFormActionType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an action..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="send_notification">🔔 Send Notification</SelectItem>
                  <SelectItem value="send_email">📧 Send Email</SelectItem>
                  <SelectItem value="send_payment_reminder">💳 Send Payment Reminder</SelectItem>
                  <SelectItem value="auto_rsvp">✋ Auto-RSVP</SelectItem>
                  <SelectItem value="create_game">📅 Create Game</SelectItem>
                  <SelectItem value="generate_summary">📊 Generate Summary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(formActionType === "send_notification" || formActionType === "send_email") && (
              <>
                <div>
                  <Label htmlFor="action-title">Title / Subject</Label>
                  <Input
                    id="action-title"
                    placeholder="Notification title"
                    value={formActionTitle}
                    onChange={(e) => setFormActionTitle(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="action-message">Message / Body</Label>
                  <Input
                    id="action-message"
                    placeholder="Message content"
                    value={formActionMessage}
                    onChange={(e) => setFormActionMessage(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Creating..." : "Create Automation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={!!showHistory} onOpenChange={() => setShowHistory(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Run History
            </DialogTitle>
          </DialogHeader>
          {historyLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : historyData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-2" />
              <p>No runs yet</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-2">
              {historyData.map((run, i) => (
                <div key={run.run_id || i} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          run.status === "success" ? "default" :
                          run.status === "completed" ? "default" :
                          run.status === "skipped" ? "secondary" :
                          "destructive"
                        }
                        className="text-xs"
                      >
                        {run.status}
                      </Badge>
                      {run.force_replay && (
                        <Badge variant="outline" className="text-xs">
                          <RefreshCcw className="w-3 h-3 mr-0.5" />
                          replay
                        </Badge>
                      )}
                      {run.policy_block_reason_enum && (
                        <span className="text-xs text-muted-foreground">
                          {run.policy_block_reason_enum.replace(/_/g, " ")}
                        </span>
                      )}
                      {run.reason && !run.policy_block_reason_enum && (
                        <span className="text-xs text-muted-foreground">
                          {run.reason.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(run.created_at || run.started_at)}
                      {run.duration_ms ? ` · ${run.duration_ms}ms` : ""}
                      {run.trigger_latency_ms ? ` · latency: ${run.trigger_latency_ms}ms` : ""}
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    {run.action_results && (
                      <span>
                        {run.action_results.filter(a => a.success).length}/{run.action_results.length} actions
                      </span>
                    )}
                    {run.engine_version && (
                      <span className="block font-mono opacity-50">{run.engine_version}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Templates Dialog */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Automation Templates</DialogTitle>
          </DialogHeader>
          {templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No templates available</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-2">
              {templates.map((tpl, i) => (
                <button
                  key={i}
                  className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors"
                  onClick={() => applyTemplate(tpl)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-sm">{tpl.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {tpl.description}
                      </p>
                      <div className="flex gap-1 mt-2">
                        <Badge variant="secondary" className="text-xs">
                          {tpl.trigger?.type?.replace(/_/g, " ")}
                        </Badge>
                        <span className="text-xs text-muted-foreground">→</span>
                        {tpl.actions?.map((a, j) => (
                          <Badge key={j} variant="outline" className="text-xs">
                            {a.type?.replace(/_/g, " ")}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

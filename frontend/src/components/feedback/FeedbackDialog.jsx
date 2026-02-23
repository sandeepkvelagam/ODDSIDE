import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  MessageSquare,
  Bug,
  Lightbulb,
  HandMetal,
  Frown,
  Heart,
  CheckCircle,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/ui/star-rating";
import { cn } from "@/lib/utils";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

const FEEDBACK_TYPES = [
  { key: "bug", label: "Bug", icon: Bug, color: "text-red-500 bg-red-500/10 border-red-500/30" },
  { key: "feature_request", label: "Feature", icon: Lightbulb, color: "text-amber-500 bg-amber-500/10 border-amber-500/30" },
  { key: "ux_issue", label: "UX Issue", icon: HandMetal, color: "text-blue-500 bg-blue-500/10 border-blue-500/30" },
  { key: "complaint", label: "Complaint", icon: Frown, color: "text-purple-500 bg-purple-500/10 border-purple-500/30" },
  { key: "praise", label: "Praise", icon: Heart, color: "text-green-500 bg-green-500/10 border-green-500/30" },
  { key: "other", label: "Other", icon: MessageSquare, color: "text-slate-500 bg-slate-500/10 border-slate-500/30" },
];

const PLACEHOLDERS = {
  bug: "What happened? What did you expect to happen?",
  feature_request: "What feature would you like to see?",
  ux_issue: "What was confusing or hard to use?",
  complaint: "What went wrong? We want to make it right.",
  praise: "What did you love? We appreciate the kind words!",
  other: "Tell us what's on your mind...",
};

/**
 * FeedbackDialog - Modal dialog for submitting feedback from the web app.
 *
 * Can be triggered from Navbar, Dashboard, or any page.
 * Submits to POST /feedback endpoint.
 */
export function FeedbackDialog({ open, onOpenChange }) {
  const [selectedType, setSelectedType] = useState(null);
  const [content, setContent] = useState("");
  const [severity, setSeverity] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!selectedType) {
      toast.error("Please select a feedback type");
      return;
    }
    if (!content.trim()) {
      toast.error("Please describe your feedback");
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.post(`${API}/feedback`, {
        feedback_type: selectedType,
        content: content.trim(),
        tags: severity > 0 ? [`severity_${severity}`] : [],
        context: {
          source: "web_feedback_dialog",
          severity_rating: severity || undefined,
        },
      });

      setSubmitted(true);
    } catch (err) {
      const msg = err?.response?.data?.detail || "Failed to submit. Please try again.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedType(null);
    setContent("");
    setSeverity(0);
    setSubmitted(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        {submitted ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Feedback Sent!</h3>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              {selectedType === "praise"
                ? "Thanks for the love! It means a lot to our team."
                : "We'll review this and take action. You'll be notified when there's an update."}
            </p>
            <Button onClick={handleClose} className="mt-2">Done</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Report an Issue</DialogTitle>
              <DialogDescription>
                Help us improve by sharing your feedback
              </DialogDescription>
            </DialogHeader>

            {/* Type Selector */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Type
              </label>
              <div className="flex flex-wrap gap-2">
                {FEEDBACK_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isSelected = selectedType === type.key;
                  return (
                    <button
                      key={type.key}
                      type="button"
                      onClick={() => setSelectedType(type.key)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all",
                        isSelected
                          ? type.color
                          : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {type.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Details
              </label>
              <Textarea
                placeholder={PLACEHOLDERS[selectedType] || PLACEHOLDERS.other}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            {/* Severity for bugs/complaints */}
            {(selectedType === "bug" || selectedType === "complaint") && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Severity
                </label>
                <div className="flex items-center gap-3">
                  <StarRating
                    rating={severity}
                    onRatingChange={setSeverity}
                    size="sm"
                  />
                  <span className="text-xs text-muted-foreground">
                    {severity === 0
                      ? "How bad is it?"
                      : severity <= 2
                      ? "Minor issue"
                      : severity <= 4
                      ? "Significant problem"
                      : "Can't use the app"}
                  </span>
                </div>
              </div>
            )}

            {/* Submit */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!selectedType || !content.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Feedback"
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { CheckCircle, Loader2 } from "lucide-react";
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

const API = process.env.REACT_APP_BACKEND_URL + "/api";

/**
 * PostGameSurveyDialog - Shown after a game ends to collect star rating.
 *
 * Props:
 * - open: boolean
 * - onOpenChange: (open: boolean) => void
 * - gameId: string
 * - groupId?: string
 */
export function PostGameSurveyDialog({ open, onOpenChange, gameId, groupId }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.post(`${API}/feedback/survey`, {
        game_id: gameId,
        group_id: groupId,
        rating,
        comment: comment.trim(),
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
    setRating(0);
    setComment("");
    setSubmitted(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px]">
        {submitted ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              {rating <= 2 ? "We hear you" : "Thanks for the feedback!"}
            </h3>
            <p className="text-sm text-muted-foreground text-center">
              {rating <= 2
                ? "Sorry this didn't go smoothly tonight. We'll look into what went wrong and follow up."
                : rating === 3
                ? "Thanks for the honest feedback. We're always working to make things better."
                : rating === 4
                ? "Thanks for the rating! Glad the game went well."
                : "Awesome, glad you had a great time!"}
            </p>
            <Button onClick={handleClose} className="mt-2">Done</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>How was your game?</DialogTitle>
              <DialogDescription>
                Your feedback helps improve the experience
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center gap-6 py-4">
              <StarRating
                rating={rating}
                onRatingChange={setRating}
                size="lg"
                showLabel
              />

              <div className="w-full space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Anything else? (optional)
                </label>
                <Textarea
                  placeholder={
                    rating <= 2
                      ? "What went wrong? We want to fix it..."
                      : "Any thoughts or suggestions..."
                  }
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                onClick={handleSubmit}
                disabled={rating === 0 || isSubmitting}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Rating"
                )}
              </Button>
              <Button variant="ghost" onClick={handleClose} className="w-full">
                Skip for now
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { feedbackApi } from '../../api/endpoints';
import { useToast } from '../../components/ui/Toast';
import { Modal } from '../../components/ui/Modal';
import { Star, ThumbsUp, ThumbsDown, CheckCircle2, AlertTriangle, MessageSquare } from 'lucide-react';

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  complaintId: string;
  issueName: string;
  locationIdentifier?: string;
}

export const VerificationModal: React.FC<VerificationModalProps> = ({
  isOpen,
  onClose,
  complaintId,
  issueName,
  locationIdentifier,
}) => {
  const [isSatisfied, setIsSatisfied] = useState<boolean | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comments, setComments] = useState('');

  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: feedbackApi.submit,
    onSuccess: (data) => {
      showToast(
        data.message || (isSatisfied ? 'Ticket closed & completed!' : 'Ticket escalated to supervisor.'),
        isSatisfied ? 'success' : 'error'
      );
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      onClose();
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to submit feedback', 'error');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSatisfied === null) return;

    mutation.mutate({
      complaint_id: complaintId,
      is_satisfied: isSatisfied,
      rating: isSatisfied ? rating : null,
      comments: comments.trim() || null,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Close the Loop — Confirm Work"
      subtitle={`Ticket: ${issueName} (${locationIdentifier || 'Room'})`}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Are you satisfied with the technician's work? *
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIsSatisfied(true)}
              className={`p-3.5 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all ${
                isSatisfied === true
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/10 scale-[1.02]'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <ThumbsUp className="w-4 h-4" />
              <span>YES, RESOLVED</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSatisfied(false)}
              className={`p-3.5 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all ${
                isSatisfied === false
                  ? 'bg-rose-500/20 border-rose-500 text-rose-400 shadow-lg shadow-rose-500/10 scale-[1.02]'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <ThumbsDown className="w-4 h-4" />
              <span>NO, NOT FIXED</span>
            </button>
          </div>
        </div>

        {/* Consequence Callout Banner */}
        {isSatisfied !== null && (
          <div
            className={`p-3.5 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 animate-fadeIn ${
              isSatisfied
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                : 'bg-rose-950/40 border-rose-500/30 text-rose-200'
            }`}
          >
            {isSatisfied ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div>
              <span className="font-bold block mb-0.5">
                {isSatisfied ? 'Closing Ticket' : 'Escalating Ticket'}
              </span>
              <span>
                {isSatisfied
                  ? 'Confirming marks this complaint as COMPLETED and permanently closes this ticket.'
                  : 'Reporting an issue ESCALATES this ticket back to the supervisor queue for priority re-inspection.'}
              </span>
            </div>
          </div>
        )}

        {/* Rating Stars (Visible when satisfied) */}
        {isSatisfied === true && (
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-center">
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Rate Service Quality (1 - 5 Stars)
            </label>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="p-1 text-amber-400 hover:scale-125 transition-transform"
                >
                  <Star
                    className={`w-7 h-7 ${
                      star <= (hoverRating || rating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-700 fill-slate-900'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-2 font-medium">
              {rating === 5 && 'Outstanding service'}
              {rating === 4 && 'Good service'}
              {rating === 3 && 'Average service'}
              {rating === 2 && 'Poor service'}
              {rating === 1 && 'Unsatisfactory service'}
            </p>
          </div>
        )}

        {/* Comments */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
            <span>Comments / Feedback (Optional)</span>
          </label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder={
              isSatisfied
                ? 'Thank technician Ramesh for prompt fix...'
                : 'Explain what remains broken...'
            }
            rows={3}
            className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 hover:text-white text-xs font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSatisfied === null || mutation.isPending}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg flex items-center gap-1.5 disabled:opacity-40 transition-all ${
              isSatisfied
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
            }`}
          >
            {mutation.isPending ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span>Submit & Close Loop</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

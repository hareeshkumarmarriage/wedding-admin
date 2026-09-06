import { useEffect } from "react";
import { CheckCircle2, Info, Loader2, TriangleAlert, XCircle } from "lucide-react";

export type AdminFeedbackKind = "loading" | "success" | "error" | "warning" | "info";
export type AdminFeedback = {
  kind: AdminFeedbackKind;
  title: string;
  message?: string;
  duration?: number;
};

export const ADMIN_FEEDBACK_EVENT = "wedding-admin-feedback";

export function showAdminFeedback(feedback: AdminFeedback) {
  window.dispatchEvent(new CustomEvent<AdminFeedback>(ADMIN_FEEDBACK_EVENT, { detail: feedback }));
}

export function adminLoading(title: string, message = "Please wait…") {
  showAdminFeedback({ kind: "loading", title, message });
}

export function adminSuccess(title: string, message?: string) {
  showAdminFeedback({ kind: "success", title, message });
}

export function adminError(title: string, message?: string) {
  showAdminFeedback({ kind: "error", title, message, duration: 9000 });
}

export function adminWarning(title: string, message?: string) {
  showAdminFeedback({ kind: "warning", title, message, duration: 7000 });
}

export function adminInfo(title: string, message?: string) {
  showAdminFeedback({ kind: "info", title, message });
}

export default function AdminActionFeedback({ feedback, onClose }: { feedback: AdminFeedback | null; onClose: () => void }) {
  useEffect(() => {
    if (!feedback || feedback.kind === "loading") return;
    const timer = window.setTimeout(onClose, feedback.duration ?? 4500);
    return () => window.clearTimeout(timer);
  }, [feedback, onClose]);

  if (!feedback) return null;
  const Icon = feedback.kind === "loading" ? Loader2 : feedback.kind === "success" ? CheckCircle2 : feedback.kind === "error" ? XCircle : feedback.kind === "warning" ? TriangleAlert : Info;
  const tone = feedback.kind === "success" ? "border-emerald-200" : feedback.kind === "error" ? "border-red-200" : feedback.kind === "warning" ? "border-amber-200" : feedback.kind === "loading" ? "border-primary/30" : "border-border";

  return (
    <div className="fixed inset-x-3 top-[4.5rem] z-[200] mx-auto w-auto max-w-xl md:left-auto md:right-5 md:inset-x-auto md:w-[420px]" role="status" aria-live="polite">
      <div className={`rounded-2xl border bg-background p-4 shadow-2xl ${tone}`}>
        <div className="flex items-start gap-3">
          <Icon size={20} className={feedback.kind === "loading" ? "animate-spin" : "shrink-0"} />
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{feedback.title}</div>
            {feedback.message && <div className="mt-1 text-sm text-muted-foreground">{feedback.message}</div>}
          </div>
          {feedback.kind !== "loading" && <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-sm hover:bg-muted" aria-label="Close notification">×</button>}
        </div>
      </div>
    </div>
  );
}

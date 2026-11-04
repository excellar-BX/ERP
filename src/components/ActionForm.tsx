"use client";

import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/lib/actions";
import { primaryButton } from "./ui";

// A form wired to a server action that shows the action's error or success message.
export function ActionForm({
  action,
  children,
  className,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  children: ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className={className}>
      {children}
      {state.error && <p className="text-sm text-red-600 sm:col-span-full">{state.error}</p>}
      {state.ok && <p className="text-sm text-emerald-700 sm:col-span-full">{state.ok}</p>}
    </form>
  );
}

export function SubmitButton({ children, className = primaryButton }: { children: ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? "Saving…" : children}
    </button>
  );
}

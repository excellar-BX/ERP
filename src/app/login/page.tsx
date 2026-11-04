import { redirect } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Field, inputClass, primaryButton } from "@/components/ui";
import { getCurrentUser, hasAnyUser } from "@/lib/auth";
import { login, setupOwner } from "@/lib/auth-actions";

export const metadata = { title: "Log in · Smart ERP" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getCurrentUser()) redirect("/");
  const [{ next = "/" }, isSetUp] = await Promise.all([searchParams, hasAnyUser()]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Smart ERP</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isSetUp ? "Log in to your shop" : "Welcome! Create the owner account to get started."}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {isSetUp ? (
            <ActionForm action={login} className="grid gap-4">
              <input type="hidden" name="next" value={next} />
              <Field label="Username">
                <input name="username" autoComplete="username" autoCapitalize="none" required autoFocus className={inputClass} />
              </Field>
              <Field label="Password">
                <input name="password" type="password" autoComplete="current-password" required className={inputClass} />
              </Field>
              <SubmitButton className={`${primaryButton} w-full py-2.5`}>Log in</SubmitButton>
            </ActionForm>
          ) : (
            <ActionForm action={setupOwner} className="grid gap-4">
              <Field label="Your name">
                <input name="name" autoComplete="name" required autoFocus className={inputClass} />
              </Field>
              <Field label="Username" hint="Lowercase letters and numbers, e.g. ravi">
                <input name="username" autoComplete="username" autoCapitalize="none" required className={inputClass} />
              </Field>
              <Field label="Password" hint="At least 8 characters.">
                <input name="password" type="password" autoComplete="new-password" minLength={8} required className={inputClass} />
              </Field>
              <Field label="Confirm password">
                <input name="confirm" type="password" autoComplete="new-password" minLength={8} required className={inputClass} />
              </Field>
              <SubmitButton className={`${primaryButton} w-full py-2.5`}>Create owner account</SubmitButton>
            </ActionForm>
          )}
        </div>
      </div>
    </div>
  );
}

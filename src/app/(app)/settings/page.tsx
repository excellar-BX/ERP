import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Badge, Card, Field, PageHeader, inputClass, secondaryButton } from "@/components/ui";
import { loadDemoData, saveSettings } from "@/lib/actions";
import { requireOwner } from "@/lib/auth";
import { addUser, removeUser, resetPassword } from "@/lib/auth-actions";
import { listProducts, getSettings, listUsers } from "@/lib/queries";

export default async function SettingsPage() {
  const me = await requireOwner();
  const [settings, products, users] = await Promise.all([getSettings(), listProducts(), listUsers()]);
  const isEmpty = products.length === 0;

  return (
    <>
      <PageHeader title="Settings" subtitle="Shown on bills, reminders and the daily summary." />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card title="Business details">
          <ActionForm action={saveSettings} className="grid gap-4 sm:grid-cols-2">
            <Field label="Business name">
              <input name="businessName" required defaultValue={settings.businessName} className={inputClass} />
            </Field>
            <Field label="Phone">
              <input name="phone" type="tel" defaultValue={settings.phone} className={inputClass} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Address">
                <textarea name="address" rows={2} defaultValue={settings.address} className={inputClass} />
              </Field>
            </div>
            <Field label="GSTIN (optional)">
              <input name="gstin" defaultValue={settings.gstin} className={inputClass} />
            </Field>
            <Field label="UPI ID" hint="Added to payment reminders, e.g. myshop@okaxis">
              <input name="upiId" defaultValue={settings.upiId} className={inputClass} />
            </Field>
            <Field label="Owner's WhatsApp number" hint="Where the daily summary is sent.">
              <input name="ownerWhatsapp" type="tel" defaultValue={settings.ownerWhatsapp} className={inputClass} />
            </Field>
            <div className="sm:col-span-2">
              <SubmitButton>Save settings</SubmitButton>
            </div>
          </ActionForm>
        </Card>

        {isEmpty && (
          <Card title="Try it out" className="h-fit">
            <p className="mb-4 text-sm text-slate-600">
              Load sample grocery products and customers to explore billing, low-stock alerts and dues.
            </p>
            <ActionForm action={loadDemoData}>
              <SubmitButton className={secondaryButton}>Load demo data</SubmitButton>
            </ActionForm>
          </Card>
        )}

        <Card title="Users" className="lg:col-span-2">
          <p className="mb-4 text-sm text-slate-600">
            Staff can make bills, manage stock and record payments. Only owners can change settings and manage users.
          </p>
          <ul className="mb-6 divide-y divide-slate-100">
            {users.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span>
                  <span className="font-medium">{u.name}</span>{" "}
                  <span className="text-sm text-slate-500">@{u.username}</span>{" "}
                  <Badge tone={u.role === "owner" ? "good" : "default"}>{u.role === "owner" ? "Owner" : "Staff"}</Badge>
                  {u.id === me.id && <span className="ml-2 text-xs text-slate-500">(you)</span>}
                </span>
                <span className="flex flex-wrap items-start gap-2">
                  <ActionForm action={resetPassword} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={u.id} />
                    <input
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      required
                      placeholder="New password"
                      aria-label={`New password for ${u.name}`}
                      className={`${inputClass} w-40`}
                    />
                    <SubmitButton className={secondaryButton}>Set password</SubmitButton>
                  </ActionForm>
                  {u.id !== me.id && (
                    <form action={removeUser}>
                      <input type="hidden" name="id" value={u.id} />
                      <button type="submit" className={`${secondaryButton} text-red-600`}>
                        Remove
                      </button>
                    </form>
                  )}
                </span>
              </li>
            ))}
          </ul>

          <h3 className="mb-3 text-sm font-semibold text-slate-900">Add a user</h3>
          <ActionForm action={addUser} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
            <Field label="Name">
              <input name="name" required className={inputClass} />
            </Field>
            <Field label="Username">
              <input name="username" autoCapitalize="none" required className={inputClass} />
            </Field>
            <Field label="Password">
              <input name="password" type="password" autoComplete="new-password" minLength={8} required className={inputClass} />
            </Field>
            <Field label="Role">
              <select name="role" defaultValue="staff" className={inputClass}>
                <option value="staff">Staff</option>
                <option value="owner">Owner</option>
              </select>
            </Field>
            <div>
              <SubmitButton>Add user</SubmitButton>
            </div>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}

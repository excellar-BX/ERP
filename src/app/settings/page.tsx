import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Card, Field, PageHeader, inputClass, secondaryButton } from "@/components/ui";
import { loadDemoData, saveSettings } from "@/lib/actions";
import { listProducts, getSettings } from "@/lib/queries";

export default async function SettingsPage() {
  const [settings, products] = await Promise.all([getSettings(), listProducts()]);
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
      </div>
    </>
  );
}

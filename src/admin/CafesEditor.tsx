import { useState } from 'react';
import { BRANCH_SLUGS, type BranchSlug, type ContentBundle } from '@/lib/schema';
import { directionsUrl, waLink, waNumber } from '@/lib/links';
import { Card, Field, Input, Segmented, TextArea, Toggle } from './ui';

type Update = (fn: (d: ContentBundle) => void) => void;

export function CafesEditor({ draft, update }: { draft: ContentBundle; update: Update }) {
  const [slug, setSlug] = useState<BranchSlug>('uluwatu');
  const b = draft.branches[slug];
  const set = <K extends keyof typeof b>(k: K, v: (typeof b)[K]) => update((d) => void (d.branches[slug][k] = v));
  const waOk = /^\d{10,15}$/.test(waNumber(b.whatsapp));

  return (
    <div className="grid gap-4">
      <Segmented value={slug} onChange={setSlug} options={BRANCH_SLUGS.map((s) => ({ value: s, label: draft.branches[s].name, branch: s }))} />

      <Card title="Contact & location">
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="WhatsApp number"
            hint={
              waOk ? (
                <>
                  Opens as wa.me/{waNumber(b.whatsapp)} ·{' '}
                  <a className="font-semibold text-accent underline" href={waLink(b.whatsapp, 'Test from NOURISH admin')} target="_blank" rel="noopener">
                    test it
                  </a>
                </>
              ) : (
                <span className="text-rose-700">Use the full number with country code, e.g. +62 812-3456-7890</span>
              )
            }
          >
            <Input value={b.whatsapp} inputMode="tel" onChange={(e) => set('whatsapp', e.target.value)} />
          </Field>
          <Field label="Address">
            <Input value={b.address} maxLength={160} onChange={(e) => set('address', e.target.value)} />
          </Field>
          <Field
            label="Google Maps search text"
            hint={
              <a className="font-semibold text-accent underline" href={directionsUrl(b.maps)} target="_blank" rel="noopener">
                Check the Directions link
              </a>
            }
          >
            <Input value={b.maps.query} maxLength={200} onChange={(e) => update((d) => void (d.branches[slug].maps.query = e.target.value))} />
          </Field>
          <Field label="Google place ID (optional)" hint="Makes Directions open the exact listing. Starts with ChIJ…">
            <Input
              value={b.maps.placeId ?? ''}
              maxLength={200}
              onChange={(e) => update((d) => void (d.branches[slug].maps.placeId = e.target.value.trim() || undefined))}
            />
          </Field>
        </div>
      </Card>

      <Card title="How the café is described">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Name on the site">
            <Input value={b.name} maxLength={40} onChange={(e) => set('name', e.target.value)} />
          </Field>
          <Field label="Area (small text above the name)">
            <Input value={b.area} maxLength={40} onChange={(e) => set('area', e.target.value)} />
          </Field>
          <Field label="Name on Google Maps" hint="Shown next to the rating so people can find the same listing.">
            <Input value={b.mapsName} maxLength={80} onChange={(e) => set('mapsName', e.target.value)} />
          </Field>
          <Field label="Tagline">
            <Input value={b.tagline} maxLength={120} onChange={(e) => set('tagline', e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card title="Google rating">
        <p className="mb-3 text-sm text-muted">Copy the public numbers from the Google Maps listing. Only real numbers, never estimates.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Rating">
            <Input type="number" step={0.1} min={0} max={5} value={b.rating.value} onChange={(e) => update((d) => void (d.branches[slug].rating.value = Number(e.target.value)))} />
          </Field>
          <Field label="Number of reviews">
            <Input type="number" min={0} value={b.rating.count} onChange={(e) => update((d) => void (d.branches[slug].rating.count = Math.round(Number(e.target.value))))} />
          </Field>
          <Field label="Checked on">
            <Input type="date" value={b.rating.checked} onChange={(e) => update((d) => void (d.branches[slug].rating.checked = e.target.value))} />
          </Field>
        </div>
      </Card>
    </div>
  );
}

export function AnnouncementEditor({ draft, update }: { draft: ContentBundle; update: Update }) {
  const a = draft.site.announcement;
  const set = (patch: Partial<typeof a>) => update((d) => void Object.assign(d.site.announcement, patch));
  return (
    <div className="grid gap-4">
      <Card title="Announcement bar">
        <p className="mb-4 text-sm text-muted">A thin bar at the top of every page. Good for “Closed for Nyepi on 9 March” or a new menu.</p>
        <div className="grid gap-4">
          <Toggle checked={a.active} onChange={(v) => set({ active: v })} label="Show the announcement" />
          <Field label={`Text (${a.text.length}/140)`}>
            <TextArea value={a.text} onChange={(v) => set({ text: v.slice(0, 140) })} placeholder="e.g. New breakfast menu at Berawa from 1 November" />
          </Field>
          <Field label="Link (optional)" hint="A page on this site like /berawa#menu, or a full https:// link.">
            <Input value={a.link ?? ''} onChange={(e) => set({ link: e.target.value || undefined })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Show from (optional)">
              <Input type="date" value={a.start ?? ''} onChange={(e) => set({ start: e.target.value || undefined })} />
            </Field>
            <Field label="Show until (optional)">
              <Input type="date" value={a.end ?? ''} onChange={(e) => set({ end: e.target.value || undefined })} />
            </Field>
          </div>
        </div>
      </Card>
      <Card title="Preview">
        {a.active && a.text ? (
          <div className="rounded-xl bg-ink px-4 py-2 text-center text-sm text-paper">{a.text}</div>
        ) : (
          <p className="text-sm text-muted">Nothing shows while it’s off or empty.</p>
        )}
      </Card>
      <Card title="Social">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Instagram handle" hint="Without the @">
            <Input value={draft.site.instagram} onChange={(e) => update((d) => void (d.site.instagram = e.target.value.replace(/^@/, '')))} />
          </Field>
          <Field label="Facebook page">
            <Input value={draft.site.facebook} onChange={(e) => update((d) => void (d.site.facebook = e.target.value))} />
          </Field>
        </div>
      </Card>
    </div>
  );
}

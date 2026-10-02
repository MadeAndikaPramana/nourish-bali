import { z } from 'zod';

/**
 * Content schema shared by the site (build time) and /admin (client + API).
 * Content lives as JSON in src/content and is edited through /admin, which commits to GitHub.
 */

export const BRANCH_SLUGS = ['uluwatu', 'ungasan', 'berawa'] as const;
export const BranchSlug = z.enum(BRANCH_SLUGS);
export type BranchSlug = z.infer<typeof BranchSlug>;

export const MENU_IDS = ['bukit', 'berawa'] as const;
export const MenuId = z.enum(MENU_IDS);
export type MenuId = z.infer<typeof MenuId>;

/** Dietary marks exactly as printed on the café's own menus. */
export const TAGS = ['V', 'VG', 'GF', 'VO'] as const;
export const Tag = z.enum(TAGS);
export type Tag = z.infer<typeof Tag>;
export const TAG_LABELS: Record<Tag, string> = {
  V: 'Vegan',
  VG: 'Vegetarian',
  GF: 'Gluten free',
  VO: 'Vegan option',
};

const Time = z.string().regex(/^([01]\d|2[0-4]):[0-5]\d$/, 'Use 24h time, e.g. 07:00');
const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

export const TimeRange = z
  .object({ open: Time, close: Time })
  .refine((r) => r.open !== r.close, 'Open and close cannot be the same time');
export type TimeRange = z.infer<typeof TimeRange>;

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

/** An empty array means closed that day. */
export const WeeklyHours = z.object(
  Object.fromEntries(WEEKDAYS.map((d) => [d, z.array(TimeRange).max(3)])) as Record<
    Weekday,
    z.ZodArray<typeof TimeRange>
  >,
);
export type WeeklyHours = z.infer<typeof WeeklyHours>;

export const SpecialDay = z.object({
  date: IsoDate,
  label: z.string().trim().min(1).max(60),
  /** Empty = closed all day. */
  hours: z.array(TimeRange).max(3),
});
export type SpecialDay = z.infer<typeof SpecialDay>;

export const Branch = z.object({
  slug: BranchSlug,
  name: z.string().min(1).max(40),
  /** Name as it appears on the Google Maps listing. */
  mapsName: z.string().min(1).max(80),
  tagline: z.string().max(120),
  area: z.string().max(40),
  address: z.string().min(1).max(160),
  /** Display format, e.g. "+62 813-3777-2517". */
  whatsapp: z.string().regex(/^\+?[\d\s-]{8,20}$/, 'Phone number, digits only plus spaces or dashes'),
  maps: z.object({
    query: z.string().min(1).max(200),
    placeId: z.string().max(200).optional(),
  }),
  rating: z.object({
    value: z.number().min(0).max(5),
    count: z.number().int().nonnegative(),
    checked: IsoDate,
  }),
  hours: WeeklyHours,
  hoursConfirmed: z.boolean(),
  specialDays: z.array(SpecialDay).max(60),
  temporarilyClosed: z.object({ active: z.boolean(), message: z.string().max(160) }),
  menu: MenuId,
  order: z.number().int(),
});
export type Branch = z.infer<typeof Branch>;

/** Amounts are in thousands of rupiah, as printed on the menus (60 = Rp 60.000). */
export const Price = z.object({
  label: z.string().max(40).optional(),
  amount: z.number().nonnegative().max(10000),
});
export type Price = z.infer<typeof Price>;

export const MenuItem = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(1).max(100),
  description: z.string().max(400).optional(),
  /** Optional sub-heading inside a category (e.g. "Red" in the wine list). */
  group: z.string().max(40).optional(),
  tags: z.array(Tag).max(4),
  prices: z.array(Price).min(1).max(4),
  addons: z.array(Price.extend({ label: z.string().min(1).max(60) })).max(6).optional(),
  soldOut: z.boolean().optional(),
  hidden: z.boolean().optional(),
  /** Restricts an item on a shared menu to some branches. Empty/absent = every branch on the menu. */
  onlyAt: z.array(BranchSlug).optional(),
});
export type MenuItem = z.infer<typeof MenuItem>;

export const SECTIONS = ['food', 'sweets', 'drinks', 'bar'] as const;
export const Section = z.enum(SECTIONS);
export type Section = z.infer<typeof Section>;
export const SECTION_LABELS: Record<Section, string> = {
  food: 'Food',
  sweets: 'Sweets',
  drinks: 'Drinks',
  bar: 'Bar',
};

export const Category = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(1).max(60),
  section: Section,
  note: z.string().max(160).optional(),
  /** "cards" for dishes with descriptions, "list" for short price lists (coffee, extras). */
  style: z.enum(['cards', 'list']),
  servedFrom: Time.optional(),
  servedUntil: Time.optional(),
  addons: z.array(Price.extend({ label: z.string().min(1).max(60) })).max(8).optional(),
  items: z.array(MenuItem).max(80),
});
export type Category = z.infer<typeof Category>;

export const Menu = z
  .object({
    id: MenuId,
    title: z.string().max(80),
    branches: z.array(BranchSlug).min(1),
    /** True while prices are placeholders. The UI labels every price "sample". */
    samplePrices: z.boolean(),
    taxNote: z.string().max(160),
    allergenNote: z.string().max(300),
    paymentNote: z.string().max(120),
    categories: z.array(Category).max(60),
  })
  .superRefine((menu, ctx) => {
    const seen = new Set<string>();
    for (const cat of menu.categories) {
      if (seen.has(`c:${cat.id}`)) ctx.addIssue({ code: 'custom', message: `Duplicate category id ${cat.id}` });
      seen.add(`c:${cat.id}`);
      for (const item of cat.items) {
        if (seen.has(item.id)) ctx.addIssue({ code: 'custom', message: `Duplicate item id ${item.id}` });
        seen.add(item.id);
      }
    }
  });
export type Menu = z.infer<typeof Menu>;

export const Site = z.object({
  announcement: z.object({
    active: z.boolean(),
    text: z.string().max(140),
    link: z.string().max(300).optional(),
    start: IsoDate.optional(),
    end: IsoDate.optional(),
  }),
  instagram: z.string().regex(/^[A-Za-z0-9._]{1,30}$/),
  facebook: z.string().max(80),
  tagline: z.string().max(120),
});
export type Site = z.infer<typeof Site>;

/** Everything /admin edits, keyed by repo path. */
export const CONTENT_PATHS = {
  site: 'src/content/site.json',
  branches: Object.fromEntries(BRANCH_SLUGS.map((s) => [s, `src/content/branches/${s}.json`])) as Record<
    BranchSlug,
    string
  >,
  menus: Object.fromEntries(MENU_IDS.map((m) => [m, `src/content/menus/${m}.json`])) as Record<MenuId, string>,
};

export const ContentBundle = z.object({
  site: Site,
  branches: z.object({ uluwatu: Branch, ungasan: Branch, berawa: Branch }),
  menus: z.object({ bukit: Menu, berawa: Menu }),
});
export type ContentBundle = z.infer<typeof ContentBundle>;

/** Stable JSON formatting so admin commits produce minimal diffs. */
export const toJson = (value: unknown) => JSON.stringify(value, null, 2) + '\n';

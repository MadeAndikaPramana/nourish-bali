/**
 * Plain constants shared by the public islands and the schema. Kept free of zod so visitors' bundles stay small;
 * only /admin and the build load the validation schema.
 */
export const BRANCH_SLUGS = ['uluwatu', 'ungasan', 'berawa'] as const;
export const MENU_IDS = ['bukit', 'berawa'] as const;

/** Dietary marks exactly as printed on the café's own menus. */
export const TAGS = ['V', 'VG', 'GF', 'VO'] as const;
export const TAG_LABELS: Record<(typeof TAGS)[number], string> = {
  V: 'Vegan',
  VG: 'Vegetarian',
  GF: 'Gluten free',
  VO: 'Vegan option',
};

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

export const SECTIONS = ['food', 'sweets', 'drinks', 'bar'] as const;
export const SECTION_LABELS: Record<(typeof SECTIONS)[number], string> = {
  food: 'Food',
  sweets: 'Sweets',
  drinks: 'Drinks',
  bar: 'Bar',
};

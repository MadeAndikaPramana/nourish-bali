import { Branch, ContentBundle, Menu, Site, type BranchSlug, type MenuId } from './schema';

/**
 * Build-time content loader. JSON is validated with the same schema /admin uses,
 * so a bad commit fails the build instead of shipping a broken page.
 */
const branchFiles = import.meta.glob<{ default: unknown }>('../content/branches/*.json', { eager: true });
const menuFiles = import.meta.glob<{ default: unknown }>('../content/menus/*.json', { eager: true });
const siteFile = import.meta.glob<{ default: unknown }>('../content/site.json', { eager: true });

function parse<T>(schema: { parse: (v: unknown) => T }, file: string, value: unknown): T {
  try {
    return schema.parse(value);
  } catch (err) {
    throw new Error(`Invalid content in ${file}: ${err instanceof Error ? err.message : err}`);
  }
}

const branches = Object.entries(branchFiles)
  .map(([file, mod]) => parse(Branch, file, mod.default))
  .sort((a, b) => a.order - b.order);

const menus = Object.fromEntries(
  Object.entries(menuFiles).map(([file, mod]) => {
    const menu = parse(Menu, file, mod.default);
    return [menu.id, menu];
  }),
) as Record<MenuId, Menu>;

const site = parse(Site, 'site.json', Object.values(siteFile)[0]?.default);

// Cross-check the bundle once so admin and build agree on shape.
ContentBundle.parse({
  site,
  branches: Object.fromEntries(branches.map((b) => [b.slug, b])),
  menus,
});

export const getBranches = () => branches;
export const getBranch = (slug: BranchSlug) => {
  const b = branches.find((x) => x.slug === slug);
  if (!b) throw new Error(`Unknown branch ${slug}`);
  return b;
};
export const getMenu = (id: MenuId) => menus[id];
export const getMenus = () => menus;
export const getSite = () => site;

export const totalReviews = () => branches.reduce((n, b) => n + b.rating.count, 0);

/** Items visible on a branch's page (respects hidden and onlyAt). */
export function menuForBranch(slug: BranchSlug): Menu {
  const branch = getBranch(slug);
  const menu = getMenu(branch.menu);
  return {
    ...menu,
    categories: menu.categories
      .map((c) => ({
        ...c,
        items: c.items.filter((i) => !i.hidden && (!i.onlyAt?.length || i.onlyAt.includes(slug))),
      }))
      .filter((c) => c.items.length > 0),
  };
}

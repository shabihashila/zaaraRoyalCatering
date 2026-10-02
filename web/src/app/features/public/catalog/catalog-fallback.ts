import type { PublicCategory, PublicPackage } from './catalog.models';

/**
 * Prerender-safe fallback catalogue (sale prices + item names only — no costs).
 * Mirrors `seed/catalogue.json` business rules; replaced by live API data when reachable.
 */
export const FALLBACK_CATEGORIES: PublicCategory[] = [
  { id: 'c-breakfast', name: 'Breakfast', slug: 'breakfast', description: 'Classic, Premium and Royal breakfasts.', imageUrl: null, packageCount: 3 },
  { id: 'c-lunch', name: 'Lunch', slug: 'lunch', description: 'Standard, Premium and Royal Kacchi.', imageUrl: null, packageCount: 3 },
  { id: 'c-dinner', name: 'Dinner', slug: 'dinner', description: 'Standard, Premium and Royal dinners.', imageUrl: null, packageCount: 3 },
  { id: 'c-milad', name: 'Milad & Doa Mahfil', slug: 'milad-doa-mahfil', description: 'Tabarak and full-meal packages.', imageUrl: null, packageCount: 3 },
  { id: 'c-corporate', name: 'Corporate Program', slug: 'corporate-program', description: 'Tea breaks, box lunches and buffets.', imageUrl: null, packageCount: 4 },
  { id: 'c-house', name: 'House Party', slug: 'house-party', description: 'Snacks parties, full dinners and BBQ nights.', imageUrl: null, packageCount: 3 },
];

function pkg(
  slug: string,
  categorySlug: string,
  categoryName: string,
  name: string,
  sale: number,
  items: string[],
  extra: Partial<PublicPackage> = {},
): PublicPackage {
  return {
    id: `fallback-${slug}`,
    categorySlug,
    categoryName,
    name,
    slug,
    tagline: null,
    description: null,
    salePricePerHead: sale,
    minGuests: 1,
    maxGuests: null,
    items,
    inclusions: [],
    variants: [],
    addOns: [],
    heroImageUrl: null,
    isFeatured: false,
    ...extra,
  };
}

export const FALLBACK_PACKAGES: PublicPackage[] = [
  pkg('breakfast-classic-breakfast', 'breakfast', 'Breakfast', 'Classic Breakfast', 120,
    ['Paratha (2 pcs)', 'Vegetable Bhaji', 'Scrambled Egg', 'Chola Dal', 'Sweet', 'Black Tea']),
  pkg('breakfast-premium-breakfast', 'breakfast', 'Breakfast', 'Premium Breakfast', 180,
    ['Luchi or Paratha', 'Aloo Dum', 'Egg Curry', 'Boot Dal', 'Semolina Halwa', 'Seasonal Fruit', 'Doi-Chira', 'Tea / Coffee']),
  pkg('breakfast-royal-breakfast', 'breakfast', 'Breakfast', 'Royal Breakfast', 250,
    ['Bhuna Khichuri', 'Beef Bhuna', 'Egg Curry', 'Fried Eggplant', 'Borhani', 'Salad', 'Jilapi / Sweet', 'Tea / Coffee']),
  pkg('lunch-standard', 'lunch', 'Lunch', 'Standard', 250,
    ['White Rice', 'Chicken Curry', 'Masoor Dal', 'Mixed Vegetables', 'Aloo Bhorta', 'Salad', 'Pickle']),
  pkg('lunch-premium', 'lunch', 'Lunch', 'Premium', 350,
    ['Rice / Polao', 'Chicken Roast', 'Beef Bhuna', 'Fried Rui Fish', 'Dal', 'Vegetables', 'Salad', 'Sweet Yogurt', 'Paan-Supari']),
  pkg('lunch-royal-kacchi', 'lunch', 'Lunch', 'Royal Kacchi', 500,
    ['Kacchi Biryani (Mutton/Chicken)', 'Borhani', 'Salad', 'Egg', 'Fried Eggplant', 'Shahi Zarda', 'Sweet', 'Paan-Supari'],
    {
      isFeatured: true,
      variants: [
        { id: 'v-chicken', name: 'Chicken', priceDeltaPerHead: 0, isDefault: true },
        { id: 'v-mutton', name: 'Mutton', priceDeltaPerHead: 80, isDefault: false },
      ],
    }),
  pkg('dinner-standard', 'dinner', 'Dinner', 'Standard', 280,
    ['Polao', 'Chicken Rezala', 'Dal', 'Vegetables', 'Salad', 'Pickle', 'Sweet']),
  pkg('dinner-premium', 'dinner', 'Dinner', 'Premium', 400,
    ['Polao', 'Chicken Roast', 'Beef Rezala', 'Hilsa / Rui Fish', 'Dal', 'Vegetables', 'Salad', 'Borhani', 'Firni']),
  pkg('dinner-royal-dinner', 'dinner', 'Dinner', 'Royal Dinner', 550,
    ['Morog Polao / Kacchi', 'Beef Kala Bhuna', 'Mutton Rezala', 'Fried Fish', 'Dal', 'Borhani', 'Salad', 'Shahi Tukra', 'Fruit Platter'],
    { isFeatured: true }),
  pkg('milad-doa-mahfil-tabarak-package', 'milad-doa-mahfil', 'Milad & Doa Mahfil', 'Tabarak Package', 150,
    ['Sweet Polao / Zarda', 'Beef', 'Chickpeas', 'Dates', 'Water']),
  pkg('milad-doa-mahfil-standard-doa-mahfil', 'milad-doa-mahfil', 'Milad & Doa Mahfil', 'Standard Doa Mahfil', 220,
    ['Rice / Polao', 'Chicken Curry', 'Dal', 'Vegetables', 'Salad', 'Pickle', 'Sweet', 'Water']),
  pkg('milad-doa-mahfil-full-meal-package', 'milad-doa-mahfil', 'Milad & Doa Mahfil', 'Full Meal Package', 320,
    ['Polao', 'Chicken Roast', 'Beef Bhuna', 'Dal', 'Vegetables', 'Salad', 'Egg', 'Zarda', 'Sweet', 'Water'],
    { inclusions: ['Includes packaging & distribution support'] }),
  pkg('corporate-program-snacks-tea-break-package', 'corporate-program', 'Corporate Program', 'Snacks / Tea Break Package', 80,
    ['Samosa', 'Singara', 'Chicken Pakora', 'Biscuits', 'Tea / Coffee', 'Water'],
    { tagline: 'Ideal for morning or afternoon meeting breaks' }),
  pkg('corporate-program-box-lunch', 'corporate-program', 'Corporate Program', 'Box Lunch', 220,
    ['Polao / Rice', 'Chicken Curry', 'Dal', 'Vegetables', 'Salad', 'Mineral Water']),
  pkg('corporate-program-standard-buffet', 'corporate-program', 'Corporate Program', 'Standard Buffet', 380,
    ['Rice & Polao', '2 Chicken & Beef Dishes', 'Fish', 'Dal', 'Vegetables', 'Salad Bar', 'Dessert', 'Soft Drink'],
    { minGuests: 40 }),
  pkg('corporate-program-executive-buffet', 'corporate-program', 'Corporate Program', 'Executive Buffet', 550,
    ['Kacchi / Biryani', 'Roast', 'Kebab Station', 'Fish', 'Salad Bar', 'Soup', 'Dessert', 'Beverages', 'Tea/Coffee Corner'],
    { inclusions: ['Includes waiter service & cutlery'] }),
  pkg('house-party-snacks-party', 'house-party', 'House Party', 'Snacks Party', 200,
    ['Chicken Fry', 'Shawarma / Roll', 'Fuchka / Chotpoti', 'French Fries', 'Spring Roll', 'Soft Drink']),
  pkg('house-party-full-dinner-party', 'house-party', 'House Party', 'Full Dinner Party', 420,
    ['Polao', 'Chicken Roast', 'Beef Bhuna', 'Fish Fry', 'Dal', 'Vegetables', 'Salad', 'Borhani', 'Dessert']),
  pkg('house-party-bbq-night', 'house-party', 'House Party', 'BBQ Night', 650,
    ['Chicken / Beef BBQ', 'Grilled Kebab', 'Naan', 'Salad Bar', 'Dip Sauce', 'Soft Drink', 'Dessert'],
    { isFeatured: true, tagline: 'Outdoor setup & live chef service available (extra charges apply)' }),
];

/** Public catalog DTOs — mirror the API; NEVER contain cost/profit/margin. */

export interface PublicVariant {
  id: string;
  name: string;
  priceDeltaPerHead: number;
  isDefault: boolean;
}

export interface PublicAddOn {
  id: string;
  name: string;
  description: string | null;
  pricingType: string;
  price: number;
}

export interface PublicPackage {
  id: string;
  categorySlug: string;
  categoryName: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  salePricePerHead: number;
  minGuests: number;
  maxGuests: number | null;
  items: string[];
  inclusions: string[];
  variants: PublicVariant[];
  addOns: PublicAddOn[];
  heroImageUrl: string | null;
  isFeatured: boolean;
}

export interface PublicCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  packageCount: number;
}

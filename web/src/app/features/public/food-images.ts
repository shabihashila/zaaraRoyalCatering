/** Locally hosted stock photography. Sources and replacement guidance: docs/UI-UPGRADE.md. */
export const FOOD_IMAGES = {
  biryani: '/assets/food/biryani.webp',
  feast: '/assets/food/feast.webp',
  bbq: '/assets/food/bbq.webp',
  breakfast: '/assets/food/breakfast.webp',
  dessert: '/assets/food/dessert.webp',
  roast: '/assets/food/roast.webp',
  borhani: '/assets/food/borhani.webp',
  firni: '/assets/food/firni.webp',
} as const;

export function foodImage(name: string, supplied?: string | null): string {
  if (supplied) return supplied;
  if (/roast/i.test(name)) return FOOD_IMAGES.roast;
  if (/borhani/i.test(name)) return FOOD_IMAGES.borhani;
  if (/firni/i.test(name)) return FOOD_IMAGES.firni;
  if (/bbq|kebab|grill|house-party/i.test(name)) return FOOD_IMAGES.bbq;
  if (/breakfast|snack|tea/i.test(name)) return FOOD_IMAGES.breakfast;
  if (/dessert|firni|sweet/i.test(name)) return FOOD_IMAGES.dessert;
  if (/kacchi|biryani|lunch|milad/i.test(name)) return FOOD_IMAGES.biryani;
  return FOOD_IMAGES.feast;
}

export function foodSrcSet(url: string): string | null {
  return Object.values(FOOD_IMAGES).some(image => image === url)
    ? `${url.replace('.webp', '-small.webp')} 640w, ${url} 1280w`
    : null;
}

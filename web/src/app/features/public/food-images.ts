/** Each local photo has one content owner. Responsive sizes are variants of that photo. */
export const FOOD_IMAGES = {
  biryani: '/assets/food/biryani.webp', roast: '/assets/food/roast.webp', bbq: '/assets/food/bbq.webp',
  feast: '/assets/food/feast.webp', breakfast: '/assets/food/breakfast.webp', borhani: '/assets/food/borhani.webp', firni: '/assets/food/firni.webp',
} as const;
export const HOME_PACKAGE_IMAGES: Record<string, { image: string; alt: string }> = {
  'lunch-royal-kacchi': { image: FOOD_IMAGES.biryani, alt: 'Biryani with fragrant rice and accompaniments' },
  'dinner-royal-dinner': { image: FOOD_IMAGES.roast, alt: 'Chicken roast in a rich sauce' },
  'house-party-bbq-night': { image: FOOD_IMAGES.bbq, alt: 'Grilled meat prepared over a barbecue' },
};
export function imageIdentity(url: string): string { return url.split(/[?#]/)[0].replace(/-small(?=\.)/, ''); }
export function foodSrcSet(url: string): string | null {
  return Object.values(FOOD_IMAGES).some(image => image === url)
    ? `${url.replace('.webp', '-small.webp')} 640w, ${url} 1280w` : null;
}

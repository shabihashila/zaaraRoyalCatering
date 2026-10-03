/** Static public-site content (Phase 3). CMS-lite endpoints land in Phase 5;
 * this file is the single swap point (`ContentApiService` later). */

export interface Faq {
  q: string;
  a: string;
}

export interface GalleryImage {
  title: string;
  caption: string;
  image: string;
  gradient: string;
  emoji: string;
}

export interface Testimonial {
  name: string;
  event: string;
  quote: string;
  rating: number;
}

export const SITE_SETTINGS = {
  phoneDisplay: '01XXX-XXXXXX',
  phoneHref: 'tel:+8801XXXXXXXXX',
  whatsappHref: 'https://wa.me/8801XXXXXXXXX?text=Hello%20Zaara%20Royal%20Catering',
  email: 'hello@zaararoyal.local',
  address: 'Enter your area name, Dhaka, Bangladesh',
  hours: 'Sat–Thu, 9am–9pm',
  facebook: '#',
} as const;

export const FAQS: Faq[] = [
  { q: 'How is pricing calculated?', a: 'Every package has a per-head sale price. Your estimate is guests × (package price + variant, e.g. Mutton +৳80) plus any add-ons. The minimum guest count (e.g. 40 for Standard Buffet) is always enforced.' },
  { q: 'What is the Mutton +৳80 rule?', a: 'Royal Kacchi defaults to Chicken. Choose Mutton and ৳80 per head is added — picked on the package page before you request a booking.' },
  { q: 'How far ahead should I book?', a: 'At least 48 hours before your event so our kitchen can plan. Weddings and 500+ guest events should inquire a week or more ahead.' },
  { q: 'Do you provide waiter service and cutlery?', a: 'Executive Buffet includes waiter service & cutlery. BBQ Night can add outdoor setup & live chef service (extra charges apply).' },
  { q: 'Do you deliver outside Dhaka?', a: 'We serve all of Bangladesh. Delivery charge depends on area/district and is confirmed with your quote — contact us for far venues.' },
  { q: 'Can I customise a package?', a: 'Yes — for weddings or large events send a custom inquiry and we will tailor the menu within a day.' },
  { q: 'How do I pay?', a: 'Manual payment recording for now (cash/bKash/Nagad/bank with a reference). A 30% advance of the grand total reserves your date.' },
  { q: 'Are item costs shown anywhere public?', a: 'No. Customers only ever see package names, item lists, per-head sale prices and notes. Costs and margins are internal only.' },
];

export const GALLERY: GalleryImage[] = [
  { image: '/assets/food/feast.webp', title: 'A Generous Rice Spread', caption: 'A food presentation from our collection', gradient: 'var(--zrc-section-gradient)', emoji: '' },
  { image: '/assets/food/breakfast.webp', title: 'Breakfast at the Table', caption: 'A welcoming start to the day', gradient: 'var(--zrc-section-gradient)', emoji: '' },
  { image: '/assets/food/borhani.webp', title: 'Refreshing Borhani', caption: 'A traditional accompaniment to a generous feast', gradient: 'var(--zrc-section-gradient)', emoji: '' },
  { image: '/assets/food/firni.webp', title: 'A Sweet Finish', caption: 'Traditional firni, served chilled', gradient: 'var(--zrc-section-gradient)', emoji: '' },
];

export const TESTIMONIALS: Testimonial[] = [
  { name: 'Nusrat J.', event: 'Wedding · 300 guests', quote: 'The royal kacchi disappeared in minutes — guests still talk about the zarda.', rating: 5 },
  { name: 'Tanvir H.', event: 'Corporate offsite · 80 guests', quote: 'Tea break on time, buffet hot, invoice exactly as quoted. Effortless.', rating: 5 },
];

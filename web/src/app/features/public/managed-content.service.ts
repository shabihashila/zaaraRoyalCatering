import { Injectable, afterNextRender, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../core/api.config';
import { HOME_PACKAGE_IMAGES, imageIdentity } from './food-images';
import { FAQS, GALLERY, SITE_SETTINGS, TESTIMONIALS } from './site-content';
export interface ManagedEntry {
  kind: string;
  key: string;
  title: string;
  body: string;
  imageUrl: string | null;
  sortOrder: number;
}
interface CustomerReview {
  authorName: string;
  rating: number;
  body: string;
  eventType: string | null;
}
@Injectable({ providedIn: 'root' })
export class ManagedContentService {
  private readonly http = inject(HttpClient);
  readonly entries = signal<ManagedEntry[]>([]);
  readonly reviews = signal<CustomerReview[]>([]);
  constructor() {
    afterNextRender(() => {
      this.http
        .get<ManagedEntry[]>(`${API_BASE_URL}/api/v1/public/content`)
        .subscribe({ next: (e) => this.entries.set(e), error: () => {} });
      this.http
        .get<CustomerReview[]>(`${API_BASE_URL}/api/v1/public/testimonials`)
        .subscribe({ next: (r) => this.reviews.set(r), error: () => {} });
    });
  }
  entry(kind: string, key: string) {
    return this.entries().find((e) => e.kind === kind && e.key === key);
  }
  readonly faqs = computed(() => {
    const managed = this.entries()
      .filter((e) => e.kind === 'FAQ')
      .map((e) => ({ q: e.title, a: e.body }));
    return [...FAQS.filter((f) => !managed.some((e) => e.q === f.q)), ...managed];
  });
  readonly gallery = computed(() => {
    const seen = new Set(Object.values(HOME_PACKAGE_IMAGES).map(p => imageIdentity(p.image)));
    return [
    ...GALLERY,
    ...this.entries()
      .filter((e) => e.kind === 'Gallery' && e.imageUrl)
      .map((e) => ({
        title: e.title,
        caption: e.body,
        image: e.imageUrl!,
        gradient: 'var(--zrc-section-gradient)',
        emoji: '',
      })),
    ].filter(entry => {
      const key = imageIdentity(entry.image);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });
  readonly testimonials = computed(() =>
    this.reviews().length
      ? this.reviews().map((r) => ({
          name: r.authorName,
          event: r.eventType ?? 'Customer feedback',
          quote: r.body,
          rating: r.rating,
        }))
      : TESTIMONIALS,
  );
  readonly settings = computed(() => {
    const value = (key: string, fallback: string) => this.entry('Setting', key)?.body ?? fallback;
    const phone = value('phone', SITE_SETTINGS.phoneDisplay);
    const valid = /^(?:0|\+?880)1[3-9]\d{8}$/.test(phone);
    const international = phone.replace(/^0/, '880').replace(/^\+/, '');
    const whatsapp = value('whatsapp', phone);
    const waValid = /^(?:0|\+?880)1[3-9]\d{8}$/.test(whatsapp);
    return {
      ...SITE_SETTINGS,
      phoneDisplay: phone,
      phoneHref: valid ? 'tel:+' + international : SITE_SETTINGS.phoneHref,
      whatsappHref: waValid
        ? 'https://wa.me/' + whatsapp.replace(/^0/, '880').replace(/^\+/, '')
        : SITE_SETTINGS.whatsappHref,
      email: value('email', SITE_SETTINGS.email),
      address: value('address', SITE_SETTINGS.address),
      hours: value('hours', SITE_SETTINGS.hours),
    };
  });
}

import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';

const SITE_NAME = 'Zaara Royal Catering';
const SITE_ORIGIN = 'https://zaararoyal.local';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);

  setPage(opts: { title: string; description: string; path: string; image?: string }): void {
    const fullTitle = `${opts.title} · ${SITE_NAME}`;
    const url = `${SITE_ORIGIN}${opts.path}`;
    const image = opts.image ?? `${SITE_ORIGIN}/assets/food/biryani.webp`;
    this.title.setTitle(fullTitle);
    this.meta.updateTag({ name: 'description', content: opts.description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: SITE_NAME });
    this.meta.updateTag({ property: 'og:title', content: fullTitle });
    this.meta.updateTag({ property: 'og:description', content: opts.description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:image', content: image });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: fullTitle });
    this.meta.updateTag({ name: 'twitter:description', content: opts.description });
    this.setCanonical(url);
  }

  /** Restaurant/FoodEstablishment + Offer JSON-LD for a package detail page. */
  setPackageJsonLd(pkg: {
    name: string;
    slug: string;
    description: string | null;
    salePricePerHead: number;
    categoryName: string;
    image?: string | null;
  }): void {
    const data = {
      '@context': 'https://schema.org',
      '@type': 'FoodEstablishment',
      name: SITE_NAME,
      servesCuisine: 'Bangladeshi',
      priceRange: '৳80 - ৳650',
      url: SITE_ORIGIN,
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: pkg.categoryName,
        itemListElement: [
          {
            '@type': 'Offer',
            name: `${pkg.name} (${pkg.categoryName})`,
            description: pkg.description ?? pkg.name,
            price: pkg.salePricePerHead,
            priceCurrency: 'BDT',
            url: `${SITE_ORIGIN}/packages/${pkg.slug}`,
            image: pkg.image ?? `${SITE_ORIGIN}/assets/food/biryani.webp`,
          },
        ],
      },
    };
    this.setJsonLd('zrc-package-ld', data);
  }

  setHomeJsonLd(): void {
    this.setJsonLd('zrc-home-ld', {
      '@context': 'https://schema.org',
      '@type': 'FoodEstablishment',
      name: SITE_NAME,
      servesCuisine: 'Bangladeshi',
      priceRange: '৳80 - ৳650',
      url: SITE_ORIGIN,
      address: { '@type': 'PostalAddress', addressCountry: 'BD' },
    });
  }

  private setCanonical(url: string): void {
    const head = this.doc.head;
    let link = head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.doc.createElement('link');
      link.rel = 'canonical';
      head.appendChild(link);
    }
    link.href = url;
  }

  private setJsonLd(id: string, data: unknown): void {
    const head = this.doc.head;
    head.querySelector(`#${id}`)?.remove();
    const script = this.doc.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    script.text = JSON.stringify(data);
    head.appendChild(script);
  }
}

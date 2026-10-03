import { Component, ElementRef, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThreeHeroComponent } from '../../../shared/three/three-hero.component';
import { CatalogApiService } from '../catalog/catalog-api.service';
import type { PublicCategory, PublicPackage } from '../catalog/catalog.models';
import { formatBDT } from '../../../core/bdt';
import { SeoService } from '../../../core/seo.service';
import { MotionService } from '../../../core/motion.service';
import { HOME_PACKAGE_IMAGES, foodSrcSet } from '../food-images';
import { ManagedContentService } from '../managed-content.service';

@Component({
  selector: 'zrc-home',
  standalone: true,
  imports: [RouterLink, ThreeHeroComponent],
  template: `
    <section class="hero" aria-labelledby="home-heading">
      <div class="hero-inner">
        <div class="hero-copy">
          <span class="hero-brand">ZAARA ROYAL CATERING</span>
          <span class="badge">BANGLADESHI FLAVOURS. ROYAL HOSPITALITY.</span>
          <h1 id="home-heading" data-stagger>
            @if (content.entry('Hero', 'home'); as hero) { {{ hero.title }} }
            @else { Made for<br /> <em>your celebration.</em> }
          </h1>
          <p class="lead" data-stagger>{{ content.entry('Hero', 'home')?.body ?? 'Slow-cooked kacchi. Generous spreads. Thoughtful service. Bring the flavours of Bangladesh to your next gathering.' }}</p>
          <div class="hero-ctas" data-stagger>
            <a routerLink="/menu" class="btn btn-primary">Explore our menus &rarr;</a>
            <a routerLink="/inquiry" class="btn btn-outline">Plan your event</a>
          </div>
          <div class="stats" data-stagger>
            <div><b>{{ packageCount() || '16' }}</b><span>curated menus</span></div>
            <div><b>Per guest</b><span>transparent pricing</span></div>
            <div><b>Your occasion</b><span>our attention to detail</span></div>
          </div>
        </div>
        <div class="hero-vessel">
          <zrc-three-hero />
          <span class="hero-vessel-label">THE ROYAL HANDI</span>
          <p class="hero-vessel-caption">A tradition of generous hospitality.</p>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2>Browse by occasion</h2>
        <a routerLink="/menu">All packages →</a>
      </div>
      <div class="grid grid-3">
        @for (c of categories(); track c.slug; let index = $index) {
          <a
            class="card cat-card occasion-card reveal"
            [routerLink]="['/menu']"
            [queryParams]="{ category: c.slug }"
          >
            <span class="occasion-number">0{{ index + 1 }}</span>
            <h3>{{ c.name }}</h3>
            <p class="muted">{{ c.description || occasionDescription(c.slug) }} · {{ c.packageCount }} packages</p><span class="occasion-arrow" aria-hidden="true">&rarr;</span>
          </a>
        } @empty {
          <article class="card"><p class="muted">Loading categories…</p></article>
        }
      </div>
    </section>

    <section class="section">
      <div class="section-head"><h2>How it works</h2></div>
      <div class="grid grid-3">
        <article class="card reveal">
          <h3>1 · Choose a package</h3>
          <p class="muted">
            Pick a category and a package that fits your guests and budget per head.
          </p>
        </article>
        <article class="card reveal">
          <h3>2 · Tell us guests &amp; date</h3>
          <p class="muted">
            Get an instant quote — guests × price, plus variants and add-ons. Choose the portions
            and extras that suit your event.
          </p>
        </article>
        <article class="card reveal">
          <h3>3 · We cook &amp; deliver</h3>
          <p class="muted">
            Confirm your menu and service needs with our team, then look forward to the celebration.
          </p>
        </article>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2>Featured packages</h2>
        <a routerLink="/menu">Compare all →</a>
      </div>
      <div class="grid grid-3">
        @for (p of featured(); track p.slug) {
          <a class="card cat-card reveal" [routerLink]="['/packages', p.slug]">
            @if (packagePhoto(p.slug); as image) {
              <img class="card-food" [src]="image" [attr.srcset]="imageSrcSet(image)" sizes="(max-width: 600px) 100vw, 33vw" width="640" height="480" loading="lazy" [alt]="packagePhotoAlt(p.slug)" />
            }
            <span class="badge">{{ p.categoryName }}</span>
            <h3 class="chef-title">{{ p.name }}</h3>
            @if (p.tagline) {
              <p class="muted">{{ p.tagline }}</p>
            }
            <p class="price">{{ bdt(p.salePricePerHead) }} <small class="muted">/ head</small></p>
          </a>
        } @empty {
          <article class="card"><p class="muted">Loading featured packages…</p></article>
        }
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2>
          {{
            content.reviews().length
              ? 'Stories from our customers'
              : 'A little inspiration for your table'
          }}
        </h2>
        <span class="muted">{{
          content.reviews().length ? 'Customer feedback' : 'Illustrative event stories'
        }}</span>
      </div>
      <div class="grid grid-3">
        @for (t of testimonials; track t.name) {
          <figure class="card reveal">
            <blockquote>“{{ t.quote }}”</blockquote>
            <figcaption class="muted">{{ t.name }} · {{ t.event }} · {{ t.rating }}/5</figcaption>
          </figure>
        }
      </div>
    </section>

    <section class="section">
      <div class="gallery-invitation">
        <div><span class="badge">A taste of Zaara Royal</span><h2>Good food, beautifully served.</h2><p class="muted">Explore our food collection, from fragrant rice to refreshing accompaniments and a sweet finish.</p></div>
        <a routerLink="/gallery" class="btn btn-outline">Explore the gallery &rarr;</a>
      </div>
      <div class="cta-band reveal">
        <h2>Planning a wedding or a 500-guest event?</h2>
        <p>Send us a custom event inquiry and get a tailored quote for your celebration.</p>
        <p>
          <a routerLink="/inquiry" class="btn btn-primary">Start a custom inquiry</a>
          <a routerLink="/menu" class="btn btn-outline">Or start with the menu</a>
        </p>
      </div>
    </section>
  `,
})
export class HomeComponent implements OnInit {
  private readonly api = inject(CatalogApiService);
  private readonly seo = inject(SeoService);
  private readonly motion = inject(MotionService);
  private readonly host = inject(ElementRef);

  readonly categories = signal<PublicCategory[]>([]);
  readonly featured = signal<PublicPackage[]>([]);
  readonly content = inject(ManagedContentService);
  get testimonials() {
    return this.content.testimonials();
  }

  readonly bdt = formatBDT;
  readonly packageCount = signal(0);
  readonly packagePhoto = (slug: string): string | null => HOME_PACKAGE_IMAGES[slug]?.image ?? null;
  readonly packagePhotoAlt = (slug: string): string => HOME_PACKAGE_IMAGES[slug]?.alt ?? '';
  readonly occasionDescription = (slug: string): string => ({ breakfast: 'A welcoming start to the day', lunch: 'Generous midday spreads', dinner: 'An evening worth sharing', 'corporate-program': 'Thoughtfully planned for your team', 'house-party': 'Bring the celebration home' }[slug] ?? 'Menus for your gathering');
  readonly imageSrcSet = foodSrcSet;

  private destroySmooth: (() => void) | null = null;

  ngOnInit(): void {
    this.seo.setPage({
      title: 'Royal feasts, crafted for your moments',
      description:
        'Zaara Royal Catering — 16 per-head meal packages for weddings, corporate programs and house parties across Bangladesh. Prices in BDT per head.',
      path: '/',
    });
    this.seo.setHomeJsonLd();
    this.api.listCategories().subscribe((c) => this.categories.set(c));
    this.api.listPackages({}).subscribe((rows) => {
      this.packageCount.set(rows.length);
      const feat = rows.filter((p) => p.isFeatured);
      this.featured.set(feat.length > 0 ? feat.slice(0, 3) : rows.filter(p => p.slug in HOME_PACKAGE_IMAGES).slice(0, 3));
      setTimeout(() => this.motion.initReveal(), 0);
    });
    const el = (this.host.nativeElement as HTMLElement).querySelector(
      '.hero',
    ) as HTMLElement | null;
    if (el) void this.motion.staggerIn(el);
    this.motion.initReveal();
    void this.motion.initSmoothScroll().then((destroy) => (this.destroySmooth = destroy));
  }

  ngOnDestroy(): void {
    this.destroySmooth?.();
  }

}

import { Component, ElementRef, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThreeHeroComponent } from '../../../shared/three/three-hero.component';
import { CatalogApiService } from '../catalog/catalog-api.service';
import type { PublicCategory, PublicPackage } from '../catalog/catalog.models';
import { formatBDT } from '../../../core/bdt';
import { SeoService } from '../../../core/seo.service';
import { MotionService } from '../../../core/motion.service';
import { FOOD_IMAGES, foodImage, foodSrcSet } from '../food-images';
import { GALLERY, TESTIMONIALS } from '../site-content';
import { ManagedContentService } from '../managed-content.service';

@Component({
  selector: 'zrc-home',
  standalone: true,
  imports: [RouterLink, ThreeHeroComponent],
  template: `
    <section class="hero" #heroScope>
      <div class="hero-inner">
        <div>
          <span class="badge">THE ART OF BANGLADESHI HOSPITALITY</span>
          <h1 data-stagger>
            @if (content.entry('Hero', 'home'); as hero) {
              {{ hero.title }}
            } @else {
              A feast to remember.<br /><em>A moment to cherish.</em>
            }
          </h1>
          <p class="lead" data-stagger>
            {{
              content.entry('Hero', 'home')?.body ??
                'From fragrant kacchi to a generous wedding spread, bring the warmth of Bengali food to your table. Find a menu your guests will love.'
            }}
          </p>
          <div class="hero-ctas" data-stagger>
            <a routerLink="/menu" class="btn btn-gold">Browse packages</a>
            <a routerLink="/inquiry" class="btn btn-outline">Plan a big event</a>
          </div>
          <div class="stats" data-stagger>
            <div><b data-count="19">19</b><span>signature packages</span></div>
            <div><b data-count="6">6</b><span>event categories</span></div>
            <div><b data-count="81">81</b><span>distinct menu items</span></div>
          </div>
        </div>
        <div class="hero-food">
          <img
            [src]="content.entry('Hero', 'home')?.imageUrl ?? photos.feast"
            [attr.srcset]="imageSrcSet(content.entry('Hero', 'home')?.imageUrl ?? photos.feast)"
            sizes="(max-width: 800px) 100vw, 50vw"
            width="1280"
            height="960"
            fetchpriority="high"
            alt="A generous biryani spread with golden rice, chicken and fresh accompaniments"
          />
          <div class="hero-food-caption">
            <span class="eyebrow">A TASTE OF CELEBRATION</span>
            <h2>Tradition, served beautifully.</h2>
            <a routerLink="/packages/lunch-royal-kacchi"
              >Discover our Royal Kacchi package &rarr;</a
            >
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2>Browse by occasion</h2>
        <a routerLink="/menu">All packages →</a>
      </div>
      <div class="grid grid-3">
        @for (c of categories(); track c.slug) {
          <a
            class="card cat-card tilt reveal"
            [routerLink]="['/menu']"
            [queryParams]="{ category: c.slug }"
          >
            <img
              class="card-food"
              [src]="imageFor(c.slug, c.imageUrl)"
              [attr.srcset]="imageSrcSet(imageFor(c.slug, c.imageUrl))"
              sizes="(max-width: 600px) 100vw, (max-width: 850px) 50vw, 33vw"
              width="640"
              height="480"
              loading="lazy"
              alt=""
            />
            <h3>{{ c.name }}</h3>
            <p class="muted">{{ c.description ?? '' }} · {{ c.packageCount }} packages</p>
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
            <img
              class="card-food"
              [src]="imageFor(p.name, p.heroImageUrl)"
              [attr.srcset]="imageSrcSet(imageFor(p.name, p.heroImageUrl))"
              sizes="(max-width: 600px) 100vw, (max-width: 850px) 50vw, 33vw"
              width="640"
              height="480"
              loading="lazy"
              [alt]="p.categoryName + ' menu inspiration'"
            /><span class="badge">{{ p.categoryName }}</span>
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
      <div class="section-head">
        <h2>From the gallery</h2>
        <a routerLink="/gallery">Open gallery →</a>
      </div>
      <div class="grid grid-3">
        @for (g of galleryTeaser; track g.title) {
          <a class="card cat-card reveal" routerLink="/gallery">
            <img
              class="card-food"
              [src]="g.image"
              [attr.srcset]="imageSrcSet(g.image)"
              sizes="(max-width: 600px) 100vw, 33vw"
              width="640"
              height="480"
              loading="lazy"
              [alt]="g.caption"
            />
            <h3>{{ g.title }}</h3>
            <p class="muted">{{ g.caption }}</p>
          </a>
        }
      </div>
      <details class="handi-preview" (toggle)="onHandiToggle($event)">
        <summary>A little royal magic &mdash; explore our serving handi</summary>
        @if (handiOpen()) {
          <zrc-three-hero />
        }
      </details>
      <div class="cta-band reveal">
        <h2>Planning a wedding or a 500-guest event?</h2>
        <p>Send us a custom event inquiry and get a tailored quote for your celebration.</p>
        <p>
          <a routerLink="/inquiry" class="btn btn-gold">Start a custom inquiry</a>
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
  get galleryTeaser() {
    return this.content.gallery().slice(-3);
  }
  readonly bdt = formatBDT;
  readonly photos = FOOD_IMAGES;
  readonly handiOpen = signal(false);
  readonly imageFor = foodImage;
  readonly imageSrcSet = foodSrcSet;

  private destroySmooth: (() => void) | null = null;

  ngOnInit(): void {
    this.seo.setPage({
      title: 'Royal feasts, crafted for your moments',
      description:
        'Zaara Royal Catering — 19 per-head meal packages for weddings, corporate programs and house parties across Bangladesh. Prices in BDT per head.',
      path: '/',
    });
    this.seo.setHomeJsonLd();
    this.api.listCategories().subscribe((c) => this.categories.set(c));
    this.api.listPackages({}).subscribe((rows) => {
      const feat = rows.filter((p) => p.isFeatured);
      this.featured.set(feat.length > 0 ? feat.slice(0, 3) : rows.slice(5, 8));
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

  onHandiToggle(event: Event): void {
    this.handiOpen.set((event.target as HTMLDetailsElement).open);
  }
}

import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { foodImage, foodSrcSet } from '../food-images';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CatalogApiService } from '../catalog/catalog-api.service';
import type { PublicCategory, PublicPackage } from '../catalog/catalog.models';
import { formatBDT } from '../../../core/bdt';
import { SeoService } from '../../../core/seo.service';
import { MotionService } from '../../../core/motion.service';

@Component({
  selector: 'zrc-menu',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="section">
      <span class="badge">Menu & packages</span>
      <h1>Packages for every occasion</h1>
      <p class="muted">Find your perfect spread, with clear per-person pricing and a menu for every gathering.</p>

      <form class="filters" (submit)="$event.preventDefault()" aria-label="Filter packages">
        <label>Category
          <select [(ngModel)]="category" name="category" (ngModelChange)="reload()">
            <option value="">All categories</option>
            @for (c of categories(); track c.slug) {
              <option [value]="c.slug">{{ c.name }} ({{ c.packageCount }})</option>
            }
          </select>
        </label>
        <label>Guests
          <input type="number" min="1" [(ngModel)]="guests" name="guests" (ngModelChange)="reload()" placeholder="e.g. 60" />
        </label>
        <label>Max ৳ / head
          <input type="number" min="0" [(ngModel)]="maxPrice" name="maxPrice" (ngModelChange)="reload()" placeholder="e.g. 400" />
        </label>
        <button type="button" class="secondary" (click)="clear()">Clear</button>
      </form>

      @if (loading()) {
        <p class="muted" role="status">Loading packages…</p>
      } @else if (packages().length === 0) {
        <div class="card"><h2>No packages match</h2><p class="muted">Try fewer guests or a higher budget — or send a custom inquiry for a tailored menu.</p>
        <a routerLink="/inquiry" class="btn btn-gold">Custom inquiry</a></div>
      } @else {
        <p class="muted" role="status">{{ packages().length }} packages</p>
        <div class="grid grid-3">
          @for (p of packages(); track p.slug) {
            <article class="flip" [class.flipped]="flipped() === p.slug" (click)="toggleFlip(p.slug)" (keydown.enter)="onCardKey(p.slug, $event)" tabindex="0" [attr.aria-label]="p.name">
              <div class="flip-inner">
                <div class="flip-face card" [attr.inert]="flipped() === p.slug ? '' : null" [attr.aria-hidden]="flipped() === p.slug"><img class="card-food" [src]="imageFor(p.name, p.heroImageUrl)" [attr.srcset]="imageSrcSet(imageFor(p.name, p.heroImageUrl))" sizes="(max-width: 600px) 100vw, (max-width: 850px) 50vw, 33vw" width="640" height="480" loading="lazy" [alt]="p.categoryName + ' food inspiration'" />
                  <span class="badge">{{ p.categoryName }}</span>
                  <h3 class="chef-title">{{ p.name }}</h3>
                  @if (p.tagline) { <p class="muted">{{ p.tagline }}</p> }
                  <p class="price">{{ bdt(p.salePricePerHead) }} <small class="muted">/ head</small></p>
                  <p class="muted small">Min {{ p.minGuests }} guests · {{ p.items.length }} items · tap to see items</p>
                  <p>
                    <a [routerLink]="['/packages', p.slug]" (click)="$event.stopPropagation()" class="btn btn-gold">View & quote</a>
                    <button type="button" class="secondary" (click)="toggleCompare(p, $event)">{{ inCompare(p.slug) ? 'Remove' : 'Compare' }}</button>
                  </p>
                </div>
                <div class="flip-face flip-back card" [attr.inert]="flipped() !== p.slug ? '' : null" [attr.aria-hidden]="flipped() !== p.slug">
                  <h3>{{ p.name }} — items</h3>
                  <ul class="item-list">
                    @for (item of p.items; track item) { <li>{{ item }}</li> }
                  </ul>
                  @if (p.inclusions.length > 0) {
                    <p class="muted small">Includes: {{ p.inclusions.join(' · ') }}</p>
                  }
                  <p><a [routerLink]="['/packages', p.slug]" (click)="$event.stopPropagation()" class="btn btn-gold">View & quote</a></p>
                </div>
              </div>
            </article>
          }
        </div>
      }

      @if (compare().length > 0) {
        <aside class="compare" aria-label="Compare packages">
          <h2>Compare ({{ compare().length }}/3)</h2>
          <div class="grid grid-3">
            @for (p of compare(); track p.slug) {
              <div class="card">
                <h3 class="chef-title">{{ p.name }}</h3>
                <p class="muted">{{ p.categoryName }}</p>
                <p class="price">{{ bdt(p.salePricePerHead) }} <small class="muted">/ head</small></p>
                <p class="muted small">{{ p.items.length }} items · min {{ p.minGuests }}</p>
                <button type="button" class="secondary" (click)="removeCompare(p.slug)">Remove</button>
              </div>
            }
          </div>
          <button type="button" class="secondary" (click)="compare.set([])">Clear compare</button>
        </aside>
      }
    </section>
  `,
})
export class MenuComponent implements OnInit {
  private readonly api = inject(CatalogApiService);
  private readonly route = inject(ActivatedRoute);
  readonly imageFor = foodImage;
  readonly imageSrcSet = foodSrcSet;
  private readonly seo = inject(SeoService);
  private readonly motion = inject(MotionService);

  readonly categories = signal<PublicCategory[]>([]);
  readonly packages = signal<PublicPackage[]>([]);
  readonly loading = signal(true);
  readonly flipped = signal<string | null>(null);
  readonly compare = signal<PublicPackage[]>([]);

  category = '';
  guests: number | null = null;
  maxPrice: number | null = null;

  readonly bdt = formatBDT;

  ngOnInit(): void {
    this.seo.setPage({
      title: 'Menu & packages',
      description: 'Browse 19 per-head meal packages — breakfast, lunch, dinner, milad, corporate and house parties. Prices in BDT per head.',
      path: '/menu',
    });
    this.api.listCategories().subscribe((c) => this.categories.set(c));
    this.route.queryParamMap.subscribe((params) => {
      this.category = params.get('category') ?? '';
      this.reload();
    });
    this.motion.initReveal();
  }

  reload(): void {
    this.loading.set(true);
    this.api
      .listPackages({
        category: this.category || undefined,
        guests: this.guests ?? undefined,
        maxPrice: this.maxPrice ?? undefined,
      })
      .subscribe((rows) => {
        this.packages.set(rows);
        this.loading.set(false);
        setTimeout(() => this.motion.initReveal(), 0);
      });
  }

  clear(): void {
    this.category = '';
    this.guests = null;
    this.maxPrice = null;
    this.reload();
  }

  onCardKey(slug: string, event: Event): void {
    if (event.target === event.currentTarget) { event.preventDefault(); this.toggleFlip(slug); }
  }

  toggleFlip(slug: string): void {
    this.flipped.set(this.flipped() === slug ? null : slug);
  }

  inCompare(slug: string): boolean {
    return this.compare().some((p) => p.slug === slug);
  }

  toggleCompare(p: PublicPackage, ev: Event): void {
    ev.stopPropagation();
    const cur = this.compare();
    if (cur.some((x) => x.slug === p.slug)) {
      this.compare.set(cur.filter((x) => x.slug !== p.slug));
    } else if (cur.length < 3) {
      this.compare.set([...cur, p]);
    }
  }

  removeCompare(slug: string): void {
    this.compare.set(this.compare().filter((x) => x.slug !== slug));
  }

  protected readonly compareCount = computed(() => this.compare().length);
}

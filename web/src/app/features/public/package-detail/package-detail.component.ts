import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CatalogApiService } from '../catalog/catalog-api.service';
import type { PublicPackage } from '../catalog/catalog.models';
import { formatBDT } from '../../../core/bdt';
import { quoteTotal, validateGuests, type QuoteAddOn } from '../catalog/quote-calc';
import { SeoService } from '../../../core/seo.service';
import { MotionService } from '../../../core/motion.service';

@Component({
  selector: 'zrc-package-detail',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <section class="section">
      <p><a routerLink="/menu">← All packages</a></p>
      @if (loading()) {
        <p class="muted" role="status">Loading package…</p>
      } @else if (!pkg()) {
        <div class="card"><h1>Package not found</h1><p class="muted">It may have been renamed — browse the menu.</p>
        <a routerLink="/menu" class="btn btn-primary">Back to menu</a></div>
      } @else {
        @let p = pkg()!;

        <span class="badge">{{ p.categoryName }}</span>
        <h1 class="chef-title">{{ p.name }}</h1>
        @if (p.tagline) { <p class="lead muted">{{ p.tagline }}</p> }
        @if (p.description) { <p>{{ p.description }}</p> }
        <p class="price">{{ bdt(p.salePricePerHead) }} <small class="muted">per head</small></p>

        <div class="grid grid-2">
          <article class="card">
            <h2>What is included ({{ p.items.length }} items)</h2>
            <ul class="item-list">
              @for (item of p.items; track item) { <li>{{ item }}</li> }
            </ul>
            @if (p.inclusions.length > 0) {
              <h3>Good to know</h3>
              <ul class="item-list">
                @for (inc of p.inclusions; track inc) { <li>{{ inc }}</li> }
              </ul>
            }
          </article>

          <aside class="card quote" aria-label="Live quote calculator">
            <h2>Instant quote</h2>
            @if (p.variants.length > 0) {
              <fieldset>
                <legend>Variant</legend>
                @for (v of p.variants; track v.id) {
                  <label>
                    <input type="radio" name="variant" [value]="v.id" [checked]="variantId() === v.id" (change)="setVariant(v.id)" />
                    {{ v.name }} @if (v.priceDeltaPerHead > 0) { (+{{ bdt(v.priceDeltaPerHead) }}/head) } @else { (included) }
                  </label>
                }
              </fieldset>
            }
            <label>Guests (min {{ p.minGuests }})
              <input type="number" min="1" [ngModel]="guests()" (ngModelChange)="setGuests($event)" name="guests" />
            </label>
            @if (p.addOns.length > 0) {
              <fieldset>
                <legend>Add-ons</legend>
                @for (a of addOns(); track a.id) {
                  <label>
                    <input type="checkbox" [checked]="a.selected" (change)="toggleAddOn(a.id, $event)" [name]="'addon-' + a.id" />
                    {{ a.name }} — {{ bdt(a.price) }}{{ a.pricingType === 'PerHead' ? '/head' : ' flat' }}
                  </label>
                }
              </fieldset>
            }
            @if (guestError()) {
              <p class="error" role="alert">{{ guestError() }}</p>
            }
            <dl class="totals">
              <div><dt>Per head</dt><dd>{{ bdt(breakdown().perHeadRate) }}</dd></div>
              <div><dt>{{ breakdown().guests }} guests</dt><dd>{{ bdt(breakdown().baseTotal) }}</dd></div>
              @if (breakdown().addOnTotal > 0) {
                <div><dt>Add-ons</dt><dd>{{ bdt(breakdown().addOnTotal) }}</dd></div>
              }
              <div class="grand"><dt>Estimated total</dt><dd>{{ bdt(breakdown().grandTotal) }}</dd></div>
            </dl>
            <p class="muted small">Your estimate includes the selected menu and extras. Our team will confirm availability, delivery and the final quote.</p>
            <p>
              <a [routerLink]="['/contact']" [queryParams]="{ package: p.slug, guests: guests() }" class="btn btn-primary">Book this package</a>
              <a [routerLink]="['/inquiry']" [queryParams]="{ package: p.slug }" class="btn btn-outline">Custom inquiry</a>
            </p>
          </aside>
        </div>
      }
    </section>
  `,
})
export class PackageDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(CatalogApiService);
  private readonly seo = inject(SeoService);
  private readonly motion = inject(MotionService);

  readonly pkg = signal<PublicPackage | null>(null);
  readonly loading = signal(true);
  readonly guests = signal(100);
  readonly variantId = signal<string | null>(null);

  // Writable add-on selection (qty 1 fixed for Phase 3 UI).
  readonly addOns = signal<QuoteAddOn[]>([]);

  readonly bdt = formatBDT;

  private readonly variantDelta = computed(() => {
    const p = this.pkg();
    if (!p || p.variants.length === 0) return 0;
    const id = this.variantId() ?? p.variants.find((v) => v.isDefault)?.id ?? p.variants[0]?.id;
    return p.variants.find((v) => v.id === id)?.priceDeltaPerHead ?? 0;
  });

  readonly breakdown = computed(() => {
    const p = this.pkg();
    return quoteTotal(this.guests() || 0, p?.salePricePerHead ?? 0, this.variantDelta(), this.addOns());
  });

  readonly guestError = computed(() => {
    const p = this.pkg();
    if (!p) return null;
    return validateGuests(this.guests() || 0, p.minGuests, p.maxGuests);
  });

  setGuests(value: number | null): void {
    this.guests.set(typeof value === 'number' && !Number.isNaN(value) ? Math.floor(value) : 0);
  }

  setVariant(id: string): void {
    this.variantId.set(id);
  }

  toggleAddOn(id: string, ev: Event): void {
    const checked = (ev.target as HTMLInputElement).checked;
    this.addOns.update((list) => list.map((x) => (x.id === id ? { ...x, selected: checked } : x)));
  }

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    this.api.getPackage(slug).subscribe((p) => {
      this.pkg.set(p);
      this.loading.set(false);
      if (p) {
        const def = p.variants.find((v) => v.isDefault) ?? p.variants[0];
        this.variantId.set(def?.id ?? null);
        const g = this.route.snapshot.queryParamMap.get('guests');
        this.guests.set(g ? Number(g) || p.minGuests : Math.max(p.minGuests, 50));
        this.addOns.set(
          p.addOns.map((a) => ({
            id: a.id,
            name: a.name,
            pricingType: (a.pricingType === 'PerHead' ? 'PerHead' : 'Flat') as 'Flat' | 'PerHead',
            price: a.price,
            selected: false,
            qty: 1,
          })),
        );
        this.seo.setPage({
          title: `${p.name} (${p.categoryName}) — ${formatBDT(p.salePricePerHead)}/head`,
          description: `${p.name}: ${p.items.slice(0, 4).join(', ')}… ${formatBDT(p.salePricePerHead)} per head, min ${p.minGuests} guests.`,
          path: `/packages/${p.slug}`,
        });
        this.seo.setPackageJsonLd({
          name: p.name,
          slug: p.slug,
          description: p.description ?? p.tagline,
          salePricePerHead: p.salePricePerHead,
          categoryName: p.categoryName,
        });
      }
      this.motion.initReveal();
    });
  }
}

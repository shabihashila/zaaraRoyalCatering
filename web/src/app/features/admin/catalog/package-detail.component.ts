import { AdminModalComponent } from '../admin-modal.component';
import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap, startWith } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../core/auth/auth.service';
import { HasPermissionDirective } from '../../../core/auth/has-permission.directive';
import {
  CATALOG_API,
  MARGIN_THRESHOLD,
  AdminPackage,
  PriceEntry,
  marginOf,
} from './catalog.models';

interface CostRow {
  itemId: string;
  itemName: string;
  displayName: string;
  cost: number;
}

@Component({
  selector: 'zrc-package-detail',
  standalone: true,
  imports: [AdminModalComponent, ReactiveFormsModule, RouterLink, HasPermissionDirective],
  template: `
    <p>
      <a routerLink="/admin/catalog/packages">← Packages</a> ·
      <a routerLink="/admin/catalog/costing">Costing sheet</a>
    </p>
    @if (error() !== null) {
      <p class="error">{{ error() }}</p>
    }
    @if (pkg() !== null) {
      <span class="badge">{{ pkg()?.categoryName }}</span>
      <h1>{{ pkg()?.name }}</h1>
      <div class="grid grid-3">
        <article class="card">
          <h3>Sale / head</h3>
          <p class="price">৳{{ form.getRawValue().salePrice }}</p>
        </article>
        <article class="card" *hasPermission="'catalog.costing.view'">
          <h3>Total cost</h3>
          <p class="price">৳{{ liveCost().toFixed(2) }}</p>
        </article>
        <article class="card" *hasPermission="'catalog.costing.view'">
          <h3>Profit · margin</h3>
          <p class="price">
            ৳{{ liveProfit().toFixed(2) }} · {{ (liveMargin() * 100).toFixed(1) }}%
          </p>
          @if (liveMargin() < marginThreshold) {
            <p class="error">Below 35% margin threshold.</p>
          }
        </article>
      </div>

      <button
        class="primary"
        [disabled]="!auth.hasPermission('catalog.package.edit')"
        (click)="detailsOpen.set(true); error.set(null)"
      >
        Edit package
      </button>
      @if (detailsOpen()) {
        <zrc-admin-modal
          label="Edit package"
          [busy]="busy()"
          [error]="error()"
          (dismiss)="cancelDetails()"
        >
          <h2>Package pricing &amp; availability</h2>
          <form class="stacked" [formGroup]="form" (ngSubmit)="saveDetails()">
            <label
              >Sale price / head (৳)
              <input type="number" step="0.01" min="0.01" formControlName="salePrice"
            /></label>
            <label>Tagline <input type="text" formControlName="tagline" /></label>
            <label>Min guests <input type="number" min="1" formControlName="minGuests" /></label>
            <label><input type="checkbox" formControlName="isActive" /> Active</label>
            <label><input type="checkbox" formControlName="isFeatured" /> Featured</label>
            <button
              type="submit"
              class="primary"
              [disabled]="form.invalid || busy() || !auth.hasPermission('catalog.package.edit')"
            >
              Save details
            </button>
          </form>

          <button class="secondary" [disabled]="busy()" (click)="cancelDetails()">
            Cancel
          </button></zrc-admin-modal
        >
      }
      <button
        class="secondary"
        [disabled]="!auth.hasPermission('catalog.package.edit')"
        (click)="costsOpen.set(true); error.set(null)"
      >
        Edit item costs
      </button>
      @if (costsOpen()) {
        <zrc-admin-modal
          label="Edit item costs"
          [busy]="busy()"
          [error]="error()"
          (dismiss)="cancelCosts()"
        >
          <h2>Menu composition &amp; item costs</h2>
          <div class="admin-table-scroll">
            <table class="data">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Display name</th>
                  <th>Cost / head (৳)</th>
                </tr>
              </thead>
              <tbody>
                @for (row of costs(); track row.itemId; let i = $index) {
                  <tr>
                    <td>{{ row.itemName }}</td>
                    <td>{{ row.displayName }}</td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        [disabled]="!auth.hasPermission('catalog.package.edit')"
                        [value]="row.cost"
                        (input)="setCost(i, $event)"
                      />
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <p>
            <button
              type="button"
              class="primary"
              (click)="saveCosts()"
              [disabled]="busy() || !auth.hasPermission('catalog.package.edit')"
            >
              Save item costs
            </button>
          </p>

          <button class="secondary" [disabled]="busy()" (click)="cancelCosts()">
            Cancel
          </button></zrc-admin-modal
        >
      }
      <h2>Price history</h2>
      @if (prices().length === 0) {
        <p class="muted">No price changes recorded.</p>
      } @else {
        <div class="admin-table-scroll">
          <table class="data">
            <thead>
              <tr>
                <th>Old</th>
                <th>New</th>
                <th>When</th>
                <th>By</th>
              </tr>
            </thead>
            <tbody>
              @for (h of prices(); track h.id) {
                <tr>
                  <td>৳{{ h.oldPrice }}</td>
                  <td>৳{{ h.newPrice }}</td>
                  <td>{{ h.changedAt }}</td>
                  <td>{{ h.changedBy ?? '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    }
  `,
  styles: ['form.stacked, .grid { margin: 1rem 0 1.5rem; } table input { max-width: 8rem; }'],
})
export class PackageDetailComponent {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);

  readonly auth = inject(AuthService);
  readonly pkg = signal<AdminPackage | null>(null);
  readonly costs = signal<CostRow[]>([]);
  readonly prices = signal<PriceEntry[]>([]);
  readonly detailsOpen = signal(false);
  readonly costsOpen = signal(false);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly marginThreshold = MARGIN_THRESHOLD;

  readonly form = this.fb.nonNullable.group({
    salePrice: [0, [Validators.required, Validators.min(0.01)]],
    tagline: [''],
    minGuests: [1, [Validators.required, Validators.min(1)]],
    isActive: [true],
    isFeatured: [false],
  });

  readonly salePrice = toSignal(
    this.form.controls.salePrice.valueChanges.pipe(startWith(this.form.controls.salePrice.value)),
    { initialValue: 0 },
  );
  readonly liveCost = computed(() => this.costs().reduce((sum, r) => sum + r.cost, 0));
  readonly liveProfit = computed(() => this.salePrice() - this.liveCost());
  readonly liveMargin = computed(() => marginOf(this.salePrice(), this.liveCost()));

  private rowVersion: string | null = null;

  constructor() {
    this.route.paramMap
      .pipe(
        switchMap((params) =>
          this.http.get<AdminPackage>(`${CATALOG_API}/packages/${params.get('id')}`),
        ),
      )
      .subscribe({
        next: (p) => this.applyDetail(p),
        error: () => this.error.set('Failed to load package.'),
      });
  }

  private applyDetail(p: AdminPackage): void {
    this.pkg.set(p);
    this.rowVersion = p.rowVersion;
    this.form.setValue({
      salePrice: p.salePricePerHead,
      tagline: p.tagline ?? '',
      minGuests: p.minGuests,
      isActive: p.isActive,
      isFeatured: p.isFeatured,
    });
    this.costs.set(
      p.items.map((i) => ({
        itemId: i.itemId,
        itemName: i.itemName,
        displayName: i.displayName ?? i.itemName,
        cost: i.costPerHead,
      })),
    );
    if (this.auth.hasPermission('catalog.costing.view')) this.loadPrices(p.id);
  }

  cancelDetails(): void {
    const p = this.pkg();
    if (p) this.applyDetail(p);
    this.detailsOpen.set(false);
  }
  cancelCosts(): void {
    const p = this.pkg();
    if (p) this.applyDetail(p);
    this.costsOpen.set(false);
  }
  setCost(index: number, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(value) || value < 0) {
      return;
    }
    this.costs.update((rows) => rows.map((r, i) => (i === index ? { ...r, cost: value } : r)));
  }

  saveDetails(): void {
    const p = this.pkg();
    if (
      p === null ||
      this.form.invalid ||
      this.busy() ||
      !this.auth.hasPermission('catalog.package.edit')
    ) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    const v = this.form.getRawValue();
    this.http
      .put(`${CATALOG_API}/packages/${p.id}`, {
        salePricePerHead: v.salePrice,
        tagline: v.tagline === '' ? null : v.tagline,
        description: p.description,
        minGuests: v.minGuests,
        maxGuests: p.maxGuests,
        isActive: v.isActive,
        isFeatured: v.isFeatured,
        rowVersion: this.rowVersion,
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.detailsOpen.set(false);
          this.costsOpen.set(false);
          this.reload(p.id);
        },
        error: (err: HttpErrorResponse) => {
          this.busy.set(false);
          this.error.set(
            err.status === 409 ? 'Conflict: package changed elsewhere.' : 'Save failed.',
          );
        },
      });
  }

  saveCosts(): void {
    const p = this.pkg();
    if (p === null || this.busy() || !this.auth.hasPermission('catalog.package.edit')) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.http
      .put(
        `${CATALOG_API}/packages/${p.id}/items`,
        this.costs().map((r, i) => ({
          itemId: r.itemId,
          costPerHead: r.cost,
          displayName: r.displayName,
          sortOrder: (i + 1) * 10,
        })),
      )
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.detailsOpen.set(false);
          this.costsOpen.set(false);
          this.reload(p.id);
        },
        error: () => {
          this.busy.set(false);
          this.error.set('Save costs failed.');
        },
      });
  }

  private loadPrices(id: string): void {
    this.http.get<PriceEntry[]>(`${CATALOG_API}/packages/${id}/prices`).subscribe({
      next: (rows) => this.prices.set(rows),
      error: () => undefined,
    });
  }

  private reload(id: string): void {
    this.http.get<AdminPackage>(`${CATALOG_API}/packages/${id}`).subscribe({
      next: (p) => this.applyDetail(p),
      error: () => this.error.set('Reload failed.'),
    });
  }
}

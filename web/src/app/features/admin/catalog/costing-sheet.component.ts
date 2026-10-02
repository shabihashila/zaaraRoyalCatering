import { AdminModalComponent } from '../admin-modal.component';
import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { forkJoin } from 'rxjs';
import {
  CATALOG_API,
  MARGIN_THRESHOLD,
  CostingRow,
  AdminPackage,
  toCsv,
  downloadCsv,
} from './catalog.models';

@Component({
  selector: 'zrc-costing-sheet',
  standalone: true,
  imports: [AdminModalComponent, ReactiveFormsModule, RouterLink],
  template: `
    <span class="badge">Catalog · internal only</span>
    <h1>Costing &amp; margins</h1>
    @if (error() !== null) {
      <p class="error">{{ error() }}</p>
    }

    <p class="muted">
      Mirrors the workbook Package Summary · {{ rows().length }} packages · averages ৳{{
        avgSale().toFixed(2)
      }}
      / ৳{{ avgCost().toFixed(2) }} / ৳{{ avgProfit().toFixed(2) }}
      <button type="button" class="secondary" (click)="exportCsv()">Export Excel (CSV)</button>
    </p>
    <div class="admin-table-scroll">
      <table class="data">
        <thead>
          <tr>
            <th>Category</th>
            <th>Package</th>
            <th>Sale/head</th>
            <th>Cost</th>
            <th>Profit</th>
            <th>Margin</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @for (r of rows(); track r.packageId) {
            <tr [style.background]="r.marginPct < marginThreshold ? 'rgba(179,38,30,0.08)' : ''">
              <td>{{ r.categoryName }}</td>
              <td>{{ r.packageName }}</td>
              <td>৳{{ r.salePricePerHead }}</td>
              <td>৳{{ r.totalCost }}</td>
              <td>৳{{ r.profit }}</td>
              <td>{{ (r.marginPct * 100).toFixed(1) }}%</td>
              <td><a [routerLink]="['/admin/catalog/packages', r.packageId]">Edit</a></td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <button
      class="primary"
      [disabled]="!auth.hasPermission('catalog.package.edit')"
      (click)="bulkOpen.set(true); preview.set([])"
    >
      Bulk price adjustment
    </button>
    @if (bulkOpen()) {
      <zrc-admin-modal
        label="Bulk price adjustment"
        [busy]="busy()"
        [error]="error()"
        (dismiss)="bulkOpen.set(false)"
      >
        <h2>Bulk price adjustment (preview first)</h2>
        <form class="stacked" [formGroup]="bulkForm" (ngSubmit)="previewBulk()">
          <label
            >Percent change, e.g. 5 or -3 <input type="number" step="0.5" formControlName="percent"
          /></label>
          <button type="submit" class="secondary" [disabled]="bulkForm.invalid">Preview</button>
        </form>
        @if (preview().length > 0) {
          <div class="admin-table-scroll">
            <table class="data">
              <thead>
                <tr>
                  <th>Package</th>
                  <th>Old sale</th>
                  <th>New sale</th>
                </tr>
              </thead>
              <tbody>
                @for (p of preview(); track p.packageId) {
                  <tr>
                    <td>{{ p.packageName }}</td>
                    <td>৳{{ p.oldSale }}</td>
                    <td>৳{{ p.newSale }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <p>
            <button
              type="button"
              class="primary"
              (click)="applyBulk()"
              [disabled]="busy() || !auth.hasPermission('catalog.package.edit')"
            >
              Apply to all {{ preview().length }} packages
            </button>
          </p>
        }
        <button class="secondary" [disabled]="busy()" (click)="bulkOpen.set(false)">
          Cancel
        </button></zrc-admin-modal
      >
    }
  `,
})
export class CostingSheetComponent {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);

  readonly auth = inject(AuthService);
  readonly rows = signal<CostingRow[]>([]);
  readonly error = signal<string | null>(null);
  readonly bulkOpen = signal(false);
  readonly busy = signal(false);
  readonly marginThreshold = MARGIN_THRESHOLD;
  readonly preview = signal<
    { packageId: string; packageName: string; oldSale: number; newSale: number }[]
  >([]);

  readonly bulkForm = this.fb.nonNullable.group({
    percent: [5, [Validators.required, Validators.min(-90), Validators.max(200)]],
  });

  readonly avgSale = computed(() =>
    this.rows().length === 0
      ? 0
      : this.rows().reduce((s, r) => s + r.salePricePerHead, 0) / this.rows().length,
  );
  readonly avgCost = computed(() =>
    this.rows().length === 0
      ? 0
      : this.rows().reduce((s, r) => s + r.totalCost, 0) / this.rows().length,
  );
  readonly avgProfit = computed(() => this.avgSale() - this.avgCost());

  constructor() {
    this.http.get<CostingRow[]>(`${CATALOG_API}/costing`).subscribe({
      next: (rows) => this.rows.set(rows),
      error: () => this.error.set('Failed to load costing (needs catalog.costing.view).'),
    });
  }

  exportCsv(): void {
    downloadCsv('zrc-costing.csv', toCsv(this.rows()), document);
  }

  previewBulk(): void {
    if (this.bulkForm.invalid) {
      return;
    }
    const pct = this.bulkForm.getRawValue().percent / 100;
    this.preview.set(
      this.rows().map((r) => ({
        packageId: r.packageId,
        packageName: r.packageName,
        oldSale: r.salePricePerHead,
        newSale: Math.round(r.salePricePerHead * (1 + pct) * 100) / 100,
      })),
    );
  }

  applyBulk(): void {
    const items = this.preview();
    if (items.length === 0 || this.busy() || !this.auth.hasPermission('catalog.package.edit')) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    // Reload each package for a fresh RowVersion, then PUT the new sale price.
    forkJoin(
      items.map((p) => this.http.get<AdminPackage>(`${CATALOG_API}/packages/${p.packageId}`)),
    ).subscribe({
      next: (details) => {
        const puts = details.map((d) => {
          const next = items.find((p) => p.packageId === d.id);
          return this.http.put(`${CATALOG_API}/packages/${d.id}`, {
            salePricePerHead: next?.newSale ?? d.salePricePerHead,
            tagline: d.tagline,
            description: d.description,
            minGuests: d.minGuests,
            maxGuests: d.maxGuests,
            isActive: d.isActive,
            isFeatured: d.isFeatured,
            rowVersion: d.rowVersion,
          });
        });
        forkJoin(puts).subscribe({
          next: () => {
            this.busy.set(false);
            this.preview.set([]);
            this.bulkOpen.set(false);
            this.http
              .get<CostingRow[]>(`${CATALOG_API}/costing`)
              .subscribe((rows) => this.rows.set(rows));
          },
          error: (err: HttpErrorResponse) => {
            this.busy.set(false);
            this.error.set(
              err.status === 409 ? 'Conflict: a package changed meanwhile.' : 'Bulk apply failed.',
            );
          },
        });
      },
      error: () => {
        this.busy.set(false);
        this.error.set('Bulk apply failed (reload).');
      },
    });
  }
}

import { Component, computed, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { HasPermissionDirective } from '../../../core/auth/has-permission.directive';
import { AdminIconComponent } from '../admin-icon.component';
import { AdminPackage, CATALOG_API, CostingRow, MARGIN_THRESHOLD } from '../catalog/catalog.models';
import { formatBDT } from '../../../core/bdt';
import { API_BASE_URL } from '../../../core/api.config';
@Component({
  selector: 'zrc-admin-dashboard',
  standalone: true,
  imports: [RouterLink, HasPermissionDirective, AdminIconComponent],
  template: `
    <div class="admin-page-heading">
      <div>
        <span class="admin-eyebrow">YOUR BUSINESS, AT A GLANCE</span>
        <h1>Welcome back, {{ firstName() }}.</h1>
        <p class="muted">
          A clear view of your menu, pricing and team. Ready for the next celebration.
        </p>
      </div>
      <button class="secondary" (click)="reload()" [disabled]="loading()">
        <zrc-admin-icon name="refresh" />Refresh overview
      </button>
    </div>
    @if (error()) {
      <div class="admin-alert error" role="alert">{{ error() }}</div>
    }
    <section class="admin-welcome">
      <div>
        <span class="admin-eyebrow">THE ZAARA ROYAL STANDARD</span>
        <h2>Great celebrations start<br />with a well-crafted menu.</h2>
        <p>
          Keep your packages current, fine-tune your margins and give every guest something to
          remember.
        </p>
        <a
          *hasPermission="'catalog.package.view'"
          routerLink="/admin/catalog/packages"
          class="btn btn-primary"
          >Manage your menu<zrc-admin-icon name="arrow"
        /></a>
      </div>
      <div class="admin-welcome-mark" aria-hidden="true"><span>ZR</span></div>
    </section>
    @if (auth.hasPermission('catalog.package.view')) {
      <section class="admin-kpis" aria-label="Live catalog summary">
        <article>
          <span class="metric-icon"><zrc-admin-icon name="book" /></span
          ><span class="metric-label">Menu packages</span
          ><b>{{ loading() ? '—' : packages().length }}</b
          ><small>{{ activeCount() }} active on the menu</small>
        </article>
        <article>
          <span class="metric-icon"><zrc-admin-icon name="grid" /></span
          ><span class="metric-label">Event categories</span
          ><b>{{ loading() ? '—' : categories().length }}</b
          ><small>Options for every occasion</small>
        </article>
        <article>
          <span class="metric-icon"><zrc-admin-icon name="box" /></span
          ><span class="metric-label">Featured packages</span
          ><b>{{ loading() ? '—' : featuredCount() }}</b
          ><small>Selected for your storefront</small>
        </article>
        <article>
          <span class="metric-icon"><zrc-admin-icon name="chart" /></span
          ><span class="metric-label">Average price / head</span
          ><b>{{ loading() ? '—' : bdt(avgPrice()) }}</b
          ><small>Across the complete catalog</small>
        </article>
      </section>
      <div class="admin-dashboard-grid">
        <section class="admin-panel">
          <div class="panel-heading">
            <div>
              <h2>Menu by occasion</h2>
              <p class="muted small">Package availability across your catalog</p>
            </div>
            <span class="admin-status">Live catalog</span>
          </div>
          <div class="category-bars">
            @for (c of categories(); track c.name) {
              <div>
                <span>{{ c.name }}</span>
                <div class="bar-track">
                  <i [style.width.%]="(c.count / maxCategory()) * 100"></i>
                </div>
                <b>{{ c.count }}</b>
              </div>
            }
          </div>
        </section>
        <section class="admin-panel">
          <div class="panel-heading"><h2>Quick actions</h2></div>
          <a routerLink="/admin/catalog/packages" class="quick-action"
            ><span class="metric-icon"><zrc-admin-icon name="book" /></span>
            <div><b>Package collection</b><small>Review prices and package details</small></div>
            <zrc-admin-icon name="arrow" /></a
          ><a
            *hasPermission="'catalog.costing.view'"
            routerLink="/admin/catalog/costing"
            class="quick-action"
            ><span class="metric-icon"><zrc-admin-icon name="chart" /></span>
            <div>
              <b>Costing & margins</b><small>Review profitability and export your sheet</small>
            </div>
            <zrc-admin-icon name="arrow" /></a
          ><a *hasPermission="'identity.user.view'" routerLink="/admin/users" class="quick-action"
            ><span class="metric-icon"><zrc-admin-icon name="users" /></span>
            <div><b>Team & access</b><small>Manage staff accounts and roles</small></div>
            <zrc-admin-icon name="arrow"
          /></a>
        </section>
      </div>
      <section class="admin-panel" *hasPermission="'catalog.costing.view'">
        <div class="panel-heading">
          <div>
            <h2>Pricing health</h2>
            <p class="muted small">Package economics, not event revenue</p>
          </div>
          <a routerLink="/admin/catalog/costing">View costing sheet →</a>
        </div>
        <div class="pricing-health">
          <div>
            <small>Average cost / head</small><b>{{ costingReady() ? bdt(avgCost()) : '—' }}</b>
          </div>
          <div>
            <small>Average profit / head</small><b>{{ costingReady() ? bdt(avgProfit()) : '—' }}</b>
          </div>
          <div>
            <small>Average package margin</small
            ><b>{{ costingReady() ? (avgMargin() * 100).toFixed(1) + '%' : '—' }}</b>
          </div>
          <div>
            <small>Below 35% margin</small
            ><b [class.error]="lowMargin().length">{{
              costingReady() ? lowMargin().length : '—'
            }}</b>
          </div>
        </div>
      </section>
      <section class="admin-panel">
        <div class="panel-heading">
          <div>
            <h2>Your signature collection</h2>
            <p class="muted small">Selected packages from your live catalog</p>
          </div>
          <a routerLink="/admin/catalog/packages">All packages →</a>
        </div>
        <div class="admin-package-grid">
          @for (p of featured(); track p.id) {
            <a class="admin-package-tile" [routerLink]="['/admin/catalog/packages', p.id]"
              >
              <div>
                <small>{{ p.categoryName }}</small>
                <h3>{{ p.name }}</h3>
                <span>{{ bdt(p.salePricePerHead) }} <small>/ head</small></span
                ><span class="admin-status">{{ p.isActive ? 'Active' : 'Hidden' }}</span>
              </div></a
            >
          } @empty {
            <p class="muted">
              {{ loading() ? 'Loading your collection…' : 'No packages available.' }}
            </p>
          }
        </div>
      </section>
    }
    <section class="admin-panel" *hasPermission="'reporting.view'">
      <div class="panel-heading">
        <div>
          <h2>This month's bookings</h2>
          <p class="muted small">
            By event date. Confirmed sales are separate from received payments.
          </p>
        </div>
        <a routerLink="/admin/reports">Open reports →</a>
      </div>
      @if (bookings(); as b) {
        <div class="pricing-health">
          <div>
            <small>Bookings / pending</small><b>{{ b.orderCount }} / {{ b.pendingCount }}</b>
          </div>
          <div>
            <small>Confirmed sales</small><b>{{ bdt(b.bookedSales) }}</b>
          </div>
          <div>
            <small>Collected payments</small><b>{{ bdt(b.collected) }}</b>
          </div>
          <div>
            <small>Outstanding balance</small><b>{{ bdt(b.outstanding) }}</b>
          </div>
        </div>
      } @else {
        <p class="muted">Booking figures are loading or unavailable. Use Refresh to retry.</p>
      }
    </section>
    <section class="admin-panel">
      <div class="panel-heading">
        <h2>Workspace readiness</h2>
        <span class="admin-status neutral">Feature availability</span>
      </div>
      <div class="readiness-grid">
        <div>
          <b>Catalog & pricing</b
          ><small>Packages, menu items, categories and add-on services are connected.</small
          ><span class="admin-status">Available</span>
        </div>
        <div>
          <b>Team & administration</b
          ><small>Permission-based access, navigation management and audit history.</small
          ><span class="admin-status">Available</span>
        </div>
        <div>
          <b>Orders & customer operations</b
          ><small
            >Bookings, calendar, kitchen prep, customers, payments and reports are connected.</small
          ><span class="admin-status">Available</span>
        </div>
      </div>
    </section>
  `,
})
export class AdminDashboardComponent {
  readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  readonly packages = signal<AdminPackage[]>([]);
  readonly costs = signal<CostingRow[]>([]);
  readonly bookings = signal<{
    orderCount: number;
    pendingCount: number;
    bookedSales: number;
    collected: number;
    outstanding: number;
  } | null>(null);
  readonly costingReady = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly bdt = formatBDT;
  readonly firstName = computed(() => this.auth.currentUser()?.name.split(' ')[0] ?? 'there');
  readonly activeCount = computed(() => this.packages().filter((p) => p.isActive).length);
  readonly featuredCount = computed(() => this.packages().filter((p) => p.isFeatured).length);
  readonly featured = computed(() => {
    const active = this.packages().filter((p) => p.isActive);
    const selected = active.filter((p) => p.isFeatured);
    return (selected.length ? selected : active).slice(0, 3);
  });
  readonly avgPrice = computed(() => average(this.packages().map((p) => p.salePricePerHead)));
  readonly avgCost = computed(() => average(this.costs().map((p) => p.totalCost)));
  readonly avgProfit = computed(() => average(this.costs().map((p) => p.profit)));
  readonly avgMargin = computed(() => average(this.costs().map((p) => p.marginPct)));
  readonly lowMargin = computed(() => this.costs().filter((p) => p.marginPct < MARGIN_THRESHOLD));
  readonly categories = computed(() => {
    const counts = new Map<string, number>();
    for (const p of this.packages())
      counts.set(p.categoryName, (counts.get(p.categoryName) ?? 0) + 1);
    return Array.from(counts, ([name, count]) => ({ name, count }));
  });
  readonly maxCategory = computed(() => Math.max(1, ...this.categories().map((c) => c.count)));
  constructor() {
    effect(() => {
      this.auth.permissions();
      this.reload();
    });
  }
  reload(): void {
    this.error.set(null);
    if (this.auth.hasPermission('reporting.view')) {
      this.bookings.set(null);
      this.http
        .get<{
          orderCount: number;
          pendingCount: number;
          bookedSales: number;
          collected: number;
          outstanding: number;
        }>(`${API_BASE_URL}/api/v1/admin/reports`)
        .subscribe({
          next: (rows) => this.bookings.set(rows),
          error: () => this.error.set('Could not load booking figures. Try refreshing.'),
        });
    }
    if (this.auth.hasPermission('catalog.package.view')) {
      this.loading.set(true);
      this.http.get<AdminPackage[]>(`${CATALOG_API}/packages`).subscribe({
        next: (rows) => {
          this.packages.set(rows);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Could not load the catalog. Try refreshing.');
          this.loading.set(false);
        },
      });
    }
    if (this.auth.hasPermission('catalog.costing.view')) {
      this.costingReady.set(false);
      this.http.get<CostingRow[]>(`${CATALOG_API}/costing`).subscribe({
        next: (rows) => {
          this.costs.set(rows);
          this.costingReady.set(true);
        },
        error: () => this.error.set('Could not load pricing health. Try refreshing.'),
      });
    }
  }
}
function average(values: number[]): number {
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
}

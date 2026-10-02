import { Component, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { formatBDT } from '../../../core/bdt';
import { ADMIN_API, dateInDhaka, problem } from './operations.models';
interface Report {
  orderCount: number;
  pendingCount: number;
  guests: number;
  bookedSales: number;
  collected: number;
  outstanding: number;
  totalCost: number | null;
  profit: number | null;
  byStatus: { status: string; count: number }[];
  byPackage: {
    packageName: string;
    categoryName: string;
    orders: number;
    guests: number;
    sales: number;
  }[];
}
@Component({
  selector: 'zrc-reports',
  standalone: true,
  imports: [FormsModule],
  template: ` <div class="admin-page-heading">
      <div>
        <span class="admin-eyebrow">DECISIONS WITH A CLEARER VIEW</span>
        <h1>Business reports</h1>
        <p class="muted">
          Real booking figures by event date, with payments and package performance.
        </p>
      </div>
      <button class="primary" (click)="export()" [disabled]="!report() || loading()">
        Export report
      </button>
    </div>
    @if (error()) {
      <div class="admin-alert error" role="alert">{{ error() }}</div>
    }
    <section class="admin-panel">
      <div class="admin-toolbar">
        <label>From<input type="date" [(ngModel)]="from" /></label
        ><label>To<input type="date" [(ngModel)]="to" /></label
        ><button class="secondary" (click)="reload()" [disabled]="loading()">
          {{ loading() ? 'Loading…' : 'Update report' }}
        </button>
      </div>
      <p class="muted small">
        Booked sales, guest counts and costs cover confirmed through completed events. Collections
        and balances also include pending bookings; cancelled/rejected bookings are excluded.
      </p>
    </section>
    @if (report(); as r) {
      <section class="admin-kpis">
        <article class="admin-kpi">
          <small>Bookings / pending</small><b>{{ r.orderCount }} / {{ r.pendingCount }}</b>
        </article>
        <article class="admin-kpi">
          <small>Booked sales</small><b>{{ bdt(r.bookedSales) }}</b>
        </article>
        <article class="admin-kpi">
          <small>Collected</small><b>{{ bdt(r.collected) }}</b>
        </article>
        <article class="admin-kpi">
          <small>Outstanding</small><b>{{ bdt(r.outstanding) }}</b>
        </article>
      </section>
      @if (r.totalCost !== null) {
        <section class="admin-panel">
          <div class="pricing-health">
            <div>
              <small>Snapshot food/service costs</small><b>{{ bdt(r.totalCost) }}</b>
            </div>
            <div>
              <small>Booked sales less snapshot costs</small><b>{{ bdt(r.profit ?? 0) }}</b>
            </div>
            <div>
              <small>Confirmed guests</small><b>{{ r.guests }}</b>
            </div>
          </div>
          <p class="muted small">
            This contribution figure excludes overheads and delivery fulfilment costs; it is not
            accounting net profit.
          </p>
        </section>
      }
      <section class="admin-panel">
        <h2>Booking status</h2>
        <div class="ops-status-row">
          @for (s of r.byStatus; track s.status) {
            <span class="admin-status">{{ s.status }} · {{ s.count }}</span>
          } @empty {
            <p>No bookings in this period.</p>
          }
        </div>
      </section>
      <section class="admin-panel">
        <h2>Package performance</h2>
        <div class="admin-table-scroll">
          <table class="data">
            <thead>
              <tr>
                <th>Package</th>
                <th>Occasion</th>
                <th>Bookings</th>
                <th>Guests</th>
                <th>Booked sales</th>
              </tr>
            </thead>
            <tbody>
              @for (p of r.byPackage; track p.categoryName + p.packageName) {
                <tr>
                  <td>{{ p.packageName }}</td>
                  <td>{{ p.categoryName }}</td>
                  <td>{{ p.orders }}</td>
                  <td>{{ p.guests }}</td>
                  <td>{{ bdt(p.sales) }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5">No confirmed bookings in this period.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    }`,
})
export class ReportsComponent {
  private readonly http = inject(HttpClient);
  readonly bdt = formatBDT;
  readonly report = signal<Report | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  from = dateInDhaka().slice(0, 7) + '-01';
  to = dateInDhaka(30);
  constructor() {
    this.reload();
  }
  reload() {
    this.loading.set(true);
    this.error.set(null);
    this.report.set(null);
    this.http
      .get<Report>(`${ADMIN_API}/reports`, { params: { from: this.from, to: this.to } })
      .subscribe({
        next: (r) => {
          this.report.set(r);
          this.loading.set(false);
        },
        error: (e: HttpErrorResponse) => {
          this.loading.set(false);
          this.error.set(problem(e));
        },
      });
  }
  export() {
    const r = this.report();
    if (!r) return;
    const escape = (v: string | number) =>
      '"' +
      String(v)
        .replace(/"/g, '""')
        .replace(/^[=+@-]/, "'$&") +
      '"';
    const lines = [
      ['Period', this.from, this.to],
      ['Booked sales', r.bookedSales],
      ['Collected', r.collected],
      ['Outstanding', r.outstanding],
      ...(r.totalCost !== null
        ? [
            ['Snapshot cost', r.totalCost],
            ['Contribution', r.profit ?? 0],
          ]
        : []),
      [],
      ['Package', 'Occasion', 'Orders', 'Guests', 'Sales'],
      ...r.byPackage.map((p) => [p.packageName, p.categoryName, p.orders, p.guests, p.sales]),
    ];
    const url = URL.createObjectURL(
      new Blob(['\uFEFF' + lines.map((row) => row.map(escape).join(',')).join('\r\n')], {
        type: 'text/csv;charset=utf-8',
      }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'zrc-business-report.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
}

import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ADMIN_API, OrderRow, KitchenRow, dateInDhaka, problem } from './operations.models';
@Component({
  selector: 'zrc-event-board',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: ` <div class="admin-page-heading">
      <div>
        <span class="admin-eyebrow">PLAN AHEAD, SERVE BEAUTIFULLY</span>
        <h1>{{ kitchen ? 'Kitchen prep' : 'Event calendar' }}</h1>
        <p class="muted">
          {{
            kitchen
              ? 'Confirmed and in-preparation bookings, grouped by dish and variant.'
              : 'See upcoming celebrations and open any booking for its next step.'
          }}
        </p>
      </div>
      <div class="form-actions">
        <button class="secondary" (click)="reload()" [disabled]="loading()">Refresh</button>
        @if (kitchen) {
          <button class="primary" (click)="print()">Print prep sheet</button>
        }
      </div>
    </div>
    @if (error()) {
      <div class="admin-alert error" role="alert">{{ error() }}</div>
    }
    <section class="admin-panel">
      <div class="admin-toolbar">
        @if (kitchen) {
          <label>Service date<input type="date" [(ngModel)]="date" (change)="reload()" /></label
          ><span
            >{{ heads() }} dish portions across {{ prep().length }} item / variant
            combinations</span
          >
        } @else {
          <button class="secondary" aria-label="Previous month" (click)="move(-1)">←</button
          ><label>Event month<input type="month" [(ngModel)]="month" (change)="reload()" /></label
          ><button class="secondary" aria-label="Next month" (click)="move(1)">→</button
          ><span>{{ orders().length }} bookings this month</span>
        }
      </div>
      @if (loading()) {
        <p role="status">Loading events…</p>
      }
      @if (kitchen) {
        <div class="admin-table-scroll">
          <table class="data">
            <thead>
              <tr>
                <th>Dish / component</th>
                <th>Variant</th>
                <th>Total heads</th>
                <th>Bookings</th>
              </tr>
            </thead>
            <tbody>
              @for (r of prep(); track r.itemName + r.variantName) {
                <tr>
                  <td>
                    <b>{{ r.itemName }}</b>
                  </td>
                  <td>{{ r.variantName }}</td>
                  <td>{{ r.totalHeads }}</td>
                  <td>{{ r.orderCount }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4">No confirmed or in-preparation bookings for this date.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="ops-calendar">
          @for (day of ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']; track day) {
            <div class="ops-weekday">{{ day }}</div>
          }
          @for (cell of cells(); track cell.date) {
            <div
              class="ops-calendar-cell"
              [class.outside]="!cell.inMonth"
              [class.today]="cell.date === today"
            >
              <span>{{ cell.day }}</span>
              @for (o of cell.orders; track o.id) {
                <a
                  [routerLink]="['/admin/orders', o.id]"
                  [class.cancelled]="o.status === 'Cancelled' || o.status === 'Rejected'"
                  ><b>{{ o.eventTime.slice(0, 5) }} · {{ o.contactName }}</b
                  ><small>{{ o.guests }} guests · {{ o.status }}</small></a
                >
              }
            </div>
          }
        </div>
        <p class="muted small">
          Cancelled and rejected bookings are muted. Times are in Bangladesh local time.
        </p>
      }
    </section>`,
})
export class EventBoardComponent {
  private readonly http = inject(HttpClient);
  readonly kitchen = inject(ActivatedRoute).snapshot.data['mode'] === 'kitchen';
  readonly today = dateInDhaka();
  date = this.today;
  month = this.today.slice(0, 7);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly orders = signal<OrderRow[]>([]);
  readonly prep = signal<KitchenRow[]>([]);
  readonly heads = computed(() => this.prep().reduce((s, r) => s + r.totalHeads, 0));
  readonly monthValue = signal(this.month);
  readonly cells = computed(() => {
    const [y, m] = this.monthValue().split('-').map(Number);
    const first = new Date(Date.UTC(y, m - 1, 1));
    const start = first.getUTCDate() - first.getUTCDay();
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(Date.UTC(y, m - 1, start + i));
      const date = d.toISOString().slice(0, 10);
      return {
        date,
        day: d.getUTCDate(),
        inMonth: d.getUTCMonth() === m - 1,
        orders: this.orders().filter((o) => o.eventDate === date),
      };
    });
  });
  constructor() {
    this.reload();
  }
  move(delta: number) {
    const [y, m] = this.month.split('-').map(Number);
    this.month = new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
    this.reload();
  }
  reload() {
    if (this.kitchen ? !this.date : !this.month) return;
    this.loading.set(true);
    this.error.set(null);
    if (this.kitchen) {
      this.http
        .get<KitchenRow[]>(`${ADMIN_API}/orders/kitchen`, { params: { date: this.date } })
        .subscribe({
          next: (r) => {
            this.prep.set(r);
            this.loading.set(false);
          },
          error: (e) => this.fail(e),
        });
    } else {
      this.monthValue.set(this.month);
      const [y, m] = this.month.split('-').map(Number);
      const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
      this.http
        .get<OrderRow[]>(`${ADMIN_API}/orders/calendar`, {
          params: { from: this.month + '-01', to: end },
        })
        .subscribe({
          next: (r) => {
            this.orders.set(r);
            this.loading.set(false);
          },
          error: (e) => this.fail(e),
        });
    }
  }
  print() {
    window.print();
  }
  private fail(e: HttpErrorResponse) {
    this.error.set(problem(e));
    this.loading.set(false);
  }
}

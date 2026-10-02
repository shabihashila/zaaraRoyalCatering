import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL, PagedResult } from '../../../core/api.config';
interface AuditRow {
  id: number;
  occurredAt: string;
  userId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  beforeJson: string | null;
  afterJson: string | null;
  ipAddress: string | null;
}
@Component({
  selector: 'zrc-audit-log',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="admin-page-heading">
      <div>
        <span class="admin-eyebrow">WORKSPACE SECURITY</span>
        <h1>Audit history</h1>
        <p class="muted">A record of privileged actions, accounts and access changes.</p>
      </div>
      <button class="secondary" (click)="load()" [disabled]="loading()">Refresh history</button>
    </div>
    @if (error()) {
      <p class="admin-alert error" role="alert">{{ error() }}</p>
    }
    <section class="admin-panel">
      <div class="panel-heading">
        <h2>Recent actions</h2>
        <span class="muted small">{{ total() }} recorded events</span>
      </div>
      <div class="admin-table-scroll">
        <table class="data">
          <thead>
            <tr>
              <th>Action</th>
              <th>Entity</th>
              <th>Time</th>
              <th>Actor</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            @for (row of rows(); track row.id) {
              <tr>
                <td>
                  <b>{{ row.action }}</b>
                </td>
                <td>
                  {{ row.entityType ?? 'Workspace'
                  }}<small class="cell-subtitle">{{ row.entityId }}</small>
                </td>
                <td>{{ row.occurredAt | date: 'medium' }}</td>
                <td>
                  <small>{{ row.userId ?? 'System' }}</small>
                </td>
                <td>
                  <details>
                    <summary>View changes</summary>
                    <div class="audit-details">
                      <b>Before</b>
                      <pre>{{ row.beforeJson ?? 'No previous value' }}</pre>
                      <b>After</b>
                      <pre>{{ row.afterJson ?? 'No new value' }}</pre>
                    </div>
                  </details>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5" class="empty-state" role="status">
                  {{ loading() ? 'Loading audit history…' : 'No audit events recorded yet.' }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <div class="admin-pagination">
        <span>Page {{ page() }} · 20 events per page</span
        ><button class="secondary" (click)="previous()" [disabled]="page() === 1 || loading()">
          Previous</button
        ><button
          class="secondary"
          (click)="next()"
          [disabled]="page() * 20 >= total() || loading()"
        >
          Next
        </button>
      </div>
    </section>
  `,
})
export class AuditLogComponent {
  private readonly http = inject(HttpClient);
  readonly rows = signal<AuditRow[]>([]);
  readonly page = signal(1);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  constructor() {
    this.load();
  }
  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.http
      .get<PagedResult<AuditRow>>(`${API_BASE_URL}/api/v1/admin/audit`, {
        params: { page: this.page(), pageSize: 20 },
      })
      .subscribe({
        next: (res) => {
          this.rows.set(res.items);
          this.total.set(res.totalCount);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set('Audit history could not be loaded. Try Refresh.');
        },
      });
  }
  next(): void {
    this.page.update((p) => p + 1);
    this.load();
  }
  previous(): void {
    this.page.update((p) => Math.max(1, p - 1));
    this.load();
  }
}

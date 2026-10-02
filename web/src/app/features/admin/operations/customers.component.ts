import { AdminModalComponent } from '../admin-modal.component';
import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { PagedResult } from '../../../core/api.config';
import { ADMIN_API, CustomerRow, problem } from './operations.models';
@Component({
  selector: 'zrc-customers',
  standalone: true,
  imports: [AdminModalComponent, FormsModule, ReactiveFormsModule],
  template: ` <div class="admin-page-heading">
      <div>
        <span class="admin-eyebrow">RELATIONSHIPS WORTH REMEMBERING</span>
        <h1>Customers</h1>
        <p class="muted">Keep contact details and preferences ready for the next celebration.</p>
      </div>
      @if (auth.hasPermission('customers.manage')) {
        <button class="primary" (click)="open()">Add customer</button>
      }
    </div>
    @if (error()) {
      <div class="admin-alert error" role="alert">{{ error() }}</div>
    }
    @if (success()) {
      <div class="admin-alert" role="status">{{ success() }}</div>
    }
    <section class="admin-panel">
      <div class="admin-toolbar">
        <input
          type="search"
          aria-label="Search customers"
          [(ngModel)]="search"
          (keyup.enter)="filter()"
          placeholder="Name, phone or email"
        /><button class="secondary" (click)="filter()">Search</button
        ><button class="secondary" (click)="reload()" [disabled]="loading()">Refresh</button
        ><span>{{ total() }} customers</span>
      </div>
      <div class="admin-table-scroll">
        <table class="data">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Contact</th>
              <th>Address</th>
              <th>Preferences / notes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (c of rows(); track c.id) {
              <tr>
                <td>
                  <b>{{ c.name }}</b>
                </td>
                <td>
                  {{ c.phone }}<small class="ops-block">{{ c.email ?? '—' }}</small>
                </td>
                <td>{{ c.address ?? '—' }}</td>
                <td>{{ c.notes ?? '—' }}</td>
                <td>
                  @if (auth.hasPermission('customers.manage')) {
                    <button class="secondary" (click)="open(c)">Edit</button>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5">
                  {{
                    loading()
                      ? 'Loading customers…'
                      : 'No customers found. Add a contact to get started.'
                  }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <div class="admin-toolbar">
        <span>Page {{ page() }} of {{ pages() }}</span
        ><button (click)="changePage(-1)" [disabled]="page() === 1 || loading()">Previous</button
        ><button (click)="changePage(1)" [disabled]="page() >= pages() || loading()">Next</button>
      </div>
    </section>
    @if (editor()) {
      <zrc-admin-modal
        [label]="editing() ? 'Edit customer' : 'Add customer'"
        [busy]="saving()"
        [error]="error()"
        (dismiss)="editor.set(false)"
      >
        <h2>{{ editing() ? 'Edit customer' : 'New customer' }}</h2>
        <form [formGroup]="form" (ngSubmit)="save()">
          <div class="ops-form-grid">
            <label>Name<input formControlName="name" maxlength="160" /></label
            ><label
              >Mobile number<input
                type="tel"
                formControlName="phone"
                placeholder="01XXXXXXXXX" /></label
            ><label
              >Email (optional)<input type="email" formControlName="email" maxlength="254" /></label
            ><label>Address<textarea formControlName="address" maxlength="1000"></textarea></label
            ><label
              >Preferences / notes<textarea formControlName="notes" maxlength="2000"></textarea>
            </label>
          </div>
          <div class="form-actions">
            <button class="primary" [disabled]="form.invalid || saving()">
              {{ saving() ? 'Saving…' : 'Save customer' }}</button
            ><button
              type="button"
              class="secondary"
              (click)="editor.set(false)"
              [disabled]="saving()"
            >
              Cancel
            </button>
          </div>
        </form>
      </zrc-admin-modal>
    }`,
})
export class CustomersComponent {
  readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  readonly rows = signal<CustomerRow[]>([]);
  readonly editing = signal<CustomerRow | null>(null);
  readonly editor = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / 20)));
  search = '';
  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(160)]],
    phone: ['', [Validators.required, Validators.pattern(/^(?:\+880|0)1[3-9]\d{8}$/)]],
    email: ['', [Validators.email, Validators.maxLength(254)]],
    address: ['', Validators.maxLength(1000)],
    notes: ['', Validators.maxLength(2000)],
  });
  constructor() {
    this.reload();
  }
  reload() {
    this.loading.set(true);
    this.error.set(null);
    this.http
      .get<PagedResult<CustomerRow>>(`${ADMIN_API}/customers`, {
        params: { page: String(this.page()), pageSize: '20', search: this.search },
      })
      .subscribe({
        next: (r) => {
          this.rows.set(r.items);
          this.total.set(r.totalCount);
          this.loading.set(false);
        },
        error: (e) => this.fail(e),
      });
  }
  filter() {
    this.page.set(1);
    this.reload();
  }
  changePage(delta: number) {
    this.page.update((p) => Math.max(1, Math.min(this.pages(), p + delta)));
    this.reload();
  }
  open(c?: CustomerRow) {
    if (!this.auth.hasPermission('customers.manage')) return;
    this.editing.set(c ?? null);
    this.form.reset({
      name: c?.name ?? '',
      phone: c?.phone ?? '',
      email: c?.email ?? '',
      address: c?.address ?? '',
      notes: c?.notes ?? '',
    });
    this.editor.set(true);
    this.error.set(null);
    this.success.set(null);
  }
  save() {
    if (this.form.invalid || this.saving() || !this.auth.hasPermission('customers.manage')) return;
    this.saving.set(true);
    this.error.set(null);
    const c = this.editing();
    const body = { ...this.form.getRawValue(), rowVersion: c?.rowVersion ?? null };
    const req = c
      ? this.http.put(`${ADMIN_API}/customers/${c.id}`, body)
      : this.http.post(`${ADMIN_API}/customers`, body);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.editor.set(false);
        this.success.set('Customer saved.');
        this.reload();
      },
      error: (e) => this.fail(e),
    });
  }
  private fail(e: HttpErrorResponse) {
    this.error.set(problem(e));
    this.saving.set(false);
    this.loading.set(false);
  }
}

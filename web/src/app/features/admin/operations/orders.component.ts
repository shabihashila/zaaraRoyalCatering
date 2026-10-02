import { AdminModalComponent } from '../admin-modal.component';
import { Component, computed, inject, signal, DestroyRef } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, switchMap, catchError, of } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { PagedResult } from '../../../core/api.config';
import { PublicPackage } from '../../public/catalog/catalog.models';
import { formatBDT } from '../../../core/bdt';
import {
  ADMIN_API,
  PUBLIC_API,
  CustomerRow,
  OrderRow,
  OrderDetail,
  STATUSES,
  problem,
  dateInDhaka,
} from './operations.models';

@Component({
  selector: 'zrc-orders',
  standalone: true,
  imports: [AdminModalComponent, RouterLink, DatePipe, FormsModule, ReactiveFormsModule],
  templateUrl: './orders.component.html',
})
export class OrdersComponent {
  readonly statusOpen = signal(false);
  readonly paymentOpen = signal(false);
  readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly destroy = inject(DestroyRef);
  readonly isDetail = this.route.snapshot.data['mode'] === 'detail';
  readonly bdt = formatBDT;
  readonly statuses = STATUSES;
  readonly rows = signal<OrderRow[]>([]);
  readonly detail = signal<OrderDetail | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly editor = signal(false);
  readonly packages = signal<PublicPackage[]>([]);
  readonly customers = signal<CustomerRow[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.total() / 20)));
  search = '';
  status = '';
  from = '';
  to = '';
  statusNote = '';
  nextStatus = '';
  method = 'Cash';
  amount = 0;
  reference = '';
  readonly addOnIds = signal<string[]>([]);
  readonly quote = signal<{
    unitPricePerHead: number;
    subTotal: number;
    addOnTotal: number;
    grandTotal: number;
  } | null>(null);
  readonly form = this.fb.nonNullable.group({
    packageId: ['', Validators.required],
    variantId: [''],
    guests: [60, [Validators.required, Validators.min(1), Validators.max(100000)]],
    eventDate: [dateInDhaka(3), Validators.required],
    eventTime: ['12:00', Validators.required],
    eventType: ['', [Validators.required, Validators.maxLength(160)]],
    venueAddress: ['', [Validators.required, Validators.maxLength(1000)]],
    contactName: ['', [Validators.required, Validators.maxLength(160)]],
    contactPhone: ['', [Validators.required, Validators.pattern(/^(?:\+880|0)1[3-9]\d{8}$/)]],
    customerId: [''],
    notes: ['', Validators.maxLength(2000)],
    deliveryCharge: [0, [Validators.min(0), Validators.max(1000000)]],
    discount: [0, [Validators.min(0), Validators.max(1000000)]],
  });
  readonly selectedPackage = signal<PublicPackage | null>(null);
  constructor() {
    this.reload();
    this.form.valueChanges
      .pipe(
        debounceTime(250),
        takeUntilDestroyed(this.destroy),
        switchMap(() => {
          const v = this.form.getRawValue();
          this.quote.set(null);
          if (!v.packageId || v.guests < 1) return of(null);
          return this.http
            .post<{
              unitPricePerHead: number;
              subTotal: number;
              addOnTotal: number;
              grandTotal: number;
            }>(`${PUBLIC_API}/quotes`, {
              packageId: v.packageId,
              variantId: v.variantId || null,
              guests: v.guests,
              addOnIds: this.addOnIds(),
            })
            .pipe(catchError(() => of(null)));
        }),
      )
      .subscribe((q) => this.quote.set(q));
  }
  reload() {
    this.loading.set(true);
    this.error.set(null);
    if (this.isDetail) {
      this.http
        .get<OrderDetail>(`${ADMIN_API}/orders/${this.route.snapshot.paramMap.get('id')}`)
        .subscribe({
          next: (d) => {
            this.detail.set(d);
            this.loading.set(false);
          },
          error: (e) => this.fail(e),
        });
      return;
    }
    const params: Record<string, string> = { page: String(this.page()), pageSize: '20' };
    for (const [k, v] of Object.entries({
      search: this.search,
      status: this.status,
      from: this.from,
      to: this.to,
    }))
      if (v) params[k] = v;
    this.http.get<PagedResult<OrderRow>>(`${ADMIN_API}/orders`, { params }).subscribe({
      next: (d) => {
        this.rows.set(d.items);
        this.total.set(d.totalCount);
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
    this.page.update((p) => Math.max(1, Math.min(this.pageCount(), p + delta)));
    this.reload();
  }
  openBooking() {
    if (!this.auth.hasPermission('ordering.order.manage')) return;
    this.editor.set(true);
    this.error.set(null);
    this.http
      .get<PublicPackage[]>(`${PUBLIC_API}/catalog/packages`)
      .subscribe({ next: (p) => this.packages.set(p), error: (e) => this.fail(e) });
    if (this.auth.hasPermission('customers.view'))
      this.http
        .get<PagedResult<CustomerRow>>(`${ADMIN_API}/customers?pageSize=100`)
        .subscribe({ next: (p) => this.customers.set(p.items), error: (e) => this.fail(e) });
  }
  selectPackage() {
    const p = this.packages().find((p) => p.id === this.form.controls.packageId.value) ?? null;
    this.selectedPackage.set(p);
    this.addOnIds.set([]);
    this.form.controls.guests.setValidators([
      Validators.required,
      Validators.min(p?.minGuests ?? 1),
      Validators.max(p?.maxGuests ?? 100000),
    ]);
    this.form.controls.guests.updateValueAndValidity();
    this.form.patchValue({
      variantId: p?.variants.find((v) => v.isDefault)?.id ?? p?.variants[0]?.id ?? '',
    });
  }
  selectCustomer() {
    const c = this.customers().find((c) => c.id === this.form.controls.customerId.value);
    if (c)
      this.form.patchValue({
        contactName: c.name,
        contactPhone: c.phone,
        venueAddress: c.address ?? this.form.controls.venueAddress.value,
      });
  }
  toggleAddon(id: string, checked: boolean) {
    this.addOnIds.update((ids) => (checked ? [...ids, id] : ids.filter((x) => x !== id)));
    this.form.updateValueAndValidity({ emitEvent: true });
  }
  create() {
    if (this.form.invalid || this.saving() || !this.auth.hasPermission('ordering.order.manage'))
      return;
    this.saving.set(true);
    this.error.set(null);
    const v = this.form.getRawValue();
    this.http
      .post<OrderRow>(`${ADMIN_API}/orders`, {
        ...v,
        variantId: v.variantId || null,
        customerId: v.customerId || null,
        addOnIds: this.addOnIds(),
      })
      .subscribe({
        next: (o) => {
          this.saving.set(false);
          void this.router.navigate(['/admin/orders', o.id]);
        },
        error: (e) => this.fail(e),
      });
  }
  transition() {
    const d = this.detail();
    if (
      !d ||
      !this.nextStatus ||
      this.saving() ||
      !this.auth.hasPermission('ordering.order.manage')
    )
      return;
    this.saving.set(true);
    this.error.set(null);
    this.http
      .put(`${ADMIN_API}/orders/${d.order.id}/status`, {
        status: this.nextStatus,
        note: this.statusNote || null,
        rowVersion: d.order.rowVersion,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.nextStatus = '';
          this.statusNote = '';
          this.success.set('Order status updated.');
          this.statusOpen.set(false);
          this.reload();
        },
        error: (e) => this.fail(e),
      });
  }
  recordPayment() {
    const d = this.detail();
    if (
      !d ||
      this.amount <= 0 ||
      this.amount > d.order.balance ||
      this.saving() ||
      !this.auth.hasPermission('ordering.payment.record')
    )
      return;
    this.saving.set(true);
    this.error.set(null);
    this.http
      .post(`${ADMIN_API}/orders/${d.order.id}/payments`, {
        method: this.method,
        amount: this.amount,
        reference: this.reference || null,
        rowVersion: d.order.rowVersion,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.amount = 0;
          this.reference = '';
          this.success.set('Payment recorded.');
          this.paymentOpen.set(false);
          this.reload();
        },
        error: (e) => this.fail(e),
      });
  }
  print() {
    window.print();
  }
  private fail(e: HttpErrorResponse) {
    this.loading.set(false);
    this.saving.set(false);
    this.error.set(problem(e));
  }
}

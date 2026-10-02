import { AdminModalComponent } from '../admin-modal.component';
import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CATALOG_API } from './catalog.models';
import { PagedResult } from '../../../core/api.config';
import { AuthService } from '../../../core/auth/auth.service';
import { AdminIconComponent } from '../admin-icon.component';
import { formatBDT } from '../../../core/bdt';

type ResourceKind = 'categories' | 'items' | 'addons';
interface ResourceRow {
  id: string;
  name: string;
  description?: string | null;
  slug?: string;
  sortOrder?: number;
  isActive: boolean;
  rowVersion: string;
  pricingType?: string;
  price?: number;
  cost?: number;
}
@Component({
  selector: 'zrc-catalog-resource',
  standalone: true,
  imports: [AdminModalComponent, FormsModule, ReactiveFormsModule, AdminIconComponent],
  template: `
    <div class="admin-page-heading">
      <div>
        <span class="admin-eyebrow">CATALOG MANAGEMENT</span>
        <h1>{{ title }}</h1>
        <p class="muted">{{ description }}</p>
      </div>
      @if (canEdit()) {
        <button class="primary" (click)="newEntry()">
          <zrc-admin-icon name="plus" />Add {{ singular }}
        </button>
      }
    </div>
    @if (error()) {
      <p class="admin-alert error" role="alert">{{ error() }}</p>
    }
    @if (success()) {
      <p class="admin-alert success" role="status">{{ success() }}</p>
    }
    <section class="admin-panel">
      <form class="admin-toolbar" (submit)="$event.preventDefault(); page.set(1); reload()">
        <label class="admin-search-field"
          ><zrc-admin-icon name="search" /><input
            type="search"
            [ngModel]="search()"
            (ngModelChange)="search.set($event)"
            name="search"
            [attr.aria-label]="'Search ' + title"
            [placeholder]="'Search ' + title.toLowerCase()" /></label
        ><button class="secondary" [disabled]="loading()">Search</button
        ><span class="muted small">{{ total() }} records</span
        ><button class="secondary" type="button" (click)="reload()" [disabled]="loading()">
          <zrc-admin-icon name="refresh" />Refresh
        </button>
      </form>
      <div class="admin-table-scroll">
        <table class="data">
          <thead>
            <tr>
              <th>Name</th>
              @if (kind === 'categories') {
                <th>Description</th>
                <th>Display order</th>
              }
              @if (kind === 'addons') {
                <th>Pricing</th>
                <th>Sale price</th>
                @if (auth.hasPermission('catalog.costing.view')) {
                  <th>Internal cost</th>
                }
              }
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            @for (row of visible(); track row.id) {
              <tr>
                <td>
                  <b>{{ row.name }}</b>
                  @if (row.slug) {
                    <small class="cell-subtitle">{{ row.slug }}</small>
                  }
                </td>
                @if (kind === 'categories') {
                  <td>{{ row.description || 'No description' }}</td>
                  <td>{{ row.sortOrder }}</td>
                }
                @if (kind === 'addons') {
                  <td>{{ row.pricingType === 'PerHead' ? 'Per guest' : 'Flat fee' }}</td>
                  <td>{{ bdt(row.price ?? 0) }}</td>
                  @if (auth.hasPermission('catalog.costing.view')) {
                    <td>{{ bdt(row.cost ?? 0) }}</td>
                  }
                }
                <td>
                  <span class="admin-status" [class.neutral]="!row.isActive">{{
                    row.isActive ? 'Active' : 'Hidden'
                  }}</span>
                </td>
                <td>
                  @if (canEdit()) {
                    <button class="secondary" (click)="edit(row)">Edit</button>
                  } @else {
                    <span class="muted small">View only</span>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7" class="empty-state" role="status">
                  {{ loading() ? 'Loading records…' : 'No records match. Try another search.' }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <div class="admin-pagination">
        <span>Page {{ page() }} of {{ pageCount() }}</span
        ><button class="secondary" (click)="changePage(-1)" [disabled]="page() <= 1 || loading()">
          Previous</button
        ><button
          class="secondary"
          (click)="changePage(1)"
          [disabled]="page() >= pageCount() || loading()"
        >
          Next
        </button>
      </div>
    </section>
    @if (editorOpen()) {
      <zrc-admin-modal
        [label]="(editing() ? 'Edit ' : 'Add ') + singular"
        [busy]="saving()"
        [error]="error()"
        (dismiss)="editorOpen.set(false)"
      >
        <div class="panel-heading">
          <div>
            <h2>{{ editing() ? 'Edit' : 'New' }} {{ singular }}</h2>
            <p class="muted small">Changes are saved to your catalog.</p>
          </div>
          <button class="secondary" (click)="editorOpen.set(false)" [disabled]="saving()">
            Close
          </button>
        </div>
        <form class="admin-form-grid" [formGroup]="form" (ngSubmit)="save()">
          <label>Name<input formControlName="name" type="text" maxlength="256" /></label>
          @if (kind === 'categories' || kind === 'addons') {
            <label>Description<textarea formControlName="description" rows="3"></textarea></label>
          }
          @if (kind === 'categories') {
            <label>Display order<input formControlName="sortOrder" type="number" /></label>
          }
          @if (kind === 'addons') {
            <label
              >Pricing method<select formControlName="pricingType">
                <option value="Flat">Flat fee</option>
                <option value="PerHead">Per guest</option>
              </select></label
            ><label
              >Sale price (BDT)<input
                formControlName="price"
                type="number"
                min="0"
                step="0.01" /></label
            ><label
              >Internal cost (BDT)<input formControlName="cost" type="number" min="0" step="0.01"
            /></label>
          }
          @if (editing() || kind === 'addons') {
            <label class="checkbox-label"
              ><input formControlName="isActive" type="checkbox" />Visible / active</label
            >
          }
          <div class="form-actions">
            <button type="submit" class="primary" [disabled]="form.invalid || saving()">
              {{ saving() ? 'Saving…' : 'Save ' + singular }}</button
            ><button
              type="button"
              class="secondary"
              (click)="editorOpen.set(false)"
              [disabled]="saving()"
            >
              Cancel
            </button>
          </div>
        </form>
      </zrc-admin-modal>
    }
  `,
})
export class CatalogResourceComponent {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);
  readonly kind = this.route.snapshot.data['resource'] as ResourceKind;
  readonly title =
    this.kind === 'categories'
      ? 'Event categories'
      : this.kind === 'items'
        ? 'Menu items'
        : 'Add-on services';
  readonly singular =
    this.kind === 'categories' ? 'category' : this.kind === 'items' ? 'menu item' : 'add-on';
  readonly description =
    this.kind === 'categories'
      ? 'Organize your packages around the occasions you cater for.'
      : this.kind === 'items'
        ? 'Manage the dishes and components used throughout your packages.'
        : 'Set pricing and availability for optional event services.';
  readonly rows = signal<ResourceRow[]>([]);
  readonly search = signal('');
  readonly page = signal(1);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly editorOpen = signal(false);
  readonly editing = signal<ResourceRow | null>(null);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly bdt = formatBDT;
  readonly canEdit = computed(() =>
    this.auth.hasPermission(
      this.kind === 'categories' ? 'catalog.category.edit' : 'catalog.package.edit',
    ),
  );
  readonly filtered = computed(() =>
    this.rows().filter((r) => r.name.toLowerCase().includes(this.search().toLowerCase())),
  );
  readonly visible = computed(() =>
    this.kind === 'items'
      ? this.rows()
      : this.filtered().slice((this.page() - 1) * 20, this.page() * 20),
  );
  readonly pageCount = computed(() =>
    Math.max(1, Math.ceil((this.kind === 'items' ? this.total() : this.filtered().length) / 20)),
  );
  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(256)]],
    description: [''],
    sortOrder: [0],
    isActive: [true],
    pricingType: ['Flat'],
    price: [0, [Validators.required, Validators.min(0)]],
    cost: [0, [Validators.required, Validators.min(0)]],
  });
  constructor() {
    this.reload();
  }
  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    if (this.kind === 'items') {
      this.http
        .get<PagedResult<ResourceRow>>(`${CATALOG_API}/items`, {
          params: { page: this.page(), pageSize: 20, search: this.search() },
        })
        .subscribe({
          next: (res) => {
            this.rows.set(res.items);
            this.total.set(res.totalCount);
            this.loading.set(false);
          },
          error: () => this.loadError(),
        });
    } else {
      this.http.get<ResourceRow[]>(`${CATALOG_API}/${this.kind}`).subscribe({
        next: (rows) => {
          this.rows.set(rows);
          this.total.set(rows.length);
          this.loading.set(false);
        },
        error: () => this.loadError(),
      });
    }
  }
  private loadError(): void {
    this.loading.set(false);
    this.error.set('Could not load records. Check your connection and try Refresh.');
  }
  changePage(delta: number): void {
    this.page.update((p) => Math.max(1, Math.min(this.pageCount(), p + delta)));
    if (this.kind === 'items') this.reload();
  }
  newEntry(): void {
    this.editing.set(null);
    this.form.reset({
      name: '',
      description: '',
      sortOrder: 0,
      isActive: true,
      pricingType: 'Flat',
      price: 0,
      cost: 0,
    });
    this.editorOpen.set(true);
    this.success.set(null);
  }
  edit(row: ResourceRow): void {
    this.editing.set(row);
    this.form.setValue({
      name: row.name,
      description: row.description ?? '',
      sortOrder: row.sortOrder ?? 0,
      isActive: row.isActive,
      pricingType: row.pricingType ?? 'Flat',
      price: row.price ?? 0,
      cost: row.cost ?? 0,
    });
    this.editorOpen.set(true);
    this.success.set(null);
  }
  save(): void {
    if (this.form.invalid || this.saving() || !this.canEdit()) return;
    const v = this.form.getRawValue();
    if (!v.name.trim()) {
      this.error.set('Enter a name.');
      return;
    }
    const row = this.editing();
    let body: object;
    if (this.kind === 'items')
      body = row
        ? { name: v.name.trim(), isActive: v.isActive, rowVersion: row.rowVersion }
        : { name: v.name.trim() };
    else if (this.kind === 'categories')
      body = {
        name: v.name.trim(),
        description: v.description || null,
        sortOrder: v.sortOrder,
        ...(row ? { isActive: v.isActive, rowVersion: row.rowVersion } : {}),
      };
    else
      body = {
        name: v.name.trim(),
        description: v.description || null,
        pricingType: v.pricingType,
        price: v.price,
        cost: v.cost,
        isActive: v.isActive,
      };
    this.saving.set(true);
    this.error.set(null);
    const request = row
      ? this.http.put(`${CATALOG_API}/${this.kind}/${row.id}`, body)
      : this.http.post(`${CATALOG_API}/${this.kind}`, body);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.editorOpen.set(false);
        this.success.set(`${this.singular} saved successfully.`);
        this.reload();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        const problem = err.error as { detail?: string; errors?: Record<string, string[]> } | null;
        this.error.set(
          err.status === 409
            ? 'This record changed or the name already exists. Refresh before editing again.'
            : (problem?.detail ??
                (problem?.errors
                  ? Object.values(problem.errors).flat().join(' ')
                  : 'Could not save the record. Please try again.')),
        );
      },
    });
  }
}

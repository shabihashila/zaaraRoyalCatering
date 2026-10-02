import { AdminModalComponent } from '../admin-modal.component';
import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { API_BASE_URL, MenuItemDto } from '../../../core/api.config';
import { NavigationService } from '../../../core/navigation/navigation.service';

interface FlatRow {
  item: MenuItemDto;
  depth: number;
}

@Component({
  selector: 'zrc-menu-management',
  standalone: true,
  imports: [AdminModalComponent, ReactiveFormsModule],
  template: `
    <h1>Menu Management</h1>
    <p class="muted">
      Organize the staff navigation and control which sections each permission can see.
    </p>
    @if (error() !== null) {
      <p class="error">{{ error() }}</p>
    }
    <div class="admin-table-scroll">
      <table class="data">
        <thead>
          <tr>
            <th>Label</th>
            <th>Key</th>
            <th>Route</th>
            <th>Permission</th>
            <th>Sort</th>
            <th>Visible</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @for (row of flat(); track row.item.id) {
            <tr>
              <td>{{ indent(row.depth) }}{{ row.item.label }}</td>
              <td>{{ row.item.key }}</td>
              <td>{{ row.item.route ?? row.item.externalUrl ?? '—' }}</td>
              <td>{{ row.item.requiredPermission ?? '—' }}</td>
              <td>{{ row.item.sortOrder }}</td>
              <td>{{ row.item.isVisible ? 'yes' : 'no' }}</td>
              <td>
                <button type="button" (click)="startEdit(row.item)">Edit</button>
                <button type="button" (click)="remove(row.item)">Delete</button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <button class="primary" (click)="startAdd()">Add menu item</button>
    @if (editorOpen()) {
      <zrc-admin-modal
        label="Menu item editor"
        [busy]="busy()"
        [error]="error()"
        (dismiss)="cancel()"
      >
        <h2>{{ editingId() === null ? 'Add menu item' : 'Edit menu item' }}</h2>
        <form class="stacked" [formGroup]="form" (ngSubmit)="save()">
          <label>Key <input type="text" formControlName="key" /></label>
          <label>Label <input type="text" formControlName="label" /></label>
          <label>Route <input type="text" formControlName="route" /></label>
          <label
            >Required permission <input type="text" formControlName="requiredPermission"
          /></label>
          <label>Sort order <input type="number" formControlName="sortOrder" /></label>
          <label><input type="checkbox" formControlName="isVisible" /> Visible</label>
          @if (error() !== null) {
            <p class="error">{{ error() }}</p>
          }
          <button type="submit" class="primary" [disabled]="form.invalid || busy()">Save</button>
          @if (editingId() !== null) {
            <button type="button" class="secondary" (click)="cancel()">Cancel</button>
          }
        </form>
      </zrc-admin-modal>
    }
  `,
  styles: ['form.stacked { margin-top: 1rem; }'],
})
export class MenuManagementComponent {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly nav = inject(NavigationService);

  readonly items = signal<MenuItemDto[]>([]);
  readonly flat = signal<FlatRow[]>([]);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly editorOpen = signal(false);
  readonly editingId = signal<string | null>(null);
  private rowVersion: string | null = null;
  private editingSource: MenuItemDto | null = null;

  readonly form = this.fb.nonNullable.group({
    key: ['', [Validators.required, Validators.maxLength(128)]],
    label: ['', [Validators.required, Validators.maxLength(128)]],
    route: [''],
    requiredPermission: [''],
    sortOrder: [0, [Validators.required]],
    isVisible: [true],
  });

  constructor() {
    this.reload();
  }

  indent(depth: number): string {
    return depth > 0 ? '— '.repeat(depth) : '';
  }

  startAdd(): void {
    this.cancel();
    this.error.set(null);
    this.editorOpen.set(true);
  }

  startEdit(item: MenuItemDto): void {
    this.error.set(null);
    this.editorOpen.set(true);
    this.editingId.set(item.id);
    this.editingSource = item;
    this.rowVersion = item.rowVersion;
    this.form.setValue({
      key: item.key,
      label: item.label,
      route: item.route ?? '',
      requiredPermission: item.requiredPermission ?? '',
      sortOrder: item.sortOrder,
      isVisible: item.isVisible,
    });
  }

  cancel(): void {
    this.editorOpen.set(false);
    this.editingId.set(null);
    this.editingSource = null;
    this.rowVersion = null;
    this.form.reset({
      key: '',
      label: '',
      route: '',
      requiredPermission: '',
      sortOrder: 0,
      isVisible: true,
    });
  }

  save(): void {
    if (this.form.invalid || this.busy()) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    const v = this.form.getRawValue();
    const body = {
      key: v.key,
      label: v.label,
      labelBn: this.editingSource?.labelBn ?? null,
      icon: this.editingSource?.icon ?? null,
      route: v.route === '' ? null : v.route,
      externalUrl: this.editingSource?.externalUrl ?? null,
      requiredPermission: v.requiredPermission === '' ? null : v.requiredPermission,
      menuArea: 'Admin',
      parentId: this.editingSource?.parentId ?? null,
      sortOrder: v.sortOrder,
      isVisible: v.isVisible,
      rowVersion: this.rowVersion,
    };
    const id = this.editingId();
    const req =
      id === null
        ? this.http.post<MenuItemDto>(`${API_BASE_URL}/api/v1/admin/navigation/menu`, body)
        : this.http.put<MenuItemDto>(`${API_BASE_URL}/api/v1/admin/navigation/menu/${id}`, body);
    req.subscribe({
      next: () => {
        this.busy.set(false);
        this.cancel();
        this.reload();
        this.nav.load().subscribe();
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        this.error.set(
          err.status === 409 ? 'Conflict: item changed or key exists.' : 'Save failed.',
        );
      },
    });
  }

  remove(item: MenuItemDto): void {
    this.busy.set(true);
    this.error.set(null);
    this.http.delete(`${API_BASE_URL}/api/v1/admin/navigation/menu/${item.id}`).subscribe({
      next: () => {
        this.busy.set(false);
        this.reload();
        this.nav.load().subscribe();
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        this.error.set(err.status === 400 ? 'Delete or move child items first.' : 'Delete failed.');
      },
    });
  }

  private reload(): void {
    this.nav.loadFull('Admin').subscribe({
      next: (items) => {
        this.items.set(items);
        this.flat.set(flatten(items, 0));
      },
      error: () => this.error.set('Failed to load menu.'),
    });
  }
}

function flatten(items: MenuItemDto[], depth: number): FlatRow[] {
  const rows: FlatRow[] = [];
  for (const item of items) {
    rows.push({ item, depth });
    if (item.children.length > 0) {
      rows.push(...flatten(item.children, depth + 1));
    }
  }
  return rows;
}

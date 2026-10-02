import { AdminModalComponent } from '../admin-modal.component';
import { Component, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HasPermissionDirective } from '../../../core/auth/has-permission.directive';
import { AuthService } from '../../../core/auth/auth.service';
import { API_BASE_URL, PagedResult } from '../../../core/api.config';

interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  isStaff: boolean;
  isActive: boolean;
}

interface RoleRow {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: string[];
}

@Component({
  selector: 'zrc-user-admin',
  standalone: true,
  imports: [AdminModalComponent, ReactiveFormsModule, HasPermissionDirective],
  template: `
    <span class="admin-eyebrow">PEOPLE &amp; PERMISSIONS</span>
    <h1>Team &amp; access</h1>
    <p class="muted">
      Create staff accounts (e.g. Kitchen) and assign roles. Staff accounts cannot carry the
      Customer role.
    </p>
    @if (error() !== null) {
      <p class="error">{{ error() }}</p>
    }

    @if (success()) {
      <p class="admin-alert success" role="status">{{ success() }}</p>
    }
    <h2>Staff directory</h2>
    <div class="admin-table-scroll">
      <table class="data">
        <thead>
          <tr>
            <th>Email</th>
            <th>Name</th>
            <th>Staff</th>
            <th>Active</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @for (u of users(); track u.id) {
            <tr>
              <td>{{ u.email }}</td>
              <td>{{ u.name }}</td>
              <td>{{ u.isStaff ? 'yes' : 'no' }}</td>
              <td>{{ u.isActive ? 'yes' : 'no' }}</td>
              <td>
                <button
                  type="button"
                  [disabled]="!auth.hasPermission('identity.role.manage')"
                  (click)="openRoles(u)"
                >
                  Edit roles
                </button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <button class="primary" *hasPermission="'identity.user.manage'" (click)="openCreate()">
      Add staff
    </button>
    @if (createOpen()) {
      <zrc-admin-modal
        label="Create staff"
        [busy]="busy()"
        [error]="error()"
        (dismiss)="createOpen.set(false)"
      >
        <h2>Create staff</h2>
        <form
          class="stacked"
          *hasPermission="'identity.user.manage'"
          [formGroup]="form"
          (ngSubmit)="create()"
        >
          <label>Email <input type="email" formControlName="email" /></label>
          <label>Display name <input type="text" formControlName="displayName" /></label>
          <label>Password <input type="password" formControlName="password" /></label>
          <label>Roles (comma-separated) <input type="text" formControlName="roles" /></label>
          <button type="submit" class="primary" [disabled]="form.invalid || busy()">Create</button>
          <button
            type="button"
            class="secondary"
            [disabled]="busy()"
            (click)="createOpen.set(false)"
          >
            Cancel
          </button>
        </form>
      </zrc-admin-modal>
    }
    @if (roleUser(); as user) {
      <zrc-admin-modal
        label="Edit staff roles"
        [busy]="busy()"
        [error]="error()"
        (dismiss)="roleUser.set(null)"
      >
        <h2>Edit roles</h2>
        <p>{{ user.name }} · {{ user.email }}</p>
        <form (submit)="$event.preventDefault(); setRoles(user, roleInput.value)">
          <label
            >Roles (comma-separated)<input
              #roleInput
              type="text"
              placeholder="e.g. Kitchen"
              required
          /></label>
          <div class="form-actions">
            <button class="primary" [disabled]="busy()">Save roles</button>
            <button
              type="button"
              class="secondary"
              [disabled]="busy()"
              (click)="roleUser.set(null)"
            >
              Cancel
            </button>
          </div>
        </form>
      </zrc-admin-modal>
    }

    <h2>Roles</h2>
    <ul class="role-cards">
      @for (r of roles(); track r.id) {
        <li>
          <b>{{ r.name }}</b> — {{ r.permissions.join(', ') }}
        </li>
      }
    </ul>
  `,
  styles: ['form.stacked { margin-top: 1rem; }'],
})
export class UserAdminComponent {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);

  readonly auth = inject(AuthService);
  readonly success = signal<string | null>(null);
  readonly users = signal<AdminUserRow[]>([]);
  readonly roles = signal<RoleRow[]>([]);
  readonly createOpen = signal(false);
  readonly roleUser = signal<AdminUserRow | null>(null);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    displayName: ['', [Validators.required, Validators.maxLength(128)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    roles: ['Kitchen', [Validators.required]],
  });

  constructor() {
    this.reload();
  }

  openCreate(): void {
    this.form.reset({ email: '', displayName: '', password: '', roles: 'Kitchen' });
    this.error.set(null);
    this.createOpen.set(true);
  }
  openRoles(user: AdminUserRow): void {
    this.error.set(null);
    this.roleUser.set(user);
  }
  create(): void {
    if (this.form.invalid || this.busy() || !this.auth.hasPermission('identity.user.manage')) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    const v = this.form.getRawValue();
    const roles = v.roles
      .split(',')
      .map((r) => r.trim())
      .filter((r) => r.length > 0);
    this.http
      .post<{ id: string }>(`${API_BASE_URL}/api/v1/admin/users`, {
        email: v.email,
        password: v.password,
        displayName: v.displayName,
        roles,
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.createOpen.set(false);
          this.success.set('Staff account created successfully.');
          this.form.controls.password.reset();
          this.reload();
        },
        error: (err: HttpErrorResponse) => {
          this.busy.set(false);
          this.error.set(
            err.status === 403 ? 'Forbidden: needs identity.user.manage.' : 'Create failed.',
          );
        },
      });
  }

  setRoles(user: AdminUserRow, csv: string): void {
    if (this.busy() || !this.auth.hasPermission('identity.role.manage')) return;
    const roles = csv
      .split(',')
      .map((r) => r.trim())
      .filter((r) => r.length > 0);
    if (roles.length === 0) {
      return;
    }
    this.error.set(null);
    this.busy.set(true);
    this.http.put(`${API_BASE_URL}/api/v1/admin/users/${user.id}/roles`, { roles }).subscribe({
      next: () => {
        this.busy.set(false);
        this.roleUser.set(null);
        this.success.set('Staff roles updated.');
        this.reload();
      },
      error: () => {
        this.busy.set(false);
        this.error.set('Set roles failed.');
      },
    });
  }

  private reload(): void {
    this.http
      .get<PagedResult<AdminUserRow>>(`${API_BASE_URL}/api/v1/admin/users?page=1&pageSize=50`)
      .subscribe({
        next: (res) => this.users.set(res.items),
        error: () => this.error.set('Failed to load users (needs identity.user.view).'),
      });
    this.http.get<RoleRow[]>(`${API_BASE_URL}/api/v1/admin/roles`).subscribe({
      next: (rows) => this.roles.set(rows),
      error: () => undefined,
    });
  }
}

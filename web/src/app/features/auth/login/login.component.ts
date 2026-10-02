import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'zrc-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="login-wrap">
      <h1>Staff sign in</h1>
      <p>Use your SuperAdmin or staff account. Customers use the public site.</p>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <label>
          Email or phone
          <input type="text" formControlName="emailOrPhone" autocomplete="username" />
        </label>
        <label>
          Password
          <input type="password" formControlName="password" autocomplete="current-password" />
        </label>
        @if (error() !== null) {
          <p class="error">{{ error() }}</p>
        }
        <button type="submit" [disabled]="form.invalid || busy()">Sign in</button>
      </form>
      <p><a routerLink="/">Back to public site</a></p>
    </section>
  `,
  styles: [
    '.login-wrap form button[type=submit] { font: inherit; font-weight: 700; background: var(--zrc-emerald); color: #fff; border: 0; border-radius: 999px; padding: 0.6rem 1.3rem; cursor: pointer; }',
  ],
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    emailOrPhone: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  submit(): void {
    if (this.form.invalid || this.busy()) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    const { emailOrPhone, password } = this.form.getRawValue();
    this.auth.login(emailOrPhone, password).subscribe({
      next: () => {
        this.busy.set(false);
        void this.router.navigate(['/admin']);
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        this.error.set(err.status === 401 || err.status === 423 ? 'Invalid credentials.' : 'Sign in failed.');
      },
    });
  }
}

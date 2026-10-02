import { Injectable, computed, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { API_BASE_URL } from '../api.config';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  isStaff: boolean;
}

interface LoginResponseUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
}

interface LoginResponse {
  accessToken: string;
  expiresAt: string;
  user: LoginResponseUser;
}

interface MeResponse {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  isStaff: boolean;
  roles: string[];
  permissions: string[];
}

const TOKEN_KEY = 'zrc_access_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly accessToken = signal<string | null>(this.readStoredToken());
  readonly currentUser = signal<AuthUser | null>(null);
  readonly roles = signal<string[]>([]);
  readonly permissions = signal<string[]>([]);

  readonly isAuthenticated = computed(() => this.accessToken() !== null);

  hasPermission(permission: string): boolean {
    return this.permissions().includes(permission);
  }

  login(emailOrPhone: string, password: string): Observable<LoginResponseUser> {
    return this.http
      .post<LoginResponse>(`${API_BASE_URL}/api/v1/auth/login`, { emailOrPhone, password })
      .pipe(
        tap((res) => this.setSession(res.accessToken)),
        tap((res) => {
          this.currentUser.set({
            id: res.user.id,
            email: res.user.email,
            name: res.user.name,
            isStaff: false,
          });
          this.roles.set(res.user.roles);
        }),
        // Permissions come from /me; login response carries roles only.
        tap(() => this.loadMe().subscribe()),
        map((res) => res.user),
      );
  }

  loadMe(): Observable<MeResponse | null> {
    if (this.accessToken() === null) {
      return of(null);
    }
    return this.http.get<MeResponse>(`${API_BASE_URL}/api/v1/auth/me`).pipe(
      tap((me) => {
        this.currentUser.set({
          id: me.id,
          email: me.email,
          name: me.name,
          phone: me.phone,
          isStaff: me.isStaff,
        });
        this.roles.set(me.roles);
        this.permissions.set(me.permissions);
      }),
      catchError(() => {
        this.clearSession();
        return of(null);
      }),
    );
  }

  /** Used by route guards: true when a session exists (loading /me on demand). */
  ensureLoaded(): Observable<boolean> {
    if (this.accessToken() === null) {
      return of(false);
    }
    if (this.currentUser() !== null) {
      return of(true);
    }
    return this.loadMe().pipe(map((me) => me !== null));
  }

  refresh(): Observable<boolean> {
    return this.http
      .post<LoginResponse>(`${API_BASE_URL}/api/v1/auth/refresh`, {}, { withCredentials: true })
      .pipe(
        tap((res) => this.setSession(res.accessToken)),
        map(() => true),
        catchError(() => {
          this.clearSession();
          return of(false);
        }),
      );
  }

  logout(): Observable<unknown> {
    return this.http.post(`${API_BASE_URL}/api/v1/auth/logout`, {}, { withCredentials: true }).pipe(
      tap(() => this.clearSession()),
      catchError(() => {
        this.clearSession();
        return of(null);
      }),
    );
  }

  private setSession(token: string): void {
    this.accessToken.set(token);
    if (this.isBrowser) {
      localStorage.setItem(TOKEN_KEY, token);
    }
  }

  private clearSession(): void {
    this.accessToken.set(null);
    this.currentUser.set(null);
    this.roles.set([]);
    this.permissions.set([]);
    if (this.isBrowser) {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  private readStoredToken(): string | null {
    if (!this.isBrowser) {
      return null;
    }
    return localStorage.getItem(TOKEN_KEY);
  }
}

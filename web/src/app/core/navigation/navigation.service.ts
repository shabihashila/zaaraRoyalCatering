import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';
import { API_BASE_URL, MenuItemDto } from '../api.config';

/** Signal store for the dynamic admin sidebar (nav.MenuItems), filtered server-side by permission. */
@Injectable({ providedIn: 'root' })
export class NavigationService {
  private readonly http = inject(HttpClient);

  readonly menu = signal<MenuItemDto[]>([]);
  readonly loaded = signal(false);

  load(): Observable<MenuItemDto[]> {
    return this.http.get<MenuItemDto[]>(`${API_BASE_URL}/api/v1/admin/navigation/menu`).pipe(
      tap((items) => {
        this.menu.set(items);
        this.loaded.set(true);
      }),
      catchError(() => {
        this.menu.set([]);
        this.loaded.set(true);
        return of([]);
      }),
    );
  }

  loadFull(area: 'Admin' | 'Public'): Observable<MenuItemDto[]> {
    return this.http.get<MenuItemDto[]>(
      `${API_BASE_URL}/api/v1/admin/navigation/menu/all?area=${area}`,
    );
  }

  reset(): void {
    this.menu.set([]);
    this.loaded.set(false);
  }
}

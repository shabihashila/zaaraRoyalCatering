import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { API_BASE_URL } from '../../../core/api.config';
import type { PublicCategory, PublicPackage } from './catalog.models';
import { FALLBACK_CATEGORIES, FALLBACK_PACKAGES } from './catalog-fallback';

const PUBLIC_CATALOG = `${API_BASE_URL}/api/v1/public/catalog`;

/** Public catalogue reads (output-cached 5 min server-side). Falls back to static data for prerender/offline. */
@Injectable({ providedIn: 'root' })
export class CatalogApiService {
  private readonly http = inject(HttpClient);

  listCategories(): Observable<PublicCategory[]> {
    return this.http.get<PublicCategory[]>(`${PUBLIC_CATALOG}/categories`).pipe(
      catchError(() => of(FALLBACK_CATEGORIES)),
    );
  }

  listPackages(filters: { category?: string; guests?: number; maxPrice?: number }): Observable<PublicPackage[]> {
    let params = new HttpParams();
    if (filters.category) params = params.set('category', filters.category);
    if (filters.guests) params = params.set('guests', String(filters.guests));
    if (filters.maxPrice) params = params.set('maxPrice', String(filters.maxPrice));
    return this.http.get<PublicPackage[]>(`${PUBLIC_CATALOG}/packages`, { params }).pipe(
      map((rows) => this.applyClientFilters(rows, filters)),
      catchError(() => of(this.applyClientFilters(FALLBACK_PACKAGES, filters))),
    );
  }

  getPackage(slug: string): Observable<PublicPackage | null> {
    return this.http.get<PublicPackage>(`${PUBLIC_CATALOG}/packages/${slug}`).pipe(
      catchError(() => of(FALLBACK_PACKAGES.find((p) => p.slug === slug) ?? null)),
    );
  }

  private applyClientFilters(
    rows: PublicPackage[],
    filters: { category?: string; guests?: number; maxPrice?: number },
  ): PublicPackage[] {
    return rows.filter((p) => {
      if (filters.category && p.categorySlug !== filters.category) return false;
      if (filters.guests !== undefined && !Number.isNaN(filters.guests)) {
        if (p.minGuests > filters.guests) return false;
        if (p.maxGuests !== null && p.maxGuests < filters.guests) return false;
      }
      if (filters.maxPrice !== undefined && p.salePricePerHead > filters.maxPrice) return false;
      return true;
    });
  }
}

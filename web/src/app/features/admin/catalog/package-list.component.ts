import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CATALOG_API, MARGIN_THRESHOLD, AdminPackage, toCsv, downloadCsv } from './catalog.models';
import { AuthService } from '../../../core/auth/auth.service';
import { formatBDT } from '../../../core/bdt';
import { foodImage } from '../../public/food-images';
@Component({
  selector: 'zrc-package-list',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './package-list.component.html',
})
export class PackageListComponent {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  readonly auth = inject(AuthService);
  readonly packages = signal<AdminPackage[]>([]);
  readonly error = signal<string | null>(null);
  readonly loading = signal(false);
  readonly search = signal('');
  readonly category = signal('');
  readonly status = signal('all');
  readonly bdt = formatBDT;
  readonly categories = computed(() =>
    Array.from(new Set(this.packages().map((p) => p.categoryName))),
  );
  readonly filtered = computed(() =>
    this.packages().filter(
      (p) =>
        (p.name + ' ' + p.categoryName).toLowerCase().includes(this.search().toLowerCase()) &&
        (!this.category() || p.categoryName === this.category()) &&
        (this.status() === 'all' || p.isActive === (this.status() === 'active')),
    ),
  );
  readonly lowMargin = computed(() =>
    this.packages().filter((p) => p.marginPct < MARGIN_THRESHOLD),
  );
  readonly photo = (name: string) => foodImage(name).replace('.webp', '-small.webp');
  constructor() {
    this.route.queryParamMap.subscribe((q) => this.search.set(q.get('search') ?? ''));
    this.reload();
  }
  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.http.get<AdminPackage[]>(`${CATALOG_API}/packages`).subscribe({
      next: (rows) => {
        this.packages.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Could not load packages. Try refreshing.');
      },
    });
  }
  export(): void {
    if (!this.auth.hasPermission('catalog.costing.view')) return;
    downloadCsv(
      'zrc-packages.csv',
      toCsv(
        this.filtered().map((p) => ({
          packageId: p.id,
          packageName: p.name,
          categoryName: p.categoryName,
          salePricePerHead: p.salePricePerHead,
          totalCost: p.totalCost,
          profit: p.profit,
          marginPct: p.marginPct,
        })),
      ),
      document,
    );
  }
}

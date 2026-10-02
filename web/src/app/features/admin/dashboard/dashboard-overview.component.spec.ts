import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { AdminDashboardComponent } from './dashboard-overview.component';
import { CATALOG_API } from '../catalog/catalog.models';

describe('Admin overview permissions and live figures', () => {
  const permissions = signal<string[]>([]);
  beforeEach(() => {
    permissions.set(['catalog.package.view']);
    TestBed.configureTestingModule({
      imports: [AdminDashboardComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            permissions,
            currentUser: signal({ name: 'Test Owner' }),
            hasPermission: (p: string) => permissions().includes(p),
          },
        },
      ],
    });
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('loads real package figures without requesting confidential costing for a view-only account', () => {
    const fixture = TestBed.createComponent(AdminDashboardComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(`${CATALOG_API}/packages`).flush([
      {
        id: '1',
        name: 'Royal Kacchi',
        categoryName: 'Lunch',
        salePricePerHead: 500,
        isActive: true,
        isFeatured: true,
      },
      {
        id: '2',
        name: 'Standard',
        categoryName: 'Lunch',
        salePricePerHead: 250,
        isActive: true,
        isFeatured: false,
      },
    ]);
    http.expectNone(`${CATALOG_API}/costing`);
    expect(fixture.componentInstance.avgPrice()).toBe(375);
    expect(fixture.componentInstance.activeCount()).toBe(2);
    expect(fixture.componentInstance.categories()).toEqual([{ name: 'Lunch', count: 2 }]);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Average cost / head');
  });
  it('does not request catalog or costing data for a kitchen account', () => {
    permissions.set(['ordering.kitchen.view']);
    const fixture = TestBed.createComponent(AdminDashboardComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectNone(`${CATALOG_API}/packages`);
    http.expectNone(`${CATALOG_API}/costing`);
  });
});

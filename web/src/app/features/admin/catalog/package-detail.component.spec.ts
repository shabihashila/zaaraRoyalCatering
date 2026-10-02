import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { PackageDetailComponent } from './package-detail.component';
import { CATALOG_API } from './catalog.models';

describe('Live package economics', () => {
  it('recalculates profit and margin immediately when the sale price changes', () => {
    TestBed.configureTestingModule({
      imports: [PackageDetailComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ id: 'package-id' })) },
        },
        { provide: AuthService, useValue: { hasPermission: () => true } },
      ],
    });
    const fixture = TestBed.createComponent(PackageDetailComponent);
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(`${CATALOG_API}/packages/package-id`).flush({
      id: 'package-id',
      name: 'Royal Kacchi',
      categoryName: 'Lunch',
      salePricePerHead: 500,
      minGuests: 1,
      maxGuests: null,
      isActive: true,
      isFeatured: true,
      rowVersion: 'one',
      items: [
        { itemId: '1', itemName: 'Kacchi', displayName: null, costPerHead: 205 },
        { itemId: '2', itemName: 'Borhani', displayName: null, costPerHead: 25 },
      ],
    });
    http.expectOne(`${CATALOG_API}/packages/package-id/prices`).flush([]);
    expect(fixture.componentInstance.liveProfit()).toBe(270);
    fixture.componentInstance.form.controls.salePrice.setValue(580);
    expect(fixture.componentInstance.liveProfit()).toBe(350);
    expect(fixture.componentInstance.liveMargin()).toBeCloseTo(350 / 580);
    http.verify();
  });
});

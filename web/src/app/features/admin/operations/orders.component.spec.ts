import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { OrdersComponent } from './orders.component';
import { ADMIN_API } from './operations.models';
describe('Operational order editor', () => {
  it('sends the loaded concurrency token and retains the order after a conflicting transition', () => {
    TestBed.configureTestingModule({
      imports: [OrdersComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { data: { mode: 'detail' }, paramMap: new Map([['id', 'booking']]) },
          },
        },
        { provide: AuthService, useValue: { hasPermission: () => true } },
      ],
    });
    const fixture = TestBed.createComponent(OrdersComponent);
    const component = fixture.componentInstance;
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(`${ADMIN_API}/orders/booking`).flush({
      order: { id: 'booking', status: 'Pending', rowVersion: 'current-version', balance: 1000 },
      allowedTransitions: ['Confirmed'],
      history: [],
      payments: [],
      snapshot: { items: [], addOns: [], variant: null },
    });
    component.nextStatus = 'Confirmed';
    component.transition();
    const request = http.expectOne(`${ADMIN_API}/orders/booking/status`);
    expect(request.request.body.rowVersion).toBe('current-version');
    request.flush({ detail: 'Conflict' }, { status: 409, statusText: 'Conflict' });
    expect(component.detail()?.order.status).toBe('Pending');
    expect(component.nextStatus).toBe('Confirmed');
    expect(component.saving()).toBe(false);
    expect(component.error()).toContain('Refresh');
    http.verify();
    fixture.destroy();
  });
  it('does not send a payment exceeding the outstanding balance', () => {
    TestBed.configureTestingModule({
      imports: [OrdersComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { data: { mode: 'detail' }, paramMap: new Map([['id', 'booking']]) },
          },
        },
        { provide: AuthService, useValue: { hasPermission: () => true } },
      ],
    });
    const fixture = TestBed.createComponent(OrdersComponent);
    const component = fixture.componentInstance;
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(`${ADMIN_API}/orders/booking`).flush({
      order: { id: 'booking', balance: 1000, rowVersion: 'current-version' },
      allowedTransitions: [],
      history: [],
      payments: [],
      snapshot: { items: [], addOns: [], variant: null },
    });
    component.amount = 1001;
    component.recordPayment();
    http.expectNone(`${ADMIN_API}/orders/booking/payments`);
    http.verify();
    fixture.destroy();
  });
});

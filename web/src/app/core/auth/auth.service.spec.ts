import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { API_BASE_URL } from '../api.config';

describe('Session refresh', () => {
  afterEach(() => localStorage.removeItem('zrc_access_token'));

  it('retains the staff profile without triggering a recursive profile request', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const auth = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);
    const user = { id: 'staff', email: 'staff@example.com', name: 'Staff', isStaff: true };
    auth.currentUser.set(user);
    auth.permissions.set(['catalog.package.view']);
    let refreshed = false;
    auth.refresh().subscribe((ok) => (refreshed = ok));
    http.expectOne(`${API_BASE_URL}/api/v1/auth/refresh`).flush({
      accessToken: 'renewed-token',
      expiresAt: '2099-01-01',
      user: { ...user, roles: ['Kitchen'] },
    });
    expect(refreshed).toBe(true);
    expect(auth.accessToken()).toBe('renewed-token');
    expect(auth.currentUser()).toEqual(user);
    expect(auth.permissions()).toEqual(['catalog.package.view']);
    http.expectNone(`${API_BASE_URL}/api/v1/auth/me`);
    http.verify();
  });
});

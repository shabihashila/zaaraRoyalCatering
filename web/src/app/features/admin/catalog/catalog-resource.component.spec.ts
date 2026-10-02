import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { CatalogResourceComponent } from './catalog-resource.component';
import { CATALOG_API } from './catalog.models';

describe('Category editor contract', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [CatalogResourceComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { data: { resource: 'categories' } } } },
        { provide: AuthService, useValue: { hasPermission: () => true } },
      ],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('retains the concurrency version and status when saving an existing category', () => {
    const fixture = TestBed.createComponent(CatalogResourceComponent);
    const http = TestBed.inject(HttpTestingController);
    const row = {
      id: 'category-id',
      name: 'Lunch',
      description: 'Lunch menus',
      sortOrder: 20,
      isActive: false,
      rowVersion: 'version-1',
    };
    http.expectOne(`${CATALOG_API}/categories`).flush([row]);
    fixture.componentInstance.edit(row);
    fixture.componentInstance.form.controls.name.setValue('Lunch events');
    fixture.componentInstance.save();
    const save = http.expectOne(`${CATALOG_API}/categories/category-id`);
    expect(save.request.method).toBe('PUT');
    expect(save.request.body).toEqual({
      name: 'Lunch events',
      description: 'Lunch menus',
      sortOrder: 20,
      isActive: false,
      rowVersion: 'version-1',
    });
    save.flush({ id: row.id });
    http.expectOne(`${CATALOG_API}/categories`).flush([row]);
    expect(fixture.componentInstance.success()).toContain('saved successfully');
  });
  it('keeps the editor open and explains a concurrency conflict', () => {
    const fixture = TestBed.createComponent(CatalogResourceComponent);
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(`${CATALOG_API}/categories`).flush([]);
    fixture.componentInstance.edit({ id: '1', name: 'Lunch', isActive: true, rowVersion: 'old' });
    fixture.componentInstance.save();
    http
      .expectOne(`${CATALOG_API}/categories/1`)
      .flush({ detail: 'Conflict' }, { status: 409, statusText: 'Conflict' });
    expect(fixture.componentInstance.editorOpen()).toBe(true);
    expect(fixture.componentInstance.error()).toContain('Refresh');
  });
});

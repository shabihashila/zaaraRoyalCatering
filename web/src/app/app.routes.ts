import { Routes } from '@angular/router';
import { PublicLayoutComponent } from './layouts/public-layout/public-layout.component';
import { HomeComponent } from './features/public/home/home.component';
import { MenuComponent } from './features/public/menu/menu.component';
import { PackageDetailComponent } from './features/public/package-detail/package-detail.component';
import { AboutComponent } from './features/public/about/about.component';
import { GalleryComponent } from './features/public/gallery/gallery.component';
import { FaqsComponent } from './features/public/faqs/faqs.component';
import { ContactComponent } from './features/public/contact/contact.component';
import { InquiryComponent } from './features/public/inquiry/inquiry.component';
import { LoginComponent } from './features/auth/login/login.component';
import { authGuard, permissionGuard } from './core/auth/permission.guard';

export const routes: Routes = [
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      { path: '', component: HomeComponent },
      { path: 'menu', component: MenuComponent },
      { path: 'packages/:slug', component: PackageDetailComponent },
      { path: 'about', component: AboutComponent },
      { path: 'gallery', component: GalleryComponent },
      { path: 'faqs', component: FaqsComponent },
      { path: 'contact', component: ContactComponent },
      { path: 'inquiry', component: InquiryComponent },
    ],
  },
  { path: 'login', component: LoginComponent },
  {
    path: 'admin',
    loadComponent: () =>
      import('./layouts/admin-layout/admin-workspace.component').then(
        (m) => m.AdminLayoutComponent,
      ),
    canActivate: [authGuard],
    children: [
      // Operational routes are permission-protected and loaded on demand.
      {
        path: 'orders/calendar',
        loadComponent: () =>
          import('./features/admin/operations/event-board.component').then(
            (m) => m.EventBoardComponent,
          ),
        canActivate: [permissionGuard],
        data: { permission: 'ordering.order.view', mode: 'calendar' },
      },
      {
        path: 'orders/kitchen',
        loadComponent: () =>
          import('./features/admin/operations/event-board.component').then(
            (m) => m.EventBoardComponent,
          ),
        canActivate: [permissionGuard],
        data: { permission: 'ordering.kitchen.view', mode: 'kitchen' },
      },
      {
        path: 'orders/:id',
        loadComponent: () =>
          import('./features/admin/operations/orders.component').then((m) => m.OrdersComponent),
        canActivate: [permissionGuard],
        data: { permission: 'ordering.order.view', mode: 'detail' },
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./features/admin/operations/orders.component').then((m) => m.OrdersComponent),
        canActivate: [permissionGuard],
        data: { permission: 'ordering.order.view', mode: 'list' },
      },
      {
        path: 'customers',
        loadComponent: () =>
          import('./features/admin/operations/customers.component').then(
            (m) => m.CustomersComponent,
          ),
        canActivate: [permissionGuard],
        data: { permission: 'customers.view' },
      },
      {
        path: 'engagement/reviews',
        loadComponent: () =>
          import('./features/admin/operations/records.component').then((m) => m.RecordsComponent),
        canActivate: [permissionGuard],
        data: { permission: 'engagement.review.moderate', mode: 'reviews' },
      },
      {
        path: 'engagement/requests',
        loadComponent: () =>
          import('./features/admin/operations/records.component').then((m) => m.RecordsComponent),
        canActivate: [permissionGuard],
        data: { permission: 'engagement.inquiry.view', mode: 'requests' },
      },
      {
        path: 'content',
        loadComponent: () =>
          import('./features/admin/operations/records.component').then((m) => m.RecordsComponent),
        canActivate: [permissionGuard],
        data: { permission: 'content.view', mode: 'content' },
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./features/admin/operations/reports.component').then((m) => m.ReportsComponent),
        canActivate: [permissionGuard],
        data: { permission: 'reporting.view' },
      },

      {
        path: '',
        loadComponent: () =>
          import('./features/admin/dashboard/dashboard-overview.component').then(
            (m) => m.AdminDashboardComponent,
          ),
      },
      {
        path: 'catalog/categories',
        loadComponent: () =>
          import('./features/admin/catalog/catalog-resource.component').then(
            (m) => m.CatalogResourceComponent,
          ),
        canActivate: [permissionGuard],
        data: { permission: 'catalog.category.view', resource: 'categories' },
      },
      {
        path: 'catalog/items',
        loadComponent: () =>
          import('./features/admin/catalog/catalog-resource.component').then(
            (m) => m.CatalogResourceComponent,
          ),
        canActivate: [permissionGuard],
        data: { permission: 'catalog.package.view', resource: 'items' },
      },
      {
        path: 'catalog/addons',
        loadComponent: () =>
          import('./features/admin/catalog/catalog-resource.component').then(
            (m) => m.CatalogResourceComponent,
          ),
        canActivate: [permissionGuard],
        data: { permission: 'catalog.package.view', resource: 'addons' },
      },
      {
        path: 'audit',
        loadComponent: () =>
          import('./features/admin/audit/audit-log.component').then((m) => m.AuditLogComponent),
        canActivate: [permissionGuard],
        data: { permission: 'identity.audit.view' },
      },
      {
        path: 'menu',
        loadComponent: () =>
          import('./features/admin/menu/menu-management.component').then(
            (m) => m.MenuManagementComponent,
          ),
        canActivate: [permissionGuard],
        data: { permission: 'nav.menu.manage' },
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./features/admin/users/user-admin.component').then((m) => m.UserAdminComponent),
        canActivate: [permissionGuard],
        data: { permission: 'identity.user.view' },
      },
      {
        path: 'catalog/packages',
        loadComponent: () =>
          import('./features/admin/catalog/package-list.component').then(
            (m) => m.PackageListComponent,
          ),
        canActivate: [permissionGuard],
        data: { permission: 'catalog.package.view' },
      },
      {
        path: 'catalog/packages/:id',
        loadComponent: () =>
          import('./features/admin/catalog/package-detail.component').then(
            (m) => m.PackageDetailComponent,
          ),
        canActivate: [permissionGuard],
        data: { permission: 'catalog.package.view' },
      },
      {
        path: 'catalog/costing',
        loadComponent: () =>
          import('./features/admin/catalog/costing-sheet.component').then(
            (m) => m.CostingSheetComponent,
          ),
        canActivate: [permissionGuard],
        data: { permission: 'catalog.costing.view' },
      },
    ],
  },
  { path: '**', redirectTo: '' },
];

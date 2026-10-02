import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NavigationService } from '../../core/navigation/navigation.service';
import { AuthService } from '../../core/auth/auth.service';
import { AdminIconComponent } from '../../features/admin/admin-icon.component';
import { MenuItemDto } from '../../core/api.config';
const IMPLEMENTED = new Set([
  '/admin/orders',
  '/admin/orders/calendar',
  '/admin/orders/kitchen',
  '/admin/customers',
  '/admin/engagement/reviews',
  '/admin/engagement/requests',
  '/admin/content',
  '/admin/reports',
  '/admin',
  '/admin/menu',
  '/admin/users',
  '/admin/audit',
  '/admin/catalog/packages',
  '/admin/catalog/costing',
  '/admin/catalog/categories',
  '/admin/catalog/items',
  '/admin/catalog/addons',
]);
@Component({
  selector: 'zrc-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AdminIconComponent],
  template: ` <div class="admin-shell admin-workspace">
    @if (sidebarOpen()) {
      <button
        class="admin-backdrop"
        aria-label="Close navigation"
        (click)="sidebarOpen.set(false)"
      ></button>
    }
    <aside class="admin-sidebar" [class.is-open]="sidebarOpen()">
      <a class="admin-brand" routerLink="/admin"
        ><img src="/assets/brand/chef-cap.svg" width="38" height="38" alt="" /><span
          >Zaara Royal<small>BUSINESS WORKSPACE</small></span
        ></a
      >
      <div class="workspace-label"><span class="live-dot"></span> Catering management</div>
      <nav aria-label="Administration" (click)="sidebarOpen.set(false)">
        @for (group of navigation(); track group.id) {
          @if (group.children.length) {
            <div class="admin-nav-group">{{ group.label }}</div>
            @for (item of group.children; track item.id) {
              @if (available(item.route)) {
                <a
                  [routerLink]="item.route"
                  routerLinkActive="selected"
                  [routerLinkActiveOptions]="{
                    exact: item.route?.startsWith('/admin/orders') ?? false,
                  }"
                  ><zrc-admin-icon [name]="icon(item.route)" />{{ item.label }}</a
                >
              } @else {
                <span class="admin-nav-disabled"
                  ><zrc-admin-icon [name]="icon(item.route)" />{{ item.label
                  }}<small>Planned</small></span
                >
              }
            }
          } @else if (available(group.route)) {
            <a
              [routerLink]="group.route"
              routerLinkActive="selected"
              [routerLinkActiveOptions]="{ exact: group.route === '/admin' }"
              ><zrc-admin-icon [name]="icon(group.route)" />{{ group.label }}</a
            >
          } @else {
            <span class="admin-nav-disabled"
              ><zrc-admin-icon [name]="icon(group.route)" />{{ group.label
              }}<small>Planned</small></span
            >
          }
        }
        @if (!nav.loaded()) {
          <p class="admin-nav-group" role="status">Loading your workspace…</p>
        }
      </nav>
      <div class="sidebar-bottom">
        <a routerLink="/"><zrc-admin-icon name="arrow" /> View customer website</a
        ><button type="button" (click)="logout()"><zrc-admin-icon name="logout" /> Sign out</button>
        <div class="sidebar-user">
          <span class="avatar">{{ initials() }}</span>
          <div>
            <b>{{ auth.currentUser()?.name ?? 'Your account' }}</b
            ><small>{{ auth.roles().join(', ') }}</small>
          </div>
        </div>
      </div>
    </aside>
    <div class="admin-content">
      <header class="admin-topbar">
        <div>
          <button
            class="admin-mobile-toggle"
            (click)="sidebarOpen.set(!sidebarOpen())"
            [attr.aria-expanded]="sidebarOpen()"
            aria-label="Toggle navigation"
          >
            <zrc-admin-icon name="menu" /></button
          ><span class="admin-breadcrumb">Workspace <span>/</span> <b>Administration</b></span>
        </div>
        <form class="admin-global-search" (submit)="$event.preventDefault(); search(query.value)">
          <zrc-admin-icon name="search" /><input
            #query
            type="search"
            aria-label="Search packages"
            placeholder="Search packages…"
          /><button type="submit">Search</button>
        </form>
        <span class="topbar-profile"
          ><span class="live-dot"></span>{{ auth.currentUser()?.name ?? 'Staff workspace' }}</span
        >
      </header>
      <main id="admin-main" class="admin-page"><router-outlet /></main>
      <footer class="admin-footnote">
        Zaara Royal Catering <span>Private staff workspace · Prices in BDT</span>
      </footer>
    </div>
  </div>`,
})
export class AdminLayoutComponent {
  readonly nav = inject(NavigationService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly sidebarOpen = signal(false);
  readonly initials = computed(() =>
    (this.auth.currentUser()?.name ?? 'Staff')
      .split(' ')
      .map((x) => x[0])
      .slice(0, 2)
      .join('')
      .toUpperCase(),
  );
  readonly navigation = computed(() => {
    const extras = [
      {
        route: '/admin/catalog/categories',
        label: 'Categories',
        permission: 'catalog.category.view',
      },
      { route: '/admin/catalog/items', label: 'Menu items', permission: 'catalog.package.view' },
      {
        route: '/admin/catalog/addons',
        label: 'Add-on services',
        permission: 'catalog.package.view',
      },
      { route: '/admin/users', label: 'Team & roles', permission: 'identity.user.view' },
    ];
    const tree = this.nav.menu().map((g) => ({ ...g, children: [...g.children] }));
    const existing = new Set(tree.flatMap((g) => [g.route, ...g.children.map((c) => c.route)]));
    for (const e of extras) {
      if (!this.auth.hasPermission(e.permission) || existing.has(e.route)) continue;
      const item: MenuItemDto = {
        id: e.route,
        parentId: null,
        key: e.route,
        label: e.label,
        labelBn: null,
        icon: null,
        route: e.route,
        externalUrl: null,
        requiredPermission: e.permission,
        menuArea: 'Admin',
        sortOrder: 0,
        isVisible: true,
        rowVersion: '',
        children: [],
      };
      const parent = tree.find(
        (g) => g.key === (e.route.includes('/catalog/') ? 'catalog' : 'admin'),
      );
      if (parent) parent.children.push(item);
      else tree.push(item);
    }
    return tree;
  });
  constructor() {
    if (this.auth.isAuthenticated() && !this.nav.loaded()) this.nav.load().subscribe();
    if (this.auth.isAuthenticated() && this.auth.currentUser() === null)
      this.auth.loadMe().subscribe();
  }
  available(route: string | null): boolean {
    return route !== null && IMPLEMENTED.has(route);
  }
  icon(route: string | null): string {
    if (route?.includes('costing')) return 'chart';
    if (route?.includes('audit')) return 'clock';
    if (route?.includes('users') || route?.includes('customers')) return 'users';
    if (route?.includes('menu')) return 'settings';
    if (route?.includes('catalog')) return 'book';
    if (route?.includes('orders')) return 'box';
    return 'grid';
  }
  search(value: string): void {
    void this.router.navigate(['/admin/catalog/packages'], {
      queryParams: { search: value.trim() || null },
    });
  }
  logout(): void {
    this.auth.logout().subscribe(() => {
      this.nav.reset();
      void this.router.navigate(['/login']);
    });
  }
}

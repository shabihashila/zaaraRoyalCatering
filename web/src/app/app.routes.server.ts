import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Private routes authenticate from browser storage; rendering them on the
  // server would incorrectly redirect an already signed-in user to login.
  { path: 'admin', renderMode: RenderMode.Client },
  {
    path: 'admin/**',
    renderMode: RenderMode.Client,
  },
  {
    path: 'login',
    renderMode: RenderMode.Client,
  },
  {
    // Dynamic package pages render on demand (SEO-friendly SSR); static
    // public pages prerender at build time.
    path: 'packages/:slug',
    renderMode: RenderMode.Server,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];

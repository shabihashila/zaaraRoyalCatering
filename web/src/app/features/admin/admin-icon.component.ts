import { Component, input } from '@angular/core';
@Component({
  selector: 'zrc-admin-icon',
  standalone: true,
  template: `<svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path [attr.d]="paths[name()] ?? paths['grid']" />
  </svg>`,
  styles: [
    ':host { display:inline-flex; width:1.2rem; height:1.2rem; flex-shrink:0; } svg { width:100%; height:100%; }',
  ],
})
export class AdminIconComponent {
  readonly name = input('grid');
  readonly paths: Partial<Record<string, string>> = {
    grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
    book: 'M4 4h6c2 0 2 1 2 2v15c0-2-2-2-3-2H4z M20 4h-6c-2 0-2 1-2 2v15c0-2 2-2 3-2h5z',
    chart: 'M4 3v18h17 M8 16v-5 M13 16V6 M18 16V9',
    users:
      'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M2 21v-3c0-4 14-4 14 0v3 M17 4c5 0 5 7 0 7 M19 14c3 0 3 4 3 7',
    settings: 'M4 6h16 M4 12h16 M4 18h16 M8 3v6 M16 9v6 M10 15v6',
    clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v5l3 2',
    arrow: 'M5 12h14 M13 6l6 6-6 6',
    search: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M15 15l6 6',
    menu: 'M4 6h16 M4 12h16 M4 18h16',
    refresh: 'M20 8a8 8 0 1 0 0 8 M20 3v5h-5',
    logout: 'M10 3H4v18h6 M9 12h12 M16 7l5 5-5 5',
    box: 'M3 7l9-4 9 4v10l-9 4-9-4z M3 7l9 5 9-5 M12 12v9',
    plus: 'M12 4v16 M4 12h16',
  };
}

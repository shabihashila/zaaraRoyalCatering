import { Component, signal, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { SITE_SETTINGS } from '../../features/public/site-content';
import { ManagedContentService } from '../../features/public/managed-content.service';

@Component({
  selector: 'zrc-public-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <a class="skip" routerLink="/" fragment="main">Skip to content</a>
    <header class="public-header">
      <a class="brand" routerLink="/"
        ><img src="/assets/brand/chef-cap.svg" width="44" height="44" alt="" /><span
          >Zaara Royal<small>CATERING &middot; BANGLADESH</small></span
        ></a
      >
      <button
        class="nav-toggle secondary"
        type="button"
        [attr.aria-expanded]="menuOpen()"
        aria-controls="public-nav"
        (click)="menuOpen.set(!menuOpen())"
      >
        {{ menuOpen() ? 'Close' : 'Menu' }}
      </button>
      <nav
        id="public-nav"
        aria-label="Public"
        [class.open]="menuOpen()"
        (click)="menuOpen.set(false)"
      >
        <a routerLink="/">Home</a>
        <a routerLink="/menu" routerLinkActive="active">Our menu</a>
        <a routerLink="/about">About</a>
        <a routerLink="/gallery">Gallery</a>
        <a routerLink="/faqs">FAQs</a>
        <a routerLink="/contact">Contact</a>
        <a routerLink="/inquiry" class="btn btn-gold">Plan your event &rarr;</a>
      </nav>
    </header>
    <main id="main"><router-outlet /></main>
    <footer class="public-footer">
      <div class="cols">
        <div>
          <h3>Zaara Royal Catering</h3>
          <p>
            Royal feasts for weddings, corporate programs and house parties — priced per head in BDT
            (৳).
          </p>
          <p>{{ settings.hours }}</p>
        </div>
        <div>
          <h3>Explore</h3>
          <p>
            <a routerLink="/">Home</a><br /><a routerLink="/menu">Menu &amp; packages</a><br /><a
              routerLink="/about"
              >About</a
            ><br /><a routerLink="/gallery">Gallery</a><br /><a routerLink="/faqs">FAQs</a><br /><a
              routerLink="/contact"
              >Contact</a
            ><br /><a routerLink="/inquiry">Custom inquiry</a>
          </p>
        </div>
        <div>
          <h3>Contact</h3>
          <p>
            Phone &amp; WhatsApp: <a [href]="settings.phoneHref">{{ settings.phoneDisplay }}</a
            ><br />Email: <a href="mailto:{{ settings.email }}">{{ settings.email }}</a
            ><br />{{ settings.address }}
          </p>
        </div>
      </div>
      <p class="fine">
        &copy; 2026 Zaara Royal Catering &middot; Made for memorable moments &middot;
        <a routerLink="/login">Staff sign in</a>
      </p>
    </footer>
  `,
})
export class PublicLayoutComponent {
  readonly menuOpen = signal(false);
  private readonly content = inject(ManagedContentService);
  protected get settings() {
    return this.content.settings();
  }
}

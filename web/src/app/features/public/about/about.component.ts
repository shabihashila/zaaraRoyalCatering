import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../../core/seo.service';
import { ManagedContentService } from '../managed-content.service';

@Component({
  selector: 'zrc-about',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="section">
      <span class="badge">About us</span>
      <h1>{{ content.entry('Page', 'about')?.title ?? 'Good food. Generous hospitality.' }}</h1>
      <p class="lead" style="white-space:pre-line">
        {{
          content.entry('Page', 'about')?.body ??
            'Bring people together over the flavours of Bangladesh. Explore 19 carefully organised packages for celebrations, meetings and family gatherings.'
        }}
      </p>
      <div class="grid grid-3">
        <article class="card reveal">
          <h2>Our story</h2>
          <p class="muted">
            Weddings, milads, corporate buffets and house parties across Bangladesh — per-head
            packages priced transparently in BDT.
          </p>
        </article>
        <article class="card reveal">
          <h2>Our kitchen</h2>
          <p class="muted">
            Separate prep lines for kacchi, BBQ and desserts. Halal ingredients, tasting before big
            events, backup portions on every order.
          </p>
        </article>
        <article class="card reveal">
          <h2>Hygiene & team</h2>
          <p class="muted">
            Trained cooks and waiters, food-safe packing, distribution support for mahfils — and a
            live chef option for BBQ nights.
          </p>
        </article>
      </div>
      <div class="cta-band reveal">
        <h2>Taste before you book</h2>
        <p>Send a custom inquiry — we will tailor a menu for your guests and budget.</p>
        <p>
          <a routerLink="/menu" class="btn btn-gold">Browse the menu</a>
          <a routerLink="/contact" class="btn btn-outline">Talk to us</a>
        </p>
      </div>
    </section>
  `,
})
export class AboutComponent implements OnInit {
  private readonly seo = inject(SeoService);
  readonly content = inject(ManagedContentService);
  ngOnInit(): void {
    this.seo.setPage({
      title: 'About us',
      description:
        'The story, kitchen and hygiene standard behind Zaara Royal Catering — royal Bangladeshi feasts per head.',
      path: '/about',
    });
  }
}

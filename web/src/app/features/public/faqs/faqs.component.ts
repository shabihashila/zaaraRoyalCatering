import { Component, OnInit, inject } from '@angular/core';
import { SeoService } from '../../../core/seo.service';
import { FAQS } from '../site-content';
import { ManagedContentService } from '../managed-content.service';

@Component({
  selector: 'zrc-faqs',
  standalone: true,
  template: `
    <section class="section narrow">
      <span class="badge">FAQs</span>
      <h1>Questions, answered</h1>
      @for (f of faqs; track f.q) {
        <details class="card faq reveal">
          <summary>{{ f.q }}</summary>
          <p class="muted">{{ f.a }}</p>
        </details>
      }
    </section>
  `,
})
export class FaqsComponent implements OnInit {
  private readonly seo = inject(SeoService);
  private readonly content = inject(ManagedContentService);
  get faqs() {
    return this.content.faqs();
  }
  ngOnInit(): void {
    this.seo.setPage({
      title: 'FAQs',
      description:
        'Pricing, Mutton +৳80, minimums, waiter service, delivery and payment questions answered.',
      path: '/faqs',
    });
  }
}

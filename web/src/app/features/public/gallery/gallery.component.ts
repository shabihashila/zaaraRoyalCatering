import { Component, ElementRef, OnInit, inject, signal } from '@angular/core';
import { SeoService } from '../../../core/seo.service';
import { foodSrcSet } from '../food-images';
import { GALLERY } from '../site-content';
import { ManagedContentService } from '../managed-content.service';

@Component({
  selector: 'zrc-gallery',
  standalone: true,
  template: `
    <section class="section">
      <span class="badge">Gallery</span>
      <h1>A taste of the celebration</h1>
      <p class="muted">
        Explore food inspiration for your next gathering. These stock photographs illustrate menu
        styles; presentation varies by package.
      </p>
      <p class="small"><a href="/assets/food/credits.html">Photography credits and licenses</a></p>
      <div class="masonry">
        @for (g of gallery; track g.title; let i = $index) {
          <button
            type="button"
            class="shot"
            [style.background]="g.gradient"
            (click)="open(i, $event)"
            [attr.aria-label]="'Open photo: ' + g.title"
          >
            <img
              [src]="g.image"
              [attr.srcset]="imageSrcSet(g.image)"
              sizes="(max-width: 600px) 100vw, 33vw"
              width="640"
              height="480"
              loading="lazy"
              [alt]="g.title + ' food inspiration'"
            />
            <span class="shot-cap"
              ><b>{{ g.title }}</b
              ><small>{{ g.caption }}</small></span
            >
          </button>
        }
      </div>
      @if (active() !== null) {
        <div
          class="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          (click)="close()"
          (keydown)="onViewerKey($event)"
          tabindex="0"
        >
          <div
            class="lightbox-card"
            [style.background]="gallery[active()!].gradient"
            (click)="$event.stopPropagation()"
          >
            <img
              [src]="gallery[active()!].image"
              width="1280"
              height="960"
              [alt]="gallery[active()!].title"
            />
            <h2>{{ gallery[active()!].title }}</h2>
            <p>{{ gallery[active()!].caption }}</p>
            <p>
              <button type="button" class="secondary" (click)="prev()">← Prev</button>
              <button type="button" class="secondary" (click)="next()">Next →</button>
              <button type="button" class="secondary" (click)="close()">Close</button>
            </p>
          </div>
        </div>
      }
    </section>
  `,
})
export class GalleryComponent implements OnInit {
  private readonly seo = inject(SeoService);
  private readonly content = inject(ManagedContentService);
  get gallery() {
    return this.content.gallery();
  }
  readonly imageSrcSet = foodSrcSet;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private opener: HTMLElement | null = null;
  readonly active = signal<number | null>(null);

  ngOnInit(): void {
    this.seo.setPage({
      title: 'Gallery',
      description:
        'Wedding spreads, kacchi handis, BBQ nights and corporate buffets by Zaara Royal Catering.',
      path: '/gallery',
    });
  }

  open(i: number, event: Event): void {
    this.opener = event.currentTarget as HTMLElement;
    this.active.set(i);
    setTimeout(() =>
      this.host.nativeElement.querySelector<HTMLElement>('.lightbox button')?.focus(),
    );
  }
  close(): void {
    this.active.set(null);
    this.opener?.focus();
  }
  onViewerKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.prev();
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.next();
    }
    if (event.key !== 'Tab') return;
    const buttons = Array.from(
      this.host.nativeElement.querySelectorAll<HTMLButtonElement>('.lightbox button'),
    );
    const first = buttons[0],
      last = buttons[buttons.length - 1];
    if (event.shiftKey && event.target === first) {
      event.preventDefault();
      last?.focus();
    }
    if (!event.shiftKey && event.target === last) {
      event.preventDefault();
      first?.focus();
    }
  }
  prev(): void {
    this.active.set((this.active()! + this.gallery.length - 1) % this.gallery.length);
  }
  next(): void {
    this.active.set((this.active()! + 1) % this.gallery.length);
  }
}

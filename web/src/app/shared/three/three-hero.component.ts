import {
  Component,
  ElementRef,
  NgZone,
  PLATFORM_ID,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MotionService } from '../../core/motion.service';

/** Lazy 3D hero: poster first, WebGL handi after first paint, CSS fallback otherwise. */
@Component({
  selector: 'zrc-three-hero',
  standalone: true,
  template: `
    <div class="hero3d" role="img" aria-label="Royal catering handi with warm metal, deep red lid and brass details">
      @if (status() !== 'live') {
        <div class="hero3d-poster" aria-hidden="true">
          <svg class="vessel-static" viewBox="0 0 400 360" aria-hidden="true">
            <defs>
              <linearGradient id="handi-metal"><stop stop-color="#695144"/><stop offset=".35" stop-color="#e5d7bd"/><stop offset=".6" stop-color="#b09b83"/><stop offset="1" stop-color="#594035"/></linearGradient>
              <linearGradient id="handi-red" x2="0" y2="1"><stop stop-color="#bb2b19"/><stop offset="1" stop-color="#600b01"/></linearGradient>
            </defs>
            <ellipse cx="200" cy="322" rx="155" ry="18" fill="#240700" opacity=".3"/>
            <path d="M90 160C30 125 22 225 91 219M310 160C370 125 378 225 309 219" fill="none" stroke="#b88b32" stroke-width="12"/>
            <path d="M89 146C48 230 82 315 200 315S352 230 311 146Z" fill="url(#handi-metal)"/>
            <path d="M84 151Q200 128 316 151" fill="none" stroke="#b88b32" stroke-width="10"/>
            <path d="M85 145Q200 57 315 145Z" fill="url(#handi-red)" stroke="#b88b32" stroke-width="3"/>
            <ellipse cx="200" cy="92" rx="20" ry="12" fill="#b88b32"/>
            <path d="M95 271Q200 307 305 271" fill="none" stroke="#8f1a0a" stroke-width="9"/>
            <circle cx="200" cy="225" r="24" fill="#8f1a0a" stroke="#b88b32" stroke-width="3"/>
          </svg>
        </div>
      }
      <canvas #canvas class="hero3d-canvas" [class.hidden]="status() !== 'live'"></canvas>
    </div>
  `,
})
export class ThreeHeroComponent {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private readonly platformId = inject(PLATFORM_ID);
  private readonly zone = inject(NgZone);
  private readonly motion = inject(MotionService);

  readonly status = signal<'poster' | 'loading' | 'live' | 'fallback'>('poster');
  private handle: { dispose(): void } | null = null;
  private destroyed = false;

  async ngAfterViewInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    const reduced = this.motion.prefersReducedMotion();
    if (reduced || this.motion.isLowEndDevice() || !this.motion.supportsWebGL()) {
      this.status.set('fallback');
      return;
    }
    // Lazy-load the 3D bundle after first paint.
    const idle = (cb: () => void): void => {
      const ric = (window as unknown as { requestIdleCallback?: (fn: () => void) => number }).requestIdleCallback;
      if (typeof ric === 'function') ric(cb);
      else setTimeout(cb, 400);
    };
    idle(() => void this.start());
  }

  private async start(): Promise<void> {
    if (this.destroyed) return;
    this.status.set('loading');
    try {
      const [{ createHandiScene }] = await Promise.all([import('./handi-scene')]);
      if (this.destroyed) return;
      const canvas = this.canvasRef.nativeElement;
      await this.zone.runOutsideAngular(async () => {
        this.handle = createHandiScene(canvas, { reducedMotion: this.motion.prefersReducedMotion() });
      });
      this.status.set('live');
    } catch {
      this.status.set('fallback');
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.handle?.dispose();
  }
}

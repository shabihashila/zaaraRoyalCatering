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
    <div class="hero3d" role="img" aria-label="Rotating royal biryani handi with steam">
      @if (status() !== 'live') {
        <div class="hero3d-poster" aria-hidden="true">
          <span class="hero3d-poster-pot">🍛</span>
          <span class="hero3d-poster-ring"></span>
          @if (status() === 'loading') {
            <span class="hero3d-poster-note">Preparing the royal handi…</span>
          }
        </div>
      }
      <canvas #canvas class="hero3d-canvas" [class.hidden]="status() !== 'live'"></canvas>
      @if (status() === 'fallback') {
        <p class="hero3d-note">Static presentation (reduced motion or no WebGL).</p>
      }
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
    this.status.set('loading');
    try {
      const [{ createHandiScene }] = await Promise.all([import('./handi-scene')]);
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
    this.handle?.dispose();
  }
}

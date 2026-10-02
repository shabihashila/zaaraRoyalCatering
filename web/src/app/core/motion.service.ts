import { Injectable, NgZone, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/** Motion/3D guards + reveal-on-scroll + lazy smooth scroll (Phase 3). */
@Injectable({ providedIn: 'root' })
export class MotionService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly zone = inject(NgZone);

  private get browser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  prefersReducedMotion(): boolean {
    if (!this.browser || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  isLowEndDevice(): boolean {
    if (!this.browser) return false;
    const cores = window.navigator.hardwareConcurrency ?? 8;
    const ua = window.navigator.userAgent.toLowerCase();
    const mobile = /android|iphone|ipad|mobile/.test(ua);
    return cores <= 4 && mobile;
  }

  supportsWebGL(): boolean {
    if (!this.browser) return false;
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl'));
    } catch {
      return false;
    }
  }

  /** Adds `.revealed` to `.reveal` elements when they enter the viewport. Returns cleanup. */
  initReveal(root?: HTMLElement): () => void {
    if (!this.browser || typeof IntersectionObserver === 'undefined') return () => undefined;
    if (this.prefersReducedMotion()) {
      document.querySelectorAll('.reveal').forEach((el) => el.classList.add('revealed'));
      return () => undefined;
    }
    const scope = root ?? document;
    const els = Array.from(scope.querySelectorAll('.reveal'));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('revealed');
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }

  /** Lazy Lenis smooth scroll; no-op on reduced motion / server. Returns destroy fn. */
  async initSmoothScroll(): Promise<() => void> {
    if (!this.browser || this.prefersReducedMotion()) return () => undefined;
    try {
      const mod = await import('lenis');
      const LenisCtor = mod.default;
      let raf = 0;
      const lenis = new LenisCtor({ lerp: 0.1, smoothWheel: true });
      const loop = (time: number): void => {
        lenis.raf(time);
        raf = requestAnimationFrame(loop);
      };
      await this.zone.runOutsideAngular(async () => {
        raf = requestAnimationFrame(loop);
      });
      return () => {
        cancelAnimationFrame(raf);
        lenis.destroy();
      };
    } catch {
      return () => undefined;
    }
  }

  /** Lazy GSAP stagger for `[data-stagger]` children; falls back to instant show. */
  async staggerIn(scope: HTMLElement, selector = '[data-stagger]'): Promise<void> {
    const targets = Array.from(scope.querySelectorAll<HTMLElement>(selector));
    if (targets.length === 0) return;
    if (!this.browser || this.prefersReducedMotion()) {
      targets.forEach((el) => el.classList.add('revealed'));
      return;
    }
    try {
      const { gsap } = await import('gsap');
      await this.zone.runOutsideAngular(async () => {
        gsap.fromTo(
          targets,
          { y: 26, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7, stagger: 0.08, ease: 'power3.out', overwrite: true },
        );
      });
    } catch {
      targets.forEach((el) => el.classList.add('revealed'));
    }
  }
}

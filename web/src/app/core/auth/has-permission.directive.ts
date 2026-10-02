import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';
import { AuthService } from './auth.service';

/** Hides the element unless the current user holds the given permission. The API still enforces. */
@Directive({
  selector: '[hasPermission]',
  standalone: true,
})
export class HasPermissionDirective {
  readonly permission = input.required<string>({ alias: 'hasPermission' });

  private readonly template = inject(TemplateRef<unknown>);
  private readonly container = inject(ViewContainerRef);
  private readonly auth = inject(AuthService);

  constructor() {
    effect(() => {
      const allowed = this.auth.permissions().includes(this.permission());
      this.container.clear();
      if (allowed) {
        this.container.createEmbeddedView(this.template);
      }
    });
  }
}

import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  Component,
  ElementRef,
  input,
  inject,
  OnDestroy,
  output,
  viewChild,
} from '@angular/core';

/** Native modal supplies focus trapping, background inertness and focus restoration. */
@Component({
  selector: 'zrc-admin-modal',
  standalone: true,
  template: `
    <dialog
      #dialog
      class="admin-panel admin-modal"
      [attr.aria-label]="label()"
      (cancel)="cancel($event)"
    >
      <div class="admin-modal-bar">
        <span class="admin-eyebrow">{{ label() }}</span>
        <button
          type="button"
          class="secondary"
          aria-label="Close dialog"
          [disabled]="busy()"
          (click)="dismiss.emit()"
        >
          Close ×
        </button>
      </div>
      @if (error()) {
        <p class="admin-alert error" role="alert">{{ error() }}</p>
      }
      <ng-content />
    </dialog>
  `,
})
export class AdminModalComponent implements OnDestroy {
  private readonly opener = inject(DOCUMENT).activeElement as HTMLElement | null;
  readonly label = input('Record editor');
  readonly busy = input(false);
  readonly error = input<string | null>(null);
  readonly dismiss = output<void>();
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private previousOverflow: string | undefined;

  constructor() {
    afterNextRender(() => {
      const dialog = this.dialog().nativeElement;
      this.previousOverflow = dialog.ownerDocument.body.style.overflow;
      dialog.ownerDocument.body.style.overflow = 'hidden';
      dialog.showModal();
      (
        dialog.querySelector(
          'input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
        ) as HTMLElement | null
      )?.focus();
    });
  }

  cancel(event: Event): void {
    event.preventDefault();
    if (!this.busy()) this.dismiss.emit();
  }

  ngOnDestroy(): void {
    const dialog = this.dialog().nativeElement;
    dialog.close();
    if (this.opener?.isConnected) this.opener.focus({ preventScroll: true });
    if (this.previousOverflow !== undefined)
      dialog.ownerDocument.body.style.overflow = this.previousOverflow;
  }
}

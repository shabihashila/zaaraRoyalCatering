import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { SeoService } from '../../../core/seo.service';
import { SITE_SETTINGS } from '../site-content';
import { ManagedContentService } from '../managed-content.service';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { API_BASE_URL } from '../../../core/api.config';

@Component({
  selector: 'zrc-contact',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <section class="section">
      <span class="badge">Contact</span>
      <h1>Talk to us</h1>
      <div class="grid grid-2">
        <div>
          <p class="muted">
            Tell us what you are planning. Send your request to our team and we will follow up using
            your contact number.
          </p>
          <ul class="item-list">
            <li>
              Phone & WhatsApp: <a [href]="settings.phoneHref">{{ settings.phoneDisplay }}</a>
            </li>
            <li>
              Email: <a href="mailto:{{ settings.email }}">{{ settings.email }}</a>
            </li>
            <li>Address: {{ settings.address }}</li>
            <li>Hours: {{ settings.hours }}</li>
          </ul>
          <p>
            <a [href]="settings.whatsappHref" target="_blank" rel="noopener" class="btn btn-primary"
              >WhatsApp click-to-chat</a
            >
          </p>
          <div class="map">
            <h3>Let's plan around your venue</h3>
            <p>
              Include your event location so our team can discuss delivery and service arrangements.
            </p>
          </div>
        </div>
        <form class="card" [formGroup]="form" (ngSubmit)="submit()" aria-label="Contact form">
          <label>Your name<input type="text" formControlName="name" /></label>
          <label
            >Phone (01XXXXXXXXX)<input type="text" formControlName="phone" inputmode="numeric"
          /></label>
          <label>Package (optional)<input type="text" formControlName="pkg" /></label>
          <label>Message<textarea formControlName="message" rows="4"></textarea></label>
          @if (error()) {
            <p class="error" role="alert">{{ error() }}</p>
          }
          @if (sent()) {
            <p role="status">
              <b>Thank you{{ form.value.name ? ', ' + form.value.name : '' }}!</b> Your message has
              been received. Our team will follow up with you.
            </p>
          } @else {
            <button class="primary" type="submit" [disabled]="form.invalid || busy()">
              {{ busy() ? 'Sending…' : 'Send message' }}
            </button>
          }
        </form>
      </div>
    </section>
  `,
})
export class ContactComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly seo = inject(SeoService);
  private readonly route = inject(ActivatedRoute);

  private readonly http = inject(HttpClient);
  private readonly content = inject(ManagedContentService);
  get settings() {
    return this.content.settings();
  }
  readonly busy = signal(false);
  readonly sent = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.pattern(/^01\d{9}$/)]],
    pkg: [''],
    message: ['', [Validators.required, Validators.minLength(10)]],
  });

  ngOnInit(): void {
    this.seo.setPage({
      title: 'Contact',
      description:
        'Call, WhatsApp or message Zaara Royal Catering — phone, address, hours and contact form.',
      path: '/contact',
    });
    const pkg = this.route.snapshot.queryParamMap.get('package');
    const guests = this.route.snapshot.queryParamMap.get('guests');
    if (pkg) {
      const msg = guests
        ? `Hello! I want to book ${pkg} for ${guests} guests. Please confirm availability.`
        : `Hello! I want to book ${pkg}. Please confirm availability.`;
      this.form.patchValue({ pkg, message: msg });
    }
  }

  submit(): void {
    if (this.busy() || this.sent()) return;
    if (this.form.invalid) {
      this.error.set(
        'Please fill your name, a valid BD phone (01XXXXXXXXX) and a message (10+ chars).',
      );
      return;
    }
    this.error.set(null);
    this.busy.set(true);
    const v = this.form.getRawValue();
    this.http
      .post(`${API_BASE_URL}/api/v1/public/contact`, {
        name: v.name,
        phone: v.phone,
        email: null,
        subject: v.pkg || 'Website contact',
        message: v.message,
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.sent.set(true);
        },
        error: (e: HttpErrorResponse) => {
          this.busy.set(false);
          this.error.set(
            e.status === 429
              ? 'Please wait a moment before trying again.'
              : 'We could not send your message. Please check the details and try again.',
          );
        },
      });
  }
}

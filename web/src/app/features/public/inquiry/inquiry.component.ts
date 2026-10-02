import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { SeoService } from '../../../core/seo.service';
import { formatBDT } from '../../../core/bdt';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { API_BASE_URL } from '../../../core/api.config';

@Component({
  selector: 'zrc-inquiry',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <section class="section narrow">
      <span class="badge">Custom events · weddings · 500+ guests</span>
      <h1>Custom event inquiry</h1>
      <p class="muted">
        Tell us your occasion, guest count and favourite dishes. Send an inquiry for a tailored
        quote; a booking is confirmed separately.
      </p>
      <form class="card" [formGroup]="form" (ngSubmit)="submit()" aria-label="Custom event inquiry">
        <label>Your name<input type="text" formControlName="name" maxlength="160" /></label>
        <label
          >Event type
          <select formControlName="eventType">
            <option value="Wedding">Wedding</option>
            <option value="Milad / Doa Mahfil">Milad / Doa Mahfil</option>
            <option value="Corporate">Corporate</option>
            <option value="House Party">House Party</option>
            <option value="Other">Other large event</option>
          </select>
        </label>
        <label>Guests<input type="number" min="1" formControlName="guests" /></label>
        <label>Event date<input type="date" formControlName="eventDate" /></label>
        <label
          >Venue / area<input
            type="text"
            formControlName="venue"
            placeholder="e.g. Mirpur DOHS Community Centre"
        /></label>
        <label>Preferred package (optional)<input type="text" formControlName="pkg" /></label>
        <label
          >Budget per head (৳, optional)<input type="number" min="0" formControlName="budget"
        /></label>
        <label
          >Contact phone (01XXXXXXXXX)<input
            type="text"
            formControlName="phone"
            inputmode="numeric"
        /></label>
        <label
          >Details<textarea
            formControlName="details"
            rows="4"
            placeholder="Menu wishes, service needs, timing…"
          ></textarea>
        </label>
        @if (error()) {
          <p class="error" role="alert">{{ error() }}</p>
        }
        @if (summary()) {
          <div class="card" role="status">
            <h2>Your inquiry summary</h2>
            <p class="muted">{{ summary() }}</p>
            <p>
              <b>Your inquiry has been received. Our team will contact you to discuss the menu.</b>
            </p>
          </div>
        } @else {
          <button class="primary" type="submit" [disabled]="form.invalid || busy()">
            {{ busy() ? 'Sending…' : 'Send event inquiry' }}
          </button>
        }
      </form>
    </section>
  `,
})
export class InquiryComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly seo = inject(SeoService);
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  readonly busy = signal(false);

  readonly error = signal<string | null>(null);
  readonly summary = signal<string | null>(null);

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(160)]],
    eventType: ['Wedding', Validators.required],
    guests: [500, [Validators.required, Validators.min(1)]],
    eventDate: ['', Validators.required],
    venue: ['', [Validators.required, Validators.minLength(3)]],
    pkg: [''],
    budget: [null as number | null],
    phone: ['', [Validators.required, Validators.pattern(/^01\d{9}$/)]],
    details: [''],
  });

  readonly budgetHint = computed(() => {
    const b = this.form.value.budget;
    return b ? ` · budget ${formatBDT(b)}/head` : '';
  });

  ngOnInit(): void {
    this.seo.setPage({
      title: 'Custom event inquiry',
      description:
        'Weddings and 500+ guest events — send a custom inquiry for a tailored quote within a day.',
      path: '/inquiry',
    });
    const pkg = this.route.snapshot.queryParamMap.get('package');
    if (pkg) this.form.patchValue({ pkg });
  }

  submit(): void {
    if (this.busy() || this.summary()) return;
    if (this.form.invalid) {
      this.error.set('Please complete event type, guests, date, venue and a valid BD phone.');
      return;
    }
    const v = this.form.value;
    this.error.set(null);
    const summary = `${v.eventType} · ${v.guests} guests · ${v.eventDate} · ${v.venue}${v.pkg ? ` · prefers ${v.pkg}` : ''}${v.budget ? ` · budget ${formatBDT(v.budget)}/head` : ''} · contact ${v.phone}.`;
    this.busy.set(true);
    this.http
      .post(`${API_BASE_URL}/api/v1/public/inquiries`, {
        name: v.name,
        phone: v.phone,
        email: null,
        subject: v.eventType,
        message: summary + (v.details ? '\n' + v.details : ''),
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.summary.set(summary);
        },
        error: (e: HttpErrorResponse) => {
          this.busy.set(false);
          this.error.set(
            e.status === 429
              ? 'Please wait a moment before trying again.'
              : 'We could not send your inquiry. Please check the details and try again.',
          );
        },
      });
  }
}

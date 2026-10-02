import { AdminModalComponent } from '../admin-modal.component';
import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { PagedResult } from '../../../core/api.config';
import { ADMIN_API, problem } from './operations.models';
interface ReviewRow {
  id: string;
  authorName: string;
  rating: number;
  body: string;
  eventType: string | null;
  status: string;
  isFeatured: boolean;
  createdAt: string;
  rowVersion: string;
}
interface RequestRow {
  id: string;
  kind: string;
  name: string;
  email: string | null;
  phone: string | null;
  subject: string | null;
  message: string;
  status: string;
  staffNotes: string | null;
  createdAt: string;
  rowVersion: string;
}
interface ContentRow {
  id: string;
  kind: string;
  key: string;
  title: string;
  body: string;
  imageUrl: string | null;
  sortOrder: number;
  isPublished: boolean;
  rowVersion: string;
}
@Component({
  selector: 'zrc-operations-records',
  standalone: true,
  imports: [AdminModalComponent, DatePipe, FormsModule, ReactiveFormsModule],
  templateUrl: './records.component.html',
})
export class RecordsComponent {
  readonly mode = inject(ActivatedRoute).snapshot.data['mode'] as
    'reviews' | 'requests' | 'content';
  readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  readonly title =
    this.mode === 'reviews'
      ? 'Reviews & testimonials'
      : this.mode === 'requests'
        ? 'Customer inbox'
        : 'Website content';
  readonly description =
    this.mode === 'reviews'
      ? 'Review feedback, approve publication and choose featured testimonials.'
      : this.mode === 'requests'
        ? 'Follow up on inquiries, contact messages and newsletter requests.'
        : 'Manage pages, hero copy, gallery entries, FAQs and site settings.';
  readonly kinds = ['Page', 'Hero', 'Gallery', 'FAQ', 'Setting'];
  readonly reviews = signal<ReviewRow[]>([]);
  readonly requests = signal<RequestRow[]>([]);
  readonly entries = signal<ContentRow[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / 20)));
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly editor = signal(false);
  readonly review = signal<ReviewRow | null>(null);
  readonly request = signal<RequestRow | null>(null);
  readonly entry = signal<ContentRow | null>(null);
  kind = '';
  status = '';
  readonly reviewForm = this.fb.nonNullable.group({
    authorName: ['', [Validators.required, Validators.maxLength(160)]],
    rating: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
    body: ['', [Validators.required, Validators.maxLength(2000)]],
    eventType: ['', Validators.maxLength(160)],
  });
  readonly moderateForm = this.fb.nonNullable.group({
    status: ['Pending', Validators.required],
    isFeatured: [false],
  });
  readonly handleForm = this.fb.nonNullable.group({
    status: ['New', Validators.required],
    staffNotes: ['', Validators.maxLength(2000)],
  });
  readonly contentForm = this.fb.nonNullable.group({
    kind: ['FAQ', Validators.required],
    key: [
      '',
      [Validators.required, Validators.pattern(/^[a-z0-9][a-z0-9.-]*$/), Validators.maxLength(100)],
    ],
    title: ['', [Validators.required, Validators.maxLength(200)]],
    body: ['', [Validators.required, Validators.maxLength(4000)]],
    imageUrl: ['', Validators.maxLength(1000)],
    sortOrder: [0, [Validators.min(0), Validators.required]],
    isPublished: [false],
  });
  constructor() {
    this.reload();
  }
  endpoint() {
    return this.mode === 'content'
      ? `${ADMIN_API}/content`
      : `${ADMIN_API}/engagement/${this.mode}`;
  }
  reload() {
    this.loading.set(true);
    this.error.set(null);
    const params: Record<string, string> = { page: String(this.page()), pageSize: '20' };
    if (this.kind) params['kind'] = this.kind;
    if (this.status) params['status'] = this.status;
    this.http
      .get<PagedResult<ReviewRow | RequestRow | ContentRow>>(this.endpoint(), { params })
      .subscribe({
        next: (d) => {
          if (this.mode === 'reviews') this.reviews.set(d.items as ReviewRow[]);
          else if (this.mode === 'requests') this.requests.set(d.items as RequestRow[]);
          else this.entries.set(d.items as ContentRow[]);
          this.total.set(d.totalCount);
          this.loading.set(false);
        },
        error: (e) => this.fail(e),
      });
  }
  filter() {
    this.page.set(1);
    this.reload();
  }
  changePage(delta: number) {
    this.page.update((p) => Math.max(1, Math.min(this.pages(), p + delta)));
    this.reload();
  }
  openNew() {
    this.review.set(null);
    this.entry.set(null);
    this.editor.set(true);
    this.success.set(null);
    this.error.set(null);
    this.reviewForm.reset({ authorName: '', rating: 5, body: '', eventType: '' });
    this.contentForm.reset({
      kind: 'FAQ',
      key: '',
      title: '',
      body: '',
      imageUrl: '',
      sortOrder: 0,
      isPublished: false,
    });
  }
  openReview(r: ReviewRow) {
    this.review.set(r);
    this.moderateForm.setValue({ status: r.status, isFeatured: r.isFeatured });
    this.editor.set(true);
    this.success.set(null);
  }
  openRequest(r: RequestRow) {
    this.request.set(r);
    this.handleForm.setValue({ status: r.status, staffNotes: r.staffNotes ?? '' });
    this.editor.set(true);
    this.success.set(null);
  }
  openContent(e: ContentRow) {
    this.entry.set(e);
    this.contentForm.setValue({
      kind: e.kind,
      key: e.key,
      title: e.title,
      body: e.body,
      imageUrl: e.imageUrl ?? '',
      sortOrder: e.sortOrder,
      isPublished: e.isPublished,
    });
    this.editor.set(true);
    this.success.set(null);
  }
  save() {
    if (this.saving()) return;
    let url = this.endpoint();
    let body: object;
    let update = false;
    if (this.mode === 'reviews') {
      if (!this.auth.hasPermission('engagement.review.moderate')) return;
      const r = this.review();
      if (r) {
        const v = this.moderateForm.getRawValue();
        if (v.isFeatured && v.status !== 'Approved') {
          this.error.set('Only approved reviews can be featured.');
          return;
        }
        body = { ...v, rowVersion: r.rowVersion };
        url += '/' + r.id;
        update = true;
      } else {
        if (this.reviewForm.invalid) return;
        body = this.reviewForm.getRawValue();
      }
    } else if (this.mode === 'requests') {
      if (!this.auth.hasPermission('engagement.inquiry.manage') || this.handleForm.invalid) return;
      const r = this.request();
      if (!r) return;
      body = { ...this.handleForm.getRawValue(), rowVersion: r.rowVersion };
      url += '/' + r.id;
      update = true;
    } else {
      if (!this.auth.hasPermission('content.edit') || this.contentForm.invalid) return;
      const e = this.entry();
      body = { ...this.contentForm.getRawValue(), rowVersion: e?.rowVersion ?? null };
      if (e) {
        url += '/' + e.id;
        update = true;
      }
    }
    this.saving.set(true);
    this.error.set(null);
    const req = update ? this.http.put(url, body) : this.http.post(url, body);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.editor.set(false);
        this.success.set('Changes saved.');
        this.reload();
      },
      error: (e) => this.fail(e),
    });
  }
  private fail(e: HttpErrorResponse) {
    this.error.set(problem(e));
    this.loading.set(false);
    this.saving.set(false);
  }
}

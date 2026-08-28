import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ModalField, ModalRequest, ModalService } from '../core/modal.service';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="app-modal-backdrop" *ngIf="request" (click)="backdropClick()">
      <div class="app-modal-card" [class.confirm-card]="request?.kind !== 'form'" (click)="$event.stopPropagation()">

        <div class="app-modal-head">
          <div>
            <div class="app-modal-kicker" *ngIf="request?.kind === 'confirm'">Confirmation</div>
            <div class="app-modal-kicker" *ngIf="request?.kind === 'form'">Form</div>
            <h3>{{ request?.title }}</h3>
          </div>
          <button class="app-modal-close" type="button" (click)="cancel()">×</button>
        </div>

        <div class="app-modal-body" *ngIf="request?.kind === 'alert'">
          <p>{{ request?.message }}</p>
        </div>

        <div class="app-modal-body" *ngIf="request?.kind === 'confirm'">
          <div class="confirm-icon">!</div>
          <p>{{ request?.message }}</p>
        </div>

        <form class="app-modal-body" *ngIf="request?.kind === 'form'" (ngSubmit)="submitForm()">
          <p class="app-modal-message" *ngIf="request?.message">{{ request?.message }}</p>

          <div class="app-modal-fields">
            <label *ngFor="let field of formFields">
              {{ field.label }}

              <textarea
                *ngIf="field.type === 'textarea'"
                [(ngModel)]="formValues[field.key]"
                [name]="field.key"
                [placeholder]="field.placeholder || ''"
                [required]="field.required ?? true">
              </textarea>

              <select
                *ngIf="field.type === 'select'"
                [(ngModel)]="formValues[field.key]"
                [name]="field.key"
                [required]="field.required ?? true">
                <option value="" disabled>Select {{ field.label.toLowerCase() }}</option>
                <option *ngFor="let option of field.options || []" [value]="option.value">
                  {{ option.label }}
                </option>
              </select>

              <input
                *ngIf="!field.type || field.type === 'text' || field.type === 'number'"
                [type]="field.type === 'number' ? 'number' : 'text'"
                [(ngModel)]="formValues[field.key]"
                [name]="field.key"
                [placeholder]="field.placeholder || ''"
                [required]="field.required ?? true">
            </label>
          </div>

          <div class="app-modal-actions">
            <button class="secondary" type="button" (click)="cancel()">
              {{ request?.cancelText || 'Cancel' }}
            </button>
            <button class="primary" type="submit">
              {{ request?.submitText || 'Save' }}
            </button>
          </div>
        </form>

        <div class="app-modal-actions" *ngIf="request?.kind === 'confirm'">
          <button class="secondary" type="button" (click)="cancel()">
            {{ request?.cancelText || 'Cancel' }}
          </button>
          <button [class.danger-solid]="request?.danger" [class.primary]="!request?.danger" type="button" (click)="confirm()">
            {{ request?.confirmText || 'Confirm' }}
          </button>
        </div>

        <div class="app-modal-actions alert-actions" *ngIf="request?.kind === 'alert'">
          <button class="primary" type="button" (click)="closeAlert()">
            {{ request?.buttonText || 'OK' }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class ModalComponent implements OnInit, OnDestroy {
  private modal = inject(ModalService);
  private sub?: Subscription;

  request: ModalRequest | null = null;
  formValues: Record<string, any> = {};

  get formFields(): ModalField[] {
    return this.request?.kind === 'form' ? this.request.fields : [];
  }

  ngOnInit(): void {
    this.sub = this.modal.requests.subscribe(req => {
      this.request = req;
      this.formValues = {};
      if (req.kind === 'form') {
        for (const field of req.fields) this.formValues[field.key] = field.value ?? '';
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  backdropClick(): void {
    if (this.request?.kind === 'alert') return;
    this.cancel();
  }

  cancel(): void {
    if (!this.request) return;
    const req = this.request;
    this.request = null;
    if (req.kind === 'form') req.resolve(null);
    if (req.kind === 'confirm') req.resolve(false);
    if (req.kind === 'alert') req.resolve();
  }

  submitForm(): void {
    if (this.request?.kind !== 'form') return;
    const req = this.request;
    const values = { ...this.formValues };
    this.request = null;
    req.resolve(values);
  }

  confirm(): void {
    if (this.request?.kind !== 'confirm') return;
    const req = this.request;
    this.request = null;
    req.resolve(true);
  }

  closeAlert(): void {
    if (this.request?.kind !== 'alert') return;
    const req = this.request;
    this.request = null;
    req.resolve();
  }
}

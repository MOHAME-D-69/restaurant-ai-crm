import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-brand"><span class="brand-icon">R</span><div><strong>Restaurant AI CRM</strong><small>Password recovery</small></div></div>
        <h2>Forgot password?</h2>
        <p class="auth-subtitle">Enter your admin email and we'll start the reset process.</p>
        <form (ngSubmit)="submit()">
          <label>Email<input name="email" type="email" [(ngModel)]="email" required placeholder="admin&#64;restaurant.com"></label>
          @if (error) { <div class="form-error">{{ error }}</div> }
          @if (success) { <div class="form-success">{{ success }}</div> }
          <button class="primary full" type="submit">Send reset link</button>
        </form>
        <div class="auth-footer"><a routerLink="/login">← Back to sign in</a></div>
      </div>
    </div>
  `
})
export class ForgotPasswordComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  email = '';
  error = '';
  success = '';

  submit(): void {
    this.error = '';
    this.success = '';
    this.auth.forgotPassword(this.email.trim()).subscribe({
      next: response => {
        this.success = response.resetToken ? 'Reset request created. Opening reset page...' : 'If the account exists, a reset link has been sent.';
        if (response.resetToken) setTimeout(() => this.router.navigate(['/reset-password'], { queryParams: { token: response.resetToken } }), 700);
      },
      error: e => this.error = e.error?.message || 'Request failed.'
    });
  }
}

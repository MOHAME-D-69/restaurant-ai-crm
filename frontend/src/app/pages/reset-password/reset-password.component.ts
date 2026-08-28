import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-brand"><span class="brand-icon">R</span><div><strong>Restaurant AI CRM</strong><small>Set a new password</small></div></div>
        <h2>Reset password</h2>
        <p class="auth-subtitle">Choose a new password for your admin account.</p>
        <form (ngSubmit)="submit()">
          <label>Reset token<input name="token" [(ngModel)]="token" required placeholder="Reset token"></label>
          <label>New password<input name="password" type="password" [(ngModel)]="password" minlength="6" required placeholder="At least 6 characters"></label>
          <label>Confirm password<input name="confirm" type="password" [(ngModel)]="confirm" required placeholder="Repeat password"></label>
          @if (error) { <div class="form-error">{{ error }}</div> }
          @if (success) { <div class="form-success">{{ success }}</div> }
          <button class="primary full" type="submit">Update password</button>
        </form>
        <div class="auth-footer"><a routerLink="/login">Back to sign in</a></div>
      </div>
    </div>
  `
})
export class ResetPasswordComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  token = this.route.snapshot.queryParamMap.get('token') || '';
  password = '';
  confirm = '';
  error = '';
  success = '';

  submit(): void {
    this.error = '';
    this.success = '';
    if (this.password !== this.confirm) { this.error = 'Passwords do not match.'; return; }
    if (this.password.length < 6) { this.error = 'Password must be at least 6 characters.'; return; }
    try {
      const result = this.auth.resetPassword(this.token, this.password);
      if (result) {
        result.subscribe({ next: () => this.done(), error: e => this.error = e.error?.message || 'Reset failed.' });
      } else this.done();
    } catch (e: any) { this.error = e.message || 'Reset failed.'; }
  }

  private done(): void {
    this.success = 'Password updated successfully. Redirecting to sign in...';
    setTimeout(() => this.router.navigateByUrl('/login'), 800);
  }
}

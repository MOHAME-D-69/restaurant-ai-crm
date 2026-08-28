import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-brand"><span class="brand-icon">R</span><div><strong>Restaurant AI CRM</strong><small>Admin Portal</small></div></div>
        <h2>Welcome back</h2>
        <p class="auth-subtitle">Sign in to manage your restaurant.</p>

        <form (ngSubmit)="login()">
          <label>Email<input name="email" type="email" [(ngModel)]="email" required placeholder="admin&#64;restaurant.com"></label>
          <label>Password<input name="password" type="password" [(ngModel)]="password" required placeholder="••••••••"></label>
          <div class="form-row"><label class="checkbox"><input type="checkbox" [(ngModel)]="remember" name="remember"> Remember me</label><a routerLink="/forgot-password">Forgot password?</a></div>
          @if (error) { <div class="form-error">{{ error }}</div> }
          <button class="primary full" type="submit">Sign in</button>
        </form>


        <div class="auth-footer">Don't have an account? <a routerLink="/register">Create restaurant</a></div>
      </div>
    </div>
  `
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  email = '';
  password = '';
  remember = false;
  error = '';

  login(): void {
    this.error = '';
    try {
      const result = this.auth.login(this.email.trim(), this.password);
      if (result) {
        result.subscribe({ next: r => { this.auth.setSession(r); this.router.navigateByUrl('/'); }, error: e => this.error = e.error?.message || 'Login failed.' });
      } else {
        this.router.navigateByUrl('/');
      }
    } catch (e: any) {
      this.error = e.message || 'Invalid email or password.';
    }
  }
}

import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-card auth-card-wide">
        <div class="auth-brand"><span class="brand-icon">R</span><div><strong>Restaurant AI CRM</strong><small>Create your restaurant workspace</small></div></div>
        <h2>Create your account</h2>
        <p class="auth-subtitle">Set up your restaurant CRM in a few steps.</p>

        <form (ngSubmit)="register()">
          <div class="form-grid">
            <label>Restaurant name<input name="restaurantName" [(ngModel)]="form.restaurantName" required placeholder="e.g. Burger House"></label>
            <label>Admin name<input name="name" [(ngModel)]="form.name" required placeholder="Your name"></label>
            <label>Email<input name="email" type="email" [(ngModel)]="form.email" required placeholder="admin&#64;restaurant.com"></label>
            <label>Phone<input name="phone" [(ngModel)]="form.phone" required placeholder="01012345678"></label>
            <label>Password<input name="password" type="password" [(ngModel)]="form.password" minlength="6" required placeholder="At least 6 characters"></label>
            <label>Confirm password<input name="confirmPassword" type="password" [(ngModel)]="confirmPassword" required placeholder="Repeat password"></label>
          </div>
          @if (error) { <div class="form-error">{{ error }}</div> }
          <button class="primary full" type="submit">Create restaurant</button>
        </form>

        <div class="auth-footer">Already have an account? <a routerLink="/login">Sign in</a></div>
      </div>
    </div>
  `
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  form = { restaurantName: '', name: '', email: '', phone: '', password: '' };
  confirmPassword = '';
  error = '';

  register(): void {
    this.error = '';
    if (this.form.password !== this.confirmPassword) {
      this.error = 'Passwords do not match.';
      return;
    }
    if (this.form.password.length < 6) {
      this.error = 'Password must be at least 6 characters.';
      return;
    }
    try {
      const result = this.auth.register(this.form);
      if (result) {
        result.subscribe({ next: r => { this.auth.setSession(r); this.router.navigateByUrl('/'); }, error: e => this.error = e.error?.message || 'Registration failed.' });
      } else {
        this.router.navigateByUrl('/');
      }
    } catch (e: any) {
      this.error = e.message || 'Registration failed.';
    }
  }
}

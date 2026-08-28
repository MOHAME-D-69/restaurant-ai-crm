import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from './api.service';

export interface AuthUser { name: string; email: string; restaurantId: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);

  isLoggedIn(): boolean { return !!localStorage.getItem('token'); }
  getUser(): AuthUser | null { const value = localStorage.getItem('auth_user'); try { return value ? JSON.parse(value) : null; } catch { return null; } }

  login(email: string, password: string) { return this.api.post<any>('/auth/login', { email, password }); }
  register(data: { restaurantName: string; name: string; email: string; phone: string; password: string }) { return this.api.post<any>('/auth/register', data); }
  forgotPassword(email: string) { return this.api.post<any>('/auth/forgot-password', { email }); }
  resetPassword(token: string, password: string) { return this.api.post<any>('/auth/reset-password', { token, password }); }

  setSession(response: any): void {
    localStorage.setItem('token', response.token);
    localStorage.setItem('auth_user', JSON.stringify(response.user));
  }
  logout(): void { localStorage.removeItem('token'); localStorage.removeItem('auth_user'); this.router.navigateByUrl('/login'); }
}

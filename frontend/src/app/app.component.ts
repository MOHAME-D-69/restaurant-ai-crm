import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { ModalComponent } from './shared/modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, ModalComponent],
  template: `
    <app-modal></app-modal>
    @if (isAuthPage()) {
      <router-outlet></router-outlet>
    } @else {
      <div class="shell">
        <aside>
          <div class="brand">
            <span class="brand-icon">R</span>
            <div><strong>Restaurant</strong><small>AI CRM</small></div>
          </div>
          <nav>
            <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}">Dashboard</a>
            <a routerLink="/orders" routerLinkActive="active">Orders</a>
            <a routerLink="/customers" routerLinkActive="active">Customers</a>
            <a routerLink="/menu" routerLinkActive="active">Menu</a>
            <a routerLink="/restaurant" routerLinkActive="active">Restaurant</a>
          </nav>
          <div class="side-note">AI Automation Ready<br><small>CRM API + n8n</small></div>
        </aside>
        <main>
          <header>
            <div><span class="eyebrow">Restaurant operations</span><h1>Management Center</h1></div>
            <div class="admin">
              <div class="user-chip"><span class="avatar">{{ userInitial }}</span><div><strong>{{ userName }}</strong><small>{{ userEmail }}</small></div></div>
              <button (click)="logout()">Logout</button>
            </div>
          </header>
          <section class="content"><router-outlet></router-outlet></section>
        </main>
      </div>
    }
  `
})
export class AppComponent {
  private router = inject(Router);
  private auth = inject(AuthService);

  isAuthPage(): boolean {
    return ['/login', '/register', '/forgot-password', '/reset-password'].includes(this.router.url.split('?')[0]);
  }

  get userName(): string { return this.auth.getUser()?.name || 'Admin'; }
  get userEmail(): string { return this.auth.getUser()?.email || 'admin@restaurant.com'; }
  get userInitial(): string { return this.userName.charAt(0).toUpperCase(); }
  logout(): void { this.auth.logout(); }
}

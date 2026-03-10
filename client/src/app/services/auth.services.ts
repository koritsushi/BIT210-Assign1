import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/auth';
  private platformId = inject(PLATFORM_ID);

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  login(name: string) {
    return this.http.post<{ token: string; user: any }>(
      `${this.apiUrl}/login`,
      { name }
    );
  }

  saveToken(token: string): void {
    if (!this.isBrowser()) return;
    localStorage.setItem('token', token);
  }

  saveName(name: string): void {
    if (!this.isBrowser()) return;
    localStorage.setItem('Name', name);
  }

  saveRole(role: string): void {
    if (!this.isBrowser()) return;
    localStorage.setItem('role', role);
  }

  getToken(): string | null {
    if (!this.isBrowser()) return null;
    return localStorage.getItem('token');
  }

  getName(): string | null {
    if (!this.isBrowser()) return null;
    return localStorage.getItem('Name');
  }

  getRole(): string | null {
    if (!this.isBrowser()) return null;
    return localStorage.getItem('role');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  logOut(): void {
    if (this.isBrowser()) {
      localStorage.removeItem('token');
      localStorage.removeItem('Name');
      localStorage.removeItem('role');
    }
    this.router.navigate(['/login']);
  }
}
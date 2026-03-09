import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/auth';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  login(name: string) {
    return this.http.post<{ token: string; user: any }>(
      `${this.apiUrl}/login`,
      { name }
    );
  }

  saveToken(token: string) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('token', token);
    }
  }

  saveName(name: string) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('name', name);
    }
  }

  saveRole(role: string) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('role', role);
    }
  }

  getName() {
    return typeof localStorage !== 'undefined'
      ? localStorage.getItem('name')
      : null;
  }

  getToken() {
    return typeof localStorage !== 'undefined'
      ? localStorage.getItem('token')
      : null;
  }

  getRole() {
    return typeof localStorage !== 'undefined'
      ? localStorage.getItem('role')
      : null;
  }

  isLoggedIn() {
    return typeof localStorage !== 'undefined' && !!this.getToken();
  }

  logout() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('name');
      localStorage.removeItem('role');
    }
    this.router.navigate(['/login']);
  }
}
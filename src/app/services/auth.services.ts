import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface LoginResponse {
  token: string;
  name: string;
  role: 'Admin' | 'Employee';
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private tokenKey = 'token';
  private nameKey = 'name';
  private roleKey = 'role';

  login(email: string, password: string): Observable<LoginResponse> {
    let response: LoginResponse;

    if (email.toLowerCase().includes('admin')) {
      response = {
        token: 'mock-admin-token',
        name: 'Admin User',
        role: 'Admin'
      };
    } else {
      response = {
        token: 'mock-employee-token',
        name: 'Bin Hangyu',
        role: 'Employee'
      };
    }

    return of(response);
  }

  saveToken(token: string) {
    localStorage.setItem(this.tokenKey, token);
  }

  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  saveName(name: string) {
    localStorage.setItem(this.nameKey, name);
  }

  getName() {
    return localStorage.getItem(this.nameKey);
  }

  saveRole(role: string) {
    localStorage.setItem(this.roleKey, role);
  }

  getRole() {
    return localStorage.getItem(this.roleKey);
  }

  isLoggedIn() {
    return !!this.getToken();
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.nameKey);
    localStorage.removeItem(this.roleKey);
  }
}
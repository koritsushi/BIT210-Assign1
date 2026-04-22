import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { tap } from "rxjs/operators";

@Injectable({ 
    providedIn: 'root'
})
export class AuthService {

    constructor(
        private http: HttpClient, 
        private router: Router
    ) {}

    login(email: string, password: string) {
        return this.http.post<{       
            token: string;
            user?: any;
            requires2FA?: boolean;
            tempToken?: string;
        }>(`auth/login`, { email, password }).pipe(
            // Save token and user info automatically on successful login
            tap(response => {
                if (response.token && response.user) {
                    this.saveToken(response.token);
                    this.saveUserId(response.user.id);
                    this.saveName(response.user.name);
                    this.saveRole(response.user.role);
                }
                // For 2FA flow, save temp token
                if (response.requires2FA && response.tempToken) {
                    localStorage.setItem('temp_token', response.tempToken);
                }
            })
        );
    }

    register(name: string, email: string, password: string) {
        return this.http.post<{ message: string }>(
            `auth/register`, { name, email, password }
        );
    }

    verifyEmail(token: string) {
        return this.http.get<{ message: string }>(
            `auth/verify-email?token=${token}`
        );
    }
 
    verifyTwoFa(email: string, code: string, tempToken: string) {
        return this.http.post<{ token: string; user: any }>(
            `auth/verify-2fa`, { email, code, tempToken }
        ).pipe(
            // Save token after 2FA verification too
            tap(response => {
                if (response.token && response.user) {
                    this.saveToken(response.token);
                    this.saveUserId(response.user.id);
                    this.saveName(response.user.name);
                    this.saveRole(response.user.role);
                    localStorage.removeItem('temp_token');
                    localStorage.removeItem('temp_email');
                }
            })
        );
    }

    saveUserId(id: string) { localStorage.setItem('id', id); }
    saveToken(token: string) { localStorage.setItem('token', token); }
    saveName(name: string) { localStorage.setItem('Name', name); }
    saveRole(role: string) { localStorage.setItem('role', role); }

    getUserId() { return localStorage.getItem('id'); }
    getToken() { return localStorage.getItem('token'); }
    getName() { return localStorage.getItem('Name'); }
    getRole() { return localStorage.getItem('role'); }
    isLoggedIn() { return !!this.getToken(); }

    logOut() {
        localStorage.removeItem('token');
        localStorage.removeItem('id');
        localStorage.removeItem('Name');
        localStorage.removeItem('role');
        localStorage.removeItem('temp_token');
        localStorage.removeItem('temp_email');
        this.router.navigate(['/login']);
    }
}
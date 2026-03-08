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
    )  {}

    login(name: string)
    {
        return this.http.post<{ token: string, user: any}>
            (`${this.apiUrl}/login`, {name});
    }

    saveToken(token: string)
    {
        localStorage.setItem('token', token);
    }

    saveName(name: string)
    {
        localStorage.setItem('Name', name);
    }

    saveRole(role: string)
    {
        localStorage.setItem('role', role);
    }

    getToken() {
        return localStorage.getItem('token');
    }

    getName() {
        return localStorage.getItem('Name');
    }

    getRole() {
        return localStorage.getItem('role');
    }

    isLoggedIn() {
        return !!this.getToken();
    }

    logOut() {
        localStorage.removeItem(`token`);
        this.router.navigate(['/login']);
    }
}
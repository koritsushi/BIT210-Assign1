import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.services';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})

export class Login {
    email: string = "";
    password: string = "";
    error: string = "";
    showPassword: boolean = false;

    constructor(
        private authService: AuthService,
        private router: Router
    ) {}

    togglePassword(): void {
        this.showPassword = !this.showPassword;
    }

    validate(): string {
        if (!this.email.trim())
            return "Email is Required!";
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(this.email))
            return "Please return a valid email address!";
        if (!this.password.trim())
            return "Password is required";
        return '';
    }

    onLogin(): void {
        this.authService.login(this.email, this.password).subscribe({
            next: (res) => {
                if (res.requires2FA) {
                    if (!res.tempToken) {
                        this.error = '2FA required but no token received.';
                        return;
                    }
                    localStorage.setItem('temp_token', res.tempToken);
                    localStorage.setItem('temp_email', this.email);
                    this.router.navigate(['/verify-2fa']);
                    return;
                }
 
                this.authService.saveToken(res.token);
                this.authService.saveUserId(res.user._id);
                this.authService.saveName(res.user.name);
                this.authService.saveRole(res.user.role);
                if (this.authService.getRole() === "Employee")
                    this.router.navigate(['./employee/dashboard']);
                else if (this.authService.getRole() === "Admin")
                    this.router.navigate(['./admin/dashboard']);
            },
           error: () => {
                this.error = 'Invalid Email or password!';
           }
        })
    }

    goToRegister(): void {
        this.router.navigate(['/register']);
    }
}

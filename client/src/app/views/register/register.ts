import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.services';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register',
  imports: [CommonModule, FormsModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
    name = '';
    email = '';
    password = '';
    confirmPassword = '';
    showPassword = false;
    showConfirm = false;
    error = '';
    success = '';
    
    constructor(
        private authService: AuthService,
        private router: Router
    ) {}
    
    togglePassword(): void {
        this.showPassword = !this.showPassword; 
    }

    toggleConfirm(): void  {
        this.showConfirm  = !this.showConfirm;
    }
    
    validate(): string {
        if (!this.name.trim()) 
            return 'Name is required.';
        if (!this.email.trim()) 
            return 'Email is required.';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(this.email)) 
            return 'Please enter a valid email address.';
        if (this.password.length < 8) 
            return 'Password must be at least 8 characters.';
        if (!/[A-Z]/.test(this.password)) 
            return 'Password must contain at least one uppercase letter.';
        if (!/[0-9]/.test(this.password)) 
            return 'Password must contain at least one number.';
        if (this.password !== this.confirmPassword) 
            return 'Passwords do not match.';
        return '';
    }
    
    onRegister(): void {
        this.error = '';
        this.success = '';
        this.error = this.validate();
        if (this.error) return;
    
        this.authService.register(this.name, this.email, this.password).subscribe({
        next: () => {
            this.success = 'Registration successful! Please check your email to verify your account.';
            this.name = '';
            this.email = '';
            this.password = '';
            this.confirmPassword = '';
        },
        error: (err) => {
            this.error = err?.error?.message ?? 'Registration failed. Please try again.';
        }
        });
    }
    
    goToLogin(): void {
        this.router.navigate(['/login']);
    }
}

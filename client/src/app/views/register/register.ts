import { Component, ChangeDetectorRef, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.services';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: number;
    message: string;
    type: ToastType;
    leaving: boolean;
}

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
    success = '';

    // --- Toast state ---
    toasts: Toast[] = [];

    private cdr = inject(ChangeDetectorRef);

    constructor(
        private authService: AuthService,
        private router: Router
    ) {}

    // --- Toast system ---
    showToast(message: string, type: ToastType): void {
        const id = Date.now();
        this.toasts.push({ id, message, type, leaving: false });
        this.cdr.detectChanges();
        setTimeout(() => {
            this.toasts = this.toasts.filter(t => t.id !== id);
            this.cdr.detectChanges();
        }, 3500);
    }

    dismissToast(id: number): void {
        this.toasts = this.toasts.filter(t => t.id !== id);
    }

    togglePassword(): void {
        this.showPassword = !this.showPassword;
    }

    toggleConfirm(): void {
        this.showConfirm = !this.showConfirm;
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
        const validationError = this.validate();
        if (validationError) {
            this.showToast(validationError, 'error');
            return;
        }

        this.authService.register(this.name, this.email, this.password).subscribe({
            next: () => {
                this.showToast('Registration successful! Please check your email to verify your account.', 'success');
                this.name = '';
                this.email = '';
                this.password = '';
                this.confirmPassword = '';
                // Delay navigation so user sees the success toast
                setTimeout(() => this.goToLogin(), 2000);
            },
            error: (err) => {
                this.showToast(err?.error?.message ?? 'Registration failed. Please try again.', 'error');
            }
        });
    }

    goToLogin(): void {
        this.router.navigate(['/login']);
    }
}
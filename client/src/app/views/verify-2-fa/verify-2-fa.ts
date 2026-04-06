import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.services';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-verify-2-fa',
  imports: [CommonModule, FormsModule],
  templateUrl: './verify-2-fa.html',
  styleUrl: './verify-2-fa.css',
})
export class Verify2FA {
    code = '';
    error = '';
    loading = false;
    
    constructor(
        private authService: AuthService,
        private router: Router
    ) {}
    
    validate(): string {
        if (!this.code.trim()) return 'Please enter the verification code.';
        if (!/^\d{6}$/.test(this.code)) return 'Code must be exactly 6 digits.';
        return '';
    }
    
    onVerify(): void {
        this.error = this.validate();
        if (this.error) return;
    
        this.loading = true;
        const tempToken = localStorage.getItem('temp_token') ?? '';
        const email = localStorage.getItem('temp_email') ?? '';
    
        this.authService.verifyTwoFa(email, this.code, tempToken).subscribe({
        next: (res) => {
            this.loading = false;
            localStorage.removeItem('temp_token');
            localStorage.removeItem('temp_email');
    
            this.authService.saveToken(res.token);
            this.authService.saveUserId(res.user._id);
            this.authService.saveName(res.user.name);
            this.authService.saveRole(res.user.role);
    
            if (this.authService.getRole() === 'Employee')
            this.router.navigate(['/employee/dashboard']);
            else if (this.authService.getRole() === 'Admin')
            this.router.navigate(['/admin/dashboard']);
        },
        error: () => {
            this.loading = false;
            this.error = 'Invalid or expired code. Please try again.';
        }
        });
    }
    
    goBack(): void {
        localStorage.removeItem('temp_token');
        localStorage.removeItem('temp_email');
        this.router.navigate(['/login']);
    }
}

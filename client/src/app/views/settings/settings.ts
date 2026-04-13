import { ChangeDetectorRef, inject, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.services';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class Settings implements OnInit {
    private http = inject(HttpClient);
    private authService = inject(AuthService);
    private cdr = inject(ChangeDetectorRef);
    twofa_enabled: boolean = false;
    loading: boolean = false;
    statusMessage: string = '';
    statusType: 'success' | 'error' = 'success';

    name = this.authService.getName() ?? '';
    email = '';
    role = this.authService.getRole() ?? '';

    ngOnInit(): void {
        this.loadUserSettings();
    }

    private showStatus(message: string, type: 'success' | 'error'): void {
        this.statusMessage = message;
        this.statusType = type;
        setTimeout(() => this.statusMessage = '', 3000);
    }

    loadUserSettings(): void {
        const userId = this.authService.getUserId();
        if (!userId) return;

        this.http.get<any>(`/users/${userId}`).subscribe({
        next: (user) => {
            this.twofa_enabled = user.twofa_enabled === true;
            this.email = user.email || '';
            this.cdr.detectChanges();
            console.log("Loaded 2FA status:", this.twofa_enabled);
        },
        error: (err) => {
            console.error("Failed to load user settings", err);
        }
        });
    }

    toggle2FA(): void {
        this.loading = true;
        const userId = this.authService.getUserId();
        const newValue = !this.twofa_enabled;

        this.http.put<{ message: string }>(`/users/${userId}/toggle-2fa`, {
        twofa_enabled: newValue
        }).subscribe({
        next: (res) => {
            this.twofa_enabled = newValue;
            this.loading = false;
            this.showStatus(res.message, 'success');
            this.loadUserSettings();
            this.cdr.detectChanges();
        },
        error: (err) => {
            this.loading = false;
            this.showStatus(err?.error?.message ?? 'Failed to update 2FA setting.', 'error');
        }
        });
    }
}
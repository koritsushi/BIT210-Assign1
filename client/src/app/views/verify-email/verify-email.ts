import { ChangeDetectorRef, inject, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.services';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.css'
})
export class VerifyEmail implements OnInit {
    private cdr = inject(ChangeDetectorRef);
    status: 'loading' | 'success' | 'error' = 'loading';
    message = '';

    constructor(
        private route: ActivatedRoute,
        private http: HttpClient,
        private router: Router,
        public authService: AuthService
    ) {}

    ngOnInit(): void {
        const token = this.route.snapshot.queryParamMap.get('token');
        if (!token) {
            this.status = 'error';
            this.message = 'Invalid verification link.';
            return;
        }

        this.cdr.detectChanges();
        this.authService.verifyEmail(token).subscribe({
            next: (res) => {
                this.status = 'success';
                setTimeout(() => {
                    this.message = res.message;
                    this.cdr.detectChanges();
                    this.router.navigate(['/login']);
                }, 3000);
            },
            error: (err) => {
                this.status = 'error';
                this.message = err?.error?.message ?? 'Verification failed or link has expired.';
            }
        });
    }

    goToLogin(): void {
        this.router.navigate(['/login']);
    }
}
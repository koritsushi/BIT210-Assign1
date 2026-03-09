import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, LoginResponse } from '../../services/auth.services';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  errorMessage = '';

  onLogin() {
    if (!this.email.trim() || !this.password.trim()) {
      this.errorMessage = 'Please enter email and password.';
      return;
    }

    this.authService.login(this.email, this.password).subscribe({
      next: (res: LoginResponse) => {
        this.authService.saveToken(res.token);
        this.authService.saveName(res.name);
        this.authService.saveRole(res.role);

        if (res.role === 'Admin') {
          this.router.navigate(['/admin-notifications']);
        } else {
          this.router.navigate(['/employee-notifications']);
        }
      },
      error: () => {
        this.errorMessage = 'Login failed.';
      }
    });
  }
}
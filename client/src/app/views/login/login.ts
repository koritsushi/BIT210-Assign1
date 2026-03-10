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
    name: string = "";
    error: string = "";

    constructor(
        private authService: AuthService,
        private router: Router
    ) {}

    onLogin(): void {
        this.authService.login(this.name).subscribe({
            next: (res) => {
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
                this.error = 'Invalid Name!';
            }
        })
    }
}

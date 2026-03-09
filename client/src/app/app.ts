import { Component, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Header } from './shared/components/header/header';
import { Footer } from './shared/components/footer/footer';
import { AuthService } from './services/auth.services';
import { NavBar } from './shared/components/nav-bar/nav-bar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, NavBar, Footer],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Service Day');

  constructor(
    public auth: AuthService,
    private router: Router
    ) {}

  isAdminArea(): boolean {
    return this.router.url.startsWith('/admin');
  }
}

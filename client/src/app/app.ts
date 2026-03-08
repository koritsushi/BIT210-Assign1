import { Component, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Header } from './shared/components/header/header';
import { Footer } from './shared/components/footer/footer';
import { NavBar } from './shared/components/nav-bar/nav-bar';
import { AuthService } from './services/auth.services';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer, NavBar],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Service Day');

  constructor(
    public auth: AuthService,
    private router: Router
    ) {}
}

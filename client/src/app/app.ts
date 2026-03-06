import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './views/nav/header/header';
import { Footer } from './views/nav/footer/footer';
import { NavBar } from './views/nav/nav-bar/nav-bar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer, NavBar],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('client');
}

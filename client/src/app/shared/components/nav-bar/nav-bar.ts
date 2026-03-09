import { Component } from '@angular/core';
import { AuthService } from '../../../services/auth.services';

@Component({
  selector: 'app-nav-bar',
  imports: [],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.css',
})

export class NavBar {
    constructor (
        public auth: AuthService
    ) {};
}

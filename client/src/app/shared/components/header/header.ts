import { Component } from '@angular/core';
import { AuthService } from '../../../services/auth.services';

@Component({
  selector: 'app-header',
  imports: [],
  templateUrl: './header.html',
  styleUrl: './header.css',
})

export class Header {
    constructor(
        public auth: AuthService
    ) {}
}

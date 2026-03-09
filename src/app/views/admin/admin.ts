import { Component } from '@angular/core';
import { NavBar } from '../../shared/components/nav-bar/nav-bar';

@Component({
  selector: 'app-admin',
  imports: [NavBar],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
})
export class Admin {}

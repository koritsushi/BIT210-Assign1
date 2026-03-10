import { Component } from '@angular/core';
import { NavBar } from '../../shared/components/nav-bar/nav-bar';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-employee',
  imports: [NavBar, RouterOutlet],
  templateUrl: './employee.html',
  styleUrl: './employee.css',
})
export class Employee {}

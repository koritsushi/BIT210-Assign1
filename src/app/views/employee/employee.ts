import { Component } from '@angular/core';
import { NavBar } from '../../shared/components/nav-bar/nav-bar';

@Component({
  selector: 'app-employee',
  imports: [NavBar],
  templateUrl: './employee.html',
  styleUrl: './employee.css',
})
export class Employee {}

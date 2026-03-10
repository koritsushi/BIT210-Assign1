import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NavBar } from '../../shared/components/nav-bar/nav-bar';

@Component({
  selector: 'app-employee',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavBar],
  templateUrl: './employee.html',
  styleUrl: './employee.css',
})
export class Employee {}
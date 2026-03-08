import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
export const routes: Routes = [
    {path: '', redirectTo: 'login', pathMatch: 'full'},
    {
        path: 'login',
        loadComponent: () => import('./views/login/login').then((m) => m.Login),
    },
    {
        path: 'dashboard',
        canActivate: [AuthGuard],
        data: { role: 'Employee'},
        loadComponent: () => import('./views/dashboard/dashboard').then((m) => m.Dashboard),
    },
    { path: '**', redirectTo: 'login' }
];

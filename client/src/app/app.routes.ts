import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { Employee } from './views/employee/employee';
import { Admin } from './views/admin/admin';

export const routes: Routes = [
    {path: '', redirectTo: 'login', pathMatch: 'full'},
    {
        path: 'login',
        loadComponent: () => import('./views/login/login').then((m) => m.Login),
    },
    {
        path: 'admin',
        canActivate: [AuthGuard],
        data: { role: 'Admin'},
        component: Admin,
        children: [
            { path: 'dashboard', loadComponent: () => import('./views/admin/dashboard/dashboard').then((admin) => admin.Dashboard)},
            { path: 'manage-ngo', loadComponent: () => import('./views/admin/manage-ngo/manage-ngo').then((admin) => admin.ManageNgo)},
            { path: '', redirectTo: 'dashboard', pathMatch: 'full'}
        ]
    },
    {
        path: 'employee',
        canActivate: [AuthGuard],
        data: { role: 'Employee'},
        component: Employee,
         children: [
            { path: 'dashboard', loadComponent: () => import('./views/employee/dashboard/dashboard').then((employee) => employee.Dashboard)},
            { path: 'notification', loadComponent: () => import('./views/employee/notification/notification').then((employee) => employee.Notification)},
            { path: '', redirectTo: 'dashboard', pathMatch: 'full'}
        ]
    },
    { path: '**', redirectTo: 'login' }
];

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
        path: 'register',
        loadComponent: () => import('./views/register/register').then((r) => r.Register)
    },
    {
        path: 'verify-2fa',
        loadComponent: () => import('./views/verify-2-fa/verify-2-fa').then((v) => v.Verify2FA)
    },
    {
        path: 'verify-email',
        loadComponent: () => import('./views/verify-email/verify-email').then((v) => v.VerifyEmail)
    },
    {
        path: 'admin',
        canActivate: [AuthGuard],
        data: { role: 'Admin'},
        component: Admin,
        children: [
            { path: 'dashboard', loadComponent: () => import('./views/admin/dashboard/dashboard').then((admin) => admin.Dashboard) },
            { path: 'activity-check-in', loadComponent: () => import('./views/admin/activity-check-in/activity-check-in').then((admin) => admin.ActivityCheckIn) },
            { path: 'send-notifications', loadComponent: () => import('./views/admin/send-notifications/send-notifications').then((admin) => admin.SendNotifications) },
            { path: 'settings', loadComponent: () => import('./views/settings/settings').then(m => m.Settings) },
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
        ],
    },
    {
        path: 'employee',
        canActivate: [AuthGuard],
        data: { role: 'Employee'},
        component: Employee,
         children: [
            { path: 'dashboard', loadComponent: () => import('./views/employee/dashboard/dashboard').then((employee) => employee.Dashboard)},
            { path: 'notification', loadComponent: () => import('./views/employee/notification/notification').then((employee) => employee.NotificationComponent)},
            { path: 'settings', loadComponent: () => import('./views/settings/settings').then(m => m.Settings) },
            { path: '', redirectTo: 'dashboard', pathMatch: 'full'}
        ]
    },
    { path: '**', redirectTo: 'login' }
];

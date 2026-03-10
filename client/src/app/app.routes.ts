import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { Employee } from './views/employee/employee';

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
        children: [
            { path: 'dashboard', loadComponent: () => import('./views/admin/dashboard/dashboard').then((admin) => admin.Dashboard) },
            { path: 'dashboard/:activityId/participants', loadComponent: () => import('./views/admin/view-participants/view-participants').then((admin) => admin.ViewParticipants) },
            { path: 'activity-check-in', loadComponent: () => import('./views/admin/activity-check-in/activity-check-in').then((admin) => admin.ActivityCheckIn) },
            { path: 'send-notifications', loadComponent: () => import('./views/admin/send-notifications/send-notifications').then((admin) => admin.SendNotifications) },
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
            { path: 'notification', loadComponent: () => import('./views/employee/notification/notification').then((employee) => employee.Notification)},
            { path: '', redirectTo: 'dashboard', pathMatch: 'full'}
        ]
    },
    { path: '**', redirectTo: 'login' }
];

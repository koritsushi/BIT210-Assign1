import { Routes } from '@angular/router';
import { AdminNotifications } from './views/admin-notifications/admin-notifications';
import { EmployeeNotifications } from './views/employee-notifications/employee-notifications';
import { QrGenerator } from './views/qr-generator/qr-generator';
import { CheckIn } from './views/employee/check-in/check-in';
import { MonitorParticipation } from './views/admin/monitor-participation/monitor-participation';

export const routes: Routes = [
  { path: '', redirectTo: 'admin-notifications', pathMatch: 'full' },

  { path: 'admin-notifications', component: AdminNotifications },
  { path: 'employee-notifications', component: EmployeeNotifications },

  { path: 'admin-qr-generator', component: QrGenerator },
  { path: 'employee-check-in', component: CheckIn },
  { path: 'admin-monitor-participation', component: MonitorParticipation },
];
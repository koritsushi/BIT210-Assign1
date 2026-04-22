import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface QrEmailResult {
    success: boolean;
    sent: number;
    skipped: number;
    total: number;
    message: string;
    errors?: string[];
}

@Injectable({
    providedIn: 'root',
})
export class QrEmailService {
    private http = inject(HttpClient);

    // Now just calls the backend - no more Google Apps Script
    async sendEmployeeQr(options: { activityId: string }): Promise<QrEmailResult> {
        return firstValueFrom(
            this.http.post<QrEmailResult>('/qr-email/send', {
                activityId: options.activityId,
            })
        );
    }
}
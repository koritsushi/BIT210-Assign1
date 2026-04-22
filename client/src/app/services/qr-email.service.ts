import { Injectable } from '@angular/core';
import QRCode from 'qrcode';
import { User } from '../models/user.model';

export interface QrEmailPayload {
  u: string;
  a: string;
}

interface SendQrEmailOptions {
  employee: User;
  activityId: string;
  activityLabel: string;
  activityDate: string;
}

@Injectable({
  providedIn: 'root',
})
export class QrEmailService {
  private readonly appsScriptUrl =
    'https://script.google.com/macros/s/AKfycbwrheRjtCdm7QVMjVmJiiv_MCOikXI3DD9q3CxqqAfaYC4XrZyDO3UkYg9nlNV8vM7P/exec';

  async sendEmployeeQr(options: SendQrEmailOptions): Promise<void> {
    const employeeId = String(options.employee._id ?? '').trim();
    const email = String(options.employee.email ?? '').trim();

    if (!employeeId || !email) {
      throw new Error('Employee ID or email is missing.');
    }

    const qrPayload: QrEmailPayload = {
      u: employeeId,
      a: options.activityId,
    };

    const qrText = JSON.stringify(qrPayload);
    const qrBase64 = await QRCode.toDataURL(qrText, {
      type: 'image/png',
      width: 420,
      errorCorrectionLevel: 'L',
      margin: 2,
    });

    // Use a simple no-cors request so Apps Script can receive the email job
    // without requiring backend proxy changes or preflight handling.
    await fetch(this.appsScriptUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        to: email,
        subject: `Your check-in QR code for ${options.activityLabel}`,
        bodyText: `Please present this QR code at check-in for ${options.activityLabel}.`,
        bodyHtml: `
          <p>Hi ${options.employee.name},</p>
          <p>Your QR code for <strong>${options.activityLabel}</strong> is attached below.</p>
          <p>Date: ${options.activityDate}</p>
          <p>Please present this QR code to the admin at check-in.</p>
        `,
        qrText,
        qrBase64,
        senderName: 'Service Day Dashboard',
      }),
    });
  }
}

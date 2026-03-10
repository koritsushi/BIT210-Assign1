import { Injectable } from '@angular/core';

export interface GeneratedQrState {
  activityId: string;
  activityName: string;
}

@Injectable({ providedIn: 'root' })
export class QrCodeStateService {
  private generatedQr: GeneratedQrState | null = null;

  getGeneratedQr(): GeneratedQrState | null {
    return this.generatedQr;
  }

  setGeneratedQr(activityId: string, activityName: string): void {
    this.generatedQr = { activityId, activityName };
  }
}

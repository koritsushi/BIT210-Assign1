import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
} from '@angular/core';
import { AuthService } from '../../../services/auth.services';
import { CheckinService } from '../../../services/checkin.service';
import QrScanner from 'qr-scanner';

@Component({
  selector: 'app-scanner',
  imports: [CommonModule],
  templateUrl: './scanner.html',
  styleUrl: './scanner.css',
})
export class Scanner implements AfterViewInit, OnDestroy {
  @ViewChild('video', { static: false }) video!: ElementRef<HTMLVideoElement>;

  errorMessage = '';
  scannedResult = '';
  qrScanner!: QrScanner;
  isSubmitting = false;

  constructor(
    private authService: AuthService,
    private checkinService: CheckinService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.qrScanner = new QrScanner(
      this.video.nativeElement,
      (result: string) => {
        if (this.isSubmitting || result === this.scannedResult) {
          return;
        }

        this.scannedResult = result;

        let activityId = '';
        try {
          activityId = String(JSON.parse(result)?.activityId ?? '').trim();
        } catch {
          activityId = '';
        }

        if (!activityId) {
          alert('Invalid activity QR code. Please scan the QR from admin check-in.');
          this.resetScan();
          return;
        }

        const userId = this.authService.getUserId();
        if (!userId) {
          alert('Session expired. Please log in again.');
          this.resetScan();
          return;
        }

        this.isSubmitting = true;

        this.checkinService.createCheckin(userId, activityId).subscribe({
          next: (message) => {
            alert(message);
          },
          error: (error) => {
            const message =
              typeof error?.error === 'string' && error.error.trim()
                ? error.error.trim()
                : 'Unable to record check-in.';

            alert(message);
            this.resetScan();
          },
          complete: () => {
            this.resetScan();
          },
        });

        this.cdr.detectChanges();
      },
      () => undefined,
      calculateCenteredSquareScanRegion,
      'environment',
    );

    this.qrScanner
      .start()
      .catch(() => {
        this.errorMessage = 'Unable to start the camera. Please allow camera access and try again.';
        this.cdr.detectChanges();
      });
  }

  ngOnDestroy(): void {
    this.qrScanner?.destroy();
  }

  private resetScan(): void {
    this.isSubmitting = false;
    setTimeout(() => {
      this.scannedResult = '';
    }, 1200);
  }
}

function calculateCenteredSquareScanRegion(video: HTMLVideoElement) {
  const baseSize = Math.floor(Math.min(video.videoWidth, video.videoHeight) * 0.4);
  const size = Math.max(170, Math.min(baseSize, 220));
  const x = Math.floor((video.videoWidth - size) / 2);
  const y = Math.floor((video.videoHeight - size) / 2);

  return {
    x,
    y,
    width: size,
    height: size,
    downScaledWidth: 320,
    downScaledHeight: 320,
  };
}

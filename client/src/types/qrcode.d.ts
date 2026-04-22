declare module 'qrcode' {
  interface QrCodeOptions {
    type?: string;
    width?: number;
    errorCorrectionLevel?: string;
    margin?: number;
  }

  const QRCode: {
    toDataURL(text: string, options?: QrCodeOptions): Promise<string>;
  };

  export default QRCode;
}

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { X, Camera } from "lucide-react";

interface QRScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasScannedRef = useRef(false);

  useEffect(() => {
    const startScanner = async () => {
      try {
        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            if (hasScannedRef.current) {
              console.log("[QRScanner] Already scanned, ignoring duplicate scan");
              return;
            }
            
            console.log("[QRScanner] Decoded text:", decodedText);
            const code = extractCodeFromUrl(decodedText);
            console.log("[QRScanner] Extracted code:", code, "Length:", code?.length);
            if (code && code.length === 6) {
              console.log("[QRScanner] Valid 6-char code found, calling onScan");
              hasScannedRef.current = true;
              onScan(code.toUpperCase());
              stopScanner();
            } else {
              console.log("[QRScanner] Invalid code - not 6 characters");
            }
          },
          (errorMessage) => {
          }
        );

        setIsScanning(true);
      } catch (err: any) {
        console.error("QR Scanner error:", err);
        setError(err.message || "Failed to access camera");
      }
    };

    startScanner();

    return () => {
      stopScanner();
    };
  }, [onScan]);

  const stopScanner = () => {
    if (scannerRef.current?.isScanning) {
      scannerRef.current.stop().then(() => {
        scannerRef.current?.clear();
      }).catch(console.error);
    }
  };

  const extractCodeFromUrl = (text: string): string => {
    // Remove all whitespace and normalize
    const cleaned = text.trim().replace(/\s+/g, '');
    
    // Try to extract from URL pattern like /join/ABC123 or https://domain.com/join/ABC123
    const joinMatch = cleaned.match(/\/join\/([A-Z0-9]{6})/i);
    if (joinMatch) {
      return joinMatch[1].toUpperCase();
    }
    
    // Try to match a standalone 6-character alphanumeric code
    const codeMatch = cleaned.match(/^([A-Z0-9]{6})$/i);
    if (codeMatch) {
      return codeMatch[1].toUpperCase();
    }
    
    // If text contains a 6-character code anywhere, extract it
    const anyCodeMatch = cleaned.match(/([A-Z0-9]{6})/i);
    if (anyCodeMatch) {
      return anyCodeMatch[1].toUpperCase();
    }
    
    return cleaned;
  };

  return (
    <div className="fixed inset-0 z-[70] bg-background/95 backdrop-blur-sm">
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="relative w-full max-w-md bg-card rounded-lg shadow-lg p-6">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2"
            onClick={onClose}
            data-testid="button-close-scanner"
          >
            <X className="h-4 w-4" />
          </Button>

          <div className="space-y-4">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <Camera className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Scan Invite Code</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Point your camera at the QR code your co-parent shared
              </p>
            </div>

            {error ? (
              <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-center">
                <p className="text-sm text-destructive font-medium">
                  Camera access denied
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Please enable camera permissions in your browser settings
                </p>
              </div>
            ) : (
              <div className="relative">
                <div
                  id="qr-reader"
                  className="rounded-lg overflow-hidden border-4 border-primary"
                />
                {isScanning && (
                  <div className="text-center mt-4">
                    <p className="text-sm text-muted-foreground">
                      Scanning...
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

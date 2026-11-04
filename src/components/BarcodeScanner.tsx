"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { secondaryButton } from "./ui";

const noSubscribe = () => () => {};

// The browser's built-in barcode reader (Chrome on Android, some desktop browsers). Not in TypeScript's DOM types yet.
type Detector = { detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]> };
type DetectorClass = new (options?: { formats?: string[] }) => Detector;

function detectorClass() {
  return typeof window === "undefined" ? undefined : (window as unknown as { BarcodeDetector?: DetectorClass }).BarcodeDetector;
}

// Shows a "Scan" button when the device can read barcodes with its camera. USB/Bluetooth scanners
// don't need this: they type the code into the focused search box and press Enter.
export function BarcodeScanner({ onCode }: { onCode: (code: string) => void }) {
  // false on the server, so the server render and the first browser render match.
  const supported = useSyncExternalStore(
    noSubscribe,
    () => Boolean(detectorClass() && navigator.mediaDevices?.getUserMedia),
    () => false,
  );
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const onCodeRef = useRef(onCode);

  useEffect(() => {
    onCodeRef.current = onCode;
  }, [onCode]);

  useEffect(() => {
    const Detector = detectorClass();
    if (!open || !Detector) return;
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const detector = new Detector();

    async function scan() {
      if (stopped || !videoRef.current) return;
      try {
        const [code] = await detector.detect(videoRef.current);
        if (code?.rawValue) {
          onCodeRef.current(code.rawValue);
          setOpen(false);
          return;
        }
      } catch {
        // The video isn't ready yet; try again on the next tick.
      }
      timer = setTimeout(scan, 250);
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then(async (s) => {
        stream = s;
        if (stopped || !videoRef.current) return;
        videoRef.current.srcObject = s;
        await videoRef.current.play();
        scan();
      })
      .catch(() => {
        setError("Couldn't open the camera. Allow camera access and try again.");
        setOpen(false);
      });

    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [open]);

  if (!supported) return null;

  return (
    <>
      <button type="button" onClick={() => (setError(null), setOpen(true))} className={secondaryButton}>
        Scan
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/80 p-4">
          <video ref={videoRef} muted playsInline className="w-full max-w-md rounded-xl" />
          <p className="text-sm text-white">Point the camera at the barcode.</p>
          <button type="button" onClick={() => setOpen(false)} className={secondaryButton}>
            Cancel
          </button>
        </div>
      )}
    </>
  );
}

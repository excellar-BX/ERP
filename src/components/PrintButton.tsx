"use client";

import { secondaryButton } from "./ui";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={secondaryButton}>
      Print
    </button>
  );
}

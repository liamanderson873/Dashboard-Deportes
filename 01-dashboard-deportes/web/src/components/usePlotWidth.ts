"use client";
import { useEffect, useRef, useState } from "react";
/** Keep SVG label sizes readable on phones instead of scaling an 800px canvas. */
export function usePlotWidth(enabled = true) {
  const ref = useRef<HTMLDivElement>(null),
    [width, setWidth] = useState(640);
  useEffect(() => {
    const node = ref.current;
    if (!node || !enabled) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setWidth(Math.max(280, Math.round(rect.width)));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled]);
  return { ref, width };
}

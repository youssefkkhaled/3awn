"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

interface TurnstileWidgetProps {
  siteKey: string | null;
  resetKey: number;
  onTokenChange: (token: string) => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          theme?: "light" | "dark";
          language?: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

export function TurnstileWidget({
  siteKey,
  resetKey,
  onTokenChange,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (!siteKey) {
      onTokenChange("dev-bypass");
      return;
    }

    onTokenChange("");
  }, [onTokenChange, resetKey, siteKey]);

  useEffect(() => {
    if (!siteKey || !scriptReady || !containerRef.current || !window.turnstile) {
      return;
    }

    containerRef.current.innerHTML = "";
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme: "dark",
      language: "ar",
      callback(token) {
        onTokenChange(token);
      },
      "expired-callback"() {
        onTokenChange("");
      },
      "error-callback"() {
        onTokenChange("");
      },
    });

    return () => {
      if (widgetIdRef.current && window.turnstile?.remove) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
  }, [onTokenChange, resetKey, scriptReady, siteKey]);

  if (!siteKey) {
    return null;
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />
      <div ref={containerRef} className="mx-auto min-h-16" />
    </>
  );
}

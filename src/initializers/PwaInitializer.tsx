"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

// Define BeforeInstallPromptEvent type if not present in TypeScript
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PwaContextProps {
  deferredPrompt: BeforeInstallPromptEvent | null;
  setDeferredPrompt: React.Dispatch<
    React.SetStateAction<BeforeInstallPromptEvent | null>
  >;
}

const PwaContext = createContext<PwaContextProps | undefined>(undefined);

export const usePwaContext = () => {
  const context = useContext(PwaContext);
  if (!context) {
    throw new Error("usePwaContext must be used within a PwaProvider");
  }
  return context;
};

export const PwaProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      console.log("beforeinstallprompt event fired");
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    console.log("Listening for beforeinstallprompt event");
    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt as EventListener,
    );
    return () => {
      console.log("Removing beforeinstallprompt event listener");
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt as EventListener,
      );
    };
  }, []);

  return (
    <PwaContext.Provider value={{ deferredPrompt, setDeferredPrompt }}>
      {children}
    </PwaContext.Provider>
  );
};

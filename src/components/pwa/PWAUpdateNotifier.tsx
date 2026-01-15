import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { registerSW } from "virtual:pwa-register";

/**
 * Shows a "Reload to update" toast when a new PWA version is available.
 * This helps users who have the app installed (or SW cached) to get the latest UI/code.
 */
export function PWAUpdateNotifier() {
  const shownRef = useRef(false);

  useEffect(() => {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        if (shownRef.current) return;
        shownRef.current = true;

        toast.info("Update available", {
          description: "Reload to get the latest changes.",
          duration: Infinity,
          action: {
            label: "Reload",
            onClick: () => updateSW(true),
          },
        });
      },
    });
  }, []);

  return null;
}

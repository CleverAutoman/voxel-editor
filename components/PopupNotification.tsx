"use client";

import { useEffect } from "react";

type PopupNotificationProps = {
  message: string | null;
  onClose: () => void;
  durationMs?: number;
};

export default function PopupNotification(props: PopupNotificationProps) {
  const { message, onClose, durationMs = 2600 } = props;

  useEffect(() => {
    if (!message) {
      return;
    }
    const timer = window.setTimeout(() => {
      onClose();
    }, durationMs);

    return () => window.clearTimeout(timer);
  }, [message, onClose, durationMs]);

  if (!message) {
    return null;
  }

  return (
    <div className="popup-notification" role="status" aria-live="polite">
      <span>{message}</span>
      <button onClick={onClose} aria-label="Close notification">
        x
      </button>
    </div>
  );
}

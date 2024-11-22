import { useEffect, useState } from "react";

declare global {
  interface Window {
    Telegram: any;
  }
}

export const useTelegram = () => {
  const [tg, setTg] = useState<any>(null);

  useEffect(() => {
    if (window.Telegram) {
      setTg(window.Telegram.WebApp);
    }
  }, []);

  return tg;
};

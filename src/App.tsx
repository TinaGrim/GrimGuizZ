import { useEffect } from "react";
import { RouterProvider } from "react-router";
import { AppProvider } from "./store/AppContext";
import { ConfirmHost } from "./components/ConfirmDialog";
import { warmup } from "./api/client";
import { router } from "./routes";

// Render's free tier pauses the instance after ~15 idle minutes. While the
// app is actually being used we keep a light keep-alive pinging every 5
// minutes (well under the idle threshold) so a mid-session quiz never hits a
// cold start; when the tab is hidden again we back off and let it sleep.
function KeepAlive() {
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        warmup();
        if (!interval) {
          interval = setInterval(() => {
            if (document.visibilityState === "visible") warmup();
          }, 5 * 60 * 1000);
        }
      } else if (interval) {
        clearInterval(interval);
        interval = undefined;
      }
    };
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (interval) clearInterval(interval);
    };
  }, []);
  return null;
}

export default function App() {
  return (
    <AppProvider>
      <KeepAlive />
      <ConfirmHost />
      <RouterProvider router={router} />
    </AppProvider>
  );
}

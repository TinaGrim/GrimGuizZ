import { RouterProvider } from "react-router";
import { AppProvider } from "./store/AppContext";
import { ConfirmHost } from "./components/ConfirmDialog";
import { router } from "./routes";

export default function App() {
  return (
    <AppProvider>
      <ConfirmHost />
      <RouterProvider router={router} />
    </AppProvider>
  );
}

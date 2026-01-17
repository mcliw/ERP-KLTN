import AppRoutes from "./routes";
import { useEffect } from "react";
import { seedDatabase } from "./utils/seedData";
import { ToastProvider } from "./shared/components/ToastProvider";

function App() {
  useEffect(() => {
    seedDatabase();
  }, []);

  return (
    <ToastProvider>
      <AppRoutes />
    </ToastProvider>
  );
}

export default App;

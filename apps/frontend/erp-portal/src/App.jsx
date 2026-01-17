import AppRoutes from "./routes";
import { useEffect } from "react";
import { seedDatabase } from "./utils/seedData";
import { ToastProvider } from "./shared/components/ToastProvider";
import ChatWidget from "./shared/components/ChatWidget";

function App() {
  useEffect(() => {
    seedDatabase();
  }, []);

  return (
    <ToastProvider>
      <AppRoutes />
      <ChatWidget />
    </ToastProvider>
  );
}

export default App;

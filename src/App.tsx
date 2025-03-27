import { AuthProvider } from "@/data/auth-context";
import { ThemeProvider } from "@/data/theme-provider"
import AppRoutes from "@/components/signin/routes";

const App = () => {
  return (
    <AuthProvider>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <AppRoutes />
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;



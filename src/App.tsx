import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate} from 'react-router-dom';
import { useAuth } from "@/data/auth-context";
import { AuthProvider } from "@/data/auth-context";
import { ThemeProvider } from "@/data/theme-provider"
import { useEffect } from "react";

import SignInPage from "@/components/signin/sign-in";
import ResetPasswordPage from "@/components/signin/password-reset";
import Layout from "@/components/layout.js";

const App = () => {
  const currentUrl = new URL(window.location.href);
  const urlState = currentUrl.search;

  return (
    <AuthProvider url={urlState}>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <Router>
          <AppRoutes />
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
};

const AppRoutes = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Define allowed paths
  const allowedPaths = new Set(["/", "/sign-in", "/reset-password"]);

  useEffect(() => {
    const { pathname, search } = location;

    // If the path is not allowed OR if there are extra search params, clean the URL
    if (!allowedPaths.has(pathname) || search) {
      navigate(pathname, { replace: true });
    }
  }, [location, navigate]);

  return (
    <Routes>
      <Route path="/" element={user ? <Layout /> : <Navigate to="/sign-in" />} />
      <Route path="/sign-in" element={user ? <Navigate to="/" /> : <SignInPage />} />
      <Route path="/reset-password" element={user ? <Navigate to="/" /> : <ResetPasswordPage />} />
    </Routes>
  );
};

export default App;
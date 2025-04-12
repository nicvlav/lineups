import { BrowserRouter as BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

  console.log("STATE", urlState);

  // Clean up the URL after extracting the state
  useEffect(() => {
    if (urlState) {
      window.history.replaceState(null, "", currentUrl.pathname);
    }
  }, [urlState]);

  return (
    <div className='h-screen'>
      <AuthProvider url={urlState}>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ThemeProvider>
      </AuthProvider>

    </div>
  );
};

const AppRoutes = () => {
  const { user } = useAuth();

  return (

    <Routes>
      {/* Authentication Routes */}
      <Route path="/sign-in" element={user ? <Navigate to="/" /> : <SignInPage />} />
      <Route path="/reset-password" element={user ? <Navigate to="/" /> : <ResetPasswordPage />} />

      {/* Main route: Redirects to Sign In if user is not logged in */}
      <Route path="*" element={user ? <Layout /> : <Navigate to="/sign-in" />} />
    </Routes>

  );
};


export default App;
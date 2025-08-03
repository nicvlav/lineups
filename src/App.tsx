
import { AuthProvider } from "@/context/auth-context";
import { ThemeProvider } from "@/context/theme-provider"
import { useEffect } from "react";
import Layout from "@/components/layout.js";
import { Toaster } from "sonner";

const App = () => {
  const currentUrl = new URL(window.location.href);
  const urlState = currentUrl.search;

  // console.log("STATE", urlState);

  // Clean up the URL after extracting the state

  useEffect(() => {
    if (urlState) {
      window.history.replaceState(null, "", currentUrl.pathname);
    }
  }, [urlState]);

  return (

    <div className="h-[100dvh] flex flex-col">
      <AuthProvider url={urlState}>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <Layout />
          <Toaster />
        </ThemeProvider>
      </AuthProvider>

    </div>
  );
};

export default App;
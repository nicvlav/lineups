
import { AuthProvider } from "@/context/auth-context";
import { ThemeProvider } from "@/context/theme-provider"
import { useEffect } from "react";
import Layout from "@/components/layout.js";

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
    <div className='h-screen'>
      <AuthProvider url={urlState}>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
            <Layout />
        </ThemeProvider>
      </AuthProvider>

    </div>
  );
};

export default App;
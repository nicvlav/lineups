import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { useAuth } from "@/data/auth-context";

import SignInPage from "@/components/signin/sign-in";
import ResetPasswordPage from "@/components/signin/password-reset";
import Layout from "@/components/layout.js";

const AppRoutes = () => {
    const { user } = useAuth();


    return (
        <Router>
            <Routes>
                {/* If the user is authenticated, redirect to the dashboard */}
                <Route path="/" element={user ? <Navigate to="/dashboard" /> : <SignInPage />} />
                <Route path="/sign-in" element={user ? <Navigate to="/dashboard" /> : <SignInPage />} />
                <Route path="/dashboard" element={user ? <Layout /> : <Navigate to="/sign-in" />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                {/* More routes */}
            </Routes>
        </Router>
    );
};

export default AppRoutes;



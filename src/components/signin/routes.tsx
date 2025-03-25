import { BrowserRouter as Router, Routes, Route, Navigate} from "react-router-dom";
import { useAuth } from "@/data/auth-context";

import SignInPage from "@/components/signin/sign-in";
// import ResetPasswordPage from "@/components/signin/password-reset";
import Layout from "@/components/layout.js";

const AppRoutes = () => {
    const { user, client } = useAuth();

    console.log(client);

    return (
        <Router>
            <Routes>
                {/* If the user is authenticated, redirect to the dashboard */}
                <Route path="/" element={user ? <Layout /> : <SignInPage />} />
                {/* <Route path="/sign-in" element={user ? <Navigate to="/dashboard" /> : <SignInPage />} /> */}
                <Route path="/dashboard" element={<Navigate to="/" />} />
                {/* <Route path="/reset-password" element={<ResetPasswordPage />} /> */}
                {/* More routes */}
            </Routes>
        </Router>
    );
};

export default AppRoutes;



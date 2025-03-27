import { useAuth } from "@/data/auth-context"; // Adjust import to your structure
import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute = () => {
  const { user } = useAuth();

  if (!user) {
    // If there's no user, redirect to the sign-in page
    return <Navigate to="/signin" />;
  }

  // If user is authenticated, render the nested components (like Dashboard)
  return <Outlet />;
};

export default ProtectedRoute;

import { useState } from "react";
import { useAuth } from "@/context/auth-context"; 
import { useNavigate } from "react-router-dom";

const ResetPasswordPage = () => {
  const { supabase } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!supabase)   throw new Error("Supabase not connected!")
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        setError("Failed to send password reset email.");
      } else {
        setMessage("Check your email for the password reset link.");
        setTimeout(() => navigate("/signin"), 3000); // Redirect to sign-in after message
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-background">
      <div className="bg-background p-8 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-2xl font-bold text-center mb-6">Reset Password</h2>

        <form onSubmit={handleReset}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-foreground -700">
              Enter your email to reset password
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg mt-1"
              placeholder="Email"
              required
            />
          </div>

          {error && <div className="text-red-500">{error}</div>}
          {message && <div className="text-green-500">{message}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-foreground p-3 rounded-lg shadow-lg disabled:bg-accent"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;

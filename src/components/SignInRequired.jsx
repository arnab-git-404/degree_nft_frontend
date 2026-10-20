import { Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "./Button";

export function SignInRequired({
  title = "Sign in to continue",
  description = "Verify ownership of your connected wallet to access this page.",
}) {
  const { isAuthenticating, authError, signIn } = useAuth();

  const handleSignIn = async () => {
    try {
      await signIn();
    } catch {
      // The auth context exposes the error below.
    }
  };

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <ShieldCheck className="h-16 w-16 text-indigo-500" />
      <h2 className="mt-4 text-2xl font-bold">{title}</h2>
      <p className="mt-2 max-w-md text-gray-400">{description}</p>
      {authError && <p className="mt-3 text-sm text-red-300">{authError}</p>}
      <Button className="mt-6" onClick={handleSignIn} disabled={isAuthenticating}>
        {isAuthenticating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          "Sign In With Wallet"
        )}
      </Button>
    </div>
  );
}

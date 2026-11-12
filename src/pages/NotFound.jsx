import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="rounded-lg w-full max-w-xl border border-ink/15 bg-paper-soft p-10 sm:p-14">
        <p className="eyebrow">Error 404</p>
        <p className="mt-6 text-cobalt text-6xl font-bold">
          404
        </p>
        <h1 className="mt-4 text-xl font-semibold">
          Page not found
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-ink/60">
          The page you are looking for does not exist, was moved, or is only
          available to signed-in accounts.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/" className="btn-primary">
            Return home
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/verify" className="btn-outline">
            Verify a credential
          </Link>
        </div>
      </div>
    </div>
  );
}

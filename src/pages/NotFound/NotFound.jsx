import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import "./NotFound.css";

export function NotFound() {
  return (
    <div className="not-found">
      <div className="card">
        <p className="code">404</p>
        <div>
          <h1 className="title">Page not found</h1>
          <p className="text">
            The page you are looking for does not exist, was moved, or is only
            available to signed-in accounts.
          </p>
          <div className="actions">
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
    </div>
  );
}

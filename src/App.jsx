import { Navigate } from "react-router-dom";

/**
 * Root route ("/") is the front door to the new build. Everything the
 * demo audience needs lives on /this-week — including the login surface
 * for unauthed visitors (D20). Bare-domain traffic lands there.
 */
export default function App() {
  return <Navigate to="/this-week" replace />;
}

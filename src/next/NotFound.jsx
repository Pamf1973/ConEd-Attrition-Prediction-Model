import { Link, useLocation } from "react-router-dom";
import "./NotFound.css";

export default function NotFound() {
  const { pathname } = useLocation();

  return (
    <div className="sc-scope nf-page">
      <div className="nf-frame">
        <div className="nf-meta">
          <span>ConEd Steam Attrition</span>
          <span>404 · No route</span>
        </div>
        <h1 className="nf-title">Nothing at this address.</h1>
        <p className="nf-path">
          <code>{pathname}</code> isn&rsquo;t a route in this build.
        </p>
        <ul className="nf-links">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/rankings">Rankings</Link></li>
          <li><Link to="/legacy">Legacy dashboard</Link></li>
        </ul>
      </div>
    </div>
  );
}

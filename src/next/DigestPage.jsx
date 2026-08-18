import { Link } from "react-router-dom";
import "./DigestPage.css";

/**
 * M12 placeholder. W6 says buttons first — the "Compose weekly digest"
 * primary lives on /this-week. This surface is the honest empty state
 * until R13 (compose flow) ships.
 */
export default function DigestPage() {
  return (
    <div className="sc-scope dg-page">
      <div className="dg-frame">
        <div className="dg-meta">
          <span>ConEd Steam Attrition</span>
          <span>Weekly digest · M12</span>
        </div>
        <h1 className="dg-title">Compose ships with M12.</h1>
        <p className="dg-body">
          The digest composer pulls this week&rsquo;s Critical queue and delta
          feed into an editable draft with locked number tokens, then hands
          the plain-text twin to your mail client. Not built yet.
        </p>
        <ul className="dg-links">
          <li><Link to="/this-week">Back to This Week</Link></li>
          <li><Link to="/rankings">Rankings</Link></li>
          <li><Link to="/methodology">Methodology</Link></li>
        </ul>
      </div>
    </div>
  );
}

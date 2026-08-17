import { Component } from "react";

/**
 * ErrorBoundary — catches renderer throws from atoms (ScoreCell, CaseFileHeader)
 * so a single malformed record can't blank the page. Falls back to caller-supplied
 * `fallback` and logs the error to the console for debugging.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    const label = this.props.label ? `[${this.props.label}] ` : "";
    console.error(`${label}ErrorBoundary caught:`, error, info);
  }

  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}

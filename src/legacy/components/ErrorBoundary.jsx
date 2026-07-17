import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex items-center justify-center h-screen bg-[#030D1A] text-slate-400 text-sm">
          <div className="text-center max-w-md px-6">
            <div className="text-3xl mb-4 text-red-500/60">⚡</div>
            <div className="text-red-400 font-semibold mb-2">Something went wrong</div>
            <p className="text-slate-500 text-xs mb-4">{this.state.error.message}</p>
            <button
              onClick={() => this.setState({ error: null })}
              className="px-4 py-2 rounded bg-[#002469] border border-[#0F3B7E] text-slate-300 hover:bg-[#0041A8] transition-colors text-xs"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

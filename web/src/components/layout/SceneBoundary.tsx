import { Component, type ReactNode } from "react";

/** Keeps the rest of the app usable if the 3D view throws (e.g. a lost WebGL context). */
export class SceneBoundary extends Component<{ children: ReactNode; resetKey: string }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
        <p className="text-ink font-medium">The 3D view stopped responding.</p>
        <p className="text-sm text-mute max-w-md">Results and controls still work. Reload the 3D view to continue; if it keeps happening, the browser may have lost its graphics context.</p>
        <button className="h-9 px-4 rounded-[4px] border border-line-strong text-sm hover:bg-raised" onClick={() => this.setState({ error: null })}>
          Reload 3D view
        </button>
      </div>
    );
  }
}

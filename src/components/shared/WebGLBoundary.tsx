import { Component, type ReactNode } from "react";

/** Renders `fallback` when a WebGL scene throws (no context, lost GPU, shader failure…). */
export class WebGLBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

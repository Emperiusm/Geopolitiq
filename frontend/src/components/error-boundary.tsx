import { h, Component, ComponentChildren } from 'preact';

interface Props {
  children: ComponentChildren;
  fallback?: ComponentChildren;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error("ErrorBoundary caught an error:", error);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{ padding: '24px', background: 'var(--danger-dim)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 8px 0', color: 'var(--danger)' }}>Panel Error</h3>
          <p style={{ margin: '0 0 16px 0', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Something went wrong loading this component.</p>
          <button 
            onClick={() => this.setState({ hasError: false })}
            style={{ background: 'var(--danger)', border: 'none', padding: '8px 16px', borderRadius: '4px', color: '#fff', cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

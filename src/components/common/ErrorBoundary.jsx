import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("React ErrorBoundary caught an unhandled exception:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '2.5rem 1.5rem',
          margin: '2rem auto',
          maxWidth: '640px',
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #fecdd3',
          boxShadow: '0 10px 25px -5px rgba(225, 29, 72, 0.1)',
          textAlign: 'center'
        }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#ffe4e6', color: '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
            <AlertTriangle size={24} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
            {this.props.title || 'Component Failure Recovered'}
          </h3>
          <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '1.25rem', lineHeight: '1.5' }}>
            An unhandled runtime error occurred in this view module. The rest of the ERP system remains functional.
          </p>
          {this.state.error?.message && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.75rem', fontSize: '0.78rem', fontFamily: 'monospace', color: '#be123c', textAlign: 'left', marginBottom: '1.25rem', overflowX: 'auto' }}>
              {this.state.error.toString()}
            </div>
          )}
          <button
            onClick={this.handleReset}
            className="btn btn-primary"
            style={{ margin: '0 auto', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RefreshCw size={16} /> Reload Module
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

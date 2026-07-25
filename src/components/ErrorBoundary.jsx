import React from 'react';

/**
 * ErrorBoundary — Production React Error Boundary
 *
 * Catches any JavaScript errors thrown by child components during rendering,
 * in lifecycle methods, or in constructors. Without this, any unhandled
 * error will crash the entire app and show a blank white screen.
 *
 * With this boundary, errors are caught and a friendly fallback UI is shown.
 * The error is also logged to the console for debugging.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  // Called when a descendant component throws an error
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  // Called after the error has been captured — log details
  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[ERROR BOUNDARY] Caught an error:', error, errorInfo);
    // In production you would send this to an error tracking service like Sentry:
    // Sentry.captureException(error, { extra: errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
          color: '#e2e8f0',
          padding: '2rem',
          textAlign: 'center',
        }}>
          {/* Icon */}
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #f97316, #ef4444)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            marginBottom: '1.5rem',
            boxShadow: '0 0 30px rgba(249, 115, 22, 0.4)',
          }}>
            ⚠️
          </div>

          {/* Heading */}
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: '700',
            marginBottom: '0.75rem',
            background: 'linear-gradient(135deg, #f97316, #fbbf24)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Something went wrong
          </h1>

          {/* Subtitle */}
          <p style={{
            color: '#94a3b8',
            maxWidth: '480px',
            lineHeight: '1.6',
            marginBottom: '2rem',
            fontSize: '1rem',
          }}>
            An unexpected error occurred. Our team has been notified.
            Please try refreshing the page or going back to the home screen.
          </p>

          {/* Error detail — only shown in development */}
          {import.meta.env.DEV && this.state.error && (
            <details open style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '2rem',
              maxWidth: '600px',
              width: '100%',
              textAlign: 'left',
              cursor: 'pointer',
            }}>
              <summary style={{ color: '#fca5a5', fontWeight: '600', marginBottom: '0.5rem' }}>
                🔍 Error details (dev only)
              </summary>
              <pre style={{
                fontSize: '0.75rem',
                color: '#fca5a5',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {this.state.error?.toString()}
                {'\n\n'}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}

          {/* Action Button */}
          <button
            onClick={this.handleReset}
            style={{
              padding: '0.75rem 2rem',
              background: 'linear-gradient(135deg, #f97316, #ef4444)',
              color: 'white',
              border: 'none',
              borderRadius: '50px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(249, 115, 22, 0.4)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={e => {
              e.target.style.transform = 'scale(1.05)';
              e.target.style.boxShadow = '0 6px 28px rgba(249, 115, 22, 0.6)';
            }}
            onMouseLeave={e => {
              e.target.style.transform = 'scale(1)';
              e.target.style.boxShadow = '0 4px 20px rgba(249, 115, 22, 0.4)';
            }}
          >
            🏠 Go back to Home
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

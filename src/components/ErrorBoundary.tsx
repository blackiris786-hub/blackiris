import * as React from 'react';

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren<unknown>, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren<unknown>) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Uncaught error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-gray-900 rounded-lg p-6 border border-red-500">
            <h2 className="text-red-400 text-xl font-bold mb-4">Something went wrong</h2>
            <p className="text-gray-300 mb-4">{this.state.error.message}</p>
            <pre className="text-xs text-gray-500">{this.state.error.stack}</pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

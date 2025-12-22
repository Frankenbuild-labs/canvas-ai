import React from 'react';

interface ErrorBoundaryState { hasError: boolean; error?: Error }

export class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Placeholder for centralized logging
    console.error('BuzzRoll ErrorBoundary caught error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center w-full h-full text-center p-8 text-zinc-300">
          <h2 className="text-lg font-semibold text-red-400 mb-2">Something went wrong.</h2>
          <p className="text-xs max-w-sm mb-4">A rendering error occurred. Try selecting a different clip or retry.</p>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="px-3 py-1.5 text-xs rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-100"
          >Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;

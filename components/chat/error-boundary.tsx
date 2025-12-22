"use client"

import React from "react"

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ChatErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    console.error("[ERROR BOUNDARY] Caught error:", error)
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ERROR BOUNDARY] Component stack:", errorInfo.componentStack)
    console.error("[ERROR BOUNDARY] Error:", error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full items-center justify-center p-8">
          <div className="max-w-md space-y-4 rounded-lg border border-red-500 bg-red-50 p-6 dark:bg-red-950">
            <h2 className="text-xl font-bold text-red-700 dark:text-red-300">
              ❌ Something went wrong
            </h2>
            <p className="text-sm text-red-600 dark:text-red-400">
              {this.state.error?.message || "An unknown error occurred"}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.reload()
              }}
              className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

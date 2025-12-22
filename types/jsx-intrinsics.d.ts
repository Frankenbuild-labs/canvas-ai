import 'react'

declare module 'react' {
  // Augment the React JSX namespace to include custom elements
  namespace JSX {
    interface IntrinsicElements {
      'call-widget': any
    }
  }
}

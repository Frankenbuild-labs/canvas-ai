declare namespace JSX {
  interface IntrinsicElements {
    'call-widget': any
  }
}

// Ensure global JSX namespace is augmented for custom elements
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'call-widget': any
    }
  }
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        'call-widget': any
      }
    }
  }
}

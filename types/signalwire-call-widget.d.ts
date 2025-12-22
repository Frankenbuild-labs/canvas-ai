// Minimal shims for the SignalWire Call Widget and custom element

declare module '@signalwire/call-widget' {
  const module: any
  export = module
}

declare namespace JSX {
  interface IntrinsicElements {
    'call-widget': any
  }
}

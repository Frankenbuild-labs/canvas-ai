// Wildcard type shim for the internal videokit alias used at runtime via webpack alias
// This prevents the root TS config from typechecking inside videokit subproject.
declare module "@vk/*" {
  const mod: any
  export = mod
}

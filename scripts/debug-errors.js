/**
 * Debug script to monitor console for errors
 * Add this to your browser console to capture all errors before page refresh
 */

// Prevent page refresh on error
window.addEventListener('error', (event) => {
  console.error('🔴 GLOBAL ERROR:', event.error)
  console.error('🔴 Error message:', event.message)
  console.error('🔴 Error filename:', event.filename)
  console.error('🔴 Error line:', event.lineno)
  console.error('🔴 Error stack:', event.error?.stack)
  event.preventDefault()
  alert(`ERROR: ${event.message}\n\nCheck console for details. Page refresh prevented.`)
  return false
}, true)

window.addEventListener('unhandledrejection', (event) => {
  console.error('🔴 UNHANDLED REJECTION:', event.reason)
  console.error('🔴 Promise:', event.promise)
  console.error('🔴 Stack:', event.reason?.stack)
  event.preventDefault()
  alert(`UNHANDLED PROMISE REJECTION: ${event.reason}\n\nCheck console for details. Page refresh prevented.`)
  return false
}, true)

console.log('✅ Error monitoring enabled. Errors will be logged and page refresh will be prevented.')

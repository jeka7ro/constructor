// Non-destructive error logging for uncaught errors
window.addEventListener('error', function(e) {
  console.warn('Unhandled window error:', e.error || e.message);
});


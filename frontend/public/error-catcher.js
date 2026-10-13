window.addEventListener('error', function(e) {
  const msg = (e.message || (e.error && e.error.message) || '').toLowerCase();
  if (
    msg.includes('_leaflet_pos') ||
    msg.includes('resizeobserver') ||
    msg.includes('script error')
  ) {
    console.warn('Ignored non-critical background error:', e.message);
    return;
  }
  const stack = (e.error && e.error.stack) ? e.error.stack : (e.message || 'Unknown Error');
  document.body.innerHTML = '<div style="color:red;padding:20px;font-family:monospace;z-index:999999;position:fixed;top:0;left:0;background:white;width:100%;height:100%;"><h1>Crash</h1><pre>' + stack + '</pre></div>';
});

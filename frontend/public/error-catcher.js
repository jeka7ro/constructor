window.addEventListener('error', function(e) {
  document.body.innerHTML = '<div style="color:red;padding:20px;font-family:monospace;z-index:999999;position:fixed;top:0;left:0;background:white;width:100%;height:100%;"><h1>Crash</h1><pre>' + e.error.stack + '</pre></div>';
});

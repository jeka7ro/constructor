export default async (request, context) => {
  const url = new URL(request.url);
  
  // Only intercept HTML requests (skip assets, API, etc)
  if (url.pathname.includes('.') && !url.pathname.endsWith('.html')) {
    return context.next();
  }
  
  const response = await context.next();
  
  // Only intercept successful HTML responses
  if (!response.headers.get("content-type")?.includes("text/html")) {
    return response;
  }
  
  try {
    const host = request.headers.get("host") || url.host;
    let subdomain = host.split('.')[0];
    if (subdomain.includes(':')) {
        subdomain = subdomain.split(':')[0];
    }
    
    // Fetch tenant data from API
    let apiUrl = `https://cmr.up.railway.app/api/public/tenant-config?slug=${subdomain}`;
    let apiRes = await fetch(apiUrl);
    if (!apiRes.ok) {
      apiUrl = `https://cmr.up.railway.app/public/tenant-config?slug=${subdomain}`;
      apiRes = await fetch(apiUrl);
    }
    
    if (apiRes.ok) {
      const data = await apiRes.json();
      
      let html = await response.text();
      
      const tName = data.name || (subdomain === 'davidechape' ? 'Davide Chape' : 'SmartDevize');
      const tDesc = (data.slug === 'davidechape' || subdomain === 'davidechape')
        ? 'Chape fluide, chape traditionnelle & isolation en Belgique'
        : `Portail & Gestion en ligne - ${tName}`;

      // Inject title
      html = html.replace(/<title>.*?<\/title>/gi, `<title>${tName}</title>`);
      html = html.replace(/<meta property="og:title" content=".*?"\s*\/?>/gi, `<meta property="og:title" content="${tName}" />`);
      
      // Inject description
      html = html.replace(/<meta name="description" content=".*?"\s*\/?>/gi, `<meta name="description" content="${tDesc}" />`);
      html = html.replace(/<meta property="og:description" content=".*?"\s*\/?>/gi, `<meta property="og:description" content="${tDesc}" />`);

      // Inject favicon, apple-touch-icon & og:image
      const iconUrl = data.favicon_url || data.logo_url;
      if (iconUrl) {
        let finalIconUrl = iconUrl;
        if (!finalIconUrl.startsWith('http')) {
           finalIconUrl = `https://cmr.up.railway.app${finalIconUrl.startsWith('/') ? '' : '/'}${finalIconUrl}`;
        }
        const mimeType = finalIconUrl.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
        html = html.replace(/<link rel="icon"[^>]*>/gi, `<link rel="icon" type="${mimeType}" href="${finalIconUrl}" />`);
        html = html.replace(/<link rel="apple-touch-icon"[^>]*>/gi, `<link rel="apple-touch-icon" href="${finalIconUrl}" />`);
        html = html.replace(/<meta property="og:image" content=".*?"\s*\/?>/gi, `<meta property="og:image" content="${finalIconUrl}" />`);
      }
      
      return new Response(html, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
    }
  } catch (error) {
    console.error("OG Injection Error:", error);
  }
  
  // Fallback to original response if anything fails
  return response;
};

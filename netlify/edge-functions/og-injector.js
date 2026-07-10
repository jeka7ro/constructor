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
    const apiUrl = `https://cmr.up.railway.app/public/tenant-config?slug=${subdomain}`;
    const apiRes = await fetch(apiUrl);
    
    if (apiRes.ok) {
      const data = await apiRes.json();
      
      let html = await response.text();
      
      // Inject title
      if (data.name) {
        html = html.replace(/<title>.*?<\/title>/g, `<title>${data.name}</title>`);
        html = html.replace(/<meta property="og:title" content=".*?" \/>/g, `<meta property="og:title" content="${data.name}" />`);
      }
      
      // Inject image
      const iconUrl = data.favicon_url || data.logo_url;
      if (iconUrl) {
        let finalIconUrl = iconUrl;
        if (!finalIconUrl.startsWith('http')) {
           finalIconUrl = `https://cmr.up.railway.app${finalIconUrl}`;
        }
        // Force replace the og:image content
        html = html.replace(/<meta property="og:image" content=".*?" \/>/g, `<meta property="og:image" content="${finalIconUrl}" />`);
      }
      
      return new Response(html, response);
    }
  } catch (error) {
    console.error("OG Injection Error:", error);
  }
  
  // Fallback to original response if anything fails
  return response;
};

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useTenantStore = create(
    persist(
        (set) => ({
            tenant: null,
            
            setTenant: (tenantData) => set({ tenant: tenantData }),
            
            clearTenant: () => set({ tenant: null }),
            
            // Helper to get domain/slug
            getCurrentSubdomain: () => {
                const hostname = window.location.hostname

                // Allow ?slug= param for IP access — save to localStorage so it persists after navigation
                const urlParams = new URLSearchParams(window.location.search)
                const slugParam = urlParams.get('slug')
                if (slugParam) {
                    localStorage.setItem('tenant_slug_override', slugParam)
                    return slugParam
                }

                // Check localStorage fallback (for IP access after navigation)
                const savedSlug = localStorage.getItem('tenant_slug_override')

                // If it's pure localhost or IP, use saved slug or null
                if (hostname === 'localhost' || hostname === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
                    return savedSlug || null
                }
                
                // Allow *.localhost for testing locally
                if (hostname.endsWith('.localhost')) {
                    localStorage.removeItem('tenant_slug_override')
                    return hostname.split('.')[0]
                }
                
                if (hostname.endsWith('.railway.app') || hostname.endsWith('.netlify.app')) {
                    return null;
                }
                
                const parts = hostname.split('.')
                if (parts.length >= 3) {
                    const subdomain = parts[0]
                    if (subdomain !== 'www' && subdomain !== 'app' && subdomain !== 'admin' && subdomain !== 'master') {
                        return subdomain
                    }
                }
                
                return savedSlug || null
            }
        }),
        {
            name: 'tenant-storage',
        }
    )
)

export { useTenantStore }

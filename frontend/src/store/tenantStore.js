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

                // Check localStorage fallback (only if explicitly set via ?slug=...)
                const savedSlug = localStorage.getItem('tenant_slug_override')

                // If it's pure localhost or IP (no tenant subdomain), return null for Super Admin (unless ?slug= was explicitly passed)
                if (hostname === 'localhost' || hostname === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
                    if (!slugParam) {
                        localStorage.removeItem('tenant_slug_override')
                        return null
                    }
                    return slugParam
                }
                
                // Allow <tenant>.localhost for testing tenants locally (e.g. davidechape.localhost:5678)
                if (hostname.endsWith('.localhost')) {
                    localStorage.removeItem('tenant_slug_override')
                    const sub = hostname.split('.')[0]
                    if (sub && !['www', 'app', 'admin', 'master'].includes(sub)) {
                        return sub
                    }
                    return null
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

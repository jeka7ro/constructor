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
                const searchParams = new URLSearchParams(window.location.search)
                if (searchParams.has('tenant')) {
                    const t = searchParams.get('tenant')
                    localStorage.setItem('pontaj_test_tenant', t)
                    return t
                }
                const savedTenant = localStorage.getItem('pontaj_test_tenant')
                
                const hostname = window.location.hostname
                
                // Allow fallback testing on netlify directly using URL params
                if (hostname.endsWith('.netlify.app') || hostname.endsWith('.railway.app') || hostname === 'localhost' || hostname === '127.0.0.1') {
                    if (savedTenant) return savedTenant
                }
                
                if (hostname === 'localhost' || hostname === '127.0.0.1') {
                    return null
                }
                
                // Allow *.localhost for testing locally
                if (hostname.endsWith('.localhost')) {
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
                
                return null
            }
        }),
        {
            name: 'tenant-storage',
        }
    )
)

export { useTenantStore }

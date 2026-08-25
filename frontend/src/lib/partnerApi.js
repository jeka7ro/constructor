import axios from 'axios'

const partnerApi = axios.create({
    baseURL: '/api/partner',
    headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    },
})

// Request interceptor — inject partner token
partnerApi.interceptors.request.use(
    (config) => {
        try {
            const partnerStorage = localStorage.getItem('partner-storage')
            if (partnerStorage) {
                const parsed = JSON.parse(partnerStorage)
                const token = parsed.state?.token
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`
                }
            }
        } catch (e) { }

        // Inject tenant subdomain
        try {
            const hostname = window.location.hostname;
            if (hostname) {
                const subdomain = hostname.split('.')[0];
                if (subdomain && !['localhost', '127', 'pontaj'].includes(subdomain)) {
                    config.headers['X-Tenant-Subdomain'] = subdomain;
                }
            }
        } catch (e) { }

        if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];
        }

        return config
    },
    (error) => Promise.reject(error)
)

// Response interceptor — auto-redirect on 401
partnerApi.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const requestUrl = error.config?.url || ''
            if (!requestUrl.includes('/login')) {
                localStorage.removeItem('partner-storage')
                window.location.href = '/partner/login'
            }
        }
        return Promise.reject(error)
    }
)

export default partnerApi

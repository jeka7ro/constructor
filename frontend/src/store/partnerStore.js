import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const usePartnerStore = create(
    persist(
        (set) => ({
            partner: null,
            token: null,

            setAuth: (partner, token) => set({ partner, token }),

            updatePartner: (data) => set((state) => ({ partner: { ...state.partner, ...data } })),

            logout: () => set({ partner: null, token: null }),

            isAuthenticated: () => {
                const state = usePartnerStore.getState()
                return !!state.token && !!state.partner
            }
        }),
        {
            name: 'partner-storage',
        }
    )
)

export { usePartnerStore }

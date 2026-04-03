import { create } from 'zustand'

export const useUIStore = create((set) => ({
    dialog: null, // { title, message, onConfirm, onCancel, type: 'danger'|'info'|'warning', confirmText, cancelText }
    toast: null, // { message, type: 'success'|'error'|'info' }
    
    showDialog: (options) => set({ dialog: options }),
    closeDialog: () => set({ dialog: null }),
    
    showToast: (message, type = 'info') => {
        set({ toast: { message, type } })
        let timeout = setTimeout(() => {
            set((state) => {
                // Only clear if the toast hasn't been replaced
                if (state.toast?.message === message) {
                    return { toast: null }
                }
                return state
            })
        }, 4000)
    }
}))

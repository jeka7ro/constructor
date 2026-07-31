import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
    MessageSquare, Send, Trash2, Search, ArrowLeft, CheckCircle2, XCircle, Clock, FileText, ClipboardList, EyeOff
} from 'lucide-react'
import api from '../../lib/api'
import { useUIStore } from '../../store/uiStore'

export default function AdminChats() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const showToast = useUIStore(s => s.showToast)
    
    const [chats, setChats] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    
    // Active chat state
    const [activeWoId, setActiveWoId] = useState(searchParams.get('wo_id') || null)
    const [activeWo, setActiveWo] = useState(null)
    const [messages, setMessages] = useState([])
    const [chatMessage, setChatMessage] = useState('')
    const [loadingMessages, setLoadingMessages] = useState(false)
    const messagesEndRef = useRef(null)

    // Load list of chats
    const loadChats = async () => {
        try {
            const res = await api.get('/admin/chats')
            setChats(res.data)
        } catch (err) {
            console.error(err)
            showToast({ message: t('admin.error_loading_chats', 'Eroare la încărcarea conversațiilor'), type: "error" })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadChats()
    }, [])

    // Load specific chat messages
    useEffect(() => {
        if (!activeWoId) return
        
        const loadChatDetails = async () => {
            setLoadingMessages(true)
            try {
                // Fetch WO details to get status and is_chat_closed
                const [woRes, msgRes] = await Promise.all([
                    api.get(`/admin/work-orders/${activeWoId}`),
                    api.get(`/admin/work-orders/${activeWoId}/messages`)
                ])
                setActiveWo(woRes.data)
                setMessages(msgRes.data || [])
                
                // update URL
                setSearchParams({ wo_id: activeWoId }, { replace: true })
                
                // if there were unread messages for this chat, mark read might be needed
                // We dispatch an event to force the HeaderNotifications bell to refresh immediately
                window.dispatchEvent(new CustomEvent('refresh-notifications'))
                // We could refresh chats list to update unread count
                loadChats()
            } catch (err) {
                console.error(err)
                showToast({ message: t('admin.error_loading_messages', 'Eroare la încărcarea mesajelor'), type: "error" })
            } finally {
                setLoadingMessages(false)
            }
        }
        
        loadChatDetails()
        
        // Auto-refresh chat every 15 seconds so we don't need to press F5
        const interval = setInterval(() => {
            if (activeWoId) {
                // Background refresh without triggering loading spinner
                Promise.all([
                    api.get(`/admin/work-orders/${activeWoId}`),
                    api.get(`/admin/work-orders/${activeWoId}/messages`)
                ]).then(([woRes, msgRes]) => {
                    setActiveWo(woRes.data)
                    setMessages(msgRes.data || [])
                    loadChats() // Refresh the sidebar too
                }).catch(e => console.error("Auto-refresh failed", e))
            }
        }, 15000)
        
        return () => clearInterval(interval)
    }, [activeWoId])

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages])

    const handleSendMessage = async (e) => {
        e.preventDefault()
        if (!chatMessage.trim()) return

        try {
            const res = await api.post(`/admin/work-orders/${activeWoId}/messages`, {
                message: chatMessage
            })
            setMessages(prev => [...prev, res.data])
            setChatMessage('')
            
            // update local list last message
            setChats(prev => prev.map(c => 
                c.work_order_id === activeWoId 
                    ? { ...c, last_message: chatMessage, last_message_time: new Date().toISOString() } 
                    : c
            ).sort((a, b) => new Date(b.last_message_time) - new Date(a.last_message_time)))
            
        } catch (err) {
            if (err.response?.status === 403) {
                 showToast({ message: t('admin.chat_is_closed', 'Acest chat este închis.'), type: "error" })
                 setActiveWo(prev => ({...prev, is_chat_closed: true}))
            } else {
                 showToast({ message: t('admin.error_sending_message', 'Eroare la trimiterea mesajului'), type: "error" })
            }
        }
    }

    const handleDeleteMessage = async (msgId) => {
        if (!window.confirm(t('admin.confirm_delete_message', 'Sigur ștergi acest mesaj?'))) return
        try {
            await api.delete(`/admin/work-orders/${activeWoId}/messages/${msgId}`)
            setMessages(prev => prev.filter(m => m.id !== msgId))
            showToast({ message: t('admin.message_deleted', 'Mesaj șters'), type: "success" })
            loadChats() // Refresh to update last message if needed
        } catch (err) {
            showToast({ message: t('admin.error_deleting_message', 'Eroare la ștergerea mesajului'), type: "error" })
        }
    }

    const handleMarkUnread = async (msgId) => {
        try {
            await api.post(`/admin/work-orders/${activeWoId}/messages/${msgId}/unread`)
            showToast({ message: t('admin.message_marked_unread', 'Mesaj marcat ca necitit'), type: "success" })
            setActiveWoId(null)
            setActiveWo(null)
            setMessages([])
            setSearchParams({}, { replace: true })
            loadChats()
            window.dispatchEvent(new CustomEvent('refresh-notifications'))
        } catch (err) {
            showToast({ message: t('admin.error_marking_unread', 'Eroare la marcarea mesajului'), type: "error" })
        }
    }

    const toggleChatStatus = async () => {
        if (!activeWo) return
        const isClosed = activeWo.is_chat_closed
        const endpoint = isClosed ? `/admin/work-orders/${activeWoId}/chat/open` : `/admin/work-orders/${activeWoId}/chat/close`
        const confirmMsg = isClosed ? t('admin.confirm_reopen_chat', 'Redeschizi acest chat?') : t('admin.confirm_close_chat', 'Închizi acest chat? Clientul nu va mai putea trimite mesaje.')
        
        if (!window.confirm(confirmMsg)) return
        
        try {
            await api.post(endpoint)
            setActiveWo(prev => ({...prev, is_chat_closed: !isClosed}))
            setChats(prev => prev.map(c => c.work_order_id === activeWoId ? { ...c, is_chat_closed: !isClosed } : c))
            showToast({ message: isClosed ? t('admin.chat_reopened', 'Chat redeschis') : t('admin.chat_closed', 'Chat închis'), type: "success" })
        } catch (err) {
            showToast({ message: t('common.error', 'Eroare'), type: "error" })
        }
    }

    const filteredChats = chats.filter(c => 
        (c.client_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.title.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="flex flex-col h-[calc(100vh-120px)] bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex h-full">
                
                {/* LEFT SIDEBAR - CHATS LIST */}
                <div className={`w-full md:w-96 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col ${activeWoId ? 'hidden md:flex' : 'flex'}`}>
                    
                    {/* Header Sidebar */}
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-blue-500" />
                            {t('admin.client_messages', 'Mesaje Clienți')}
                        </h2>
                    </div>
                    
                    {/* Search */}
                    <div className="p-3 border-b border-slate-200 dark:border-slate-800">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder={t('admin.search_quote_client', 'Caută deviz sau client...')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:text-white"
                            />
                        </div>
                    </div>
                    
                    {/* List */}
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="p-8 text-center text-slate-500 flex flex-col items-center">
                                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                                {t('common.loading', 'Încărcare...')}
                            </div>
                        ) : filteredChats.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-sm">
                                {searchTerm ? t('common.no_results', 'Nu s-au găsit rezultate.') : t('admin.no_conversations', 'Nu există conversații încă.')}
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredChats.map(chat => (
                                    <button
                                        key={chat.work_order_id}
                                        onClick={() => setActiveWoId(chat.work_order_id)}
                                        className={`w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors relative flex items-start gap-3 ${activeWoId === chat.work_order_id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0 font-medium">
                                            {chat.client_name ? chat.client_name.charAt(0).toUpperCase() : '#'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <h3 className="font-medium text-slate-900 dark:text-white truncate pr-2">
                                                    {chat.is_quote 
                                                        ? (chat.quote_number || `DEV-${chat.work_order_id.substring(0,4).toUpperCase()}`) 
                                                        : (chat.invoice_number || `CMD-${chat.work_order_id.substring(0,4).toUpperCase()}`)}
                                                    {chat.title && ` - ${chat.title}`}
                                                </h3>
                                                <span className="text-xs text-slate-500 whitespace-nowrap">
                                                    {new Date(chat.last_message_time).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <p className="text-sm text-slate-500 dark:text-slate-400 truncate flex-1 pr-2">
                                                    {chat.last_message || t('admin.no_text_message', 'Niciun mesaj text')}
                                                </p>
                                                {chat.unread_count > 0 && (
                                                    <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                        {chat.unread_count}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mt-1 flex items-center gap-2">
                                                <span className="text-[10px] font-medium text-slate-400 truncate bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                                    {chat.client_name || t('admin.unknown_client', 'Client Necunoscut')}
                                                </span>
                                                {chat.is_chat_closed && (
                                                    <span className="text-[10px] font-medium text-red-500 bg-red-50 dark:bg-red-900/30 px-1.5 py-0.5 rounded">
                                                        {t('admin.closed', 'Închis')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                
                {/* RIGHT SIDE - CHAT WINDOW */}
                <div className={`flex-1 flex flex-col bg-white dark:bg-slate-900 ${!activeWoId ? 'hidden md:flex' : 'flex'}`}>
                    {activeWoId && activeWo ? (
                        <>
                            {/* Chat Header */}
                            <div className="h-16 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 flex-shrink-0">
                                <div className="flex items-center gap-3 min-w-0">
                                    <button 
                                        onClick={() => setActiveWoId(null)}
                                        className="md:hidden p-2 -ml-2 text-slate-500 hover:text-slate-700"
                                    >
                                        <ArrowLeft className="w-5 h-5" />
                                    </button>
                                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0 font-medium">
                                        {activeWo.client_name ? activeWo.client_name.charAt(0).toUpperCase() : '#'}
                                    </div>
                                    <div className="truncate">
                                        <h3 className="font-semibold text-slate-800 dark:text-white truncate">
                                            {activeWo.is_quote 
                                                ? (activeWo.quote_number || `DEV-${activeWo.id.substring(0,4).toUpperCase()}`)
                                                : (activeWo.invoice_number || `CMD-${activeWo.id.substring(0,4).toUpperCase()}`)}
                                            {activeWo.title && ` - ${activeWo.title}`}
                                        </h3>
                                        <p className="text-xs text-slate-500 truncate">
                                            {activeWo.client_name || t('admin.client', 'Client')}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => window.open(`/admin/quotes/${activeWo.id}/pdf`, '_blank')}
                                        className="px-3 py-1.5 text-xs font-medium rounded-lg border bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors flex items-center gap-1"
                                        title={t('nav.quotes', 'Devis / Offres')}
                                    >
                                        <FileText className="w-4 h-4" />
                                        <span className="hidden lg:inline">{t('nav.quotes', 'Devis / Offres')}</span>
                                    </button>
                                    <button 
                                        onClick={() => navigate(`/admin/work-orders/${activeWo.id}`)}
                                        className="px-3 py-1.5 text-xs font-medium rounded-lg border bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors flex items-center gap-1"
                                        title={t('nav.work_orders', 'Commandes')}
                                    >
                                        <ClipboardList className="w-4 h-4" />
                                        <span className="hidden lg:inline">{t('nav.work_orders', 'Commandes')}</span>
                                    </button>
                                    <button
                                        onClick={toggleChatStatus}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 border
                                            ${activeWo.is_chat_closed 
                                                ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700' 
                                                : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'}`}
                                    >
                                        {activeWo.is_chat_closed ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                        <span className="hidden sm:inline">{activeWo.is_chat_closed ? t('admin.open_chat', 'Deschide Chat') : t('admin.close_chat', 'Închide Chat')}</span>
                                    </button>
                                </div>
                            </div>
                            
                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900/50">
                                {loadingMessages ? (
                                    <div className="h-full flex items-center justify-center">
                                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-slate-400">
                                        {t('admin.no_messages_in_chat', 'Nu există mesaje în această conversație.')}
                                    </div>
                                ) : (
                                    <div className="space-y-4 max-w-3xl mx-auto">
                                        {messages.map(msg => (
                                            <div key={msg.id} className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'} group relative`}>
                                                <div className={`max-w-[75%] rounded-2xl p-3 shadow-sm relative ${msg.sender === 'admin' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-white rounded-tl-sm'}`}>
                                                    <p className="whitespace-pre-wrap break-words text-sm">{msg.message}</p>
                                                    <span className={`text-[10px] mt-1 block ${msg.sender === 'admin' ? 'text-blue-200' : 'text-slate-400'}`}>
                                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    
                                                    {msg.sender === 'admin' && (
                                                        <button
                                                            onClick={() => handleDeleteMessage(msg.id)}
                                                            className="absolute -left-10 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            title={t('admin.delete_message', 'Șterge mesaj')}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {msg.sender === 'client' && (
                                                        <button
                                                            onClick={() => handleMarkUnread(msg.id)}
                                                            className="absolute -right-10 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            title={t('admin.mark_unread', 'Marchează ca necitit')}
                                                        >
                                                            <EyeOff className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        <div ref={messagesEndRef} />
                                    </div>
                                )}
                            </div>
                            
                            {/* Input Area */}
                            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
                                {activeWo.is_chat_closed ? (
                                    <div className="text-center p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 text-sm flex items-center justify-center gap-2">
                                        <Clock className="w-4 h-4" />
                                        {t('admin.chat_is_closed_cannot_send', 'Această conversație a fost închisă. Nu se mai pot trimite mesaje.')}
                                    </div>
                                ) : (
                                    <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex gap-2">
                                        <input
                                            type="text"
                                            value={chatMessage}
                                            onChange={(e) => setChatMessage(e.target.value)}
                                            placeholder={t('admin.type_message', 'Scrie un mesaj...')}
                                            className="flex-1 rounded-full border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!chatMessage.trim()}
                                            className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <Send className="w-4 h-4 ml-0.5" />
                                        </button>
                                    </form>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
                            <MessageSquare className="w-16 h-16 mb-4 text-slate-200 dark:text-slate-800" />
                            <h3 className="text-lg font-medium text-slate-600 dark:text-slate-300">{t('admin.no_chat_selected', 'Niciun chat selectat')}</h3>
                            <p className="text-sm mt-1 text-center max-w-sm">{t('admin.select_chat_to_view', 'Selectează o conversație din stânga pentru a vizualiza mesajele sau a continua discuția cu clientul.')}</p>
                        </div>
                    )}
                </div>
                
            </div>
        </div>
    )
}

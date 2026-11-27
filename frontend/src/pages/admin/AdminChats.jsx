import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import {
    MessageSquare, Send, Trash2, Search, ArrowLeft, CheckCircle2, XCircle, Clock, FileText, ClipboardList, EyeOff, Edit2, Eye, Mail, Smile, Globe, X, Paperclip, Download, Check, CheckCheck
} from 'lucide-react'
import api from '../../lib/api'
import { useUIStore } from '../../store/uiStore'
import { useTenantStore } from '../../store/tenantStore'
import PdfThumbnail from '../../components/PdfThumbnail'

const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${api.defaults.baseURL.replace('/api', '')}${url.startsWith('/') ? url : '/' + url}`;
};

let _chatsMemoryCache = (typeof window !== 'undefined' && window.__adminChatsCache) || null
const getMessagesCache = () => {
    if (typeof window !== 'undefined') {
        if (!window.__adminChatMessagesCache) window.__adminChatMessagesCache = new Map()
        return window.__adminChatMessagesCache
    }
    return new Map()
}

export default function AdminChats() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const showToast = useUIStore(s => s.showToast)
    const tenant = useTenantStore(s => s.tenant)

    const initialChats = (typeof window !== 'undefined' && window.__adminChatsCache) || _chatsMemoryCache || []
    const [chats, setChats] = useState(() => initialChats)
    const [loading, setLoading] = useState(() => !((typeof window !== 'undefined' && window.__adminChatsCache) || _chatsMemoryCache))
    const [searchTerm, setSearchTerm] = useState('')

    // Active chat state — auto-open the first conversation from the top if no wo_id is in the URL
    const urlWoId = searchParams.get('wo_id')
    const [activeWoId, setActiveWoId] = useState(() => urlWoId || initialChats[0]?.work_order_id || null)

    useEffect(() => {
        if (urlWoId && urlWoId !== activeWoId) {
            setActiveWoId(urlWoId)
        }
    }, [urlWoId])

    useEffect(() => {
        if (!activeWoId && chats.length > 0) {
            const firstChat = chats[0]
            setActiveWoId(firstChat.work_order_id)
            setActiveWo({ ...firstChat, id: firstChat.work_order_id })
        }
    }, [chats, activeWoId])

    const [activeWoState, setActiveWo] = useState(null)
    const activeWo = (() => {
        const effId = activeWoId || chats[0]?.work_order_id || null
        if (activeWoState && String(activeWoState.id || activeWoState.work_order_id) === String(effId)) {
            return { ...activeWoState, id: activeWoState.id || activeWoState.work_order_id }
        }
        if (!effId) return null
        const matched = chats.find(c => String(c.work_order_id) === String(effId))
        if (matched) return { ...matched, id: matched.work_order_id }
        return { id: effId, work_order_id: effId, is_quote: true }
    })()
    const [messages, setMessages] = useState(() => {
        const initId = urlWoId || initialChats[0]?.work_order_id
        if (!initId) return []
        return getMessagesCache().get(String(initId)) || []
    })
    const [chatMessage, setChatMessage] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [loadingMessages, setLoadingMessages] = useState(false)
    const [editingMessageId, setEditingMessageId] = useState(null)
    const [editMessageText, setEditMessageText] = useState('')
    const [targetLang, setTargetLang] = useState('fr')
    const [showEmojiPickerFor, setShowEmojiPickerFor] = useState(null)
    const messagesEndRef = useRef(null)
    const fileInputRef = useRef(null)
    const [selectedFiles, setSelectedFiles] = useState([])
    const [isUploading, setIsUploading] = useState(false)
    const [previewAttachment, setPreviewAttachment] = useState(null)
    const [messageToDelete, setMessageToDelete] = useState(null)
    const getAvatarColor = (source_system) => {
        if (source_system === 'calculator_public' || source_system === 'we-r') return "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400";
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"; // devis_online
    };

    const getFlagEmoji = (lang) => {
        if (!lang) return <img src="https://flagcdn.com/w20/ro.png" alt="ro" className="w-[18px] h-[13px] object-cover rounded-sm shadow-sm inline" />;
        const l = lang.toLowerCase();
        const code = l === 'en' ? 'gb' : l;
        return <img src={`https://flagcdn.com/w20/${code}.png`} alt={l} className="w-[18px] h-[13px] object-cover rounded-sm shadow-sm inline" />;
    };

    // Load list of chats (with in-flight guard so background polling never stacks requests)
    const isFetchingChatsRef = useRef(false)
    const loadChats = async (isBackground = false) => {
        if (isBackground && isFetchingChatsRef.current) return
        isFetchingChatsRef.current = true
        try {
            const res = await api.get('/admin/chats')
            const list = Array.isArray(res.data) ? res.data : []
            _chatsMemoryCache = list
            if (typeof window !== 'undefined') window.__adminChatsCache = list
            setChats(list)
            const targetId = activeWoId || searchParams.get('wo_id') || (list.length > 0 ? list[0].work_order_id : null)
            if (targetId) {
                if (!activeWoId) {
                    setActiveWoId(targetId)
                }
                const matched = list.find(c => String(c.work_order_id) === String(targetId))
                if (matched) {
                    setActiveWo(prev => (prev && String(prev.id) === String(targetId)) ? prev : { ...matched, id: matched.work_order_id })
                }
            }
            // Pre-warm messages for top 8 conversations in background so clicking them is 0ms
            const msgCache = getMessagesCache()
            list.slice(0, 8).forEach(c => {
                const wid = String(c.work_order_id)
                if (wid && !msgCache.has(wid)) {
                    api.get(`/admin/work-orders/${wid}/messages`)
                        .then(mRes => {
                            const arr = Array.isArray(mRes.data) ? mRes.data : (mRes.data?.data || mRes.data?.messages || [])
                            msgCache.set(wid, arr)
                        })
                        .catch(() => { })
                }
            })
        } catch (err) {
            console.error(err)
            if (!isBackground) {
                showToast(t('admin.error_loading_chats', 'Erreur lors du chargement des conversations'), "error")
            }
        } finally {
            isFetchingChatsRef.current = false
            if (!isBackground) setLoading(false)
        }
    }

    useEffect(() => {
        loadChats()
        // Keep left sidebar updated in real time (every 6 seconds, non-overlapping)
        const chatListInterval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                loadChats(true)
            }
        }, 6000)

        const handleFocusOrVisible = () => {
            if (document.visibilityState === 'visible') {
                loadChats(true)
            }
        }
        window.addEventListener('focus', handleFocusOrVisible)
        document.addEventListener('visibilitychange', handleFocusOrVisible)

        return () => {
            clearInterval(chatListInterval)
            window.removeEventListener('focus', handleFocusOrVisible)
            document.removeEventListener('visibilitychange', handleFocusOrVisible)
        }
    }, [])

    // Load specific chat messages — instant header from chats list, messages loaded immediately without blocking on full work-order serializer
    useEffect(() => {
        if (!activeWoId) return
        let isCancelled = false

        // Instantly populate activeWo header from existing sidebar chat item so the right panel opens in 0ms
        const cachedChat = chats.find(c => String(c.work_order_id) === String(activeWoId))
        if (cachedChat) {
            setActiveWo(prev => (prev && String(prev.id) === String(activeWoId)) ? prev : { ...cachedChat, id: cachedChat.work_order_id })
        }

        const msgCache = getMessagesCache()
        const cachedMsgs = msgCache.get(String(activeWoId))
        if (cachedMsgs) {
            setMessages(cachedMsgs)
            setLoadingMessages(false)
        } else {
            setMessages([])
        }

        const loadChatDetails = async (isBackground = false) => {
            if (!isBackground && !msgCache.has(String(activeWoId))) setLoadingMessages(true)
            try {
                const msgRes = await api.get(`/admin/work-orders/${activeWoId}/messages`)
                if (isCancelled) return
                let msgs = [];
                if (Array.isArray(msgRes.data)) {
                    msgs = msgRes.data;
                } else if (msgRes.data && Array.isArray(msgRes.data.data)) {
                    msgs = msgRes.data.data;
                } else if (msgRes.data && Array.isArray(msgRes.data.messages)) {
                    msgs = msgRes.data.messages;
                }
                msgCache.set(String(activeWoId), msgs)

                if (!isBackground) {
                    setMessages(msgs)
                    setLoadingMessages(false)
                    window.dispatchEvent(new CustomEvent('refresh-notifications'))
                    // Fetch full work order metadata in background without blocking message display
                    api.get(`/admin/work-orders/${activeWoId}`)
                        .then(woRes => {
                            if (!isCancelled && woRes?.data) setActiveWo(woRes.data)
                        })
                        .catch(() => { })
                } else {
                    setMessages(prev => {
                        if (prev.length !== msgs.length || JSON.stringify(prev) !== JSON.stringify(msgs)) {
                            loadChats(true)
                            return msgs;
                        }
                        return prev;
                    })
                }
            } catch (err) {
                if (!isBackground && !isCancelled) {
                    console.error(err)
                    showToast(t('admin.error_loading_messages', 'Erreur lors du chargement des messages'), "error")
                }
            } finally {
                if (!isBackground && !isCancelled) setLoadingMessages(false)
            }
        }

        loadChatDetails()

        // Auto-refresh chat every 2 seconds so incoming messages appear near-instantly
        const interval = setInterval(() => {
            if (activeWoId && !isCancelled) {
                loadChatDetails(true)
            }
        }, 2000)

        const handleFocusOrVisible = () => {
            if (document.visibilityState === 'visible' && activeWoId && !isCancelled) {
                loadChatDetails(true)
            }
        }
        window.addEventListener('focus', handleFocusOrVisible)
        document.addEventListener('visibilitychange', handleFocusOrVisible)

        return () => {
            isCancelled = true
            clearInterval(interval)
            window.removeEventListener('focus', handleFocusOrVisible)
            document.removeEventListener('visibilitychange', handleFocusOrVisible)
        }
    }, [activeWoId])

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages])

    useEffect(() => {
        if (activeWo && activeWo.client_language) {
            const lang = activeWo.client_language.toLowerCase().split('-')[0].trim();
            if (['fr', 'en', 'nl'].includes(lang)) {
                setTargetLang(lang);
            } else {
                setTargetLang('fr');
            }
        }
    }, [activeWo])

    const handleSendMessage = async (e) => {
        if (e && e.preventDefault) e.preventDefault()
        if ((!chatMessage.trim() && selectedFiles.length === 0) || isSending || isUploading) return

        if (activeWo.is_chat_closed) {
            showToast(t('admin.chat_is_closed_cannot_send', 'Cette conversation est fermée. Vous ne pouvez plus envoyer de messages.'), "error")
            return
        }

        setIsUploading(true)
        let uploadedAttachments = []
        try {
            for (const file of selectedFiles) {
                const formData = new FormData()
                formData.append('file', file)
                const res = await api.post(`/admin/work-orders/${activeWoId}/chat-attachment`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                })
                uploadedAttachments.push(res.data)
            }
        } catch (err) {
            console.error("Upload error", err.response?.data || err);
            showToast(t('common.error_file_upload', "Erreur lors du chargement des fichiers."), "error")
            setIsUploading(false)
            return
        }
        setIsUploading(false)

        setIsSending(true)
        try {
            const payload = {
                message: chatMessage,
                target_lang: targetLang === 'none' ? 'none' : targetLang,
                attachments: uploadedAttachments
            };

            const res = await api.post(`/admin/work-orders/${activeWoId}/messages`, payload)

            setMessages(prev => [...prev, res.data])
            setChatMessage('')
            setSelectedFiles([])

            // Update last_message in chats list for left sidebar
            setChats(prev => prev.map(c =>
                c.work_order_id === activeWoId
                    ? { ...c, last_message: chatMessage, last_message_time: new Date().toISOString() }
                    : c
            ).sort((a, b) => new Date(b.last_message_time) - new Date(a.last_message_time)))

        } catch (err) {
            if (err.response?.status === 403) {
                showToast(t('admin.chat_is_closed', 'Ce chat est fermé.'), "error")
                setActiveWo(prev => ({ ...prev, is_chat_closed: true }))
            } else {
                showToast(t('admin.error_sending_message', 'Erreur lors de l\'envoi du message'), "error")
            }
        } finally {
            setIsSending(false)
        }
    }

    const handleToggleReaction = async (msgId, emoji) => {
        // Optimistic UI Update
        setMessages(prev => prev.map(m => {
            if (m.id === msgId) {
                const currentReactions = { ... (m.reactions || {}) };
                const usersWithEmoji = currentReactions[emoji] || [];

                // First, check if we are toggling off
                let wasTogglingOff = false;
                if (usersWithEmoji.includes('admin')) {
                    wasTogglingOff = true;
                }

                // Remove admin from all emojis
                Object.keys(currentReactions).forEach(e => {
                    currentReactions[e] = currentReactions[e].filter(u => u !== 'admin');
                    if (currentReactions[e].length === 0) delete currentReactions[e];
                });

                // If not toggling off, add admin to the target emoji
                if (!wasTogglingOff) {
                    currentReactions[emoji] = [...(currentReactions[emoji] || []), 'admin'];
                }

                return { ...m, reactions: currentReactions };
            }
            return m;
        }));
        setShowEmojiPickerFor(null);

        try {
            const res = await api.post(`/admin/work-orders/${activeWoId}/messages/${msgId}/react`, { emoji })
            // Server truth fallback
            setMessages(prev => prev.map(m => m.id === msgId ? { ...m, reactions: res.data.reactions } : m))
        } catch (err) {
            showToast(t('admin.error_reacting', 'Erreur lors de l\'ajout de la réaction'), "error")
        }
    }

    const handleDeleteMessage = (msgId) => {
        setMessageToDelete(msgId)
    }

    const executeDeleteMessage = async () => {
        if (!messageToDelete) return
        try {
            await api.delete(`/admin/work-orders/${activeWoId}/messages/${messageToDelete}`)
            setMessages(prev => prev.filter(m => m.id !== messageToDelete))
            showToast(t('admin.message_deleted', 'Message supprimé'), "success")
            loadChats() // Refresh to update last message if needed
        } catch (err) {
            showToast(t('admin.error_deleting_message', 'Erreur lors de la suppression du message'), "error")
        } finally {
            setMessageToDelete(null)
        }
    }

    const handleEditMessage = async (msgId) => {
        if (!editMessageText.trim()) return;
        try {
            const res = await api.put(`/admin/work-orders/${activeWoId}/messages/${msgId}`, {
                message: editMessageText
            });
            setMessages(prev => prev.map(m => m.id === msgId ? res.data : m));
            setEditingMessageId(null);
            showToast(t('admin.message_updated', 'Message mis à jour'), "success");
            loadChats(); // Refresh left sidebar (optional, just in case it was the last message)
        } catch (err) {
            showToast(t('admin.error_updating_message', 'Erreur lors de la mise à jour du message'), "error");
        }
    }

    const handleToggleVisibility = async (msgId) => {
        try {
            const res = await api.put(`/admin/work-orders/${activeWoId}/messages/${msgId}/toggle-visibility`);
            setMessages(prev => prev.map(m => m.id === msgId ? res.data : m));
            showToast(res.data.is_hidden ? t('admin.message_hidden', 'Message masqué au client') : t('admin.message_visible', 'Message visible pour le client'), "success");
        } catch (err) {
            showToast(t('admin.error_toggling_visibility', 'Erreur lors de la modification de la visibilité'), "error");
        }
    }

    const handleMarkUnread = async (msgId) => {
        try {
            await api.post(`/admin/work-orders/${activeWoId}/messages/${msgId}/unread`)
            showToast(t('admin.message_marked_unread', 'Message marqué comme non lu'), "success")
            setActiveWoId(null)
            setActiveWo(null)
            setMessages([])
            setSearchParams({}, { replace: true })
            loadChats()
            window.dispatchEvent(new CustomEvent('refresh-notifications'))
        } catch (err) {
            showToast(t('admin.error_marking_unread', 'Erreur lors du marquage du message'), "error")
        }
    }

    const [chatToToggle, setChatToToggle] = useState(null)

    const handleToggleChatStatus = (isClosed) => {
        setChatToToggle({ isClosed })
    }

    const executeToggleChatStatus = async () => {
        if (!chatToToggle) return
        const { isClosed } = chatToToggle

        const endpoint = isClosed ? `/admin/work-orders/${activeWoId}/chat/open` : `/admin/work-orders/${activeWoId}/chat/close`

        try {
            await api.post(endpoint)
            setActiveWo(prev => ({ ...prev, is_chat_closed: !isClosed }))
            setChats(prev => prev.map(c => c.work_order_id === activeWoId ? { ...c, is_chat_closed: !isClosed } : c))
            showToast(isClosed ? t('admin.chat_reopened', 'Chat rouvert') : t('admin.chat_closed', 'Chat fermé'), "success")
        } catch (err) {
            showToast(t('common.error', 'Erreur'), "error")
        } finally {
            setChatToToggle(null)
        }
    }

    const filteredChats = chats.filter(c =>
        (c.client_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.title.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="flex flex-col h-[calc(100dvh-160px)] md:h-[calc(100vh-104px)] bg-white dark:bg-[#1C1C1E] md:rounded-[20px] md:shadow-[0_1px_3px_rgba(15,23,42,0.04)] md:border border-slate-200/90 dark:border-white/10 overflow-hidden relative -mx-4 md:mx-0 -mb-24 md:mb-0">
            <div className="flex h-full min-h-0 w-full overflow-hidden">

                {/* LEFT SIDEBAR - CHATS LIST (Apple Tahoe Messages Sidebar) */}
                <div className={`w-full md:w-[380px] lg:w-[400px] flex-shrink-0 border-r border-slate-200/85 dark:border-white/10 bg-[#F9F9FB] dark:bg-[#161618] flex flex-col absolute md:relative inset-0 z-10 transition-transform duration-300 ${activeWoId ? '-translate-x-full md:translate-x-0 md:flex hidden' : 'translate-x-0 flex'}`}>

                    {/* Header Sidebar */}
                    <div className="h-[64px] px-5 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between bg-white dark:bg-[#1C1C1E] shrink-0">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <MessageSquare className="w-5 h-5 text-[color:var(--tenant-accent)] shrink-0" />
                            <h2 className="text-[18px] font-black text-slate-900 dark:text-white tracking-tight truncate">
                                {t('admin.client_messages', 'Messages Clients')}
                            </h2>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-extrabold bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Live
                            </span>
                        </div>
                        <span className="text-[12px] font-extrabold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/10 px-2.5 py-0.5 rounded-full tabular-nums">
                            {filteredChats.length}
                        </span>
                    </div>

                    {/* Search Bar — 42px Apple Tahoe Filter Pill */}
                    <div className="p-3 border-b border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-[#1C1C1E]/60 shrink-0">
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder={t('admin.search_quote_client', 'Rechercher un devis ou un client...')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-9 pl-9 pr-4 bg-[#F2F2F4] dark:bg-[#2C2C2E] border border-slate-200/90 dark:border-white/10 rounded-[10px] text-[13.5px] font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-[#1C1C1E] focus:border-[color:var(--tenant-accent)] outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Conversation List — Inset Rounded Selection Rows */}
                    <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
                        {loading ? (
                            <div className="p-8 text-center text-slate-500 flex flex-col items-center">
                                <div className="w-6 h-6 border-2 border-[color:var(--tenant-accent)] border-t-transparent rounded-full animate-spin mb-2"></div>
                                {t('common.loading', 'Chargement...')}
                            </div>
                        ) : filteredChats.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-sm">
                                {searchTerm ? t('common.no_results', 'Aucun résultat trouvé.') : t('admin.no_conversations', 'Aucune conversation pour le moment.')}
                            </div>
                        ) : (
                            filteredChats.map(chat => {
                                const isSelected = String(activeWo?.id || activeWoId) === String(chat.work_order_id)
                                const docNumber = chat.is_quote
                                    ? (chat.quote_number || t('common.quote', 'Devis'))
                                    : (chat.invoice_number || t('common.order', 'Commande'))
                                const displayClient = chat.client_name || chat.title || t('admin.client', 'Client')
                                return (
                                    <button
                                        key={chat.work_order_id}
                                        type="button"
                                        onClick={() => {
                                            setActiveWo({ ...chat, id: chat.work_order_id })
                                            setActiveWoId(chat.work_order_id)
                                            if (window.location.pathname === '/admin/chats') {
                                                setSearchParams({ wo_id: chat.work_order_id }, { replace: true })
                                            }
                                        }}
                                        className={`w-full text-left px-3 py-2.5 rounded-[14px] transition-all relative flex items-start gap-3 cursor-pointer ${
                                            isSelected
                                                ? 'bg-[color:var(--tenant-accent)] text-[color:var(--tenant-accent-fg)] shadow-xs'
                                                : 'hover:bg-white dark:hover:bg-[#242426] text-slate-900 dark:text-white'
                                        }`}
                                    >
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-base font-bold shadow-2xs ${
                                            isSelected
                                                ? 'bg-white/20 ring-1 ring-white/30'
                                                : getAvatarColor(chat.source_system)
                                        }`}>
                                            {getFlagEmoji(chat.client_language)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2 mb-0.5">
                                                <span className={`text-[14px] font-extrabold truncate ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                                                    {displayClient}
                                                </span>
                                                <span className={`text-[11.5px] font-semibold tabular-nums whitespace-nowrap shrink-0 ${isSelected ? 'text-white/85' : 'text-slate-400 dark:text-slate-500'}`}>
                                                    {new Date(chat.last_message_time).toLocaleDateString('ro-RO')}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[11px] font-extrabold tabular-nums tracking-tight ${
                                                    isSelected
                                                        ? 'bg-white/20 text-white'
                                                        : 'bg-slate-200/75 dark:bg-white/10 text-slate-700 dark:text-slate-300'
                                                }`}>
                                                    {docNumber}
                                                </span>
                                                {chat.title && chat.client_name && (
                                                    <span className={`text-[11.5px] font-medium truncate ${isSelected ? 'text-white/80' : 'text-slate-400 dark:text-slate-500'}`}>
                                                        {chat.title}
                                                    </span>
                                                )}
                                                {chat.is_chat_closed && (
                                                    <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded ml-auto shrink-0 ${
                                                        isSelected ? 'bg-white/20 text-white' : 'text-rose-600 bg-rose-50 dark:bg-rose-900/30'
                                                    }`}>
                                                        {t('admin.closed', 'Fermé')}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex justify-between items-center gap-2">
                                                <p className={`text-[12.5px] font-medium truncate flex-1 ${isSelected ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'}`}>
                                                    {chat.last_message || t('admin.no_text_message', 'Aucun message texte')}
                                                </p>
                                                {chat.unread_count > 0 && (
                                                    <span className={`text-[11px] font-black px-2 py-0.5 rounded-full tabular-nums shrink-0 ${
                                                        isSelected
                                                            ? 'bg-white text-[color:var(--tenant-accent)]'
                                                            : 'bg-[color:var(--tenant-accent)] text-[color:var(--tenant-accent-fg)]'
                                                    }`}>
                                                        {chat.unread_count}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                )
                            })
                        )}
                    </div>
                </div>

                {/* RIGHT SIDE - CHAT WINDOW (Full-Canvas Apple Tahoe Conversation View) */}
                <div className={`flex-1 flex flex-col bg-white dark:bg-[#1C1C1E] w-full absolute md:relative inset-0 z-20 transition-transform duration-300 ${!activeWo ? 'translate-x-full md:translate-x-0 md:flex hidden' : 'translate-x-0 flex'}`}>
                    {activeWo ? (
                        <>
                            {/* Chat Header — 64px Apple Tahoe Toolbar */}
                            <div className="h-[64px] px-5 border-b border-slate-200/85 dark:border-white/10 flex items-center justify-between bg-white dark:bg-[#1C1C1E] flex-shrink-0 gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <button
                                        type="button"
                                        onClick={() => setActiveWoId(null)}
                                        aria-label={t('common.back', 'Retour')}
                                        className="md:hidden p-2 -ml-2 text-slate-500 hover:text-slate-700"
                                    >
                                        <ArrowLeft className="w-5 h-5" />
                                    </button>
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-lg font-bold shadow-2xs ${getAvatarColor(activeWo.source_system)}`}>
                                        {getFlagEmoji(activeWo.client_language)}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-[15.5px] font-black text-slate-900 dark:text-white truncate tracking-tight">
                                                {activeWo.client_name || activeWo.title || t('admin.client', 'Client')}
                                            </h3>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[12px] font-extrabold bg-[color:var(--tenant-accent-subtle)] text-[color:var(--tenant-accent)] border border-[color:var(--tenant-accent-border)] tabular-nums shrink-0">
                                                {activeWo.is_quote 
                                                    ? (activeWo.quote_number || t('common.quote', 'Devis'))
                                                    : (activeWo.invoice_number || t('common.order', 'Commande'))}
                                            </span>
                                        </div>
                                        <p className="text-[12.5px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                                            {activeWo.title || t('common.quote', 'Devis')}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button 
                                        type="button"
                                        onClick={() => setPreviewAttachment({ 
                                            url: `/admin/quotes/${activeWo.id}/pdf`, 
                                            name: activeWo.is_quote ? (activeWo.quote_number || 'Devis / Offre') : (activeWo.invoice_number || 'Commande'),
                                            isPdf: true,
                                            isInternalUrl: true
                                        })}
                                        className="h-9 px-3.5 text-[13px] font-bold rounded-[10px] border bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50 dark:bg-[#2C2C2E] dark:border-white/10 dark:text-slate-200 dark:hover:bg-[#3A3A3C] transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                        title={t('nav.quotes', 'Devis / Offres')}
                                    >
                                        <FileText className="w-4 h-4 text-slate-500 dark:text-slate-300" />
                                        <span className="hidden lg:inline">{t('nav.quotes', 'Devis / Offres')}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => navigate(`/admin/work-orders/${activeWo.id}`)}
                                        className="h-9 px-3.5 text-[13px] font-bold rounded-[10px] border bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50 dark:bg-[#2C2C2E] dark:border-white/10 dark:text-slate-200 dark:hover:bg-[#3A3A3C] transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                        title={t('nav.work_orders', 'Commandes')}
                                    >
                                        <ClipboardList className="w-4 h-4 text-slate-500 dark:text-slate-300" />
                                        <span className="hidden lg:inline">{t('nav.work_orders', 'Commandes')}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleToggleChatStatus(activeWo.is_chat_closed)}
                                        className={`h-9 px-3.5 text-[13px] font-bold rounded-[10px] transition-colors inline-flex items-center gap-1.5 border cursor-pointer shadow-2xs ${
                                            activeWo.is_chat_closed 
                                                ? 'bg-white text-slate-700 border-slate-200/90 hover:bg-slate-50 dark:bg-[#2C2C2E] dark:text-slate-200 dark:border-white/10' 
                                                : 'bg-rose-500/10 text-rose-700 border-rose-500/25 hover:bg-rose-500/15 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800'
                                        }`}
                                    >
                                        {activeWo.is_chat_closed ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                        <span className="hidden sm:inline">{activeWo.is_chat_closed ? t('admin.open_chat', 'Ouvrir Chat') : t('admin.close_chat', 'Fermer Chat')}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Messages Area — Full Width Apple Messages Canvas (no max-w-3xl mx-auto) */}
                            <div className="flex-1 overflow-y-auto px-5 py-5 bg-[#F2F2F4]/70 dark:bg-[#0C0C0E] pb-20">
                                {loadingMessages ? (
                                    <div className="h-full flex items-center justify-center">
                                        <div className="w-6 h-6 border-2 border-[color:var(--tenant-accent)] border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                ) : !messages || messages.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-slate-400 text-[14px] font-medium">
                                        {t('admin.no_messages_in_chat', 'Il n\'y a aucun message dans cette conversation.')}
                                    </div>
                                ) : (
                                    <div className="space-y-3.5 w-full">
                                        {(messages || []).filter(msg => msg.message !== '[reaction]').map(msg => {
                                            const isSystem = msg.sender === 'system' || msg.is_hidden;
                                            const isOwn = !isSystem && msg.sender !== 'client';
                                            return (
                                            <div key={msg.id} className="group relative w-full">
                                                <div className={`w-fit min-w-[160px] max-w-[82%] lg:max-w-[68%] px-4 py-3 relative ${
                                                    isOwn && !isSystem
                                                        ? 'bg-[color:var(--tenant-accent)] text-[color:var(--tenant-accent-fg)] rounded-[20px] rounded-br-[6px] ml-auto shadow-xs'
                                                        : isSystem
                                                            ? 'bg-white/90 dark:bg-[#1C1C1E] text-slate-600 dark:text-slate-300 rounded-[14px] text-[12.5px] border border-slate-200/85 dark:border-white/10 mx-auto shadow-2xs max-w-[540px]'
                                                            : 'bg-white dark:bg-[#2C2C2E] border border-slate-200/90 dark:border-white/10 text-slate-900 dark:text-white rounded-[20px] rounded-bl-[6px] mr-auto shadow-xs'
                                                }`}>
                                                    {editingMessageId === msg.id ? (
                                                        <div className="flex flex-col gap-2">
                                                            <textarea 
                                                                value={editMessageText}
                                                                onChange={(e) => setEditMessageText(e.target.value)}
                                                                className="w-full text-sm text-slate-900 bg-white rounded-[10px] p-2 border-none outline-none"
                                                                rows={2}
                                                            />
                                                            <div className="flex justify-end gap-2 mt-1">
                                                                <button type="button" onClick={() => setEditingMessageId(null)} className="text-[11px] uppercase font-bold opacity-80 hover:opacity-100 transition-opacity">{t('common.cancel', 'Annuler')}</button>
                                                                <button type="button" onClick={() => handleEditMessage(msg.id)} className="text-[11px] uppercase font-bold bg-white text-slate-900 px-2.5 py-1 rounded-md hover:bg-slate-100 transition-colors">{t('common.save', 'Enregistrer')}</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="flex items-center gap-3 mb-1.5 justify-between">
                                                                <span className={`text-[12px] font-bold flex items-center gap-1.5 ${isOwn ? 'text-white/95' : isSystem ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                                                                    {msg.sender === 'client' ? (
                                                                        <span className="w-5 h-5 rounded-full bg-[color:var(--tenant-accent-subtle)] text-[color:var(--tenant-accent)] hidden md:flex items-center justify-center font-extrabold text-[10.5px] shrink-0">
                                                                            {(activeWo.client_name || '?').charAt(0).toUpperCase()}
                                                                        </span>
                                                                    ) : msg.sender === 'admin' ? (
                                                                        tenant?.favicon_url ? (
                                                                            <img src={getImageUrl(tenant.favicon_url)} alt={tenant?.name || "Company"} className="w-5 h-5 rounded-full object-contain bg-white p-[2px] shrink-0 hidden md:block" />
                                                                        ) : (
                                                                            <span className="w-5 h-5 rounded-full bg-white/20 text-white hidden md:flex items-center justify-center font-extrabold text-[10px] shrink-0">
                                                                                {(tenant?.name || 'DC').substring(0, 2).toUpperCase()}
                                                                            </span>
                                                                        )
                                                                    ) : null}
                                                                    <span className="truncate max-w-[240px] md:max-w-[340px] font-extrabold">
                                                                        {msg.sender === 'client' ? activeWo.client_name : (msg.sender === 'admin' ? (msg.sender_name || (activeWo.client_language === 'nl' || activeWo.client_language === 'en' ? 'Team Davide Chape' : 'Equipe Davide Chape')) : t('admin.system', 'Sistem'))}
                                                                    </span>
                                                                </span>
                                                                <div className="flex items-center gap-1 shrink-0 tabular-nums">
                                                                    <span className={`text-[11px] font-semibold ${isOwn ? 'text-white/80' : 'text-slate-400 dark:text-slate-500'}`}>
                                                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                    {isOwn && (
                                                                        <span className="inline-flex items-center" title={
                                                                            (msg.delivery_channel || msg.translations?._delivery_channel) === 'email'
                                                                                ? "Transmis pe Email (clientul nu are WhatsApp)"
                                                                                : (msg.delivery_status || msg.translations?._delivery_status) === 'read'
                                                                                ? "Citit de client pe WhatsApp"
                                                                                : (msg.delivery_status || msg.translations?._delivery_status) === 'delivered'
                                                                                ? "Livrat pe WhatsApp"
                                                                                : "Trimis via WhatsApp"
                                                                        }>
                                                                            {(msg.delivery_channel || msg.translations?._delivery_channel) === 'email' ? (
                                                                                <Mail className="w-3.5 h-3.5 text-amber-200 transition-colors" />
                                                                            ) : (msg.delivery_status || msg.translations?._delivery_status) === 'read' ? (
                                                                                <CheckCheck className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                                                                            ) : (msg.delivery_status || msg.translations?._delivery_status) === 'delivered' ? (
                                                                                <CheckCheck className="w-3.5 h-3.5 text-white/75 stroke-[2]" />
                                                                            ) : (
                                                                                <Check className="w-3.5 h-3.5 text-white/75 stroke-[2]" />
                                                                            )}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {msg.attachments && msg.attachments.length > 0 && (
                                                                <div className="mb-2 flex flex-col gap-2">
                                                                    {msg.attachments.map((att, idx) => {
                                                                        const isPdf = att.type === 'pdf' || (att.url && att.url.toLowerCase().endsWith('.pdf'));
                                                                        const isImage = att.type === 'image' || (att.url && att.url.match(/\.(jpeg|jpg|gif|png|webp)$/i));
                                                                        
                                                                        if (isImage || isPdf) {
                                                                            return (
                                                                                <button 
                                                                                    type="button"
                                                                                    key={idx} 
                                                                                    onClick={() => setPreviewAttachment({ ...att, isPdf, isImage })}
                                                                                    className={`flex flex-col text-left rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 hover:ring-2 hover:ring-[color:var(--tenant-accent)] transition-all shadow-sm ${isImage || isPdf ? 'p-0 w-[200px] sm:w-[240px] bg-white dark:bg-slate-800' : 'p-2.5 bg-white dark:bg-slate-800'}`}
                                                                                >
                                                                                    {isImage ? (
                                                                                        <img src={getImageUrl(att.url)} alt="attachment" className="w-full object-cover" />
                                                                                    ) : isPdf ? (
                                                                                        <div className="flex flex-col w-full h-full">
                                                                                            <div className="w-full h-[140px] bg-white relative">
                                                                                                <PdfThumbnail url={getImageUrl(att.url)} className="w-full h-full" />
                                                                                            </div>
                                                                                            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 flex items-center gap-3 border-t border-slate-200 dark:border-slate-700/50">
                                                                                                <div className="bg-red-500 text-white rounded w-8 h-9 flex items-center justify-center flex-shrink-0 shadow-sm relative overflow-hidden">
                                                                                                    <span className="text-[10px] font-bold mt-1.5">PDF</span>
                                                                                                    <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-600 rounded-bl shadow-sm"></div>
                                                                                                </div>
                                                                                                <div className="flex flex-col flex-1 min-w-0">
                                                                                                    <span className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{att.name || 'Document'}</span>
                                                                                                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Document PDF</span>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                        ) : (
                                                                                            <div className="flex items-center gap-2 p-2.5">
                                                                                                <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                                                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate max-w-[150px]">{att.name || 'Document'}</span>
                                                                                            </div>
                                                                                        )}
                                                                                    </button>
                                                                                )
                                                                            }
                                                                            return (
                                                                                <a key={idx} href={getImageUrl(att.url)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm w-fit">
                                                                                    <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                                                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate max-w-[150px]">{att.name || 'File'}</span>
                                                                                </a>
                                                                            )
                                                                        })}
                                                                    </div>
                                                                )}
                                                            {msg.message && (
                                                                <div className={`text-[14px] whitespace-pre-wrap leading-relaxed font-medium ${msg.is_hidden ? 'opacity-70' : ''}`}>
                                                                    {msg.message}
                                                                </div>
                                                            )}
                                                            
                                                            {/* Translation Display */}
                                                            {msg.message && msg.translations && Object.keys(msg.translations).length > 0 && (
                                                                (() => {
                                                                    if (msg.sender === 'client' || msg.sender === 'partner') {
                                                                        const roText = msg.translations.ro;
                                                                        if (!roText || !roText.trim() || roText.includes('Error 500') || roText.includes('Eroare la traducere') || roText.includes("That's an error")) return null;
                                                                        if (roText.trim().toLowerCase() === (msg.message || '').trim().toLowerCase()) return null;
                                                                        return (
                                                                            <div className="mt-2 pt-2 border-t border-slate-200/80 dark:border-white/10 text-[12.5px] italic text-slate-500 dark:text-slate-400">
                                                                                <span className="font-bold not-italic block mb-0.5">{t('chat.translation', 'Traduction')} (RO):</span>
                                                                                {roText}
                                                                            </div>
                                                                        );
                                                                    }

                                                                    const transEntries = Object.entries(msg.translations).filter(([k]) => !k.startsWith('_'));
                                                                    if (transEntries.length === 0) return null;
                                                                    if (msg.translations._target_lang === 'none') return null;

                                                                    const displayLang = msg.translations._target_lang || (targetLang !== 'none' ? targetLang : (activeWo?.client_language || 'fr').toLowerCase());
                                                                    const transText = msg.translations[displayLang] || msg.translations['fr'] || transEntries[0][1] || '';
                                                                    if (!transText.trim() || transText.includes('Error 500') || transText.includes('Eroare la traducere') || transText.includes("That's an error")) return null;
                                                                    if (transText.trim().toLowerCase() === (msg.message || '').trim().toLowerCase()) return null;
                                                                    return (
                                                                        <div className={`mt-2 pt-2 border-t text-[12.5px] italic ${isOwn ? 'border-white/20 text-white/90' : 'border-slate-200/80 dark:border-white/10 text-slate-500 dark:text-slate-400'}`}>
                                                                            <span className="font-bold not-italic block mb-0.5">{t('chat.translation', 'Traduction')} ({displayLang.toUpperCase()}):</span>
                                                                            {transText}
                                                                        </div>
                                                                    );
                                                                })()
                                                            )}
                                                        </>
                                                    )}
                                                    
                                                    {msg.sender !== 'system' && (
                                                        <span className={`text-[10.5px] mt-1 block ${isOwn && !msg.is_hidden ? 'text-white/75' : 'text-slate-400'}`}>
                                                            {msg.is_hidden && ` • ${t('admin.hidden_from_client', 'Masqué au client')}`}
                                                        </span>
                                                    )}
                                                
                                                {/* Render Emojis */}
                                                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                                    <div className={`absolute -bottom-3 ${isOwn ? 'right-2' : 'left-2'} flex gap-1 bg-white dark:bg-slate-800 rounded-full shadow-sm px-1.5 py-0.5 text-xs z-10 border border-slate-100 dark:border-slate-700`}>
                                                        {Object.entries(msg.reactions).map(([emoji, users]) => (
                                                            <button 
                                                                type="button"
                                                                key={emoji} 
                                                                onClick={() => handleToggleReaction(msg.id, emoji)}
                                                                className={`hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full px-1 ${users.includes('admin') ? 'bg-[color:var(--tenant-accent-subtle)]' : ''}`}
                                                                title={users.join(', ')}
                                                            >
                                                                {emoji} <span className="text-[10px] text-slate-500">{users.length > 1 ? users.length : ''}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                                
                                                {/* Reaction Picker Popover */}
                                                {showEmojiPickerFor === msg.id && (
                                                    <div className={`absolute -top-10 ${isOwn ? 'right-0' : 'left-0'} flex gap-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-1 z-20`}>
                                                        {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(em => (
                                                            <button 
                                                                type="button"
                                                                key={em} 
                                                                onClick={() => handleToggleReaction(msg.id, em)}
                                                                className="hover:bg-slate-100 dark:hover:bg-slate-700 rounded p-1 text-base transition-transform hover:scale-110"
                                                            >
                                                                {em}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Hover actions */}
                                            <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isOwn ? 'flex-row-reverse' : ''} ${msg.reactions && Object.keys(msg.reactions).length > 0 ? 'mt-3.5' : 'mt-0.5'}`}>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowEmojiPickerFor(showEmojiPickerFor === msg.id ? null : msg.id)}
                                                    className="p-1.5 rounded-full text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                                                    title={t('admin.react', 'Réagir')}
                                                >
                                                    <Smile className="w-3.5 h-3.5" />
                                                </button>
                                                
                                                {!isSystem && isOwn && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggleVisibility(msg.id)}
                                                            className="p-1.5 rounded-full text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                                                            title={msg.is_hidden ? t('admin.show_to_client', 'Afficher au client') : t('admin.hide_from_client', 'Masquer au client')}
                                                        >
                                                            {msg.is_hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setEditingMessageId(msg.id);
                                                                setEditMessageText(msg.message);
                                                            }}
                                                            className="p-1.5 rounded-full text-slate-400 hover:text-[color:var(--tenant-accent)] hover:bg-slate-100 dark:hover:bg-slate-700"
                                                            title={t('admin.edit_message', 'Éditer le message')}
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteMessage(msg.id)}
                                                            className="p-1.5 rounded-full text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                                                            title={t('admin.delete_message', 'Supprimer le message')}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </>
                                                )}
                                                {!isSystem && !isOwn && (
                                                     <button
                                                        type="button"
                                                        onClick={() => handleMarkUnread(msg.id)}
                                                        className="p-1.5 rounded-full text-slate-400 hover:text-[color:var(--tenant-accent)] hover:bg-slate-100 dark:hover:bg-slate-700"
                                                        title={t('admin.mark_unread', 'Marquer comme non lu')}
                                                    >
                                                        <Mail className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                            </div>
                                        )})}
                                        <div ref={messagesEndRef} />
                                    </div>
                                )}
                            </div>

                            {/* Input Area — Full-Width Apple Tahoe Composer Bar */}
                            <div className="px-5 py-3.5 bg-white dark:bg-[#1C1C1E] border-t border-slate-200/85 dark:border-white/10 flex-shrink-0 pb-[calc(env(safe-area-inset-bottom,0px)+80px)] md:pb-3.5">
                                {activeWo.is_chat_closed ? (
                                    <div className="text-center p-2.5 bg-[#F2F2F4] dark:bg-[#2C2C2E] rounded-[12px] text-slate-500 text-[13.5px] font-semibold flex items-center justify-center gap-2">
                                        <Clock className="w-4 h-4" />
                                        {t('admin.chat_is_closed_cannot_send', 'Cette conversation est fermée. Vous ne pouvez plus envoyer de messages.')}
                                    </div>
                                ) : (
                                    <form onSubmit={handleSendMessage} className="w-full flex flex-col gap-2">

                                        {selectedFiles.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mb-1 p-2 bg-[#F2F2F4] dark:bg-[#2C2C2E] rounded-[12px] border border-slate-200/85 dark:border-white/10">
                                                {selectedFiles.map((f, i) => (
                                                    <div key={i} className="flex items-center gap-2 bg-white dark:bg-[#1C1C1E] px-2.5 py-1 rounded-lg shadow-2xs text-xs font-semibold border border-slate-200/80 dark:border-white/10">
                                                        <span className="truncate max-w-[160px] text-slate-700 dark:text-slate-300">{f.name}</span>
                                                        <button type="button" onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-full p-0.5">
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="flex gap-2.5 w-full items-center">
                                            <input
                                                type="file"
                                                multiple
                                                className="hidden"
                                                ref={fileInputRef}
                                                accept="image/*,application/pdf"
                                                onChange={e => {
                                                    if (e.target.files) {
                                                        setSelectedFiles(prev => [...prev, ...Array.from(e.target.files)])
                                                    }
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                aria-label={t('chat.add_attachment', 'Ajouter une pièce jointe')}
                                                className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-[color:var(--tenant-accent)] bg-[#F2F2F4] hover:bg-slate-200/70 dark:bg-[#2C2C2E] dark:hover:bg-[#3A3A3C] rounded-[12px] transition-colors shrink-0 cursor-pointer"
                                                title={t('chat.add_attachment', 'Ajouter une pièce jointe')}
                                            >
                                                <Paperclip className="w-4 h-4" />
                                            </button>

                                            <input
                                                type="text"
                                                value={chatMessage}
                                                onChange={e => setChatMessage(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                                                placeholder={t('admin.type_message', 'Tapez votre message...')}
                                                className="flex-1 min-w-[100px] h-10 bg-[#F2F2F4] dark:bg-[#2C2C2E] border border-slate-200/90 dark:border-white/10 rounded-[12px] px-4 text-[14px] font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-[#1C1C1E] focus:outline-none focus:border-[color:var(--tenant-accent)] transition-all"
                                            />
                                            <select
                                                value={targetLang}
                                                onChange={e => setTargetLang(e.target.value)}
                                                aria-label={t('chat.select_language', 'Langue de traduction')}
                                                className="h-10 bg-[#F2F2F4] dark:bg-[#2C2C2E] border border-slate-200/90 dark:border-white/10 rounded-[12px] px-3 text-[13px] font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-[color:var(--tenant-accent)] cursor-pointer shrink-0"
                                                title={t('chat.select_language', 'Langue de traduction')}
                                            >
                                                <option value="none">{t('chat.no_translation', 'Sans trad.')}</option>
                                                <option value="fr">FR (Français)</option>
                                                <option value="en">EN (English)</option>
                                                <option value="nl">NL (Nederlands)</option>
                                            </select>
                                            <button
                                                type="submit"
                                                aria-label={t('common.send', 'Envoyer')}
                                                disabled={(!chatMessage.trim() && selectedFiles.length === 0) || isSending || isUploading}
                                                className="h-10 px-4 bg-[color:var(--tenant-accent)] hover:bg-[color:var(--tenant-accent-hover)] disabled:opacity-45 text-[color:var(--tenant-accent-fg)] rounded-[12px] flex items-center justify-center transition-all shadow-xs cursor-pointer shrink-0"
                                            >
                                                {isSending || isUploading ? (
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                ) : (
                                                    <Send className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
                            <MessageSquare className="w-16 h-16 mb-4 text-slate-200 dark:text-slate-800" />
                            <h3 className="text-lg font-medium text-slate-600 dark:text-slate-300">{t('admin.no_chat_selected', 'Aucun chat sélectionné')}</h3>
                            <p className="text-sm mt-1 text-center max-w-sm">{t('admin.select_chat_to_view', 'Sélectionnez une conversation à gauche pour voir les messages ou poursuivre la discussion avec le client.')}</p>
                        </div>
                    )}
                </div>

            </div>
            {/* Delete Confirmation Modal — Apple HIG Alert */}
            {messageToDelete && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setMessageToDelete(null)}>
                    <div className="relative w-full max-w-[360px] rounded-[24px] bg-[#F2F4F8] dark:bg-slate-900 text-slate-900 dark:text-white backdrop-blur-3xl saturate-150 border-[1.5px] border-slate-300/95 dark:border-slate-600/85 ring-1 ring-slate-900/10 dark:ring-white/10 shadow-[0_28px_64px_-12px_rgba(15,23,42,0.38),0_8px_24px_-4px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.95)] p-3.5 overflow-hidden text-center" onClick={e => e.stopPropagation()}>
                        <div className="rounded-[16px] bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/85 shadow-[0_1px_2px_rgba(15,23,42,0.05)] p-5 flex flex-col items-center">
                            <div className="w-12 h-12 rounded-full bg-rose-500/15 dark:bg-rose-500/20 border border-rose-500/25 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center mb-3.5">
                                <Trash2 className="w-6 h-6" />
                            </div>
                            <h3 className="text-[17px] font-bold tracking-tight text-slate-900 dark:text-white leading-snug">
                                {t('admin.confirm_delete_message', 'Voulez-vous vraiment supprimer ce message ?')}
                            </h3>
                            <p className="text-[13.5px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                                {t('admin.action_cannot_be_undone', 'Cette action ne peut pas être annulée.')}
                            </p>
                        </div>
                        <div className="flex items-center gap-2.5 w-full mt-3">
                            <button
                                type="button"
                                onClick={() => setMessageToDelete(null)}
                                className="flex-1 h-10 px-4 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300/90 dark:border-slate-600/80 rounded-[14px] text-[13.5px] font-semibold transition-all cursor-pointer"
                            >
                                {t('common.cancel', 'Annuler')}
                            </button>
                            <button
                                type="button"
                                onClick={executeDeleteMessage}
                                className="flex-1 h-10 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-[14px] text-[13.5px] font-semibold transition-all shadow-sm shadow-rose-600/20 cursor-pointer"
                            >
                                {t('common.delete', 'Supprimer')}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Toggle Chat Status Confirmation Modal — Apple HIG Alert */}
            {chatToToggle && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setChatToToggle(null)}>
                    <div className="relative w-full max-w-[360px] rounded-[24px] bg-[#F2F4F8] dark:bg-slate-900 text-slate-900 dark:text-white backdrop-blur-3xl saturate-150 border-[1.5px] border-slate-300/95 dark:border-slate-600/85 ring-1 ring-slate-900/10 dark:ring-white/10 shadow-[0_28px_64px_-12px_rgba(15,23,42,0.38),0_8px_24px_-4px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.95)] p-3.5 overflow-hidden text-center" onClick={e => e.stopPropagation()}>
                        <div className="rounded-[16px] bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/85 shadow-[0_1px_2px_rgba(15,23,42,0.05)] p-5 flex flex-col items-center">
                            <div className="w-12 h-12 rounded-full bg-amber-500/15 dark:bg-amber-500/20 border border-amber-500/25 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center mb-3.5">
                                <Clock className="w-6 h-6" />
                            </div>
                            <h3 className="text-[17px] font-bold tracking-tight text-slate-900 dark:text-white leading-snug">
                                {chatToToggle.isClosed ? t('admin.confirm_reopen_chat', 'Rouvrir ce chat ?') : t('admin.confirm_close_chat', 'Fermer ce chat ?')}
                            </h3>
                            <p className="text-[13.5px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                                {chatToToggle.isClosed
                                    ? t('admin.reopen_chat_desc', 'Le client pourra à nouveau envoyer des messages.')
                                    : t('admin.close_chat_desc', 'Le client ne pourra plus envoyer de messages.')}
                            </p>
                        </div>
                        <div className="flex items-center gap-2.5 w-full mt-3">
                            <button
                                type="button"
                                onClick={() => setChatToToggle(null)}
                                className="flex-1 h-10 px-4 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300/90 dark:border-slate-600/80 rounded-[14px] text-[13.5px] font-semibold transition-all cursor-pointer"
                            >
                                {t('common.cancel', 'Annuler')}
                            </button>
                            <button
                                type="button"
                                onClick={executeToggleChatStatus}
                                className="flex-1 h-10 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-[14px] text-[13.5px] font-semibold transition-all shadow-sm shadow-amber-500/20 cursor-pointer"
                            >
                                {t('common.confirm', 'Confirmer')}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Attachment Preview Modal */}
            {previewAttachment && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-8">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setPreviewAttachment(null)}></div>
                    <div className="relative w-full max-w-5xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden">

                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
                            <div className="flex items-center gap-3 truncate pr-4">
                                <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
                                <h3 className="font-semibold text-slate-800 dark:text-white truncate">
                                    {previewAttachment.name || 'Previzualizare Fișier'}
                                </h3>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                                {!previewAttachment.isInternalUrl && (
                                    <a
                                        href={getImageUrl(previewAttachment.url)}
                                        download
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-xl transition-colors flex items-center gap-2 font-medium text-sm"
                                        title="Descarcă Fișier"
                                    >
                                        <Download className="w-4 h-4" />
                                        <span className="hidden sm:inline">Descarcă</span>
                                    </a>
                                )}
                                <button
                                    onClick={() => setPreviewAttachment(null)}
                                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-auto flex items-center justify-center bg-slate-100 dark:bg-black/50 p-4">
                            {previewAttachment.isImage ? (
                                <img
                                    src={getImageUrl(previewAttachment.url)}
                                    alt={previewAttachment.name}
                                    className="max-w-full max-h-[70vh] object-contain rounded shadow-sm"
                                />
                            ) : previewAttachment.isPdf ? (
                                <iframe
                                    src={previewAttachment.isInternalUrl ? previewAttachment.url : getImageUrl(previewAttachment.url)}
                                    title="PDF Preview"
                                    className="w-full h-[70vh] rounded shadow-sm bg-white"
                                />
                            ) : (
                                <div className="text-center p-8 text-slate-500">
                                    Format nesuportat pentru previzualizare directă.
                                </div>
                            )}
                        </div>

                    </div>
                </div>,
                document.body
            )}

        </div>
    )
}

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

export default function AdminChats() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const showToast = useUIStore(s => s.showToast)
    const tenant = useTenantStore(s => s.tenant)
    
    const [chats, setChats] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    
    // Active chat state
    const [activeWoId, setActiveWoId] = useState(searchParams.get('wo_id') || null)
    const [activeWo, setActiveWo] = useState(null)
    const [messages, setMessages] = useState([])
    const [chatMessage, setChatMessage] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [loadingMessages, setLoadingMessages] = useState(false)
    const [editingMessageId, setEditingMessageId] = useState(null)
    const [editMessageText, setEditMessageText] = useState('')
    const [targetLang, setTargetLang] = useState('nl') // Default auto-translate to Dutch
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

    // Load list of chats
    // Load list of chats
    const loadChats = async (isBackground = false) => {
        try {
            const res = await api.get('/admin/chats')
            setChats(res.data)
        } catch (err) {
            console.error(err)
            if (!isBackground) {
                showToast(t('admin.error_loading_chats', 'Erreur lors du chargement des conversations'), "error")
            }
        } finally {
            if (!isBackground) setLoading(false)
        }
    }

    useEffect(() => {
        loadChats()
        // Keep left sidebar updated in real time (every 3 seconds)
        const chatListInterval = setInterval(() => {
            loadChats(true)
        }, 3000)

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

    // Load specific chat messages
    useEffect(() => {
        if (!activeWoId) return
        
        const loadChatDetails = async (isBackground = false) => {
            if (!isBackground) setLoadingMessages(true)
            try {
                if (!isBackground) {
                    // Initial load: fetch both WO details and messages
                    const [woRes, msgRes] = await Promise.all([
                        api.get(`/admin/work-orders/${activeWoId}`),
                        api.get(`/admin/work-orders/${activeWoId}/messages`)
                    ])
                    setActiveWo(woRes.data)
                    
                    let msgs = [];
                    if (Array.isArray(msgRes.data)) {
                        msgs = msgRes.data;
                    } else if (msgRes.data && Array.isArray(msgRes.data.data)) {
                        msgs = msgRes.data.data;
                    } else if (msgRes.data && Array.isArray(msgRes.data.messages)) {
                        msgs = msgRes.data.messages;
                    }
                    setMessages(msgs)
                    setSearchParams({ wo_id: activeWoId }, { replace: true })
                    window.dispatchEvent(new CustomEvent('refresh-notifications'))
                    loadChats(true)
                } else {
                    // Background poll: fetch only messages to avoid heavy load
                    const msgRes = await api.get(`/admin/work-orders/${activeWoId}/messages`)
                    let msgs = [];
                    if (Array.isArray(msgRes.data)) {
                        msgs = msgRes.data;
                    } else if (msgRes.data && Array.isArray(msgRes.data.data)) {
                        msgs = msgRes.data.data;
                    } else if (msgRes.data && Array.isArray(msgRes.data.messages)) {
                        msgs = msgRes.data.messages;
                    }
                    setMessages(prev => {
                        if (JSON.stringify(prev) !== JSON.stringify(msgs)) {
                            loadChats(true) // update snippet in sidebar if new message
                            return msgs;
                        }
                        return prev;
                    })
                }
            } catch (err) {
                if (!isBackground) {
                    console.error(err)
                    showToast(t('admin.error_loading_messages', 'Erreur lors du chargement des messages'), "error")
                }
            } finally {
                if (!isBackground) setLoadingMessages(false)
            }
        }
        
        loadChatDetails()
        
        // Auto-refresh chat every 2 seconds so incoming messages appear near-instantly
        const interval = setInterval(() => {
            if (activeWoId) {
                loadChatDetails(true)
            }
        }, 2000)

        const handleFocusOrVisible = () => {
            if (document.visibilityState === 'visible' && activeWoId) {
                loadChatDetails(true)
            }
        }
        window.addEventListener('focus', handleFocusOrVisible)
        document.addEventListener('visibilitychange', handleFocusOrVisible)
        
        return () => {
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
            setTargetLang(activeWo.client_language.toLowerCase());
        }
    }, [activeWo])

    const [previewTranslation, setPreviewTranslation] = useState('')
    const [isTranslating, setIsTranslating] = useState(false)

    const handleTranslatePreview = async () => {
        if (!chatMessage.trim() || targetLang === 'none') return;
        setIsTranslating(true);
        try {
            const res = await api.post('/admin/translate', {
                text: chatMessage,
                target_lang: (targetLang || 'nl').toLowerCase()
            });
            setPreviewTranslation(res.data.translatedText);
        } catch (e) {
            console.error("Translation error", e);
            showToast(t('common.error', 'Erreur') + ': ' + (e.response?.data?.detail || e.message), "error");
        } finally {
            setIsTranslating(false);
        }
    }

    const handleSendMessage = async (e) => {
        e.preventDefault()
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
            showToast("Eroare la încărcarea fișierului: " + (err.response?.data?.detail || err.message), "error")
            setIsUploading(false)
            return
        }
        setIsUploading(false)

        setIsSending(true)
        try {
            const payload = {
                message: chatMessage,
                target_lang: targetLang === 'none' ? null : targetLang,
                attachments: uploadedAttachments
            };
            if (previewTranslation.trim()) {
                payload.translations = { [targetLang]: previewTranslation };
            }
            
            const res = await api.post(`/admin/work-orders/${activeWoId}/messages`, payload)
            
            setMessages(prev => [...prev, res.data])
            setChatMessage('')
            setPreviewTranslation('')
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
                 setActiveWo(prev => ({...prev, is_chat_closed: true}))
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
            setActiveWo(prev => ({...prev, is_chat_closed: !isClosed}))
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
        <div className="flex flex-col h-[calc(100dvh-160px)] md:h-[calc(100vh-112px)] bg-white dark:bg-slate-900 md:rounded-xl md:shadow-sm md:border border-slate-200 dark:border-slate-800 overflow-hidden relative -mx-4 md:mx-0 -mb-24 md:mb-0">
            <div className="flex h-full min-h-0 w-full overflow-hidden">
                
                {/* LEFT SIDEBAR - CHATS LIST */}
                <div className={`w-full md:w-96 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col absolute md:relative inset-0 z-10 transition-transform duration-300 ${activeWoId ? '-translate-x-full md:translate-x-0 md:flex hidden' : 'translate-x-0 flex'}`}>
                    
                    {/* Header Sidebar */}
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-blue-500" />
                            {t('admin.client_messages', 'Messages Clients')}
                        </h2>
                    </div>
                    
                    {/* Search */}
                    <div className="p-3 border-b border-slate-200 dark:border-slate-800">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder={t('admin.search_quote_client', 'Rechercher un devis ou un client...')}
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
                                {t('common.loading', 'Chargement...')}
                            </div>
                        ) : filteredChats.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-sm">
                                {searchTerm ? t('common.no_results', 'Aucun résultat trouvé.') : t('admin.no_conversations', 'Aucune conversation pour le moment.')}
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredChats.map(chat => (
                                    <button
                                        key={chat.work_order_id}
                                        onClick={() => setActiveWoId(chat.work_order_id)}
                                        className={`w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors relative flex items-start gap-3 ${activeWoId === chat.work_order_id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                                    >
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-xl font-medium shadow-sm ${getAvatarColor(chat.source_system)}`}>
                                        {getFlagEmoji(chat.client_language)}
                                    </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <h3 className="font-medium text-slate-900 dark:text-white truncate pr-2">
                                                    {chat.client_name ? `${chat.client_name} - ` : ''}
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
                                                    {chat.last_message || t('admin.no_text_message', 'Aucun message texte')}
                                                </p>
                                                {chat.unread_count > 0 && (
                                                    <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                        {chat.unread_count}
                                                    </span>
                                                )}
                                            </div>
                                            {chat.is_chat_closed && (
                                                <div className="mt-1 flex items-center gap-2">
                                                    <span className="text-[10px] font-medium text-red-500 bg-red-50 dark:bg-red-900/30 px-1.5 py-0.5 rounded">
                                                        {t('admin.closed', 'Fermé')}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                
                {/* RIGHT SIDE - CHAT WINDOW */}
                <div className={`flex-1 flex flex-col bg-white dark:bg-slate-900 w-full absolute md:relative inset-0 z-20 transition-transform duration-300 ${!activeWoId ? 'translate-x-full md:translate-x-0 md:flex hidden' : 'translate-x-0 flex'}`}>
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
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-xl font-medium ${getAvatarColor(activeWo.source_system)}`}>
                                        {getFlagEmoji(activeWo.client_language)}
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
                                        onClick={() => setPreviewAttachment({ 
                                            url: `/admin/quotes/${activeWo.id}/pdf`, 
                                            name: activeWo.is_quote ? (activeWo.quote_number || 'Devis / Offre') : (activeWo.invoice_number || 'Commande'),
                                            isPdf: true,
                                            isInternalUrl: true
                                        })}
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
                                        onClick={() => handleToggleChatStatus(activeWo.is_chat_closed)}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 border
                                            ${activeWo.is_chat_closed 
                                                ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700' 
                                                : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'}`}
                                    >
                                        {activeWo.is_chat_closed ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                        <span className="hidden sm:inline">{activeWo.is_chat_closed ? t('admin.open_chat', 'Ouvrir Chat') : t('admin.close_chat', 'Fermer Chat')}</span>
                                    </button>
                                </div>
                            </div>
                            
                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900/50 pb-24">
                                {loadingMessages ? (
                                    <div className="h-full flex items-center justify-center">
                                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                ) : !messages || messages.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-slate-400">
                                        {t('admin.no_messages_in_chat', 'Il n\'y a aucun message dans cette conversation.')}
                                    </div>
                                ) : (
                                    <div className="space-y-4 md:max-w-3xl md:mx-auto w-full">
                                        {(messages || []).filter(msg => msg.message !== '[reaction]').map(msg => {
                                            const isSystem = msg.sender === 'system' || msg.is_hidden;
                                            const isOwn = !isSystem && msg.sender !== 'client';
                                            return (
                                            <div key={msg.id} className="group relative">
                                                <div className={`w-fit min-w-[140px] max-w-[85%] md:max-w-[75%] rounded-2xl p-3 shadow-sm relative ${isOwn && !isSystem ? 'bg-blue-600 text-white rounded-tr-sm ml-auto' : isSystem ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg text-xs italic text-center border border-slate-200 dark:border-slate-700 mx-auto' : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-white rounded-tl-sm mr-auto'}`}>
                                                    {editingMessageId === msg.id ? (
                                                        <div className="flex flex-col gap-2">
                                                            <textarea 
                                                                value={editMessageText}
                                                                onChange={(e) => setEditMessageText(e.target.value)}
                                                                className="w-full text-sm text-slate-900 bg-white rounded p-1.5 border-none outline-none focus:ring-2 focus:ring-blue-400"
                                                                rows={2}
                                                            />
                                                            <div className="flex justify-end gap-2 mt-1">
                                                                <button onClick={() => setEditingMessageId(null)} className="text-[10px] uppercase font-bold text-blue-200 hover:text-white transition-colors">{t('common.cancel', 'Annuler')}</button>
                                                                <button onClick={() => handleEditMessage(msg.id)} className="text-[10px] uppercase font-bold bg-white text-blue-600 px-2 py-0.5 rounded hover:bg-blue-50 transition-colors">{t('common.save', 'Enregistrer')}</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="flex items-center gap-2 mb-1 justify-between">
                                                                <span className={`text-xs font-medium flex items-center gap-1.5 ${isOwn ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                                                                    {msg.sender === 'client' ? (
                                                                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 hidden md:flex items-center justify-center font-bold text-[10px] shrink-0">
                                                                            {(activeWo.client_name || '?').charAt(0).toUpperCase()}
                                                                        </span>
                                                                    ) : msg.sender === 'admin' ? (
                                                                        tenant?.favicon_url ? (
                                                                            <img src={getImageUrl(tenant.favicon_url)} alt={tenant?.name || "Company"} className="w-5 h-5 rounded-full object-contain bg-white p-[2px] shrink-0 hidden md:block" />
                                                                        ) : (
                                                                            <span className="w-5 h-5 rounded-full bg-white text-blue-600 hidden md:flex items-center justify-center font-bold text-[10px] shrink-0 shadow-sm border border-slate-100">
                                                                                {(tenant?.name || 'DC').substring(0, 2).toUpperCase()}
                                                                            </span>
                                                                        )
                                                                    ) : null}
                                                                    <span className="truncate max-w-[150px] md:max-w-[200px]">
                                                                        {msg.sender === 'client' ? activeWo.client_name : (msg.sender === 'admin' ? (activeWo.client_language === 'nl' || activeWo.client_language === 'en' ? 'Team Davide Chape' : 'Equipe Davide Chape') : t('admin.system', 'Sistem'))}
                                                                    </span>
                                                                </span>
                                                                <div className={`flex items-center gap-1.5 shrink-0 ${isOwn ? 'bg-white/95 dark:bg-white/95 text-slate-700 px-2 py-0.5 rounded-full shadow-xs' : ''}`}>
                                                                    <span className={`text-[10px] ${isOwn ? 'text-slate-600 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
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
                                                                                <Mail className="w-3.5 h-3.5 text-amber-600 hover:text-amber-700 transition-colors" />
                                                                            ) : (msg.delivery_status || msg.translations?._delivery_status) === 'read' ? (
                                                                                <CheckCheck className="w-3.5 h-3.5 text-sky-600 stroke-[2.5]" />
                                                                            ) : (msg.delivery_status || msg.translations?._delivery_status) === 'delivered' ? (
                                                                                <CheckCheck className="w-3.5 h-3.5 text-slate-400 stroke-[2]" />
                                                                            ) : (
                                                                                <Check className="w-3.5 h-3.5 text-slate-400 stroke-[2]" />
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
                                                                                    className={`flex flex-col text-left rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 hover:ring-2 hover:ring-blue-500 transition-all shadow-sm ${isImage || isPdf ? 'p-0 w-[200px] sm:w-[240px] bg-white dark:bg-slate-800' : 'p-2.5 bg-white dark:bg-slate-800'}`}
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
                                                                <div className={`text-sm whitespace-pre-wrap leading-relaxed ${msg.is_hidden ? 'opacity-70' : ''}`}>
                                                                    {msg.message}
                                                                </div>
                                                            )}
                                                            
                                                            {/* Translation Display */}
                                                            {msg.message && msg.translations && Object.keys(msg.translations).length > 0 && (
                                                                (() => {
                                                                    const displayLang = targetLang !== 'none' ? targetLang : (chat.client_language || 'fr').toLowerCase();
                                                                    const transText = msg.translations[displayLang] || msg.translations['fr'] || Object.values(msg.translations)[0] || '';
                                                                    if (!transText.trim() || transText.includes('Error 500') || transText.includes('Eroare la traducere') || transText.includes("That's an error")) return null;
                                                                    return (
                                                                        <div className={`mt-2 pt-2 border-t text-xs italic ${isOwn ? 'border-blue-400 text-blue-100' : 'border-slate-200 dark:border-slate-700/50 text-slate-500 dark:text-slate-400'}`}>
                                                                            <span className="font-semibold block mb-0.5">🌐 {t('chat.translation', 'Traduction')}:</span>
                                                                            {transText}
                                                                        </div>
                                                                    );
                                                                })()
                                                            )}
                                                        </>
                                                    )}
                                                    
                                                    {msg.sender !== 'system' && (
                                                        <span className={`text-[10px] mt-1 block ${isOwn && !msg.is_hidden ? 'text-blue-200' : 'text-slate-400'}`}>
                                                            {msg.is_hidden && ` • ${t('admin.hidden_from_client', 'Masqué au client')}`}
                                                        </span>
                                                    )}
                                                
                                                {/* Render Emojis */}
                                                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                                    <div className={`absolute -bottom-3 ${isOwn ? 'right-2' : 'left-2'} flex gap-1 bg-white dark:bg-slate-800 rounded-full shadow-sm px-1.5 py-0.5 text-xs z-10 border border-slate-100 dark:border-slate-700`}>
                                                        {Object.entries(msg.reactions).map(([emoji, users]) => (
                                                            <button 
                                                                key={emoji} 
                                                                onClick={() => handleToggleReaction(msg.id, emoji)}
                                                                className={`hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full px-1 ${users.includes('admin') ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
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
                                                    onClick={() => setShowEmojiPickerFor(showEmojiPickerFor === msg.id ? null : msg.id)}
                                                    className="p-1.5 rounded-full text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                                                    title={t('admin.react', 'Réagir')}
                                                >
                                                    <Smile className="w-3.5 h-3.5" />
                                                </button>
                                                
                                                {!isSystem && isOwn && (
                                                    <>
                                                        <button
                                                            onClick={() => handleToggleVisibility(msg.id)}
                                                            className="p-1.5 rounded-full text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                                                            title={msg.is_hidden ? t('admin.show_to_client', 'Afișează la client') : t('admin.hide_from_client', 'Ascunde de la client')}
                                                        >
                                                            {msg.is_hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setEditingMessageId(msg.id);
                                                                setEditMessageText(msg.message);
                                                            }}
                                                            className="p-1.5 rounded-full text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                                                            title={t('admin.edit_message', 'Éditer le message')}
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
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
                                                        onClick={() => handleMarkUnread(msg.id)}
                                                        className="p-1.5 rounded-full text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-700"
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
                            
                            {/* Input Area */}
                            <div className="p-3 md:p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex-shrink-0 pb-[calc(env(safe-area-inset-bottom,0px)+80px)] md:pb-4">
                                {activeWo.is_chat_closed ? (
                                    <div className="text-center p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 text-sm flex items-center justify-center gap-2">
                                        <Clock className="w-4 h-4" />
                                        {t('admin.chat_is_closed_cannot_send', 'Cette conversation est fermée. Vous ne pouvez plus envoyer de messages.')}
                                    </div>
                                ) : (
                                    <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex flex-col gap-2">
                                        
                                        {selectedFiles.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mb-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                                                {selectedFiles.map((f, i) => (
                                                    <div key={i} className="flex items-center gap-2 bg-white dark:bg-slate-800 px-2 py-1 rounded shadow-sm text-xs border border-slate-200 dark:border-slate-700">
                                                        <span className="truncate max-w-[150px] text-slate-700 dark:text-slate-300">{f.name}</span>
                                                        <button type="button" onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full p-0.5">
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="flex gap-2 w-full items-center">
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
                                                className="p-2 text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors shrink-0"
                                                title="Adaugă atașament"
                                            >
                                                <Paperclip className="w-5 h-5" />
                                            </button>
                                            
                                            <input
                                                type="text"
                                                value={chatMessage}
                                                onChange={e => setChatMessage(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                                                placeholder={t('admin.type_message', 'Tapez votre message...')}
                                                className="flex-1 min-w-[100px] bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3 md:px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                                            />
                                            <select 
                                                value={targetLang}
                                                onChange={e => setTargetLang(e.target.value)}
                                                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none"
                                                title="Limbă Traducere (la Client)"
                                            >
                                                <option value="none">Fără trad.</option>
                                                <option value="nl">NL</option>
                                                <option value="fr">FR</option>
                                                <option value="en">EN</option>
                                            </select>
                                            {targetLang !== 'none' && (
                                                <button
                                                    type="button"
                                                    disabled={isTranslating || !chatMessage.trim()}
                                                    onClick={handleTranslatePreview}
                                                    className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-600 dark:text-slate-300 rounded-xl px-3 py-2 flex items-center justify-center transition-colors shadow-sm"
                                                    title="Previzualizare Traducere"
                                                >
                                                    {isTranslating ? (
                                                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                                    ) : (
                                                        <Globe className="w-4 h-4" />
                                                    )}
                                                </button>
                                            )}
                                            <button
                                                type="submit"
                                                disabled={(!chatMessage.trim() && selectedFiles.length === 0) || isSending || isUploading}
                                                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl px-3 md:px-4 py-2 flex items-center justify-center transition-colors shadow-sm"
                                            >
                                                {isSending || isUploading ? (
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                ) : (
                                                    <Send className="w-4 h-4 md:w-5 md:h-5" />
                                                )}
                                            </button>
                                        </div>
                                        {previewTranslation !== '' && targetLang !== 'none' && (
                                            <div className="mt-2 flex gap-2 items-start bg-blue-50/50 dark:bg-blue-900/10 p-2 rounded-xl border border-blue-100 dark:border-blue-800/30">
                                                <div className="text-[10px] text-blue-400 pt-2 flex-shrink-0 font-medium">
                                                    <Globe className="w-3 h-3 inline mr-1" />
                                                    TR:
                                                </div>
                                                <textarea 
                                                    value={previewTranslation}
                                                    onChange={e => setPreviewTranslation(e.target.value)}
                                                    className="flex-1 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:text-slate-200 resize-none"
                                                    rows={2}
                                                />
                                                <button type="button" onClick={() => setPreviewTranslation('')} className="text-slate-400 hover:text-red-500 p-1 rounded-md hover:bg-white dark:hover:bg-slate-800 transition-colors">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
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
            {/* Delete Confirmation Modal */}
            {messageToDelete && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMessageToDelete(null)}></div>
                    <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden p-6 text-center border border-slate-200 dark:border-slate-800">
                        <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 mx-auto flex items-center justify-center mb-5">
                            <Trash2 className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                            {t('admin.confirm_delete_message', 'Voulez-vous vraiment supprimer ce message ?')}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 px-2">
                            {t('admin.action_cannot_be_undone', 'Cette action ne peut pas être annulée.')}
                        </p>
                        <div className="flex items-center gap-3 w-full">
                            <button
                                onClick={() => setMessageToDelete(null)}
                                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-medium transition-colors"
                            >
                                {t('common.cancel', 'Annuler')}
                            </button>
                            <button
                                onClick={executeDeleteMessage}
                                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors shadow-sm shadow-red-500/20"
                            >
                                {t('common.delete', 'Supprimer')}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Toggle Chat Status Confirmation Modal */}
            {chatToToggle && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setChatToToggle(null)}></div>
                    <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden p-6 text-center border border-slate-200 dark:border-slate-800">
                        <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-500 mx-auto flex items-center justify-center mb-5">
                            <Clock className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                            {chatToToggle.isClosed ? t('admin.confirm_reopen_chat', 'Rouvrir ce chat ?') : t('admin.confirm_close_chat', 'Fermer ce chat ?')}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 px-2">
                            {chatToToggle.isClosed 
                                ? t('admin.reopen_chat_desc', 'Le client pourra à nouveau envoyer des messages.')
                                : t('admin.close_chat_desc', 'Le client ne pourra plus envoyer de messages.')}
                        </p>
                        <div className="flex items-center gap-3 w-full">
                            <button
                                onClick={() => setChatToToggle(null)}
                                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-medium transition-colors"
                            >
                                {t('common.cancel', 'Annuler')}
                            </button>
                            <button
                                onClick={executeToggleChatStatus}
                                className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-colors shadow-sm shadow-amber-500/20"
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

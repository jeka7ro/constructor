import React, { useState, useEffect, useRef } from 'react'
import { Bell, MessageSquare, ExternalLink, X, Calculator } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { useUIStore } from '../store/uiStore'

export default function HeaderNotifications() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [unreadQuotesCount, setUnreadQuotesCount] = useState(0)
    const dropdownRef = useRef(null)
    const isInitialLoad = useRef(true)

    const fetchMessages = async () => {
        try {
            const res = await api.get('/admin/chat-notifications/unread')
            const newCount = res.data.unread_count || 0;
            
            setUnreadCount(prevCount => {
                if (newCount > prevCount && !isInitialLoad.current) {
                    // Play a small sound or just show toast for new messages
                    useUIStore.getState().showToast(
                        t('admin.new_message_alert', 'Nouveau message d\'un client !'),
                        'info'
                    );
                }
                return newCount;
            });
            
            setMessages(res.data.messages || [])
            isInitialLoad.current = false;
        } catch (e) {
            console.error('Failed to fetch unread messages', e)
        }
    }

    const fetchQuotes = async () => {
        try {
            const lastViewed = localStorage.getItem('lastQuotesViewAt')
            const params = lastViewed ? { since: lastViewed } : {}
            const res = await api.get('/admin/quotes/unread-count', { params })
            setUnreadQuotesCount(res.data.unread_count || 0)
        } catch (e) {
            console.error('Failed to fetch unread quotes', e)
        }
    }

    useEffect(() => {
        const handleQuotesViewed = () => setUnreadQuotesCount(0);
        window.addEventListener('quotesViewed', handleQuotesViewed);
        
        fetchMessages()
        fetchQuotes()
        // Poll every 15s for better responsiveness
        const interval = setInterval(() => {
            fetchMessages()
            fetchQuotes()
        }, 15000) 
        
        return () => {
            clearInterval(interval)
            window.removeEventListener('quotesViewed', handleQuotesViewed)
        }
    }, [])

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleMessageClick = (msg) => {
        setIsOpen(false)
        navigate(`/admin/chats?wo_id=${msg.work_order_id}`)
    }

    const markAllAsRead = async (e) => {
        e.stopPropagation()
        try {
            await api.post('/admin/work-orders/chat-notifications/mark-read')
            fetchMessages()
        } catch (err) {
            console.error('Failed to mark all as read', err)
        }
    }

    const groupedMessages = messages.reduce((acc, msg) => {
        if (!acc[msg.work_order_id]) {
            acc[msg.work_order_id] = { ...msg, count: 1 };
        } else {
            acc[msg.work_order_id].count += 1;
            if (new Date(msg.created_at) > new Date(acc[msg.work_order_id].created_at)) {
                acc[msg.work_order_id] = { ...msg, count: acc[msg.work_order_id].count };
            }
        }
        return acc;
    }, {});
    
    const groupedArray = Object.values(groupedMessages).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return (
        <div className="flex items-center gap-2">
            <button 
                onClick={() => {
                    localStorage.setItem('lastQuotesViewAt', new Date().toISOString());
                    setUnreadQuotesCount(0);
                    navigate('/admin/quotes');
                }}
                className={`w-8 h-8 flex items-center justify-center rounded-full border border-white/30 transition-colors relative shadow-sm text-white/90 hover:text-white hover:bg-white/10`} 
                title={t('admin.new_quotes', 'Devize noi de la clienți')}
            >
                <Calculator className="w-4 h-4" />
                {unreadQuotesCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center bg-amber-500 text-white text-[9px] font-bold rounded-full border-2 border-[color:var(--tenant-bg,rgb(37,99,235))]">
                        {unreadQuotesCount > 99 ? '99+' : unreadQuotesCount}
                    </span>
                )}
            </button>

            <div className="relative" ref={dropdownRef}>
                <button 
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-8 h-8 flex items-center justify-center rounded-full border border-white/30 transition-colors relative shadow-sm ${isOpen ? 'bg-white/20 text-white' : 'text-white/90 hover:text-white hover:bg-white/10'}`} 
                    title={t('admin.notifications', 'Notifications')}
                >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full border-2 border-[color:var(--tenant-bg,rgb(37,99,235))]">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </button>

                {isOpen && (
                    <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.2)] border border-slate-100 dark:border-slate-800 overflow-hidden z-50">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-blue-600" />
                                <h3 className="font-bold text-slate-800 dark:text-white text-sm">{t('admin.client_messages', 'Mesaje Clienți')}</h3>
                            </div>
                            {unreadCount > 0 && (
                                <button 
                                    onClick={markAllAsRead}
                                    className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
                                >
                                    {t('admin.mark_read', 'Marchează citite')}
                                </button>
                            )}
                        </div>
                        
                        <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                            {groupedArray.length === 0 ? (
                                <div className="p-8 text-center flex flex-col items-center justify-center">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                                        <Bell className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('admin.no_new_messages', 'Nu ai mesaje noi.')}</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                    {groupedArray.map((msg) => (
                                        <div 
                                            key={msg.id} 
                                            onClick={() => handleMessageClick(msg)}
                                            className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group relative"
                                        >
                                            <div className="flex items-start justify-between mb-1">
                                                <h4 className="text-xs font-extrabold text-slate-900 dark:text-white truncate pr-4">
                                                    {msg.client_name || t('admin.client', 'Client')}
                                                </h4>
                                                <span className="text-[10px] font-bold text-blue-600 shrink-0 bg-blue-50 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                                    {t('admin.new_badge', 'Nou')} {msg.count > 1 && <span className="bg-blue-600 text-white rounded-full px-1 text-[9px]">{msg.count}</span>}
                                                </span>
                                            </div>
                                            {msg.work_order_title && (
                                                <p className="text-[11px] font-semibold text-slate-500 mb-1.5 truncate">
                                                    {t('admin.work_order_label', 'Lucrare:')} {msg.work_order_title}
                                                </p>
                                            )}
                                            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                                                {msg.message}
                                            </p>
                                            <div className="mt-2 flex items-center justify-between">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">
                                                    {new Date(msg.created_at).toLocaleString('ro-RO')}
                                                </span>
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                                                    <span>{t('admin.open', 'Deschide')}</span>
                                                    <ExternalLink className="w-3 h-3" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-center">
                            <button 
                                onClick={() => { setIsOpen(false); navigate('/admin/chats'); }}
                                className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
                            >
                                {t('admin.see_all_messages', 'Vezi toate mesajele')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

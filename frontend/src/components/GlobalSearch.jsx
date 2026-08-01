import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, FileText, Users, HardHat, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Fuse from 'fuse.js';

const GlobalSearch = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [searchData, setSearchData] = useState([]);
    const [fuse, setFuse] = useState(null);
    const inputRef = useRef(null);

    // Fetch data when modal opens
    useEffect(() => {
        if (isOpen) {
            setSearchQuery('');
            setTimeout(() => inputRef.current?.focus(), 100);
            
            // Only fetch if we haven't loaded data yet
            if (searchData.length === 0 && !isLoading) {
                const fetchData = async () => {
                    setIsLoading(true);
                    try {
                        let token = null;
                        try {
                            const adminStorage = localStorage.getItem('admin-storage');
                            if (adminStorage) {
                                token = JSON.parse(adminStorage).state?.token;
                            }
                        } catch(e) {}

                        const res = await fetch(`${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}/api/admin/search/global`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        
                        if (res.ok) {
                            const data = await res.json();
                            setSearchData(data);
                            // Initialize Fuse.js with the fetched data
                            setFuse(new Fuse(data, {
                                keys: ['title', 'subtitle', 'raw_data'],
                                includeScore: true,
                                threshold: 0.4, // Allows fuzzy matching (handles typos)
                                ignoreLocation: true
                            }));
                        }
                    } catch (error) {
                        console.error("Failed to fetch search data", error);
                    } finally {
                        setIsLoading(false);
                    }
                };
                fetchData();
            }
        }
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // Get results based on Fuse or empty array
    let filteredResults = [];
    if (searchQuery.trim() !== '' && fuse) {
        // Fuse returns an array of { item, score }. We filter out bad matches (score > 0.5).
        // 0.0 is perfect match, 1.0 is no match. 0.48 is typical for a 1-letter typo (e.g. isofex -> isoflex)
        filteredResults = fuse.search(searchQuery)
            .filter(result => result.score < 0.5)
            .map(result => result.item)
            .slice(0, 50); // limit to 50 results to prevent UI lag
    }

    const getIcon = (type) => {
        switch (type) {
            case 'client': return <Users className="w-4 h-4 text-green-500" />;
            case 'chantier': return <HardHat className="w-4 h-4 text-orange-500" />;
            case 'devis': return <FileText className="w-4 h-4 text-blue-500" />;
            default: return <FileText className="w-4 h-4 text-slate-500" />;
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-900/50 backdrop-blur-sm flex items-start justify-center pt-[15vh] px-4 animate-in fade-in duration-200">
            {/* Clickable overlay to close */}
            <div className="absolute inset-0" onClick={onClose}></div>
            
            <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col animate-in zoom-in-95 duration-200">
                {/* Search Header */}
                <div className="flex items-center px-4 border-b border-slate-200 dark:border-slate-800">
                    <Search className="w-6 h-6 text-slate-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('search.placeholder', 'Rechercher... (Cmd+K)')}
                        className="flex-1 w-full h-16 px-4 bg-transparent border-none outline-none text-lg text-slate-900 dark:text-white placeholder:text-slate-400"
                    />
                    {isLoading && <Loader2 className="w-5 h-5 text-blue-500 animate-spin mr-3" />}
                    <button 
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search Results */}
                {searchQuery.trim() !== '' && (
                    <div className="max-h-[60vh] overflow-y-auto p-2">
                        {filteredResults.length > 0 ? (
                            <div className="space-y-1">
                                {filteredResults.map(result => (
                                    <div 
                                        key={result.id}
                                        onClick={() => {
                                            if (result.nav_url) {
                                                navigate(result.nav_url);
                                            }
                                            onClose();
                                        }}
                                        className="flex items-center gap-4 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl cursor-pointer transition-colors group"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                            {getIcon(result.type)}
                                        </div>
                                        <div className="flex flex-col flex-1 min-w-0">
                                            <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                                {result.title}
                                            </span>
                                            <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                {result.subtitle}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : !isLoading && (
                            <div className="py-12 text-center text-slate-500">
                                <Search className="w-8 h-8 mx-auto mb-3 opacity-20" />
                                <p className="text-sm">{t('search.no_results', 'Aucun résultat trouvé pour')} "{searchQuery}"</p>
                            </div>
                        )}
                    </div>
                )}
                
                {/* Initial State / Help Text */}
                {searchQuery.trim() === '' && (
                    <div className="py-8 px-6 bg-slate-50 dark:bg-slate-900/50">
                        <p className="text-xs text-center text-slate-500 dark:text-slate-400">
                            {t('search.help_text', 'Recherchez par nom de client, numéro de devis, adresse du chantier, etc.')}
                        </p>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default GlobalSearch;

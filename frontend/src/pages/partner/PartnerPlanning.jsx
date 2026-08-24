import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { usePartnerStore } from '../../store/partnerStore'
import partnerApi from '../../lib/partnerApi'
import PartnerWorkOrderModal from './PartnerWorkOrderModal'
import { Plus, LayoutList, CalendarDays, Loader2, Truck, MapPin, X, Navigation, CheckCircle2, Wind, Thermometer, Layers } from 'lucide-react'
import ShortWorksCalendar from '../../components/ShortWorksCalendar'
import CalendarErrorBoundary from '../../components/CalendarErrorBoundary'
import WeatherWidget from '../../components/WeatherWidget'

const T = {
    fr: {
        my_orders: 'Mes commandes',
        add_order: 'Nouvelle commande',
        no_orders: 'Aucune commande pour cette période',
        loading: 'Chargement...',
        today: "Aujourd'hui",
        week: 'Semaine',
        month: 'Mois',
        all: 'Tout',
        address: 'Adresse',
        surface: 'Surface',
        thickness: 'Épaisseur',
        date: 'Date',
        status: 'Statut',
        new_work: 'Nouveau',
        repair_work: 'Rénovation',
        draft: 'Brouillon',
        pending: 'En attente',
        confirmed: 'Confirmé',
        in_progress: 'En cours',
        completed: 'Terminé',
        planning: 'Planifié',
        edit: 'Modifier',
        delete: 'Supprimer',
        confirm_delete: 'Êtes-vous sûr de vouloir supprimer cette commande ?',
        deleted: 'Commande supprimée',
        details: 'Détails',
        photos: 'Photos',
        no_photos: 'Aucune photo',
        estimated_surface: 'Surface estimée',
        actual_surface: 'Surface réelle',
        actual_thickness: 'Épaisseur réelle',
        team: 'Équipe',
        confirmed_by_team: 'Confirmé par le chef d\'équipe',
        checkin: 'Arrivée',
        checkout: 'Départ',
        team_note: 'Note du chef d\'équipe',
        close: 'Fermer',
        mon: 'Lun', tue: 'Mar', wed: 'Mer', thu: 'Jeu', fri: 'Ven', sat: 'Sam', sun: 'Dim',
    },
    nl: {
        my_orders: 'Mijn bestellingen',
        add_order: 'Nieuwe bestelling',
        no_orders: 'Geen bestellingen voor deze periode',
        loading: 'Laden...',
        today: 'Vandaag',
        week: 'Week',
        month: 'Maand',
        all: 'Alles',
        address: 'Adres',
        surface: 'Oppervlakte',
        thickness: 'Dikte',
        date: 'Datum',
        status: 'Status',
        new_work: 'Nieuw',
        repair_work: 'Renovatie',
        draft: 'Concept',
        pending: 'In afwachting',
        confirmed: 'Bevestigd',
        in_progress: 'Bezig',
        completed: 'Voltooid',
        planning: 'Gepland',
        edit: 'Bewerken',
        delete: 'Verwijderen',
        confirm_delete: 'Weet u zeker dat u deze bestelling wilt verwijderen?',
        deleted: 'Bestelling verwijderd',
        details: 'Details',
        photos: 'Foto\'s',
        no_photos: 'Geen foto\'s',
        estimated_surface: 'Geschatte oppervlakte',
        actual_surface: 'Werkelijke oppervlakte',
        actual_thickness: 'Werkelijke dikte',
        team: 'Team',
        confirmed_by_team: 'Bevestigd door teamleider',
        checkin: 'Aankomst',
        checkout: 'Vertrek',
        team_note: 'Opmerking teamleider',
        close: 'Sluiten',
        mon: 'Ma', tue: 'Di', wed: 'Wo', thu: 'Do', fri: 'Vr', sat: 'Za', sun: 'Zo',
    },
    en: {
        my_orders: 'My orders',
        add_order: 'New order',
        no_orders: 'No orders for this period',
        loading: 'Loading...',
        today: 'Today',
        week: 'Week',
        month: 'Month',
        all: 'All',
        address: 'Address',
        surface: 'Surface',
        thickness: 'Thickness',
        date: 'Date',
        status: 'Status',
        new_work: 'New',
        repair_work: 'Renovation',
        draft: 'Draft',
        pending: 'Pending',
        confirmed: 'Confirmed',
        in_progress: 'In progress',
        completed: 'Completed',
        planning: 'Planned',
        edit: 'Edit',
        delete: 'Delete',
        confirm_delete: 'Are you sure you want to delete this order?',
        deleted: 'Order deleted',
        details: 'Details',
        photos: 'Photos',
        no_photos: 'No photos',
        estimated_surface: 'Estimated surface',
        actual_surface: 'Actual surface',
        actual_thickness: 'Actual thickness',
        team: 'Team',
        confirmed_by_team: 'Confirmed by team leader',
        checkin: 'Arrival',
        checkout: 'Departure',
        team_note: 'Team leader note',
        close: 'Close',
        mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
    },
}

const STATUS_COLORS = {
    draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    pending: 'bg-amber-100 text-amber-700',
    sent: 'bg-blue-100 text-blue-700',
    confirmed: 'bg-emerald-100 text-emerald-700',
    planning: 'bg-sky-100 text-sky-700',
    in_progress: 'bg-indigo-100 text-indigo-700',
    completed: 'bg-green-100 text-green-700',
}

function getMonday(d) {
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(d.getFullYear(), d.getMonth(), diff)
}

function formatDate(dateStr) {
    if (!dateStr) return '—'
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('fr-BE', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function PartnerPlanning() {
    const { lang } = useOutletContext()
    const { partner } = usePartnerStore()
    const navigate = useNavigate()
    const t = T[lang] || T.fr

    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingOrder, setEditingOrder] = useState(null)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
    const [teams, setTeams] = useState([])
    const [selectedTeamIds, setSelectedTeamIds] = useState(new Set())
    // Calendar state
    const [currentWeekStart, setCurrentWeekStart] = useState(() => getMonday(new Date()))
    const [viewMode, setViewMode] = useState('week') // 'week' | 'list'

    const fetchTeams = useCallback(async () => {
        try {
            const res = await partnerApi.get('/teams')
            const fetched = res.data || []
            setTeams(fetched)
            setSelectedTeamIds(new Set(fetched.map(t => t.id)))
        } catch (err) {
            console.error('Failed to fetch partner teams', err)
        }
    }, [])

    const fetchOrders = useCallback(async () => {
        setLoading(true)
        try {
            const res = await partnerApi.get('/work-orders')
            setOrders(res.data || [])
        } catch (err) {
            console.error('Failed to fetch partner data', err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchTeams(); fetchOrders() }, [fetchTeams, fetchOrders])

    const handleDelete = async (id) => {
        try {
            await partnerApi.delete(`/work-orders/${id}`)
            setOrders(prev => prev.filter(o => o.id !== id))
            setShowDeleteConfirm(null)
        } catch (err) {
            console.error('Failed to delete', err)
        }
    }

    const handleSaved = () => {
        setShowModal(false)
        setEditingOrder(null)
        fetchOrders()
    }

    const handleTeamDropOnOrder = async (workOrderId, teamId) => {
        try {
            await partnerApi.put(`/work-orders/${workOrderId}`, {
                assigned_team_id: teamId
            })
            // Update local state optimistic
            const selectedTeam = teams.find(t => String(t.id) === String(teamId));
            setOrders(prev => prev.map(o => String(o.id) === String(workOrderId) ? { 
                ...o, 
                assigned_team_id: teamId,
                team_name: selectedTeam ? selectedTeam.name : null,
                assigned_team_color: selectedTeam ? selectedTeam.color : null
            } : o))
        } catch (err) {
            console.error('Failed to assign team', err)
            fetchOrders() // revert on error
        }
    }

    const handleOrderRescheduled = (woId, newDate, newTime, revert = false, durationDays = undefined) => {
        if (woId) {
            setOrders(prev => prev.map(wo => String(wo.id) === String(woId) ? {
                ...wo,
                ...(newDate ? { start_date: newDate } : {}),
                ...(newTime ? { start_time: newTime } : {}),
                ...(durationDays !== undefined ? { duration_days: durationDays } : {})
            } : wo));
        }
        if (revert || !woId) {
            fetchOrders();
        }
    }

    const getStatusLabel = (status) => t[status] || status
    const [isCalendarFull, setIsCalendarFull] = useState(false);
    const toggleCalendarFullscreen = () => setIsCalendarFull(p => !p);

    const toggleTeam = (teamId) => {
        const next = new Set(selectedTeamIds);
        if (next.has(teamId)) next.delete(teamId);
        else next.add(teamId);
        setSelectedTeamIds(next);
    }
    
    const visibleTeams = teams.filter(t => selectedTeamIds.has(t.id));

    return (
        <div className="space-y-4 h-[calc(100vh-8rem)]">
            {/* Header Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3">

                <div className="flex items-center gap-2 relative">
                    <button
                        onClick={() => { setEditingOrder(null); setShowModal(true) }}
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-all active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        {t.add_order}
                    </button>
                </div>
            </div>

            {viewMode === 'week' ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 h-full overflow-hidden">
                    <CalendarErrorBoundary>
                        <ShortWorksCalendar 
                            workOrders={orders}
                            teams={teams}
                            clients={[]}
                            apiClient={partnerApi}
                            apiBasePath="/work-orders"
                            navBasePath="/partner/work-orders"
                            isPartner={true}
                            isCalendarFull={true}
                            onTeamDrop={handleTeamDropOnOrder}
                            onOrderRescheduled={handleOrderRescheduled}
                            onOrderClick={(wo) => navigate('/partner/work-orders/' + wo.id)}
                            onOrderEdit={(wo) => {
                                setEditingOrder(wo);
                                setShowModal(true);
                            }}
                            onEmptyCellClick={(date, time) => {
                                setEditingOrder({ start_date: date });
                                setShowModal(true);
                            }}
                        />
                    </CalendarErrorBoundary>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {orders.length === 0 ? (
                        <div className="col-span-full text-center py-20 text-slate-500">
                            No orders found.
                        </div>
                    ) : (
                        orders.map((wo, index) => {
                            const color = wo.team?.color || wo.assigned_team_color || '#3b82f6';
                            const bgStyle = {
                                backgroundColor: color + '1a',
                                borderColor: color + '33',
                                backdropFilter: 'blur(8px)'
                            };
                            
                            const lat = wo.site_latitude || wo.site_lat;
                            const lng = wo.site_longitude || wo.site_lng;
                            const address = wo.site_address || wo.address || wo.client_name;
                            const staticMapLoc = (lat && lng) ? true : false;
                            const teamName = wo.team?.name || wo.assigned_team_name || 'Echipă Neasignată';

                            return (
                                <button
                                    key={wo.id}
                                    onClick={() => navigate('/partner/work-orders/' + wo.id)}
                                    className="relative w-full rounded-2xl border text-left overflow-hidden shadow-sm active:scale-[0.98] transition-all duration-200"
                                    style={bgStyle}
                                >
                                    {staticMapLoc && (
                                        <div 
                                            className="absolute top-0 right-0 bottom-0 w-2/3 pointer-events-none overflow-hidden rounded-r-2xl opacity-40 dark:opacity-20 mix-blend-multiply dark:mix-blend-lighten" 
                                            style={{ WebkitMaskImage: 'linear-gradient(to right, transparent, black)', maskImage: 'linear-gradient(to right, transparent, black)' }}
                                        >
                                            <img 
                                                src={`https://static-maps.yandex.ru/1.x/?ll=${lng},${lat}&size=400,300&z=14&l=map`} 
                                                alt="Map" 
                                                className="w-full h-full object-cover" 
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                        </div>
                                    )}
                                    <div className="p-3.5 flex flex-col gap-2.5 relative z-10">
                                        <div className="flex items-center justify-between w-full gap-1">
                                            <div className="flex items-center gap-1 px-2 py-1 rounded-md shrink-0" style={{ backgroundColor: color + '26' }}>
                                                <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate max-w-[120px] drop-shadow-sm">{teamName}</span>
                                            </div>
                                            <div className={`flex items-center justify-center flex-1`}>
                                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/70 dark:bg-slate-800/70 shadow-sm border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                                                    <div className="text-[11px] font-bold shrink-0">
                                                        <OsrmDistance 
                                                            lat1={50.88243} lon1={4.39343} 
                                                            lat2={lat} lon2={lng} 
                                                            label=""
                                                        />
                                                    </div>
                                                    {wo.route_sand_kg > 0 && (
                                                        <>
                                                            <div className="w-px h-3 bg-slate-300 dark:bg-slate-600 mx-0.5"></div>
                                                            <div className="text-[11px] font-bold text-amber-600 dark:text-amber-500 shrink-0">
                                                                {(wo.route_sand_kg / 1000).toFixed(1)} t
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="shrink-0 flex items-center justify-end">
                                                {(lat && lng) && (
                                                    <div className="scale-125 origin-right pr-2">
                                                        <WeatherWidget lat={lat} lon={lng} dateStr={wo.start_date || wo.deadline_date} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-1 mt-1">
                                            <h4 className="font-bold text-[16px] leading-tight opacity-90 dark:text-white">
                                                {wo.client?.name || wo.client_name || 'Client Necunoscut'}
                                            </h4>
                                        </div>
                                        
                                        <div className="space-y-1 mt-1">
                                            {wo.volumes && wo.volumes.some(v => parseFloat(v.quantity) > 0) && (
                                                <div className="flex flex-col gap-0.5 mt-1">
                                                    {wo.volumes.map((v, idx) => {
                                                        const sq = parseFloat(v.quantity);
                                                        const th = parseFloat(v.thickness);
                                                        if (!sq && !th) return null;
                                                        const shortLabel = (v.label || '').toLowerCase().includes('izola') ? 'Izolație' : (v.label || `Volum ${idx + 1}`);
                                                        const isPur = (v.label || '').toLowerCase().includes('pur');
                                                        const isEps = (v.label || '').toLowerCase().includes('eps');
                                                        const Icon = isPur ? Wind : (isEps ? Thermometer : Layers);
                                                        const iconColor = isPur ? 'text-indigo-500' : (isEps ? 'text-emerald-500' : 'text-slate-500');

                                                        return (
                                                            <div key={idx} className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200">
                                                                <Icon className={`w-3.5 h-3.5 ${iconColor} shrink-0`} />
                                                                <span className="truncate max-w-[80px] opacity-80">{shortLabel}:</span>
                                                                <span>
                                                                    {sq > 0 ? `${sq} m²` : ''} 
                                                                    {sq > 0 && th > 0 ? ' × ' : ''} 
                                                                    {th > 0 ? `${th} cm` : ''}
                                                                </span>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t" style={{ borderColor: color + '26' }}>
                                            <MapPin className="w-4 h-4 shrink-0 opacity-70 dark:text-slate-300" />
                                            <div className="flex flex-col flex-1">
                                                <span className="text-xs font-medium leading-tight opacity-80 dark:text-slate-300">
                                                    {address || 'Fără adresă'}
                                                </span>
                                            </div>
                                            {wo.status === 'completed' || wo.status === 'done' ? (
                                                <div 
                                                    className="ml-auto w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"
                                                    title={'Terminé'}
                                                >
                                                    <CheckCircle2 className="w-5 h-5" />
                                                </div>
                                            ) : (
                                                <a 
                                                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(wo.site_address || wo.site?.address || wo.address || '')}`}
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="ml-auto w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors shrink-0"
                                                >
                                                    <Navigation className="w-4 h-4" />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            )}

            {/* Work Order Form Modal */}
            {showModal && (
                <PartnerWorkOrderModal
                    order={editingOrder}
                    lang={lang}
                    onClose={() => { setShowModal(false); setEditingOrder(null) }}
                    onSaved={handleSaved}
                />
            )}
        </div>
    )
}

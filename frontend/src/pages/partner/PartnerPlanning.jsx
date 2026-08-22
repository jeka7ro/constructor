import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { usePartnerStore } from '../../store/partnerStore'
import partnerApi from '../../lib/partnerApi'
import PartnerWorkOrderModal from './PartnerWorkOrderModal'
import { Plus, LayoutList, CalendarDays, Loader2, Truck, MapPin, X } from 'lucide-react'
import ShortWorksCalendar from '../../components/ShortWorksCalendar'
import CalendarErrorBoundary from '../../components/CalendarErrorBoundary'

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
    const [teams, setTeams] = useState([{ id: 'partner_team', name: 'Mes chantiers', color: '#2563eb' }])
    const [selectedTeamIds, setSelectedTeamIds] = useState(new Set(['partner_team']))
    // Calendar state
    const [currentWeekStart, setCurrentWeekStart] = useState(() => getMonday(new Date()))
    const [viewMode, setViewMode] = useState('week') // 'week' | 'list'

    const fetchOrders = useCallback(async () => {
        setLoading(true)
        try {
            const res = await partnerApi.get('/work-orders')
            const ordersWithDummyTeam = (res.data || []).map(o => ({ ...o, assigned_team_id: 'partner_team' }))
            setOrders(ordersWithDummyTeam)
            const resTeams = await partnerApi.get('/teams')
            setTeams(resTeams.data || [])
            if (selectedTeamIds.size === 0 && resTeams.data?.length > 0) {
                setSelectedTeamIds(new Set(resTeams.data.map(t => t.id)))
            }
        } catch (err) {
            console.error('Failed to fetch partner data', err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchOrders() }, [fetchOrders])

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
            setOrders(prev => prev.map(o => o.id === workOrderId ? { ...o, assigned_team_id: teamId } : o))
        } catch (err) {
            console.error('Failed to assign team', err)
            fetchOrders() // revert on error
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setViewMode('list')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-400'}`}
                    >
                        <LayoutList className="w-4 h-4 inline mr-1.5" />
                        List
                    </button>
                    <button
                        onClick={() => setViewMode('week')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'week' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-400'}`}
                    >
                        <CalendarDays className="w-4 h-4 inline mr-1.5" />
                        Matrix
                    </button>
                </div>
                <div className="flex items-center gap-2 relative">
                    <button
                        onClick={() => { setEditingOrder(null); setShowModal(true) }}
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-all active:scale-95"
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
                            navBasePath="/partner/orders"
                            isPartner={true}
                            onOrderRescheduled={() => fetchOrders()}
                            onOrderClick={(wo) => navigate('/partner/orders/' + wo.id)}
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
                        orders.map(order => (
                            <div key={order.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-2 cursor-pointer hover:shadow-md transition-all" onClick={() => navigate('/partner/orders/' + order.id)}>
                                <div className="font-semibold text-slate-800 dark:text-slate-200">{order.site_address}</div>
                                <div className="text-sm text-slate-500">Status: {getStatusLabel(order.status)}</div>
                            </div>
                        ))
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

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import {
    Loader2, HardHat, Package, LayoutGrid, FileSpreadsheet,
    TrendingUp, TrendingDown, BarChart3, Navigation, CalendarDays,
    Users, Euro, Layers, RefreshCw, ArrowUpRight, ArrowDownRight,
    CheckCircle2, Clock, Sparkles, Activity, Eye, MapPin, Shield,
    Flame, PieChart as PieChartIcon, Award, Building2, Filter, X
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Legend, LabelList, ComposedChart, Line, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts'
import DataTable from '../../components/DataTable'
import { buildQuoteItems } from '../../utils/priceCalculator'

const toLocalISO = (d) => {
    const tzOffset = d.getTimezoneOffset() * 60000
    return new Date(d.getTime() - tzOffset).toISOString().split('T')[0]
}

const TEAM_PALETTE = [
    '#2563EB', // Blue
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#8B5CF6', // Violet
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#F97316', // Orange
    '#6366F1'  // Indigo
]

const SOURCE_CONFIG = {
    devis_online: { label: 'Devis Online', color: '#2563EB' },
    'we-r': { label: 'WE-R / Public', color: '#F59E0B' },
    calculator_public: { label: 'WE-R / Public', color: '#F59E0B' },
    partner: { label: 'Parteneri B2B', color: '#10B981' },
    robaws: { label: 'Robaws Sync', color: '#8B5CF6' },
    manual: { label: 'Adăugat Manual', color: '#06B6D4' }
}

const WEEKDAYS_RO = ['Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm', 'Dum']

function extractCityFromAddress(address) {
    if (!address || address === '—') return 'Nespecificat'
    const parts = String(address).split(',').map(s => s.trim()).filter(Boolean)
    if (parts.length >= 2) {
        // Check second-to-last or last part, strip postal codes like "1740 Ternat" -> "Ternat"
        let candidate = parts.length >= 3 ? parts[parts.length - 2] : parts[parts.length - 1]
        if (/^(belgique|belgia|belgium|belgië|roemenië|romania|românia|moldova|france|nederland)$/i.test(candidate) && parts.length >= 2) {
            candidate = parts[parts.length - 2]
        }
        const cleaned = candidate.replace(/\b\d{4,6}\b/g, '').replace(/^[-·\s]+|[-·\s]+$/g, '').trim()
        if (cleaned.length >= 2) return cleaned.toUpperCase()
    }
    const cleanedSingle = parts[0]?.replace(/\b\d{4,6}\b/g, '').trim()
    return (cleanedSingle && cleanedSingle.length >= 2) ? cleanedSingle.slice(0, 24).toUpperCase() : 'ALTE ZONE'
}

const _orderMetricsMemo = new Map()

function extractOrderMetrics(wo, pricingSettings) {
    const cacheKey = `${wo.id}:${wo.updated_at || ''}:${wo.is_invoiced ? 1 : 0}:${pricingSettings ? 'ps' : 'nops'}`
    if (_orderMetricsMemo.has(cacheKey)) {
        return _orderMetricsMemo.get(cacheKey)
    }
    const volumes = Array.isArray(wo.volumes) ? wo.volumes : []
    let chapeSqm = 0
    let purSqm = 0
    let epsSqm = 0
    let weightedThicknessSum = 0
    let hasFoil = Boolean(wo.has_foil || wo.actual_has_foil)
    let hasMesh = Boolean(wo.has_mesh || wo.actual_has_mesh)
    let hasFiber = Boolean(wo.has_fiber || wo.actual_has_fiber)
    let hasDuramint = false

    let foilSqm = 0
    let meshSqm = 0
    let fiberSqm = 0
    let duramintSqm = 0

    if (volumes.length > 0) {
        volumes.forEach(v => {
            const qty = parseFloat(v.actual_quantity || v.quantity) || 0
            const thick = parseFloat(v.actual_thickness || v.thickness) || 6
            const lbl = String(v.label || '').toLowerCase()
            if (qty <= 0) return

            if (lbl.includes('pur') || lbl.includes('mousse')) {
                purSqm += qty
            } else if (lbl.includes('eps') || lbl.includes('thermobeton')) {
                epsSqm += qty
            } else {
                chapeSqm += qty
                weightedThicknessSum += qty * thick
                if (v.has_foil) { hasFoil = true; foilSqm += qty }
                if (v.has_mesh) { hasMesh = true; meshSqm += qty }
                if (v.has_fiber) { hasFiber = true; fiberSqm += qty }
                if (v.has_duramint) { hasDuramint = true; duramintSqm += qty }
            }
        })
    } else {
        const surf = parseFloat(wo.actual_surface_m2 || wo.surface_m2 || wo.surface_area) || 0
        const thick = parseFloat(wo.actual_thickness_cm || wo.thickness_cm || wo.thickness) || 6
        if (surf > 0) {
            chapeSqm = surf
            weightedThicknessSum = surf * thick
            if (hasFoil) foilSqm = surf
            if (hasMesh) meshSqm = surf
            if (hasFiber) fiberSqm = surf
        }
    }

    const totalSqm = chapeSqm + purSqm + epsSqm
    const avgThickness = chapeSqm > 0 ? (weightedThicknessSum / chapeSqm) : (parseFloat(wo.thickness_cm || wo.thickness) || 6)

    // Sand (Tonnes)
    let sandTons = 0
    const actualSandRaw = parseFloat(wo.actual_sand_quantity) || 0
    if (actualSandRaw > 0) {
        sandTons = actualSandRaw > 200 ? actualSandRaw / 1000 : actualSandRaw
    } else if (Array.isArray(wo.materials_consumed) && wo.materials_consumed.length > 0) {
        wo.materials_consumed.forEach(m => {
            const name = String(m.name || '').toLowerCase()
            let qty = parseFloat(m.quantity) || 0
            if (name.includes('nisip') || name.includes('sable') || name.includes('zand')) {
                const unit = String(m.unit || '').toLowerCase()
                if (unit === 'kg' || qty > 200) qty = qty / 1000
                sandTons += qty
            }
        })
    }
    if (sandTons <= 0) {
        const routeSandKg = parseFloat(wo.route_sand_kg) || 0
        if (routeSandKg > 0) {
            sandTons = routeSandKg / 1000
        } else if (chapeSqm > 0) {
            sandTons = (weightedThicknessSum * 16) / 1000
        }
    }

    const cementTons = chapeSqm > 0 ? (weightedThicknessSum * 2.5) / 1000 : 0

    let km = parseFloat(wo.route_distance_km) || 0
    if (km <= 0 && wo.prices?.distance_km) {
        km = (parseFloat(wo.prices.distance_km) || 0) * 2
    }
    if (km <= 0 && Array.isArray(wo.route_segments) && wo.route_segments.length > 0) {
        km = wo.route_segments.reduce((s, seg) => s + (parseFloat(seg.km) || 0), 0) * 2
    }

    // Revenue EUR (HT)
    let revenueNet = 0
    try {
        const pRaw = wo.proforma_data?.items
        if (Array.isArray(pRaw) && pRaw.length > 0) {
            const d0 = String(pRaw[0].desc || '').toLowerCase().trim()
            const isPlaceholder = pRaw.length === 1 && (
                pRaw[0].id === 'default' ||
                d0.includes('conform deviz') ||
                d0.includes('manoper') ||
                d0 === 'chape' || d0 === 'sapa'
            )
            if (!isPlaceholder) {
                const totalItems = pRaw
                    .filter(i => !i.isHeader && !i.isSubtotal)
                    .reduce((s, i) => s + (parseFloat(i.qty ?? 1) * parseFloat(i.price || 0)), 0)
                const discount = parseFloat(wo.prices?.discount || 0)
                revenueNet = Math.max(0, totalItems - discount)
            }
        }
        if (revenueNet <= 0 && volumes.length > 0) {
            const calc = buildQuoteItems(wo, pricingSettings)
            if (calc && calc.net > 0) {
                revenueNet = parseFloat(calc.net) || 0
            }
        }
        if (revenueNet <= 0) {
            revenueNet = parseFloat(wo.computed_total) || parseFloat(wo.estimated_price) || 0
        }
    } catch {
        revenueNet = parseFloat(wo.computed_total) || parseFloat(wo.estimated_price) || 0
    }

    const rawDate = (wo.start_date || wo.deadline_date || wo.approximate_date || wo.created_at || '').split('T')[0]

    // Parse start hour (0..23) & weekday (0=Mon .. 6=Sun)
    let hourSlot = 8
    if (wo.start_time && /^\d{1,2}/.test(String(wo.start_time))) {
        const h = parseInt(String(wo.start_time).split(':')[0], 10)
        if (!isNaN(h) && h >= 0 && h <= 23) hourSlot = h
    } else if (wo.created_at && String(wo.created_at).includes('T')) {
        const dCreated = new Date(wo.created_at)
        if (!isNaN(dCreated.getHours())) hourSlot = dCreated.getHours()
    }

    let weekdayIdx = 0 // 0=Mon..6=Sun
    if (rawDate) {
        const jsDay = new Date(rawDate).getDay() // 0=Sun..6=Sat
        weekdayIdx = jsDay === 0 ? 6 : jsDay - 1
    }

    const address = wo.site_address || wo.site_name || '—'
    const city = extractCityFromAddress(address)

    const resultObj = {
        id: wo.id,
        quoteNumber: wo.quote_number || `#${String(wo.id || '').slice(0, 6).toUpperCase()}`,
        clientName: wo.client_name || wo.title || 'Client',
        address,
        city,
        date: rawDate,
        weekdayIdx,
        hourSlot,
        status: wo.status || 'draft',
        isQuote: Boolean(wo.is_quote),
        isInvoiced: Boolean(wo.is_invoiced),
        source: wo.source_system || 'manual',
        teamId: wo.assigned_team_id || 'unassigned',
        teamName: wo.assigned_team_name || '',
        teamColor: wo.assigned_team_color || null,
        chapeSqm,
        purSqm,
        epsSqm,
        totalSqm,
        avgThickness,
        sandTons,
        cementTons,
        km,
        revenueNet,
        hasFoil,
        hasMesh,
        hasFiber,
        hasDuramint,
        foilSqm,
        meshSqm,
        fiberSqm,
        duramintSqm,
        actualSurface: parseFloat(wo.actual_surface_m2) || 0,
        actualSand: parseFloat(wo.actual_sand_quantity) || 0
    }
    _orderMetricsMemo.set(cacheKey, resultObj)
    return resultObj
}

function summarizePeriod(items, teamsMap, unassignedLabel) {
    let totalOrders = items.length
    let totalSqm = 0
    let chapeSqm = 0
    let purSqm = 0
    let epsSqm = 0
    let totalSand = 0
    let totalCement = 0
    let totalKm = 0
    let totalRevenue = 0
    let weightedThick = 0
    let foilSqm = 0
    let meshSqm = 0
    let fiberSqm = 0
    let duramintSqm = 0
    let foilCount = 0
    let meshCount = 0
    let fiberCount = 0
    let duramintCount = 0
    let completedCount = 0
    let invoicedCount = 0

    const byDayMap = {}
    const byTeamMap = {}
    const bySourceMap = {}
    const byCityMap = {}
    const byClientMap = {}

    // Heatmap 1: Weekday (0..6) x Team
    const weekdayTeamMatrix = WEEKDAYS_RO.map((dayLabel, dIdx) => ({
        dayIdx: dIdx,
        dayLabel,
        totalSqm: 0,
        totalCount: 0,
        teams: {}
    }))

    // Heatmap 2: Weekday (0..6) x Hours (6..20)
    const HOURS_RANGE = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
    const weekdayHourMatrix = WEEKDAYS_RO.map((dayLabel, dIdx) => {
        const hoursObj = {}
        HOURS_RANGE.forEach(h => { hoursObj[h] = { sqm: 0, count: 0 } })
        return {
            dayIdx: dIdx,
            dayLabel,
            totalSqm: 0,
            totalCount: 0,
            hours: hoursObj
        }
    })

    const sizeBuckets = {
        small: { key: 'small', label: '< 80 m² (Forfait)', count: 0, sqm: 0, revenue: 0 },
        medium: { key: 'medium', label: '80 – 150 m²', count: 0, sqm: 0, revenue: 0 },
        large: { key: 'large', label: '150 – 250 m²', count: 0, sqm: 0, revenue: 0 },
        xlarge: { key: 'xlarge', label: '> 250 m² (Mari)', count: 0, sqm: 0, revenue: 0 },
    }

    items.forEach(item => {
        totalSqm += item.totalSqm
        chapeSqm += item.chapeSqm
        purSqm += item.purSqm
        epsSqm += item.epsSqm
        totalSand += item.sandTons
        totalCement += item.cementTons
        totalKm += item.km
        totalRevenue += item.revenueNet
        weightedThick += item.chapeSqm * item.avgThickness

        if (item.hasFoil) { foilCount++; foilSqm += item.foilSqm || item.chapeSqm }
        if (item.hasMesh) { meshCount++; meshSqm += item.meshSqm || item.chapeSqm }
        if (item.hasFiber) { fiberCount++; fiberSqm += item.fiberSqm || item.chapeSqm }
        if (item.hasDuramint) { duramintCount++; duramintSqm += item.duramintSqm || item.chapeSqm }
        if (item.status === 'completed' || item.status === 'confirmed') completedCount++
        if (item.isInvoiced) invoicedCount++

        if (item.totalSqm < 80) {
            sizeBuckets.small.count++; sizeBuckets.small.sqm += item.totalSqm; sizeBuckets.small.revenue += item.revenueNet
        } else if (item.totalSqm <= 150) {
            sizeBuckets.medium.count++; sizeBuckets.medium.sqm += item.totalSqm; sizeBuckets.medium.revenue += item.revenueNet
        } else if (item.totalSqm <= 250) {
            sizeBuckets.large.count++; sizeBuckets.large.sqm += item.totalSqm; sizeBuckets.large.revenue += item.revenueNet
        } else {
            sizeBuckets.xlarge.count++; sizeBuckets.xlarge.sqm += item.totalSqm; sizeBuckets.xlarge.revenue += item.revenueNet
        }

        const tName = item.teamName || teamsMap[item.teamId]?.name || unassignedLabel
        const tColor = item.teamColor || teamsMap[item.teamId]?.color || '#64748B'

        // Weekday x Team Heatmap
        const wdRow = weekdayTeamMatrix[item.weekdayIdx] || weekdayTeamMatrix[0]
        wdRow.totalSqm += item.totalSqm
        wdRow.totalCount += 1
        if (!wdRow.teams[tName]) wdRow.teams[tName] = { sqm: 0, count: 0 }
        wdRow.teams[tName].sqm += item.totalSqm
        wdRow.teams[tName].count += 1

        // Weekday x Hour Heatmap
        const whRow = weekdayHourMatrix[item.weekdayIdx] || weekdayHourMatrix[0]
        const clampedHour = Math.min(20, Math.max(6, item.hourSlot || 8))
        whRow.totalSqm += item.totalSqm
        whRow.totalCount += 1
        whRow.hours[clampedHour].sqm += item.totalSqm
        whRow.hours[clampedHour].count += 1

        // Source channel aggregation
        const srcCfg = SOURCE_CONFIG[item.source] || SOURCE_CONFIG.manual
        if (!bySourceMap[srcCfg.label]) {
            bySourceMap[srcCfg.label] = { name: srcCfg.label, color: srcCfg.color, count: 0, sqm: 0, revenue: 0 }
        }
        bySourceMap[srcCfg.label].count += 1
        bySourceMap[srcCfg.label].sqm += item.totalSqm
        bySourceMap[srcCfg.label].revenue += item.revenueNet

        // City / Hub aggregation
        if (!byCityMap[item.city]) {
            byCityMap[item.city] = { name: item.city, count: 0, sqm: 0, revenue: 0 }
        }
        byCityMap[item.city].count += 1
        byCityMap[item.city].sqm += item.totalSqm
        byCityMap[item.city].revenue += item.revenueNet

        // Client aggregation
        const cKey = item.clientName || 'Client'
        if (!byClientMap[cKey]) {
            byClientMap[cKey] = { name: cKey, count: 0, sqm: 0, revenue: 0 }
        }
        byClientMap[cKey].count += 1
        byClientMap[cKey].sqm += item.totalSqm
        byClientMap[cKey].revenue += item.revenueNet

        // Day aggregation
        if (item.date) {
            if (!byDayMap[item.date]) {
                byDayMap[item.date] = {
                    rawDate: item.date,
                    volume: 0,
                    chape: 0,
                    pur: 0,
                    eps: 0,
                    count: 0,
                    km: 0,
                    sand: 0,
                    cement: 0,
                    revenue: 0,
                    teams: {}
                }
            }
            const dObj = byDayMap[item.date]
            dObj.volume += item.totalSqm
            dObj.chape += item.chapeSqm
            dObj.pur += item.purSqm
            dObj.eps += item.epsSqm
            dObj.count += 1
            dObj.km += item.km
            dObj.sand += item.sandTons
            dObj.cement += item.cementTons
            dObj.revenue += item.revenueNet
            dObj.teams[tName] = (dObj.teams[tName] || 0) + item.totalSqm
        }

        // Team aggregation
        if (!byTeamMap[tName]) {
            byTeamMap[tName] = {
                name: tName,
                color: tColor,
                count: 0,
                volume: 0,
                chape: 0,
                pur: 0,
                eps: 0,
                sand: 0,
                cement: 0,
                km: 0,
                revenue: 0,
                weightedThick: 0,
                activeDaysSet: new Set()
            }
        }
        const tm = byTeamMap[tName]
        tm.count += 1
        tm.volume += item.totalSqm
        tm.chape += item.chapeSqm
        tm.pur += item.purSqm
        tm.eps += item.epsSqm
        tm.sand += item.sandTons
        tm.cement += item.cementTons
        tm.km += item.km
        tm.revenue += item.revenueNet
        tm.weightedThick += item.chapeSqm * item.avgThickness
        if (item.date) tm.activeDaysSet.add(item.date)
    })

    const activeDaysCount = Object.keys(byDayMap).length || 1
    const byTeam = Object.values(byTeamMap)
        .map((tm, idx) => {
            const activeDays = tm.activeDaysSet.size || 1
            const avgSqmPerWork = tm.count > 0 ? Math.round(tm.volume / tm.count) : 0
            const avgSqmPerDay = Math.round(tm.volume / activeDays)
            const avgThick = tm.chape > 0 ? Number((tm.weightedThick / tm.chape).toFixed(1)) : 6.0
            const efficiencySqmPerKm = tm.km > 0 ? Number((tm.volume / tm.km).toFixed(1)) : 0
            const sharePct = totalSqm > 0 ? Number(((tm.volume / totalSqm) * 100).toFixed(1)) : 0
            return {
                id: tm.name,
                name: tm.name,
                color: tm.color && tm.color !== '#64748B' ? tm.color : TEAM_PALETTE[idx % TEAM_PALETTE.length],
                count: tm.count,
                activeDays,
                volume: Math.round(tm.volume),
                chape: Math.round(tm.chape),
                pur: Math.round(tm.pur + tm.eps),
                sand: Number(tm.sand.toFixed(1)),
                cement: Number(tm.cement.toFixed(1)),
                km: Number(tm.km.toFixed(1)),
                revenue: Math.round(tm.revenue),
                avgRevenuePerWork: tm.count > 0 ? Math.round(tm.revenue / tm.count) : 0,
                avgSqmPerWork,
                avgSqmPerDay,
                avgThick,
                efficiencySqmPerKm,
                sharePct
            }
        })
        .sort((a, b) => b.volume - a.volume)

    let cumVol = 0
    let cumRev = 0
    let cumCount = 0
    const byDay = Object.values(byDayMap)
        .sort((a, b) => a.rawDate.localeCompare(b.rawDate))
        .map(d => {
            const formattedDate = new Date(d.rawDate).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' })
            const teamValues = {}
            Object.entries(d.teams).forEach(([k, v]) => {
                teamValues[k] = Math.round(v)
            })
            cumVol += Math.round(d.volume)
            cumRev += Math.round(d.revenue)
            cumCount += d.count
            return {
                rawDate: d.rawDate,
                date: formattedDate,
                volume: Math.round(d.volume),
                cumVolume: cumVol,
                chape: Math.round(d.chape),
                pur: Math.round(d.pur + d.eps),
                count: d.count,
                cumCount,
                km: Math.round(d.km),
                sand: Number(d.sand.toFixed(1)),
                cement: Number(d.cement.toFixed(1)),
                revenue: Math.round(d.revenue),
                cumRevenue: cumRev,
                ...teamValues
            }
        })

    const bySource = Object.values(bySourceMap)
        .map(s => ({
            ...s,
            sqm: Math.round(s.sqm),
            revenue: Math.round(s.revenue),
            pct: totalOrders > 0 ? Math.round((s.count / totalOrders) * 100) : 0
        }))
        .sort((a, b) => b.count - a.count)

    const topCities = Object.values(byCityMap)
        .map(c => ({
            ...c,
            sqm: Math.round(c.sqm),
            revenue: Math.round(c.revenue),
            pct: totalSqm > 0 ? Math.round((c.sqm / totalSqm) * 100) : 0
        }))
        .sort((a, b) => b.sqm - a.sqm)
        .slice(0, 6)

    const topClients = Object.values(byClientMap)
        .map(c => ({
            ...c,
            sqm: Math.round(c.sqm),
            revenue: Math.round(c.revenue),
            pct: totalSqm > 0 ? Math.round((c.sqm / totalSqm) * 100) : 0
        }))
        .sort((a, b) => b.sqm - a.sqm)
        .slice(0, 6)

    const peakDaySqm = byDay.reduce((max, d) => Math.max(max, d.volume), 0)

    return {
        totalOrders,
        completedCount,
        invoicedCount,
        totalSqm: Math.round(totalSqm),
        chapeSqm: Math.round(chapeSqm),
        purSqm: Math.round(purSqm),
        epsSqm: Math.round(epsSqm),
        totalSand: Number(totalSand.toFixed(1)),
        totalCement: Number(totalCement.toFixed(1)),
        totalKm: Number(totalKm.toFixed(1)),
        totalRevenue: Math.round(totalRevenue),
        avgSqmPerOrder: totalOrders > 0 ? Math.round(totalSqm / totalOrders) : 0,
        avgRevenuePerOrder: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
        avgPricePerSqm: totalSqm > 0 ? Number((totalRevenue / totalSqm).toFixed(1)) : 0,
        avgKmPerOrder: totalOrders > 0 ? Number((totalKm / totalOrders).toFixed(1)) : 0,
        efficiencySqmPerKm: totalKm > 0 ? Number((totalSqm / totalKm).toFixed(1)) : 0,
        avgThickness: chapeSqm > 0 ? Number((weightedThick / chapeSqm).toFixed(1)) : 6.0,
        avgSqmPerActiveDay: Math.round(totalSqm / activeDaysCount),
        peakDaySqm,
        activeDaysCount,
        options: {
            foil: { count: foilCount, sqm: Math.round(foilSqm), pct: totalOrders > 0 ? Math.round((foilCount / totalOrders) * 100) : 0 },
            mesh: { count: meshCount, sqm: Math.round(meshSqm), pct: totalOrders > 0 ? Math.round((meshCount / totalOrders) * 100) : 0 },
            fiber: { count: fiberCount, sqm: Math.round(fiberSqm), pct: totalOrders > 0 ? Math.round((fiberCount / totalOrders) * 100) : 0 },
            duramint: { count: duramintCount, sqm: Math.round(duramintSqm), pct: totalOrders > 0 ? Math.round((duramintCount / totalOrders) * 100) : 0 }
        },
        sizeBuckets,
        byDay,
        byTeam,
        bySource,
        topCities,
        topClients,
        weekdayTeamMatrix,
        weekdayHourMatrix
    }
}

function calcDeltaPct(curr, prev) {
    if (!prev || prev <= 0) return curr > 0 ? 100 : 0
    return Math.round(((curr - prev) / prev) * 100)
}

let _reportsMemoryCache = {
    workOrders: (typeof window !== 'undefined' && window.__adminInvoiceOrdersCache) || null,
    pricingSettings: (typeof window !== 'undefined' && window.__adminPricingSettingsCache) || null,
    teamsList: (typeof window !== 'undefined' && window.__adminTeamsCache) || null,
    lastUpdated: ''
}

export default function ScreedsReports() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(() => !((typeof window !== 'undefined' && window.__adminInvoiceOrdersCache) || _reportsMemoryCache.workOrders))
    const [allWorkOrders, setAllWorkOrders] = useState(() => (typeof window !== 'undefined' && window.__adminInvoiceOrdersCache) || _reportsMemoryCache.workOrders || [])
    const [pricingSettings, setPricingSettings] = useState(() => (typeof window !== 'undefined' && window.__adminPricingSettingsCache) || _reportsMemoryCache.pricingSettings || null)
    const [teamsList, setTeamsList] = useState(() => (typeof window !== 'undefined' && window.__adminTeamsCache) || _reportsMemoryCache.teamsList || [])
    const [lastUpdated, setLastUpdated] = useState(() => _reportsMemoryCache.lastUpdated || '')

    // Period & Filters (Default: Luna curentă comparată cu Luna trecută)
    const [activePreset, setActivePreset] = useState('current_month')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [comparePrev, setComparePrev] = useState(true)
    const [selectedTeamFilter, setSelectedTeamFilter] = useState('all')
    const [selectedServiceFilter, setSelectedServiceFilter] = useState('all')
    const [selectedWeekdayFilter, setSelectedWeekdayFilter] = useState(null) // null | 0..6

    // Widget Mode Switchers (Inspired by Reference Dashboards 1 & 2)
    const [cumulativeMode, setCumulativeMode] = useState('cumulative_sqm') // 'cumulative_sqm' | 'cumulative_rev' | 'daily_teams' | 'daily_vol_km'
    const [heatmapMode, setHeatmapMode] = useState('team_weekday') // 'team_weekday' | 'hour_weekday'
    const [rankingMode, setRankingMode] = useState('cities') // 'cities' | 'clients'
    const [structureTab, setStructureTab] = useState('teams') // 'teams' | 'services' | 'sizes' | 'channels'
    const [activeTableTab, setActiveTableTab] = useState('teams') // 'teams' | 'orders' | 'real_thickness'

    useEffect(() => {
        applyPreset('current_month')
        fetchAllData()
    }, [])

    const applyPreset = (presetKey) => {
        const now = new Date()
        let start = new Date(now)
        let end = new Date(now)

        if (presetKey === 'today') {
            // today
        } else if (presetKey === 'yesterday') {
            start.setDate(now.getDate() - 1)
            end.setDate(now.getDate() - 1)
        } else if (presetKey === 'last_7') {
            start.setDate(now.getDate() - 7)
        } else if (presetKey === 'last_30') {
            start.setDate(now.getDate() - 30)
        } else if (presetKey === 'current_month') {
            start = new Date(now.getFullYear(), now.getMonth(), 1)
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        } else if (presetKey === 'prev_month') {
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            end = new Date(now.getFullYear(), now.getMonth(), 0)
        } else if (presetKey === 'current_year') {
            start = new Date(now.getFullYear(), 0, 1)
            end = new Date(now.getFullYear(), 11, 31)
        } else if (presetKey === 'all') {
            start = new Date(2024, 0, 1)
            end = new Date(now.getFullYear() + 1, 11, 31)
        }

        setActivePreset(presetKey)
        setSelectedWeekdayFilter(null)
        setDateFrom(toLocalISO(start))
        setDateTo(toLocalISO(end))
    }

    const fetchAllData = async (isBackground = false) => {
        try {
            const hasCache = Boolean((typeof window !== 'undefined' && window.__adminInvoiceOrdersCache) || _reportsMemoryCache.workOrders)
            if (!isBackground && !hasCache) setLoading(true)
            const [woRes, pricingRes, teamsRes] = await Promise.all([
                api.get('/admin/work-orders?limit=1000&invoice_mode=true'),
                api.get('/admin/pricing-settings').catch(() => ({ data: null })),
                api.get('/admin/teams').catch(() => ({ data: [] }))
            ])
            const wos = (Array.isArray(woRes.data) ? woRes.data : (woRes.data?.items || [])).filter(w => w.status !== 'deleted')
            const ps = pricingRes.data || _reportsMemoryCache.pricingSettings || null
            const tms = Array.isArray(teamsRes.data) ? teamsRes.data : []
            const nowStr = new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

            _reportsMemoryCache = { workOrders: wos, pricingSettings: ps, teamsList: tms, lastUpdated: nowStr }
            if (typeof window !== 'undefined') {
                window.__adminInvoiceOrdersCache = wos
                if (ps) window.__adminPricingSettingsCache = ps
                if (tms.length > 0) window.__adminTeamsCache = tms
            }
            setAllWorkOrders(wos)
            setPricingSettings(ps)
            setTeamsList(tms)
            setLastUpdated(nowStr)
        } catch (e) {
            console.error('Error loading reports data:', e)
        } finally {
            setLoading(false)
        }
    }

    const teamsMap = useMemo(() => {
        const map = {}
        teamsList.forEach((tm, idx) => {
            map[tm.id] = {
                name: tm.name,
                color: tm.color || TEAM_PALETTE[idx % TEAM_PALETTE.length]
            }
        })
        return map
    }, [teamsList])

    const normalizedOrders = useMemo(() => {
        return allWorkOrders
            .filter(wo => !wo.is_quote || wo.assigned_team_id || wo.start_date)
            .map(wo => extractOrderMetrics(wo, pricingSettings))
            .filter(item => item.date)
    }, [allWorkOrders, pricingSettings])

    const { currentItems, prevItems, allTeamsInPeriod, prevRangeLabel } = useMemo(() => {
        if (!dateFrom || !dateTo) {
            return { currentItems: [], prevItems: [], allTeamsInPeriod: [], prevRangeLabel: '' }
        }
        const startStr = dateFrom.replace(/-/g, '')
        const endStr = dateTo.replace(/-/g, '')

        const dStart = new Date(dateFrom)
        const dEnd = new Date(dateTo)

        // REGULĂ COMPARAȚIE: Comparăm întotdeauna cu LUNA TRECUTĂ (nu cu ziua trecută!)
        // - Pentru 'current_month', 'prev_month' sau 'last_30': toată luna calendaristică anterioară (01..31 luna trecută)
        // - Pentru intervale scurte ('today', 'yesterday', 'last_7', 'custom'): exact aceleași zile din luna calendaristică trecută (shift cu -1 lună)
        let prevStart
        let prevEnd
        if (activePreset === 'current_month' || activePreset === 'prev_month' || activePreset === 'last_30') {
            prevStart = new Date(dStart.getFullYear(), dStart.getMonth() - 1, 1)
            prevEnd = new Date(dStart.getFullYear(), dStart.getMonth(), 0)
        } else if (activePreset === 'current_year') {
            prevStart = new Date(dStart.getFullYear() - 1, 0, 1)
            prevEnd = new Date(dStart.getFullYear() - 1, 11, 31)
        } else {
            // Shift exact dates by -1 calendar month (clamped to valid day of previous month)
            const shiftBackOneMonth = (dt) => {
                const targetMonth = dt.getMonth() - 1
                const maxDayInPrevMonth = new Date(dt.getFullYear(), targetMonth + 1, 0).getDate()
                return new Date(dt.getFullYear(), targetMonth, Math.min(dt.getDate(), maxDayInPrevMonth))
            }
            prevStart = shiftBackOneMonth(dStart)
            prevEnd = shiftBackOneMonth(dEnd)
        }

        const prevStartIso = toLocalISO(prevStart)
        const prevEndIso = toLocalISO(prevEnd)
        const prevStartStr = prevStartIso.replace(/-/g, '')
        const prevEndStr = prevEndIso.replace(/-/g, '')

        const unassignedLabel = t('reports.unassigned_team', 'Fără Echipă')

        const matchesServiceAndTeam = (item) => {
            if (selectedTeamFilter !== 'all') {
                const tName = item.teamName || teamsMap[item.teamId]?.name || unassignedLabel
                if (tName !== selectedTeamFilter) return false
            }
            if (selectedServiceFilter === 'chape' && item.chapeSqm <= 0) return false
            if (selectedServiceFilter === 'pur' && item.purSqm <= 0) return false
            if (selectedServiceFilter === 'eps' && item.epsSqm <= 0) return false
            if (selectedWeekdayFilter !== null && item.weekdayIdx !== selectedWeekdayFilter) return false
            return true
        }

        const inCurrentRange = normalizedOrders.filter(item => {
            const d = item.date.replace(/-/g, '')
            return d >= startStr && d <= endStr
        })

        const teamCounts = {}
        inCurrentRange.forEach((item, idx) => {
            const tName = item.teamName || teamsMap[item.teamId]?.name || unassignedLabel
            const tColor = item.teamColor || teamsMap[item.teamId]?.color || TEAM_PALETTE[idx % TEAM_PALETTE.length]
            if (!teamCounts[tName]) teamCounts[tName] = { name: tName, color: tColor, count: 0, sqm: 0 }
            teamCounts[tName].count += 1
            teamCounts[tName].sqm += item.totalSqm
        })

        const currFiltered = inCurrentRange.filter(matchesServiceAndTeam)
        const prevFiltered = normalizedOrders.filter(item => {
            const d = item.date.replace(/-/g, '')
            return d >= prevStartStr && d <= prevEndStr && matchesServiceAndTeam(item)
        })

        const fmtShort = (iso) => new Date(iso).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' })
        const isSamePrevDay = prevStartIso === prevEndIso

        return {
            currentItems: currFiltered,
            prevItems: prevFiltered,
            allTeamsInPeriod: Object.values(teamCounts).sort((a, b) => b.sqm - a.sqm),
            prevRangeLabel: isSamePrevDay ? `Luna Trecută (${fmtShort(prevStartIso)})` : `Luna Trecută (${fmtShort(prevStartIso)} – ${fmtShort(prevEndIso)})`
        }
    }, [normalizedOrders, dateFrom, dateTo, activePreset, selectedTeamFilter, selectedServiceFilter, selectedWeekdayFilter, teamsMap, t])

    const unassignedLabel = t('reports.unassigned_team', 'Fără Echipă')
    const currentStats = useMemo(() => summarizePeriod(currentItems, teamsMap, unassignedLabel), [currentItems, teamsMap, unassignedLabel])
    const prevStats = useMemo(() => summarizePeriod(prevItems, teamsMap, unassignedLabel), [prevItems, teamsMap, unassignedLabel])

    // Build Paired Cumulative Trajectory Data (Current Period vs Previous Month aligned by Day of Month / Calendar Step)
    const cumulativeComparisonData = useMemo(() => {
        const currDays = currentStats.byDay
        const prevDays = prevStats.byDay
        if (currDays.length === 0 && prevDays.length === 0) return []

        // Indexăm zilele din luna trecută după ziua din lună (1..31) pentru aliniere directă (ex: 18 nov. comparat cu 18 oct.)
        const prevByDayOfMonth = {}
        prevDays.forEach(p => {
            const dom = new Date(p.rawDate).getDate()
            prevByDayOfMonth[dom] = p
        })

        // Păstrăm pe axa X exclusiv zilele perioadei curente (sau zilele lunii dacă perioada curentă are date),
        // eliminând etichetele reziduale de tip "Ziua 22 (28 oct.)" la finalul graficului
        const baseDays = currDays.length > 0 ? currDays : prevDays
        const aligned = []
        let lastPrevVol = 0
        let lastPrevRev = 0
        let lastPrevCnt = 0

        baseDays.forEach((c, idx) => {
            const dom = new Date(c.rawDate).getDate()
            // Căutăm valoarea cumulată din luna trecută până la aceeași zi a lunii (<= dom)
            let matchedPrev = prevByDayOfMonth[dom]
            if (!matchedPrev) {
                for (let d = dom; d >= 1; d--) {
                    if (prevByDayOfMonth[d]) {
                        matchedPrev = prevByDayOfMonth[d]
                        break
                    }
                }
            }
            if (!matchedPrev && prevDays[idx]) {
                matchedPrev = prevDays[idx]
            }
            if (matchedPrev) {
                lastPrevVol = matchedPrev.cumVolume
                lastPrevRev = matchedPrev.cumRevenue
                lastPrevCnt = matchedPrev.cumCount
            }

            aligned.push({
                label: c.date,
                prevDateLabel: matchedPrev ? matchedPrev.date : 'Luna trecută',
                currCumVolume: currDays.length > 0 ? c.cumVolume : 0,
                prevCumVolume: lastPrevVol,
                currCumRevenue: currDays.length > 0 ? c.cumRevenue : 0,
                prevCumRevenue: lastPrevRev,
                currCumCount: currDays.length > 0 ? c.cumCount : 0,
                prevCumCount: lastPrevCnt,
                currDailyVolume: currDays.length > 0 ? c.volume : 0,
                prevDailyVolume: matchedPrev ? matchedPrev.volume : 0
            })
        })
        return aligned
    }, [currentStats.byDay, prevStats.byDay])

    const handleExportCSV = () => {
        const headers = ['Deviz', 'Data', 'Oras', 'Client', 'Adresa', 'Echipa', 'Chape m2', 'PUR/EPS m2', 'Total m2', 'Grosime cm', 'Nisip T', 'Ciment T', 'Traseu KM', 'Valoare EUR']
        const rows = currentItems.map(i => [
            i.quoteNumber,
            i.date,
            `"${i.city}"`,
            `"${String(i.clientName).replace(/"/g, '""')}"`,
            `"${String(i.address).replace(/"/g, '""')}"`,
            `"${String(i.teamName || unassignedLabel).replace(/"/g, '""')}"`,
            Math.round(i.chapeSqm),
            Math.round(i.purSqm + i.epsSqm),
            Math.round(i.totalSqm),
            i.avgThickness.toFixed(1),
            i.sandTons.toFixed(1),
            i.cementTons.toFixed(1),
            i.km.toFixed(1),
            Math.round(i.revenueNet)
        ])
        const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
        const link = document.createElement('a')
        link.href = encodeURI(csvContent)
        link.download = `raport_inteligent_${dateFrom}_${dateTo}.csv`
        link.click()
    }

    const renderDeltaBadge = (currVal, prevVal, suffix = '') => {
        if (!comparePrev) return null
        const pct = calcDeltaPct(currVal, prevVal)
        const isPos = pct >= 0
        return (
            <span className={`inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-[12.5px] font-extrabold tabular-nums ${
                pct === 0
                    ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    : isPos
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25'
                        : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/25'
            }`} title={`Față de ${prevRangeLabel}: ${prevVal.toLocaleString('fr-FR')}${suffix}`}>
                {isPos ? <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" /> : <ArrowDownRight className="w-3.5 h-3.5 stroke-[2.5]" />}
                {isPos ? `+${pct}%` : `${pct}%`}
            </span>
        )
    }

    // Heatmap color intensity helper
    const getHeatCellClass = (val, maxVal) => {
        if (!val || val <= 0) return 'bg-slate-100/80 dark:bg-slate-800/50 text-slate-300 dark:text-slate-700 border-slate-200/50 dark:border-slate-800'
        const ratio = maxVal > 0 ? val / maxVal : 0
        if (ratio >= 0.75) return 'bg-amber-500 text-white font-black shadow-sm border-amber-600'
        if (ratio >= 0.45) return 'bg-emerald-500 text-white font-black shadow-2xs border-emerald-600'
        if (ratio >= 0.2) return 'bg-emerald-500/25 text-emerald-900 dark:text-emerald-200 font-extrabold border-emerald-500/30'
        return 'bg-blue-500/15 text-blue-800 dark:text-blue-300 font-bold border-blue-500/25'
    }

    const topTeam = currentStats.byTeam[0] || null
    const chapeSharePct = currentStats.totalSqm > 0 ? Math.round((currentStats.chapeSqm / currentStats.totalSqm) * 100) : 100
    const purSharePct = 100 - chapeSharePct

    // Table Columns
    const teamColumns = [
        {
            key: 'name',
            label: t('reports.col_team', 'Équipe'),
            sortable: true,
            render: r => (
                <div className="flex items-center gap-3">
                    <span className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: r.color }} />
                    <div>
                        <span className="font-black text-slate-900 dark:text-white text-[16px] tracking-tight block">{r.name}</span>
                        <span className="text-[12.5px] font-semibold text-slate-500">{r.activeDays} zile active</span>
                    </div>
                </div>
            )
        },
        {
            key: 'count',
            label: t('reports.col_works', 'Chantiers'),
            sortable: true,
            render: r => (
                <div className="tabular-nums">
                    <span className="font-black text-slate-900 dark:text-white text-[17px]">{r.count}</span>
                    <span className="block text-[12.5px] font-semibold text-slate-500">
                        {(r.count / r.activeDays).toFixed(1)} / zi
                    </span>
                </div>
            )
        },
        {
            key: 'volume',
            label: t('reports.col_volume', 'Volume Turnat (m²)'),
            sortable: true,
            render: r => (
                <div className="tabular-nums">
                    <span className="font-black text-[color:var(--tenant-bg)] dark:text-sky-400 text-[17.5px]">{r.volume.toLocaleString('fr-FR')} m²</span>
                    <span className="block text-[12.5px] font-semibold text-slate-500">
                        Chape: {r.chape.toLocaleString('fr-FR')} m² {r.pur > 0 ? `• PUR: ${r.pur.toLocaleString('fr-FR')} m²` : ''}
                    </span>
                </div>
            )
        },
        {
            key: 'avgSqmPerWork',
            label: 'Medie / Lucrare',
            sortable: true,
            render: r => (
                <div className="tabular-nums">
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 text-[16px]">{r.avgSqmPerWork} m²</span>
                    <span className="block text-[12.5px] font-semibold text-slate-500">
                        {r.avgSqmPerDay} m²/zi • ~{r.avgThick} cm
                    </span>
                </div>
            )
        },
        {
            key: 'sand',
            label: 'Nisip & Ciment',
            sortable: true,
            render: r => (
                <div className="tabular-nums">
                    <span className="font-black text-amber-600 dark:text-amber-400 text-[16.5px]">{r.sand.toLocaleString('fr-FR')} T nisip</span>
                    <span className="block text-[12.5px] font-semibold text-slate-500">
                        {r.cement.toLocaleString('fr-FR')} T ciment
                    </span>
                </div>
            )
        },
        {
            key: 'km',
            label: 'Traseu & Randament',
            sortable: true,
            render: r => (
                <div className="tabular-nums">
                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-[16.5px]">{r.km.toLocaleString('fr-FR')} km</span>
                    <span className="block text-[12.5px] font-semibold text-slate-500">
                        {r.efficiencySqmPerKm > 0 ? `${r.efficiencySqmPerKm} m² / km` : '—'}
                    </span>
                </div>
            )
        },
        {
            key: 'revenue',
            label: 'Valoare (€ HT)',
            sortable: true,
            render: r => (
                <div className="tabular-nums">
                    <span className="font-black text-slate-900 dark:text-white text-[17.5px] whitespace-nowrap">
                        {r.revenue.toLocaleString('fr-FR')} €
                    </span>
                    <span className="block text-[12.5px] font-semibold text-slate-500 whitespace-nowrap">
                        Ø {r.avgRevenuePerWork.toLocaleString('fr-FR')} € / lucrare
                    </span>
                </div>
            )
        },
        {
            key: 'sharePct',
            label: 'Pondere Companie',
            sortable: true,
            render: r => (
                <div className="w-36">
                    <div className="flex items-center justify-between text-[13.5px] font-extrabold text-slate-700 dark:text-slate-300 mb-1 tabular-nums">
                        <span>{r.sharePct}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, r.sharePct)}%`, backgroundColor: r.color }} />
                    </div>
                </div>
            )
        }
    ]

    const orderColumns = [
        {
            key: 'quoteNumber',
            label: 'Deviz / Dată',
            sortable: true,
            render: r => (
                <div className="cursor-pointer group" onClick={() => navigate(`/admin/work-orders/${r.id}`)}>
                    <span className="font-black text-[17px] text-slate-900 dark:text-white group-hover:text-[color:var(--tenant-bg)] transition-colors tabular-nums block">
                        {r.quoteNumber}
                    </span>
                    <span className="text-[13px] font-semibold text-slate-500 tabular-nums">
                        {new Date(r.date).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </span>
                </div>
            )
        },
        {
            key: 'clientName',
            label: 'Client & Oraș',
            sortable: true,
            render: r => (
                <div className="max-w-xs cursor-pointer" onClick={() => navigate(`/admin/work-orders/${r.id}`)}>
                    <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-slate-900 dark:text-white text-[16px] truncate">{r.clientName}</span>
                        <span className="px-2 py-0.2 rounded-full text-[11px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">{r.city}</span>
                    </div>
                    <span className="text-[13px] font-medium text-slate-500 truncate flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {r.address}
                    </span>
                </div>
            )
        },
        {
            key: 'teamName',
            label: 'Équipe',
            sortable: true,
            render: r => {
                const tName = r.teamName || teamsMap[r.teamId]?.name || unassignedLabel
                const tColor = r.teamColor || teamsMap[r.teamId]?.color || '#64748B'
                return (
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[13.5px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tColor }} />
                        {tName}
                    </span>
                )
            }
        },
        {
            key: 'totalSqm',
            label: 'Suprafață & Grosime',
            sortable: true,
            render: r => (
                <div className="tabular-nums">
                    <span className="font-black text-slate-900 dark:text-white text-[16.5px]">
                        {Math.round(r.totalSqm)} m² <span className="text-slate-400 font-bold">· {r.avgThickness.toFixed(1)} cm</span>
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {r.chapeSqm > 0 && <span className="text-[11.5px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Chape {Math.round(r.chapeSqm)}m²</span>}
                        {r.purSqm > 0 && <span className="text-[11.5px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">PUR {Math.round(r.purSqm)}m²</span>}
                        {r.hasFiber && <span className="text-[11px] font-extrabold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">FIBRĂ</span>}
                        {r.hasFoil && <span className="text-[11px] font-extrabold px-1.5 py-0.5 rounded bg-sky-50 text-sky-700">FILM</span>}
                        {r.hasMesh && <span className="text-[11px] font-extrabold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700">PLASĂ</span>}
                    </div>
                </div>
            )
        },
        {
            key: 'sandTons',
            label: 'Materiale (Est.)',
            sortable: true,
            render: r => (
                <div className="tabular-nums">
                    <span className="font-extrabold text-amber-600 dark:text-amber-400 text-[15.5px] block">{r.sandTons.toFixed(1)} T nisip</span>
                    <span className="text-[12.5px] font-semibold text-slate-500">{r.cementTons.toFixed(1)} T ciment</span>
                </div>
            )
        },
        {
            key: 'km',
            label: 'Traseu',
            sortable: true,
            render: r => (
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-[15.5px] tabular-nums">
                    {r.km > 0 ? `${r.km.toFixed(0)} km` : '—'}
                </span>
            )
        },
        {
            key: 'revenueNet',
            label: 'Valoare (€ HT)',
            sortable: true,
            render: r => (
                <span className="font-black text-slate-900 dark:text-white text-[17.5px] tabular-nums whitespace-nowrap">
                    {r.revenueNet > 0 ? `${r.revenueNet.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : '—'}
                </span>
            )
        },
        {
            key: 'actions',
            label: '',
            render: r => (
                <button
                    onClick={() => navigate(`/admin/work-orders/${r.id}`)}
                    className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-[color:var(--tenant-bg)] hover:bg-slate-50 transition-colors cursor-pointer"
                    title={t('common.view', 'Vezi Detalii')}
                >
                    <Eye className="w-4 h-4" />
                </button>
            )
        }
    ]

    const realThicknessOrders = useMemo(() => currentItems.filter(i => i.chapeSqm > 0 && i.sandTons > 0), [currentItems])
    const realThicknessColumns = [
        {
            key: 'quoteNumber',
            label: 'Lucrare / Client',
            sortable: true,
            render: r => (
                <div className="cursor-pointer group" onClick={() => navigate(`/admin/work-orders/${r.id}`)}>
                    <span className="font-black text-[color:var(--tenant-bg)] group-hover:underline text-[16px] block">
                        {r.quoteNumber} — {r.clientName}
                    </span>
                    <span className="text-[12.5px] text-slate-500">{r.address}</span>
                </div>
            )
        },
        {
            key: 'teamName',
            label: 'Echipă',
            sortable: true,
            render: r => <span className="font-bold text-slate-800 dark:text-slate-200">{r.teamName || teamsMap[r.teamId]?.name || unassignedLabel}</span>
        },
        {
            key: 'date',
            label: 'Data Lucrării',
            sortable: true,
            render: r => <span className="font-semibold text-slate-600 tabular-nums">{new Date(r.date).toLocaleDateString('ro-RO')}</span>
        },
        {
            key: 'chapeSqm',
            label: 'Suprafață Chape (m²)',
            sortable: true,
            render: r => <span className="font-black text-slate-900 dark:text-white tabular-nums">{Math.round(r.actualSurface || r.chapeSqm)} m²</span>
        },
        {
            key: 'sandTons',
            label: 'Cantitate Nisip (T / kg)',
            sortable: true,
            render: r => (
                <span className="font-extrabold text-amber-600 tabular-nums">
                    {r.sandTons.toFixed(2)} T ({Math.round(r.sandTons * 1000).toLocaleString('fr-FR')} kg)
                </span>
            )
        },
        {
            key: 'realThick',
            label: 'Grosime Calculată (Nisip / m² / 16)',
            render: r => {
                const surf = r.actualSurface || r.chapeSqm
                const sandKg = r.sandTons * 1000
                const calcCm = surf > 0 ? (sandKg / surf / 16) : 0
                return (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[14px] font-black bg-emerald-500/15 text-emerald-700 border border-emerald-500/25 tabular-nums">
                        {calcCm.toFixed(2)} cm
                    </span>
                )
            }
        }
    ]

    // Max heatmap value for color scaling
    const maxHeatTeamSqm = useMemo(() => {
        let m = 0
        currentStats.weekdayTeamMatrix.forEach(row => {
            Object.values(row.teams).forEach(cell => {
                if (cell.sqm > m) m = cell.sqm
            })
        })
        return m || 1
    }, [currentStats.weekdayTeamMatrix])

    const maxHeatHourSqm = useMemo(() => {
        let m = 0
        currentStats.weekdayHourMatrix.forEach(row => {
            Object.values(row.hours).forEach(cell => {
                if (cell.sqm > m) m = cell.sqm
            })
        })
        return m || 1
    }, [currentStats.weekdayHourMatrix])

    const rankingList = rankingMode === 'cities' ? currentStats.topCities : currentStats.topClients
    const maxRankingSqm = rankingList[0]?.sqm || 1

    return (
        <div className="w-full space-y-4">
            {/* ── 1. HEADER & LIVE STATUS ───────────────────────────────────────────── */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <h1 className="text-[24px] font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                            {t('reports.company_analysis', 'Rapoarte & Analitică Inteligentă')}
                        </h1>
                        <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[13px] font-extrabold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Live
                        </span>
                    </div>
                    <p className="text-[13.5px] font-semibold text-slate-500 dark:text-slate-400 mt-1">
                        {t('reports.company_analysis_desc', 'Monitorizare centralizată, evoluție cumulată, hartă termică pe echipe și analiză comparativă')}
                    </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    {lastUpdated && (
                        <span className="text-[13px] font-semibold text-slate-400 mr-1 tabular-nums">
                            Sincronizat: {lastUpdated}
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={() => setComparePrev(!comparePrev)}
                        className={`h-10 px-4 rounded-full text-[13.5px] font-bold border transition-all inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${
                            comparePrev
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                : 'bg-white dark:bg-slate-800 text-slate-600 border-slate-200/90 dark:border-slate-700'
                        }`}
                    >
                        <TrendingUp className="w-4 h-4 shrink-0" />
                        <span>vs. {prevRangeLabel}</span>
                    </button>
                    <button
                        type="button"
                        onClick={fetchAllData}
                        className="h-10 px-4 rounded-full bg-white hover:bg-slate-50 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[13.5px] font-bold inline-flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                    >
                        <RefreshCw className={`w-4 h-4 shrink-0 ${loading ? 'animate-spin' : ''}`} />
                        <span>Reîncarcă</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleExportCSV}
                        className="h-10 px-4 rounded-full bg-[color:var(--tenant-bg)] hover:brightness-95 text-white text-[13.5px] font-bold inline-flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer whitespace-nowrap"
                    >
                        <FileSpreadsheet className="w-4 h-4 shrink-0" />
                        <span>Export CSV</span>
                    </button>
                </div>
            </div>

            {/* ── 2. CAPACITATE & ÎNCĂRCARE ECHIPE (Zero default selection border on first card) ── */}
            {!loading && currentStats.byTeam.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                    {/* Total Active Teams Card — Neutral border like all other cards */}
                    <div
                        onClick={() => setSelectedTeamFilter('all')}
                        className="bg-white dark:bg-slate-900 rounded-[20px] p-5 border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.06)] cursor-pointer transition-all relative overflow-hidden flex flex-col justify-between"
                    >
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[14px] font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                Echipe în Teren
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/15 text-emerald-700">Activ</span>
                        </div>
                        <div className="text-[26px] font-black text-slate-900 dark:text-white tabular-nums leading-none my-1.5">
                            {currentStats.byTeam.length} <span className="text-[14px] font-bold text-slate-400">echipe</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-2.5">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: '100%' }} />
                        </div>
                    </div>

                    {/* Individual Team Load Cards with Progress Bar */}
                    {currentStats.byTeam.slice(0, 4).map((tm) => {
                        const isSelected = selectedTeamFilter === tm.name
                        return (
                            <div
                                key={tm.name}
                                onClick={() => setSelectedTeamFilter(isSelected ? 'all' : tm.name)}
                                className={`bg-white dark:bg-slate-900 rounded-[20px] p-5 border shadow-[0_4px_16px_-4px_rgba(15,23,42,0.06)] cursor-pointer transition-all relative overflow-hidden flex flex-col justify-between ${
                                    isSelected
                                        ? 'border-[color:var(--tenant-bg)] ring-1 ring-sky-500/20'
                                        : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[14px] font-extrabold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tm.color }} />
                                        {tm.name}
                                    </span>
                                    <span className="text-[12.5px] font-bold text-slate-500 tabular-nums shrink-0">
                                        {tm.count} șant.
                                    </span>
                                </div>
                                <div className="flex items-baseline justify-between my-1.5 tabular-nums">
                                    <span className="text-[25px] font-black text-slate-900 dark:text-white leading-none">
                                        {tm.sharePct}% <span className="text-[13px] font-bold text-slate-400">pondere</span>
                                    </span>
                                    <span className="text-[13.5px] font-extrabold text-[color:var(--tenant-bg)] whitespace-nowrap">
                                        {tm.volume.toLocaleString('fr-FR')} m²
                                    </span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-2.5">
                                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(12, tm.sharePct)}%`, backgroundColor: tm.color }} />
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* ── 3. PERIOD, TEAM & SERVICE FILTER BAR (Every element locked to h-[42px] outer / h-8 inner) ── */}
            <div className="bg-white dark:bg-slate-900 rounded-[20px] shadow-[0_4px_16px_-4px_rgba(15,23,42,0.06)] border border-slate-200/90 dark:border-slate-800 p-3.5">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Date Range Pill (exact h-[42px]) */}
                        <div className="flex items-center gap-2 bg-slate-100/90 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-full px-3.5 h-[42px]">
                            <CalendarDays className="w-4 h-4 text-[color:var(--tenant-bg)] shrink-0" />
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => { setDateFrom(e.target.value); setActivePreset('custom') }}
                                className="ui-date-input bg-transparent text-[13px] font-bold text-slate-800 dark:text-slate-200 outline-none tabular-nums"
                            />
                            <span className="text-slate-400 font-bold">–</span>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => { setDateTo(e.target.value); setActivePreset('custom') }}
                                className="ui-date-input bg-transparent text-[13px] font-bold text-slate-800 dark:text-slate-200 outline-none tabular-nums"
                            />
                        </div>

                        {/* Period Presets (p-1 + border + h-8 inner buttons = exact 42px outer height, single row) */}
                        <div className="inline-flex items-center gap-0.5 bg-slate-100/90 dark:bg-slate-800 p-1 rounded-full border border-slate-200/80 dark:border-slate-700 flex-nowrap overflow-x-auto hide-scrollbar">
                            {[
                                { id: 'today', label: 'Astăzi' },
                                { id: 'yesterday', label: 'Ieri' },
                                { id: 'last_7', label: '7 Zile' },
                                { id: 'last_30', label: '30 Zile' },
                                { id: 'current_month', label: 'Luna curentă' },
                                { id: 'prev_month', label: 'Luna trecută' },
                                { id: 'current_year', label: 'Anul curent' },
                                { id: 'all', label: 'Tot timpul' }
                            ].map(p => (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => applyPreset(p.id)}
                                    className={`h-8 px-2.5 rounded-full text-[12.5px] font-bold inline-flex items-center justify-center transition-all whitespace-nowrap cursor-pointer ${
                                        activePreset === p.id
                                            ? 'bg-[color:var(--tenant-bg)] text-white shadow-xs'
                                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-white/70'
                                    }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right Dropdowns / Filters (exact h-[42px]) */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {selectedWeekdayFilter !== null && (
                            <button
                                type="button"
                                onClick={() => setSelectedWeekdayFilter(null)}
                                className="h-[42px] px-3.5 rounded-full bg-amber-500/15 text-amber-800 border border-amber-500/30 text-[13px] font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
                            >
                                Zi filtrată: {WEEKDAYS_RO[selectedWeekdayFilter]}
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                        <div className="relative flex items-center bg-slate-100/90 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-full pl-3.5 pr-2.5 h-[42px]">
                            <MapPin className="w-4 h-4 text-[color:var(--tenant-bg)] shrink-0 mr-1.5 pointer-events-none" />
                            <select
                                value={selectedTeamFilter}
                                onChange={(e) => setSelectedTeamFilter(e.target.value)}
                                className="bg-transparent pr-2 text-[13px] font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
                            >
                                <option value="all">Toate Echipele ({allTeamsInPeriod.length})</option>
                                {allTeamsInPeriod.map(tm => (
                                    <option key={tm.name} value={tm.name}>{tm.name} ({tm.count} lucrări • {Math.round(tm.sqm)} m²)</option>
                                ))}
                            </select>
                        </div>

                        <div className="relative flex items-center bg-slate-100/90 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-full pl-3.5 pr-2.5 h-[42px]">
                            <Layers className="w-4 h-4 text-[color:var(--tenant-bg)] shrink-0 mr-1.5 pointer-events-none" />
                            <select
                                value={selectedServiceFilter}
                                onChange={(e) => setSelectedServiceFilter(e.target.value)}
                                className="bg-transparent pr-2 text-[13px] font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
                            >
                                <option value="all">Toate Serviciile</option>
                                <option value="chape">Chape (Șapă)</option>
                                <option value="pur">Isolation PUR</option>
                                <option value="eps">Isolation EPS</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200/90 dark:border-slate-800">
                    <Loader2 className="w-10 h-10 text-[color:var(--tenant-bg)] animate-spin mb-4" />
                    <h3 className="text-[18px] font-bold text-slate-700 dark:text-slate-200">Se încarcă analitica inteligentă...</h3>
                </div>
            ) : currentStats.totalOrders === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200/90 dark:border-slate-800">
                    <LayoutGrid className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
                    <h3 className="text-[18px] font-bold text-slate-700 dark:text-slate-300">Nu există lucrări în perioada selectată.</h3>
                    <p className="text-[15px] text-slate-400 mt-1">Selectați „30 Zile”, „Luna curentă” sau „Tot timpul” din bara de mai sus.</p>
                </div>
            ) : (
                <>
                    {/* ── 4. 4 SMART SUMMARY CARDS (Unified p-5 rounded-[20px]) ──────────── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
                        {/* Card 1: Revenue & Avg Check */}
                        <div className="bg-white dark:bg-slate-900 rounded-[20px] p-5 border border-slate-200/90 dark:border-slate-800 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.06)] flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-[14px] font-bold text-slate-600 dark:text-slate-300">Valoare & Facturare</span>
                                <div className="flex items-center gap-2">
                                    {renderDeltaBadge(currentStats.totalRevenue, prevStats.totalRevenue, ' €')}
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/12 text-emerald-600 flex items-center justify-center">
                                        <TrendingUp className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>
                            <div className="my-2">
                                <div className="text-[26px] font-black text-slate-950 dark:text-white tracking-tight tabular-nums leading-none whitespace-nowrap">
                                    {currentStats.totalRevenue.toLocaleString('fr-FR')} <span className="text-[15px] font-bold text-slate-400">€</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-[12.5px] font-semibold text-slate-500 tabular-nums">
                                <span>Medie / lucrare: <strong className="text-slate-900 dark:text-white">{currentStats.avgRevenuePerOrder.toLocaleString('fr-FR')} €</strong></span>
                                <span className="text-emerald-600 font-extrabold">{currentStats.avgPricePerSqm} €/m²</span>
                            </div>
                        </div>

                        {/* Card 2: Orders & Total Volume */}
                        <div className="bg-white dark:bg-slate-900 rounded-[20px] p-5 border border-slate-200/90 dark:border-slate-800 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.06)] flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-[14px] font-bold text-slate-600 dark:text-slate-300">Șantiere & Suprafață</span>
                                <div className="flex items-center gap-2">
                                    {renderDeltaBadge(currentStats.totalSqm, prevStats.totalSqm, ' m²')}
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/12 text-[color:var(--tenant-bg)] flex items-center justify-center">
                                        <HardHat className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>
                            <div className="my-2 flex items-baseline gap-2.5 tabular-nums">
                                <div className="text-[26px] font-black text-slate-950 dark:text-white tracking-tight leading-none whitespace-nowrap">
                                    {currentStats.totalSqm.toLocaleString('fr-FR')} <span className="text-[15px] font-bold text-slate-400">m²</span>
                                </div>
                                <span className="text-[13.5px] font-extrabold text-[color:var(--tenant-bg)] whitespace-nowrap">
                                    ({currentStats.totalOrders} lucrări)
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-[12.5px] font-semibold text-slate-500 tabular-nums">
                                <span>Medie: <strong className="text-slate-900 dark:text-white">{currentStats.avgSqmPerOrder} m²/lucrare</strong></span>
                                <span>Nisip: <strong className="text-amber-600">{currentStats.totalSand} T</strong></span>
                            </div>
                        </div>

                        {/* Card 3: Service Split Bar (Chape vs PUR/EPS) */}
                        <div className="bg-white dark:bg-slate-900 rounded-[20px] p-5 border border-slate-200/90 dark:border-slate-800 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.06)] flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-[14px] font-bold text-slate-600 dark:text-slate-300">Structură: Chape vs PUR/Izolație</span>
                                <div className="w-8 h-8 rounded-lg bg-amber-500/12 text-amber-600 flex items-center justify-center">
                                    <Layers className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="my-2 flex items-baseline gap-2 tabular-nums">
                                <span className="text-[24px] font-black text-[color:var(--tenant-bg)] leading-none">{chapeSharePct}%</span>
                                <span className="text-[12.5px] font-bold text-slate-500">Chape</span>
                                <span className="text-slate-300 text-base">/</span>
                                <span className="text-[24px] font-black text-emerald-600 leading-none">{purSharePct}%</span>
                                <span className="text-[12.5px] font-bold text-slate-500">PUR & EPS</span>
                            </div>
                            {/* 2-Color Split Progress Bar */}
                            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex gap-0.5">
                                <div className="h-full bg-[color:var(--tenant-bg)] rounded-l-full transition-all" style={{ width: `${chapeSharePct}%` }} />
                                <div className="h-full bg-emerald-500 rounded-r-full transition-all" style={{ width: `${purSharePct}%` }} />
                            </div>
                        </div>

                        {/* Card 4: Network / Team Leader */}
                        <div className="bg-white dark:bg-slate-900 rounded-[20px] p-5 border border-slate-200/90 dark:border-slate-800 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.06)] flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-[14px] font-bold text-slate-600 dark:text-slate-300">Lider Echipă în Perioadă</span>
                                <div className="w-8 h-8 rounded-lg bg-purple-500/12 text-purple-600 flex items-center justify-center">
                                    <Award className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="my-1.5">
                                <div className="text-[22px] font-black text-slate-950 dark:text-white tracking-tight truncate leading-tight">
                                    {topTeam ? topTeam.name : '—'}
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-[12.5px] font-bold tabular-nums">
                                <span className="text-slate-500">{topTeam ? `${topTeam.count} șantiere • ${topTeam.km} km` : '—'}</span>
                                <span className="text-emerald-600 font-black">
                                    {topTeam ? `${topTeam.volume.toLocaleString('fr-FR')} m² (${topTeam.revenue.toLocaleString('fr-FR')} €)` : ''}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* ── 5. CUMULATIVE & PERIOD COMPARISON CHART ── */}
                    <div className="bg-white dark:bg-slate-900 rounded-[20px] border border-slate-200/90 dark:border-slate-800 p-5 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.06)]">
                        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3.5 mb-4">
                            <div>
                                <div className="flex items-center gap-2.5 flex-wrap">
                                    <h3 className="text-[17px] font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-[color:var(--tenant-bg)]" />
                                        Evoluție Cumulată & Comparativă pe Perioadă
                                    </h3>
                                    {renderDeltaBadge(currentStats.totalSqm, prevStats.totalSqm, ' m²')}
                                    {renderDeltaBadge(currentStats.totalRevenue, prevStats.totalRevenue, ' €')}
                                </div>
                                {/* Side-by-side Period Summary Legend */}
                                <div className="flex items-center gap-4 flex-wrap mt-1.5 text-[13px] font-bold tabular-nums">
                                    <span className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                                        <span className="w-2.5 h-2.5 rounded-xs bg-[color:var(--tenant-bg)] inline-block" />
                                        Perioada Curentă: <strong>{currentStats.totalSqm.toLocaleString('fr-FR')} m²</strong> • <span className="text-[color:var(--tenant-bg)]">{currentStats.totalRevenue.toLocaleString('fr-FR')} €</span> • {currentStats.totalOrders} lucrări
                                    </span>
                                    <span className="flex items-center gap-1.5 text-slate-500">
                                        <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" />
                                        {prevRangeLabel}: <strong>{prevStats.totalSqm.toLocaleString('fr-FR')} m²</strong> • <span className="text-amber-600">{prevStats.totalRevenue.toLocaleString('fr-FR')} €</span> • {prevStats.totalOrders} lucrări
                                    </span>
                                </div>
                            </div>

                            {/* Chart Mode Switcher Pills (p-1 + h-8 inner buttons = exact 42px outer height, single row) */}
                            <div className="inline-flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800 p-1 rounded-full border border-slate-200/80 dark:border-slate-700 flex-nowrap overflow-x-auto hide-scrollbar shrink-0">
                                {[
                                    { id: 'cumulative_sqm', label: 'Cumulat m² + Lucrări' },
                                    { id: 'cumulative_rev', label: 'Cumulat € + Lucrări' },
                                    { id: 'daily_teams', label: 'Comparativ Echipe / Zi' },
                                    { id: 'daily_vol_km', label: 'Zilnic m² vs KM' }
                                ].map(m => (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => setCumulativeMode(m.id)}
                                        className={`h-8 px-3 rounded-full text-[12.5px] font-bold inline-flex items-center justify-center transition-all cursor-pointer whitespace-nowrap ${
                                            cumulativeMode === m.id
                                                ? 'bg-[color:var(--tenant-bg)] text-white shadow-xs'
                                                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-white/70'
                                        }`}
                                    >
                                        {m.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="w-full h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                {cumulativeMode === 'cumulative_sqm' ? (
                                    <ComposedChart data={cumulativeComparisonData} margin={{ top: 24, right: 15, left: 4, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.45} />
                                        <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#475569', fontWeight: 700 }} axisLine={false} tickLine={false} />
                                        <YAxis yAxisId="left" width={82} tick={{ fontSize: 12, fill: '#475569', fontWeight: 700 }} axisLine={false} tickLine={false} unit=" m²" />
                                        <YAxis yAxisId="right" orientation="right" width={40} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 700 }} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1C1C1E', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '13px', fontWeight: 700 }}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '12.5px', fontWeight: 800, paddingTop: '10px' }} />
                                        <Bar yAxisId="left" dataKey="prevCumVolume" name={`Cumulat Anterior — ${prevRangeLabel}`} fill="#F59E0B" opacity={0.82} radius={[6, 6, 0, 0]} maxBarSize={36} />
                                        <Bar yAxisId="left" dataKey="currCumVolume" name="Cumulat Perioada Curentă (m²)" fill="#2563EB" radius={[6, 6, 0, 0]} maxBarSize={36}>
                                            <LabelList dataKey="currCumVolume" position="top" fill="#1e293b" fontSize={11} fontWeight="900" formatter={v => v > 0 ? `${v.toLocaleString('fr-FR')}` : ''} />
                                        </Bar>
                                        <Line yAxisId="right" type="monotone" dataKey="prevCumCount" name="Lucrări (Anterior)" stroke="#F59E0B" strokeWidth={2.5} strokeDasharray="5 5" dot={{ r: 3.5, fill: '#F59E0B' }} />
                                        <Line yAxisId="right" type="monotone" dataKey="currCumCount" name="Lucrări (Curent)" stroke="#0EA5E9" strokeWidth={3} dot={{ r: 4.5, fill: '#0EA5E9' }} />
                                    </ComposedChart>
                                ) : cumulativeMode === 'cumulative_rev' ? (
                                    <ComposedChart data={cumulativeComparisonData} margin={{ top: 24, right: 15, left: 4, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.45} />
                                        <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#475569', fontWeight: 700 }} axisLine={false} tickLine={false} />
                                        <YAxis yAxisId="left" width={88} tick={{ fontSize: 12, fill: '#475569', fontWeight: 700 }} axisLine={false} tickLine={false} unit=" €" />
                                        <YAxis yAxisId="right" orientation="right" width={40} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 700 }} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1C1C1E', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '13px', fontWeight: 700 }}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '12.5px', fontWeight: 800, paddingTop: '10px' }} />
                                        <Bar yAxisId="left" dataKey="prevCumRevenue" name={`Valoare Anterioară — ${prevRangeLabel}`} fill="#F59E0B" opacity={0.82} radius={[6, 6, 0, 0]} maxBarSize={36} />
                                        <Bar yAxisId="left" dataKey="currCumRevenue" name="Valoare Cumulată Curentă (€ HT)" fill="#2563EB" radius={[6, 6, 0, 0]} maxBarSize={36}>
                                            <LabelList dataKey="currCumRevenue" position="top" fill="#1e293b" fontSize={11} fontWeight="900" formatter={v => v > 0 ? `${v.toLocaleString('fr-FR')}€` : ''} />
                                        </Bar>
                                        <Line yAxisId="right" type="monotone" dataKey="prevCumCount" name="Lucrări (Anterior)" stroke="#F59E0B" strokeWidth={2.5} strokeDasharray="5 5" dot={{ r: 3.5 }} />
                                        <Line yAxisId="right" type="monotone" dataKey="currCumCount" name="Lucrări (Curent)" stroke="#10B981" strokeWidth={3} dot={{ r: 4.5 }} />
                                    </ComposedChart>
                                ) : cumulativeMode === 'daily_teams' ? (
                                    <BarChart data={currentStats.byDay} margin={{ top: 20, right: 10, left: 4, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.45} />
                                        <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#475569', fontWeight: 700 }} axisLine={false} tickLine={false} />
                                        <YAxis width={76} tick={{ fontSize: 12, fill: '#475569', fontWeight: 700 }} axisLine={false} tickLine={false} unit=" m²" />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1C1C1E', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '13px', fontWeight: 700 }}
                                            formatter={(value, name) => [`${Number(value).toLocaleString('fr-FR')} m²`, name]}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '12.5px', fontWeight: 800, paddingTop: '10px' }} />
                                        {currentStats.byTeam.slice(0, 6).map(tm => (
                                            <Bar key={tm.name} dataKey={tm.name} name={tm.name} stackId="teams" fill={tm.color} radius={[4, 4, 0, 0]} maxBarSize={44} />
                                        ))}
                                    </BarChart>
                                ) : (
                                    <ComposedChart data={currentStats.byDay} margin={{ top: 20, right: 10, left: 4, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.45} />
                                        <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#475569', fontWeight: 700 }} axisLine={false} tickLine={false} />
                                        <YAxis width={68} tick={{ fontSize: 12, fill: '#475569', fontWeight: 700 }} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1C1C1E', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '13px', fontWeight: 700 }}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '12.5px', fontWeight: 800, paddingTop: '10px' }} />
                                        <Bar dataKey="volume" name="Suprafață Turnată (m²)" fill="#2563EB" radius={[6, 6, 0, 0]} maxBarSize={40}>
                                            <LabelList dataKey="volume" position="top" fill="#1E293B" fontSize={11} fontWeight="bold" />
                                        </Bar>
                                        <Bar dataKey="km" name="Kilometri Parcurși (KM)" fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={40}>
                                            <LabelList dataKey="km" position="top" fill="#065F46" fontSize={11} fontWeight="bold" />
                                        </Bar>
                                    </ComposedChart>
                                )}
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* ── 6. INTERACTIVE ACTIVITY HEATMAP (1:1 LIKE SCREENSHOT 1 "Тепловая карта") ── */}
                    <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200/90 dark:border-slate-800 p-6 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.06)]">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                            <div>
                                <h3 className="text-[19px] font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                                    <Flame className="w-5 h-5 text-amber-500" />
                                    {heatmapMode === 'team_weekday'
                                        ? 'Hartă Termică Productivitate: Echipe × Zilele Săptămânii (m²)'
                                        : 'Hartă Termică Programări: Ore de Început (06:00–20:00) × Zilele Săptămânii'}
                                </h3>
                                <p className="text-[13.5px] font-medium text-slate-500 mt-0.5">
                                    Apăsați pe orice zi sau echipă pentru a filtra toate graficele și tabelele din pagină
                                </p>
                            </div>

                            <div className="flex items-center gap-4 flex-wrap">
                                {/* Color Scale Legend */}
                                <div className="flex items-center gap-1.5 text-[12.5px] font-bold text-slate-500">
                                    <span>Min.</span>
                                    <span className="w-4 h-4 rounded bg-slate-100 border border-slate-200" />
                                    <span className="w-4 h-4 rounded bg-blue-500/20" />
                                    <span className="w-4 h-4 rounded bg-emerald-500/30" />
                                    <span className="w-4 h-4 rounded bg-emerald-500" />
                                    <span className="w-4 h-4 rounded bg-amber-500" />
                                    <span>Pic Rush</span>
                                </div>

                                {/* Mode Switcher */}
                                <div className="inline-flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800 p-1 rounded-full border border-slate-200/80 dark:border-slate-700">
                                    <button
                                        type="button"
                                        onClick={() => setHeatmapMode('team_weekday')}
                                        className={`h-8 px-3.5 rounded-full text-[13px] font-bold inline-flex items-center justify-center transition-all cursor-pointer whitespace-nowrap ${
                                            heatmapMode === 'team_weekday'
                                                ? 'bg-[color:var(--tenant-bg)] text-white shadow-xs'
                                                : 'text-slate-600 dark:text-slate-300 hover:bg-white/70'
                                        }`}
                                    >
                                        Echipe × Zile
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setHeatmapMode('hour_weekday')}
                                        className={`h-8 px-3.5 rounded-full text-[13px] font-bold inline-flex items-center justify-center transition-all cursor-pointer whitespace-nowrap ${
                                            heatmapMode === 'hour_weekday'
                                                ? 'bg-[color:var(--tenant-bg)] text-white shadow-xs'
                                                : 'text-slate-600 dark:text-slate-300 hover:bg-white/70'
                                        }`}
                                    >
                                        Ore × Zile (7×15h)
                                    </button>
                                </div>
                            </div>
                        </div>

                        {heatmapMode === 'team_weekday' ? (
                            <div className="overflow-x-auto">
                                <table className="w-full border-separate border-spacing-1.5 text-center">
                                    <thead>
                                        <tr>
                                            <th className="text-left px-3 py-2 text-[12.5px] font-extrabold uppercase tracking-wider text-slate-400 w-44">Echipă \ Zi</th>
                                            {WEEKDAYS_RO.map((dLabel, dIdx) => (
                                                <th
                                                    key={dLabel}
                                                    onClick={() => setSelectedWeekdayFilter(selectedWeekdayFilter === dIdx ? null : dIdx)}
                                                    className={`px-2 py-2 text-[13.5px] font-extrabold rounded-lg cursor-pointer transition-colors ${
                                                        selectedWeekdayFilter === dIdx
                                                            ? 'bg-[color:var(--tenant-bg)] text-white'
                                                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                                                    }`}
                                                >
                                                    {dLabel}
                                                </th>
                                            ))}
                                            <th className="text-right px-3 py-2 text-[12.5px] font-extrabold uppercase tracking-wider text-slate-500 w-28">Total m²</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentStats.byTeam.map(tm => (
                                            <tr key={tm.name}>
                                                <td
                                                    onClick={() => setSelectedTeamFilter(selectedTeamFilter === tm.name ? 'all' : tm.name)}
                                                    className="text-left px-3 py-2 font-extrabold text-[14px] text-slate-800 dark:text-slate-200 cursor-pointer hover:text-[color:var(--tenant-bg)] flex items-center gap-2"
                                                >
                                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tm.color }} />
                                                    <span className="truncate">{tm.name}</span>
                                                </td>
                                                {currentStats.weekdayTeamMatrix.map((dayRow) => {
                                                    const cell = dayRow.teams[tm.name] || { sqm: 0, count: 0 }
                                                    const val = Math.round(cell.sqm)
                                                    return (
                                                        <td key={dayRow.dayIdx} className="p-0">
                                                            <div
                                                                onClick={() => {
                                                                    setSelectedWeekdayFilter(selectedWeekdayFilter === dayRow.dayIdx ? null : dayRow.dayIdx)
                                                                }}
                                                                title={`${tm.name} — ${dayRow.dayLabel}: ${val} m² (${cell.count} lucrări)`}
                                                                className={`h-11 rounded-xl border flex flex-col items-center justify-center cursor-pointer transition-transform hover:scale-[1.03] tabular-nums ${getHeatCellClass(val, maxHeatTeamSqm)}`}
                                                            >
                                                                <span className="text-[13.5px] leading-none">{val > 0 ? `${val} m²` : '·'}</span>
                                                                {cell.count > 0 && <span className="text-[10px] opacity-85 mt-0.5">{cell.count} șant.</span>}
                                                            </div>
                                                        </td>
                                                    )
                                                })}
                                                <td className="text-right px-3 py-2 font-black text-[15.5px] text-slate-900 dark:text-white tabular-nums">
                                                    {tm.volume.toLocaleString('fr-FR')} m²
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full border-separate border-spacing-1 text-center">
                                    <thead>
                                        <tr>
                                            <th className="text-left px-2 py-1.5 text-[12px] font-extrabold uppercase text-slate-400 w-16">Zi \ Oră</th>
                                            {[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(h => (
                                                <th key={h} className="px-1 py-1.5 text-[12px] font-extrabold text-slate-500 tabular-nums">{h}:00</th>
                                            ))}
                                            <th className="text-right px-3 py-1.5 text-[12px] font-extrabold uppercase text-slate-500 w-24">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentStats.weekdayHourMatrix.map(row => (
                                            <tr key={row.dayIdx}>
                                                <td
                                                    onClick={() => setSelectedWeekdayFilter(selectedWeekdayFilter === row.dayIdx ? null : row.dayIdx)}
                                                    className="text-left px-2 py-1.5 font-extrabold text-[13.5px] text-slate-700 dark:text-slate-300 cursor-pointer hover:text-[color:var(--tenant-bg)]"
                                                >
                                                    {row.dayLabel}
                                                </td>
                                                {[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(h => {
                                                    const cell = row.hours[h] || { sqm: 0, count: 0 }
                                                    const val = Math.round(cell.sqm)
                                                    return (
                                                        <td key={h} className="p-0">
                                                            <div
                                                                title={`${row.dayLabel} ora ${h}:00 — ${val} m² (${cell.count} lucrări)`}
                                                                className={`h-9 rounded-lg border flex items-center justify-center text-[12px] tabular-nums transition-transform hover:scale-105 ${getHeatCellClass(val, maxHeatHourSqm)}`}
                                                            >
                                                                {val > 0 ? val : ''}
                                                            </div>
                                                        </td>
                                                    )
                                                })}
                                                <td className="text-right px-3 py-1.5 font-black text-[14.5px] text-slate-900 dark:text-white tabular-nums">
                                                    {Math.round(row.totalSqm).toLocaleString('fr-FR')} m²
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* ── 7. 3-COLUMN INTELLIGENCE ROW (1:1 LIKE SCREENSHOT 1 BOTTOM ROW) ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                        {/* Col 1 (4 cols): Sales Channels & Sources Donut with Centered Total */}
                        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200/90 dark:border-slate-800 p-6 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.06)] flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-[18px] font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                                    <PieChartIcon className="w-5 h-5 text-[color:var(--tenant-bg)]" />
                                    Canale & Surse Comenzi
                                </h3>
                            </div>

                            <div className="relative h-56 flex items-center justify-center my-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={currentStats.bySource.length > 0 ? currentStats.bySource : [{ name: 'Direct', count: 1, color: '#2563EB' }]}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={64}
                                            outerRadius={88}
                                            paddingAngle={3}
                                            dataKey="count"
                                        >
                                            {currentStats.bySource.map((entry, idx) => (
                                                <Cell key={idx} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 700 }}
                                            formatter={(val, name, props) => [`${val} lucrări (${props.payload.sqm?.toLocaleString('fr-FR')} m²)`, name]}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                {/* Centered Label inside Donut */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Total Lucrări</span>
                                    <span className="text-[30px] font-black text-slate-900 dark:text-white tabular-nums leading-tight">
                                        {currentStats.totalOrders}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                                {currentStats.bySource.map(s => (
                                    <div key={s.name} className="flex items-center justify-between text-[13.5px] font-bold">
                                        <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300 truncate">
                                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                                            <span className="truncate">{s.name}</span>
                                        </span>
                                        <span className="font-extrabold text-slate-900 dark:text-white tabular-nums ml-1">{s.pct}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Col 2 (4 cols): Team Distribution Donut with Centered Total Volume/Revenue */}
                        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200/90 dark:border-slate-800 p-6 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.06)] flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-[18px] font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                                    <Users className="w-5 h-5 text-emerald-500" />
                                    Distribuție Volum pe Echipe
                                </h3>
                            </div>

                            <div className="relative h-56 flex items-center justify-center my-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={currentStats.byTeam}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={64}
                                            outerRadius={88}
                                            paddingAngle={3}
                                            dataKey="volume"
                                        >
                                            {currentStats.byTeam.map((entry, idx) => (
                                                <Cell key={idx} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 700 }}
                                            formatter={(val, name, props) => [`${Number(val).toLocaleString('fr-FR')} m² (${props.payload.revenue?.toLocaleString('fr-FR')} €)`, name]}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                {/* Centered Label inside Donut */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Volum Total</span>
                                    <span className="text-[26px] font-black text-slate-900 dark:text-white tabular-nums leading-tight">
                                        {currentStats.totalSqm.toLocaleString('fr-FR')} <span className="text-[14px] font-bold text-slate-400">m²</span>
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                                {currentStats.byTeam.slice(0, 6).map(tm => (
                                    <div
                                        key={tm.name}
                                        onClick={() => setSelectedTeamFilter(selectedTeamFilter === tm.name ? 'all' : tm.name)}
                                        className="flex items-center justify-between text-[13.5px] font-bold cursor-pointer hover:opacity-80"
                                    >
                                        <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300 truncate">
                                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tm.color }} />
                                            <span className="truncate">{tm.name}</span>
                                        </span>
                                        <span className="font-extrabold text-slate-900 dark:text-white tabular-nums ml-1">{tm.sharePct}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Col 3 (4 cols): Top Cities / Regions & Top Clients (1:1 like Screenshot 1 "Топ городов и хабов") */}
                        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200/90 dark:border-slate-800 p-6 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.06)] flex flex-col justify-between">
                            <div className="flex items-center justify-between gap-2 mb-4">
                                <h3 className="text-[18px] font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-rose-500" />
                                    {rankingMode === 'cities' ? 'Top Orașe & Regiuni' : 'Top Clienți (Volum & €)'}
                                </h3>
                                <div className="inline-flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800 p-1 rounded-full border border-slate-200/80 dark:border-slate-700">
                                    <button
                                        type="button"
                                        onClick={() => setRankingMode('cities')}
                                        className={`h-8 px-3 rounded-full text-[12.5px] font-bold inline-flex items-center justify-center transition-all cursor-pointer whitespace-nowrap ${
                                            rankingMode === 'cities'
                                                ? 'bg-[color:var(--tenant-bg)] text-white shadow-xs'
                                                : 'text-slate-600 dark:text-slate-300 hover:bg-white/70'
                                        }`}
                                    >
                                        Orașe
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRankingMode('clients')}
                                        className={`h-8 px-3 rounded-full text-[12.5px] font-bold inline-flex items-center justify-center transition-all cursor-pointer whitespace-nowrap ${
                                            rankingMode === 'clients'
                                                ? 'bg-[color:var(--tenant-bg)] text-white shadow-xs'
                                                : 'text-slate-600 dark:text-slate-300 hover:bg-white/70'
                                        }`}
                                    >
                                        Clienți
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3.5 flex-1 flex flex-col justify-center">
                                {rankingList.map((item, idx) => {
                                    const widthPct = Math.max(8, Math.round((item.sqm / maxRankingSqm) * 100))
                                    return (
                                        <div key={item.name}>
                                            <div className="flex items-center justify-between text-[13.5px] font-bold mb-1.5">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11.5px] font-black flex items-center justify-center shrink-0 tabular-nums">
                                                        {idx + 1}
                                                    </span>
                                                    <span className="font-extrabold text-slate-900 dark:text-white truncate">{item.name}</span>
                                                </div>
                                                <div className="text-right shrink-0 tabular-nums ml-2">
                                                    <span className="font-black text-emerald-600 dark:text-emerald-400">
                                                        {item.sqm.toLocaleString('fr-FR')} m²
                                                    </span>
                                                    <span className="text-[12px] text-slate-400 font-semibold ml-1.5">
                                                        ({item.revenue.toLocaleString('fr-FR')} € • {item.count} șant.)
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all"
                                                    style={{
                                                        width: `${widthPct}%`,
                                                        backgroundColor: idx === 0 ? '#10B981' : idx === 1 ? '#2563EB' : '#0EA5E9'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    {/* ── 8. BOTTOM 2-COLUMN OPERATIONAL & MATERIAL DYNAMICS (1:1 LIKE SCREENSHOT 2 BOTTOM ROW) ── */}
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
                        {/* Left Card (6 cols): Structure & Distribution with 4 Mini-KPI Boxes + Interactive Breakdown */}
                        <div className="xl:col-span-6 bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200/90 dark:border-slate-800 p-6 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.06)] flex flex-col justify-between">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                                <h3 className="text-[18px] font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                                    <Layers className="w-5 h-5 text-[color:var(--tenant-bg)]" />
                                    Structură Operativă & Opțiuni Tehnice
                                </h3>
                                <div className="inline-flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800 p-1 rounded-full border border-slate-200/80 dark:border-slate-700 flex-nowrap shrink-0">
                                    {[
                                        { id: 'teams', label: 'Echipe' },
                                        { id: 'services', label: 'Armare & Opțiuni' },
                                        { id: 'sizes', label: 'Tranșe m²' }
                                    ].map(tb => (
                                        <button
                                            key={tb.id}
                                            type="button"
                                            onClick={() => setStructureTab(tb.id)}
                                            className={`h-8 px-2.5 rounded-full text-[12px] font-bold inline-flex items-center justify-center transition-all cursor-pointer whitespace-nowrap ${
                                                structureTab === tb.id
                                                    ? 'bg-[color:var(--tenant-bg)] text-white shadow-xs'
                                                    : 'text-slate-600 dark:text-slate-300 hover:bg-white/70'
                                            }`}
                                        >
                                            {tb.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 4 Mini KPI Boxes (1:1 like Screenshot 2) */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
                                <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700 rounded-2xl p-3 text-center">
                                    <span className="text-[12px] font-bold text-slate-400 block">Total Șantiere</span>
                                    <span className="text-[20px] font-black text-slate-900 dark:text-white tabular-nums">{currentStats.totalOrders}</span>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700 rounded-2xl p-3 text-center">
                                    <span className="text-[12px] font-bold text-slate-400 block">Zile Active</span>
                                    <span className="text-[20px] font-black text-emerald-600 tabular-nums">{currentStats.activeDaysCount}</span>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700 rounded-2xl p-3 text-center">
                                    <span className="text-[12px] font-bold text-slate-400 block">Vârf Zilnic</span>
                                    <span className="text-[20px] font-black text-[color:var(--tenant-bg)] tabular-nums">{currentStats.peakDaySqm.toLocaleString('fr-FR')} m²</span>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700 rounded-2xl p-3 text-center">
                                    <span className="text-[12px] font-bold text-slate-400 block">Pondere Chape</span>
                                    <span className="text-[20px] font-black text-slate-900 dark:text-white tabular-nums">{chapeSharePct}%</span>
                                </div>
                            </div>

                            {/* Detailed List Breakdown */}
                            <div className="space-y-2.5">
                                {structureTab === 'teams' && currentStats.byTeam.map(tm => (
                                    <div key={tm.name} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                                        <div className="flex items-center gap-3">
                                            <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: tm.color }} />
                                            <div>
                                                <span className="font-extrabold text-slate-900 dark:text-white text-[14.5px] block">{tm.name}</span>
                                                <span className="text-[12px] font-semibold text-slate-500">
                                                    {tm.count} șantiere • Ø {tm.avgSqmPerWork} m²/lucrare • {tm.km} km
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2.5 tabular-nums">
                                            <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 text-[13px] font-extrabold text-slate-800 dark:text-slate-200">
                                                {tm.volume.toLocaleString('fr-FR')} m²
                                            </span>
                                            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-700 text-[13px] font-black min-w-[54px] text-center">
                                                {tm.sharePct}%
                                            </span>
                                        </div>
                                    </div>
                                ))}

                                {structureTab === 'services' && [
                                    { label: 'Armare cu Fibră', data: currentStats.options.fiber, color: '#2563EB' },
                                    { label: 'Folie Polietilenă (Film)', data: currentStats.options.foil, color: '#0EA5E9' },
                                    { label: 'Plasă Metalică (Treillis)', data: currentStats.options.mesh, color: '#8B5CF6' },
                                    { label: 'Aditiv Duremit', data: currentStats.options.duramint, color: '#F59E0B' }
                                ].map(opt => (
                                    <div key={opt.label} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                                        <div className="flex items-center gap-3">
                                            <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />
                                            <div>
                                                <span className="font-extrabold text-slate-900 dark:text-white text-[14.5px] block">{opt.label}</span>
                                                <span className="text-[12px] font-semibold text-slate-500">{opt.data.count} șantiere echipate</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2.5 tabular-nums">
                                            <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 text-[13px] font-extrabold text-slate-800 dark:text-slate-200">
                                                {opt.data.sqm.toLocaleString('fr-FR')} m²
                                            </span>
                                            <span className="px-2.5 py-1 rounded-lg bg-blue-500/15 text-[color:var(--tenant-bg)] text-[13px] font-black min-w-[54px] text-center">
                                                {opt.data.pct}%
                                            </span>
                                        </div>
                                    </div>
                                ))}

                                {structureTab === 'sizes' && Object.values(currentStats.sizeBuckets).map((b, idx) => {
                                    const pct = currentStats.totalSqm > 0 ? Math.round((b.sqm / currentStats.totalSqm) * 100) : 0
                                    return (
                                        <div key={b.key} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                                            <div className="flex items-center gap-3">
                                                <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: TEAM_PALETTE[idx] }} />
                                                <div>
                                                    <span className="font-extrabold text-slate-900 dark:text-white text-[14.5px] block">{b.label}</span>
                                                    <span className="text-[12px] font-semibold text-slate-500">{b.count} lucrări • {Math.round(b.revenue).toLocaleString('fr-FR')} €</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2.5 tabular-nums">
                                                <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 text-[13px] font-extrabold text-slate-800 dark:text-slate-200">
                                                    {Math.round(b.sqm).toLocaleString('fr-FR')} m²
                                                </span>
                                                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-700 text-[13px] font-black min-w-[54px] text-center">
                                                    {pct}%
                                                </span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Right Card (6 cols): Material Consumption & Efficiency Dynamics (1:1 like Screenshot 2 Right Card) */}
                        <div className="xl:col-span-6 bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200/90 dark:border-slate-800 p-6 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.06)] flex flex-col justify-between">
                            <div className="flex items-center justify-between gap-3 mb-4">
                                <h3 className="text-[18px] font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-emerald-500" />
                                    Dinamică Consum Materiale (Nisip & Ciment) și Randament
                                </h3>
                            </div>

                            {/* 4 Mini KPI Boxes (1:1 like Screenshot 2 Right Card) */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
                                <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700 rounded-2xl p-3 text-center">
                                    <span className="text-[12px] font-bold text-slate-400 block">Nisip Consumat</span>
                                    <span className="text-[20px] font-black text-amber-600 tabular-nums">{currentStats.totalSand} T</span>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700 rounded-2xl p-3 text-center">
                                    <span className="text-[12px] font-bold text-slate-400 block">Ciment Estimat</span>
                                    <span className="text-[20px] font-black text-indigo-600 tabular-nums">{currentStats.totalCement} T</span>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700 rounded-2xl p-3 text-center">
                                    <span className="text-[12px] font-bold text-slate-400 block">Grosime Medie</span>
                                    <span className="text-[20px] font-black text-emerald-600 tabular-nums">{currentStats.avgThickness} cm</span>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700 rounded-2xl p-3 text-center">
                                    <span className="text-[12px] font-bold text-slate-400 block">Randament KM</span>
                                    <span className="text-[20px] font-black text-slate-900 dark:text-white tabular-nums">{currentStats.efficiencySqmPerKm} m²/km</span>
                                </div>
                            </div>

                            <div className="w-full h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={currentStats.byDay} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.45} />
                                        <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#475569', fontWeight: 700 }} axisLine={false} tickLine={false} />
                                        <YAxis yAxisId="left" tick={{ fontSize: 12, fill: '#475569', fontWeight: 700 }} axisLine={false} tickLine={false} unit=" T" />
                                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#10B981', fontWeight: 700 }} axisLine={false} tickLine={false} unit=" km" />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', borderRadius: '14px', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 700 }}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 800, paddingTop: '8px' }} />
                                        <Bar yAxisId="left" dataKey="sand" name="Nisip (Tone)" fill="#F59E0B" radius={[5, 5, 0, 0]} maxBarSize={28} />
                                        <Bar yAxisId="left" dataKey="cement" name="Ciment (Tone)" fill="#6366F1" radius={[5, 5, 0, 0]} maxBarSize={28} />
                                        <Line yAxisId="right" type="monotone" dataKey="km" name="Traseu (KM)" stroke="#10B981" strokeWidth={3} dot={{ r: 4, fill: '#10B981' }} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* ── 9. UNIFIED COMPARATIVE DATATABLES ──────────────────────────── */}
                    <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200/90 dark:border-slate-800 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.06)] overflow-hidden mb-8">
                        <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[color:var(--tenant-bg)]">
                                    <BarChart3 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-[19px] font-black text-slate-900 dark:text-white tracking-tight">
                                        {activeTableTab === 'teams'
                                            ? t('reports.team_report_title', 'Raport Comparativ pe Echipe')
                                            : activeTableTab === 'orders'
                                                ? 'Jurnal Detaliat pe Lucrări din Perioadă'
                                                : 'Verificare Grosime Reală & Consum Nisip (Nisip / m² / 16)'}
                                    </h3>
                                    <p className="text-[13.5px] text-slate-500 font-medium">
                                        {activeTableTab === 'teams'
                                            ? 'Compară performanța echipelor după suprafață turnată, șantiere, materiale, kilometraj și valoare generată.'
                                            : activeTableTab === 'orders'
                                                ? 'Toate lucrările din perioada selectată — apăsați pe orice rând pentru a deschide fișa lucrării.'
                                                : 'Calculul grosimii pe baza cantității de nisip și a suprafeței turnate.'}
                                    </p>
                                </div>
                            </div>

                            <div className="inline-flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800 p-1 rounded-full border border-slate-200/80 dark:border-slate-700 shrink-0 flex-nowrap overflow-x-auto hide-scrollbar">
                                <button
                                    type="button"
                                    onClick={() => setActiveTableTab('teams')}
                                    className={`h-8 px-3.5 rounded-full text-[13px] font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 whitespace-nowrap ${
                                        activeTableTab === 'teams'
                                            ? 'bg-[color:var(--tenant-bg)] text-white shadow-xs'
                                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-white/70'
                                    }`}
                                >
                                    <Users className="w-3.5 h-3.5 shrink-0" />
                                    <span>Comparativ pe Echipe ({currentStats.byTeam.length})</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTableTab('orders')}
                                    className={`h-8 px-3.5 rounded-full text-[13px] font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 whitespace-nowrap ${
                                        activeTableTab === 'orders'
                                            ? 'bg-[color:var(--tenant-bg)] text-white shadow-xs'
                                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-white/70'
                                    }`}
                                >
                                    <HardHat className="w-3.5 h-3.5 shrink-0" />
                                    <span>Jurnal Lucrări ({currentItems.length})</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTableTab('real_thickness')}
                                    className={`h-8 px-3.5 rounded-full text-[13px] font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 whitespace-nowrap ${
                                        activeTableTab === 'real_thickness'
                                            ? 'bg-[color:var(--tenant-bg)] text-white shadow-xs'
                                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-white/70'
                                    }`}
                                >
                                    <Activity className="w-3.5 h-3.5 shrink-0" />
                                    <span>Tabel Calcul Șapă ({realThicknessOrders.length})</span>
                                </button>
                            </div>
                        </div>

                        {activeTableTab === 'teams' ? (
                            <DataTable
                                columns={teamColumns}
                                data={currentStats.byTeam}
                                emptyText={t('reports.no_data', 'Nu există date.')}
                            />
                        ) : activeTableTab === 'orders' ? (
                            <DataTable
                                columns={orderColumns}
                                data={currentItems}
                                searchable={true}
                                searchPlaceholder="Caută după deviz, client, oraș, adresă sau echipă..."
                                emptyText={t('reports.no_data', 'Nu există lucrări.')}
                            />
                        ) : (
                            <DataTable
                                columns={realThicknessColumns}
                                data={realThicknessOrders}
                                searchable={true}
                                searchPlaceholder="Caută lucrare..."
                                emptyText="Nu există lucrări de șapă în această perioadă."
                            />
                        )}
                    </div>
                </>
            )}
        </div>
    )
}

import { Routes, Route, Navigate } from 'react-router-dom'
import LogisticsDashboard from './LogisticsDashboard'
import BasesPage from './BasesPage'
import SandStationsPage from './SandStationsPage'
import LogisticsReport from './LogisticsReport'

export default function LogisticsRouter() {
    return (
        <Routes>
            <Route path="/" element={<LogisticsDashboard />} />
            <Route path="/bases" element={<BasesPage />} />
            <Route path="/sand-stations" element={<SandStationsPage />} />
            <Route path="/raport" element={<LogisticsReport />} />
            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    )
}

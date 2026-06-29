import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ServerUrlSync } from './server'
import { AppLayout } from './pages/AppLayout'
import { AppOverview } from './pages/AppOverview'
import { ApplicationsPage } from './pages/ApplicationsPage'
import { EpochPage } from './pages/EpochPage'
import { EpochsPage } from './pages/EpochsPage'
import { InputPage } from './pages/InputPage'
import { InputsPage } from './pages/InputsPage'
import { MatchPage } from './pages/MatchPage'
import { OutputPage } from './pages/OutputPage'
import { OutputsPage } from './pages/OutputsPage'
import { ReportPage } from './pages/ReportPage'
import { ReportsPage } from './pages/ReportsPage'
import { TournamentPage } from './pages/TournamentPage'
import { TournamentsPage } from './pages/TournamentsPage'

export default function App() {
  return (
    <>
      <ServerUrlSync />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<ApplicationsPage />} />
          <Route path="apps/:app" element={<AppLayout />}>
            <Route index element={<AppOverview />} />
            <Route path="epochs" element={<EpochsPage />} />
            <Route path="epochs/:epochIndex" element={<EpochPage />} />
            <Route path="inputs" element={<InputsPage />} />
            <Route path="inputs/:inputIndex" element={<InputPage />} />
            <Route path="outputs" element={<OutputsPage />} />
            <Route path="outputs/:outputIndex" element={<OutputPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="reports/:reportIndex" element={<ReportPage />} />
            <Route path="tournaments" element={<TournamentsPage />} />
            <Route path="tournaments/:address" element={<TournamentPage />} />
            <Route
              path="tournaments/:address/matches/:epochIndex/:idHash"
              element={<MatchPage />}
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </>
  )
}

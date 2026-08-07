import { Routes, Route } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import DashboardPage from './pages/DashboardPage'
import SchedulePage from './pages/SchedulePage'
import TasksPage from './pages/TasksPage'
import DeadlinesPage from './pages/DeadlinesPage'
import NotesPage from './pages/NotesPage'
import FocusPage from './pages/FocusPage'
import SettingsPage from './pages/SettingsPage'
import GamesPage from './pages/GamesPage'
import MemoryPage from './pages/MemoryPage'
import SnakePage from './pages/SnakePage'
import MinesweeperPage from './pages/MinesweeperPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="deadlines" element={<DeadlinesPage />} />
        <Route path="notes" element={<NotesPage />} />
        <Route path="focus" element={<FocusPage />} />
        <Route path="games" element={<GamesPage />} />
        <Route path="games/memory" element={<MemoryPage />} />
        <Route path="games/snake" element={<SnakePage />} />
        <Route path="games/minesweeper" element={<MinesweeperPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}

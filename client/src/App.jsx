import { Navigate, Route, Routes } from 'react-router-dom';
import Guard from './pages/Guard.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Void from './pages/Void.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Report from './pages/Report.jsx';
import Habits from './pages/Habits.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<Guard />}>
        <Route path="/void" element={<Void />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/evening" element={<Report kind="evening" />} />
        <Route path="/morning" element={<Report kind="morning" />} />
        <Route path="/habits" element={<Habits />} />
      </Route>
      <Route path="*" element={<Navigate to="/void" replace />} />
    </Routes>
  );
}

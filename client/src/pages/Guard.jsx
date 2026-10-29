import { useQuery } from '@tanstack/react-query';
import { Navigate, Outlet } from 'react-router-dom';
import { authApi } from '../api/endpoints.js';

export default function Guard() {
  const me = useQuery({
    queryKey: ['me'],
    queryFn: authApi.me,
    retry: false,
  });

  if (me.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="voice text-h2">Reviewing the record.</p>
      </div>
    );
  }

  if (me.isError) return <Navigate to="/login" replace />;
  return <Outlet />;
}

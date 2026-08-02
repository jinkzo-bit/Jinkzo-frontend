import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export const RoleProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, loading, initialize, error } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && !user && !loading && !error) {
      initialize();
    }
  }, [isAuthenticated, user, loading, initialize, error]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (loading || (isAuthenticated && !user)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-base">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default RoleProtectedRoute;

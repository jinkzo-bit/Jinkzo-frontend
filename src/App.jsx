import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import ToastContainer from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import RoleProtectedRoute from './components/RoleProtectedRoute';

// Pages
import Home from './pages/Home';
import RestaurantListing from './pages/RestaurantListing';
import RestaurantDetail from './pages/RestaurantDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderTracking from './pages/OrderTracking';
import Profile from './pages/Profile';
import Favourites from './pages/Favourites';
import Orders from './pages/Orders';
import LoginSignup from './pages/LoginSignup';
import ForgotPassword from './pages/ForgotPassword';
import DeliveryPortal from './pages/DeliveryPortal';
import RestaurantDashboard from './pages/RestaurantDashboard';
import DeliveryDashboard from './pages/DeliveryDashboard';
import AdminDashboard from './pages/AdminDashboard';
import RideBooking from './pages/RideBooking';

import { useAuthStore } from './store/authStore';
import { useCartStore } from './store/cartStore';
import { useThemeStore } from './store/themeStore';

export default function App() {
  const initializeAuth = useAuthStore((state) => state.initialize);
  const fetchPlatformSettings = useCartStore((state) => state.fetchPlatformSettings);
  const initTheme = useThemeStore((state) => state.initTheme);

  // Initialize session on mount
  useEffect(() => {
    initTheme();
    initializeAuth();
    fetchPlatformSettings();
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <div className="flex flex-col min-h-screen bg-base">
          
          {/* Global Navigation Header */}
          <Navbar />

          {/* Global Floating Toast Alerts Container */}
          <ToastContainer />

          {/* Main Content Pages */}
          <main className="flex-grow pt-4">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/restaurants" element={<RestaurantListing />} />
              <Route path="/restaurant/:id" element={<RestaurantDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={
                <ProtectedRoute>
                  <Checkout />
                </ProtectedRoute>
              } />
              <Route path="/order-tracking/:id" element={
                <ProtectedRoute>
                  <OrderTracking />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              <Route path="/favourites" element={
                <ProtectedRoute>
                  <Favourites />
                </ProtectedRoute>
              } />
              <Route path="/orders" element={
                <ProtectedRoute>
                  <Orders />
                </ProtectedRoute>
              } />
              <Route path="/login" element={<LoginSignup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/delivery" element={<DeliveryPortal />} />
              <Route path="/restaurant-dashboard" element={
                <RoleProtectedRoute allowedRoles={['restaurant']}>
                  <RestaurantDashboard />
                </RoleProtectedRoute>
              } />
              <Route path="/delivery-dashboard" element={
                <RoleProtectedRoute allowedRoles={['delivery']}>
                  <DeliveryDashboard />
                </RoleProtectedRoute>
              } />
              <Route path="/admin-dashboard" element={
                <RoleProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </RoleProtectedRoute>
              } />
              <Route path="/ride" element={
                <RoleProtectedRoute allowedRoles={['customer']}>
                  <RideBooking />
                </RoleProtectedRoute>
              } />

              {/* Wildcard Role Protection Routing */}
              <Route path="/admin/*" element={
                <RoleProtectedRoute allowedRoles={['admin']}>
                  <Navigate to="/admin-dashboard" replace />
                </RoleProtectedRoute>
              } />
              <Route path="/my-restaurant/*" element={
                <RoleProtectedRoute allowedRoles={['restaurant']}>
                  <Navigate to="/restaurant-dashboard" replace />
                </RoleProtectedRoute>
              } />
              <Route path="/my-deliveries/*" element={
                <RoleProtectedRoute allowedRoles={['delivery']}>
                  <Navigate to="/delivery-dashboard" replace />
                </RoleProtectedRoute>
              } />
              <Route path="/my-account/*" element={
                <RoleProtectedRoute allowedRoles={['customer']}>
                  <Navigate to="/profile" replace />
                </RoleProtectedRoute>
              } />
              {/* Catch-all fallback redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          {/* Mobile bottom navigation drawer */}
          <BottomNav />
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

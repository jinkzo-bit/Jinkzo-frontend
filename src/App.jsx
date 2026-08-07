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
        <div className="flex flex-col min-h-screen relative overflow-x-hidden">
          
          {/* Global Background Floating Decorations */}
          <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden hidden md:block">
            {/* Left side elements */}
            <div className="absolute top-[15%] -left-12 text-[110px] animate-float drop-shadow-[0_20px_25px_rgba(0,0,0,0.15)] rotate-12">🍔</div>
            <div className="absolute top-[55%] -left-8 text-[90px] animate-float-delayed drop-shadow-[0_20px_25px_rgba(0,0,0,0.15)] -rotate-12">🥤</div>
            <div className="absolute bottom-[5%] left-[2%] text-[100px] animate-spin-slow drop-shadow-[0_20px_25px_rgba(0,0,0,0.1)] opacity-70">🌿</div>
             
            {/* Right side elements */}
            <div className="absolute top-[10%] -right-16 text-[130px] animate-float-delayed drop-shadow-[0_20px_25px_rgba(0,0,0,0.15)] -rotate-[15deg]">🛵</div>
            <div className="absolute top-[45%] right-[2%] text-[70px] animate-float drop-shadow-[0_20px_25px_rgba(0,0,0,0.15)] rotate-45">🍅</div>
            <div className="absolute bottom-[10%] -right-10 text-[100px] animate-spin-slow drop-shadow-[0_20px_25px_rgba(0,0,0,0.1)] opacity-70">🌿</div>
             
            {/* Random small confetti / abstract shapes */}
            <div className="absolute top-[25%] left-[18%] w-5 h-5 rounded-full bg-yellow-400 animate-pulse drop-shadow-sm"></div>
            <div className="absolute top-[10%] right-[25%] w-4 h-4 rounded-full bg-pink-500 animate-pulse drop-shadow-sm"></div>
            <div className="absolute bottom-[35%] right-[15%] w-6 h-6 rounded-full bg-purple-500 animate-float drop-shadow-sm"></div>
            <div className="absolute bottom-[15%] left-[25%] w-4 h-4 rounded-full bg-orange-500 animate-float-delayed drop-shadow-sm"></div>
            
            {/* Multicolour Animated Background Glows */}
            <div className="absolute top-[10%] left-[5%] w-[400px] h-[400px] bg-purple-400/30 rounded-full mix-blend-multiply blur-[120px] animate-blob"></div>
            <div className="absolute top-[20%] right-[15%] w-[500px] h-[500px] bg-pink-400/30 rounded-full mix-blend-multiply blur-[120px] animate-blob" style={{ animationDelay: '2s' }}></div>
            <div className="absolute bottom-[10%] left-[20%] w-[600px] h-[600px] bg-orange-300/30 rounded-full mix-blend-multiply blur-[120px] animate-blob" style={{ animationDelay: '4s' }}></div>
            <div className="absolute bottom-[20%] right-[5%] w-[400px] h-[400px] bg-yellow-300/30 rounded-full mix-blend-multiply blur-[120px] animate-blob" style={{ animationDelay: '6s' }}></div>
            <div className="absolute top-[40%] left-[40%] w-[350px] h-[350px] bg-cyan-300/20 rounded-full mix-blend-multiply blur-[120px] animate-blob" style={{ animationDelay: '8s' }}></div>
          </div>

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

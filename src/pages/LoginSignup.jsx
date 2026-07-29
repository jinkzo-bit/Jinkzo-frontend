import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, Mail, User, Phone, Sparkles, AlertCircle, Bike, Store, ShieldAlert, FileText, MapPin, Camera } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { uploadPublicFileToBackend } from '../utils/uploadUtil';

export default function LoginSignup() {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('customer'); // 'customer' | 'restaurant' | 'delivery' | 'admin'
  
  // Basic Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  // Restaurant Partner signup fields
  const [restaurantName, setRestaurantName] = useState('');
  const [restaurantAddress, setRestaurantAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [restaurantImageFile, setRestaurantImageFile] = useState(null);

  // Delivery Partner signup fields
  const [vehicleType, setVehicleType] = useState('Motorcycle');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [drivingLicense, setDrivingLicense] = useState('');
  const [riderImageFile, setRiderImageFile] = useState(null);

  const [formError, setFormError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Zustand Auth
  const { login, register, token, user, error, loading } = useAuthStore();

  const getDashboardRedirect = (userRole) => {
    if (userRole === 'admin') return '/admin-dashboard';
    if (userRole === 'restaurant') return '/restaurant-dashboard';
    if (userRole === 'delivery') return '/delivery-dashboard';
    return '/';
  };

  // Redirect if already logged in
  useEffect(() => {
    if (token && user) {
      const redirectPath = searchParams.get('redirect') || getDashboardRedirect(user.role);
      navigate(redirectPath);
    }
  }, [token, user, navigate, searchParams]);

  // Clear errors when toggling modes or roles
  const handleToggleMode = (modeValue) => {
    setIsLogin(modeValue);
    setFormError('');
    resetFields();
  };

  const handleRoleChange = (roleValue) => {
    setRole(roleValue);
    setFormError('');
    if (roleValue === 'admin') {
      setIsLogin(true); // Super Admin can only login, no registration
    }
  };

  const resetFields = () => {
    setName('');
    setEmail('');
    setPassword('');
    setPhone('');
    setRestaurantName('');
    setRestaurantAddress('');
    setGstin('');
    setRestaurantImageFile(null);
    setVehicleNumber('');
    setDrivingLicense('');
    setRiderImageFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!email || !password) {
      setFormError('Please enter email and password');
      return;
    }

    if (isLogin) {
      const res = await login(email, password);
      if (!res.success) {
        setFormError(res.message);
      }
    } else {
      if (!name || !phone) {
        setFormError('Please enter your name and phone number');
        return;
      }

      let partnerDetails = {};
      if (role === 'restaurant') {
        if (!restaurantName || !restaurantAddress || !gstin) {
          setFormError('Please complete all restaurant partner details');
          return;
        }

        let restaurantImage = '';
        if (restaurantImageFile) {
          setIsUploading(true);
          try {
            restaurantImage = await uploadPublicFileToBackend(restaurantImageFile);
          } catch (err) {
            setFormError(err.message || 'Restaurant cover image upload failed');
            setIsUploading(false);
            return;
          }
          setIsUploading(false);
        }

        partnerDetails = {
          restaurantName,
          restaurantAddress,
          documentType: 'GSTIN',
          documentNumber: gstin,
          restaurantImage
        };
      } else if (role === 'delivery') {
        if (!vehicleNumber || !drivingLicense) {
          setFormError('Please complete all delivery partner details');
          return;
        }

        let profileImage = '';
        if (riderImageFile) {
          setIsUploading(true);
          try {
            profileImage = await uploadPublicFileToBackend(riderImageFile);
          } catch (err) {
            setFormError(err.message || 'Rider profile image upload failed');
            setIsUploading(false);
            return;
          }
          setIsUploading(false);
        }

        partnerDetails = {
          vehicleType,
          vehicleNumber,
          documentType: 'Driving License',
          documentNumber: drivingLicense,
          profileImage
        };
      }

      const res = await register(name, email, password, phone, role, partnerDetails);
      if (!res.success) {
        setFormError(res.message);
      }
    }
  };

  return (
    <div className="max-w-lg mx-auto w-full px-4 py-8 animate-fade-in pb-24 flex flex-col gap-6">
      
      {/* Brand Header */}
      <div className="flex flex-col items-center gap-1.5 text-center">
        <span className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-violet-500/20">
          Q
        </span>
        <h2 className="font-display font-black text-2xl text-main tracking-tight mt-1">
          Welcome to Jinkzo
        </h2>
        <p className="text-xs text-muted font-semibold max-w-[320px]">
          {isLogin ? 'Sign in to access your dashboard' : 'Create a secure profile to unlock partner dashboard'}
        </p>
      </div>

      {/* Main card */}
      <div className="bg-surface rounded-3xl p-6 border border-line shadow-sm flex flex-col gap-5">
        
        {/* Role Selector Tabs */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Access Channel</label>
          <div className="grid grid-cols-4 bg-base p-1 rounded-2xl border border-line/50 text-[10px] font-bold">
            <button
              type="button"
              onClick={() => handleRoleChange('customer')}
              className={`py-2 rounded-xl transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                role === 'customer' ? 'bg-surface text-primary shadow-xs' : 'text-muted hover:text-muted'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Customer</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange('restaurant')}
              className={`py-2 rounded-xl transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                role === 'restaurant' ? 'bg-surface text-primary shadow-xs' : 'text-muted hover:text-muted'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Restaurant</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange('delivery')}
              className={`py-2 rounded-xl transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                role === 'delivery' ? 'bg-surface text-primary shadow-xs' : 'text-muted hover:text-muted'
              }`}
            >
              <Bike className="w-3.5 h-3.5" />
              <span>Delivery</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange('admin')}
              className={`py-2 rounded-xl transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                role === 'admin' ? 'bg-surface text-red-600 shadow-xs' : 'text-muted hover:text-muted'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Super Admin</span>
            </button>
          </div>
        </div>

        {/* Toggle tabs (Only show signup if not admin) */}
        {role !== 'admin' && (
          <div className="grid grid-cols-2 bg-base p-1 rounded-2xl border border-line/50">
            <button
              onClick={() => handleToggleMode(true)}
              className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isLogin ? 'bg-surface text-main shadow-xs' : 'text-muted hover:text-muted'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => handleToggleMode(false)}
              className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                !isLogin ? 'bg-surface text-main shadow-xs' : 'text-muted hover:text-muted'
              }`}
            >
              Partner Signup
            </button>
          </div>
        )}

        {/* Form fields */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {/* Form Error Message */}
          {formError && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-[10px] font-bold p-2.5 rounded-xl flex gap-1.5 items-center">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Name Field (Sign Up only) */}
          {!isLogin && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Full Name</label>
              <div className="flex items-center bg-base border border-line-strong focus-within:border-primary rounded-xl px-3 py-2.5 gap-2 transition-all">
                <User className="w-4 h-4 text-muted" />
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs text-main w-full placeholder:text-muted"
                />
              </div>
            </div>
          )}

          {/* Email Field */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Email Address</label>
            <div className="flex items-center bg-base border border-line-strong focus-within:border-primary rounded-xl px-3 py-2.5 gap-2 transition-all">
              <Mail className="w-4 h-4 text-muted" />
              <input
                type="email"
                required
                placeholder="e.g. john@Jinkzo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-transparent border-none outline-none text-xs text-main w-full placeholder:text-muted"
              />
            </div>
          </div>

          {/* Phone Field (Sign Up only) */}
          {!isLogin && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Phone Number</label>
              <div className="flex items-center bg-base border border-line-strong focus-within:border-primary rounded-xl px-3 py-2.5 gap-2 transition-all">
                <Phone className="w-4 h-4 text-muted" />
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs text-main w-full placeholder:text-muted"
                />
              </div>
            </div>
          )}

          {/* Dynamic Restaurant Signup Section */}
          {!isLogin && role === 'restaurant' && (
            <div className="border-t border-line pt-3 flex flex-col gap-3">
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-primary px-1">Restaurant Specifications</span>
              
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Restaurant Name</label>
                <div className="flex items-center bg-base border border-line-strong focus-within:border-primary rounded-xl px-3 py-2.5 gap-2">
                  <Store className="w-4 h-4 text-muted" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Spice Junction"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    className="bg-transparent border-none outline-none text-xs text-main w-full"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Restaurant Address</label>
                <div className="flex items-center bg-base border border-line-strong focus-within:border-primary rounded-xl px-3 py-2.5 gap-2">
                  <MapPin className="w-4 h-4 text-muted" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Shop 12, Indiranagar, Bengaluru"
                    value={restaurantAddress}
                    onChange={(e) => setRestaurantAddress(e.target.value)}
                    className="bg-transparent border-none outline-none text-xs text-main w-full"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">KYC Verification - GSTIN ID</label>
                <div className="flex items-center bg-base border border-line-strong focus-within:border-primary rounded-xl px-3 py-2.5 gap-2">
                  <FileText className="w-4 h-4 text-muted" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. 29AAAAA1111A1Z1"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    className="bg-transparent border-none outline-none text-xs text-main w-full uppercase"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Restaurant Cover Image</label>
                <div className="flex items-center bg-base border border-line-strong focus-within:border-primary rounded-xl px-3 py-2.5 gap-2 cursor-pointer relative">
                  <Camera className="w-4 h-4 text-muted" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setRestaurantImageFile(e.target.files[0])}
                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                  />
                  <span className="text-xs text-main font-semibold truncate pr-6">
                    {restaurantImageFile ? restaurantImageFile.name : 'Choose restaurant display image...'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Dynamic Delivery Rider Signup Section */}
          {!isLogin && role === 'delivery' && (
            <div className="border-t border-line pt-3 flex flex-col gap-3">
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-primary px-1">Rider Specifications</span>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Vehicle Type</label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs text-main font-semibold outline-none"
                  >
                    <option value="Motorcycle">Motorcycle</option>
                    <option value="Electric Scooter">Electric Scooter</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Vehicle Plate No</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. KA-03-HA-1234"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs text-main outline-none uppercase"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">KYC Verification - Driving License</label>
                <div className="flex items-center bg-base border border-line-strong focus-within:border-primary rounded-xl px-3 py-2.5 gap-2">
                  <FileText className="w-4 h-4 text-muted" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. DL-142026123456"
                    value={drivingLicense}
                    onChange={(e) => setDrivingLicense(e.target.value)}
                    className="bg-transparent border-none outline-none text-xs text-main w-full uppercase"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Rider Profile Photo</label>
                <div className="flex items-center bg-base border border-line-strong focus-within:border-primary rounded-xl px-3 py-2.5 gap-2 cursor-pointer relative">
                  <Camera className="w-4 h-4 text-muted" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setRiderImageFile(e.target.files[0])}
                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                  />
                  <span className="text-xs text-main font-semibold truncate pr-6">
                    {riderImageFile ? riderImageFile.name : 'Choose rider avatar image...'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Password Field */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Password</label>
            <div className="flex items-center bg-base border border-line-strong focus-within:border-primary rounded-xl px-3 py-2.5 gap-2 transition-all">
              <Lock className="w-4 h-4 text-muted" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-transparent border-none outline-none text-xs text-main w-full placeholder:text-muted"
              />
            </div>
          </div>

          {/* Forgot Password Link — Sign In only */}
          {isLogin && (
            <div className="flex justify-end -mt-1">
              <Link
                to="/forgot-password"
                className="text-[11px] font-semibold text-primary hover:underline transition-colors"
              >
                Forgot password?
              </Link>
            </div>
          )}

          {/* Submit Button */}
           <button
            type="submit"
            disabled={loading || isUploading}
            className={`w-full text-white text-xs font-bold py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2 disabled:opacity-50 ${
              role === 'admin' ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-primary-hover'
            }`}
          >
            {isUploading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Uploading Image...</span>
              </>
            ) : loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>
                  {isLogin 
                    ? `Sign In as ${role === 'customer' ? 'Customer' : role === 'admin' ? 'Super Admin' : role === 'restaurant' ? 'Restaurant Owner' : 'Delivery Rider'}` 
                    : 'Submit Registration'}
                </span>
              </>
            )}
          </button>
        </form>

        {/* Demo Accounts Panel */}
        {import.meta.env.DEV && isLogin && (
          <div className="border-t border-line pt-4 flex flex-col gap-2">
            <p className="text-[10px] text-muted font-bold uppercase">Quick Demo Credentials</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setRole('customer');
                  setEmail('john@Jinkzo.com');
                  setPassword('password123');
                }}
                className="text-left bg-base hover:bg-gray-100 border border-line-strong/50 p-2 rounded-xl text-[9px] font-semibold text-muted transition-colors flex flex-col cursor-pointer leading-tight"
              >
                <span className="text-primary font-bold">Autofill Customer</span>
                <span>john@Jinkzo.com</span>
              </button>
              
              <button
                onClick={() => {
                  setRole('restaurant');
                  setEmail('owner@Jinkzo.com');
                  setPassword('password123');
                }}
                className="text-left bg-base hover:bg-gray-100 border border-line-strong/50 p-2 rounded-xl text-[9px] font-semibold text-muted transition-colors flex flex-col cursor-pointer leading-tight"
              >
                <span className="text-primary font-bold">Autofill Restaurant</span>
                <span>owner@Jinkzo.com</span>
              </button>

              <button
                onClick={() => {
                  setRole('delivery');
                  setEmail('rider@Jinkzo.com');
                  setPassword('password123');
                }}
                className="text-left bg-base hover:bg-gray-100 border border-line-strong/50 p-2 rounded-xl text-[9px] font-semibold text-muted transition-colors flex flex-col cursor-pointer leading-tight"
              >
                <span className="text-primary font-bold">Autofill Delivery</span>
                <span>rider@Jinkzo.com</span>
              </button>

              <button
                onClick={() => {
                  setRole('admin');
                  setEmail('admin@Jinkzo.com');
                  setPassword('admin123');
                }}
                className="text-left bg-base hover:bg-gray-100 border border-line-strong/50 p-2 rounded-xl text-[9px] font-semibold text-muted transition-colors flex flex-col cursor-pointer leading-tight"
              >
                <span className="text-red-600 font-bold">Autofill Super Admin</span>
                <span>admin@Jinkzo.com</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

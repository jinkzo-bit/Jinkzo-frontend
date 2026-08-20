import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Lock, Mail, User, Phone, AlertCircle, Bike, Store,
  ShieldAlert, FileText, MapPin, Camera, MessageSquare,
  KeyRound, RefreshCw, CheckCircle2, ArrowLeft, Eye, EyeOff, Navigation
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { uploadPublicFileToBackend } from '../utils/uploadUtil';
import LocationPickerModal from '../components/LocationPickerModal';
import jinkzoLogo from '../assets/branding/jinkzo-logo.png';



// ── OTP digit boxes ───────────────────────────────────────────────────────────
function OtpInput({ value, onChange, disabled }) {
  const inputsRef = useRef([]);
  const digits = value.split('');

  const handleKey = (e, idx) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const d = [...digits];
      if (d[idx]) { d[idx] = ''; }
      else if (idx > 0) { d[idx - 1] = ''; inputsRef.current[idx - 1]?.focus(); }
      onChange(d.join(''));
      return;
    }
    if (e.key === 'ArrowLeft' && idx > 0) inputsRef.current[idx - 1]?.focus();
    if (e.key === 'ArrowRight' && idx < 5) inputsRef.current[idx + 1]?.focus();
  };

  const handleChange = (e, idx) => {
    const char = e.target.value.replace(/\D/g, '').slice(-1);
    const d = [...digits]; d[idx] = char;
    onChange(d.join(''));
    if (char && idx < 5) inputsRef.current[idx + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pasted.padEnd(6, '').slice(0, 6));
    inputsRef.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center">
      {[0,1,2,3,4,5].map((idx) => (
        <input
          key={idx}
          ref={(el) => (inputsRef.current[idx] = el)}
          type="text" inputMode="numeric" maxLength={1}
          value={digits[idx] || ''}
          onChange={(e) => handleChange(e, idx)}
          onKeyDown={(e) => handleKey(e, idx)}
          onPaste={handlePaste}
          disabled={disabled}
          className={`w-10 h-13 rounded-xl border-2 text-center text-lg font-black transition-all duration-200 outline-none bg-base
            ${digits[idx] ? 'border-primary text-primary shadow-lg shadow-violet-500/20' : 'border-line text-main'}
            focus:border-primary focus:shadow-lg focus:shadow-violet-500/20 disabled:opacity-50`}
        />
      ))}
    </div>
  );
}

// ── Resend timer hook ─────────────────────────────────────────────────────────
function useResendTimer() {
  const [timer, setTimer] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    if (timer > 0) ref.current = setTimeout(() => setTimer(t => t - 1), 1000);
    return () => clearTimeout(ref.current);
  }, [timer]);
  return [timer, () => setTimer(60)];
}

export default function LoginSignup() {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('customer');
  // loginMethod: 'email' | 'phone'
  const [loginMethod, setLoginMethod] = useState('email');
  // phoneStep: 1 = enter phone, 2 = enter OTP
  const [phoneStep, setPhoneStep] = useState(1);
  const [resendTimer, startResend] = useResendTimer();

  // Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [addressObj, setAddressObj] = useState(null);

  // Partner fields
  const [restaurantName, setRestaurantName] = useState('');
  const [restaurantLocation, setRestaurantLocation] = useState(null); // replaces restaurantAddress string
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [locationModalTarget, setLocationModalTarget] = useState('customer'); // 'customer' | 'restaurant'
  const [gstin, setGstin] = useState('');
  const [restaurantImageFile, setRestaurantImageFile] = useState(null);
  const [vehicleType, setVehicleType] = useState('Motorcycle');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [drivingLicense, setDrivingLicense] = useState('');
  const [riderImageFile, setRiderImageFile] = useState(null);

  const [formError, setFormError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { login, register, sendLoginOtp, verifyLoginOtp, sendSignupOtp, token, user, loading } = useAuthStore();

  // Customer signup 2-step OTP state
  const [signupStep, setSignupStep] = useState(1); // 1=form, 2=verify-otp
  const [signupOtp, setSignupOtp] = useState('');
  const [signupResendTimer, startSignupResend] = useResendTimer();
  const [savedRegisterData, setSavedRegisterData] = useState(null);

  const getDashboard = (r) => {
    if (r === 'admin') return '/admin-dashboard';
    if (r === 'restaurant') return '/restaurant-dashboard';
    if (r === 'delivery') return '/delivery-dashboard';
    return '/';
  };

  useEffect(() => {
    if (token && user) navigate(searchParams.get('redirect') || getDashboard(user.role));
  }, [token, user]);

  const resetAll = () => {
    setName(''); setEmail(''); setPhone(''); setAddressObj(null);
    setPassword(''); setConfirmPassword(''); setShowPassword(false); setShowConfirmPassword(false); setOtp('');
    setRestaurantName(''); setRestaurantLocation(null); setGstin('');
    setRestaurantImageFile(null); setVehicleNumber(''); setDrivingLicense(''); setRiderImageFile(null);
    setPhoneStep(1); setFormError('');
    setSignupStep(1); setSignupOtp(''); setSavedRegisterData(null);
  };

  const handleToggleMode = (v) => { setIsLogin(v); resetAll(); };
  const handleRoleChange = (v) => {
    setRole(v); setFormError('');
    if (v === 'admin') setIsLogin(true);
  };
  const handleMethodChange = (m) => { setLoginMethod(m); setFormError(''); setPhoneStep(1); setOtp(''); };

  // ── Email + Password Login ───────────────────────────────────────────────────
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!email || !password) return setFormError('Please enter email and password.');
    const res = await login(email, password);
    if (!res.success) setFormError(res.message);
  };

  // ── Phone Login Step 1: Send OTP ─────────────────────────────────────────────
  const handleSendLoginOtp = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!phone.trim() || phone.trim().length < 10) return setFormError('Enter a valid 10-digit mobile number.');
    const res = await sendLoginOtp(phone.trim());
    if (res.success) { setPhoneStep(2); startResend(); setOtp(''); }
    else setFormError(res.message);
  };

  // ── Phone Login Step 2: Verify OTP ───────────────────────────────────────────
  const handleVerifyLoginOtp = async (e) => {
    e.preventDefault();
    setFormError('');
    if (otp.length !== 6) return setFormError('Enter the complete 6-digit OTP.');
    const res = await verifyLoginOtp(phone.trim(), otp);
    if (!res.success) {
      setFormError(res.message);
      if (res.message?.includes('expired') || res.message?.includes('Too many')) setOtp('');
    }
  };

  // ── Resend login OTP ──────────────────────────────────────────────────────────
  const handleResendLoginOtp = async () => {
    setFormError(''); setOtp('');
    const res = await sendLoginOtp(phone.trim());
    if (res.success) startResend();
    else setFormError(res.message);
  };



  // ── Registration — Step 1: validate form & send OTP (customer) or register directly (partners) ────
  const handleRegister = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!name.trim()) return setFormError('Please enter your full name.');
    if (!phone.trim()) return setFormError('Please enter your mobile number.');
    if (!email.trim()) return setFormError('Please enter your email address.');
    if (!password) return setFormError('Please enter a password.');
    if (password.length < 6) return setFormError('Password must be at least 6 characters long.');
    if (password !== confirmPassword) return setFormError('Passwords do not match.');

    let partnerDetails = {};
    if (role === 'customer') {
      partnerDetails = { addressObj };
    } else if (role === 'restaurant') {
      if (!restaurantName || !restaurantLocation) return setFormError('Please complete all restaurant partner details including exact location.');
      let restaurantImage = '';
      if (restaurantImageFile) {
        setIsUploading(true);
        try { restaurantImage = await uploadPublicFileToBackend(restaurantImageFile); }
        catch (err) { setFormError(err.message || 'Image upload failed.'); setIsUploading(false); return; }
        setIsUploading(false);
      }
      partnerDetails = { restaurantName, restaurantLocation, documentType: 'GSTIN', documentNumber: gstin, restaurantImage };
    } else if (role === 'delivery') {
      if (!vehicleNumber) return setFormError('Please complete vehicle details.');
      let profileImage = '';
      if (riderImageFile) {
        setIsUploading(true);
        try { profileImage = await uploadPublicFileToBackend(riderImageFile); }
        catch (err) { setFormError(err.message || 'Image upload failed.'); setIsUploading(false); return; }
        setIsUploading(false);
      }
      partnerDetails = { vehicleType, vehicleNumber, documentType: 'Driving License', documentNumber: drivingLicense, profileImage };
    }

    // For all roles: send OTP first for email verification
    setSavedRegisterData({ name: name.trim(), email: email.trim(), password, phone: phone.trim(), role, partnerDetails });
    const res = await sendSignupOtp(email.trim(), name.trim());
    if (!res.success) return setFormError(res.message);
    
    setSignupStep(2);
    startSignupResend();
    setSignupOtp('');
  };

  // ── Registration — Step 2: verify OTP and complete registration ────────────
  const handleSignupOtpVerify = async (e) => {
    e.preventDefault();
    setFormError('');
    if (signupOtp.length !== 6) return setFormError('Please enter the complete 6-digit OTP.');
    if (!savedRegisterData) return setFormError('Session expired. Please fill the form again.');
    const { name: n, email: em, password: pw, phone: ph, role: r, partnerDetails: pd } = savedRegisterData;
    const res = await register(n, em, pw, ph, r, { ...pd, emailOtp: signupOtp });
    if (!res.success) setFormError(res.message);
  };

  // ── Resend signup OTP ─────────────────────────────────────────────────────────
  const handleSignupResendOtp = async () => {
    if (!savedRegisterData) return;
    setFormError(''); setSignupOtp('');
    const res = await sendSignupOtp(savedRegisterData.email, savedRegisterData.name);
    if (res.success) startSignupResend();
    else setFormError(res.message);
  };

  const isCustomerLogin = isLogin && role === 'customer';

  return (
    <div className="max-w-lg mx-auto w-full px-4 py-8 animate-fade-in pb-24 flex flex-col gap-6">

      {/* Brand Header */}
      <div className="flex flex-col items-center gap-2.5 text-center">
        <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg shadow-violet-500/20 bg-white border border-gray-100 flex items-center justify-center">
          <img src={jinkzoLogo} alt="Jinkzo Logo" className="w-full h-full object-cover object-left" />
        </div>
        <h2 className="font-display font-black text-2xl text-main tracking-tight mt-1">Welcome to Jinkzo</h2>
        <p className="text-xs text-muted font-semibold max-w-[320px]">
          {isLogin ? 'Sign in to access your dashboard' : 'Create a secure profile to unlock partner dashboard'}
        </p>
      </div>

      <div className="bg-surface rounded-3xl p-6 border border-line shadow-sm flex flex-col gap-5">

        {/* Role tabs */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Access Channel</label>
          <div className="grid grid-cols-4 bg-base p-1 rounded-2xl border border-line/50 text-[10px] font-bold">
            {[
              { val: 'customer', icon: <User className="w-3.5 h-3.5"/>, label: 'Customer' },
              { val: 'restaurant', icon: <Store className="w-3.5 h-3.5"/>, label: 'Restaurant' },
              { val: 'delivery', icon: <Bike className="w-3.5 h-3.5"/>, label: 'Delivery' },
              { val: 'admin', icon: <ShieldAlert className="w-3.5 h-3.5"/>, label: 'Super Admin', red: true },
            ].map(({ val, icon, label, red }) => (
              <button key={val} type="button" onClick={() => handleRoleChange(val)}
                className={`py-2 rounded-xl transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                  role === val ? `bg-surface ${red ? 'text-red-600' : 'text-primary'} shadow-xs` : 'text-muted'
                }`}>
                {icon}<span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sign In / Sign Up toggle */}
        {role !== 'admin' && (
          <div className="grid grid-cols-2 bg-base p-1 rounded-2xl border border-line/50">
            <button onClick={() => handleToggleMode(true)}
              className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${isLogin ? 'bg-surface text-main shadow-xs' : 'text-muted'}`}>
              Sign In
            </button>
            <button onClick={() => handleToggleMode(false)}
              className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${!isLogin ? 'bg-surface text-main shadow-xs' : 'text-muted'}`}>
              {role === 'customer' ? 'Sign Up' : 'Partner Signup'}
            </button>
          </div>
        )}



        {/* Error Banner */}
        {formError && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-[10px] font-bold p-2.5 rounded-xl flex gap-1.5 items-center">
            <AlertCircle className="w-4 h-4 flex-shrink-0"/><span>{formError}</span>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* SIGNUP — STEP 2: Email OTP Verification      */}
        {/* ══════════════════════════════════════════════════════ */}
        {!isLogin && signupStep === 2 ? (
          <form onSubmit={handleSignupOtpVerify} className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => { setSignupStep(1); setSignupOtp(''); setFormError(''); setSavedRegisterData(null); }}
                className="text-muted hover:text-primary transition-colors">
                <ArrowLeft className="w-4 h-4"/>
              </button>
              <div className="flex-1 bg-violet-50 border border-violet-200 rounded-xl px-3 py-2 text-xs text-violet-700 font-semibold flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 shrink-0"/>
                OTP sent to <strong>{savedRegisterData?.email}</strong>
              </div>
            </div>

            <div className="text-center flex flex-col gap-1">
              <p className="text-xs font-bold text-main">Verify your email address</p>
              <p className="text-[11px] text-muted">Enter the 6-digit code we sent to complete your registration</p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted text-center">Enter 6-Digit OTP</label>
              <OtpInput value={signupOtp} onChange={setSignupOtp} disabled={loading}/>
            </div>

            {/* Resend */}
            <div className="flex justify-center text-xs text-muted">
              {signupResendTimer > 0
                ? <span>Resend OTP in <strong className="text-primary">{signupResendTimer}s</strong></span>
                : <button type="button" onClick={handleSignupResendOtp} disabled={loading}
                    className="flex items-center gap-1 text-primary font-semibold hover:underline disabled:opacity-50 cursor-pointer">
                    <RefreshCw className="w-3 h-3"/> Resend OTP
                  </button>
              }
            </div>

            <button type="submit" disabled={loading || signupOtp.length !== 6}
              className="w-full bg-primary hover:bg-primary-hover text-white text-xs font-bold py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer">
              {loading
                ? <><svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg> Creating Account...</>
                : <><CheckCircle2 className="w-4 h-4"/> Verify &amp; Create Account</>}
            </button>
          </form>
        ) : (
          <form onSubmit={isLogin ? handleEmailLogin : handleRegister} className="flex flex-col gap-4">

            {/* Name (signup only) */}
            {!isLogin && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">
                  {role === 'restaurant' ? "Restaurant Owner's Name" : 'Full Name'}
                </label>
                <div className="flex items-center bg-base border border-line-strong focus-within:border-primary rounded-xl px-3 py-2.5 gap-2 transition-all">
                  <User className="w-4 h-4 text-muted shrink-0"/>
                  <input type="text" required placeholder="e.g. John Doe" value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-transparent border-none outline-none text-xs text-main w-full placeholder:text-muted"/>
                </div>
              </div>
            )}

            {/* Mobile Number (signup only) */}
            {!isLogin && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Mobile Number</label>
                <div className="flex items-center bg-base border border-line-strong focus-within:border-primary rounded-xl px-3 py-2.5 gap-2 transition-all">
                  <Phone className="w-4 h-4 text-muted shrink-0"/>
                  <input type="tel" required placeholder="e.g. 9876543210" value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="bg-transparent border-none outline-none text-xs text-main w-full placeholder:text-muted"/>
                </div>
              </div>
            )}

            {/* Email Address or Mobile Number */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">
                {isLogin ? 'Email or Mobile Number' : 'Email Address'}
              </label>
              <div className="flex items-center bg-base border border-line-strong focus-within:border-primary rounded-xl px-3 py-2.5 gap-2 transition-all">
                <Mail className="w-4 h-4 text-muted shrink-0"/>
                <input
                  type={isLogin ? 'text' : 'email'}
                  required
                  placeholder={isLogin ? 'e.g. john@jinkzo.com or 9876543210' : 'e.g. john@jinkzo.com'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs text-main w-full placeholder:text-muted"/>
              </div>
            </div>

            {/* Address (Customer signup only) */}
            {!isLogin && role === 'customer' && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Delivery Location (Optional)</label>
                <div 
                  onClick={() => { setLocationModalTarget('customer'); setIsLocationModalOpen(true); }}
                  className="flex items-center bg-base border border-line-strong hover:border-primary rounded-xl px-3 py-2.5 gap-2 transition-all cursor-pointer"
                >
                  <MapPin className={`w-4 h-4 shrink-0 ${addressObj ? 'text-primary' : 'text-muted'}`}/>
                  <span className={`text-xs w-full truncate ${addressObj ? 'text-main font-semibold' : 'text-muted'}`}>
                    {addressObj ? addressObj.formattedAddress : 'Set location on map...'}
                  </span>
                </div>
              </div>
            )}

            {/* Restaurant Partner Fields */}
            {!isLogin && role === 'restaurant' && (
              <div className="border-t border-line pt-3 flex flex-col gap-3">
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-primary px-1">Restaurant Specifications</span>
                {[
                  { label: 'Restaurant Name', icon: <Store className="w-4 h-4 text-muted"/>, val: restaurantName, set: setRestaurantName, ph: 'e.g. Spice Junction' },
                  { label: 'KYC - GSTIN ID (Optional)', icon: <FileText className="w-4 h-4 text-muted"/>, val: gstin, set: setGstin, ph: 'e.g. 29AAAAA1111A1Z1', cls: 'uppercase', req: false },
                ].map(({ label, icon, val, set, ph, cls, req }) => (
                  <div key={label} className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">{label}</label>
                    <div className="flex items-center bg-base border border-line-strong focus-within:border-primary rounded-xl px-3 py-2.5 gap-2">
                      {icon}
                      <input type="text" required={req !== false} placeholder={ph} value={val} onChange={(e) => set(e.target.value)}
                        className={`bg-transparent border-none outline-none text-xs text-main w-full ${cls || ''}`}/>
                    </div>
                  </div>
                ))}
                
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-extrabold tracking-wider text-primary px-1">Exact Restaurant Location</label>
                  <div 
                    onClick={() => { setLocationModalTarget('restaurant'); setIsLocationModalOpen(true); }}
                    className="flex items-center bg-base border-2 border-primary/30 hover:border-primary rounded-xl px-3 py-2.5 gap-2 transition-all cursor-pointer"
                  >
                    <Navigation className={`w-4 h-4 shrink-0 ${restaurantLocation ? 'text-primary' : 'text-muted'}`}/>
                    <span className={`text-xs w-full truncate ${restaurantLocation ? 'text-main font-semibold' : 'text-muted'}`}>
                      {restaurantLocation ? restaurantLocation.formattedAddress : 'Search & Map Pin (Required)'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Restaurant Cover Image</label>
                  <div className="flex items-center bg-base border border-line-strong rounded-xl px-3 py-2.5 gap-2 cursor-pointer relative">
                    <Camera className="w-4 h-4 text-muted"/>
                    <input type="file" accept=".jpeg, .jpg, .png" onChange={(e) => setRestaurantImageFile(e.target.files[0])}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"/>
                    <span className="text-xs text-main font-semibold truncate pr-6">{restaurantImageFile ? restaurantImageFile.name : 'Choose restaurant display image...'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Delivery Partner Fields */}
            {!isLogin && role === 'delivery' && (
              <div className="border-t border-line pt-3 flex flex-col gap-3">
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-primary px-1">Rider Specifications</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Vehicle Type</label>
                    <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}
                      className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs text-main font-semibold outline-none">
                      <option value="Motorcycle">Motorcycle</option>
                      <option value="Electric Scooter">Electric Scooter</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Vehicle Plate No</label>
                    <input type="text" required placeholder="e.g. KA-03-HA-1234" value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(e.target.value)}
                      className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs text-main outline-none uppercase"/>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">KYC - Driving License (Optional)</label>
                  <div className="flex items-center bg-base border border-line-strong focus-within:border-primary rounded-xl px-3 py-2.5 gap-2">
                    <FileText className="w-4 h-4 text-muted"/>
                    <input type="text" placeholder="e.g. DL-142026123456" value={drivingLicense}
                      onChange={(e) => setDrivingLicense(e.target.value)}
                      className="bg-transparent border-none outline-none text-xs text-main w-full uppercase"/>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Rider Profile Photo</label>
                  <div className="flex items-center bg-base border border-line-strong rounded-xl px-3 py-2.5 gap-2 cursor-pointer relative">
                    <Camera className="w-4 h-4 text-muted"/>
                    <input type="file" accept=".jpeg, .jpg, .png" onChange={(e) => setRiderImageFile(e.target.files[0])}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"/>
                    <span className="text-xs text-main font-semibold truncate pr-6">{riderImageFile ? riderImageFile.name : 'Choose rider avatar image...'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Password with Eye Icon Toggle */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Password</label>
              <div className="flex items-center bg-base border border-line-strong focus-within:border-primary rounded-xl px-3 py-2.5 gap-2 transition-all relative">
                <Lock className="w-4 h-4 text-muted shrink-0"/>
                <input type={showPassword ? 'text' : 'password'} required minLength={6} placeholder="••••••••" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs text-main w-full placeholder:text-muted pr-8"/>
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-muted hover:text-main focus:outline-none transition-colors cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password with Eye Icon Toggle (Signup only) */}
            {!isLogin && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Confirm Password</label>
                <div className="flex items-center bg-base border border-line-strong focus-within:border-primary rounded-xl px-3 py-2.5 gap-2 transition-all relative">
                  <Lock className="w-4 h-4 text-muted shrink-0"/>
                  <input type={showConfirmPassword ? 'text' : 'password'} required minLength={6} placeholder="••••••••" value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-transparent border-none outline-none text-xs text-main w-full placeholder:text-muted pr-8"/>
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 text-muted hover:text-main focus:outline-none transition-colors cursor-pointer"
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}>
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Forgot Password link */}
            {isLogin && (
              <div className="flex justify-end -mt-1">
                <Link to="/forgot-password" className="text-[11px] font-semibold text-primary hover:underline transition-colors">
                  Forgot password?
                </Link>
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading || isUploading}
              className={`w-full text-white text-xs font-bold py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2 disabled:opacity-50 ${
                role === 'admin' ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-primary-hover'
              }`}>
              {(isUploading || loading)
                ? <><svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg><span>{isUploading ? 'Uploading...' : 'Processing...'}</span></>
                : <span>{isLogin ? `Sign In as ${role === 'customer' ? 'Customer' : role === 'admin' ? 'Super Admin' : role === 'restaurant' ? 'Restaurant Owner' : 'Delivery Rider'}` : role === 'customer' ? 'Create Customer Account' : 'Submit Registration'}</span>
              }
            </button>
          </form>
        )}

        {/* Demo Accounts */}
        {import.meta.env.DEV && isLogin && loginMethod === 'email' && (
          <div className="border-t border-line pt-4 flex flex-col gap-2">
            <p className="text-[10px] text-muted font-bold uppercase">Quick Demo Credentials</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { r: 'customer', em: 'john@Jinkzo.com', label: 'Autofill Customer', color: 'text-primary' },
                { r: 'restaurant', em: 'owner@Jinkzo.com', label: 'Autofill Restaurant', color: 'text-primary' },
                { r: 'delivery', em: 'rider@Jinkzo.com', label: 'Autofill Delivery', color: 'text-primary' },
                { r: 'admin', em: 'admin@Jinkzo.com', label: 'Autofill Super Admin', color: 'text-red-600', pw: 'admin123' },
              ].map(({ r, em, label, color, pw }) => (
                <button key={r} onClick={() => { setRole(r); setEmail(em); setPassword(pw || 'password123'); if (r === 'admin') setIsLogin(true); }}
                  className="text-left bg-base hover:bg-gray-100 border border-line-strong/50 p-2 rounded-xl text-[9px] font-semibold text-muted transition-colors flex flex-col cursor-pointer leading-tight">
                  <span className={`font-bold ${color}`}>{label}</span><span>{em}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <LocationPickerModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        title={locationModalTarget === 'restaurant' ? 'Set Restaurant Location' : 'Set Delivery Location'}
        initialAddress={locationModalTarget === 'restaurant' ? restaurantLocation : addressObj}
        onConfirm={(addr) => {
          if (locationModalTarget === 'restaurant') {
            setRestaurantLocation(addr);
          } else {
            setAddressObj(addr);
          }
          setIsLocationModalOpen(false);
        }}
      />
    </div>
  );
}

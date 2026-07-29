import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, KeyRound, Lock, ArrowLeft, CheckCircle2, RefreshCw, Eye, EyeOff, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

// ─────────────────────────────────────────────────────────
//  Step indicator component
// ─────────────────────────────────────────────────────────
function StepIndicator({ current }) {
  const steps = [
    { n: 1, label: 'Email' },
    { n: 2, label: 'OTP' },
    { n: 3, label: 'New Password' },
  ];
  return (
    <div className="flex items-center justify-center gap-0 mb-6">
      {steps.map((s, i) => (
        <React.Fragment key={s.n}>
          <div className="flex flex-col items-center gap-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold transition-all duration-300 ${
              current > s.n
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                : current === s.n
                ? 'bg-primary text-white shadow-lg shadow-violet-500/30 scale-110'
                : 'bg-surface border-2 border-line text-muted'
            }`}>
              {current > s.n ? <CheckCircle2 className="w-4 h-4" /> : s.n}
            </div>
            <span className={`text-[10px] font-bold ${current === s.n ? 'text-primary' : 'text-muted'}`}>{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-0.5 w-12 mx-1 mb-5 rounded-full transition-all duration-500 ${current > s.n + 0 ? 'bg-emerald-500' : 'bg-line'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  OTP digit boxes
// ─────────────────────────────────────────────────────────
function OtpInput({ value, onChange, disabled }) {
  const inputsRef = useRef([]);
  const digits = value.split('');

  const handleKey = (e, idx) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newDigits = [...digits];
      if (newDigits[idx]) {
        newDigits[idx] = '';
      } else if (idx > 0) {
        newDigits[idx - 1] = '';
        inputsRef.current[idx - 1]?.focus();
      }
      onChange(newDigits.join(''));
      return;
    }
    if (e.key === 'ArrowLeft' && idx > 0) inputsRef.current[idx - 1]?.focus();
    if (e.key === 'ArrowRight' && idx < 5) inputsRef.current[idx + 1]?.focus();
  };

  const handleChange = (e, idx) => {
    const char = e.target.value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[idx] = char;
    onChange(newDigits.join(''));
    if (char && idx < 5) inputsRef.current[idx + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pasted.padEnd(6, '').slice(0, 6));
    const nextIdx = Math.min(pasted.length, 5);
    inputsRef.current[nextIdx]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center">
      {[0, 1, 2, 3, 4, 5].map((idx) => (
        <input
          key={idx}
          ref={(el) => (inputsRef.current[idx] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[idx] || ''}
          onChange={(e) => handleChange(e, idx)}
          onKeyDown={(e) => handleKey(e, idx)}
          onPaste={handlePaste}
          disabled={disabled}
          className={`w-11 h-14 rounded-xl border-2 text-center text-xl font-black transition-all duration-200 outline-none bg-base
            ${digits[idx]
              ? 'border-primary text-primary shadow-lg shadow-violet-500/20'
              : 'border-line text-main'
            }
            focus:border-primary focus:shadow-lg focus:shadow-violet-500/20
            disabled:opacity-50 disabled:cursor-not-allowed`}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Main page
// ─────────────────────────────────────────────────────────
export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [done, setDone] = useState(false);
  const timerRef = useRef(null);
  const navigate = useNavigate();

  const { forgotPassword, verifyOtp, resetPassword } = useAuthStore();

  // Countdown timer for OTP resend
  useEffect(() => {
    if (resendTimer > 0) {
      timerRef.current = setTimeout(() => setResendTimer((t) => t - 1), 1000);
    }
    return () => clearTimeout(timerRef.current);
  }, [resendTimer]);

  const startResendTimer = () => setResendTimer(60);

  // ── Step 1: Send OTP ──────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) return setError('Please enter your email address.');
    if (!/\S+@\S+\.\S+/.test(email)) return setError('Please enter a valid email address.');
    setLoading(true);
    const result = await forgotPassword(email.trim().toLowerCase());
    setLoading(false);
    if (result.success) {
      setStep(2);
      startResendTimer();
    } else {
      setError(result.message);
    }
  };

  // ── Step 2: Verify OTP ────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (otp.length !== 6) return setError('Please enter the complete 6-digit OTP.');
    setLoading(true);
    const result = await verifyOtp(email, otp);
    setLoading(false);
    if (result.success) {
      setResetToken(result.resetToken);
      setStep(3);
    } else {
      setError(result.message);
      if (result.message?.includes('expired') || result.message?.includes('Too many')) {
        setOtp('');
      }
    }
  };

  // ── Step 2: Resend OTP ────────────────────────────────
  const handleResend = async () => {
    setError('');
    setOtp('');
    setLoading(true);
    const result = await forgotPassword(email);
    setLoading(false);
    if (result.success) {
      startResendTimer();
    } else {
      setError(result.message);
    }
  };

  // ── Step 3: Reset Password ────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) return setError('Password must be at least 6 characters.');
    if (newPassword !== confirmPassword) return setError('Passwords do not match.');
    setLoading(true);
    const result = await resetPassword(resetToken, newPassword);
    setLoading(false);
    if (result.success) {
      setDone(true);
      setTimeout(() => navigate('/login'), 2500);
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md animate-fade-in">

        {/* Back link */}
        <Link
          to="/login"
          className="flex items-center gap-1.5 text-sm text-muted hover:text-primary transition-colors mb-6 w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sign In
        </Link>

        {/* Card */}
        <div className="bg-surface rounded-3xl border border-line shadow-lg shadow-black/10 p-7 flex flex-col gap-6">

          {/* Header */}
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-violet-500/25 mb-1">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <h1 className="font-display font-black text-2xl text-main tracking-tight">Forgot Password?</h1>
            <p className="text-xs text-muted font-medium max-w-xs">
              {step === 1 && "Enter your registered email and we'll send you a 6-digit OTP."}
              {step === 2 && `We've sent a 6-digit OTP to ${email}. Check your inbox (or backend console in dev mode).`}
              {step === 3 && 'OTP verified! Now set your new password.'}
            </p>
          </div>

          {/* Step Indicator */}
          <StepIndicator current={step} />

          {/* Error Banner */}
          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm animate-fade-in">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success state */}
          {done ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="font-bold text-lg text-main">Password Reset!</h3>
              <p className="text-sm text-muted">Redirecting you to sign in...</p>
            </div>
          ) : (
            <>
              {/* ── STEP 1: Email ── */}
              {step === 1 && (
                <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Email Address</label>
                    <div className="flex items-center gap-3 bg-base border border-line rounded-xl px-4 py-3 focus-within:border-primary transition-colors">
                      <Mail className="w-4 h-4 text-muted shrink-0" />
                      <input
                        type="email"
                        autoFocus
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="flex-1 bg-transparent text-sm text-main outline-none placeholder:text-muted/50"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-2xl bg-primary text-white font-bold text-sm transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25"
                  >
                    {loading ? (
                      <><RefreshCw className="w-4 h-4 animate-spin" /> Sending OTP...</>
                    ) : (
                      <><Mail className="w-4 h-4" /> Send OTP</>
                    )}
                  </button>
                </form>
              )}

              {/* ── STEP 2: OTP Entry ── */}
              {step === 2 && (
                <form onSubmit={handleVerifyOtp} className="flex flex-col gap-5">
                  <div className="flex flex-col gap-3">
                    <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted text-center">Enter 6-Digit OTP</label>
                    <OtpInput value={otp} onChange={setOtp} disabled={loading} />
                  </div>

                  {/* Resend section */}
                  <div className="flex items-center justify-center gap-2 text-xs text-muted">
                    {resendTimer > 0 ? (
                      <span>Resend OTP in <strong className="text-primary">{resendTimer}s</strong></span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={loading}
                        className="flex items-center gap-1 text-primary font-semibold hover:underline disabled:opacity-50"
                      >
                        <RefreshCw className="w-3 h-3" /> Resend OTP
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otp.length !== 6}
                    className="w-full py-3.5 rounded-2xl bg-primary text-white font-bold text-sm transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25"
                  >
                    {loading ? (
                      <><RefreshCw className="w-4 h-4 animate-spin" /> Verifying...</>
                    ) : (
                      <><KeyRound className="w-4 h-4" /> Verify OTP</>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setStep(1); setError(''); setOtp(''); }}
                    className="text-xs text-muted hover:text-primary transition-colors text-center"
                  >
                    Wrong email? Go back
                  </button>
                </form>
              )}

              {/* ── STEP 3: New Password ── */}
              {step === 3 && (
                <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">New Password</label>
                    <div className="flex items-center gap-3 bg-base border border-line rounded-xl px-4 py-3 focus-within:border-primary transition-colors">
                      <Lock className="w-4 h-4 text-muted shrink-0" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        autoFocus
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        className="flex-1 bg-transparent text-sm text-main outline-none placeholder:text-muted/50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="text-muted hover:text-primary transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-extrabold tracking-wider text-muted px-1">Confirm Password</label>
                    <div className={`flex items-center gap-3 bg-base border rounded-xl px-4 py-3 focus-within:border-primary transition-colors ${
                      confirmPassword && confirmPassword !== newPassword ? 'border-red-500/50' : 'border-line'
                    }`}>
                      <Lock className="w-4 h-4 text-muted shrink-0" />
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat new password"
                        className="flex-1 bg-transparent text-sm text-main outline-none placeholder:text-muted/50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((v) => !v)}
                        className="text-muted hover:text-primary transition-colors"
                      >
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {confirmPassword && confirmPassword !== newPassword && (
                      <p className="text-xs text-red-400 px-1">Passwords don't match</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !newPassword || !confirmPassword}
                    className="w-full py-3.5 rounded-2xl bg-primary text-white font-bold text-sm transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25 mt-1"
                  >
                    {loading ? (
                      <><RefreshCw className="w-4 h-4 animate-spin" /> Resetting Password...</>
                    ) : (
                      <><ShieldCheck className="w-4 h-4" /> Reset Password</>
                    )}
                  </button>
                </form>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted mt-5">
          Remembered your password?{' '}
          <Link to="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

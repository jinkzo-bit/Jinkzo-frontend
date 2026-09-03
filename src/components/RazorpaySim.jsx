import React, { useState } from 'react';
import { ShieldAlert, CreditCard, Landmark, CheckCircle2, Lock, X } from 'lucide-react';
import { formatCurrency } from '../utils/orderUtils';

export default function RazorpaySim({ amount, isOpen, onClose, onSuccess }) {
  const [selectedMethod, setSelectedMethod] = useState('card');
  const [cardNumber, setCardNumber] = useState('4111 2222 3333 4444');
  const [cardExpiry, setCardExpiry] = useState('12/29');
  const [cardCvv, setCardCvv] = useState('123');
  const [upiId, setUpiId] = useState('user@okaxis');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

  if (!isOpen) return null;

  const handlePay = async (e) => {
    e.preventDefault();
    setIsProcessing(true);

    // Simulate payment gateway authorization delay
    setTimeout(() => {
      setIsProcessing(false);
      setIsPaid(true);

      // Simulate a small delay in success check before closing
      setTimeout(() => {
        const paymentId = 'pay_' + Math.random().toString(36).substr(2, 9).toUpperCase();
        onSuccess(paymentId);
      }, 1500);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-[#1E2749] text-white rounded-2xl overflow-hidden shadow-2xl border border-blue-900/50 flex flex-col">
        
        {/* Header (Razorpay branded) */}
        <div className="p-5 border-b border-blue-900/40 bg-[#121936] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="bg-blue-600 text-white font-extrabold text-xs px-2 py-1 rounded">R</span>
            <div>
              <h4 className="font-display font-semibold text-sm leading-tight text-slate-100">Jinkzo Payment</h4>
              <p className="text-[10px] text-slate-400">Secured by Razorpay Sandbox</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Amount to Pay</p>
            <p className="text-lg font-extrabold text-blue-400">{formatCurrency(amount)}</p>
          </div>
          <button 
            onClick={onClose}
            disabled={isProcessing}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors disabled:opacity-30"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Payment Success View */}
        {isPaid ? (
          <div className="p-10 flex flex-col items-center justify-center text-center gap-4 bg-[#121936] min-h-[300px]">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500 animate-pulse">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-slate-100">Payment Successful</h3>
              <p className="text-xs text-slate-400 mt-1">Authorizing transaction with merchant API...</p>
            </div>
          </div>
        ) : (
          /* Payment Form Screen */
          <form onSubmit={handlePay} className="p-6 flex flex-col gap-5">
            
            {/* Tabs */}
            <div className="grid grid-cols-2 bg-[#121936] p-1 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setSelectedMethod('card')}
                className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${selectedMethod === 'card' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                Cards
              </button>
              <button
                type="button"
                onClick={() => setSelectedMethod('upi')}
                className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${selectedMethod === 'upi' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Landmark className="w-3.5 h-3.5" />
                UPI / Netbanking
              </button>
            </div>

            {/* Methods */}
            {selectedMethod === 'card' ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Card Number</label>
                  <input
                    type="text"
                    required
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="4111 2222 3333 4444"
                    className="w-full bg-[#121936] border border-blue-900/60 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Expiry Date</label>
                    <input
                      type="text"
                      required
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      placeholder="MM/YY"
                      className="w-full bg-[#121936] border border-blue-900/60 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-500 transition-colors text-center"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">CVV</label>
                    <input
                      type="password"
                      required
                      maxLength={3}
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      placeholder="123"
                      className="w-full bg-[#121936] border border-blue-900/60 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-500 transition-colors text-center"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">UPI ID / VPA</label>
                <input
                  type="text"
                  required
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="name@upi"
                  className="w-full bg-[#121936] border border-blue-900/60 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-500 transition-colors"
                />
                <span className="text-[9px] text-slate-400 mt-1">Accept the collect request in your UPI App.</span>
              </div>
            )}

            {/* Pay Button */}
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55"
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Pay Securely {formatCurrency(amount)}</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-1.5 text-slate-400 text-[10px]">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>This is a simulated Razorpay checkout environment.</span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

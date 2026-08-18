import React from 'react';
import { CreditCard, Wallet as WalletIcon, ArrowRightLeft, Gift, ShieldCheck } from 'lucide-react';

export default function Wallet() {
  return (
    <div className="flex flex-col pb-24 max-w-7xl mx-auto w-full animate-fade-in bg-gray-50 min-h-screen">
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md shadow-sm border-b border-line px-4 py-4 flex items-center justify-between">
        <h1 className="font-display font-extrabold text-xl text-main">Wallet & Payments</h1>
      </div>

      <div className="px-4 py-6 flex flex-col gap-6">
        
        {/* Placeholder Balance Card */}
        <div className="bg-gradient-to-r from-primary to-purple-800 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-30">
            <WalletIcon className="w-24 h-24" />
          </div>
          <div className="relative z-10 flex flex-col gap-1">
            <span className="text-xs font-bold text-white/80 uppercase tracking-wider">Available Balance</span>
            <h2 className="font-display font-black text-4xl mt-1">₹0.00</h2>
            <div className="flex items-center gap-2 mt-4">
              <button className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-4 py-2 rounded-xl backdrop-blur-sm transition-colors cursor-pointer">
                + Add Money
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-line shadow-sm flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary transition-colors">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-main">Send Money</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-line shadow-sm flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary transition-colors">
            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
              <Gift className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-main">Gift Cards</span>
          </div>
        </div>

        {/* Transaction History Placeholder */}
        <div className="bg-white rounded-3xl p-5 border border-line shadow-sm flex flex-col gap-4">
          <h3 className="font-display font-extrabold text-base text-main">Recent Transactions</h3>
          
          <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-gray-300">
              <CreditCard className="w-8 h-8" />
            </div>
            <p className="text-sm font-bold text-main">No recent transactions</p>
            <p className="text-xs text-muted max-w-xs leading-relaxed">Your wallet history will appear here once you make a payment.</p>
          </div>
        </div>

        <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-green-600" />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-green-800">100% Safe & Secure</span>
            <span className="text-[10px] text-green-700">PCI DSS Compliant payments</span>
          </div>
        </div>
        
      </div>
    </div>
  );
}

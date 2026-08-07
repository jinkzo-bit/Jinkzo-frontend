import React, { useState } from 'react';
import { XCircle } from 'lucide-react';

export default function Favourites() {
  const [activeTab, setActiveTab] = useState('Item'); // 'Item' | 'Stores'

  return (
    <div className="min-h-screen bg-white flex flex-col pb-24">
      {/* Header */}
      <header className="pt-4 pb-4 px-4 flex justify-center items-center border-b border-gray-100 sticky top-0 bg-white z-10">
        <h1 className="font-bold text-lg text-gray-900">Favourite</h1>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        <button 
          onClick={() => setActiveTab('Item')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors relative ${activeTab === 'Item' ? 'text-primary' : 'text-gray-400'}`}
        >
          Item
          {activeTab === 'Item' && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-t-full" />
          )}
        </button>
        <button 
          onClick={() => setActiveTab('Stores')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors relative ${activeTab === 'Stores' ? 'text-primary' : 'text-gray-400'}`}
        >
          Stores
          {activeTab === 'Stores' && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-t-full" />
          )}
        </button>
      </div>

      {/* Empty State */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 mt-20">
        <div className="relative mb-6 text-gray-300">
          {/* Custom Illustration SVG Matching the Design */}
          <svg width="160" height="160" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M40 100 L160 100 L140 150 L60 150 Z" stroke="currentColor" strokeWidth="4" strokeLinejoin="round"/>
            <path d="M110 130 H120" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
            <path d="M90 130 H100" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
            <rect x="120" y="50" width="60" height="40" rx="20" stroke="currentColor" strokeWidth="4"/>
            <path d="M140 60 L160 80 M160 60 L140 80" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
            <circle cx="100" cy="70" r="10" stroke="currentColor" strokeWidth="4"/>
            <path d="M60 80 L70 90 M70 80 L60 90" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
            <path d="M160 70 L170 80 M170 70 L160 80" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
            <circle cx="40" cy="50" r="5" stroke="currentColor" strokeWidth="4"/>
          </svg>
        </div>
        <h2 className="text-gray-400 font-semibold text-lg">No favourite data found</h2>
      </div>
    </div>
  );
}

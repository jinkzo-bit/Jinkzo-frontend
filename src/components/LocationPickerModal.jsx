import React from 'react';
import { X } from 'lucide-react';
import LocationPicker from './maps/LocationPicker';

export default function LocationPickerModal({ isOpen, onClose, onConfirm, initialAddress, title = 'Set Delivery Location' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in p-2 sm:p-4">
      <div
        className="bg-[#141414] border border-white/10 rounded-3xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden"
        style={{ maxHeight: '96vh' }}
      >
        {/* TOP BAR */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <h3 className="font-display font-black text-white text-sm tracking-wide">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* REUSABLE PICKER COMPONENT */}
        <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
          <LocationPicker
            initialAddress={initialAddress}
            onConfirm={onConfirm}
            buttonText="SAVE ADDRESS"
          />
        </div>
      </div>
    </div>
  );
}

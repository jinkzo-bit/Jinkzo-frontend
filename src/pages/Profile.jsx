import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { API_BASE } from '../config/api';
import { 
  User, 
  MapPin, 
  MessageCircle, 
  HelpCircle, 
  Info, 
  FileText, 
  Shield, 
  RotateCcw,
  LogOut,
  Globe
} from 'lucide-react';
import { formatAppDate } from '../utils/dateUtils';

export default function Profile() {
  const { user, token, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) return null;

  const MenuItem = ({ icon: Icon, label, onClick }) => (
    <button onClick={onClick} className="w-full flex items-center gap-4 py-4 px-4 bg-white hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
      <Icon className="w-5 h-5 text-gray-700" />
      <span className="font-semibold text-gray-900 text-sm flex-1 text-left">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-[#ffeef2] flex flex-col pb-24">
      {/* Top Red Header */}
      <div className="bg-primary text-white pt-8 pb-8 px-6 flex items-center gap-4 rounded-b-3xl">
        <div className="w-20 h-20 rounded-full border-4 border-white/30 flex items-center justify-center bg-white/20 overflow-hidden">
          <User className="w-10 h-10 text-white" />
        </div>
        <div className="flex flex-col">
          <h2 className="text-xl font-bold">{user.name || 'User'}</h2>
          <p className="text-sm font-medium text-white/80">{user.createdAt ? formatAppDate(user.createdAt) : 'New Member'}</p>
        </div>
      </div>

      <div className="px-4 mt-6 space-y-6">
        
        {/* General Section */}
        <div>
          <h3 className="text-primary/70 font-bold text-sm mb-3 px-2">General</h3>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
            <MenuItem icon={User} label="Profile" onClick={() => {}} />
            <MenuItem icon={MapPin} label="My Address" onClick={() => {}} />
            <MenuItem icon={Globe} label="Language" onClick={() => {}} />
          </div>
        </div>

        {/* Help & Support Section */}
        <div>
          <h3 className="text-primary/70 font-bold text-sm mb-3 px-2">Help & Support</h3>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
            <MenuItem icon={MessageCircle} label="Live Chat" onClick={() => {}} />
            <MenuItem icon={HelpCircle} label="Help & Support" onClick={() => {}} />
            <MenuItem icon={Info} label="About Us" onClick={() => {}} />
            <MenuItem icon={FileText} label="Terms & Conditions" onClick={() => {}} />
            <MenuItem icon={Shield} label="Privacy Policy" onClick={() => {}} />
            <MenuItem icon={RotateCcw} label="Refund Policy" onClick={() => {}} />
          </div>
        </div>

        {/* Logout Button */}
        <div className="flex justify-center mt-8">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-primary font-bold hover:bg-primary/5 px-6 py-3 rounded-full transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>

      </div>
    </div>
  );
}

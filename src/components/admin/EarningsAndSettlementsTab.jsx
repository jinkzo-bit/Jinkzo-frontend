import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign, TrendingUp, ShieldAlert, Sparkles, Filter, Calendar,
  Search, RefreshCw, CheckCircle2, Clock, AlertTriangle, ChevronRight,
  ArrowUpRight, ArrowDownRight, Layers, Store, Bike, Users, Tag,
  Eye, Check, X, ShieldCheck, HelpCircle, FileText, ChevronDown, Download,
  AlertCircle
} from 'lucide-react';
import { API_BASE } from '../../config/api';
import { formatAppDate, formatAppDateOnly } from '../../utils/dateUtils';
import { FINANCIAL_DATE_FILTER_OPTIONS } from '../../utils/settlementPricing';
import { formatCurrency } from '../../utils/orderUtils';

export default function EarningsAndSettlementsTab({ token }) {
  const [activeSubTab, setActiveSubTab] = useState('overview'); // 'overview', 'pricing_concessions', 'item_commissions', 'partner_settlements', 'rider_earnings', 'rider_cod', 'partner_wise', 'item_wise'
  
  // Date Filtering State
  const [dateFilter, setDateFilter] = useState('this_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);

  // Data States
  const [overviewData, setOverviewData] = useState(null);
  const [isOverviewLoading, setIsOverviewLoading] = useState(true);

  const [pricingData, setPricingData] = useState(null);
  const [isPricingLoading, setIsPricingLoading] = useState(true);

  const [itemCommissionsData, setItemCommissionsData] = useState(null);
  const [isItemCommissionsLoading, setIsItemCommissionsLoading] = useState(true);
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [itemCategoryFilter, setItemCategoryFilter] = useState('all');

  const [partnerSettlementsData, setPartnerSettlementsData] = useState(null);
  const [isPartnerSettlementsLoading, setIsPartnerSettlementsLoading] = useState(true);
  const [partnerTypeFilter, setPartnerTypeFilter] = useState('all');
  const [partnerStatusFilter, setPartnerStatusFilter] = useState('all');

  const [riderEarningsData, setRiderEarningsData] = useState(null);
  const [isRiderEarningsLoading, setIsRiderEarningsLoading] = useState(true);
  const [riderStatusFilter, setRiderStatusFilter] = useState('all');
  const [selectedRiderFilter, setSelectedRiderFilter] = useState('all');

  const [riderCodData, setRiderCodData] = useState(null);
  const [isRiderCodLoading, setIsRiderCodLoading] = useState(true);
  const [codStatusFilter, setCodStatusFilter] = useState('all');

  const [partnerWiseData, setPartnerWiseData] = useState(null);
  const [isPartnerWiseLoading, setIsPartnerWiseLoading] = useState(true);

  // Authoritative Master Commission State
  const [masterCommissionEnabled, setMasterCommissionEnabled] = useState(false);

  // Action Modals State
  const [showMasterSwitchModal, setShowMasterSwitchModal] = useState(false);
  const [isMasterSwitchUpdating, setIsMasterSwitchUpdating] = useState(false);
  const [masterSwitchModalError, setMasterSwitchModalError] = useState('');

  const [partnerConcessionConfirmModal, setPartnerConcessionConfirmModal] = useState(null); // { partnerId, partnerType, partnerName, currentEnabled }
  const [isPartnerConcessionUpdating, setIsPartnerConcessionUpdating] = useState(false);

  const [selectedPartnerForPrices, setSelectedPartnerForPrices] = useState(null); // { partnerId, partnerName, partnerType }

  const [editItemModal, setEditItemModal] = useState(null); // item object to edit
  const [editItemForm, setEditItemForm] = useState({ price: '', partnerSettlementPrice: '', pricingConcessionMode: 'inherit' });
  const [isItemSaving, setIsItemSaving] = useState(false);

  // Payment Recording Modals
  const [recordPartnerPaymentModal, setRecordPartnerPaymentModal] = useState(null); // partner object
  const [partnerPaymentForm, setPartnerPaymentForm] = useState({ amount: '', paymentMethod: 'Cash', reference: '', notes: '' });
  const [isRecordingPartnerPayment, setIsRecordingPartnerPayment] = useState(false);

  const [recordRiderPaymentModal, setRecordRiderPaymentModal] = useState(null); // rider object
  const [riderPaymentForm, setRiderPaymentForm] = useState({ amount: '', paymentMethod: 'Cash', reference: '', notes: '' });
  const [isRecordingRiderPayment, setIsRecordingRiderPayment] = useState(false);

  const [recordCodReturnModal, setRecordCodReturnModal] = useState(null); // rider object
  const [codReturnForm, setCodReturnForm] = useState({ amount: '', paymentMethod: 'Cash', reference: '', notes: '' });
  const [isRecordingCodReturn, setIsRecordingCodReturn] = useState(false);

  const [selectedPartnerDetail, setSelectedPartnerDetail] = useState(null);
  const [selectedRiderDetail, setSelectedRiderDetail] = useState(null);

  // -------------------------------------------------------------
  // Data Fetchers
  // -------------------------------------------------------------
  const fetchOverview = async () => {
    try {
      setIsOverviewLoading(true);
      const q = new URLSearchParams({ dateFilter, startDate: customStartDate, endDate: customEndDate });
      const res = await fetch(`${API_BASE}/admin/financials/overview?${q}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOverviewData(data);
        if (data?.masterSwitch?.itemCommissionEnabled !== undefined) {
          setMasterCommissionEnabled(Boolean(data.masterSwitch.itemCommissionEnabled));
        }
      }
    } catch (err) {
      console.error('Error fetching financial overview:', err);
    } finally {
      setIsOverviewLoading(false);
    }
  };

  const fetchPricingConcessions = async () => {
    try {
      setIsPricingLoading(true);
      const res = await fetch(`${API_BASE}/admin/financials/pricing-concessions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPricingData(data);
        if (data?.itemCommissionEnabled !== undefined) {
          setMasterCommissionEnabled(Boolean(data.itemCommissionEnabled));
        }
      }
    } catch (err) {
      console.error('Error fetching pricing concessions:', err);
    } finally {
      setIsPricingLoading(false);
    }
  };

  const fetchItemCommissions = async () => {
    try {
      setIsItemCommissionsLoading(true);
      const q = new URLSearchParams({
        dateFilter,
        startDate: customStartDate,
        endDate: customEndDate,
        category: itemCategoryFilter,
        search: itemSearchQuery
      });
      const res = await fetch(`${API_BASE}/admin/financials/item-commissions?${q}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setItemCommissionsData(data);
      }
    } catch (err) {
      console.error('Error fetching item commissions:', err);
    } finally {
      setIsItemCommissionsLoading(false);
    }
  };

  const fetchPartnerSettlements = async () => {
    try {
      setIsPartnerSettlementsLoading(true);
      const q = new URLSearchParams({
        dateFilter,
        startDate: customStartDate,
        endDate: customEndDate,
        partnerType: partnerTypeFilter,
        statusFilter: partnerStatusFilter
      });
      const res = await fetch(`${API_BASE}/admin/financials/partner-settlements?${q}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPartnerSettlementsData(data);
      }
    } catch (err) {
      console.error('Error fetching partner settlements:', err);
    } finally {
      setIsPartnerSettlementsLoading(false);
    }
  };

  const fetchRiderEarnings = async () => {
    try {
      setIsRiderEarningsLoading(true);
      const q = new URLSearchParams({
        dateFilter,
        startDate: customStartDate,
        endDate: customEndDate,
        riderId: selectedRiderFilter,
        statusFilter: riderStatusFilter
      });
      const res = await fetch(`${API_BASE}/admin/financials/rider-earnings?${q}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRiderEarningsData(data);
      }
    } catch (err) {
      console.error('Error fetching rider earnings:', err);
    } finally {
      setIsRiderEarningsLoading(false);
    }
  };

  const fetchRiderCod = async () => {
    try {
      setIsRiderCodLoading(true);
      const q = new URLSearchParams({
        dateFilter,
        startDate: customStartDate,
        endDate: customEndDate,
        riderId: selectedRiderFilter,
        statusFilter: codStatusFilter
      });
      const res = await fetch(`${API_BASE}/admin/financials/rider-cod?${q}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRiderCodData(data);
      }
    } catch (err) {
      console.error('Error fetching rider COD:', err);
    } finally {
      setIsRiderCodLoading(false);
    }
  };

  const fetchPartnerWise = async () => {
    try {
      setIsPartnerWiseLoading(true);
      const q = new URLSearchParams({ dateFilter, startDate: customStartDate, endDate: customEndDate });
      const res = await fetch(`${API_BASE}/admin/financials/partner-wise-earnings?${q}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPartnerWiseData(data);
      }
    } catch (err) {
      console.error('Error fetching partner-wise data:', err);
    } finally {
      setIsPartnerWiseLoading(false);
    }
  };

  // Reload data when active subtab or date filter changes
  useEffect(() => {
    if (activeSubTab === 'overview') fetchOverview();
    else if (activeSubTab === 'pricing_concessions') fetchPricingConcessions();
    else if (activeSubTab === 'item_commissions') fetchItemCommissions();
    else if (activeSubTab === 'partner_settlements') fetchPartnerSettlements();
    else if (activeSubTab === 'rider_earnings') fetchRiderEarnings();
    else if (activeSubTab === 'rider_cod') fetchRiderCod();
    else if (activeSubTab === 'partner_wise') fetchPartnerWise();
    else if (activeSubTab === 'item_wise') fetchItemCommissions();
  }, [activeSubTab, dateFilter, customStartDate, customEndDate, itemCategoryFilter, partnerTypeFilter, partnerStatusFilter, riderStatusFilter, codStatusFilter, selectedRiderFilter]);

  // Master switch toggle handler
  const handleToggleMasterSwitch = async (newEnabled) => {
    setIsMasterSwitchUpdating(true);
    setMasterSwitchModalError('');
    try {
      const res = await fetch(`${API_BASE}/admin/financials/master-switch`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ enabled: Boolean(newEnabled), itemCommissionEnabled: Boolean(newEnabled) })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const confirmedState = Boolean(data.itemCommissionEnabled);
        setMasterCommissionEnabled(confirmedState);
        setShowMasterSwitchModal(false);
        await Promise.all([fetchOverview(), fetchPricingConcessions()]);
      } else {
        const errMsg = data?.message || 'Unable to update Item Commission setting. Please try again.';
        console.error('[ADMIN FINANCIALS] Master switch toggle failed:', errMsg, data);
        setMasterSwitchModalError(errMsg);
      }
    } catch (err) {
      console.error('[ADMIN FINANCIALS] Failed to toggle master switch:', err);
      setMasterSwitchModalError('Network error updating Master Commission setting. Please try again.');
    } finally {
      setIsMasterSwitchUpdating(false);
    }
  };

  // Partner concession toggle handler
  const handleTogglePartnerConcession = async () => {
    if (!partnerConcessionConfirmModal) return;
    setIsPartnerConcessionUpdating(true);
    try {
      const res = await fetch(`${API_BASE}/admin/financials/partner-concession`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          partnerId: partnerConcessionConfirmModal.partnerId,
          partnerType: partnerConcessionConfirmModal.partnerType,
          enabled: !partnerConcessionConfirmModal.currentEnabled
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPartnerConcessionConfirmModal(null);
        await fetchPricingConcessions();
      } else {
        alert(data.message || 'Failed to update partner concession agreement.');
      }
    } catch (err) {
      console.error('Failed to toggle partner concession:', err);
      alert(`Error updating partner concession: ${err.message}`);
    } finally {
      setIsPartnerConcessionUpdating(false);
    }
  };

  // Save Item pricing handler
  const handleSaveItemPricing = async (e) => {
    e.preventDefault();
    if (!editItemModal) return;
    setIsItemSaving(true);
    try {
      const res = await fetch(`${API_BASE}/admin/financials/item-pricing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          itemId: editItemModal._id,
          itemModel: editItemModal.itemModel,
          price: editItemForm.price === '' ? editItemModal.price : Number(editItemForm.price),
          partnerSettlementPrice: editItemForm.partnerSettlementPrice === '' ? null : Number(editItemForm.partnerSettlementPrice),
          pricingConcessionMode: editItemForm.pricingConcessionMode
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEditItemModal(null);
        await fetchPricingConcessions();
      } else {
        alert(data.message || 'Failed to save item pricing.');
      }
    } catch (err) {
      console.error('Failed to save item pricing:', err);
      alert(`Error saving item pricing: ${err.message}`);
    } finally {
      setIsItemSaving(false);
    }
  };

  // Record Partner payment
  const handleRecordPartnerPayment = async (e) => {
    e.preventDefault();
    if (!recordPartnerPaymentModal) return;
    setIsRecordingPartnerPayment(true);
    try {
      const res = await fetch(`${API_BASE}/admin/financials/partner-settlements/record-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          partnerId: recordPartnerPaymentModal.partnerId,
          partnerType: recordPartnerPaymentModal.partnerType,
          partnerName: recordPartnerPaymentModal.partnerName,
          amount: partnerPaymentForm.amount,
          paymentMethod: partnerPaymentForm.paymentMethod,
          reference: partnerPaymentForm.reference,
          notes: partnerPaymentForm.notes
        })
      });
      if (res.ok) {
        setRecordPartnerPaymentModal(null);
        setPartnerPaymentForm({ amount: '', paymentMethod: 'Cash', reference: '', notes: '' });
        fetchPartnerSettlements();
        fetchOverview();
      }
    } catch (err) {
      console.error('Failed to record partner payment:', err);
    } finally {
      setIsRecordingPartnerPayment(false);
    }
  };

  // Record Rider Earnings payment
  const handleRecordRiderPayment = async (e) => {
    e.preventDefault();
    if (!recordRiderPaymentModal) return;
    setIsRecordingRiderPayment(true);
    try {
      const res = await fetch(`${API_BASE}/admin/financials/rider-earnings/record-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          riderId: recordRiderPaymentModal.riderId,
          riderName: recordRiderPaymentModal.riderName,
          amount: riderPaymentForm.amount,
          paymentMethod: riderPaymentForm.paymentMethod,
          reference: riderPaymentForm.reference,
          notes: riderPaymentForm.notes
        })
      });
      if (res.ok) {
        setRecordRiderPaymentModal(null);
        setRiderPaymentForm({ amount: '', paymentMethod: 'Cash', reference: '', notes: '' });
        fetchRiderEarnings();
        fetchOverview();
      }
    } catch (err) {
      console.error('Failed to record rider payment:', err);
    } finally {
      setIsRecordingRiderPayment(false);
    }
  };

  // Record Rider COD return
  const handleRecordCodReturn = async (e) => {
    e.preventDefault();
    if (!recordCodReturnModal) return;
    setIsRecordingCodReturn(true);
    try {
      const res = await fetch(`${API_BASE}/admin/financials/rider-cod/record-return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          riderId: recordCodReturnModal.riderId,
          riderName: recordCodReturnModal.riderName,
          amount: codReturnForm.amount,
          paymentMethod: codReturnForm.paymentMethod,
          reference: codReturnForm.reference,
          notes: codReturnForm.notes
        })
      });
      if (res.ok) {
        setRecordCodReturnModal(null);
        setCodReturnForm({ amount: '', paymentMethod: 'Cash', reference: '', notes: '' });
        fetchRiderCod();
        fetchOverview();
      }
    } catch (err) {
      console.error('Failed to record COD return:', err);
    } finally {
      setIsRecordingCodReturn(false);
    }
  };

  const isMasterCommissionOn = Boolean(overviewData?.masterSwitch?.itemCommissionEnabled ?? pricingData?.itemCommissionEnabled);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      
      {/* ── 1. TOP HEADER & MASTER COMMISSION SYSTEM STATUS ───────────────── */}
      <div className="bg-surface border border-line p-6 rounded-3xl shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-xl border border-primary/20 shrink-0">
            ₹
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-black text-xl text-main">Earnings & Partner Settlements</h2>
              <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                masterCommissionEnabled 
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-gray-100 text-gray-700 border-gray-200'
              }`}>
                {masterCommissionEnabled ? 'Commission Pricing Active' : 'Normal Pricing — Commission OFF'}
              </span>
            </div>
            <p className="text-xs text-muted font-medium mt-0.5">
              Cash on Delivery ledger, partner payables, rider delivery earnings, and Jinkzo item commission.
            </p>
          </div>
        </div>

        {/* Master Switch Quick Control */}
        <div className="flex items-center gap-3 bg-base p-2 rounded-2xl border border-line">
          <div className="flex flex-col">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted">Master Commission</span>
            <span className="text-xs font-black text-main">{masterCommissionEnabled ? 'SYSTEM ON' : 'SYSTEM OFF'}</span>
          </div>
          <button
            onClick={() => setShowMasterSwitchModal(true)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer ${
              masterCommissionEnabled
                ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                : 'bg-primary text-white hover:bg-primary-hover'
            }`}
          >
            {masterCommissionEnabled ? 'Turn OFF' : 'Turn ON'}
          </button>
        </div>
      </div>

      {/* ── 2. SUB-TABS NAVIGATION BAR ────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin border-b border-line">
        {[
          { id: 'overview', label: 'Financial Overview', icon: TrendingUp },
          { id: 'pricing_concessions', label: 'Pricing & Concessions', icon: Tag },
          { id: 'item_commissions', label: 'Item Commissions', icon: Sparkles },
          { id: 'partner_settlements', label: 'Partner Settlements', icon: Store },
          { id: 'rider_earnings', label: 'Rider Earnings', icon: Bike },
          { id: 'rider_cod', label: 'Rider COD Collections', icon: DollarSign },
          { id: 'partner_wise', label: 'Partner-wise Summary', icon: Layers },
          { id: 'item_wise', label: 'Item-wise Summary', icon: FileText }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-muted hover:text-main hover:bg-surface border border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── 3. UNIFIED DATE FILTER TOOLBAR ─────────────────────────────────── */}
      {activeSubTab !== 'pricing_concessions' && (
        <div className="bg-surface border border-line p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="font-extrabold text-main uppercase tracking-wider text-[11px]">Period Filter:</span>
            <div className="flex flex-wrap items-center gap-1">
              {FINANCIAL_DATE_FILTER_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setDateFilter(opt.id);
                    if (opt.id === 'custom') setShowCustomDateModal(true);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    dateFilter === opt.id
                      ? 'bg-primary text-white shadow-2xs'
                      : 'bg-base text-muted hover:text-main hover:bg-gray-200 dark:hover:bg-gray-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {dateFilter === 'custom' && customStartDate && (
            <div className="flex items-center gap-2 bg-base px-3 py-1.5 rounded-xl border border-line text-[11px] font-semibold text-muted">
              <span>{formatAppDateOnly(customStartDate)} – {formatAppDateOnly(customEndDate || customStartDate)}</span>
              <button onClick={() => setShowCustomDateModal(true)} className="text-primary font-bold underline cursor-pointer">Change</button>
            </div>
          )}
        </div>
      )}

      {/* ── 4. TAB CONTENTS ──────────────────────────────────────────────── */}

      {/* ── A. OVERVIEW SUB-TAB ── */}
      {activeSubTab === 'overview' && (
        <div className="flex flex-col gap-6">
          {isOverviewLoading ? (
            <div className="p-16 text-center text-muted font-bold">Loading financial metrics...</div>
          ) : (
            <>
              {/* Group 1: Jinkzo Real Revenue */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-extrabold text-sm text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    <span>Jinkzo Total Revenue (Actual Profit & Earnings)</span>
                  </h3>
                  <span className="text-[11px] text-muted font-semibold">Item Commission + Platform Fee</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-violet-600 to-indigo-700 text-white p-5 rounded-3xl shadow-sm flex flex-col justify-between min-h-[110px]">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-violet-200">Total Jinkzo Revenue</span>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-2xl font-black">{formatCurrency(overviewData?.revenue?.totalJinkzoRevenue)}</span>
                      <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-md font-bold">100% Platform Net</span>
                    </div>
                  </div>

                  <div className="bg-surface border border-line p-5 rounded-3xl shadow-2xs flex flex-col justify-between min-h-[110px]">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted">Item Commission Earned</span>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-xl font-black text-main">{formatCurrency(overviewData?.revenue?.itemCommissionEarned)}</span>
                      <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded font-bold">Price Diff Margin</span>
                    </div>
                  </div>

                  <div className="bg-surface border border-line p-5 rounded-3xl shadow-2xs flex flex-col justify-between min-h-[110px]">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted">Platform Fees Collected</span>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-xl font-black text-main">{formatCurrency(overviewData?.revenue?.platformFees)}</span>
                      <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded font-bold">Customer Fee</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Group 2: Cash Collected & Partner/Rider Liabilities */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between border-t border-line pt-4">
                  <h3 className="font-display font-extrabold text-sm text-main uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-muted" />
                    <span>Cash On Delivery & Outstanding Liabilities (Not Jinkzo Profit)</span>
                  </h3>
                  <span className="text-[11px] text-muted font-semibold">Separate Partner & Rider Ledgers</span>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-surface border border-line p-4 rounded-3xl shadow-2xs flex flex-col justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted">Customer COD Sales</span>
                    <span className="text-lg font-black text-main mt-2">{formatCurrency(overviewData?.liabilitiesAndCash?.customerCodSales)}</span>
                    <span className="text-[9px] text-muted font-semibold mt-1">Total COD volume</span>
                  </div>

                  <div className="bg-surface border border-line p-4 rounded-3xl shadow-2xs flex flex-col justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted">Partner Payables</span>
                    <span className="text-lg font-black text-blue-600 mt-2">{formatCurrency(overviewData?.liabilitiesAndCash?.partnerPayables)}</span>
                    <span className="text-[9px] text-muted font-semibold mt-1">Pending: {formatCurrency(overviewData?.liabilitiesAndCash?.partnerSettlementsPending)}</span>
                  </div>

                  <div className="bg-surface border border-line p-4 rounded-3xl shadow-2xs flex flex-col justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted">Rider Delivery Earnings</span>
                    <span className="text-lg font-black text-emerald-600 mt-2">{formatCurrency(overviewData?.liabilitiesAndCash?.riderDeliveryEarnings)}</span>
                    <span className="text-[9px] text-muted font-semibold mt-1">Pending: {formatCurrency(overviewData?.liabilitiesAndCash?.riderEarningsPending)}</span>
                  </div>

                  <div className="bg-surface border border-line p-4 rounded-3xl shadow-2xs flex flex-col justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted">COD Pending with Riders</span>
                    <span className="text-lg font-black text-amber-600 mt-2">{formatCurrency(overviewData?.liabilitiesAndCash?.riderCodPending)}</span>
                    <span className="text-[9px] text-muted font-semibold mt-1">Returned: {formatCurrency(overviewData?.liabilitiesAndCash?.riderCodReturned)}</span>
                  </div>
                </div>
              </div>

              {/* Financial Flow Reconciliation Diagram */}
              <div className="bg-base/70 border border-line rounded-3xl p-5 flex flex-col gap-3">
                <h4 className="font-display font-extrabold text-xs uppercase tracking-wider text-main flex items-center justify-between">
                  <span>Jinkzo Financial Reconciliation Equation</span>
                  <span className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded border border-green-200">100% Balanced</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-center text-xs">
                  <div className="bg-surface p-3 rounded-2xl border border-line flex flex-col">
                    <span className="text-[9px] text-muted font-bold uppercase">Customer COD Total</span>
                    <span className="font-black text-sm text-main mt-1">{formatCurrency(overviewData?.liabilitiesAndCash?.customerCodSales)}</span>
                  </div>
                  <div className="bg-surface p-3 rounded-2xl border border-line flex flex-col">
                    <span className="text-[9px] text-muted font-bold uppercase">= Partner Payables</span>
                    <span className="font-black text-sm text-blue-600 mt-1">{formatCurrency(overviewData?.liabilitiesAndCash?.partnerPayables)}</span>
                  </div>
                  <div className="bg-surface p-3 rounded-2xl border border-line flex flex-col">
                    <span className="text-[9px] text-muted font-bold uppercase">+ Rider Delivery Fee</span>
                    <span className="font-black text-sm text-emerald-600 mt-1">{formatCurrency(overviewData?.liabilitiesAndCash?.riderDeliveryEarnings)}</span>
                  </div>
                  <div className="bg-surface p-3 rounded-2xl border border-line flex flex-col">
                    <span className="text-[9px] text-muted font-bold uppercase">+ Item Commission</span>
                    <span className="font-black text-sm text-primary mt-1">{formatCurrency(overviewData?.revenue?.itemCommissionEarned)}</span>
                  </div>
                  <div className="bg-surface p-3 rounded-2xl border border-line flex flex-col">
                    <span className="text-[9px] text-muted font-bold uppercase">+ Platform Fee</span>
                    <span className="font-black text-sm text-purple-600 mt-1">{formatCurrency(overviewData?.revenue?.platformFees)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── B. PRICING & CONCESSIONS SUB-TAB ── */}
      {activeSubTab === 'pricing_concessions' && (
        <div className="flex flex-col gap-6">
          {isPricingLoading ? (
            <div className="p-16 text-center text-muted font-bold">Loading pricing & concession agreements...</div>
          ) : (
            <>
              {/* Partner List & Concession Agreements */}
              <div className="bg-surface border border-line rounded-3xl p-6 shadow-2xs flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
                  <div>
                    <h3 className="font-display font-extrabold text-base text-main">Partner List & Concession Agreements</h3>
                    <p className="text-xs text-muted font-medium mt-0.5">
                      Enable or disable price concessions per hotel/store partner and manage individual item prices.
                    </p>
                  </div>
                </div>

                {/* Unified Partners Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-line text-[10px] uppercase font-extrabold text-muted">
                        <th className="pb-2">Partner Name</th>
                        <th className="pb-2">Partner Type</th>
                        <th className="pb-2">Concession Agreement</th>
                        <th className="pb-2">Configured Items</th>
                        <th className="pb-2">Items With Concession</th>
                        <th className="pb-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {[
                        ...(pricingData?.restaurants || []).map(r => ({ ...r, partnerType: 'restaurant', partnerCategory: 'Restaurant (Food)' })),
                        ...(pricingData?.suppliers || []).map(s => ({ ...s, partnerType: 'supplier', partnerCategory: `${(s.category || 'Store').toUpperCase()} STORE` }))
                      ].map(partner => {
                        const partnerItems = (pricingData?.items || []).filter(i => String(i.sourceId) === String(partner._id));
                        const concessionItemsCount = partnerItems.filter(i => i.partnerSettlementPrice != null && Number(i.partnerSettlementPrice) < Number(i.price)).length;
                        return (
                          <tr key={partner._id} className="hover:bg-base/50">
                            <td className="py-3 font-bold text-main">
                              <div className="flex items-center gap-2">
                                <span className="text-base">{partner.partnerType === 'restaurant' ? '🍽️' : '🏪'}</span>
                                <span>{partner.name}</span>
                              </div>
                            </td>
                            <td className="py-3">
                              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-base border border-line text-muted">
                                {partner.partnerCategory}
                              </span>
                            </td>
                            <td className="py-3">
                              <button
                                onClick={() => setPartnerConcessionConfirmModal({
                                  partnerId: partner._id,
                                  partnerType: partner.partnerType,
                                  partnerName: partner.name,
                                  currentEnabled: partner.priceConcessionEnabled
                                })}
                                className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer ${
                                  partner.priceConcessionEnabled
                                    ? 'bg-green-100 text-green-700 border border-green-200 hover:bg-green-200'
                                    : 'bg-gray-100 text-muted border border-gray-200 hover:bg-gray-200'
                                }`}
                              >
                                Concession: {partner.priceConcessionEnabled ? 'ON' : 'OFF'}
                              </button>
                            </td>
                            <td className="py-3 font-semibold text-main">{partnerItems.length} items</td>
                            <td className="py-3">
                              <span className={`font-bold ${concessionItemsCount > 0 ? 'text-green-600' : 'text-muted'}`}>
                                {concessionItemsCount} of {partnerItems.length}
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => setSelectedPartnerForPrices({
                                  partnerId: partner._id,
                                  partnerName: partner.name,
                                  partnerType: partner.partnerType
                                })}
                                className="bg-primary hover:bg-primary-hover text-white font-bold text-[10px] px-3 py-1.5 rounded-xl shadow-2xs transition-colors cursor-pointer"
                              >
                                Manage Prices
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Items Price & Settlement Editor */}
              <div className="bg-surface border border-line rounded-3xl p-6 shadow-2xs flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
                  <div>
                    <h3 className="font-display font-extrabold text-base text-main">Item Settlement Prices & Overrides</h3>
                    <p className="text-xs text-muted font-medium mt-0.5">Configure individual item settlement prices and concession override modes.</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-line text-[10px] uppercase font-extrabold text-muted">
                        <th className="pb-2">Item Name</th>
                        <th className="pb-2">Partner</th>
                        <th className="pb-2">Selling Price</th>
                        <th className="pb-2">Settlement Price</th>
                        <th className="pb-2">Commission / Item</th>
                        <th className="pb-2">Margin %</th>
                        <th className="pb-2">Override Mode</th>
                        <th className="pb-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {pricingData?.items?.map(item => {
                        const selling = Number(item.price || 0);
                        const settlement = item.partnerSettlementPrice != null ? Number(item.partnerSettlementPrice) : selling;
                        const comm = Math.max(0, selling - settlement);
                        const margin = selling > 0 ? ((comm / selling) * 100) : 0;
                        return (
                          <tr key={item._id} className="hover:bg-base/50">
                            <td className="py-2.5 font-bold text-main">{item.name}</td>
                            <td className="py-2.5 text-muted">{item.sourceName}</td>
                            <td className="py-2.5 font-black text-main">{formatCurrency(selling)}</td>
                            <td className="py-2.5 font-black text-blue-600">{formatCurrency(settlement)}</td>
                            <td className="py-2.5 font-bold text-green-600">{formatCurrency(comm)}</td>
                            <td className="py-2.5 font-medium text-muted">{Number(margin).toFixed(1)}%</td>
                            <td className="py-2.5">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                                item.pricingConcessionMode === 'enabled' ? 'bg-green-100 text-green-700' :
                                item.pricingConcessionMode === 'disabled' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-muted'
                              }`}>
                                {item.pricingConcessionMode || 'inherit'}
                              </span>
                            </td>
                            <td className="py-2.5 text-right">
                              <button
                                onClick={() => {
                                  setEditItemModal(item);
                                  setEditItemForm({
                                    partnerSettlementPrice: item.partnerSettlementPrice != null ? String(item.partnerSettlementPrice) : '',
                                    pricingConcessionMode: item.pricingConcessionMode || 'inherit'
                                  });
                                }}
                                className="bg-primary/10 hover:bg-primary/20 text-primary px-2.5 py-1 rounded-lg font-bold text-[10px] cursor-pointer"
                              >
                                Edit Pricing
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── C. ITEM COMMISSIONS REPORT SUB-TAB ── */}
      {(activeSubTab === 'item_commissions' || activeSubTab === 'item_wise') && (
        <div className="flex flex-col gap-4">
          {isItemCommissionsLoading ? (
            <div className="p-16 text-center text-muted font-bold">Loading item commissions report...</div>
          ) : (
            <>
              {/* Notice when master commission is OFF */}
              {!masterCommissionEnabled && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 p-4 rounded-2xl flex items-center gap-3 text-amber-800 dark:text-amber-300 text-xs font-semibold">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-extrabold uppercase tracking-wide">Item Commission System is currently OFF.</span>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                      New orders currently earn ₹0 item commission (Settlement Price = Customer Selling Price). Historical commissions from active periods remain visible below.
                    </p>
                  </div>
                </div>
              )}

              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-surface border border-line p-4 rounded-2xl shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-muted">Total Quantity Sold</span>
                  <p className="text-xl font-black text-main mt-1">{itemCommissionsData?.summary?.totalQuantitySold || 0} units</p>
                </div>
                <div className="bg-surface border border-line p-4 rounded-2xl shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-muted">Customer Sales</span>
                  <p className="text-xl font-black text-main mt-1">{formatCurrency(itemCommissionsData?.summary?.totalCustomerSales)}</p>
                </div>
                <div className="bg-surface border border-line p-4 rounded-2xl shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-muted">Partner Payable</span>
                  <p className="text-xl font-black text-blue-600 mt-1">{formatCurrency(itemCommissionsData?.summary?.totalPartnerPayable)}</p>
                </div>
                <div className="bg-surface border border-line p-4 rounded-2xl shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-muted">Jinkzo Item Commission</span>
                  <p className="text-xl font-black text-green-600 mt-1">{formatCurrency(itemCommissionsData?.summary?.totalItemCommission)}</p>
                </div>
              </div>

              {/* Table Filter Toolbar */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-base border border-line px-3 py-2 rounded-xl flex-grow max-w-sm text-xs">
                  <Search className="w-3.5 h-3.5 text-muted" />
                  <input
                    type="text"
                    placeholder="Search item or partner..."
                    value={itemSearchQuery}
                    onChange={(e) => setItemSearchQuery(e.target.value)}
                    className="bg-transparent outline-none w-full"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="bg-surface border border-line rounded-3xl p-5 shadow-2xs overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-line text-[10px] uppercase font-extrabold text-muted">
                      <th className="pb-2">Item</th>
                      <th className="pb-2">Partner</th>
                      <th className="pb-2">Qty Sold</th>
                      <th className="pb-2">Selling Snapshot</th>
                      <th className="pb-2">Settlement Snapshot</th>
                      <th className="pb-2">Customer Sales</th>
                      <th className="pb-2">Partner Payable</th>
                      <th className="pb-2">Jinkzo Commission</th>
                      <th className="pb-2">Margin %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {itemCommissionsData?.items?.map(i => (
                      <tr key={i.itemId} className="hover:bg-base/50">
                        <td className="py-2.5 font-bold text-main">{i.name}</td>
                        <td className="py-2.5 text-muted">{i.partnerName}</td>
                        <td className="py-2.5 font-extrabold">{i.quantitySold}</td>
                        <td className="py-2.5 font-semibold">{formatCurrency(i.sellingUnitPrice)}</td>
                        <td className="py-2.5 font-semibold text-blue-600">{formatCurrency(i.settlementUnitPrice)}</td>
                        <td className="py-2.5 font-black">{formatCurrency(i.customerSales)}</td>
                        <td className="py-2.5 font-black text-blue-600">{formatCurrency(i.partnerPayable)}</td>
                        <td className="py-2.5 font-black text-green-600">{formatCurrency(i.jinkzoCommission)}</td>
                        <td className="py-2.5 font-bold text-muted">{Number(i.marginPercent || 0).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── D. PARTNER SETTLEMENTS SUB-TAB ── */}
      {activeSubTab === 'partner_settlements' && (
        <div className="flex flex-col gap-4">
          {isPartnerSettlementsLoading ? (
            <div className="p-16 text-center text-muted font-bold">Loading partner settlements...</div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-surface border border-line p-4 rounded-2xl shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-muted">Total Payable</span>
                  <p className="text-xl font-black text-main mt-1">{formatCurrency(partnerSettlementsData?.summary?.totalPayable)}</p>
                </div>
                <div className="bg-surface border border-line p-4 rounded-2xl shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-muted">Paid to Date</span>
                  <p className="text-xl font-black text-green-600 mt-1">{formatCurrency(partnerSettlementsData?.summary?.totalPaid)}</p>
                </div>
                <div className="bg-surface border border-line p-4 rounded-2xl shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-muted">Pending Balance</span>
                  <p className="text-xl font-black text-amber-600 mt-1">{formatCurrency(partnerSettlementsData?.summary?.totalPending)}</p>
                </div>
                <div className="bg-surface border border-line p-4 rounded-2xl shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-muted">Partners with Pending</span>
                  <p className="text-xl font-black text-main mt-1">{partnerSettlementsData?.summary?.partnersWithPending || 0}</p>
                </div>
              </div>

              <div className="bg-surface border border-line rounded-3xl p-5 shadow-2xs overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-line text-[10px] uppercase font-extrabold text-muted">
                      <th className="pb-2">Partner</th>
                      <th className="pb-2">Type</th>
                      <th className="pb-2">Orders</th>
                      <th className="pb-2">Item Sales</th>
                      <th className="pb-2">Total Payable</th>
                      <th className="pb-2">Paid</th>
                      <th className="pb-2">Pending</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {partnerSettlementsData?.partners?.map(p => (
                      <tr key={p.partnerId} className="hover:bg-base/50">
                        <td className="py-2.5 font-bold text-main">{p.partnerName}</td>
                        <td className="py-2.5 text-muted uppercase text-[10px]">{p.partnerType}</td>
                        <td className="py-2.5 font-extrabold">{p.orderCount}</td>
                        <td className="py-2.5 font-semibold">{formatCurrency(p.customerItemSales)}</td>
                        <td className="py-2.5 font-black text-blue-600">{formatCurrency(p.partnerPayable)}</td>
                        <td className="py-2.5 font-bold text-green-600">{formatCurrency(p.amountPaid)}</td>
                        <td className="py-2.5 font-black text-amber-600">{formatCurrency(p.amountPending)}</td>
                        <td className="py-2.5">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase ${
                            p.status === 'Settled' ? 'bg-green-100 text-green-700' :
                            p.status === 'Partially Settled' ? 'bg-blue-100 text-blue-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-2.5 text-right flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setRecordPartnerPaymentModal(p);
                              setPartnerPaymentForm({ amount: String(p.amountPending), paymentMethod: 'Cash', reference: '', notes: '' });
                            }}
                            className="bg-primary hover:bg-primary-hover text-white px-2.5 py-1 rounded-lg font-bold text-[10px] cursor-pointer"
                          >
                            Record Payment
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── E. RIDER EARNINGS SUB-TAB ── */}
      {activeSubTab === 'rider_earnings' && (
        <div className="flex flex-col gap-4">
          {isRiderEarningsLoading ? (
            <div className="p-16 text-center text-muted font-bold">Loading rider delivery earnings...</div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-surface border border-line p-4 rounded-2xl shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-muted">Total Rider Earnings</span>
                  <p className="text-xl font-black text-main mt-1">{formatCurrency(riderEarningsData?.summary?.totalRiderEarnings)}</p>
                </div>
                <div className="bg-surface border border-line p-4 rounded-2xl shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-muted">Paid to Date</span>
                  <p className="text-xl font-black text-green-600 mt-1">{formatCurrency(riderEarningsData?.summary?.totalRiderPaid)}</p>
                </div>
                <div className="bg-surface border border-line p-4 rounded-2xl shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-muted">Pending Payout</span>
                  <p className="text-xl font-black text-amber-600 mt-1">{formatCurrency(riderEarningsData?.summary?.totalRiderPending)}</p>
                </div>
                <div className="bg-surface border border-line p-4 rounded-2xl shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-muted">Completed Runs</span>
                  <p className="text-xl font-black text-main mt-1">{riderEarningsData?.summary?.totalRuns || 0}</p>
                </div>
              </div>

              <div className="bg-surface border border-line rounded-3xl p-5 shadow-2xs overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-line text-[10px] uppercase font-extrabold text-muted">
                      <th className="pb-2">Rider</th>
                      <th className="pb-2">Runs</th>
                      <th className="pb-2">Base Earnings</th>
                      <th className="pb-2">Additional Stops</th>
                      <th className="pb-2">Total Earnings</th>
                      <th className="pb-2">Paid</th>
                      <th className="pb-2">Pending</th>
                      <th className="pb-2">Settlement Status</th>
                      <th className="pb-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {riderEarningsData?.riders?.map(r => (
                      <tr key={r.riderId} className="hover:bg-base/50">
                        <td className="py-2.5 font-bold text-main">{r.riderName}</td>
                        <td className="py-2.5 font-extrabold">{r.completedRuns}</td>
                        <td className="py-2.5 font-semibold">{formatCurrency(r.baseEarnings)}</td>
                        <td className="py-2.5 font-semibold text-muted">{formatCurrency(r.additionalPickupEarnings)}</td>
                        <td className="py-2.5 font-black text-emerald-600">{formatCurrency(r.totalEarnings)}</td>
                        <td className="py-2.5 font-bold text-green-600">{formatCurrency(r.paidAmount)}</td>
                        <td className="py-2.5 font-black text-amber-600">{formatCurrency(r.pendingAmount)}</td>
                        <td className="py-2.5">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase ${
                            r.settlementStatus === 'Paid / Settled' ? 'bg-green-100 text-green-700' :
                            r.settlementStatus === 'Partially Paid' ? 'bg-blue-100 text-blue-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {r.settlementStatus}
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => {
                              setRecordRiderPaymentModal(r);
                              setRiderPaymentForm({ amount: String(r.pendingAmount), paymentMethod: 'Cash', reference: '', notes: '' });
                            }}
                            className="bg-primary hover:bg-primary-hover text-white px-2.5 py-1 rounded-lg font-bold text-[10px] cursor-pointer"
                          >
                            Settle Earnings
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── F. RIDER COD COLLECTIONS SUB-TAB ── */}
      {activeSubTab === 'rider_cod' && (
        <div className="flex flex-col gap-4">
          {isRiderCodLoading ? (
            <div className="p-16 text-center text-muted font-bold">Loading rider COD collection data...</div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-surface border border-line p-4 rounded-2xl shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-muted">Total COD Collected</span>
                  <p className="text-xl font-black text-main mt-1">{formatCurrency(riderCodData?.summary?.totalCodCollected)}</p>
                </div>
                <div className="bg-surface border border-line p-4 rounded-2xl shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-muted">Returned to Admin</span>
                  <p className="text-xl font-black text-green-600 mt-1">{formatCurrency(riderCodData?.summary?.totalCodReturned)}</p>
                </div>
                <div className="bg-surface border border-line p-4 rounded-2xl shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-muted">Pending Return</span>
                  <p className="text-xl font-black text-amber-600 mt-1">{formatCurrency(riderCodData?.summary?.totalCodPending)}</p>
                </div>
                <div className="bg-surface border border-line p-4 rounded-2xl shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-muted">Riders with Pending COD</span>
                  <p className="text-xl font-black text-main mt-1">{riderCodData?.summary?.ridersWithPendingCod || 0}</p>
                </div>
              </div>

              <div className="bg-surface border border-line rounded-3xl p-5 shadow-2xs overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-line text-[10px] uppercase font-extrabold text-muted">
                      <th className="pb-2">Rider</th>
                      <th className="pb-2">Runs Delivered</th>
                      <th className="pb-2">COD Collected</th>
                      <th className="pb-2">Returned to Admin</th>
                      <th className="pb-2">Pending Return</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {riderCodData?.riders?.map(r => (
                      <tr key={r.riderId} className="hover:bg-base/50">
                        <td className="py-2.5 font-bold text-main">{r.riderName}</td>
                        <td className="py-2.5 font-extrabold">{r.completedRuns}</td>
                        <td className="py-2.5 font-black text-main">{formatCurrency(r.codCollected)}</td>
                        <td className="py-2.5 font-bold text-green-600">{formatCurrency(r.codReturned)}</td>
                        <td className="py-2.5 font-black text-amber-600">{formatCurrency(r.codPending)}</td>
                        <td className="py-2.5">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase ${
                            r.status === 'Returned' ? 'bg-green-100 text-green-700' :
                            r.status === 'Partially Returned' ? 'bg-blue-100 text-blue-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => {
                              setRecordCodReturnModal(r);
                              setCodReturnForm({ amount: String(r.codPending), paymentMethod: 'Cash', reference: '', notes: '' });
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg font-bold text-[10px] cursor-pointer"
                          >
                            Record COD Return
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── G. PARTNER-WISE SUMMARY SUB-TAB ── */}
      {activeSubTab === 'partner_wise' && (
        <div className="flex flex-col gap-4">
          {isPartnerWiseLoading ? (
            <div className="p-16 text-center text-muted font-bold">Loading partner summaries...</div>
          ) : (
            <div className="bg-surface border border-line rounded-3xl p-5 shadow-2xs overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-[10px] uppercase font-extrabold text-muted">
                    <th className="pb-2">Partner</th>
                    <th className="pb-2">Type</th>
                    <th className="pb-2">Orders</th>
                    <th className="pb-2">Customer Sales</th>
                    <th className="pb-2">Partner Payable</th>
                    <th className="pb-2">Jinkzo Commission</th>
                    <th className="pb-2">Average Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {partnerWiseData?.partners?.map(p => (
                    <tr key={p.partnerId} className="hover:bg-base/50">
                      <td className="py-2.5 font-bold text-main">{p.partnerName}</td>
                      <td className="py-2.5 text-muted uppercase text-[10px]">{p.partnerType}</td>
                      <td className="py-2.5 font-extrabold">{p.orderCount}</td>
                      <td className="py-2.5 font-black">{formatCurrency(p.customerSales)}</td>
                      <td className="py-2.5 font-black text-blue-600">{formatCurrency(p.partnerPayable)}</td>
                      <td className="py-2.5 font-black text-green-600">{formatCurrency(p.jinkzoItemCommission)}</td>
                      <td className="py-2.5 font-bold text-muted">{Number(p.averageMarginPercent || 0).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── 5. ACTION MODALS ──────────────────────────────────────────────── */}

      {/* Master Switch Confirmation Modal */}
      {showMasterSwitchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface border border-line rounded-3xl max-w-md w-full p-6 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-display font-black text-lg text-main">
                {masterCommissionEnabled ? 'Disable Item Commission System?' : 'Enable Item Commission System?'}
              </h3>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              {masterCommissionEnabled
                ? 'When disabled, ALL new orders will automatically resolve Settlement Price = Customer Selling Price (Item Commission = ₹0). Previously completed orders and saved settlement prices will remain safe and unchanged in the database.'
                : 'When enabled, new orders will evaluate partner concession agreements and item settlement prices to earn Jinkzo item commission.'}
            </p>

            {masterSwitchModalError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{masterSwitchModalError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setShowMasterSwitchModal(false);
                  setMasterSwitchModalError('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-line text-muted hover:bg-base cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={isMasterSwitchUpdating}
                onClick={() => handleToggleMasterSwitch(!masterCommissionEnabled)}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer ${
                  masterCommissionEnabled ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-primary-hover'
                }`}
              >
                {isMasterSwitchUpdating ? 'Updating...' : (masterCommissionEnabled ? 'Disable Commission' : 'Enable Commission')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Partner Concession Toggle Confirmation Modal */}
      {partnerConcessionConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface border border-line rounded-3xl max-w-md w-full p-6 flex flex-col gap-4 shadow-xl">
            <h3 className="font-display font-black text-base text-main">
              {partnerConcessionConfirmModal.currentEnabled
                ? `Disable Concession for "${partnerConcessionConfirmModal.partnerName}"?`
                : `Enable Concession for "${partnerConcessionConfirmModal.partnerName}"?`}
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              {partnerConcessionConfirmModal.currentEnabled
                ? 'New orders for this partner will use Settlement Price = Customer Selling Price. Historical completed orders remain unchanged.'
                : 'New orders will apply configured settlement prices for this partner where applicable.'}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setPartnerConcessionConfirmModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-line text-muted hover:bg-base cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={isPartnerConcessionUpdating}
                onClick={handleTogglePartnerConcession}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-hover cursor-pointer"
              >
                {isPartnerConcessionUpdating ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Partner Prices Modal */}
      {selectedPartnerForPrices && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface border border-line rounded-3xl max-w-4xl w-full p-6 flex flex-col gap-4 shadow-2xl max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="font-display font-black text-base text-main flex items-center gap-2">
                  <span>{selectedPartnerForPrices.partnerType === 'restaurant' ? '🍽️' : '🏪'}</span>
                  <span>{selectedPartnerForPrices.partnerName} — Item Pricing & Concessions</span>
                </h3>
                <p className="text-[11px] text-muted">
                  View and configure Selling & Settlement prices for all items under this partner.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPartnerForPrices(null)}
                className="text-muted hover:text-main cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-grow pr-1 divide-y divide-line scrollbar-thin">
              {(() => {
                const partnerItems = (pricingData?.items || []).filter(i => String(i.sourceId) === String(selectedPartnerForPrices.partnerId));
                if (partnerItems.length === 0) {
                  return (
                    <div className="p-12 text-center text-muted font-semibold text-xs">
                      No items currently found for this partner.
                    </div>
                  );
                }
                return (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-line text-[10px] uppercase font-extrabold text-muted">
                        <th className="pb-2">Item Name</th>
                        <th className="pb-2">Category</th>
                        <th className="pb-2">Selling Price</th>
                        <th className="pb-2">Settlement Price</th>
                        <th className="pb-2">Commission</th>
                        <th className="pb-2">Margin</th>
                        <th className="pb-2">Override Mode</th>
                        <th className="pb-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {partnerItems.map(item => {
                        const selling = Number(item.price || 0);
                        const settlement = item.partnerSettlementPrice != null ? Number(item.partnerSettlementPrice) : selling;
                        const comm = Math.max(0, selling - settlement);
                        const margin = selling > 0 ? ((comm / selling) * 100) : 0;
                        return (
                          <tr key={item._id} className="hover:bg-base/50">
                            <td className="py-2.5 font-bold text-main">{item.name}</td>
                            <td className="py-2.5 text-muted">{item.category}</td>
                            <td className="py-2.5 font-black text-main">{formatCurrency(selling)}</td>
                            <td className="py-2.5 font-black text-blue-600">{formatCurrency(settlement)}</td>
                            <td className="py-2.5 font-bold text-green-600">{formatCurrency(comm)}</td>
                            <td className="py-2.5 font-medium text-muted">{margin.toFixed(1)}%</td>
                            <td className="py-2.5">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                                item.pricingConcessionMode === 'enabled' ? 'bg-green-100 text-green-700' :
                                item.pricingConcessionMode === 'disabled' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-muted'
                              }`}>
                                {item.pricingConcessionMode || 'inherit'}
                              </span>
                            </td>
                            <td className="py-2.5 text-right">
                              <button
                                onClick={() => {
                                  setEditItemModal(item);
                                  setEditItemForm({
                                    price: String(item.price || ''),
                                    partnerSettlementPrice: item.partnerSettlementPrice != null ? String(item.partnerSettlementPrice) : '',
                                    pricingConcessionMode: item.pricingConcessionMode || 'inherit'
                                  });
                                }}
                                className="bg-primary/10 hover:bg-primary/20 text-primary px-2.5 py-1 rounded-lg font-bold text-[10px] cursor-pointer"
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })()}
            </div>

            <div className="flex justify-end pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setSelectedPartnerForPrices(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-line text-muted hover:bg-base cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Pricing Modal */}
      {editItemModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <form onSubmit={handleSaveItemPricing} className="bg-surface border border-line rounded-3xl max-w-md w-full p-6 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="font-display font-black text-base text-main">{editItemModal.name}</h3>
                <p className="text-[11px] text-muted">{editItemModal.sourceName} • {editItemModal.category}</p>
              </div>
              <button type="button" onClick={() => setEditItemModal(null)} className="text-muted hover:text-main cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-extrabold uppercase text-muted">Customer Selling Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={editItemForm.price}
                  onChange={(e) => setEditItemForm(prev => ({ ...prev, price: e.target.value }))}
                  className="bg-base border border-line-strong focus:border-primary rounded-xl px-3 py-2 text-xs font-bold text-main outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-extrabold uppercase text-muted">Partner Settlement Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={`Default: ${formatCurrency(editItemForm.price || editItemModal.price || 0)}`}
                  value={editItemForm.partnerSettlementPrice}
                  onChange={(e) => setEditItemForm(prev => ({ ...prev, partnerSettlementPrice: e.target.value }))}
                  className="bg-base border border-line-strong focus:border-primary rounded-xl px-3 py-2 text-xs font-bold text-main outline-none"
                />
                <span className="text-[10px] text-muted">Leave empty to default to customer selling price.</span>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-extrabold uppercase text-muted">Concession Mode Override</label>
                <select
                  value={editItemForm.pricingConcessionMode}
                  onChange={(e) => setEditItemForm(prev => ({ ...prev, pricingConcessionMode: e.target.value }))}
                  className="bg-base border border-line-strong focus:border-primary rounded-xl px-3 py-2 text-xs font-bold text-main outline-none cursor-pointer"
                >
                  <option value="inherit">Inherit (Use Partner Agreement)</option>
                  <option value="enabled">Enabled (Always use Settlement Price)</option>
                  <option value="disabled">Disabled (No Concession on this item)</option>
                </select>
              </div>

              {/* Margin Preview & Negative Warning */}
              {(() => {
                const sp = Number(editItemForm.price !== '' ? editItemForm.price : (editItemModal.price || 0));
                const st = editItemForm.partnerSettlementPrice !== '' ? Number(editItemForm.partnerSettlementPrice) : sp;
                const diff = sp - st;
                const isNegative = diff < 0;
                return (
                  <div className={`p-3 rounded-2xl border text-xs flex flex-col gap-1 ${
                    isNegative ? 'bg-red-50 text-red-700 border-red-200' : 'bg-base border-line'
                  }`}>
                    <div className="flex justify-between items-center font-bold">
                      <span>Jinkzo Item Margin:</span>
                      <span className={isNegative ? 'text-red-700 font-black' : 'text-green-600 font-black'}>
                        {diff >= 0 ? `+${formatCurrency(diff)}` : `-${formatCurrency(Math.abs(diff))}`}
                      </span>
                    </div>
                    {isNegative && (
                      <p className="text-[10px] font-semibold text-red-600">
                        ⚠️ Warning: Settlement price is higher than Selling price. Jinkzo will lose money on this item.
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditItemModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-line text-muted hover:bg-base cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isItemSaving}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-hover cursor-pointer"
              >
                {isItemSaving ? 'Saving...' : 'Save Pricing'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Record Partner Payment Modal */}
      {recordPartnerPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <form onSubmit={handleRecordPartnerPayment} className="bg-surface border border-line rounded-3xl max-w-md w-full p-6 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="font-display font-black text-base text-main">Record Partner Settlement Payment</h3>
                <p className="text-[11px] text-muted">{recordPartnerPaymentModal.partnerName} • Pending: {formatCurrency(recordPartnerPaymentModal.amountPending)}</p>
              </div>
              <button type="button" onClick={() => setRecordPartnerPaymentModal(null)} className="text-muted hover:text-main cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-extrabold uppercase text-muted">Payment Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={partnerPaymentForm.amount}
                  onChange={(e) => setPartnerPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="bg-base border border-line-strong focus:border-primary rounded-xl px-3 py-2 text-xs font-bold text-main outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-extrabold uppercase text-muted">Payment Method</label>
                <select
                  value={partnerPaymentForm.paymentMethod}
                  onChange={(e) => setPartnerPaymentForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  className="bg-base border border-line-strong focus:border-primary rounded-xl px-3 py-2 text-xs font-bold text-main outline-none cursor-pointer"
                >
                  <option value="Cash">Cash Handover</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                  <option value="UPI External / Manual">UPI External / Manual Transfer</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-extrabold uppercase text-muted">Reference / Transaction UTR</label>
                <input
                  type="text"
                  placeholder="e.g. UTR123456789 or Receipt #01"
                  value={partnerPaymentForm.reference}
                  onChange={(e) => setPartnerPaymentForm(prev => ({ ...prev, reference: e.target.value }))}
                  className="bg-base border border-line-strong focus:border-primary rounded-xl px-3 py-2 text-xs font-medium text-main outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-extrabold uppercase text-muted">Notes / Memo</label>
                <input
                  type="text"
                  placeholder="Optional settlement memo"
                  value={partnerPaymentForm.notes}
                  onChange={(e) => setPartnerPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="bg-base border border-line-strong focus:border-primary rounded-xl px-3 py-2 text-xs font-medium text-main outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRecordPartnerPaymentModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-line text-muted hover:bg-base cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isRecordingPartnerPayment}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-hover cursor-pointer"
              >
                {isRecordingPartnerPayment ? 'Recording...' : 'Record Payment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Record Rider Payment Modal */}
      {recordRiderPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <form onSubmit={handleRecordRiderPayment} className="bg-surface border border-line rounded-3xl max-w-md w-full p-6 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="font-display font-black text-base text-main">Settle Rider Delivery Earnings</h3>
                <p className="text-[11px] text-muted">{recordRiderPaymentModal.riderName} • Pending: {formatCurrency(recordRiderPaymentModal.pendingAmount)}</p>
              </div>
              <button type="button" onClick={() => setRecordRiderPaymentModal(null)} className="text-muted hover:text-main cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-extrabold uppercase text-muted">Amount to Pay (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={riderPaymentForm.amount}
                  onChange={(e) => setRiderPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="bg-base border border-line-strong focus:border-primary rounded-xl px-3 py-2 text-xs font-bold text-main outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-extrabold uppercase text-muted">Payment Method</label>
                <select
                  value={riderPaymentForm.paymentMethod}
                  onChange={(e) => setRiderPaymentForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  className="bg-base border border-line-strong focus:border-primary rounded-xl px-3 py-2 text-xs font-bold text-main outline-none cursor-pointer"
                >
                  <option value="Cash">Cash Handover</option>
                  <option value="UPI External / Manual">UPI External / Manual Transfer</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-extrabold uppercase text-muted">Reference / Note</label>
                <input
                  type="text"
                  placeholder="Optional reference"
                  value={riderPaymentForm.reference}
                  onChange={(e) => setRiderPaymentForm(prev => ({ ...prev, reference: e.target.value }))}
                  className="bg-base border border-line-strong focus:border-primary rounded-xl px-3 py-2 text-xs font-medium text-main outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRecordRiderPaymentModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-line text-muted hover:bg-base cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isRecordingRiderPayment}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-hover cursor-pointer"
              >
                {isRecordingRiderPayment ? 'Recording...' : 'Settle Payout'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Record COD Return Modal */}
      {recordCodReturnModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <form onSubmit={handleRecordCodReturn} className="bg-surface border border-line rounded-3xl max-w-md w-full p-6 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="font-display font-black text-base text-main">Record Rider COD Cash Return</h3>
                <p className="text-[11px] text-muted">{recordCodReturnModal.riderName} • COD Pending: {formatCurrency(recordCodReturnModal.codPending)}</p>
              </div>
              <button type="button" onClick={() => setRecordCodReturnModal(null)} className="text-muted hover:text-main cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-extrabold uppercase text-muted">COD Cash Amount Received (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={codReturnForm.amount}
                  onChange={(e) => setCodReturnForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="bg-base border border-line-strong focus:border-primary rounded-xl px-3 py-2 text-xs font-bold text-main outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-extrabold uppercase text-muted">Handover Method</label>
                <select
                  value={codReturnForm.paymentMethod}
                  onChange={(e) => setCodReturnForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  className="bg-base border border-line-strong focus:border-primary rounded-xl px-3 py-2 text-xs font-bold text-main outline-none cursor-pointer"
                >
                  <option value="Cash">Physical Cash Handover</option>
                  <option value="UPI External / Manual">Rider Direct UPI to Admin</option>
                  <option value="Bank Transfer">Bank Deposit</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-extrabold uppercase text-muted">Reference / Memo</label>
                <input
                  type="text"
                  placeholder="Optional memo"
                  value={codReturnForm.reference}
                  onChange={(e) => setCodReturnForm(prev => ({ ...prev, reference: e.target.value }))}
                  className="bg-base border border-line-strong focus:border-primary rounded-xl px-3 py-2 text-xs font-medium text-main outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRecordCodReturnModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-line text-muted hover:bg-base cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isRecordingCodReturn}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
              >
                {isRecordingCodReturn ? 'Recording...' : 'Record COD Received'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Custom Date Range Modal */}
      {showCustomDateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface border border-line rounded-3xl max-w-sm w-full p-6 flex flex-col gap-4 shadow-xl">
            <h3 className="font-display font-black text-base text-main">Select Custom Date Range</h3>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-extrabold uppercase text-muted">From Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-base border border-line-strong rounded-xl px-3 py-2 text-xs font-bold text-main outline-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-extrabold uppercase text-muted">To Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-base border border-line-strong rounded-xl px-3 py-2 text-xs font-bold text-main outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowCustomDateModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-hover cursor-pointer"
              >
                Apply Range
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

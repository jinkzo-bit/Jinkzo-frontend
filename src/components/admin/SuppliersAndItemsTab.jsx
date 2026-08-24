import React, { useState, useEffect, useMemo } from 'react';
import {
  Boxes, Plus, Search, Filter, RefreshCw, Pencil, Trash2,
  MapPin, Phone, CheckCircle2, XCircle, AlertCircle, Eye, EyeOff,
  Store, ShoppingCart, Beef, Apple, Croissant, Wheat, Package,
  ExternalLink, Check, X, ShieldAlert, Sparkles, Building2
} from 'lucide-react';
import { API_BASE } from '../../config/api';
import { uploadFileToBackend, getImageUrl, handleImageError } from '../../utils/uploadUtil';
import ImageUploadInput from '../common/ImageUploadInput';

const CATEGORIES_CONFIG = [
  {
    id: 'grocery',
    name: 'Grocery',
    icon: ShoppingCart,
    color: '#00C853',
    textColor: 'text-[#00C853]',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-200 dark:border-emerald-800/50',
    badgeColor: 'bg-emerald-500 text-white',
    description: 'Manage daily grocery suppliers, staples, packaged foods, and household essentials.'
  },
  {
    id: 'meat',
    name: 'Meat',
    icon: Beef,
    color: '#FF3D00',
    textColor: 'text-[#FF3D00]',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-200 dark:border-red-800/50',
    badgeColor: 'bg-[#FF3D00] text-white',
    description: 'Manage fresh meat shops, chicken centers, fish sellers, and butcher suppliers.'
  },
  {
    id: 'veg_fruits',
    name: 'Veg & Fruits',
    icon: Apple,
    color: '#009688',
    textColor: 'text-[#009688]',
    bgColor: 'bg-teal-50 dark:bg-teal-950/30',
    borderColor: 'border-teal-200 dark:border-teal-800/50',
    badgeColor: 'bg-[#009688] text-white',
    description: 'Manage vegetable market vendors, fruit suppliers, and fresh produce catalog.'
  },
  {
    id: 'bakery_beverages',
    name: 'Bakery & Beverages',
    icon: Croissant,
    color: '#E91E63',
    textColor: 'text-[#E91E63]',
    bgColor: 'bg-pink-50 dark:bg-pink-950/30',
    borderColor: 'border-pink-200 dark:border-pink-800/50',
    badgeColor: 'bg-[#E91E63] text-white',
    description: 'Manage bakeries, cake shops, puff vendors, snacks, and beverage suppliers.'
  }
];

export default function SuppliersAndItemsTab({ token }) {
  const [activeCategory, setActiveCategory] = useState('grocery');

  // Suppliers & Items state
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(true);
  const [isLoadingItems, setIsLoadingItems] = useState(true);

  // Search & Filters
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierStatusFilter, setSupplierStatusFilter] = useState('all'); // 'all', 'active', 'inactive'

  const [itemSearch, setItemSearch] = useState('');
  const [itemAvailabilityFilter, setItemAvailabilityFilter] = useState('all'); // 'all', 'available', 'unavailable'
  const [itemSupplierFilter, setItemSupplierFilter] = useState('all'); // 'all', supplierId, 'none'

  // Add Supplier Modal
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [addSupplierForm, setAddSupplierForm] = useState({
    name: '',
    phone: '',
    address: '',
    latitude: '',
    longitude: '',
    isActive: true
  });
  const [isAddingSupplier, setIsAddingSupplier] = useState(false);
  const [addSupplierError, setAddSupplierError] = useState('');

  // Edit Supplier Modal
  const [showEditSupplierModal, setShowEditSupplierModal] = useState(false);
  const [editSupplierForm, setEditSupplierForm] = useState({
    _id: '',
    name: '',
    phone: '',
    address: '',
    latitude: '',
    longitude: '',
    isActive: true
  });
  const [isEditingSupplier, setIsEditingSupplier] = useState(false);
  const [editSupplierError, setEditSupplierError] = useState('');

  // Delete Supplier Modal
  const [deleteSupplierModal, setDeleteSupplierModal] = useState({
    isOpen: false,
    supplier: null,
    linkedCount: 0
  });
  const [isDeletingSupplier, setIsDeletingSupplier] = useState(false);

  // Add Catalog Item Modal
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [addItemForm, setAddItemForm] = useState({
    name: '',
    price: '',
    unit: '',
    supplierId: '',
    isAvailable: true,
    description: '',
    image: ''
  });
  const [addItemFile, setAddItemFile] = useState(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [addItemError, setAddItemError] = useState('');

  // Edit Catalog Item Modal
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [editItemForm, setEditItemForm] = useState({
    _id: '',
    name: '',
    price: '',
    unit: '',
    supplierId: '',
    isAvailable: true,
    description: '',
    image: ''
  });
  const [editItemFile, setEditItemFile] = useState(null);
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [editItemError, setEditItemError] = useState('');

  // Delete Item Modal
  const [deleteItemModal, setDeleteItemModal] = useState({
    isOpen: false,
    item: null
  });
  const [isDeletingItem, setIsDeletingItem] = useState(false);

  // Status toggle spinners
  const [supplierToggleLoading, setSupplierToggleLoading] = useState({});
  const [itemToggleLoading, setItemToggleLoading] = useState({});

  const currentCategoryConfig = CATEGORIES_CONFIG.find(c => c.id === activeCategory) || CATEGORIES_CONFIG[0];
  const CategoryIcon = currentCategoryConfig.icon;

  // ── DATA FETCHING ────────────────────────────────────────────────────────────

  const fetchSuppliers = async (category = activeCategory) => {
    setIsLoadingSuppliers(true);
    try {
      const res = await fetch(`${API_BASE}/admin/suppliers?category=${category}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSuppliers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    } finally {
      setIsLoadingSuppliers(false);
    }
  };

  const fetchItems = async (category = activeCategory) => {
    setIsLoadingItems(true);
    try {
      const res = await fetch(`${API_BASE}/admin/catalog-items?category=${category}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching catalog items:', err);
    } finally {
      setIsLoadingItems(false);
    }
  };

  const refreshAll = () => {
    fetchSuppliers(activeCategory);
    fetchItems(activeCategory);
  };

  useEffect(() => {
    fetchSuppliers(activeCategory);
    fetchItems(activeCategory);
    // Reset filters when category changes
    setSupplierSearch('');
    setSupplierStatusFilter('all');
    setItemSearch('');
    setItemAvailabilityFilter('all');
    setItemSupplierFilter('all');
  }, [activeCategory, token]);

  // ── SUPPLIER HANDLERS ────────────────────────────────────────────────────────

  const handleAddSupplier = async (e) => {
    e.preventDefault();
    setIsAddingSupplier(true);
    setAddSupplierError('');
    try {
      const res = await fetch(`${API_BASE}/admin/suppliers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...addSupplierForm,
          category: activeCategory
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setAddSupplierError(data.message || 'Failed to add supplier');
      } else {
        setShowAddSupplierModal(false);
        setAddSupplierForm({ name: '', phone: '', address: '', latitude: '', longitude: '', isActive: true });
        fetchSuppliers(activeCategory);
      }
    } catch (err) {
      setAddSupplierError(err.message || 'Failed to add supplier');
    } finally {
      setIsAddingSupplier(false);
    }
  };

  const handleEditSupplier = async (e) => {
    e.preventDefault();
    setIsEditingSupplier(true);
    setEditSupplierError('');
    try {
      const res = await fetch(`${API_BASE}/admin/suppliers/${editSupplierForm._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editSupplierForm)
      });
      const data = await res.json();
      if (!res.ok) {
        setEditSupplierError(data.message || 'Failed to update supplier');
      } else {
        setShowEditSupplierModal(false);
        fetchSuppliers(activeCategory);
        fetchItems(activeCategory);
      }
    } catch (err) {
      setEditSupplierError(err.message || 'Failed to update supplier');
    } finally {
      setIsEditingSupplier(false);
    }
  };

  const handleToggleSupplierStatus = async (sup) => {
    setSupplierToggleLoading(prev => ({ ...prev, [sup._id]: true }));
    try {
      const res = await fetch(`${API_BASE}/admin/suppliers/${sup._id}/toggle-status`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchSuppliers(activeCategory);
      }
    } catch (err) {
      console.error('Error toggling supplier status:', err);
    } finally {
      setSupplierToggleLoading(prev => ({ ...prev, [sup._id]: false }));
    }
  };

  const handleDeleteSupplier = async () => {
    if (!deleteSupplierModal.supplier) return;
    setIsDeletingSupplier(true);
    try {
      const res = await fetch(`${API_BASE}/admin/suppliers/${deleteSupplierModal.supplier._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setDeleteSupplierModal({ isOpen: false, supplier: null, linkedCount: 0 });
        fetchSuppliers(activeCategory);
        fetchItems(activeCategory);
      }
    } catch (err) {
      console.error('Error deleting supplier:', err);
    } finally {
      setIsDeletingSupplier(false);
    }
  };

  // ── ITEM HANDLERS ────────────────────────────────────────────────────────────

  const handleAddItem = async (e) => {
    e.preventDefault();
    setIsAddingItem(true);
    setAddItemError('');
    try {
      let imageUrl = (addItemForm.image || '').trim();
      if (addItemFile) {
        imageUrl = await uploadFileToBackend(addItemFile);
      }

      const res = await fetch(`${API_BASE}/admin/catalog-items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: addItemForm.name.trim(),
          category: activeCategory,
          price: Number(addItemForm.price),
          unit: addItemForm.unit.trim(),
          supplierId: addItemForm.supplierId && addItemForm.supplierId !== 'none' ? addItemForm.supplierId : null,
          isAvailable: addItemForm.isAvailable,
          description: addItemForm.description.trim(),
          image: imageUrl
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setAddItemError(data.message || 'Failed to add item');
      } else {
        setShowAddItemModal(false);
        setAddItemForm({ name: '', price: '', unit: '', supplierId: '', isAvailable: true, description: '', image: '' });
        setAddItemFile(null);
        fetchItems(activeCategory);
        fetchSuppliers(activeCategory); // update linked items count
      }
    } catch (err) {
      setAddItemError(err.message || 'Failed to add item');
    } finally {
      setIsAddingItem(false);
    }
  };

  const handleEditItem = async (e) => {
    e.preventDefault();
    setIsEditingItem(true);
    setEditItemError('');
    try {
      let imageUrl = (editItemForm.image || '').trim();
      if (editItemFile) {
        imageUrl = await uploadFileToBackend(editItemFile);
      }

      const res = await fetch(`${API_BASE}/admin/catalog-items/${editItemForm._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editItemForm.name.trim(),
          price: Number(editItemForm.price),
          unit: editItemForm.unit.trim(),
          supplierId: editItemForm.supplierId && editItemForm.supplierId !== 'none' ? editItemForm.supplierId : null,
          isAvailable: editItemForm.isAvailable,
          description: editItemForm.description.trim(),
          image: imageUrl
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setEditItemError(data.message || 'Failed to update item');
      } else {
        setShowEditItemModal(false);
        setEditItemFile(null);
        fetchItems(activeCategory);
        fetchSuppliers(activeCategory);
      }
    } catch (err) {
      setEditItemError(err.message || 'Failed to update item');
    } finally {
      setIsEditingItem(false);
    }
  };

  const handleToggleItemAvailability = async (item) => {
    setItemToggleLoading(prev => ({ ...prev, [item._id]: true }));
    try {
      const res = await fetch(`${API_BASE}/admin/catalog-items/${item._id}/toggle-availability`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchItems(activeCategory);
      }
    } catch (err) {
      console.error('Error toggling item availability:', err);
    } finally {
      setItemToggleLoading(prev => ({ ...prev, [item._id]: false }));
    }
  };

  const handleDeleteItem = async () => {
    if (!deleteItemModal.item) return;
    setIsDeletingItem(true);
    try {
      const res = await fetch(`${API_BASE}/admin/catalog-items/${deleteItemModal.item._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setDeleteItemModal({ isOpen: false, item: null });
        fetchItems(activeCategory);
        fetchSuppliers(activeCategory);
      }
    } catch (err) {
      console.error('Error deleting item:', err);
    } finally {
      setIsDeletingItem(false);
    }
  };

  // ── FILTERED DATA ────────────────────────────────────────────────────────────

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      const matchesSearch = !supplierSearch ||
        s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
        s.phone.toLowerCase().includes(supplierSearch.toLowerCase()) ||
        s.address.toLowerCase().includes(supplierSearch.toLowerCase());

      const matchesStatus = supplierStatusFilter === 'all' ||
        (supplierStatusFilter === 'active' && s.isActive) ||
        (supplierStatusFilter === 'inactive' && !s.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [suppliers, supplierSearch, supplierStatusFilter]);

  const filteredItems = useMemo(() => {
    return items.filter(it => {
      const matchesSearch = !itemSearch ||
        it.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
        (it.description && it.description.toLowerCase().includes(itemSearch.toLowerCase())) ||
        (it.supplierName && it.supplierName.toLowerCase().includes(itemSearch.toLowerCase()));

      const matchesAvailability = itemAvailabilityFilter === 'all' ||
        (itemAvailabilityFilter === 'available' && it.isAvailable) ||
        (itemAvailabilityFilter === 'unavailable' && !it.isAvailable);

      const matchesSupplier = itemSupplierFilter === 'all' ||
        (itemSupplierFilter === 'none' && (!it.supplierId || it.supplierId === 'null')) ||
        (String(it.supplierId) === String(itemSupplierFilter));

      return matchesSearch && matchesAvailability && matchesSupplier;
    });
  }, [items, itemSearch, itemAvailabilityFilter, itemSupplierFilter]);

  // Active suppliers for dropdowns
  const activeSuppliersForCategory = useMemo(() => {
    return suppliers.filter(s => s.isActive);
  }, [suppliers]);

  // Metrics
  const totalSuppliers = suppliers.length;
  const activeSuppliers = suppliers.filter(s => s.isActive).length;
  const totalItems = items.length;
  const availableItems = items.filter(i => i.isAvailable).length;

  return (
    <div className="flex flex-col gap-6 animate-fade-in">

      {/* ── 1. FOUR CATEGORY SELECTION TABS ─────────────────────────────────── */}
      <div className="bg-surface border border-line rounded-3xl p-3 sm:p-4 shadow-2xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {CATEGORIES_CONFIG.map((cat) => {
            const Icon = cat.icon;
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`p-3.5 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer border ${
                  isSelected
                    ? `${cat.bgColor} ${cat.borderColor} shadow-xs scale-[1.02]`
                    : 'bg-base/40 border-line hover:bg-base hover:border-line-strong'
                }`}
              >
                <div className={`p-2 rounded-xl flex items-center justify-center ${isSelected ? cat.badgeColor : 'bg-surface text-muted'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`font-display font-extrabold text-xs sm:text-sm ${isSelected ? 'text-main' : 'text-muted'}`}>
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 2. CATEGORY HEADER & LIVE METRICS ───────────────────────────────── */}
      <div className="bg-surface border border-line rounded-3xl p-5 sm:p-6 flex flex-col gap-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${currentCategoryConfig.bgColor} ${currentCategoryConfig.textColor}`}>
              <CategoryIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display font-black text-lg sm:text-xl text-main flex items-center gap-2">
                <span>{currentCategoryConfig.name}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-base border border-line text-muted">
                  Suppliers & Catalog
                </span>
              </h3>
              <p className="text-xs text-muted font-medium mt-0.5">
                {currentCategoryConfig.description}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={refreshAll}
              className="p-2.5 rounded-xl border border-line hover:bg-base text-muted hover:text-main transition-colors cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${(isLoadingSuppliers || isLoadingItems) ? 'animate-spin text-primary' : ''}`} />
            </button>
            <button
              onClick={() => {
                setAddSupplierError('');
                setAddSupplierForm({ name: '', phone: '', address: '', latitude: '', longitude: '', isActive: true });
                setShowAddSupplierModal(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-base border border-line-strong hover:border-primary text-xs font-bold text-main flex items-center gap-1.5 transition-all shadow-2xs hover:shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4 text-primary" />
              <span>Add Supplier</span>
            </button>
            <button
              onClick={() => {
                setAddItemError('');
                setAddItemForm({ name: '', price: '', unit: '', supplierId: '', isAvailable: true, description: '', image: '' });
                setAddItemFile(null);
                setShowAddItemModal(true);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${currentCategoryConfig.badgeColor}`}
            >
              <Plus className="w-4 h-4" />
              <span>Add Item</span>
            </button>
          </div>
        </div>

        {/* 4 Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="bg-base/60 border border-line rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted">Total Suppliers</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-xl font-black text-main">{totalSuppliers}</span>
              <span className="text-[11px] font-bold text-muted">{activeSuppliers} Active</span>
            </div>
          </div>

          <div className="bg-base/60 border border-line rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted">Active Suppliers</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{activeSuppliers}</span>
              <span className="text-[11px] font-bold text-muted">{totalSuppliers - activeSuppliers} Inactive</span>
            </div>
          </div>

          <div className="bg-base/60 border border-line rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted">Total Catalog Items</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-xl font-black text-main">{totalItems}</span>
              <span className="text-[11px] font-bold text-muted">{availableItems} Available</span>
            </div>
          </div>

          <div className="bg-base/60 border border-line rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted">Available Items</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{availableItems}</span>
              <span className="text-[11px] font-bold text-muted">{totalItems - availableItems} Out of Stock</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. SUPPLIERS SECTION ────────────────────────────────────────────── */}
      <div className="bg-surface border border-line rounded-3xl p-5 sm:p-6 flex flex-col gap-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-primary" />
            <h4 className="font-display font-extrabold text-sm sm:text-base text-main">
              {currentCategoryConfig.name} Suppliers ({filteredSuppliers.length})
            </h4>
          </div>

          {/* Search & Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Search suppliers..."
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-base border border-line text-main placeholder-muted outline-none focus:border-primary w-40 sm:w-52"
              />
            </div>
            <select
              value={supplierStatusFilter}
              onChange={(e) => setSupplierStatusFilter(e.target.value)}
              className="py-1.5 px-2.5 text-xs rounded-xl bg-base border border-line text-main outline-none focus:border-primary cursor-pointer font-bold"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Suppliers Table */}
        {isLoadingSuppliers ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold">Loading {currentCategoryConfig.name} suppliers...</span>
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="py-10 border border-dashed border-line rounded-2xl flex flex-col items-center justify-center gap-2 text-center p-4">
            <Store className="w-8 h-8 text-muted/50" />
            <p className="text-xs font-bold text-main">No {currentCategoryConfig.name} suppliers found</p>
            <p className="text-[11px] text-muted max-w-sm">
              {supplierSearch || supplierStatusFilter !== 'all'
                ? 'Try adjusting your search query or filter.'
                : `Add a supplier for ${currentCategoryConfig.name} to link items and enable sourcing.`}
            </p>
            <button
              onClick={() => {
                setAddSupplierError('');
                setAddSupplierForm({ name: '', phone: '', address: '', latitude: '', longitude: '', isActive: true });
                setShowAddSupplierModal(true);
              }}
              className="mt-2 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs hover:shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Supplier</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[650px]">
              <thead>
                <tr className="border-b border-line text-[11px] font-extrabold text-muted uppercase tracking-wider">
                  <th className="py-2.5 px-3">Supplier Name</th>
                  <th className="py-2.5 px-3">Mobile Number</th>
                  <th className="py-2.5 px-3">Address & Location</th>
                  <th className="py-2.5 px-3 text-center">Linked Items</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-xs">
                {filteredSuppliers.map((sup) => {
                  const isToggling = supplierToggleLoading[sup._id];
                  return (
                    <tr key={sup._id} className="hover:bg-base/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-base border border-line flex items-center justify-center shrink-0 font-bold text-main">
                            <Building2 className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <span className="font-extrabold text-main block">{sup.name}</span>
                            <span className="text-[10px] text-muted font-semibold capitalize">{sup.category.replace('_', ' & ')}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <a href={`tel:${sup.phone}`} className="inline-flex items-center gap-1.5 text-xs font-bold text-main hover:text-primary transition-colors">
                          <Phone className="w-3.5 h-3.5 text-muted" />
                          <span>{sup.phone}</span>
                        </a>
                      </td>

                      <td className="py-3 px-3 max-w-xs">
                        <div className="flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-muted shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <span className="text-xs text-main block truncate font-medium">{sup.address}</span>
                            {(sup.latitude || sup.longitude) && (
                              <span className="text-[10px] text-muted font-mono block">
                                {sup.latitude ? Number(sup.latitude).toFixed(4) : '-'}, {sup.longitude ? Number(sup.longitude).toFixed(4) : '-'}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-base border border-line text-main">
                          {sup.itemsCount || 0} {sup.itemsCount === 1 ? 'Item' : 'Items'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          disabled={isToggling}
                          onClick={() => handleToggleSupplierStatus(sup)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black transition-all cursor-pointer border ${
                            isToggling ? 'opacity-50 cursor-wait' : ''
                          } ${
                            sup.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400 hover:bg-emerald-100'
                              : 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 hover:bg-gray-200'
                          }`}
                          title={`Click to make ${sup.isActive ? 'Inactive' : 'Active'}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${sup.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                          <span>{sup.isActive ? 'ACTIVE' : 'INACTIVE'}</span>
                        </button>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditSupplierError('');
                              setEditSupplierForm({
                                _id: sup._id,
                                name: sup.name,
                                phone: sup.phone,
                                address: sup.address,
                                latitude: sup.latitude !== null && sup.latitude !== undefined ? sup.latitude : '',
                                longitude: sup.longitude !== null && sup.longitude !== undefined ? sup.longitude : '',
                                isActive: sup.isActive
                              });
                              setShowEditSupplierModal(true);
                            }}
                            className="p-1.5 rounded-lg border border-line hover:bg-base text-muted hover:text-main transition-colors cursor-pointer"
                            title="Edit Supplier"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setDeleteSupplierModal({
                                isOpen: true,
                                supplier: sup,
                                linkedCount: sup.itemsCount || 0
                              });
                            }}
                            className="p-1.5 rounded-lg border border-line hover:border-red-300 hover:bg-red-50 text-muted hover:text-red-600 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                            title="Delete Supplier"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 4. CATALOG ITEMS SECTION ────────────────────────────────────────── */}
      <div className="bg-surface border border-line rounded-3xl p-5 sm:p-6 flex flex-col gap-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            <h4 className="font-display font-extrabold text-sm sm:text-base text-main">
              {currentCategoryConfig.name} Catalog Items ({filteredItems.length})
            </h4>
          </div>

          {/* Search & Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Search items..."
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-base border border-line text-main placeholder-muted outline-none focus:border-primary w-36 sm:w-48"
              />
            </div>
            <select
              value={itemAvailabilityFilter}
              onChange={(e) => setItemAvailabilityFilter(e.target.value)}
              className="py-1.5 px-2.5 text-xs rounded-xl bg-base border border-line text-main outline-none focus:border-primary cursor-pointer font-bold"
            >
              <option value="all">All Availability</option>
              <option value="available">Available Only</option>
              <option value="unavailable">Unavailable Only</option>
            </select>
            <select
              value={itemSupplierFilter}
              onChange={(e) => setItemSupplierFilter(e.target.value)}
              className="py-1.5 px-2.5 text-xs rounded-xl bg-base border border-line text-main outline-none focus:border-primary cursor-pointer font-bold max-w-[150px] truncate"
            >
              <option value="all">All Suppliers</option>
              <option value="none">No Supplier / Direct</option>
              {suppliers.map(s => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Items Table */}
        {isLoadingItems ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold">Loading {currentCategoryConfig.name} items...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-10 border border-dashed border-line rounded-2xl flex flex-col items-center justify-center gap-2 text-center p-4">
            <Package className="w-8 h-8 text-muted/50" />
            <p className="text-xs font-bold text-main">No {currentCategoryConfig.name} items found</p>
            <p className="text-[11px] text-muted max-w-sm">
              {itemSearch || itemAvailabilityFilter !== 'all' || itemSupplierFilter !== 'all'
                ? 'Try adjusting your search query or filters.'
                : `Add items to the ${currentCategoryConfig.name} catalog so customers can order.`}
            </p>
            <button
              onClick={() => {
                setAddItemError('');
                setAddItemForm({ name: '', price: '', unit: '', supplierId: '', isAvailable: true, description: '', image: '' });
                setAddItemFile(null);
                setShowAddItemModal(true);
              }}
              className={`mt-2 px-3.5 py-1.5 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs hover:shadow-xs cursor-pointer ${currentCategoryConfig.badgeColor}`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-line text-[11px] font-extrabold text-muted uppercase tracking-wider">
                  <th className="py-2.5 px-3">Item Details</th>
                  <th className="py-2.5 px-3">Price</th>
                  <th className="py-2.5 px-3">Assigned Supplier</th>
                  <th className="py-2.5 px-3 text-center">Availability</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-xs">
                {filteredItems.map((item) => {
                  const isToggling = itemToggleLoading[item._id];
                  return (
                    <tr key={item._id} className="hover:bg-base/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-base border border-line overflow-hidden shrink-0 flex items-center justify-center">
                            {item.image ? (
                              <img
                                src={getImageUrl(item.image, 'menu')}
                                alt={item.name}
                                onError={(e) => handleImageError(e, 'menu')}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <CategoryIcon className="w-5 h-5 text-muted" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-main">{item.name}</span>
                              {item.unit && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-base border border-line text-muted">
                                  {item.unit}
                                </span>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-[11px] text-muted truncate max-w-xs font-medium">{item.description}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-display font-black text-sm text-main">
                          ₹{Number(item.price).toFixed(0)}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        {item.supplierName ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                              <Store className="w-3 h-3" />
                              <span>{item.supplierName}</span>
                            </span>
                            {item.supplierActive === false && (
                              <span className="text-[9px] font-extrabold text-amber-600 dark:text-amber-400" title="Supplier is currently inactive">
                                (Supplier Inactive)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold text-muted bg-base border border-line">
                            No Supplier (Direct)
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          disabled={isToggling}
                          onClick={() => handleToggleItemAvailability(item)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black transition-all cursor-pointer border ${
                            isToggling ? 'opacity-50 cursor-wait' : ''
                          } ${
                            item.isAvailable
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400 hover:bg-amber-100'
                          }`}
                          title={`Click to mark ${item.isAvailable ? 'Unavailable' : 'Available'}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${item.isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                          <span>{item.isAvailable ? 'AVAILABLE' : 'UNAVAILABLE'}</span>
                        </button>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditItemError('');
                              setEditItemForm({
                                _id: item._id,
                                name: item.name,
                                price: item.price,
                                unit: item.unit || '',
                                supplierId: item.supplierId || '',
                                isAvailable: item.isAvailable,
                                description: item.description || '',
                                image: item.image || ''
                              });
                              setEditItemFile(null);
                              setShowEditItemModal(true);
                            }}
                            className="p-1.5 rounded-lg border border-line hover:bg-base text-muted hover:text-main transition-colors cursor-pointer"
                            title="Edit Item"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setDeleteItemModal({
                                isOpen: true,
                                item
                              });
                            }}
                            className="p-1.5 rounded-lg border border-line hover:border-red-300 hover:bg-red-50 text-muted hover:text-red-600 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                            title="Delete Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/*  MODALS                                                                */}
      {/* ══════════════════════════════════════════════════════════════════════ */}

      {/* ── ADD SUPPLIER MODAL ── */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-surface border border-line rounded-3xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${currentCategoryConfig.bgColor} ${currentCategoryConfig.textColor}`}>
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-display font-extrabold text-sm sm:text-base text-main">
                    Add {currentCategoryConfig.name} Supplier
                  </h4>
                  <span className="text-[10px] font-bold text-muted uppercase">
                    Category: {currentCategoryConfig.name} (Locked)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSupplierModal(false)}
                className="p-1.5 rounded-xl border border-line text-muted hover:text-main hover:bg-base cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {addSupplierError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{addSupplierError}</span>
              </div>
            )}

            <form onSubmit={handleAddSupplier} className="flex flex-col gap-3.5">
              <div>
                <label className="text-xs font-bold text-main block mb-1">
                  Supplier Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Naga Kiranam, Manoj Meat Shop"
                  value={addSupplierForm.name}
                  onChange={(e) => setAddSupplierForm({ ...addSupplierForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-base border border-line text-main outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-main block mb-1">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={addSupplierForm.phone}
                  onChange={(e) => setAddSupplierForm({ ...addSupplierForm, phone: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-base border border-line text-main outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-main block mb-1">
                  Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Market Road, Nandikotkur"
                  value={addSupplierForm.address}
                  onChange={(e) => setAddSupplierForm({ ...addSupplierForm, address: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-base border border-line text-main outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-muted block mb-1">
                    Latitude (Optional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 15.8549"
                    value={addSupplierForm.latitude}
                    onChange={(e) => setAddSupplierForm({ ...addSupplierForm, latitude: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-base border border-line text-main outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted block mb-1">
                    Longitude (Optional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 78.2638"
                    value={addSupplierForm.longitude}
                    onChange={(e) => setAddSupplierForm({ ...addSupplierForm, longitude: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-base border border-line text-main outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-base border border-line">
                <div>
                  <span className="text-xs font-bold text-main block">Active Status</span>
                  <span className="text-[10px] text-muted font-medium">Allow assigning to new catalog items</span>
                </div>
                <input
                  type="checkbox"
                  checked={addSupplierForm.isActive}
                  onChange={(e) => setAddSupplierForm({ ...addSupplierForm, isActive: e.target.checked })}
                  className="w-4 h-4 accent-primary cursor-pointer"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowAddSupplierModal(false)}
                  className="flex-1 py-2.5 border border-line text-xs font-bold text-muted rounded-xl hover:bg-base cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingSupplier}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isAddingSupplier ? 'Saving...' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT SUPPLIER MODAL ── */}
      {showEditSupplierModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-surface border border-line rounded-3xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${currentCategoryConfig.bgColor} ${currentCategoryConfig.textColor}`}>
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-display font-extrabold text-sm sm:text-base text-main">
                    Edit {currentCategoryConfig.name} Supplier
                  </h4>
                  <span className="text-[10px] font-bold text-muted uppercase">
                    Category: {currentCategoryConfig.name} (Locked)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditSupplierModal(false)}
                className="p-1.5 rounded-xl border border-line text-muted hover:text-main hover:bg-base cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editSupplierError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editSupplierError}</span>
              </div>
            )}

            <form onSubmit={handleEditSupplier} className="flex flex-col gap-3.5">
              <div>
                <label className="text-xs font-bold text-main block mb-1">
                  Supplier Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editSupplierForm.name}
                  onChange={(e) => setEditSupplierForm({ ...editSupplierForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-base border border-line text-main outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-main block mb-1">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={editSupplierForm.phone}
                  onChange={(e) => setEditSupplierForm({ ...editSupplierForm, phone: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-base border border-line text-main outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-main block mb-1">
                  Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={editSupplierForm.address}
                  onChange={(e) => setEditSupplierForm({ ...editSupplierForm, address: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-base border border-line text-main outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-muted block mb-1">
                    Latitude (Optional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editSupplierForm.latitude}
                    onChange={(e) => setEditSupplierForm({ ...editSupplierForm, latitude: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-base border border-line text-main outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted block mb-1">
                    Longitude (Optional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editSupplierForm.longitude}
                    onChange={(e) => setEditSupplierForm({ ...editSupplierForm, longitude: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-base border border-line text-main outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-base border border-line">
                <div>
                  <span className="text-xs font-bold text-main block">Active Status</span>
                  <span className="text-[10px] text-muted font-medium">Deactivating will NOT disable existing items</span>
                </div>
                <input
                  type="checkbox"
                  checked={editSupplierForm.isActive}
                  onChange={(e) => setEditSupplierForm({ ...editSupplierForm, isActive: e.target.checked })}
                  className="w-4 h-4 accent-primary cursor-pointer"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowEditSupplierModal(false)}
                  className="flex-1 py-2.5 border border-line text-xs font-bold text-muted rounded-xl hover:bg-base cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditingSupplier}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isEditingSupplier ? 'Updating...' : 'Update Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE SUPPLIER CONFIRMATION MODAL ── */}
      {deleteSupplierModal.isOpen && deleteSupplierModal.supplier && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-surface border border-line rounded-3xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-50 text-red-600 rounded-2xl dark:bg-red-950/40">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-display font-black text-base text-main">
                  Delete Supplier "{deleteSupplierModal.supplier.name}"?
                </h4>
                <span className="text-xs text-muted font-semibold">Category: {currentCategoryConfig.name}</span>
              </div>
            </div>

            {deleteSupplierModal.linkedCount > 0 ? (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl text-xs text-amber-800 dark:text-amber-300 font-medium">
                <p className="font-bold mb-1">
                  ⚠️ This supplier is currently linked to {deleteSupplierModal.linkedCount} catalog {deleteSupplierModal.linkedCount === 1 ? 'item' : 'items'}.
                </p>
                <p>
                  Deleting this supplier will <strong>NOT delete</strong> these items. The items will be preserved with supplier unassigned (set to <strong>None</strong>).
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted font-medium">
                Are you sure you want to delete this supplier? This action cannot be undone.
              </p>
            )}

            <div className="flex gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setDeleteSupplierModal({ isOpen: false, supplier: null, linkedCount: 0 })}
                className="flex-1 py-2.5 border border-line text-xs font-bold text-muted rounded-xl hover:bg-base cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingSupplier}
                onClick={handleDeleteSupplier}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isDeletingSupplier ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD ITEM MODAL ── */}
      {showAddItemModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-surface border border-line rounded-3xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${currentCategoryConfig.bgColor} ${currentCategoryConfig.textColor}`}>
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-display font-extrabold text-sm sm:text-base text-main">
                    Add {currentCategoryConfig.name} Item
                  </h4>
                  <span className="text-[10px] font-bold text-muted uppercase">
                    Category: {currentCategoryConfig.name} (Locked)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddItemModal(false)}
                className="p-1.5 rounded-xl border border-line text-muted hover:text-main hover:bg-base cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {addItemError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{addItemError}</span>
              </div>
            )}

            <form onSubmit={handleAddItem} className="flex flex-col gap-3.5">
              <div>
                <label className="text-xs font-bold text-main block mb-1">
                  Item Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chicken 1kg, Aashirvaad Atta 5kg, Tomato 1kg"
                  value={addItemForm.name}
                  onChange={(e) => setAddItemForm({ ...addItemForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-base border border-line text-main outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-main block mb-1">
                    Price (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    placeholder="e.g. 220"
                    value={addItemForm.price}
                    onChange={(e) => setAddItemForm({ ...addItemForm, price: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-base border border-line text-main outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted block mb-1">
                    Unit / Pack Size (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1kg, 500g, 1L, 12 pcs"
                    value={addItemForm.unit}
                    onChange={(e) => setAddItemForm({ ...addItemForm, unit: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-base border border-line text-main outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-main block mb-1">
                  Supplier (Optional)
                </label>
                <select
                  value={addItemForm.supplierId}
                  onChange={(e) => setAddItemForm({ ...addItemForm, supplierId: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-base border border-line text-main outline-none focus:border-primary cursor-pointer font-medium"
                >
                  <option value="">No Supplier (Direct / In-House)</option>
                  {activeSuppliersForCategory.map(s => (
                    <option key={s._id} value={s._id}>{s.name} ({s.phone})</option>
                  ))}
                </select>
                <span className="text-[10px] text-muted mt-1 block">
                  Only active {currentCategoryConfig.name} suppliers are listed.
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-main block mb-1">
                  Item Image (Optional)
                </label>
                <ImageUploadInput
                  value={addItemForm.image}
                  onChange={(val) => setAddItemForm({ ...addItemForm, image: val })}
                  onFileSelect={(file) => setAddItemFile(file)}
                  placeholder="Paste Image URL or select file"
                  category="menu"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted block mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Short description of the item..."
                  value={addItemForm.description}
                  onChange={(e) => setAddItemForm({ ...addItemForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-base border border-line text-main outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-base border border-line">
                <div>
                  <span className="text-xs font-bold text-main block">Available for Ordering</span>
                  <span className="text-[10px] text-muted font-medium">Customers can add available items to cart</span>
                </div>
                <input
                  type="checkbox"
                  checked={addItemForm.isAvailable}
                  onChange={(e) => setAddItemForm({ ...addItemForm, isAvailable: e.target.checked })}
                  className="w-4 h-4 accent-primary cursor-pointer"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowAddItemModal(false)}
                  className="flex-1 py-2.5 border border-line text-xs font-bold text-muted rounded-xl hover:bg-base cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingItem}
                  className={`flex-1 py-2.5 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer disabled:opacity-50 ${currentCategoryConfig.badgeColor}`}
                >
                  {isAddingItem ? 'Saving...' : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT ITEM MODAL ── */}
      {showEditItemModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-surface border border-line rounded-3xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${currentCategoryConfig.bgColor} ${currentCategoryConfig.textColor}`}>
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-display font-extrabold text-sm sm:text-base text-main">
                    Edit {currentCategoryConfig.name} Item
                  </h4>
                  <span className="text-[10px] font-bold text-muted uppercase">
                    Category: {currentCategoryConfig.name} (Locked)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditItemModal(false)}
                className="p-1.5 rounded-xl border border-line text-muted hover:text-main hover:bg-base cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editItemError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editItemError}</span>
              </div>
            )}

            <form onSubmit={handleEditItem} className="flex flex-col gap-3.5">
              <div>
                <label className="text-xs font-bold text-main block mb-1">
                  Item Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editItemForm.name}
                  onChange={(e) => setEditItemForm({ ...editItemForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-base border border-line text-main outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-main block mb-1">
                    Price (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={editItemForm.price}
                    onChange={(e) => setEditItemForm({ ...editItemForm, price: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-base border border-line text-main outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted block mb-1">
                    Unit / Pack Size
                  </label>
                  <input
                    type="text"
                    value={editItemForm.unit}
                    onChange={(e) => setEditItemForm({ ...editItemForm, unit: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-base border border-line text-main outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-main block mb-1">
                  Supplier (Optional)
                </label>
                <select
                  value={editItemForm.supplierId}
                  onChange={(e) => setEditItemForm({ ...editItemForm, supplierId: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-base border border-line text-main outline-none focus:border-primary cursor-pointer font-medium"
                >
                  <option value="">No Supplier (Direct / In-House)</option>
                  {suppliers.map(s => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.phone}) {!s.isActive ? '[Inactive]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-main block mb-1">
                  Item Image
                </label>
                <ImageUploadInput
                  value={editItemForm.image}
                  onChange={(val) => setEditItemForm({ ...editItemForm, image: val })}
                  onFileSelect={(file) => setEditItemFile(file)}
                  placeholder="Paste Image URL or select file"
                  category="menu"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted block mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editItemForm.description}
                  onChange={(e) => setEditItemForm({ ...editItemForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-base border border-line text-main outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-base border border-line">
                <div>
                  <span className="text-xs font-bold text-main block">Available for Ordering</span>
                  <span className="text-[10px] text-muted font-medium">Toggle in/out of stock</span>
                </div>
                <input
                  type="checkbox"
                  checked={editItemForm.isAvailable}
                  onChange={(e) => setEditItemForm({ ...editItemForm, isAvailable: e.target.checked })}
                  className="w-4 h-4 accent-primary cursor-pointer"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowEditItemModal(false)}
                  className="flex-1 py-2.5 border border-line text-xs font-bold text-muted rounded-xl hover:bg-base cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditingItem}
                  className={`flex-1 py-2.5 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer disabled:opacity-50 ${currentCategoryConfig.badgeColor}`}
                >
                  {isEditingItem ? 'Updating...' : 'Update Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE ITEM CONFIRMATION MODAL ── */}
      {deleteItemModal.isOpen && deleteItemModal.item && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-surface border border-line rounded-3xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-50 text-red-600 rounded-2xl dark:bg-red-950/40">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-display font-black text-base text-main">
                  Delete Item "{deleteItemModal.item.name}"?
                </h4>
                <span className="text-xs text-muted font-semibold">Category: {currentCategoryConfig.name}</span>
              </div>
            </div>

            <p className="text-xs text-muted font-medium">
              Are you sure you want to delete this catalog item? It will be removed from the catalog.
            </p>

            <div className="flex gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setDeleteItemModal({ isOpen: false, item: null })}
                className="flex-1 py-2.5 border border-line text-xs font-bold text-muted rounded-xl hover:bg-base cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingItem}
                onClick={handleDeleteItem}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isDeletingItem ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

import { API_BASE } from '../config/api';
import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, SlidersHorizontal, ArrowUpDown, AlertTriangle, Heart, ShoppingBag, Store, Sparkles, X, MapPin } from 'lucide-react';
import RestaurantCard from '../components/RestaurantCard';
import { useCartStore } from '../store/cartStore';
import { useFavoriteStore } from '../store/favoriteStore';
import { useTranslation } from '../store/languageStore';
import { getImageUrl, handleImageError } from '../utils/uploadUtil';
import VegBadge from '../components/VegBadge';

// ─── 1. FOOD CATEGORIES ───
const foodCategories = [
  { name: 'Biryani', image: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=200&h=200&q=80' },
  { name: 'Burgers', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=200&h=200&q=80' },
  { name: 'Pizza', image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=200&h=200&q=80' },
  { name: 'Sushi', image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=200&h=200&q=80' },
  { name: 'Salads', image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=200&h=200&q=80' },
  { name: 'Dosa', image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=200&h=200&q=80' },
  { name: 'Desserts', image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=200&h=200&q=80' },
  { name: 'Noodles', image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=200&h=200&q=80' }
];

export default function RestaurantListing() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const [restaurants, setRestaurants] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Category & search params from URL
  const categoryParam = searchParams.get('category') || '';
  const searchParam = searchParams.get('search') || '';
  const isGlobalSearch = Boolean(searchParam.trim());

  // Active Service Tab for Global Search Filtering
  const [activeSearchTab, setActiveSearchTab] = useState('all');

  // Identify Active Dashboard for Browsing Mode
  let activeDashboard = 'food';
  let defaultCategories = foodCategories;

  if (categoryParam === 'beverages' || categoryParam === 'hot_cool' || categoryParam === 'cool_hot') {
    activeDashboard = 'cool_hot';
    defaultCategories = [];
  } else if (categoryParam === 'grocery') {
    activeDashboard = 'grocery';
    defaultCategories = [];
  } else if (categoryParam === 'meat') {
    activeDashboard = 'meat';
    defaultCategories = [];
  } else if (categoryParam === 'fruits-vegetables' || categoryParam === 'veg_fruits') {
    activeDashboard = 'veg_fruits';
    defaultCategories = [];
  }

  const [dynamicCategories, setDynamicCategories] = useState([]);

  // Fetch dynamic categories from Super Admin backend for browse mode
  useEffect(() => {
    let isMounted = true;
    fetch(`${API_BASE}/categories?service=${activeDashboard}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setDynamicCategories(data);
        } else if (isMounted) {
          setDynamicCategories([]);
        }
      })
      .catch(err => {
        console.error('Categories fetch error:', err);
        if (isMounted) setDynamicCategories([]);
      });
    return () => { isMounted = false; };
  }, [activeDashboard]);

  const activeCategories = (dynamicCategories && dynamicCategories.length > 0) ? dynamicCategories : defaultCategories;

  // Filter and sort states
  const [searchQuery, setSearchQuery] = useState(searchParam);
  const [selectedCuisine, setSelectedCuisine] = useState(searchParams.get('cuisine') || 'All');
  const [isPureVeg, setIsPureVeg] = useState(searchParams.get('veg') === 'true');
  const [activeSort, setActiveSort] = useState(searchParams.get('sort') || 'rating');

  // Zustand Stores
  const cartItems = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const showToast = useCartStore((state) => state.showToast);
  const favouriteItems = useFavoriteStore((state) => state.favouriteItems);
  const toggleItem = useFavoriteStore((state) => state.toggleItem);

  // All Category Services status list
  const [allCategoryServices, setAllCategoryServices] = useState([]);
  const [categoryStatusInfo, setCategoryStatusInfo] = useState({ isBlocked: false, message: '' });

  // Conflict modal state
  const [conflictModal, setConflictModal] = useState({ isOpen: false, message: '', pendingItem: null, pendingRestaurant: null });

  // Selected item variant state for catalog products with multi-variants
  const [selectedVariants, setSelectedVariants] = useState({});

  // Sync state with URL params
  useEffect(() => {
    const paramSearch = searchParams.get('search') || '';
    setSearchQuery(paramSearch);
    setSelectedCuisine(searchParams.get('cuisine') || 'All');
    setIsPureVeg(searchParams.get('veg') === 'true');
    setActiveSort(searchParams.get('sort') || 'rating');
  }, [searchParams]);

  // Fetch category-services availability list
  useEffect(() => {
    fetch(`${API_BASE}/restaurants/category-services`)
      .then(res => res.ok ? res.json() : [])
      .then(list => {
        if (Array.isArray(list)) {
          setAllCategoryServices(list);
          const cId = activeDashboard === 'cool_hot' ? 'bakery_beverages' : activeDashboard;
          const found = list.find(c => c.id === cId);
          if (found) {
            if (found.status === 'DISABLED' || found.isEnabled === false) {
              setCategoryStatusInfo({ isBlocked: true, message: t('home.serviceUnavailable', 'We are not providing this service currently.') });
            } else if (found.status === 'CLOSED') {
              setCategoryStatusInfo({ isBlocked: true, message: `${found.name || 'This'} service is closed. ${found.message || ''}`.trim() });
            } else {
              setCategoryStatusInfo({ isBlocked: false, message: '' });
            }
          } else {
            setCategoryStatusInfo({ isBlocked: false, message: '' });
          }
        }
      })
      .catch(() => {});
  }, [activeDashboard, t]);

  // ═══════════════════════════════════════════════════════════════════════
  // DATA FETCHING & FILTERING
  // ═══════════════════════════════════════════════════════════════════════
  useEffect(() => {
    let isCancelled = false;

    const loadData = async () => {
      setIsLoading(true);
      try {
        if (isGlobalSearch) {
          // ─── CROSS-SERVICE GLOBAL SEARCH MODE ─────────────────────────
          const query = searchQuery.trim().toLowerCase();

          // 1. Check service availability
          const getServiceState = (sId) => {
            const normalized = sId === 'cool_hot' ? 'bakery_beverages' : sId;
            const s = allCategoryServices.find(item => item.id === normalized);
            if (!s) return { isEnabled: true, isClosed: false, message: '' };
            const enabled = s.isEnabled !== false && s.status !== 'DISABLED';
            const closed = s.status === 'CLOSED';
            return { isEnabled: enabled, isClosed: closed, message: s.message || '' };
          };

          const foodState = getServiceState('food');
          const groceryState = getServiceState('grocery');
          const meatState = getServiceState('meat');
          const vegFruitsState = getServiceState('veg_fruits');
          const coolHotState = getServiceState('cool_hot');

          // Fetch food dishes and food restaurants if Food service is enabled
          let fetchedFoodDishes = [];
          let fetchedFoodRestaurants = [];

          if (foodState.isEnabled) {
            try {
              const dishParams = new URLSearchParams();
              dishParams.set('search', searchQuery.trim());
              if (isPureVeg) dishParams.set('veg', 'true');

              const [dishesRes, restRes] = await Promise.allSettled([
                fetch(`${API_BASE}/restaurants/dishes/search?${dishParams.toString()}`),
                fetch(`${API_BASE}/restaurants?search=${encodeURIComponent(searchQuery.trim())}`)
              ]);

              if (dishesRes.status === 'fulfilled' && dishesRes.value.ok) {
                const dData = await dishesRes.value.json();
                fetchedFoodDishes = Array.isArray(dData) ? dData : (dData.dishes || dData.data || []);
              }

              if (restRes.status === 'fulfilled' && restRes.value.ok) {
                const rData = await restRes.value.json();
                fetchedFoodRestaurants = Array.isArray(rData) ? rData : (rData.restaurants || rData.data || []);
              }
            } catch (err) {
              console.error('Error searching food items:', err);
            }
          }

          // Map food items with service details
          const formattedFoodDishes = fetchedFoodDishes.map(item => ({
            ...item,
            service: 'food',
            serviceName: 'Food',
            isServiceClosed: foodState.isClosed,
            closedMessage: foodState.message,
          }));

          // Fetch live catalog items for non-food services
          let liveCatalogItems = [];
          try {
            const catRes = await fetch(`${API_BASE}/catalog-items`);
            if (catRes.ok) {
              const catJson = await catRes.json();
              liveCatalogItems = Array.isArray(catJson) ? catJson : (catJson.items || []);
            }
          } catch (err) {
            console.error('Error fetching global catalog items:', err);
          }

          // Helper filter for live catalog items across services
          const filterLiveCatalog = (catKey, sId, sName, serviceState) => {
            if (!serviceState.isEnabled) return [];
            const liveForCat = liveCatalogItems.filter(i => i.category === catKey);
            const sourceData = liveForCat.map(i => ({
              _id: i._id || i.id,
              id: i._id || i.id,
              name: i.name,
              price: Number(i.price),
              unit: i.unit || '',
              variants: i.variants || [],
              image: i.image || '',
              description: i.description || '',
              category: i.category || sName,
              service: sId,
              serviceName: sName,
              supplierId: i.supplierId || null,
              supplierName: i.supplierName || null,
              supplierPhone: i.supplierPhone || '',
              supplierAddress: i.supplierAddress || null,
              supplierActive: i.supplierActive !== false,
              isAvailable: i.isAvailable !== false,
              restaurant: {
                _id: i.supplierId || 'jinkzo_catalog',
                name: i.supplierName || 'Jinkzo Store',
                address: i.supplierAddress || '',
                isActive: i.supplierActive !== false
              }
            }));

            return sourceData
              .filter(item => {
                const name = (item.name || '').toLowerCase();
                const desc = (item.description || '').toLowerCase();
                const cat = (item.category || '').toLowerCase();
                const restName = (item.supplierName || item.restaurant?.name || '').toLowerCase();
                return name.includes(query) || desc.includes(query) || cat.includes(query) || restName.includes(query);
              })
              .map(item => ({
                ...item,
                service: sId,
                serviceName: sName,
                isServiceClosed: serviceState.isClosed,
                closedMessage: serviceState.message,
              }));
          };

          const matchedGrocery = filterLiveCatalog('grocery', 'grocery', 'Grocery', groceryState);
          const matchedMeat = filterLiveCatalog('meat', 'meat', 'Meat', meatState);
          const matchedVegFruits = filterLiveCatalog('veg_fruits', 'veg_fruits', 'Veg & Fruits', vegFruitsState);
          const matchedCoolHot = filterLiveCatalog('bakery_beverages', 'cool_hot', 'Bakery & Beverages', coolHotState);

          if (!isCancelled) {
            // Aggregate all matched dishes from all active services
            const allMatchedDishes = [
              ...formattedFoodDishes,
              ...matchedGrocery,
              ...matchedMeat,
              ...matchedVegFruits,
              ...matchedCoolHot,
            ];

            setDishes(allMatchedDishes);
            setRestaurants(fetchedFoodRestaurants);
          }
        } else {
          // ─── SERVICE-SPECIFIC BROWSING MODE ────────────────────────────
          if (activeDashboard === 'food') {
            const queryParams = new URLSearchParams();
            if (selectedCuisine && selectedCuisine !== 'All') queryParams.set('cuisine', selectedCuisine);
            if (isPureVeg) queryParams.set('veg', 'true');

            if (selectedCuisine !== 'All') {
              const url = `${API_BASE}/restaurants/dishes/search?${queryParams.toString()}`;
              const res = await fetch(url);
              if (res.ok) {
                const data = await res.json();
                const list = Array.isArray(data) ? data : (data.dishes || data.data || []);
                if (!isCancelled) {
                  setDishes(list.map(d => ({ ...d, service: 'food', serviceName: 'Food' })));
                  setRestaurants([]);
                }
              } else if (!isCancelled) {
                setDishes([]);
                setRestaurants([]);
              }
            } else {
              if (activeSort) queryParams.set('sort', activeSort);
              const url = `${API_BASE}/restaurants?${queryParams.toString()}`;
              const res = await fetch(url);
              if (res.ok) {
                const data = await res.json();
                if (!isCancelled) {
                  setRestaurants(Array.isArray(data) ? data : (data.restaurants || data.data || []));
                  setDishes([]);
                }
              } else if (!isCancelled) {
                setRestaurants([]);
                setDishes([]);
              }
            }
          } else {
            // NON-FOOD DASHBOARDS: Fetch live items from backend /api/catalog-items
            setRestaurants([]);

            let sId = 'grocery';
            let sName = 'Grocery';
            let categoryBackendKey = 'grocery';

            if (activeDashboard === 'cool_hot') {
              sId = 'cool_hot';
              sName = 'Bakery & Beverages';
              categoryBackendKey = 'bakery_beverages';
            } else if (activeDashboard === 'grocery') {
              sId = 'grocery';
              sName = 'Grocery';
              categoryBackendKey = 'grocery';
            } else if (activeDashboard === 'meat') {
              sId = 'meat';
              sName = 'Meat';
              categoryBackendKey = 'meat';
            } else if (activeDashboard === 'veg_fruits') {
              sId = 'veg_fruits';
              sName = 'Veg & Fruits';
              categoryBackendKey = 'veg_fruits';
            }

            let liveItems = [];
            try {
              const res = await fetch(`${API_BASE}/catalog-items?category=${categoryBackendKey}`);
              if (res.ok) {
                const json = await res.json();
                liveItems = Array.isArray(json) ? json : (json.items || []);
              }
            } catch (err) {
              console.error(`Error fetching live ${sName} catalog:`, err);
            }

            let dataset = [];
            if (liveItems && liveItems.length > 0) {
              dataset = liveItems.map(item => ({
                _id: item._id || item.id,
                id: item._id || item.id,
                name: item.name,
                price: Number(item.price),
                unit: item.unit || '',
                variants: item.variants || [],
                image: item.image || '',
                description: item.description || '',
                category: item.category || categoryBackendKey,
                service: sId,
                serviceName: sName,
                itemModel: 'CatalogItem',
                supplierId: item.supplierId || item.supplier?._id || item.supplier?.id || null,
                supplierName: item.supplierName || item.supplier?.name || null,
                supplierPhone: item.supplierPhone || item.supplier?.phone || '',
                supplierAddress: item.supplierAddress || item.supplier?.address || '',
                supplierLatitude: item.supplierLatitude ?? item.supplier?.latitude ?? null,
                supplierLongitude: item.supplierLongitude ?? item.supplier?.longitude ?? null,
                supplier: item.supplier || null,
                supplierActive: item.supplierActive !== false && item.supplier?.isActive !== false,
                isAvailable: item.isAvailable !== false
              }));
            }

            let filtered = dataset;

            if (selectedCuisine && selectedCuisine !== 'All') {
              filtered = filtered.filter(item =>
                item.category?.toLowerCase() === selectedCuisine.toLowerCase() ||
                item.name?.toLowerCase().includes(selectedCuisine.toLowerCase())
              );
            }

            if (!isCancelled) {
              setDishes(filtered);
            }
          }
        }
      } catch (err) {
        console.error('Fetch filtering data error:', err);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [activeDashboard, searchQuery, isGlobalSearch, selectedCuisine, isPureVeg, activeSort, allCategoryServices]);

  // URL sync helper
  const updateUrlParam = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== 'All' && value !== false) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  const handleCuisineClick = (cuisine) => {
    const nextVal = selectedCuisine.toLowerCase() === cuisine.toLowerCase() ? 'All' : cuisine;
    setSelectedCuisine(nextVal);
    updateUrlParam('cuisine', nextVal);
  };

  const handleVegToggle = () => {
    const nextVal = !isPureVeg;
    setIsPureVeg(nextVal);
    updateUrlParam('veg', nextVal ? 'true' : null);
  };

  const handleSortChange = (e) => {
    const val = e.target.value;
    setActiveSort(val);
    updateUrlParam('sort', val);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveSearchTab('all');
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('search');
    setSearchParams(newParams);
  };

  // Add Item to cart with service availability & restaurant check
  const handleAddToCart = (dish) => {
    const sId = dish.service === 'cool_hot' ? 'bakery_beverages' : (dish.service || activeDashboard);
    const serviceStatus = (allCategoryServices || []).find(s => s.id === sId);

    if (serviceStatus && (serviceStatus.status === 'DISABLED' || serviceStatus.isEnabled === false)) {
      showToast(t('home.serviceUnavailable', 'We are not providing this service currently.'), 'error');
      return;
    }
    if (serviceStatus && serviceStatus.status === 'CLOSED') {
      showToast(`${serviceStatus.name || 'This'} service is closed. ${serviceStatus.message || ''}`.trim(), 'error');
      return;
    }
    if (dish.isServiceClosed) {
      showToast(dish.closedMessage || 'This service is currently closed.', 'error');
      return;
    }

    const dishId = dish._id || dish.id;
    const hasVariants = Array.isArray(dish.variants) && dish.variants.length > 1;
    const currentVariant = (hasVariants && selectedVariants[dishId])
      ? selectedVariants[dishId]
      : (hasVariants ? dish.variants[0] : null);

    const activeDish = currentVariant ? {
      ...dish,
      price: currentVariant.price,
      unit: currentVariant.unit
    } : dish;

    const isCatalogItem = (activeDish.service && activeDish.service !== 'food') ||
      ['grocery', 'meat', 'veg_fruits', 'fruits-vegetables', 'veg & fruits', 'bakery_beverages', 'bakery & beverages', 'cool_hot', 'hot_cool'].includes((activeDish.category || '').toLowerCase()) ||
      Boolean(activeDish.supplierId) ||
      Boolean(activeDish.supplier) ||
      activeDish.itemModel === 'CatalogItem';

    const result = addItem(activeDish, isCatalogItem ? null : dish.restaurant);
    if (result && result.conflict) {
      setConflictModal({
        isOpen: true,
        message: result.message,
        pendingItem: activeDish,
        pendingRestaurant: dish.restaurant
      });
    }
  };

  const handleRemoveFromCart = (dish) => {
    const dishId = dish._id || dish.id;
    const hasVariants = Array.isArray(dish.variants) && dish.variants.length > 1;
    const currentVariant = (hasVariants && selectedVariants[dishId])
      ? selectedVariants[dishId]
      : (hasVariants ? dish.variants[0] : null);

    removeItem(dishId, currentVariant ? currentVariant.unit : (dish.unit || null));
  };

  const confirmConflictReset = () => {
    clearCart();
    addItem(conflictModal.pendingItem, conflictModal.pendingRestaurant);
    setConflictModal({ isOpen: false, message: '', pendingItem: null, pendingRestaurant: null });
  };

  const getItemQuantity = (itemId, unit = null) => {
    if (unit != null && unit !== '') {
      const matched = cartItems.find((i) => String(i.menuItemId) === String(itemId) && (i.unit || '') === String(unit));
      return matched ? matched.quantity : 0;
    }
    const matched = cartItems.filter((i) => String(i.menuItemId) === String(itemId));
    return matched.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
  };

  // Sorted and filtered dishes
  const sortedDishes = useMemo(() => {
    if (!Array.isArray(dishes)) return [];
    let list = [...dishes];

    // Filter by active search service tab if selected
    if (isGlobalSearch && activeSearchTab !== 'all') {
      list = list.filter(item => item.service === activeSearchTab);
    }

    if (activeSort === 'costAsc') {
      list.sort((a, b) => a.price - b.price);
    } else if (activeSort === 'costDesc') {
      list.sort((a, b) => b.price - a.price);
    } else if (activeSort === 'rating') {
      list.sort((a, b) => (b.restaurant?.rating || 0) - (a.restaurant?.rating || 0));
    } else if (activeSort === 'deliveryTime') {
      list.sort((a, b) => (a.restaurant?.deliveryTime || 0) - (b.restaurant?.deliveryTime || 0));
    }

    return list;
  }, [dishes, isGlobalSearch, activeSearchTab, activeSort]);

  // Group dishes by Store / Supplier for Catalog Categories
  const storeGroups = useMemo(() => {
    if (activeDashboard === 'food' || isGlobalSearch) return null;
    if (!Array.isArray(sortedDishes) || sortedDishes.length === 0) return [];

    const groupsMap = {};
    const UNASSIGNED_ID = '__unassigned__';

    sortedDishes.forEach(dish => {
      const supId = dish.supplierId || (dish.supplierName ? dish.supplierName : UNASSIGNED_ID);
      const supName = dish.supplierName || (dish.restaurant?.name !== 'Jinkzo Store' && dish.restaurant?.name ? dish.restaurant.name : 'Available from Jinkzo Catalog');
      const supAddress = dish.supplierAddress || dish.restaurant?.address || '';
      const isStoreActive = dish.supplierActive !== false;

      if (!groupsMap[supId]) {
        groupsMap[supId] = {
          id: supId,
          name: supName,
          address: supAddress,
          isActive: isStoreActive,
          isUnassigned: supId === UNASSIGNED_ID || !dish.supplierId,
          items: []
        };
      }
      groupsMap[supId].items.push(dish);
    });

    return Object.values(groupsMap);
  }, [sortedDishes, activeDashboard, isGlobalSearch]);

  // Counts by service for search tabs
  const serviceCounts = useMemo(() => {
    if (!Array.isArray(dishes)) return {};
    const counts = { all: dishes.length, food: 0, grocery: 0, meat: 0, cool_hot: 0, veg_fruits: 0 };
    dishes.forEach(item => {
      if (item.service && counts[item.service] !== undefined) {
        counts[item.service]++;
      }
    });
    return counts;
  }, [dishes]);

  // Group dishes by service for grouped view
  const groupedDishes = useMemo(() => {
    if (!isGlobalSearch || activeSearchTab !== 'all') return null;
    const groups = [
      { key: 'food', title: 'Food & Restaurants', icon: '🍲', items: [] },
      { key: 'grocery', title: 'Grocery', icon: '🛒', items: [] },
      { key: 'meat', title: 'Fresh Meat', icon: '🥩', items: [] },
      { key: 'cool_hot', title: 'Bakery & Beverages', icon: '🧁', items: [] },
      { key: 'veg_fruits', title: 'Veg & Fruits', icon: '🥦', items: [] }
    ];

    sortedDishes.forEach(item => {
      const group = groups.find(g => g.key === item.service);
      if (group) {
        group.items.push(item);
      }
    });

    return groups.filter(g => g.items.length > 0);
  }, [isGlobalSearch, activeSearchTab, sortedDishes]);

  // Service Badge Helper Component
  const getServiceBadge = (service, serviceName) => {
    switch (service) {
      case 'food':
        return (
          <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30">
            Food
          </span>
        );
      case 'grocery':
        return (
          <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            Grocery
          </span>
        );
      case 'meat':
        return (
          <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
            Meat
          </span>
        );
      case 'veg_fruits':
        return (
          <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-lime-500/15 text-lime-700 dark:text-lime-400 border border-lime-500/30">
            Veg & Fruits
          </span>
        );
      case 'cool_hot':
        return (
          <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
            Bakery & Beverages
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
            {serviceName || 'Store'}
          </span>
        );
    }
  };

  // Render an individual item card
  const renderDishCard = (dish) => {
    const dishId = dish._id || dish.id;
    const hasVariants = Array.isArray(dish.variants) && dish.variants.length > 1;
    const currentVariant = (hasVariants && selectedVariants[dishId])
      ? selectedVariants[dishId]
      : (hasVariants ? dish.variants[0] : null);

    const activePrice = currentVariant ? currentVariant.price : dish.price;
    const activeUnit = currentVariant ? currentVariant.unit : dish.unit;
    const quantity = getItemQuantity(dishId, activeUnit);

    const isRestClosed = dish.restaurant?.isClosed || dish.isServiceClosed;
    const isItemUnavailable = dish.isAvailable === false;
    const isDisabled = isRestClosed || isItemUnavailable;
    const isFav = favouriteItems.some((i) => String(i._id || i.id) === String(dishId));

    const isFood = dish.service === 'food' || (!dish.service && activeDashboard === 'food');
    const storeDisplayName = dish.supplierName || dish.restaurant?.name || (isFood ? 'Jinkzo Verified Restaurant' : 'Available from Jinkzo Catalog');

    return (
      <div
        key={dishId}
        className={`bg-surface rounded-3xl p-4 shadow-2xs border border-line flex flex-col justify-between gap-4 transition-all hover:shadow-md hover:scale-[1.01] duration-300 animate-fade-in ${isDisabled ? 'opacity-75' : ''}`}
      >
        <div className="flex gap-4">
          {/* Image */}
          <div className="relative w-24 h-24 md:w-28 md:h-28 flex-shrink-0">
            {isRestClosed && (
              <div className="absolute inset-0 bg-black/55 backdrop-blur-3xs rounded-2xl flex items-center justify-center z-10">
                <span className="bg-red-600 text-white text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md shadow-xs">
                  {dish.closedMessage ? 'Service Closed' : t('restaurant.temporarilyClosed', 'Temporarily Closed')}
                </span>
              </div>
            )}
            {!isRestClosed && isItemUnavailable && (
              <div className="absolute inset-0 bg-black/55 backdrop-blur-3xs rounded-2xl flex items-center justify-center z-10">
                <span className="bg-gray-700 text-white text-[8px] font-black uppercase tracking-wider px-1.5 py-1 rounded-md shadow-xs">
                  {t('restaurant.outOfStock', 'Out of Stock')}
                </span>
              </div>
            )}
            <img
              src={getImageUrl(dish.image, 'food')}
              alt={dish.name}
              onError={(e) => handleImageError(e, 'food')}
              className="w-full h-full object-cover rounded-2xl bg-base border border-line shadow-2xs"
              loading="lazy"
            />
            {/* Veg / Non-Veg Badge (Food items only) */}
            {isFood && (
              <div className="absolute top-2 left-2 z-10">
                <VegBadge isVeg={dish.isVeg} size="xs" className="shadow-xs backdrop-blur-xs bg-white/95 dark:bg-[#141926]/95" />
              </div>
            )}

            {/* Heart Button */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleItem(dish);
              }}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 dark:bg-[#141926]/90 shadow-sm border border-gray-100 dark:border-white/10 hover:scale-110 active:scale-95 transition-all cursor-pointer z-10"
              title={isFav ? t('favourites.removeFromFavourites', 'Remove from Favourites') : t('favourites.addToFavourites', 'Add to Favourites')}
            >
              <Heart className={`w-3.5 h-3.5 transition-colors ${
                isFav
                  ? 'text-red-500 fill-red-500'
                  : 'text-gray-400 hover:text-red-500'
              }`} />
            </button>
          </div>

          {/* Dish Info */}
          <div className="flex flex-col gap-1 flex-grow justify-between py-1 min-w-0">
            <div>
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                {getServiceBadge(dish.service, dish.serviceName)}
                {activeUnit && (
                  <span className="text-[10px] font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                    {activeUnit}
                  </span>
                )}
                {dish.category && (
                  <span className="text-[10px] font-bold text-muted bg-base px-2 py-0.5 rounded-md border border-line truncate max-w-[130px]">
                    {dish.category}
                  </span>
                )}
              </div>
              <h3 className="font-display font-extrabold text-sm text-main line-clamp-1">
                {dish.name}
              </h3>
              <p className="text-xs text-muted font-medium line-clamp-2 mt-0.5">
                {dish.description || 'Fresh and high quality catalog item.'}
              </p>

              {/* Multi-variant size pills */}
              {hasVariants && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {dish.variants.map((v, vIdx) => {
                    const isSelected = (currentVariant?.unit === v.unit);
                    return (
                      <button
                        key={vIdx}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedVariants(prev => ({ ...prev, [dishId]: v }));
                        }}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-primary text-white border-primary shadow-xs'
                            : 'bg-base text-main border-line hover:border-primary/40'
                        }`}
                      >
                        {v.unit} (₹{v.price})
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-1">
              <span className="text-sm font-black text-main">₹{activePrice}</span>
            </div>
          </div>
        </div>

        {/* Sold by / Store & Add to Cart button */}
        <div className="border-t border-line pt-3 mt-1 flex justify-between items-center">
          <div className="flex flex-col gap-0.5 max-w-[60%] min-w-0">
            <span className="text-[10px] text-muted font-bold uppercase tracking-wider">
              {isFood ? t('restaurant.soldBy', 'Sold by') : 'Store'}
            </span>
            <span className="text-xs font-bold text-main truncate">
              {storeDisplayName}
            </span>
          </div>

          {isDisabled ? (
            <div className="bg-gray-100 dark:bg-gray-800 border border-line-strong rounded-xl flex items-center justify-center px-3 h-9 flex-shrink-0">
              <span className="text-[9px] font-black text-muted uppercase tracking-wider">
                {isRestClosed ? t('restaurant.closed', 'Closed') : t('restaurant.unavailable', 'Unavailable')}
              </span>
            </div>
          ) : (
            <div className="bg-surface border border-gray-150 dark:border-white/10 shadow-xs rounded-xl flex items-center justify-between w-24 overflow-hidden h-9 flex-shrink-0">
              {quantity > 0 ? (
                <>
                  <button
                    onClick={() => handleRemoveFromCart(dish)}
                    className="w-8 h-full flex items-center justify-center hover:bg-base text-primary font-black text-sm cursor-pointer transition-colors"
                  >
                    -
                  </button>
                  <span className="text-xs font-extrabold text-main">{quantity}</span>
                  <button
                    onClick={() => handleAddToCart(dish)}
                    className="w-8 h-full flex items-center justify-center hover:bg-base text-primary font-black text-sm cursor-pointer transition-colors"
                  >
                    +
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleAddToCart(dish)}
                  className="w-full h-full text-center text-xs font-black text-primary hover:bg-violet-50/50 dark:hover:bg-violet-950/40 cursor-pointer uppercase transition-colors"
                >
                  {t('restaurant.add', 'Add')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 pb-24 max-w-7xl mx-auto px-4 md:px-8 w-full animate-fade-in transition-colors duration-300">

      {/* Service Warning Banner (when browsing a blocked service) */}
      {!isGlobalSearch && categoryStatusInfo.isBlocked && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-bold">{categoryStatusInfo.message}</span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          A. GLOBAL CROSS-SERVICE SEARCH HEADER
         ═══════════════════════════════════════════════════════════════════════ */}
      {isGlobalSearch ? (
        <section className="bg-surface rounded-3xl p-5 sm:p-6 shadow-2xs border border-line flex flex-col gap-5 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Search className="w-4 h-4" />
                </span>
                <h1 className="font-display font-black text-lg sm:text-2xl text-main tracking-tight">
                  Search Results for <span className="text-primary">"{searchQuery}"</span>
                </h1>
              </div>
              <p className="text-xs text-muted font-medium">
                Searching across all active services: Food, Grocery, Meat, Veg & Fruits, and Bakery & Beverages
              </p>
            </div>

            <button
              onClick={handleClearSearch}
              className="self-start sm:self-center flex items-center gap-1.5 text-xs font-bold text-muted hover:text-primary bg-base px-3 py-1.5 rounded-xl border border-line transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Search</span>
            </button>
          </div>

          {/* Service Tabs & Filter Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-2 border-t border-line">
            {/* Service Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              <button
                onClick={() => setActiveSearchTab('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                  activeSearchTab === 'all'
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-base text-muted hover:text-main border border-line'
                }`}
              >
                All Services ({serviceCounts.all || 0})
              </button>

              {serviceCounts.food > 0 && (
                <button
                  onClick={() => setActiveSearchTab('food')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
                    activeSearchTab === 'food'
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'bg-base text-muted hover:text-main border border-line'
                  }`}
                >
                  <span>🍲 Food ({serviceCounts.food})</span>
                </button>
              )}

              {serviceCounts.grocery > 0 && (
                <button
                  onClick={() => setActiveSearchTab('grocery')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
                    activeSearchTab === 'grocery'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-base text-muted hover:text-main border border-line'
                  }`}
                >
                  <span>🛒 Grocery ({serviceCounts.grocery})</span>
                </button>
              )}

              {serviceCounts.meat > 0 && (
                <button
                  onClick={() => setActiveSearchTab('meat')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
                    activeSearchTab === 'meat'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-base text-muted hover:text-main border border-line'
                  }`}
                >
                  <span>🥩 Meat ({serviceCounts.meat})</span>
                </button>
              )}

              {serviceCounts.cool_hot > 0 && (
                <button
                  onClick={() => setActiveSearchTab('cool_hot')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
                    activeSearchTab === 'cool_hot'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-base text-muted hover:text-main border border-line'
                  }`}
                >
                  <span>🧁 Bakery & Beverages ({serviceCounts.cool_hot})</span>
                </button>
              )}

              {serviceCounts.veg_fruits > 0 && (
                <button
                  onClick={() => setActiveSearchTab('veg_fruits')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
                    activeSearchTab === 'veg_fruits'
                      ? 'bg-lime-600 text-white shadow-xs'
                      : 'bg-base text-muted hover:text-main border border-line'
                  }`}
                >
                  <span>🥦 Veg & Fruits ({serviceCounts.veg_fruits})</span>
                </button>
              )}
            </div>

            {/* Pure Veg (Food / All only) + Sort Controls */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {(activeSearchTab === 'all' || activeSearchTab === 'food') && (
                <button
                  onClick={handleVegToggle}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                    isPureVeg
                      ? 'bg-green-50 dark:bg-green-950/40 border-green-300 dark:border-green-800 text-green-700 dark:text-green-400 font-extrabold'
                      : 'bg-base dark:bg-[#1C2233] border-line text-muted hover:border-line-strong'
                  }`}
                >
                  <span className={`w-3.5 h-3.5 border-2 rounded-sm flex items-center justify-center ${isPureVeg ? 'border-green-600 dark:border-green-400' : 'border-gray-400'}`}>
                    {isPureVeg && <span className="w-1.5 h-1.5 bg-green-600 dark:bg-green-400 rounded-xs" />}
                  </span>
                  <span>{t('restaurant.pureVeg', 'Pure Veg')}</span>
                </button>
              )}

              <div className="flex items-center gap-2 text-muted border border-line bg-base dark:bg-[#1C2233] rounded-2xl px-3 py-2 text-xs font-bold shadow-2xs">
                <ArrowUpDown className="w-3.5 h-3.5 text-muted flex-shrink-0" />
                <select
                  value={activeSort}
                  onChange={handleSortChange}
                  className="bg-transparent outline-none border-none text-main dark:text-white cursor-pointer text-xs font-bold pr-1"
                >
                  <option value="rating" className="bg-surface text-main dark:bg-[#141926] dark:text-white">Rating (High to Low)</option>
                  <option value="deliveryTime" className="bg-surface text-main dark:bg-[#141926] dark:text-white">Delivery Time</option>
                  <option value="costAsc" className="bg-surface text-main dark:bg-[#141926] dark:text-white">Price (Low to High)</option>
                  <option value="costDesc" className="bg-surface text-main dark:bg-[#141926] dark:text-white">Price (High to Low)</option>
                </select>
              </div>
            </div>
          </div>
        </section>
      ) : (
        /* ═══════════════════════════════════════════════════════════════════════
            B. SERVICE-SPECIFIC BROWSING HEADER ("WHAT'S ON YOUR MIND?")
           ═══════════════════════════════════════════════════════════════════════ */
        <section className="bg-surface rounded-3xl p-5 sm:p-6 shadow-2xs border border-line flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition-colors">
          {activeCategories && activeCategories.length > 0 ? (
            <div className="flex-1 flex flex-col gap-4 min-w-0">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-black text-lg sm:text-xl text-main tracking-tight">
                  {t('restaurant.whatsOnYourMind', "What's on your mind?")}
                </h2>
                {selectedCuisine !== 'All' && (
                  <button
                    onClick={() => handleCuisineClick('All')}
                    className="text-xs font-bold text-primary hover:underline cursor-pointer"
                  >
                    {t('restaurant.resetFilter', 'Reset Filter')}
                  </button>
                )}
              </div>

              {/* Circular Categories Row */}
              <div className="flex items-center gap-4 sm:gap-5 overflow-x-auto no-scrollbar py-1">
                {activeCategories.map((cat) => {
                  const isSelected = selectedCuisine.toLowerCase() === cat.name.toLowerCase();
                  return (
                    <button
                      key={cat.name}
                      onClick={() => handleCuisineClick(cat.name)}
                      className="flex flex-col items-center gap-1.5 flex-shrink-0 group cursor-pointer"
                    >
                      <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 p-0.5 transition-all duration-200 group-hover:scale-105 shadow-sm ${
                        isSelected
                          ? 'border-[#7C3AED] ring-3 ring-[#7C3AED]/25 scale-105 shadow-md'
                          : 'border-transparent hover:border-gray-200 dark:hover:border-white/20'
                      }`}>
                        <img
                          src={getImageUrl(cat.image, 'category')}
                          alt={cat.name}
                          onError={(e) => handleImageError(e, 'category')}
                          className="w-full h-full object-cover rounded-full"
                          loading="lazy"
                        />
                      </div>
                      <span className={`text-[11px] sm:text-xs font-bold text-center max-w-[76px] sm:max-w-[88px] leading-tight transition-colors ${
                        isSelected
                          ? 'text-[#7C3AED] dark:text-[#A78BFA] font-black'
                          : 'text-muted group-hover:text-main'
                      }`}>
                        {cat.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center min-w-0">
              <h2 className="font-display font-black text-lg sm:text-xl text-main tracking-tight capitalize">
                {activeDashboard === 'cool_hot' ? 'Bakery & Beverages' : activeDashboard.replace('_', ' & ')}
              </h2>
            </div>
          )}

          {/* Pure Veg (Food only) + Sort Controls */}
          <div className="flex flex-row lg:flex-col items-stretch justify-end gap-3 flex-shrink-0 pt-3 lg:pt-0 lg:pl-6 border-t lg:border-t-0 lg:border-l border-line">
            {activeDashboard === 'food' && (
              <button
                onClick={handleVegToggle}
                className={`flex items-center justify-center lg:justify-start gap-2 px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                  isPureVeg
                    ? 'bg-green-50 dark:bg-green-950/40 border-green-300 dark:border-green-800 text-green-700 dark:text-green-400 font-extrabold'
                    : 'bg-base dark:bg-[#1C2233] border-line text-muted hover:border-line-strong'
                }`}
              >
                <span className={`w-4 h-4 border-2 rounded-sm flex items-center justify-center ${isPureVeg ? 'border-green-600 dark:border-green-400' : 'border-gray-400'}`}>
                  {isPureVeg && <span className="w-2 h-2 bg-green-600 dark:bg-green-400 rounded-xs" />}
                </span>
                <span>{t('restaurant.pureVeg', 'Pure Veg')}</span>
              </button>
            )}

            <div className="flex items-center gap-2 text-muted border border-line bg-base dark:bg-[#1C2233] rounded-2xl px-3.5 py-2.5 text-xs font-bold shadow-2xs">
              <ArrowUpDown className="w-4 h-4 text-muted flex-shrink-0" />
              <select
                value={activeSort}
                onChange={handleSortChange}
                className="bg-transparent outline-none border-none text-main dark:text-white cursor-pointer text-xs font-bold pr-1 w-full"
              >
                <option value="rating" className="bg-surface text-main dark:bg-[#141926] dark:text-white">{t('restaurant.sortRating', 'Sort by: Rating (High to Low)')}</option>
                <option value="deliveryTime" className="bg-surface text-main dark:bg-[#141926] dark:text-white">{t('restaurant.sortDeliveryTime', 'Sort by: Delivery Time')}</option>
                <option value="costAsc" className="bg-surface text-main dark:bg-[#141926] dark:text-white">{t('restaurant.sortPriceLowHigh', 'Sort by: Price (Low to High)')}</option>
                <option value="costDesc" className="bg-surface text-main dark:bg-[#141926] dark:text-white">{t('restaurant.sortPriceHighLow', 'Sort by: Price (High to Low)')}</option>
              </select>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          RESULTS DISPLAY SECTION
         ═══════════════════════════════════════════════════════════════════════ */}
      <section>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(null).map((_, i) => (
              <RestaurantCard key={i} isLoading={true} />
            ))}
          </div>
        ) : isGlobalSearch ? (
          /* ── GLOBAL SEARCH RESULTS VIEW ── */
          sortedDishes.length > 0 || (restaurants && restaurants.length > 0) ? (
            <div className="flex flex-col gap-8">

              {/* Grouped Service Sections when "All Services" is selected */}
              {groupedDishes && groupedDishes.length > 0 ? (
                groupedDishes.map((group) => (
                  <div key={group.key} className="flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-line pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{group.icon}</span>
                        <h2 className="font-display font-black text-base sm:text-lg text-main tracking-tight">
                          {group.title}
                        </h2>
                        <span className="text-xs font-bold text-muted bg-base px-2.5 py-0.5 rounded-full border border-line">
                          {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {group.items.map((dish) => renderDishCard(dish))}
                    </div>
                  </div>
                ))
              ) : (
                /* Flat Grid when a specific service tab is selected */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sortedDishes.map((dish) => renderDishCard(dish))}
                </div>
              )}

              {/* Matching Restaurants in Search (if Food service has matching restaurants) */}
              {restaurants && restaurants.length > 0 && (activeSearchTab === 'all' || activeSearchTab === 'food') && (
                <div className="flex flex-col gap-4 mt-4">
                  <div className="flex items-center gap-2 border-b border-line pb-2">
                    <Store className="w-5 h-5 text-primary" />
                    <h2 className="font-display font-black text-base sm:text-lg text-main tracking-tight">
                      Matching Restaurants
                    </h2>
                    <span className="text-xs font-bold text-muted bg-base px-2.5 py-0.5 rounded-full border border-line">
                      {restaurants.length} {restaurants.length === 1 ? 'restaurant' : 'restaurants'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {restaurants.map((restaurant) => (
                      <RestaurantCard key={restaurant._id} restaurant={restaurant} isLoading={false} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* No Results View for Global Search */
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <div className="w-16 h-16 rounded-full bg-violet-50 dark:bg-violet-950/40 text-primary flex items-center justify-center mb-2">
                <SlidersHorizontal className="w-8 h-8" />
              </div>
              <h3 className="font-display font-extrabold text-xl text-main">
                {t('restaurant.noItemsMatch', 'No items match your filters')}
              </h3>
              <p className="text-sm text-muted max-w-md leading-relaxed">
                We checked across all active services (Food, Grocery, Meat, Veg & Fruits, Bakery & Beverages) for "{searchQuery}".
              </p>
              <div className="flex items-center gap-3 mt-3">
                {isPureVeg && (
                  <button
                    onClick={() => setIsPureVeg(false)}
                    className="bg-base text-main border border-line font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer hover:border-line-strong"
                  >
                    Turn Off Pure Veg
                  </button>
                )}
                <button
                  onClick={handleClearSearch}
                  className="bg-primary text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md cursor-pointer hover:bg-primary-hover"
                >
                  Clear Search
                </button>
              </div>
            </div>
          )
        ) : activeDashboard === 'food' && selectedCuisine === 'All' ? (
          /* ── FOOD DASHBOARD BROWSING MODE (Default: Show Food Restaurants) ── */
          restaurants.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {restaurants.map((restaurant) => (
                <RestaurantCard key={restaurant._id} restaurant={restaurant} isLoading={false} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <div className="w-16 h-16 rounded-full bg-violet-50 dark:bg-violet-950/40 text-primary flex items-center justify-center mb-2">
                <SlidersHorizontal className="w-8 h-8" />
              </div>
              <h3 className="font-display font-extrabold text-xl text-main">{t('restaurant.noRestaurantsMatch', 'No restaurants match your filters')}</h3>
              <p className="text-sm text-muted max-w-xs">{t('restaurant.tryClearingFilters', 'Try clearing vegetarian checks or sorting filters to load results.')}</p>
              <button
                onClick={() => {
                  setSelectedCuisine('All');
                  setIsPureVeg(false);
                  setActiveSort('rating');
                  setSearchParams({});
                }}
                className="bg-primary text-white font-bold text-xs px-5 py-2.5 rounded-xl mt-3 shadow-md cursor-pointer hover:bg-primary-hover"
              >
                {t('restaurant.clearAllFilters', 'Clear All Filters')}
              </button>
            </div>
          )
        ) : activeDashboard !== 'food' ? (
          /* ── CATALOG STORE-GROUPED ITEMS VIEW (Grocery, Meat, Veg & Fruits, Bakery & Beverages) ── */
          storeGroups && storeGroups.length > 0 ? (
            <div className="flex flex-col gap-8">
              {storeGroups.map((group) => (
                <div key={group.id} className="flex flex-col gap-4">
                  {/* Store Header Banner */}
                  <div className="flex items-center justify-between bg-surface p-4 sm:p-5 rounded-3xl border border-line shadow-2xs">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                        <Store className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-display font-extrabold text-base sm:text-lg text-main truncate">
                            {group.name}
                          </h3>
                          {!group.isUnassigned && group.isActive && (
                            <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                              Verified Store
                            </span>
                          )}
                          {group.isUnassigned && (
                            <span className="bg-base text-muted text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-line">
                              Direct Catalog
                            </span>
                          )}
                        </div>
                        {group.address && (
                          <p className="text-xs text-muted font-medium flex items-center gap-1 mt-0.5 truncate">
                            <MapPin className="w-3.5 h-3.5 text-muted flex-shrink-0" />
                            <span className="truncate">{group.address}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-muted bg-base px-3 py-1.5 rounded-xl border border-line flex-shrink-0">
                      {group.items.length} {group.items.length === 1 ? 'Item' : 'Items'}
                    </span>
                  </div>

                  {/* Items Grid for this Store */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {group.items.map((dish) => renderDishCard(dish))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <div className="w-16 h-16 rounded-full bg-violet-50 dark:bg-violet-950/40 text-primary flex items-center justify-center mb-2">
                <SlidersHorizontal className="w-8 h-8" />
              </div>
              <h3 className="font-display font-extrabold text-xl text-main">{t('restaurant.noItemsMatch', 'No items match your filters')}</h3>
              <p className="text-sm text-muted max-w-xs">{t('restaurant.tryClearingFilters', 'Try clearing filters or selecting another category.')}</p>
              <button
                onClick={() => {
                  setSelectedCuisine('All');
                  setIsPureVeg(false);
                  setActiveSort('rating');
                  setSearchParams({ category: categoryParam });
                }}
                className="bg-primary text-white font-bold text-xs px-5 py-2.5 rounded-xl mt-3 shadow-md cursor-pointer hover:bg-primary-hover"
              >
                Clear All Filters
              </button>
            </div>
          )
        ) : (
          /* ── FOOD CUISINE ITEMS GRID ── */
          sortedDishes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedDishes.map((dish) => renderDishCard(dish))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <div className="w-16 h-16 rounded-full bg-violet-50 dark:bg-violet-950/40 text-primary flex items-center justify-center mb-2">
                <SlidersHorizontal className="w-8 h-8" />
              </div>
              <h3 className="font-display font-extrabold text-xl text-main">{t('restaurant.noItemsMatch', 'No items match your filters')}</h3>
              <p className="text-sm text-muted max-w-xs">{t('restaurant.tryClearingFilters', 'Try selecting another category.')}</p>
              <button
                onClick={() => {
                  setSelectedCuisine('All');
                  setIsPureVeg(false);
                  setActiveSort('rating');
                  setSearchParams({});
                }}
                className="bg-primary text-white font-bold text-xs px-5 py-2.5 rounded-xl mt-3 shadow-md cursor-pointer hover:bg-primary-hover"
              >
                Clear All Filters
              </button>
            </div>
          )
        )}
      </section>

      {/* Same restaurant conflict modal popup */}
      {conflictModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in backdrop-blur-xs">
          <div className="bg-surface rounded-2xl p-6 shadow-2xl max-w-sm w-full border border-line flex flex-col items-center text-center gap-4 animate-scale-up">
            <div className="w-12 h-12 rounded-full bg-violet-50 dark:bg-violet-950/40 text-primary flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display font-extrabold text-lg text-main">Clear Cart?</h3>
              <p className="text-xs text-muted mt-1 px-2 leading-relaxed">
                {conflictModal.message}
              </p>
            </div>
            <div className="flex items-center gap-3 w-full mt-2">
              <button
                onClick={() => setConflictModal({ isOpen: false, message: '', pendingItem: null, pendingRestaurant: null })}
                className="flex-grow bg-gray-100 dark:bg-gray-800 hover:skeleton text-main font-bold text-xs py-3 rounded-xl cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmConflictReset}
                className="flex-grow bg-primary hover:bg-primary-hover text-white font-bold text-xs py-3 rounded-xl cursor-pointer shadow-md transition-colors"
              >
                Clear & Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

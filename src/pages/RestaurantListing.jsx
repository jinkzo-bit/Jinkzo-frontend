import { API_BASE } from '../config/api';
import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, SlidersHorizontal, ArrowUpDown, AlertTriangle, Heart } from 'lucide-react';
import RestaurantCard from '../components/RestaurantCard';
import { useCartStore } from '../store/cartStore';
import { useFavoriteStore } from '../store/favoriteStore';

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

// ─── 2. COOL & HOT CATEGORIES (EXACT 12) ───
const coolHotCategories = [
  { name: 'Cool Cakes', image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=200&h=200&q=80' },
  { name: 'Cool Drinks', image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=200&h=200&q=80' },
  { name: 'Normal Cakes', image: 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=200&h=200&q=80' },
  { name: 'Puffs', image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=200&h=200&q=80' },
  { name: 'Mini Cakes', image: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=200&h=200&q=80' },
  { name: 'Plain Cake', image: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=200&h=200&q=80' },
  { name: 'Sweet Items', image: 'https://images.unsplash.com/photo-1599785209707-a456fc1337bb?auto=format&fit=crop&w=200&h=200&q=80' },
  { name: 'Bred Items', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=200&h=200&q=80' },
  { name: 'Milk Shakes', image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=200&h=200&q=80' },
  { name: 'Lassi', image: 'https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=200&h=200&q=80' },
  { name: 'Ice Creams', image: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?auto=format&fit=crop&w=200&h=200&q=80' },
  { name: 'Golisoda', image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=200&h=200&q=80' }
];

// ─── 3. GROCERY CATEGORIES ───
const groceryCategories = [
  { name: 'Atta & Rice', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=200&h=200&q=80' },
  { name: 'Cooking Oils', image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=200&h=200&q=80' },
  { name: 'Dairy & Eggs', image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=200&h=200&q=80' },
  { name: 'Snacks & Biscuits', image: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?auto=format&fit=crop&w=200&h=200&q=80' },
  { name: 'Masalas & Spices', image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=200&h=200&q=80' },
  { name: 'Beverages', image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=200&h=200&q=80' },
  { name: 'Cleaning & Home', image: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=200&h=200&q=80' }
];

// ─── 4. MEAT CATEGORIES ───
const meatCategories = [
  { name: 'Fresh Chicken', image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=200&h=200&q=80' },
  { name: 'Mutton & Lamb', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=200&h=200&q=80' },
  { name: 'Fresh Fish', image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=200&h=200&q=80' },
  { name: 'Prawns & Seafood', image: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=200&h=200&q=80' },
  { name: 'Farm Fresh Eggs', image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=200&h=200&q=80' },
  { name: 'Steaks & Chops', image: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&w=200&h=200&q=80' }
];

// ─── 5. VEG & FRUITS CATEGORIES ───
const vegFruitsCategories = [
  { name: 'Fresh Vegetables', image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=200&h=200&q=80' },
  { name: 'Fresh Fruits', image: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=200&h=200&q=80' },
  { name: 'Leafy Greens', image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=200&h=200&q=80' },
  { name: 'Organic Produce', image: 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?auto=format&fit=crop&w=200&h=200&q=80' },
  { name: 'Seasonal Fruits', image: 'https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=200&h=200&q=80' },
  { name: 'Herbs & Sprouts', image: 'https://images.unsplash.com/photo-1509358271058-acd22cc93898?auto=format&fit=crop&w=200&h=200&q=80' }
];

// ─── CURATED ITEMS FOR COOL & HOT DASHBOARD ───
const coolHotDataset = [
  { _id: 'ch_cc1', name: 'Black Forest Cool Cake (500g)', price: 380, isVeg: true, category: 'Cool Cakes', description: 'Fresh whipped cream, juicy cherries, and dark chocolate shavings.', image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=300&h=300&q=80', restaurant: { name: 'Jinkzo Bakery & Confectionery', _id: 'rest_b1' } },
  { _id: 'ch_cc2', name: 'Strawberry Cool Pastry', price: 95, isVeg: true, category: 'Cool Cakes', description: 'Chilled strawberry layered pastry with strawberry glaze.', image: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=300&h=300&q=80', restaurant: { name: 'Jinkzo Bakery & Confectionery', _id: 'rest_b1' } },
  { _id: 'ch_cd1', name: 'Classic Iced Cola', price: 50, isVeg: true, category: 'Cool Drinks', description: 'Refreshing sparkling iced cola with lemon slice.', image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=300&h=300&q=80', restaurant: { name: 'Cool Zone Cafe', _id: 'rest_c1' } },
  { _id: 'ch_cd2', name: 'Fresh Lime Soda (Sweet & Salt)', price: 45, isVeg: true, category: 'Cool Drinks', description: 'Freshly squeezed chilled lemon soda made to order.', image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=300&h=300&q=80', restaurant: { name: 'Cool Zone Cafe', _id: 'rest_c1' } },
  { _id: 'ch_nc1', name: 'Rich Fruit Plum Cake', price: 220, isVeg: true, category: 'Normal Cakes', description: 'Traditional baked fruit cake rich in raisins and nuts.', image: 'https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?auto=format&fit=crop&w=300&h=300&q=80', restaurant: { name: 'Sweet Treat Confectionery', _id: 'rest_b1' } },
  { _id: 'ch_nc2', name: 'Honey Almond Tea Cake', price: 180, isVeg: true, category: 'Normal Cakes', description: 'Freshly baked buttery cake infused with organic honey.', image: 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=300&h=300&q=80', restaurant: { name: 'Sweet Treat Confectionery', _id: 'rest_b1' } },
  { _id: 'ch_pf1', name: 'Crispy Veg Paneer Puff', price: 30, isVeg: true, category: 'Puffs', description: 'Golden flaky puff pastry stuffed with spicy paneer masala.', image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=300&h=300&q=80', restaurant: { name: 'Hot Oven Bakery', _id: 'rest_b2' } },
  { _id: 'ch_pf2', name: 'Crispy Egg Puff', price: 35, isVeg: false, category: 'Puffs', description: 'Flaky baked pastry filled with spiced roasted boiled egg.', image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=300&h=300&q=80', restaurant: { name: 'Hot Oven Bakery', _id: 'rest_b2' } },
  { _id: 'ch_mc1', name: 'Vanilla Cream Mini Cake (2 Pcs)', price: 80, isVeg: true, category: 'Mini Cakes', description: 'Bite-sized individual vanilla sponge cakes with frosting.', image: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=300&h=300&q=80', restaurant: { name: 'Jinkzo Bakery & Confectionery', _id: 'rest_b1' } },
  { _id: 'ch_mc2', name: 'Molten Choco Lava Cup', price: 75, isVeg: true, category: 'Mini Cakes', description: 'Warm chocolate cup cake with molten chocolate core.', image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=300&h=300&q=80', restaurant: { name: 'Jinkzo Bakery & Confectionery', _id: 'rest_b1' } },
  { _id: 'ch_pc1', name: 'Classic Vanilla Plain Cake (400g)', price: 140, isVeg: true, category: 'Plain Cake', description: 'Soft and airy traditional tea-time golden sponge cake.', image: 'https://images.unsplash.com/photo-1549576490-b0b4831ef60a?auto=format&fit=crop&w=300&h=300&q=80', restaurant: { name: 'Sweet Treat Confectionery', _id: 'rest_b1' } },
  { _id: 'ch_pc2', name: 'Tutti Frutti Plain Cake', price: 150, isVeg: true, category: 'Plain Cake', description: 'Classic bakery cake studded with colorful fruit candies.', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=300&h=300&q=80', restaurant: { name: 'Sweet Treat Confectionery', _id: 'rest_b1' } },
  { _id: 'ch_sw1', name: 'Special Kaju Katli (250g)', price: 280, isVeg: true, category: 'Sweet Items', description: 'Premium cashew fudge diamond sweets made with pure ghee.', image: 'https://images.unsplash.com/photo-1599785209707-a456fc1337bb?auto=format&fit=crop&w=300&h=300&q=80', restaurant: { name: 'Royal Sweets & Mithai', _id: 'rest_s1' } },
  { _id: 'ch_sw2', name: 'Hot Ghee Gulab Jamun (4 Pcs)', price: 90, isVeg: true, category: 'Sweet Items', description: 'Soft fried khoya dumplings soaked in saffron rose syrup.', image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=300&h=300&q=80', restaurant: { name: 'Royal Sweets & Mithai', _id: 'rest_s1' } },
  { _id: 'ch_br1', name: 'Fresh Milk Bread (400g)', price: 45, isVeg: true, category: 'Bred Items', description: 'Daily freshly baked soft sliced white milk bread.', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=300&h=300&q=80', restaurant: { name: 'Daily Fresh Bakery', _id: 'rest_b3' } },
  { _id: 'ch_br2', name: 'Soft Pav Buns (Pack of 6)', price: 35, isVeg: true, category: 'Bred Items', description: 'Super soft dinner rolls for pav bhaji and vada pav.', image: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?auto=format&fit=crop&w=300&h=300&q=80', restaurant: { name: 'Daily Fresh Bakery', _id: 'rest_b3' } },
  { _id: 'ch_ms1', name: 'Creamy Mango Milkshake', price: 110, isVeg: true, category: 'Milk Shakes', description: 'Real Alphonso mango pulp blended with rich vanilla ice cream.', image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=300&h=300&q=80', restaurant: { name: 'Cool Zone Cafe', _id: 'rest_c1' } },
  { _id: 'ch_ms2', name: 'Belgian Chocolate Milkshake', price: 130, isVeg: true, category: 'Milk Shakes', description: 'Decadent chocolate shake with choco chips and syrup.', image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=300&h=300&q=80', restaurant: { name: 'Cool Zone Cafe', _id: 'rest_c1' } },
  { _id: 'ch_ls1', name: 'Amritsari Kulhad Sweet Lassi', price: 80, isVeg: true, category: 'Lassi', description: 'Thick creamy churned yogurt lassi with cardamom in clay cup.', image: 'https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=300&h=300&q=80', restaurant: { name: 'Punjab Lassi House', _id: 'rest_l1' } },
  { _id: 'ch_ls2', name: 'Mango Kesari Lassi', price: 95, isVeg: true, category: 'Lassi', description: 'Rich curd blended with mango puree and saffron threads.', image: 'https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=300&h=300&q=80', restaurant: { name: 'Punjab Lassi House', _id: 'rest_l1' } },
  { _id: 'ch_ic1', name: 'Belgian Dark Chocolate Scoop', price: 90, isVeg: true, category: 'Ice Creams', description: 'Rich artisan chocolate ice cream made with real cocoa.', image: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?auto=format&fit=crop&w=300&h=300&q=80', restaurant: { name: 'Frosty Scoops Parlour', _id: 'rest_i1' } },
  { _id: 'ch_ic2', name: 'Alphonso Mango Real Fruit Ice Cream', price: 85, isVeg: true, category: 'Ice Creams', description: 'Creamy mango ice cream made with authentic fruit chunks.', image: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=300&h=300&q=80', restaurant: { name: 'Frosty Scoops Parlour', _id: 'rest_i1' } },
  { _id: 'ch_gs1', name: 'Original Paneer Goli Soda', price: 35, isVeg: true, category: 'Golisoda', description: 'Nostalgic sweet rose flavored sparkling marble bottle soda.', image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=300&h=300&q=80', restaurant: { name: 'Desi Goli Soda Corner', _id: 'rest_g1' } },
  { _id: 'ch_gs2', name: 'Masala Jeera Goli Soda', price: 35, isVeg: true, category: 'Golisoda', description: 'Spiced digestive cumin and lemon marble fizz soda.', image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=300&h=300&q=80', restaurant: { name: 'Desi Goli Soda Corner', _id: 'rest_g1' } }
];

// ─── CURATED ITEMS FOR GROCERY DASHBOARD ───
const groceryDataset = [
  { _id: 'gr_1', name: 'Aashirvaad Superior MP Sharbati Atta (5kg)', price: 275, isVeg: true, category: 'Atta & Rice', description: '100% whole wheat flour for soft Rotis.', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=300&h=300&q=80', restaurant: { name: 'Jinkzo Supermarket', _id: 'rest_groc' } },
  { _id: 'gr_2', name: 'Fortune Sunlite Refined Sunflower Oil (1L)', price: 145, isVeg: true, category: 'Cooking Oils', description: 'Light and healthy refined cooking oil enriched with vitamins.', image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=300&h=300&q=80', restaurant: { name: 'Jinkzo Supermarket', _id: 'rest_groc' } },
  { _id: 'gr_3', name: 'Amul Taaza Fresh Toned Milk (1L)', price: 56, isVeg: true, category: 'Dairy & Eggs', description: 'Homogenised toned milk packed with nutrition.', image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=300&h=300&q=80', restaurant: { name: 'Jinkzo Supermarket', _id: 'rest_groc' } },
  { _id: 'gr_4', name: 'Lay\'s Magic Masala Potato Chips (115g)', price: 40, isVeg: true, category: 'Snacks & Biscuits', description: 'Crunchy potato chips infused with exotic Indian spices.', image: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?auto=format&fit=crop&w=300&h=300&q=80', restaurant: { name: 'Jinkzo Supermarket', _id: 'rest_groc' } },
  { _id: 'gr_5', name: 'Tata Sampann Turmeric Powder (200g)', price: 65, isVeg: true, category: 'Masalas & Spices', description: 'Pure ground turmeric with natural curcumin.', image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=300&h=300&q=80', restaurant: { name: 'Jinkzo Supermarket', _id: 'rest_groc' } }
];

// ─── CURATED ITEMS FOR MEAT DASHBOARD ───
const meatDataset = [
  { _id: 'mt_1', name: 'Fresh Chicken Curry Cut (500g)', price: 160, isVeg: false, category: 'Fresh Chicken', description: 'Tender skinless bone-in chicken pieces cleaned and dressed.', image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=300&h=300&q=80', restaurant: { name: 'Jinkzo Fresh Meat Store', _id: 'rest_meat' } },
  { _id: 'mt_2', name: 'Chicken Boneless Breast Fillet (500g)', price: 210, isVeg: false, category: 'Fresh Chicken', description: 'Lean, high-protein tender cut breast fillets.', image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=300&h=300&q=80', restaurant: { name: 'Jinkzo Fresh Meat Store', _id: 'rest_meat' } },
  { _id: 'mt_3', name: 'Fresh Mutton Curry Cut (500g)', price: 440, isVeg: false, category: 'Mutton & Lamb', description: 'Tender goat meat cuts ideal for rich gravies.', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=300&h=300&q=80', restaurant: { name: 'Jinkzo Fresh Meat Store', _id: 'rest_meat' } },
  { _id: 'mt_4', name: 'Fresh Rohu Fish Steaks (500g)', price: 190, isVeg: false, category: 'Fresh Fish', description: 'Freshwater Rohu fish cut into neat steaks with center bone.', image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=300&h=300&q=80', restaurant: { name: 'Jinkzo Fresh Meat Store', _id: 'rest_meat' } },
  { _id: 'mt_5', name: 'Farm Fresh White Eggs (Pack of 12)', price: 84, isVeg: false, category: 'Farm Fresh Eggs', description: 'Hygienically sorted fresh poultry table eggs.', image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=300&h=300&q=80', restaurant: { name: 'Jinkzo Fresh Meat Store', _id: 'rest_meat' } }
];

// ─── CURATED ITEMS FOR VEG & FRUITS DASHBOARD ───
const vegFruitsDataset = [
  { _id: 'vf_1', name: 'Fresh Red Onions (1kg)', price: 35, isVeg: true, category: 'Fresh Vegetables', description: 'Farm fresh crisp pungent red onions.', image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=300&h=300&q=80', restaurant: { name: 'Jinkzo Fresh Veggies & Fruits', _id: 'rest_veg' } },
  { _id: 'vf_2', name: 'Hybrid Red Tomatoes (1kg)', price: 28, isVeg: true, category: 'Fresh Vegetables', description: 'Juicy firm red ripe tomatoes for cooking and salads.', image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=300&h=300&q=80', restaurant: { name: 'Jinkzo Fresh Veggies & Fruits', _id: 'rest_veg' } },
  { _id: 'vf_3', name: 'Fresh Shimla Apples (4 Pcs)', price: 140, isVeg: true, category: 'Fresh Fruits', description: 'Crisp, sweet, and aromatic mountain apples.', image: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=300&h=300&q=80', restaurant: { name: 'Jinkzo Fresh Veggies & Fruits', _id: 'rest_veg' } },
  { _id: 'vf_4', name: 'Robusta Golden Bananas (1kg)', price: 45, isVeg: true, category: 'Fresh Fruits', description: 'Naturally ripened energy-rich fresh bananas.', image: 'https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=300&h=300&q=80', restaurant: { name: 'Jinkzo Fresh Veggies & Fruits', _id: 'rest_veg' } },
  { _id: 'vf_5', name: 'Organic Fresh Spinach Palak (250g)', price: 20, isVeg: true, category: 'Leafy Greens', description: 'Cleaned tender green palak leaves rich in iron.', image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=300&h=300&q=80', restaurant: { name: 'Jinkzo Fresh Veggies & Fruits', _id: 'rest_veg' } }
];

export default function RestaurantListing() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [restaurants, setRestaurants] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Identify Active Dashboard
  const categoryParam = searchParams.get('category') || '';
  let activeDashboard = 'food';
  let defaultCategories = foodCategories;

  if (categoryParam === 'beverages' || categoryParam === 'hot_cool' || categoryParam === 'cool_hot') {
    activeDashboard = 'cool_hot';
    defaultCategories = coolHotCategories;
  } else if (categoryParam === 'grocery') {
    activeDashboard = 'grocery';
    defaultCategories = groceryCategories;
  } else if (categoryParam === 'meat') {
    activeDashboard = 'meat';
    defaultCategories = meatCategories;
  } else if (categoryParam === 'fruits-vegetables' || categoryParam === 'veg_fruits') {
    activeDashboard = 'veg_fruits';
    defaultCategories = vegFruitsCategories;
  }

  const [dynamicCategories, setDynamicCategories] = useState([]);

  // Fetch dynamic categories from Super Admin backend
  useEffect(() => {
    let isMounted = true;
    fetch(`${API_BASE}/api/categories?service=${activeDashboard}`)
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

  // States tied to filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedCuisine, setSelectedCuisine] = useState(searchParams.get('cuisine') || 'All');
  const [isPureVeg, setIsPureVeg] = useState(searchParams.get('veg') === 'true');
  const [activeSort, setActiveSort] = useState(searchParams.get('sort') || 'rating');

  // Zustand Cart Integration
  const cartItems = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);

  // Favourites Zustand Integration
  const isItemFavourite = useFavoriteStore((state) => state.isItemFavourite);
  const toggleItem = useFavoriteStore((state) => state.toggleItem);

  // Cart conflict modal state
  const [conflictModal, setConflictModal] = useState({ isOpen: false, message: '', pendingItem: null, pendingRestaurant: null });

  useEffect(() => {
    // Sync UI states with URL params if modified externally
    const paramSearch = searchParams.get('search') || '';
    setSearchQuery(paramSearch);
    setSelectedCuisine(searchParams.get('cuisine') || 'All');
    setIsPureVeg(searchParams.get('veg') === 'true');
    setActiveSort(searchParams.get('sort') || 'rating');
  }, [searchParams]);

  useEffect(() => {
    const fetchFilteredData = async () => {
      setIsLoading(true);
      try {
        if (activeDashboard === 'food') {
          // FOOD DASHBOARD: Fetch Food restaurants & dishes from Backend API
          const queryParams = new URLSearchParams();
          if (searchQuery) queryParams.set('search', searchQuery);
          if (selectedCuisine && selectedCuisine !== 'All') queryParams.set('cuisine', selectedCuisine);
          if (isPureVeg) queryParams.set('veg', 'true');

          if (selectedCuisine !== 'All') {
            const url = `${API_BASE}/restaurants/dishes/search?${queryParams.toString()}`;
            const res = await fetch(url);
            if (res.ok) {
              const data = await res.json();
              setDishes(Array.isArray(data) ? data : (data.dishes || data.data || []));
            } else {
              setDishes([]);
            }
            setRestaurants([]);
          } else {
            if (activeSort) queryParams.set('sort', activeSort);
            const url = `${API_BASE}/restaurants?${queryParams.toString()}`;
            const res = await fetch(url);
            if (res.ok) {
              const data = await res.json();
              setRestaurants(Array.isArray(data) ? data : (data.restaurants || data.data || []));
            } else {
              setRestaurants([]);
            }

            if (searchQuery) {
              const dishParams = new URLSearchParams();
              dishParams.set('search', searchQuery);
              if (isPureVeg) dishParams.set('veg', 'true');
              const dishesUrl = `${API_BASE}/restaurants/dishes/search?${dishParams.toString()}`;
              const dishesRes = await fetch(dishesUrl);
              if (dishesRes.ok) {
                const dishesData = await dishesRes.json();
                setDishes(Array.isArray(dishesData) ? dishesData : (dishesData.dishes || dishesData.data || []));
              } else {
                setDishes([]);
              }
            } else {
              setDishes([]);
            }
          }
        } else {
          // NON-FOOD DASHBOARDS: Isolated datasets (NO Food restaurants or food categories!)
          setRestaurants([]); // Strictly no Food hotel cards

          let dataset = [];
          if (activeDashboard === 'cool_hot') dataset = coolHotDataset;
          else if (activeDashboard === 'grocery') dataset = groceryDataset;
          else if (activeDashboard === 'meat') dataset = meatDataset;
          else if (activeDashboard === 'veg_fruits') dataset = vegFruitsDataset;

          let filtered = [...dataset];

          // 1. Filter by Selected Category
          if (selectedCuisine && selectedCuisine !== 'All') {
            filtered = filtered.filter(item =>
              item.category?.toLowerCase() === selectedCuisine.toLowerCase() ||
              item.name?.toLowerCase().includes(selectedCuisine.toLowerCase())
            );
          }

          // 2. Filter by Search Query
          if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(item =>
              item.name?.toLowerCase().includes(q) ||
              item.category?.toLowerCase().includes(q) ||
              item.description?.toLowerCase().includes(q)
            );
          }

          // 3. Filter by Pure Veg
          if (isPureVeg) {
            filtered = filtered.filter(item => item.isVeg === true);
          }

          // 4. Sort
          if (activeSort === 'costAsc') {
            filtered.sort((a, b) => a.price - b.price);
          } else if (activeSort === 'costDesc') {
            filtered.sort((a, b) => b.price - a.price);
          }

          setDishes(filtered);
        }
      } catch (err) {
        console.error('Fetch filtering data error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFilteredData();
  }, [activeDashboard, searchQuery, selectedCuisine, isPureVeg, activeSort]);

  // Sync state and search params
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

  // Add Item to cart with same-restaurant check
  const handleAddToCart = (dish) => {
    const result = addItem(dish, dish.restaurant || { name: 'Jinkzo Store', _id: 'rest_default' });
    if (result && result.conflict) {
      setConflictModal({
        isOpen: true,
        message: result.message,
        pendingItem: dish,
        pendingRestaurant: dish.restaurant
      });
    }
  };

  const confirmConflictReset = () => {
    clearCart();
    addItem(conflictModal.pendingItem, conflictModal.pendingRestaurant);
    setConflictModal({ isOpen: false, message: '', pendingItem: null, pendingRestaurant: null });
  };

  const getItemQuantity = (itemId) => {
    const matched = cartItems.find((i) => String(i.menuItemId) === String(itemId));
    return matched ? matched.quantity : 0;
  };

  const getSortedDishes = () => {
    if (!Array.isArray(dishes)) return [];
    const sorted = [...dishes];
    if (activeSort === 'costAsc') {
      sorted.sort((a, b) => a.price - b.price);
    } else if (activeSort === 'costDesc') {
      sorted.sort((a, b) => b.price - a.price);
    } else if (activeSort === 'rating') {
      sorted.sort((a, b) => (b.restaurant?.rating || 0) - (a.restaurant?.rating || 0));
    } else if (activeSort === 'deliveryTime') {
      sorted.sort((a, b) => (a.restaurant?.deliveryTime || 0) - (b.restaurant?.deliveryTime || 0));
    }
    return sorted;
  };

  return (
    <div className="flex flex-col gap-6 pb-24 max-w-7xl mx-auto px-4 md:px-8 w-full animate-fade-in transition-colors duration-300">

      {/* ─── "WHAT'S ON YOUR MIND?" + PURE VEG & SORT SECTION ─── */}
      <section className="bg-surface rounded-3xl p-5 sm:p-6 shadow-2xs border border-line flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition-colors">

        {/* Left / Main Section: Title + Circular Categories */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-black text-lg sm:text-xl text-main tracking-tight">
              What's on your mind?
            </h2>
            {selectedCuisine !== 'All' && (
              <button
                onClick={() => handleCuisineClick('All')}
                className="text-xs font-bold text-primary hover:underline cursor-pointer"
              >
                Reset Filter
              </button>
            )}
          </div>

          {/* Circular Food / Drinks / Items Row */}
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
                      src={cat.image}
                      alt={cat.name}
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

        {/* Right Section: Vertically Stacked Controls (Pure Veg + Sort by) */}
        <div className="flex flex-row lg:flex-col items-stretch justify-end gap-3 flex-shrink-0 pt-3 lg:pt-0 lg:pl-6 border-t lg:border-t-0 lg:border-l border-line">

          {/* Pure Veg Toggle */}
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
            <span>Pure Veg</span>
          </button>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 text-muted border border-line bg-base dark:bg-[#1C2233] rounded-2xl px-3.5 py-2.5 text-xs font-bold shadow-2xs">
            <ArrowUpDown className="w-4 h-4 text-muted flex-shrink-0" />
            <select
              value={activeSort}
              onChange={handleSortChange}
              className="bg-transparent outline-none border-none text-main dark:text-white cursor-pointer text-xs font-bold pr-1 w-full"
            >
              <option value="rating" className="bg-surface text-main dark:bg-[#141926] dark:text-white">Sort by: Rating (High to Low)</option>
              <option value="deliveryTime" className="bg-surface text-main dark:bg-[#141926] dark:text-white">Sort by: Delivery Time</option>
              <option value="costAsc" className="bg-surface text-main dark:bg-[#141926] dark:text-white">Sort by: Price (Low to High)</option>
              <option value="costDesc" className="bg-surface text-main dark:bg-[#141926] dark:text-white">Sort by: Price (High to Low)</option>
            </select>
          </div>

        </div>
      </section>

      {/* ─── RESTAURANTS & DISHES GRID SECTION ─── */}
      <section>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(null).map((_, i) => (
              <RestaurantCard key={i} isLoading={true} />
            ))}
          </div>
        ) : activeDashboard === 'food' && selectedCuisine === 'All' && !searchQuery ? (
          /* Food Dashboard default mode: Show all Food Restaurants */
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
              <h3 className="font-display font-extrabold text-xl text-main">No restaurants match your filters</h3>
              <p className="text-sm text-muted max-w-xs">Try clearing vegetarian checks or sorting filters to load results.</p>
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
        ) : (
          /* Dishes / Products Grid (For Cool & Hot, Grocery, Meat, Veg & Fruits, or Food Cuisines) */
          getSortedDishes().length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {getSortedDishes().map((dish) => {
                const quantity = getItemQuantity(dish._id);
                const isRestClosed = dish.restaurant?.isClosed;
                const isItemUnavailable = dish.isAvailable === false;
                const isDisabled = isRestClosed || isItemUnavailable;
                const isFav = isItemFavourite(dish._id);

                return (
                  <div
                    key={dish._id}
                    className={`bg-surface rounded-3xl p-4 shadow-2xs border border-line flex flex-col justify-between gap-4 transition-all hover:shadow-md hover:scale-[1.01] duration-300 animate-fade-in ${isDisabled ? 'opacity-75' : ''}`}
                  >
                    <div className="flex gap-4">
                      {/* Image */}
                      <div className="relative w-24 h-24 md:w-28 md:h-28 flex-shrink-0">
                        {isRestClosed && (
                          <div className="absolute inset-0 bg-black/55 backdrop-blur-3xs rounded-2xl flex items-center justify-center z-10">
                            <span className="bg-red-600 text-white text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md shadow-xs">
                              Temporarily Closed
                            </span>
                          </div>
                        )}
                        {!isRestClosed && isItemUnavailable && (
                          <div className="absolute inset-0 bg-black/55 backdrop-blur-3xs rounded-2xl flex items-center justify-center z-10">
                            <span className="bg-gray-700 text-white text-[8px] font-black uppercase tracking-wider px-1.5 py-1 rounded-md shadow-xs">
                              Out of Stock
                            </span>
                          </div>
                        )}
                        <img
                          src={dish.image}
                          alt={dish.name}
                          className="w-full h-full object-cover rounded-2xl bg-base border border-line shadow-2xs"
                          loading="lazy"
                        />
                        {/* Veg Badge */}
                        <span className={`absolute top-2 left-2 w-4 h-4 rounded-xs border-2 bg-surface flex items-center justify-center p-0.5 shadow-sm ${dish.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${dish.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
                        </span>

                        {/* Heart Button */}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleItem(dish);
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 dark:bg-[#141926]/90 shadow-sm border border-gray-100 dark:border-white/10 hover:scale-110 active:scale-95 transition-all cursor-pointer z-10"
                          title={isFav ? 'Remove from Favourites' : 'Add to Favourites'}
                        >
                          <Heart className={`w-3.5 h-3.5 transition-colors ${
                            isFav
                              ? 'text-[#7C3AED] fill-[#7C3AED]'
                              : 'text-gray-400 hover:text-[#7C3AED]'
                          }`} />
                        </button>
                      </div>

                      {/* Dish Info */}
                      <div className="flex flex-col gap-1 flex-grow justify-between py-1">
                        <div>
                          <h3 className="font-display font-extrabold text-sm text-main line-clamp-1">
                            {dish.name}
                          </h3>
                          <p className="text-xs text-muted font-medium line-clamp-2 mt-0.5">
                            {dish.description || 'Fresh and delicious prepared item.'}
                          </p>
                        </div>

                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm font-black text-main">₹{dish.price}</span>
                          {dish.category && (
                            <span className="text-[10px] font-bold text-muted bg-base px-2 py-0.5 rounded-lg border border-line">
                              {dish.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Sold by & Add to Cart button */}
                    <div className="border-t border-line pt-3 mt-1 flex justify-between items-center">
                      <div className="flex flex-col gap-0.5 max-w-[60%]">
                        <span className="text-[10px] text-muted font-bold uppercase tracking-wider">Sold by</span>
                        <span className="text-xs font-bold text-main truncate">
                          {dish.restaurant?.name || 'Jinkzo Verified Store'}
                        </span>
                      </div>

                      {isDisabled ? (
                        <div className="bg-gray-100 dark:bg-gray-800 border border-line-strong rounded-xl flex items-center justify-center px-3 h-9 flex-shrink-0">
                          <span className="text-[9px] font-black text-muted uppercase tracking-wider">
                            {isRestClosed ? 'Closed' : 'Unavailable'}
                          </span>
                        </div>
                      ) : (
                        <div className="bg-surface border border-gray-150 dark:border-white/10 shadow-xs rounded-xl flex items-center justify-between w-24 overflow-hidden h-9 flex-shrink-0">
                          {quantity > 0 ? (
                            <>
                              <button
                                onClick={() => removeItem(dish._id)}
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
                              Add
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Empty Products View */
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <div className="w-16 h-16 rounded-full bg-violet-50 dark:bg-violet-950/40 text-primary flex items-center justify-center mb-2">
                <SlidersHorizontal className="w-8 h-8" />
              </div>
              <h3 className="font-display font-extrabold text-xl text-main">No items match your filters</h3>
              <p className="text-sm text-muted max-w-xs">Try clearing vegetarian checks or selecting another category.</p>
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

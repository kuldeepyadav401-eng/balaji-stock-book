'use client';

import React, { useState, useMemo } from 'react';
import { Search, Plus, Minus, ShoppingCart, FileText, Upload, CheckCircle2 } from 'lucide-react';

interface InventoryItem {
  id: string;
  skuCode: string;
  name: string;
  category: string;
  hsn: string;
  ordersBefore: number;
  stock: number;
  reorderAt: number;
  price: number;
  supplier: string;
}

const INITIAL_ITEMS: InventoryItem[] = [
  {
    id: '1',
    skuCode: '19735729',
    name: 'PARLE G GOLD 68 756',
    category: 'Biscuits & Cookies',
    hsn: '19059020',
    ordersBefore: 1,
    stock: 0,
    reorderAt: 24,
    price: 8.33,
    supplier: 'LOTS Wholesale',
  },
  {
    id: '2',
    skuCode: '31',
    name: 'GODREJ NO 1 LIVE AND ALOE SOAP 43 G PK4',
    category: 'Soap',
    hsn: '340111',
    ordersBefore: 1,
    stock: 0,
    reorderAt: 2,
    price: 35.46,
    supplier: 'LOTS Wholesale',
  },
  {
    id: '3',
    skuCode: '3930° 2828',
    name: 'ALPENLIEBE JUZT JELLY STRAWBERRY 40 U PO',
    category: 'Snacks & Candy',
    hsn: '170490',
    ordersBefore: 1,
    stock: 0,
    reorderAt: 5,
    price: 48.18,
    supplier: 'LOTS Wholesale',
  },
];

const CATEGORIES = [
  'All',
  'Soap (39)',
  'Detergent & Cleaning (21)',
  'Oral Care (13)',
  'Shampoo & Hair (3)',
  'Biscuits & Cookies (22)',
  'Snacks & Candy',
];

export default function BalajiStockBook() {
  const [items, setItems] = useState<InventoryItem[]>(INITIAL_ITEMS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeTab, setActiveTab] = useState<'inventory' | 'orderList' | 'history' | 'upload'>('inventory');
  
  // Upload State
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const handleStockChange = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newStock = Math.max(0, item.stock + delta);
          return { ...item, stock: newStock };
        }
        return item;
      })
    );
  };

  // Handle simulated Excel / Bill Upload & parsing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus(`Processing ${file.name}...`);
    
    setTimeout(() => {
      // Mocking newly imported items from bill/excel
      const newItem: InventoryItem = {
        id: Date.now().toString(),
        skuCode: 'NEW-' + Math.floor(Math.random() * 1000),
        name: file.name.toUpperCase().replace(/\.[^/.]+$/, ''),
        category: 'Biscuits & Cookies',
        hsn: '190590',
        ordersBefore: 1,
        stock: 50,
        reorderAt: 10,
        price: 120.00,
        supplier: 'New Bill Supplier',
      };

      setItems([newItem, ...items]);
      setUploadStatus(`Successfully imported bill/items from ${file.name}!`);
      setTimeout(() => setUploadStatus(null), 4000);
    }, 1200);
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.skuCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.hsn.includes(searchQuery);

      const matchesCategory =
        selectedCategory === 'All' || item.category.toLowerCase().includes(selectedCategory.split(' ')[0].toLowerCase());

      return matchesSearch && matchesCategory;
    });
  }, [items, searchQuery, selectedCategory]);

  return (
    <div className="min-h-screen bg-[#0f1115] text-gray-100 font-sans antialiased selection:bg-amber-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#12151c] px-6 py-4 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-amber-600 text-white font-black px-3.5 py-2 rounded-xl text-lg tracking-wider shadow">
              BJ
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Bala Ji Stock Book
              </h1>
              <p className="text-xs text-gray-400">
                Inventory & supplier ordering · seeded from LOTS Wholesale purchase history
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex bg-[#181c25] p-1.5 rounded-2xl border border-gray-800 w-full md:w-auto shadow-inner flex-wrap gap-1">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition ${
                activeTab === 'inventory' ? 'bg-[#232936] text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              Inventory
            </button>
            <button
              onClick={() => setActiveTab('orderList')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition ${
                activeTab === 'orderList' ? 'bg-[#232936] text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              Order List
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition flex items-center gap-1.5 ${
                activeTab === 'upload' ? 'bg-amber-600 text-white shadow-md' : 'text-amber-400 hover:bg-amber-950/30'
              }`}
            >
              <Upload className="h-3.5 w-3.5" /> Upload Bill / Excel
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition ${
                activeTab === 'history' ? 'bg-[#232936] text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              History
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {activeTab === 'inventory' ? (
          <>
            {/* Search Bar */}
            <div className="relative mb-6">
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search items by name or HSN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#151821] border border-gray-800 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gray-600 transition shadow-inner"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2.5 overflow-x-auto pb-4 mb-6 scrollbar-none">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold transition border ${
                    selectedCategory === cat
                      ? 'bg-gray-100 text-gray-900 border-gray-100 shadow'
                      : 'bg-[#151821] text-gray-400 border-gray-800 hover:border-gray-700 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Action Bar */}
            <div className="flex justify-between items-center bg-[#151821] border border-gray-800/80 px-5 py-3.5 rounded-2xl mb-6 shadow-sm">
              <button 
                onClick={() => setActiveTab('upload')}
                className="flex items-center gap-2 text-xs font-semibold text-amber-400 hover:text-amber-300 transition"
              >
                <Plus className="h-4 w-4" /> Upload New Bill / Excel to Add Items
              </button>
              <button className="bg-[#1c212c] border border-gray-700/60 text-gray-300 px-4 py-2 rounded-xl text-xs font-medium hover:bg-[#232936] transition shadow-sm">
                Suppliers
              </button>
            </div>

            {/* Item List */}
            <div className="space-y-4">
              {filteredItems.map((item) => {
                const isOutOfStock = item.stock === 0;
                return (
                  <div
                    key={item.id}
                    className="bg-[#151821] border border-gray-800/80 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-md hover:border-gray-700 transition"
                  >
                    {/* Left Details */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-sm md:text-base text-white tracking-wide">
                          {item.skuCode} {item.name}
                        </h3>
                        {isOutOfStock && (
                          <span className="bg-[#3b1c1c] text-[#f87171] border border-[#5c2727] text-[10px] font-bold px-2 py-0.5 rounded-md tracking-wider uppercase">
                            Out of Stock
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        Other / General · HSN {item.hsn} · ordered {item.ordersBefore}x before · {item.supplier}
                      </p>

                      <div className="flex items-center gap-4 pt-2">
                        <div className="bg-[#1c212c] border border-gray-800 rounded-xl p-1 flex items-center gap-2 shadow-inner">
                          <button
                            onClick={() => handleStockChange(item.id, -1)}
                            className="bg-[#262c3a] hover:bg-[#31394a] text-white p-1.5 rounded-lg transition"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-8 text-center font-bold text-xs">{item.stock}</span>
                          <button
                            onClick={() => handleStockChange(item.id, 1)}
                            className="bg-[#262c3a] hover:bg-[#31394a] text-white p-1.5 rounded-lg transition"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="text-xs text-gray-500 font-medium">Reorder at {item.reorderAt}</span>
                      </div>
                    </div>

                    {/* Right Price & Actions */}
                    <div className="flex items-center justify-between w-full md:w-auto gap-6 border-t md:border-t-0 pt-4 md:pt-0 border-gray-800">
                      <div className="text-left md:text-right">
                        <div className="text-lg font-black text-white">₹{item.price}</div>
                        <div className="text-[11px] text-gray-500">{item.supplier}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button className="bg-[#1c212c] hover:bg-[#262c3a] border border-gray-700/60 text-gray-300 px-4 py-2 rounded-xl text-xs font-semibold transition shadow-sm">
                          Compare
                        </button>
                        <button className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1">
                          + Order
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : activeTab === 'upload' ? (
          <div className="max-w-2xl mx-auto py-12 px-6 bg-[#151821] border border-gray-800 rounded-3xl shadow-xl text-center">
            <div className="bg-amber-600/10 border border-amber-600/30 p-4 rounded-2xl w-16 h-16 flex items-center justify-center mx-auto mb-4 text-amber-500">
              <Upload className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Upload Excel Spreadsheet or New Bill</h2>
            <p className="text-xs text-gray-400 mb-8 max-w-md mx-auto">
              Upload your wholesale bills (Excel `.xlsx`, `.csv`, or scanned bill images) to automatically parse items, update stock levels, and add new products to your inventory.
            </p>

            <label className="border-2 border-dashed border-gray-700 hover:border-amber-500 bg-[#1c212c]/50 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition group">
              <FileText className="h-10 w-10 text-gray-500 group-hover:text-amber-500 mb-3 transition" />
              <span className="text-sm font-semibold text-gray-200">Click to browse or drag & drop files here</span>
              <span className="text-[11px] text-gray-500 mt-1">Supports CSV, Excel (.xlsx), or PDF Bills</span>
              <input type="file" accept=".csv, .xlsx, .xls, .pdf, image/*" onChange={handleFileUpload} className="hidden" />
            </label>

            {uploadStatus && (
              <div className="mt-6 p-4 bg-amber-950/40 border border-amber-800/60 rounded-xl text-amber-300 text-xs flex items-center justify-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {uploadStatus}
              </div>
            )}
          </div>
        ) : activeTab === 'orderList' ? (
          <div className="text-center py-20 bg-[#151821] border border-gray-800 rounded-2xl shadow-inner">
            <ShoppingCart className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-white">Your Order List is Empty</h2>
            <p className="text-xs text-gray-400 mt-1">Add items that need reordering directly from the inventory tab.</p>
          </div>
        ) : (
          <div className="text-center py-20 bg-[#151821] border border-gray-800 rounded-2xl shadow-inner">
            <FileText className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-white">No Purchase History Yet</h2>
            <p className="text-xs text-gray-400 mt-1">Previous wholesale imports and transactions will show up here.</p>
          </div>
        )}
      </main>
    </div>
  );
}

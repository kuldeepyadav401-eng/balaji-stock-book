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
    stock: 4,
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
  {
    id: '4',
    skuCode: '77',
    name: 'SANTOOR SANDAL & TURMERIC SOAP 125 G PK4',
    category: 'Soap',
    hsn: '34011190',
    ordersBefore: 1,
    stock: 0,
    reorderAt: 2,
    price: 173.47,
    supplier: 'LOTS Wholesale',
  },
  {
    id: '5',
    skuCode: 'ACT II',
    name: 'ACT II IPC CHILLI SURPRISE 40 G',
    category: 'Snacks & Candy',
    hsn: '20081990',
    ordersBefore: 1,
    stock: 0,
    reorderAt: 18,
    price: 8.8,
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus(`Processing ${file.name}...`);
    
    setTimeout(() => {
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
      <header className="border-b border-gray-800 bg-[#161920] px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-amber-600 text-white font-black px-3.5 py-2 rounded-lg text-lg tracking-wider shadow">
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
          <div className="flex bg-[#1f242d] p-1 rounded-xl border border-gray-800 w-full md:w-auto flex-wrap gap-1">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex-1 md:flex-none px-5 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === 'inventory' ? 'bg-[#2b313b] text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              Inventory
            </button>
            <button
              onClick={() => setActiveTab('orderList')}
              className={`flex-1 md:flex-none px-5 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === 'orderList' ? 'bg-[#2b313b] text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              Order List
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 md:flex-none px-5 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-1.5 ${
                activeTab === 'upload' ? 'bg-amber-600 text-white shadow' : 'text-amber-400 hover:bg-amber-950/40'
              }`}
            >
              <Upload className="h-4 w-4" /> Upload Bill / Excel
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 md:flex-none px-5 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === 'history' ? 'bg-[#2b313b] text-white shadow' : 'text-gray-400 hover:text-white'
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
                className="w-full bg-[#161920] border border-gray-800 rounded-xl pl-12 pr-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-600 transition shadow-inner"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold transition border ${
                    selectedCategory === cat
                      ? 'bg-gray-100 text-gray-900 border-gray-100 shadow'
                      : 'bg-[#161920] text-gray-400 border-gray-800 hover:border-gray-700 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Action Bar */}
            <div className="flex justify-between items-center bg-[#161920] border border-gray-800 p-4 rounded-xl mb-6 shadow-sm">
              <button 
                onClick={() => setActiveTab('upload')}
                className="flex items-center gap-2 text-sm font-semibold text-amber-500 hover:text-amber-400 transition"
              >
                <Plus className="h-4 w-4" /> Upload New Bill / Excel to Add Items
              </button>
              <button className="bg-[#1f242d] border border-gray-700 text-gray-300 px-4 py-2 rounded-lg text-xs font-medium hover:bg-gray-800 transition">
                Suppliers
              </button>
            </div>

            {/* Item List */}
            <div className="space-y-4">
              {filteredItems.map((item) => {
                const isOutOfStock = item.stock === 0;
                const isLowStock = item.stock > 0 && item.stock <= item.reorderAt;
                return (
                  <div
                    key={item.id}
                    className="bg-[#161920] border border-gray-800 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-md hover:border-gray-700 transition"
                  >
                    {/* Left Details */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-base text-white tracking-wide">
                          {item.skuCode} {item.name}
                        </h3>
                        {isOutOfStock ? (
                          <span className="bg-red-950/80 text-red-400 border border-red-900/50 text-[10px] font-bold px-2 py-0.5 rounded tracking-wider uppercase">
                            Out of Stock
                          </span>
                        ) : isLowStock ? (
                          <span className="bg-amber-950/80 text-amber-400 border border-amber-900/50 text-[10px] font-bold px-2 py-0.5 rounded tracking-wider uppercase">
                            Low Stock
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-gray-400">
                        Other / General · HSN {item.hsn} · ordered {item.ordersBefore}x before
                      </p>

                      <div className="flex items-center gap-4 pt-3">
                        <div className="bg-[#1f242d] border border-gray-800 rounded-xl p-1.5 flex items-center gap-2">
                          <button
                            onClick={() => handleStockChange(item.id, -1)}
                            className="bg-gray-800 hover:bg-gray-700 text-white p-1.5 rounded-lg transition"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-8 text-center font-bold text-sm">{item.stock}</span>
                          <button
                            onClick={() => handleStockChange(item.id, 1)}
                            className="bg-gray-800 hover:bg-gray-700 text-white p-1.5 rounded-lg transition"
                          >
                            <Plus className="h-3.5 w-3.5" />
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
                        <button className="bg-[#1f242d] hover:bg-gray-800 border border-gray-700 text-gray-300 px-3.5 py-2 rounded-xl text-xs font-semibold transition">
                          Compare
                        </button>
                        <button className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow transition flex items-center gap-1.5">
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
          <div className="max-w-xl mx-auto py-12 px-6 bg-[#161920] border border-gray-800 rounded-3xl shadow-xl text-center">
            <div className="bg-amber-600/10 border border-amber-600/30 p-4 rounded-2xl w-16 h-16 flex items-center justify-center mx-auto mb-4 text-amber-500">
              <Upload className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Upload Excel Spreadsheet or New Bill</h2>
            <p className="text-xs text-gray-400 mb-8">
              Upload your wholesale bills or inventory spreadsheets (.xlsx, .csv) to automatically parse items and add them to your stock list.
            </p>

            <label className="border-2 border-dashed border-gray-700 hover:border-amber-500 bg-[#1f242d]/50 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition group">
              <FileText className="h-10 w-10 text-gray-500 group-weight group-hover:text-amber-500 mb-3 transition" />
              <span className="text-sm font-semibold text-gray-200">Click to browse or drag & drop files here</span>
              <span className="text-[11px] text-gray-500 mt-1">Supports CSV, Excel (.xlsx), or PDF Bills</span>
              <input type="file" accept=".csv, .xlsx, .xls, .pdf, image/*" onChange={handleFileUpload} className="hidden" />
            </label>

            {uploadStatus && (
              <div className="mt-6 p-4 bg-amber-950/50 border border-amber-800 rounded-xl text-amber-300 text-xs flex items-center justify-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {uploadStatus}
              </div>
            )}
          </div>
        ) : activeTab === 'orderList' ? (
          <div className="text-center py-20 bg-[#161920] border border-gray-800 rounded-2xl">
            <ShoppingCart className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-white">Your Order List is Empty</h2>
            <p className="text-xs text-gray-400 mt-1">Add items that need reordering directly from the inventory tab.</p>
          </div>
        ) : (
          <div className="text-center py-20 bg-[#161920] border border-gray-800 rounded-2xl">
            <FileText className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-white">No Purchase History Yet</h2>
            <p className="text-xs text-gray-400 mt-1">Previous wholesale imports and transactions will show up here.</p>
          </div>
        )}
      </main>
    </div>
  );
}

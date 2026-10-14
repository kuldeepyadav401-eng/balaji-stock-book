"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { CATEGORIES, CartItem, Item, Order, Supplier } from "@/lib/types";
import * as XLSX from "xlsx";

type Tab = "inventory" | "cart" | "upload" | "suppliers" | "history";

function money(n: number) {
  n = Number(n) || 0;
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function statusFor(it: Item) {
  const stock = Number(it.stock) || 0;
  const rl = Number(it.reorder_level) || 0;
  if (stock <= 0) return { cls: "danger", label: "Out of stock" };
  if (stock <= rl) return { cls: "warn", label: "Low stock" };
  return { cls: "ok", label: "In stock" };
}

function bestRate(it: Item, suppliers: Supplier[]) {
  const supplierMap: Record<string, Supplier> = {};
  suppliers.forEach((s) => (supplierMap[s.id] = s));
  const rates = it.supplier_rates || {};
  let bestId: string | null = null;
  let bestVal = Infinity;
  let comparedCount = 0;
  Object.keys(rates).forEach((sid) => {
    if (!supplierMap[sid]) return;
    const r = rates[sid]?.rate;
    if (typeof r === "number" && r > 0) {
      comparedCount++;
      if (r < bestVal) {
        bestVal = r;
        bestId = sid;
      }
    }
  });
  if (bestId) {
    return {
      rate: bestVal,
      supplierId: bestId,
      supplierName: supplierMap[bestId].name,
      comparedCount,
    };
  }
  return { rate: Number(it.rate) || 0, supplierId: null, supplierName: null, comparedCount: 0 };
}

export default function Page() {
  const [items, setItems] = useState<Item[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [itemsLoaded, setItemsLoaded] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>("inventory");
  const [activeCat, setActiveCat] = useState("__all");
  const [searchTerm, setSearchTerm] = useState("");
  const [openOrderIds, setOpenOrderIds] = useState<Set<string>>(new Set());

  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 1800);
  }

  const addDialogRef = useRef<HTMLDialogElement>(null);
  const rateDialogRef = useRef<HTMLDialogElement>(null);
  const supplierDialogRef = useRef<HTMLDialogElement>(null);

  const [addForm, setAddForm] = useState({
    name: "",
    hsn: "",
    category: CATEGORIES[0],
    rate: "",
    stock: "0",
    reorder: "3",
  });

  const [rateDialogItemId, setRateDialogItemId] = useState<string | null>(null);
  const [rateDialogState, setRateDialogState] = useState<Record<string, string>>({});
  const [rateNewSupplier, setRateNewSupplier] = useState("");

  const [supplierNewName, setSupplierNewName] = useState("");
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) {
      setItemsLoaded(true);
      return;
    }

    let cancelled = false;

    async function fetchItems() {
      const { data } = await supabase.from("items").select("*");
      if (!cancelled) {
        setItems((data as Item[]) || []);
        setItemsLoaded(true);
      }
    }
    async function fetchSuppliers() {
      const { data } = await supabase.from("suppliers").select("*");
      if (!cancelled) setSuppliers((data as Supplier[]) || []);
    }
    async function fetchCart() {
      const { data } = await supabase.from("cart").select("*").eq("id", "current").maybeSingle();
      if (!cancelled) setCart((data?.items as CartItem[]) || []);
    }
    async function fetchOrders() {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .order("placed_at", { ascending: false })
        .limit(50);
      if (!cancelled) setOrders((data as unknown as Order[]) || []);
    }

    fetchItems();
    fetchSuppliers();
    fetchCart();
    fetchOrders();

    const channel = supabase
      .channel("balaji-stock-book-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "items" }, fetchItems)
      .on("postgres_changes", { event: "*", schema: "public", table: "suppliers" }, fetchSuppliers)
      .on("postgres_changes", { event: "*", schema: "public", table: "cart" }, fetchCart)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, fetchOrders)
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const catCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((it) => (counts[it.category] = (counts[it.category] || 0) + 1));
    return counts;
  }, [items]);
  const presentCats = CATEGORIES.filter((c) => catCounts[c]);

  const visibleItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let rows = items.filter((it) => {
      if (activeCat !== "__all" && it.category !== activeCat) return false;
      if (term && !(it.name.toLowerCase().includes(term) || (it.hsn || "").includes(term))) return false;
      return true;
    });
    rows.sort((a, b) => a.name.localeCompare(b.name));
    return rows;
  }, [items, activeCat, searchTerm]);

  async function commitStock(it: Item, val: number) {
    setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, stock: val } : x)));
    if (!supabaseConfigured) return;
    const { error } = await supabase
      .from("items")
      .update({ stock: val, updated_at: new Date().toISOString() })
      .eq("id", it.id);
    if (error) showToast("Could not save stock — try again");
  }

  async function commitReorder(it: Item, val: number) {
    setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, reorder_level: val } : x)));
    if (!supabaseConfigured) return;
    const { error } = await supabase
      .from("items")
      .update({ reorder_level: val, updated_at: new Date().toISOString() })
      .eq("id", it.id);
    if (error) showToast("Could not save reorder level");
  }

  async function deleteItem(id: string) {
    if (!confirm("Kya aap is item ko inventory se delete karna chahte hain?")) return;
    setItems((prev) => prev.filter((x) => x.id !== id));
    if (!supabaseConfigured) {
      showToast("Item deleted locally");
      return;
    }
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) {
      showToast("Could not delete item from database");
    } else {
      showToast("Item deleted successfully");
    }
  }

  async function commitSupplierRates(itemId: string, supplierRates: Item["supplier_rates"]) {
    setItems((prev) => prev.map((x) => (x.id === itemId ? { ...x, supplier_rates: supplierRates } : x)));
    if (!supabaseConfigured) {
      showToast("Rates saved (not synced — storage unavailable)");
      return;
    }
    const { error } = await supabase
      .from("items")
      .update({ supplier_rates: supplierRates, updated_at: new Date().toISOString() })
      .eq("id", itemId);
    showToast(error ? "Could not save rates — try again" : "Rates saved");
  }

  async function writeCart(newItems: CartItem[]) {
    setCart(newItems);
    if (!supabaseConfigured) return;
    const { error } = await supabase
      .from("cart")
      .upsert({ id: "current", items: newItems, updated_at: new Date().toISOString() });
    if (error) showToast("Could not update order list");
  }

  function addToCart(it: Item) {
    if (cart.some((c) => c.id === it.id)) {
      showToast(it.name + " is already in the order list");
      return;
    }
    const suggestedQty = Math.max(1, (Number(it.reorder_level) || 0) * 2 - (Number(it.stock) || 0));
    const best = bestRate(it, suppliers);
    const next = cart.concat([
      {
        id: it.id,
        name: it.name,
        rate: best.rate,
        supplierId: best.supplierId,
        supplierName: best.supplierName,
        unit: it.unit || "EA",
        qty: suggestedQty,
      },
    ]);
    writeCart(next);
    showToast(best.supplierName ? "Added — cheapest from " + best.supplierName : "Added to order list");
  }
  function removeFromCart(id: string) {
    writeCart(cart.filter((c) => c.id !== id));
  }
  function changeCartQty(id: string, delta: number) {
    writeCart(cart.map((c) => (c.id === id ? { ...c, qty: Math.max(1, (Number(c.qty) || 0) + delta) } : c)));
  }
  function setCartQty(id: string, val: string) {
    writeCart(cart.map((c) => (c.id === id ? { ...c, qty: Math.max(1, Number(val) || 1) } : c)));
  }

  function buildOrderText(cartItems: CartItem[]) {
    const groups: Record<string, CartItem[]> = {};
    const order: string[] = [];
    cartItems.forEach((c) => {
      const key = c.supplierName || "Supplier not set";
      if (!groups[key]) {
        groups[key] = [];
        order.push(key);
      }
      groups[key].push(c);
    });
    return order
      .map((key) => key + ":\n" + groups[key].map((c) => "- " + c.name + "  x" + c.qty).join("\n"))
      .join("\n\n");
  }

  async function copyOrder() {
    const text =
      "Order for Bala Ji Namkeen (" + new Date().toLocaleDateString("en-IN") + ")\n\n" + buildOrderText(cart);
    try {
      await navigator.clipboard.writeText(text);
      showToast("Order list copied — paste it to your supplier");
    } catch {
      showToast("Could not copy — select the list manually");
    }
  }

  async function placeOrder() {
    if (cart.length === 0) return;
    const total = cart.reduce((s, c) => s + (Number(c.qty) || 0) * (Number(c.rate) || 0), 0);
    const orderDoc = { items: cart, placed_at: new Date().toISOString(), total: Math.round(total * 100) / 100 };
    writeCart([]);
    showToast("Order marked as placed");
    if (supabaseConfigured) {
      const { error } = await supabase.from("orders").insert(orderDoc);
      if (error) showToast("Saved locally, but could not sync order history");
    }
  }

  async function addSupplier(rawName: string): Promise<Supplier | null> {
    const name = (rawName || "").trim();
    if (!name) return null;
    const dup = suppliers.find((s) => s.name.toLowerCase() === name.toLowerCase());
    if (dup) {
      showToast(name + " is already in your supplier list");
      return dup;
    }
    if (!supabaseConfigured) {
      const rec = { id: "local-" + Date.now(), name, added_at: new Date().toISOString() };
      setSuppliers((prev) => prev.concat([rec]));
      return rec;
    }
    const { data, error } = await supabase
      .from("suppliers")
      .insert({ name, added_at: new Date().toISOString() })
      .select()
      .single();
    if (error || !data) {
      showToast("Could not save supplier — try again");
      return null;
    }
    const rec = data as Supplier;
    setSuppliers((prev) => prev.concat([rec]));
    return rec;
  }

  async function removeSupplier(id: string) {
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    if (!supabaseConfigured) return;
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) showToast("Could not remove supplier");
  }

  function openAddItem() {
    setAddForm({ name: "", hsn: "", category: CATEGORIES[0], rate: "", stock: "0", reorder: "3" });
    addDialogRef.current?.showModal();
  }
  async function saveAddItem() {
    const name = addForm.name.trim();
    if (!name) {
      showToast("Enter an item name");
      return;
    }
    const base = {
      name,
      hsn: addForm.hsn.trim(),
      category: addForm.category,
      unit: "EA",
      rate: Number(addForm.rate) || 0,
      stock: Number(addForm.stock) || 0,
      reorder_level: Number(addForm.reorder) || 0,
      total_purchased_qty: 0,
      total_purchased_amount: 0,
      times_ordered: 0,
      supplier_rates: {},
      updated_at: new Date().toISOString(),
    };
    addDialogRef.current?.close();
    if (!supabaseConfigured) {
      setItems((prev) => prev.concat([{ ...base, id: "local-" + Date.now() } as Item]));
      showToast("Added (not saved — storage unavailable)");
      return;
    }
    const idGuess = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now();
    const { data, error } = await supabase
      .from("items")
      .insert({ ...base, id: idGuess })
      .select()
      .single();
    if (error || !data) {
      showToast("Could not save the new item");
      return;
    }
    setItems((prev) => prev.concat([data as Item]));
    showToast("Item added");
  }

  // Handle Excel (.xlsx, .xls) and CSV File Upload & Row Parsing
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus(`Processing ${file.name}...`);
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const dataBuffer = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(dataBuffer, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        let importedCount = 0;
        const newItemsList: Item[] = [];

        const startIndex = rows[0]?.[0]?.toString().toLowerCase().includes("name") ? 1 : 0;

        for (let i = startIndex; i < rows.length; i++) {
          const cols = rows[i];
          if (!cols || cols.length === 0 || !cols[0]) continue;

          const name = String(cols[0] || `Item ${i}`).trim();
          const hsn = String(cols[1] || "190590").trim();
          const categoryInput = String(cols[2] || "").trim();
          const category = CATEGORIES.includes(categoryInput) ? categoryInput : CATEGORIES[0];
          const rate = Number(cols[3]) || 100;
          const stock = Number(cols[4]) || 50;
          const reorder_level = Number(cols[5]) || 10;

          const itemData = {
            name,
            hsn,
            category,
            unit: "EA",
            rate,
            stock,
            reorder_level,
            total_purchased_qty: stock,
            total_purchased_amount: rate * stock,
            times_ordered: 1,
            supplier_rates: {},
            updated_at: new Date().toISOString(),
          };

          if (!supabaseConfigured) {
            newItemsList.push({ ...itemData, id: "local-" + Date.now() + "-" + i } as Item);
            importedCount++;
          } else {
            const idGuess = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now() + "-" + i;
            const { data, error } = await supabase
              .from("items")
              .insert({ ...itemData, id: idGuess })
              .select()
              .single();
            if (!error && data) {
              newItemsList.push(data as Item);
              importedCount++;
            }
          }
        }

        if (newItemsList.length > 0) {
          setItems((prev) => [...newItemsList, ...prev]);
          setUploadStatus(`Successfully imported ${importedCount} items! Redirecting to Inventory...`);
          showToast(`Imported ${importedCount} items successfully!`);
          
          setTimeout(() => {
            setActiveTab("inventory");
            setUploadStatus(null);
          }, 1500);
        } else {
          setUploadStatus("No valid rows found in the uploaded file.");
        }
      } catch (err) {
        console.error(err);
        setUploadStatus("Error parsing Excel file. Please check format.");
      }
    };

    reader.readAsArrayBuffer(file);
  }

  function openRateDialog(it: Item) {
    setRateDialogItemId(it.id);
    const rates = it.supplier_rates || {};
    const state: Record<string, string> = {};
    suppliers.forEach((s) => {
      const existing = rates[s.id]?.rate;
      state[s.id] = typeof existing === "number" ? String(existing) : "";
    });
    setRateDialogState(state);
    setRateNewSupplier("");
    rateDialogRef.current?.showModal();
  }
  function bestRateDialogSupplierId() {
    let bestId: string | null = null;
    let bestVal = Infinity;
    Object.keys(rateDialogState).forEach((sid) => {
      const v = parseFloat(rateDialogState[sid]);
      if (!isNaN(v) && v > 0 && v < bestVal) {
        bestVal = v;
        bestId = sid;
      }
    });
    return bestId;
  }
  async function saveRates() {
    const it = items.find((x) => x.id === rateDialogItemId);
    if (!it) return;
    const supplierRates: Item["supplier_rates"] = {};
    Object.keys(rateDialogState).forEach((sid) => {
      const v = parseFloat(rateDialogState[sid]);
      if (!isNaN(v) && v > 0) supplierRates[sid] = { rate: v, updatedAt: new Date().toISOString() };
    });
    rateDialogRef.current?.close();
    commitSupplierRates(it.id, supplierRates);
  }

  const currentItem = items.find((x) => x.id === rateDialogItemId);
  const bestDialogSid = bestRateDialogSupplierId();
  const sortedSuppliers = suppliers.slice().sort((a, b) => a.name.localeCompare(b.name));

  const cartUnits = cart.reduce((s, c) => s + (Number(c.qty) || 0), 0);
  const cartTotal = cart.reduce((s, c) => s + (Number(c.qty) || 0) * (Number(c.rate) || 0), 0);

  return (
    <>
      <header className="top">
        <div className="wrap">
          <div className="brand">
            <div className="mark">BJ</div>
            <div>
              <h1>Bala Ji Stock Book</h1>
              <div className="sub">Inventory &amp; supplier ordering</div>
            </div>
          </div>
          <div className="searchrow">
            <div className="searchbox">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <input
                type="text"
                placeholder="Search items by name or HSN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <nav className="tabs">
            <button className={"tab" + (activeTab === "inventory" ? " active" : "")} onClick={() => setActiveTab("inventory")}>
              Inventory
            </button>
            <button className={"tab" + (activeTab === "cart" ? " active" : "")} onClick={() => setActiveTab("cart")}>
              Order List{" "}
              {cart.length > 0 && <span className="badge cart">{cart.length}</span>}
            </button>
            <button className={"tab" + (activeTab === "upload" ? " active" : "")} onClick={() => setActiveTab("upload")}>
              Upload Bill / Excel
            </button>
            <button className={"tab" + (activeTab === "suppliers" ? " active" : "")} onClick={() => setActiveTab("suppliers")}>
              Suppliers Catalog
            </button>
            <button className={"tab" + (activeTab === "history" ? " active" : "")} onClick={() => setActiveTab("history")}>
              History
            </button>
          </nav>
        </div>
      </header>

      <main className="wrap">
        {!supabaseConfigured && (
          <div className="banner">
            Storage isn&apos;t configured yet — set NEXT_PUBLIC_SUPABASE_URL and
            NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment. Nothing will be saved until then.
          </div>
        )}

        {activeTab === "inventory" && (
          <section>
            <div className="chiprow">
              <div className={"chip" + (activeCat === "__all" ? " active" : "")} onClick={() => setActiveCat("__all")}>
                All
              </div>
              {presentCats.map((c) => (
                <div key={c} className={"chip" + (activeCat === c ? " active" : "")} onClick={() => setActiveCat(c)}>
                  {c} ({catCounts[c]})
                </div>
              ))}
            </div>
            <div className="toolrow">
              <button className="addcard" style={{ flex: 1 }} onClick={openAddItem}>
                + Add a new item to inventory
              </button>
              <button
                className="addcard"
                style={{ flex: "none", paddingInline: 16 }}
                onClick={() => supplierDialogRef.current?.showModal()}
              >
                Suppliers
              </button>
            </div>

            <div className="itemlist">
              {!itemsLoaded && (
                <>
                  <div className="skel" />
                  <div className="skel" />
                  <div className="skel" />
                </>
              )}
              {itemsLoaded && visibleItems.length === 0 && (
                <div className="empty">
                  <div className="big">🔍</div>
                  <div>
                    <b>No items found</b>
                  </div>
                  <div style={{ fontSize: 12.5, marginTop: 4 }}>Try a different search, or add this item.</div>
                </div>
              )}
              {itemsLoaded &&
                visibleItems.map((it) => {
                  const st = statusFor(it);
                  const inCart = cart.some((c) => c.id === it.id);
                  const best = bestRate(it, suppliers);
                  return (
                    <div className="item" key={it.id}>
                      <div className="item-top">
                        <div>
                          <div className="item-name">{it.name}</div>
                          <div className="item-meta">
                            {it.category}
                            {it.hsn ? " · HSN " + it.hsn : ""}
                            {it.times_ordered ? " · ordered " + it.times_ordered + "x before" : ""}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div className={"status " + st.cls}>{st.label}</div>
                          <button
                            onClick={() => deleteItem(it.id)}
                            style={{ background: "#3b1c1c", color: "#f87171", border: "1px solid #5c2727", padding: "4px 8px", borderRadius: 6, fontSize: 11, cursor: "pointer" }}
                            title="Delete Item"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <div className="item-bottom">
                        <div className="stockctl">
                          <div>
                            <label>Stock</label>
                            <div className="stepper">
                              <button onClick={() => commitStock(it, Math.max(0, (Number(it.stock) || 0) - 1))}>−</button>
                              <input
                                className="num"
                                type="number"
                                value={it.stock || 0}
                                onChange={(e) =>
                                  setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, stock: Number(e.target.value) } : x)))
                                }
                                onBlur={(e) => commitStock(it, Math.max(0, Number(e.target.value) || 0))}
                              />
                              <button onClick={() => commitStock(it, (Number(it.stock) || 0) + 1)}>+</button>
                            </div>
                          </div>
                          <div>
                            <label>Reorder&nbsp;at</label>
                            <input
                              className="rlvl num"
                              type="number"
                              value={it.reorder_level || 0}
                              onChange={(e) =>
                                setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, reorder_level: Number(e.target.value) } : x)))
                              }
                              onBlur={(e) => commitReorder(it, Math.max(0, Number(e.target.value) || 0))}
                            />
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div className="price-block">
                            <div className="price-amt num">{money(best.rate)}</div>
                            <div className={"price-supplier" + (best.supplierName ? "" : " unset")}>
                              {best.supplierName
                                ? best.comparedCount > 1
                                  ? best.supplierName + " · cheapest of " + best.comparedCount
                                  : best.supplierName
                                : "No supplier rate set"}
                            </div>
                          </div>
                          <button className="cmpbtn" onClick={() => openRateDialog(it)}>
                            Compare
                          </button>
                          <button className="addbtn" disabled={inCart} onClick={() => addToCart(it)}>
                            {inCart ? "Added ✓" : "+ Order"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>
        )}

        {activeTab === "cart" && (
          <section>
            <div className="itemlist">
              {cart.map((c) => (
                <div className="cartitem" key={c.id}>
                  <div>
                    <div className="nm">{c.name}</div>
                    <div className="sub num">
                      {money(c.rate)} / unit{c.supplierName ? " · from " + c.supplierName : " · supplier not set"}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="stepper">
                      <button onClick={() => changeCartQty(c.id, -1)}>−</button>
                      <input
                        className="num"
                        type="number"
                        value={c.qty}
                        onChange={(e) => setCart((prev) => prev.map((x) => (x.id === c.id ? { ...x, qty: Number(e.target.value) } : x)))}
                        onBlur={(e) => setCartQty(c.id, e.target.value)}
                      />
                      <button onClick={() => changeCartQty(c.id, 1)}>+</button>
                    </div>
                    <button className="rmv" onClick={() => removeFromCart(c.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {cart.length === 0 && (
              <div className="empty">
                <div className="big">🧺</div>
                <div>
                  <b>Order list is empty</b>
                </div>
                <div style={{ fontSize: 12.5, marginTop: 4 }}>Add items from the Inventory tab that need restocking.</div>
              </div>
            )}
            {cart.length > 0 && (
              <div className="summary">
                <div className="summary-row">
                  <span>{cart.length + (cart.length === 1 ? " item" : " items")}</span>
                  <span className="num">{cartUnits} units</span>
                </div>
                <div className="summary-row total">
                  <span>Estimated total</span>
                  <span className="num">{money(cartTotal)}</span>
                </div>
                <div className="summary-actions">
                  <button className="btn ghost" style={{ flex: 1 }} onClick={copyOrder}>
                    Copy order text
                  </button>
                  <button className="btn primary" style={{ flex: 1 }} onClick={placeOrder}>
                    Mark as placed
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === "upload" && (
          <section>
            <div className="empty" style={{ padding: "40px 20px" }}>
              <div className="big">📁</div>
              <div><b>Upload Excel (.xlsx, .xls) or CSV Spreadsheet</b></div>
              <div style={{ fontSize: 13, marginTop: 6, color: "var(--ink-soft)", maxWidth: 480, marginInline: "auto" }}>
                Upload your supplier Excel or CSV files (Columns: <code style={{color: "var(--accent)"}}>Item Name, HSN, Category, Rate, Stock, Reorder Level</code>) to automatically import items.
              </div>
              <div style={{ marginTop: 20 }}>
                <label className="btn primary" style={{ cursor: "pointer", display: "inline-block", padding: "10px 20px" }}>
                  Browse Excel / CSV File
                  <input type="file" accept=".xlsx, .xls, .csv, .txt" onChange={handleFileUpload} style={{ display: "none" }} />
                </label>
              </div>
              {uploadStatus && (
                <div style={{ marginTop: 16, fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>
                  {uploadStatus}
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === "suppliers" && (
          <section>
            <div className="itemlist">
              {suppliers.length === 0 && (
                <div className="empty">
                  <div className="big">🏢</div>
                  <div><b>No suppliers added yet</b></div>
                  <div style={{ fontSize: 12.5, marginTop: 4 }}>Add suppliers from the Inventory tab or set rates via Compare.</div>
                </div>
              )}
              {suppliers.map((s) => {
                const suppliedItems = items.filter((it) => it.supplier_rates && it.supplier_rates[s.id]?.rate > 0);
                return (
                  <div className="item" key={s.id} style={{ marginBottom: 16, padding: 16 }}>
                    <div className="item-top">
                      <div>
                        <div className="item-name" style={{ fontSize: 16, fontWeight: 700 }}>{s.name}</div>
                        <div className="item-meta">Items provided: {suppliedItems.length} products</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                      {suppliedItems.length === 0 ? (
                        <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>No items mapped to this supplier yet. Use 'Compare' on any item to assign rates.</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {suppliedItems.map((it) => {
                            const rateVal = it.supplier_rates[s.id].rate;
                            return (
                              <div key={it.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, background: "var(--card-sub, #181c25)", padding: "8px 12px", borderRadius: 8 }}>
                                <span>{it.name}</span>
                                <span className="num" style={{ fontWeight: 600, color: "var(--accent)" }}>{money(rateVal)}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {activeTab === "history" && (
          <section>
            {orders.length === 0 && (
              <div className="empty">
                <div className="big">📋</div>
                <div>
                  <b>No orders placed yet</b>
                </div>
                <div style={{ fontSize: 12.5, marginTop: 4 }}>
                  Orders you mark as placed from the Order List will show up here.
                </div>
              </div>
            )}
            {orders.map((o) => {
              const d = new Date(o.placed_at);
              const units = (o.items || []).reduce((s, c) => s + (Number(c.qty) || 0), 0);
              const isOpen = openOrderIds.has(o.id);
              return (
                <div className={"order" + (isOpen ? " open" : "")} key={o.id}>
                  <div
                    className="order-head"
                    onClick={() =>
                      setOpenOrderIds((prev) => {
                        const next = new Set(prev);
                        next.has(o.id) ? next.delete(o.id) : next.add(o.id);
                        return next;
                      })
                    }
                  >
                    <div>
                      <div className="d">
                        {isNaN(d.getTime())
                          ? "Order"
                          : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div className="n">
                        {(o.items || []).length} items · {units} units
                      </div>
                    </div>
                    <div className="t num">{money(o.total)}</div>
                  </div>
                  <div className="order-lines">
                    {(o.items || []).map((c, i) => (
                      <div className="order-line" key={i}>
                        <span>
                          {c.name} ×{c.qty}
                          {c.supplierName ? " (" + c.supplierName + ")" : ""}
                        </span>
                        <span className="num">{money((Number(c.qty) || 0) * (Number(c.rate) || 0))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </main>

      <dialog ref={addDialogRef}>
        <div className="dlg-head">Add new item</div>
        <div className="dlg-body">
          <div className="field">
            <label>Item name</label>
            <input
              placeholder="e.g. Parle G Gold 68.75 G"
              value={addForm.name}
              onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="fieldrow">
            <div className="field">
              <label>HSN</label>
              <input
                placeholder="optional"
                value={addForm.hsn}
                onChange={(e) => setAddForm((f) => ({ ...f, hsn: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Category</label>
              <select value={addForm.category} onChange={(e) => setAddForm((f) => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="fieldrow">
            <div className="field">
              <label>Rate (₹)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="0.00"
                value={addForm.rate}
                onChange={(e) => setAddForm((f) => ({ ...f, rate: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Current stock</label>
              <input
                type="number"
                min={0}
                step="1"
                value={addForm.stock}
                onChange={(e) => setAddForm((f) => ({ ...f, stock: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Reorder at</label>
              <input
                type="number"
                min={0}
                step="1"
                value={addForm.reorder}
                onChange={(e) => setAddForm((f) => ({ ...f, reorder: e.target.value }))}
              />
            </div>
          </div>
          <div className="dlg-actions">
            <button className="btn ghost" onClick={() => addDialogRef.current?.close()}>
              Cancel
            </button>
            <button className="btn primary" onClick={saveAddItem}>
              Add item
            </button>
          </div>
        </div>
      </dialog>

      <dialog ref={rateDialogRef}>
        <div className="dlg-head">Compare rates{currentItem ? " — " + currentItem.name : ""}</div>
        <div className="dlg-body">
          <div>
            {sortedSuppliers.length === 0 && (

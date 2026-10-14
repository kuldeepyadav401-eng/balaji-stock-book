"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { CATEGORIES, CartItem, Item, Order, Supplier } from "@/lib/types";

type Tab = "inventory" | "cart" | "history" | "upload";

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

  /* ---------------- dialogs ---------------- */
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

  /* ---------------- data loading + realtime ---------------- */
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

  /* ---------------- category chips ---------------- */
  const catCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((it) => (counts[it.category] = (counts[it.category] || 0) + 1));
    return counts;
  }, [items]);
  const presentCats = CATEGORIES.filter((c) => catCounts[c]);

  /* ---------------- filtered item list ---------------- */
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

  /* ---------------- item mutations ---------------- */
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

  /* ---------------- cart ---------------- */
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

  /* ---------------- suppliers ---------------- */
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
    const { error } = await supabase.

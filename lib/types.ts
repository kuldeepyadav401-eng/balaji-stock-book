export type SupplierRate = {
  rate: number;
  updatedAt: string;
};

export type Item = {
  id: string;
  name: string;
  hsn: string | null;
  category: string;
  unit: string;
  rate: number;
  reorder_level: number;
  total_purchased_qty: number;
  total_purchased_amount: number;
  times_ordered: number;
  stock: number;
  updated_at: string;
  supplier_rates: Record<string, SupplierRate>;
};

export type Supplier = {
  id: string;
  name: string;
  added_at: string;
};

export type CartItem = {
  id: string;
  name: string;
  rate: number;
  supplierId: string | null;
  supplierName: string | null;
  unit: string;
  qty: number;
};

export type Order = {
  id: string;
  items: CartItem[];
  placed_at: string;
  total: number;
};

export const CATEGORIES = [
  "Soap",
  "Detergent & Cleaning",
  "Oral Care",
  "Shampoo & Hair",
  "Biscuits & Cookies",
  "Snacks & Candy",
  "Noodles & Pasta",
  "Tea & Coffee",
  "Dry Fruits & Dates",
  "Ketchup & Sauces",
  "Personal Care",
  "Dairy & Cereal",
  "Chocolate & Confectionery",
  "Other / General",
];

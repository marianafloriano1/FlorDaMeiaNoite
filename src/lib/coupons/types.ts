export type CouponType = "percentage" | "fixed";

export type Coupon = {
  id: string;
  code: string;
  discount_type: CouponType;
  discount_value: number;
  valid_from: string;
  valid_until: string;
  minimum_eligible_brl: number | null;
  maximum_redemptions: number | null;
  maximum_per_customer: number | null;
  active: boolean;
  product_ids: string[];
  categories: string[];
};

export type CouponQuote = {
  code: string;
  eligible_subtotal_brl: number;
  discount_brl: number;
  total_brl: number;
};

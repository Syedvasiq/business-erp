import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatAED(amount: number | string) {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 2,
  }).format(Number(amount));
}

export function validateTRN(trn: string) {
  return /^\d{15}$/.test(trn.replace(/\s/g, ""));
}

export function generateDocNumber(prefix: string, seq: number) {
  return `${prefix}-${String(seq).padStart(6, "0")}`;
}

export const UAE_EMIRATES = [
  "Abu Dhabi",
  "Dubai",
  "Sharjah",
  "Ajman",
  "Umm Al Quwain",
  "Ras Al Khaimah",
  "Fujairah",
];

export function validate(rules: [boolean, string][]) {
  const failed = rules.find(([ok]) => !ok);
  if (failed) throw new Error(failed[1]);
}

export const VAT_RATE = 0.05;
export const CT_FREE_THRESHOLD = 375000;
export const CT_RATE = 0.09;
export const SBR_THRESHOLD = 3000000;

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AppConfig {
  companyName: string;
  logoUrl?: string;
  primaryColor: string;
  accentColor: string;
  bgColor: string;
  phone: string;
  email: string;
  workHours: string;
  billingProvider: 'yookassa' | 'tinkoff' | 'stripe' | 'none';
  billingKeys: {
    shopId?: string;
    secretKey?: string;
    terminalKey?: string;
    publicKey?: string;
  };
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smsProvider?: 'smsc' | 'twilio' | 'none';
  smsLogin?: string;
  smsPassword?: string;
  isAdminCreated: boolean;
  isInstalled: boolean;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  hours: string;
  lat: number;
  lng: number;
  isActive: boolean;
}

export interface Service {
  id: string;
  category: string;
  name: string;
  price: number;
  oldPrice?: number;
  duration: number; // in minutes
  description: string;
  icon: string; // lucide icon name
  isActive: boolean;
  sortOrder: number;
}

export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

export interface Booking {
  id: string; // AS-YYYYMMDD-XXXX
  branchId: string;
  serviceId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  carMake: string;
  carModel: string;
  carYear: string;
  carVin?: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  prepaymentOption: '30' | '100' | '0';
  status: BookingStatus;
  amount: number;
  prepaidAmount: number;
  paymentStatus: PaymentStatus;
  paymentId?: string;
  createdAt: string;
  notes?: string;
}

export interface Promotion {
  id: string;
  title: string;
  description: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  promoCode?: string;
  expiryDateStr?: string;
  isActive: boolean;
}

export interface Review {
  id: string;
  clientName: string;
  rating: number;
  text: string;
  date: string;
  isApproved: boolean;
  replyText?: string;
}

export interface AdminUser {
  username: string;
  email: string;
  passwordHash: string; // bcrypt or sha256
  role: 'admin' | 'manager';
}

export interface Customer {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  phone: string;
  createdAt: string;
}

export interface DatabaseState {
  config: AppConfig;
  branches: Branch[];
  services: Service[];
  bookings: Booking[];
  promotions: Promotion[];
  reviews: Review[];
  admins: AdminUser[];
  customers: Customer[];
}

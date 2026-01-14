
export const SYSTEM_NAME = 'FaustoSystem';

export type Language = 'pt' | 'en';

export enum AppView {
  DASHBOARD = 'dashboard',
  SCHEDULE = 'schedule',
  CLIENTS = 'clients',
  SERVICES = 'services',
  STAFF = 'staff',
  BILLING = 'billing',
  REPORTS = 'reports',
  SETTINGS = 'settings',
  NOTIFICATIONS = 'notifications',
  SUBSCRIPTION = 'subscription'
}

export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'suspended';

export interface SubscriptionInfo {
  status: SubscriptionStatus;
  trialEndsAt: string;
  subscriptionEndsAt?: string;
  manualAccessUntil?: string;
  lastPaymentDate?: string;
  planType?: 'weekly' | 'monthly' | 'yearly';
  autoRenew: boolean;
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'in_service' | 'completed' | 'cancelled' | 'noshow';
export type PricingType = 'fixed' | 'variable' | 'quote';
export type BookingType = 'fixed_time' | 'queue' | 'manual';
export type ClientStatus = 'active' | 'inactive' | 'blocked';
export type ClientType = 'individual' | 'company';

export type StaffStatus = 'active' | 'inactive' | 'terminated';
export type CommissionType = 'percentage' | 'fixed';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'vacation' | 'sick_leave';
export type PaymentStatus = 'pending' | 'paid' | 'late';

export type InvoiceType = 'proforma' | 'invoice' | 'receipt' | 'credit_note';
export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'partial' | 'cancelled';

export interface TenantConfig {
  name: string;
  logo: string;
  primaryColor: string;
  currency: string;
  timezone: string;
  locale: string;
  language: Language;
  isAdmin: boolean;
  securityKey: string; // Nova chave de segurança editável
  subscription: SubscriptionInfo;
  schedulingRules: {
    maxDailyAppointments: number;
    minAdvanceBookingHours: number;
    minCancellationHours: number;
    allowClientReschedule: boolean;
  };
  contactTemplates: {
    whatsapp: string;
    emailSubject: string;
    emailBody: string;
    staffWhatsApp: string;
  };
}

export interface Service {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  duration: number;
  preparationTime: number;
  bufferTime: number;
  price: number;
  pricingType: PricingType;
  requiresApproval: boolean;
  allowFileUpload: boolean;
  requiredFiles: boolean;
  staffIds: string[];
  simultaneousLimit: number;
  isActive: boolean;
}

export interface CustomField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'file' | 'date';
  required: boolean;
  options?: string[];
  visibleInList: boolean;
}

export interface Client {
  id: string;
  name: string;
  photo?: string;
  type: ClientType;
  taxId?: string;
  phone: string;
  alternatePhone?: string;
  whatsappSameAsPhone: boolean;
  email: string;
  alternateEmail?: string;
  status: ClientStatus;
  tags: string[];
  location: {
    country: string;
    state: string;
    city: string;
    neighborhood: string;
    address: string;
    reference?: string;
    coordinates?: { lat: number; lng: number };
  };
  preferences?: string;
  internalNotes?: string;
  customData: Record<string, any>;
  attachments: string[];
  createdAt: string;
}

export interface Staff {
  id: string;
  name: string;
  photo?: string;
  phone: string;
  email: string;
  role: string;
  position: string;
  department: string;
  team: string;
  salary: number;
  commissionValue: number;
  commissionType: CommissionType;
  status: StaffStatus;
  tags: string[];
  hiredAt: string;
  workingHours: {
    start: string;
    end: string;
    daysOff: number[]; // 0-6 (Sun-Sat)
  };
  location: {
    city: string;
    address: string;
  };
  internalNotes?: string;
}

export interface StaffPayment {
  id: string;
  staffId: string;
  description: string;
  amount: number;
  dueDate: string;
  status: PaymentStatus;
  paidAt?: string;
  type: 'salary' | 'commission' | 'bonus' | 'other';
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxPercent: number;
  discount: number;
}

export interface Invoice {
  id: string;
  number: string;
  clientId: string;
  date: string;
  dueDate: string;
  type: InvoiceType;
  status: InvoiceStatus;
  items: InvoiceItem[];
  subtotal: number;
  taxTotal: number;
  total: number;
  paidAmount: number;
  discountTotal: number;
  notes?: string;
  signatureClient?: string;
  signatureCompany?: string;
  isElectronicallySigned?: boolean;
}

export interface AttendanceRecord {
  id: string;
  staffId: string;
  date: string;
  status: AttendanceStatus;
  checkIn?: string;
  checkOut?: string;
  notes?: string;
}

export interface Appointment {
  id: string;
  clientId: string;
  serviceId: string;
  staffId: string;
  dateTime: string;
  status: AppointmentStatus;
  type: BookingType;
  notes?: string;
  clientNotes?: string;
  attachments?: string[];
  isRecurring?: boolean;
  recurrenceRule?: string;
  history: { status: AppointmentStatus; updatedAt: string; note?: string }[];
}

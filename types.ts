
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

export type AppointmentStatus = 'pending' | 'confirmed' | 'in_service' | 'completed' | 'cancelled' | 'noshow' | 'rescheduled';
export type PricingType = 'fixed' | 'variable' | 'quote';
export type BookingType = 'fixed_time' | 'queue' | 'manual';
export type ClientStatus = 'active' | 'inactive' | 'blocked';
export type ClientType = 'individual' | 'company';

export type StaffStatus = 'active' | 'inactive' | 'terminated';
export type CommissionType = 'percentage' | 'fixed';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'vacation' | 'sick_leave' | 'resignation' | 'justified_absence';
export type PaymentStatus = 'pending' | 'paid' | 'late';

export interface CustomField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date' | 'time';
  required: boolean;
  options?: string[];
}

export interface NotificationLog {
  channel: 'whatsapp' | 'email' | 'sms';
  sentAt: string;
  status: 'sent' | 'failed' | 'queued';
  type: 'immediate' | 'reminder';
}

export interface ContactTemplateSet {
  whatsapp: string;
  emailSubject: string;
  emailBody: string;
  sms: string;
}

export interface TenantConfig {
  name: string;
  logo: string;
  primaryColor: string;
  currency: string;
  timezone: string;
  locale: string;
  language: Language;
  isAdmin: boolean;
  securityKey: string;
  clientCustomFields: CustomField[];
  appointmentCustomFields: CustomField[];
  subscription: SubscriptionInfo;
  schedulingRules: {
    maxDailyAppointments: number;
    minAdvanceBookingHours: number;
    minCancellationHours: number;
    allowClientReschedule: boolean;
    reminderLeadTimeHours: number; // Tempo do alarme (ex: 24, 12, 1)
  };
  contactTemplates: {
    pending: ContactTemplateSet;
    confirmed: ContactTemplateSet;
    cancelled: ContactTemplateSet;
    completed: ContactTemplateSet;
    rescheduled: ContactTemplateSet;
    reminder: ContactTemplateSet; // Novo modelo de lembrete
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
  whatsapp?: string;
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
  experienceDescription?: string;
  experienceTime?: string;
  workingHours: {
    start: string;
    end: string;
    daysOff: number[];
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
  baseSalary?: number;
  extras?: number;
  deductions?: number;
  period?: string;
  dueDate: string;
  status: PaymentStatus;
  paidAt?: string;
  type: 'salary' | 'commission' | 'bonus' | 'other';
}

export type InvoiceType = 'invoice' | 'proforma' | 'receipt';
export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'cancelled';

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
  absenceDiscount?: number;
  discountProcessed?: boolean;
  
  // Novos campos para as funcionalidades avançadas
  expectedCheckIn?: string;
  totalHours?: number;
  totalDays?: number;
  startDate?: string;
  endDate?: string;
  reason?: string;
  attachmentUrl?: string;
  justificationStatus?: 'pending' | 'approved' | 'completed';
}

export interface Appointment {
  id: string;
  title?: string;
  clientId: string;
  serviceId: string;
  staffId: string;
  dateTime: string;
  endTime: string;
  location?: string;
  status: AppointmentStatus;
  type: BookingType;
  notes?: string;
  clientNotes?: string;
  attachments?: string[];
  isRecurring?: boolean;
  recurrenceRule?: string;
  history: { status: AppointmentStatus; updatedAt: string; note?: string }[];
  notifications: NotificationLog[];
  customData: Record<string, any>;
  reminderSent: boolean; 
}


export enum HolterType {
  Rhythm = 'ریتم',
  Pressure = 'فشار',
}

export enum DeviceStatus {
  Available = 'موجود',
  InUse = 'در حال استفاده',
  Broken = 'خراب',
}

export interface Device {
  id: string;
  type: HolterType;
  serialNumber: string;
  status: DeviceStatus;
}

export interface Cable {
  id: string;
  serialNumber: string;
  status: DeviceStatus;
}

export interface Patient {
  id: string;
  name: string;
  recordNumber: string;
  mobilePhone: string;
  landlinePhone: string;
  age?: number;
}

export enum AppointmentStatus {
  Scheduled = 'نوبت‌دهی شده',
  Active = 'فعال',
  Overdue = 'تحویل نشده',
  Returned = 'تحویل شده',
  Completed = 'تکمیل شده',
}

export const ADDITIONAL_SERVICES = [
  'نوار قلب', 'اکو', 'تست ورزش', 'آنالیز', 'هولتر فشار'
] as const;

export type AdditionalService = typeof ADDITIONAL_SERVICES[number];

export interface Appointment {
  id: string;
  patientId: string;
  holterId: string;
  cableId: string;
  installDate: Date;
  durationDays: number;
  returnDate: Date;
  status: AppointmentStatus;
  additionalServices: AdditionalService[];
  notes?: string;
}

export interface Notification {
    id: string;
    message: string;
    appointmentId: string;
    createdAt: Date;
}
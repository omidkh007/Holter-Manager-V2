
import { Device, Cable, HolterType, DeviceStatus } from './types';

export const INITIAL_RHYTHM_HOLTERS: Device[] = Array.from({ length: 15 }, (_, i) => ({
  id: `HR-${i + 1}`,
  type: HolterType.Rhythm,
  serialNumber: `R-00${i + 1}`,
  status: DeviceStatus.Available,
}));

export const INITIAL_PRESSURE_HOLTERS: Device[] = Array.from({ length: 5 }, (_, i) => ({
  id: `HP-${i + 1}`,
  type: HolterType.Pressure,
  serialNumber: `P-00${i + 1}`,
  status: DeviceStatus.Available,
}));

export const INITIAL_CABLES: Cable[] = Array.from({ length: 25 }, (_, i) => ({
  id: `CBL-${i + 1}`,
  serialNumber: `C-${i + 1}`,
  status: DeviceStatus.Available,
}));

// Note: In a real app, public holidays would come from an API.
export const PUBLIC_HOLIDAYS: string[] = [
    '2024-01-01', // Example
    '2024-03-20',
    '2024-03-21',
];

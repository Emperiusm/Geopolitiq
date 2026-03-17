import type { MilitaryOperator, MilitaryVesselType } from '@/types';

/**
 * Known military vessel MMSI patterns and ranges
 * MMSI format: MIDxxxxxx where MID is the Maritime Identification Digits
 */
export interface VesselPattern {
  mmsiPrefix?: string;        // MMSI prefix to match
  mmsiRange?: { start: number; end: number };
  operator: MilitaryOperator | 'other';
  country: string;
  vesselType?: MilitaryVesselType;
}

// Military vessel MMSI patterns
export const MILITARY_VESSEL_PATTERNS: VesselPattern[] = [
  // US Navy vessels (various MMSI ranges)
  { mmsiPrefix: '3699', operator: 'usn', country: 'USA', vesselType: 'destroyer' },
  { mmsiPrefix: '369970', operator: 'usn', country: 'USA' },

  // UK Royal Navy
  { mmsiPrefix: '232', operator: 'rn', country: 'UK' },
  { mmsiPrefix: '2320', operator: 'rn', country: 'UK' },

  // Note: Many military vessels don't broadcast AIS or use obscured identities
];

/**
 * Known naval vessel names and hull numbers for identification
 */
export interface KnownNavalVessel {
  name: string;
  hullNumber?: string;
  mmsi?: string;
  operator: MilitaryOperator | 'other';
  country: string;
  vesselType: MilitaryVesselType;
  homePort?: string;
}

export const KNOWN_NAVAL_VESSELS: KnownNavalVessel[] = [
  // US Aircraft Carriers
  { name: 'USS Gerald R. Ford', hullNumber: 'CVN-78', operator: 'usn', country: 'USA', vesselType: 'carrier' },
  { name: 'USS George H.W. Bush', hullNumber: 'CVN-77', operator: 'usn', country: 'USA', vesselType: 'carrier' },
  { name: 'USS Ronald Reagan', hullNumber: 'CVN-76', operator: 'usn', country: 'USA', vesselType: 'carrier' },
  { name: 'USS Harry S. Truman', hullNumber: 'CVN-75', operator: 'usn', country: 'USA', vesselType: 'carrier' },
  { name: 'USS John C. Stennis', hullNumber: 'CVN-74', operator: 'usn', country: 'USA', vesselType: 'carrier' },
  { name: 'USS George Washington', hullNumber: 'CVN-73', operator: 'usn', country: 'USA', vesselType: 'carrier' },
  { name: 'USS Abraham Lincoln', hullNumber: 'CVN-72', operator: 'usn', country: 'USA', vesselType: 'carrier' },
  { name: 'USS Theodore Roosevelt', hullNumber: 'CVN-71', operator: 'usn', country: 'USA', vesselType: 'carrier' },
  { name: 'USS Carl Vinson', hullNumber: 'CVN-70', operator: 'usn', country: 'USA', vesselType: 'carrier' },
  { name: 'USS Dwight D. Eisenhower', hullNumber: 'CVN-69', operator: 'usn', country: 'USA', vesselType: 'carrier' },
  { name: 'USS Nimitz', hullNumber: 'CVN-68', operator: 'usn', country: 'USA', vesselType: 'carrier' },

  // UK Carriers
  { name: 'HMS Queen Elizabeth', hullNumber: 'R08', operator: 'rn', country: 'UK', vesselType: 'carrier' },
  { name: 'HMS Prince of Wales', hullNumber: 'R09', operator: 'rn', country: 'UK', vesselType: 'carrier' },

  // Chinese Carriers
  { name: 'Liaoning', hullNumber: '16', operator: 'plan', country: 'China', vesselType: 'carrier' },
  { name: 'Shandong', hullNumber: '17', operator: 'plan', country: 'China', vesselType: 'carrier' },
  { name: 'Fujian', hullNumber: '18', operator: 'plan', country: 'China', vesselType: 'carrier' },

  // Russian Carrier
  { name: 'Admiral Kuznetsov', operator: 'vks', country: 'Russia', vesselType: 'carrier' },

  // Notable Destroyers/Cruisers
  { name: 'USS Zumwalt', hullNumber: 'DDG-1000', operator: 'usn', country: 'USA', vesselType: 'destroyer' },
  { name: 'HMS Defender', hullNumber: 'D36', operator: 'rn', country: 'UK', vesselType: 'destroyer' },
  { name: 'HMS Duncan', hullNumber: 'D37', operator: 'rn', country: 'UK', vesselType: 'destroyer' },

  // Research/Intel Vessels
  { name: 'USNS Victorious', hullNumber: 'T-AGOS-19', operator: 'usn', country: 'USA', vesselType: 'research' },
  { name: 'USNS Impeccable', hullNumber: 'T-AGOS-23', operator: 'usn', country: 'USA', vesselType: 'research' },
  { name: 'Yuan Wang', operator: 'plan', country: 'China', vesselType: 'research' },
];

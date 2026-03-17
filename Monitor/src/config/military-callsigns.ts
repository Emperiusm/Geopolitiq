import type { MilitaryAircraftType, MilitaryOperator } from '@/types';

/**
 * Military callsign prefixes and patterns for aircraft identification
 * These are used to filter ADS-B data for military aircraft
 */
export interface CallsignPattern {
  pattern: string;           // Regex pattern or prefix
  operator: MilitaryOperator;
  aircraftType?: MilitaryAircraftType;
  description?: string;
}

// US Military callsign patterns
export const US_MILITARY_CALLSIGNS: CallsignPattern[] = [
  // USAF
  { pattern: '^RCH', operator: 'usaf', aircraftType: 'transport', description: 'REACH - AMC transport' },
  { pattern: '^REACH', operator: 'usaf', aircraftType: 'transport', description: 'REACH - AMC transport' },
  { pattern: '^DUKE', operator: 'usaf', aircraftType: 'transport', description: 'DUKE - VIP transport' },
  { pattern: '^SAM', operator: 'usaf', aircraftType: 'vip', description: 'Special Air Mission' },
  { pattern: '^AF[12]', operator: 'usaf', aircraftType: 'vip', description: 'Air Force One/Two' },
  { pattern: '^EXEC', operator: 'usaf', aircraftType: 'vip', description: 'Executive transport' },
  { pattern: '^GOLD', operator: 'usaf', aircraftType: 'special_ops', description: 'Special operations' },
  { pattern: '^KING', operator: 'usaf', aircraftType: 'tanker', description: 'KC-135/KC-46 tanker' },
  { pattern: '^SHELL', operator: 'usaf', aircraftType: 'tanker', description: 'Tanker operations' },
  { pattern: '^TEAL', operator: 'usaf', aircraftType: 'tanker', description: 'Tanker operations' },
  { pattern: '^BOLT', operator: 'usaf', aircraftType: 'fighter', description: 'Fighter ops' },
  { pattern: '^VIPER', operator: 'usaf', aircraftType: 'fighter', description: 'F-16 operations' },
  { pattern: '^RAPTOR', operator: 'usaf', aircraftType: 'fighter', description: 'F-22 operations' },
  { pattern: '^BONE', operator: 'usaf', aircraftType: 'bomber', description: 'B-1B operations' },
  { pattern: '^DEATH', operator: 'usaf', aircraftType: 'bomber', description: 'B-2 operations' },
  { pattern: '^DOOM', operator: 'usaf', aircraftType: 'bomber', description: 'B-52 operations' },
  { pattern: '^SNTRY', operator: 'usaf', aircraftType: 'awacs', description: 'E-3 AWACS' },
  { pattern: '^DRAGN', operator: 'usaf', aircraftType: 'reconnaissance', description: 'U-2 operations' },
  { pattern: '^COBRA', operator: 'usaf', aircraftType: 'reconnaissance', description: 'RC-135 SIGINT' },
  { pattern: '^RIVET', operator: 'usaf', aircraftType: 'reconnaissance', description: 'RC-135 variants' },
  { pattern: '^OLIVE', operator: 'usaf', aircraftType: 'reconnaissance', description: 'RC-135 operations' },
  { pattern: '^JAKE', operator: 'usaf', aircraftType: 'reconnaissance', description: 'E-8 JSTARS' },
  { pattern: '^NCHO', operator: 'usaf', aircraftType: 'special_ops', description: 'MC-130 Specops' },
  { pattern: '^SHADOW', operator: 'usaf', aircraftType: 'special_ops', description: 'Special operations' },
  { pattern: '^EVAC', operator: 'usaf', aircraftType: 'transport', description: 'Aeromedical evacuation' },
  { pattern: '^MOOSE', operator: 'usaf', aircraftType: 'transport', description: 'C-17 operations' },
  { pattern: '^HERKY', operator: 'usaf', aircraftType: 'transport', description: 'C-130 operations' },

  // US Navy
  { pattern: '^NAVY', operator: 'usn', description: 'US Navy aircraft' },
  { pattern: '^CNV', operator: 'usn', aircraftType: 'transport', description: 'Navy transport' },
  { pattern: '^VRC', operator: 'usn', aircraftType: 'transport', description: 'Carrier onboard delivery' },
  { pattern: '^TRIDENT', operator: 'usn', aircraftType: 'patrol', description: 'P-8 maritime patrol' },
  { pattern: '^RED', operator: 'usn', aircraftType: 'patrol', description: 'P-8/P-3 operations' },
  { pattern: '^BRONCO', operator: 'usn', aircraftType: 'fighter', description: 'F/A-18 operations' },

  // US Marine Corps
  { pattern: '^MARINE', operator: 'usmc', description: 'USMC aircraft' },
  { pattern: '^HMX', operator: 'usmc', aircraftType: 'vip', description: 'Marine One squadron' },
  { pattern: '^NIGHT', operator: 'usmc', aircraftType: 'vip', description: 'Nighthawk VIP transport' },

  // US Army
  { pattern: '^ARMY', operator: 'usa', description: 'US Army aircraft' },
  { pattern: '^PAT', operator: 'usa', aircraftType: 'transport', description: 'Priority air transport' },
  { pattern: '^DUSTOFF', operator: 'usa', aircraftType: 'helicopter', description: 'Medevac helicopters' },

  // US Coast Guard
  { pattern: '^COAST GUARD', operator: 'other', aircraftType: 'patrol', description: 'USCG aircraft' },
  { pattern: '^CG[0-9]', operator: 'other', aircraftType: 'patrol', description: 'USCG aircraft' },

  // Global Hawk / Drones
  { pattern: '^FORTE', operator: 'usaf', aircraftType: 'drone', description: 'RQ-4 Global Hawk' },
  { pattern: '^HAWK', operator: 'usaf', aircraftType: 'drone', description: 'Global Hawk drone' },
  { pattern: '^REAPER', operator: 'usaf', aircraftType: 'drone', description: 'MQ-9 Reaper' },
];

// NATO/Allied callsign patterns
export const NATO_ALLIED_CALLSIGNS: CallsignPattern[] = [
  // Royal Air Force (UK)
  { pattern: '^RRR', operator: 'raf', description: 'RAF aircraft' },
  { pattern: '^ASCOT', operator: 'raf', aircraftType: 'transport', description: 'RAF transport' },
  { pattern: '^RAFAIR', operator: 'raf', aircraftType: 'transport', description: 'RAF transport' },
  { pattern: '^TARTAN', operator: 'raf', aircraftType: 'tanker', description: 'RAF tanker' },
  { pattern: '^NATO', operator: 'nato', aircraftType: 'awacs', description: 'NATO AWACS' },

  // Royal Navy (UK)
  { pattern: '^RN', operator: 'rn', description: 'Royal Navy aircraft' },
  { pattern: '^NAVY', operator: 'rn', description: 'RN aircraft' },

  // French Air Force
  { pattern: '^FAF', operator: 'faf', description: 'French Air Force' },
  { pattern: '^CTM', operator: 'faf', aircraftType: 'transport', description: 'French AF transport' },
  { pattern: '^FRENCH', operator: 'faf', description: 'French military' },

  // German Air Force
  { pattern: '^GAF', operator: 'gaf', description: 'German Air Force' },
  { pattern: '^GERMAN', operator: 'gaf', description: 'German military' },

  // Israeli Air Force
  { pattern: '^IAF', operator: 'iaf', description: 'Israeli Air Force' },
  { pattern: '^ELAL', operator: 'iaf', description: 'IAF transport (covers)' },

  // Turkey
  { pattern: '^THK', operator: 'other', description: 'Turkish Air Force' },
  { pattern: '^TUR', operator: 'other', description: 'Turkish military' },

  // Saudi Arabia
  { pattern: '^SVA', operator: 'other', description: 'Saudi Air Force' },
  { pattern: '^RSAF', operator: 'other', description: 'Royal Saudi Air Force' },

  // UAE
  { pattern: '^UAF', operator: 'other', description: 'UAE Air Force' },

  // India
  { pattern: '^AIR INDIA ONE', operator: 'other', aircraftType: 'vip', description: 'Indian Air Force One' },
  { pattern: '^IAM', operator: 'other', description: 'Indian Air Force' },

  // Japan ASDF
  { pattern: '^JPN', operator: 'other', description: 'Japan Self-Defense Force' },
  { pattern: '^JASDF', operator: 'other', description: 'Japan Air Self-Defense Force' },

  // South Korea
  { pattern: '^ROKAF', operator: 'other', description: 'Republic of Korea Air Force' },
  { pattern: '^KAF', operator: 'other', description: 'Korean Air Force' },

  // Australia
  { pattern: '^RAAF', operator: 'other', description: 'Royal Australian Air Force' },
  { pattern: '^AUSSIE', operator: 'other', description: 'Australian military' },

  // Canada
  { pattern: '^CANFORCE', operator: 'other', aircraftType: 'transport', description: 'Canadian Armed Forces' },
  { pattern: '^CFC', operator: 'other', description: 'Canadian Forces' },

  // Italy
  { pattern: '^IAM', operator: 'other', description: 'Italian Air Force' },
  { pattern: '^ITALY', operator: 'other', description: 'Italian military' },

  // Spain
  { pattern: '^AME', operator: 'other', description: 'Spanish Air Force' },

  // Poland
  { pattern: '^PLF', operator: 'other', description: 'Polish Air Force' },

  // Greece
  { pattern: '^HAF', operator: 'other', description: 'Hellenic Air Force' },

  // Egypt
  { pattern: '^EGY', operator: 'other', description: 'Egyptian Air Force' },

  // Pakistan
  { pattern: '^PAF', operator: 'other', description: 'Pakistan Air Force' },
];

// Russian/Chinese callsign patterns (less common due to transponder usage)
export const ADVERSARY_CALLSIGNS: CallsignPattern[] = [
  // Russian Aerospace Forces
  { pattern: '^RF', operator: 'vks', description: 'Russian Federation aircraft' },
  { pattern: '^RFF', operator: 'vks', description: 'Russian AF' },
  { pattern: '^RUSSIAN', operator: 'vks', description: 'Russian military' },

  // Chinese PLA
  { pattern: '^CCA', operator: 'plaaf', description: 'PLA Air Force' },
  { pattern: '^CHH', operator: 'plan', description: 'PLA Navy Air' },
  { pattern: '^CHINA', operator: 'plaaf', description: 'Chinese military' },
];

// All military callsign patterns combined
export const ALL_MILITARY_CALLSIGNS: CallsignPattern[] = [
  ...US_MILITARY_CALLSIGNS,
  ...NATO_ALLIED_CALLSIGNS,
  ...ADVERSARY_CALLSIGNS,
];

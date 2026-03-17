import type { MilitaryAircraftType, MilitaryOperator } from '@/types';

/**
 * Military aircraft type codes (ICAO aircraft type designators)
 * Used to identify military aircraft by their type code
 */
export const MILITARY_AIRCRAFT_TYPES: Record<string, { type: MilitaryAircraftType; name: string }> = {
  // Fighters
  'F15': { type: 'fighter', name: 'F-15 Eagle' },
  'F16': { type: 'fighter', name: 'F-16 Fighting Falcon' },
  'F18': { type: 'fighter', name: 'F/A-18 Hornet' },
  'FA18': { type: 'fighter', name: 'F/A-18 Hornet' },
  'F22': { type: 'fighter', name: 'F-22 Raptor' },
  'F35': { type: 'fighter', name: 'F-35 Lightning II' },
  'F117': { type: 'fighter', name: 'F-117 Nighthawk' },
  'SU27': { type: 'fighter', name: 'Su-27 Flanker' },
  'SU30': { type: 'fighter', name: 'Su-30 Flanker' },
  'SU35': { type: 'fighter', name: 'Su-35 Flanker-E' },
  'MIG29': { type: 'fighter', name: 'MiG-29 Fulcrum' },
  'MIG31': { type: 'fighter', name: 'MiG-31 Foxhound' },
  'EUFI': { type: 'fighter', name: 'Eurofighter Typhoon' },
  'EF2K': { type: 'fighter', name: 'Eurofighter Typhoon' },
  'RFAL': { type: 'fighter', name: 'Dassault Rafale' },
  'J10': { type: 'fighter', name: 'J-10 Vigorous Dragon' },
  'J11': { type: 'fighter', name: 'J-11 Flanker' },
  'J20': { type: 'fighter', name: 'J-20 Mighty Dragon' },

  // Bombers
  'B52': { type: 'bomber', name: 'B-52 Stratofortress' },
  'B1': { type: 'bomber', name: 'B-1B Lancer' },
  'B1B': { type: 'bomber', name: 'B-1B Lancer' },
  'B2': { type: 'bomber', name: 'B-2 Spirit' },
  'TU95': { type: 'bomber', name: 'Tu-95 Bear' },
  'TU160': { type: 'bomber', name: 'Tu-160 Blackjack' },
  'TU22': { type: 'bomber', name: 'Tu-22M Backfire' },
  'H6': { type: 'bomber', name: 'H-6 Badger' },

  // Transports
  'C130': { type: 'transport', name: 'C-130 Hercules' },
  'C17': { type: 'transport', name: 'C-17 Globemaster III' },
  'C5': { type: 'transport', name: 'C-5 Galaxy' },
  'C5M': { type: 'transport', name: 'C-5M Super Galaxy' },
  'C40': { type: 'transport', name: 'C-40 Clipper' },
  'C32': { type: 'transport', name: 'C-32 (757)' },
  'VC25': { type: 'vip', name: 'VC-25 Air Force One' },
  'A400': { type: 'transport', name: 'A400M Atlas' },
  'IL76': { type: 'transport', name: 'Il-76 Candid' },
  'AN124': { type: 'transport', name: 'An-124 Ruslan' },
  'AN225': { type: 'transport', name: 'An-225 Mriya' },
  'Y20': { type: 'transport', name: 'Y-20 Kunpeng' },

  // Tankers
  'KC135': { type: 'tanker', name: 'KC-135 Stratotanker' },
  'K35R': { type: 'tanker', name: 'KC-135R Stratotanker' },
  'KC10': { type: 'tanker', name: 'KC-10 Extender' },
  'KC46': { type: 'tanker', name: 'KC-46 Pegasus' },
  'A330': { type: 'tanker', name: 'A330 MRTT' },
  'A332': { type: 'tanker', name: 'A330 MRTT' },

  // AWACS/AEW
  'E3': { type: 'awacs', name: 'E-3 Sentry AWACS' },
  'E3TF': { type: 'awacs', name: 'E-3 Sentry AWACS' },
  'E7': { type: 'awacs', name: 'E-7 Wedgetail' },
  'E2': { type: 'awacs', name: 'E-2 Hawkeye' },
  'A50': { type: 'awacs', name: 'A-50 Mainstay' },
  'KJ2000': { type: 'awacs', name: 'KJ-2000' },

  // Reconnaissance
  'RC135': { type: 'reconnaissance', name: 'RC-135 Rivet Joint' },
  'R135': { type: 'reconnaissance', name: 'RC-135' },
  'U2': { type: 'reconnaissance', name: 'U-2 Dragon Lady' },
  'U2S': { type: 'reconnaissance', name: 'U-2S Dragon Lady' },
  'EP3': { type: 'reconnaissance', name: 'EP-3 Aries' },
  'E8': { type: 'reconnaissance', name: 'E-8 JSTARS' },
  'WC135': { type: 'reconnaissance', name: 'WC-135 Constant Phoenix' },
  'OC135': { type: 'reconnaissance', name: 'OC-135 Open Skies' },

  // Maritime Patrol
  'P8': { type: 'patrol', name: 'P-8 Poseidon' },
  'P3': { type: 'patrol', name: 'P-3 Orion' },
  'P1': { type: 'patrol', name: 'Kawasaki P-1' },

  // Drones/UAV
  'RQ4': { type: 'drone', name: 'RQ-4 Global Hawk' },
  'GLHK': { type: 'drone', name: 'RQ-4 Global Hawk' },
  'MQ9': { type: 'drone', name: 'MQ-9 Reaper' },
  'MQ1': { type: 'drone', name: 'MQ-1 Predator' },
  'RQ170': { type: 'drone', name: 'RQ-170 Sentinel' },
  'MQ4C': { type: 'drone', name: 'MQ-4C Triton' },

  // Special Operations
  'MC130': { type: 'special_ops', name: 'MC-130 Combat Talon' },
  'AC130': { type: 'special_ops', name: 'AC-130 Gunship' },
  'CV22': { type: 'special_ops', name: 'CV-22 Osprey' },
  'MV22': { type: 'special_ops', name: 'MV-22 Osprey' },

  // Helicopters
  'H60': { type: 'helicopter', name: 'UH-60 Black Hawk' },
  'S70': { type: 'helicopter', name: 'UH-60 Black Hawk' },
  'H47': { type: 'helicopter', name: 'CH-47 Chinook' },
  'CH47': { type: 'helicopter', name: 'CH-47 Chinook' },
  'AH64': { type: 'helicopter', name: 'AH-64 Apache' },
  'H64': { type: 'helicopter', name: 'AH-64 Apache' },
  'H1': { type: 'helicopter', name: 'AH-1 Cobra/Viper' },
  'MI8': { type: 'helicopter', name: 'Mi-8 Hip' },
  'MI24': { type: 'helicopter', name: 'Mi-24 Hind' },
  'MI28': { type: 'helicopter', name: 'Mi-28 Havoc' },
  'KA52': { type: 'helicopter', name: 'Ka-52 Alligator' },
};

/**
 * ICAO 24-bit hex code ranges for military aircraft
 * These help identify military aircraft even without callsigns
 * Reference: https://www.ads-b.nl/icao.php
 */
export const MILITARY_HEX_RANGES: { start: string; end: string; operator: MilitaryOperator; country: string }[] = [
  // United States DoD — civil N-numbers end at ADF7C7; everything above is military
  { start: 'ADF7C8', end: 'AFFFFF', operator: 'usaf', country: 'USA' },

  // UK Military (small block at start + main RAF block)
  { start: '400000', end: '40003F', operator: 'raf', country: 'UK' },
  { start: '43C000', end: '43CFFF', operator: 'raf', country: 'UK' },

  // France Military (two sub-blocks within 380000-3BFFFF)
  { start: '3AA000', end: '3AFFFF', operator: 'faf', country: 'France' },
  { start: '3B7000', end: '3BFFFF', operator: 'faf', country: 'France' },

  // Germany Military (two sub-blocks within 3C0000-3FFFFF)
  { start: '3EA000', end: '3EBFFF', operator: 'gaf', country: 'Germany' },
  { start: '3F4000', end: '3FBFFF', operator: 'gaf', country: 'Germany' },

  // Israel Military (confirmed IAF sub-range within 738000-73FFFF)
  { start: '738A00', end: '738BFF', operator: 'iaf', country: 'Israel' },

  // NATO AWACS (Luxembourg registration but NATO operated)
  { start: '4D0000', end: '4D03FF', operator: 'nato', country: 'NATO' },

  // Italy Military (top of 300000-33FFFF block)
  { start: '33FF00', end: '33FFFF', operator: 'other', country: 'Italy' },

  // Spain Military (upper 3/4 of 340000-37FFFF; civilian in 340000-34FFFF)
  { start: '350000', end: '37FFFF', operator: 'other', country: 'Spain' },

  // Netherlands Military
  { start: '480000', end: '480FFF', operator: 'other', country: 'Netherlands' },

  // Turkey Military (confirmed sub-range within 4B8000-4BFFFF)
  { start: '4B8200', end: '4B82FF', operator: 'other', country: 'Turkey' },

  // Saudi Arabia Military (two small confirmed sub-blocks)
  { start: '710258', end: '71028F', operator: 'other', country: 'Saudi Arabia' },
  { start: '710380', end: '71039F', operator: 'other', country: 'Saudi Arabia' },

  // UAE Military
  { start: '896000', end: '896FFF', operator: 'other', country: 'UAE' },

  // Qatar Military
  { start: '06A000', end: '06AFFF', operator: 'other', country: 'Qatar' },

  // Kuwait Military
  { start: '706000', end: '706FFF', operator: 'other', country: 'Kuwait' },

  // Australia Military (confirmed RAAF sub-range)
  { start: '7CF800', end: '7CFAFF', operator: 'other', country: 'Australia' },

  // Canada Military (upper half of C00000-C3FFFF)
  { start: 'C20000', end: 'C3FFFF', operator: 'other', country: 'Canada' },

  // India Military (confirmed IAF sub-range within 800000-83FFFF)
  { start: '800200', end: '8002FF', operator: 'other', country: 'India' },

  // Egypt Military (confirmed sub-range)
  { start: '010070', end: '01008F', operator: 'other', country: 'Egypt' },

  // Poland Military (confirmed sub-range within 488000-48FFFF)
  { start: '48D800', end: '48D87F', operator: 'other', country: 'Poland' },

  // Greece Military (confirmed sub-range at start of 468000-46FFFF)
  { start: '468000', end: '4683FF', operator: 'other', country: 'Greece' },

  // Norway Military (confirmed sub-range within 478000-47FFFF)
  { start: '478100', end: '4781FF', operator: 'other', country: 'Norway' },

  // Austria Military
  { start: '444000', end: '446FFF', operator: 'other', country: 'Austria' },

  // Belgium Military
  { start: '44F000', end: '44FFFF', operator: 'other', country: 'Belgium' },

  // Switzerland Military
  { start: '4B7000', end: '4B7FFF', operator: 'other', country: 'Switzerland' },

  // Brazil Military
  { start: 'E40000', end: 'E41FFF', operator: 'other', country: 'Brazil' },
];

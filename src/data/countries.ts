export interface Country {
  code: string;
  name: string;
  cii: number;
  flag: string;
  lat: number;
  lng: number;
}

export type RiskLevel = 'CATASTROPHIC' | 'EXTREME' | 'SEVERE' | 'STORMY' | 'CLOUDY' | 'CLEAR';

export function getRiskLevel(cii: number): RiskLevel {
  if (cii >= 86) return 'CATASTROPHIC';
  if (cii >= 76) return 'EXTREME';
  if (cii >= 66) return 'SEVERE';
  if (cii >= 56) return 'STORMY';
  if (cii >= 46) return 'CLOUDY';
  return 'CLEAR';
}

export function getRiskColor(level: RiskLevel): string {
  switch (level) {
    case 'CATASTROPHIC': return '#ef4444';
    case 'EXTREME': return '#f97316';
    case 'SEVERE': return '#eab308';
    case 'STORMY': return '#a855f7';
    case 'CLOUDY': return '#3b82f6';
    case 'CLEAR': return '#22c55e';
  }
}

export const countries: Country[] = [
  // CATASTROPHIC (86+)
  { code: 'SY', name: 'Syria', cii: 94, flag: '\u{1F1F8}\u{1F1FE}', lat: 34.80, lng: 38.99 },
  { code: 'AF', name: 'Afghanistan', cii: 93, flag: '\u{1F1E6}\u{1F1EB}', lat: 33.93, lng: 67.71 },
  { code: 'YE', name: 'Yemen', cii: 92, flag: '\u{1F1FE}\u{1F1EA}', lat: 15.55, lng: 48.52 },
  { code: 'SO', name: 'Somalia', cii: 91, flag: '\u{1F1F8}\u{1F1F4}', lat: 5.15, lng: 46.20 },
  { code: 'SS', name: 'South Sudan', cii: 90, flag: '\u{1F1F8}\u{1F1F8}', lat: 6.88, lng: 31.31 },
  { code: 'SD', name: 'Sudan', cii: 89, flag: '\u{1F1F8}\u{1F1E9}', lat: 12.86, lng: 30.22 },
  { code: 'MM', name: 'Myanmar', cii: 88, flag: '\u{1F1F2}\u{1F1F2}', lat: 21.91, lng: 95.96 },
  { code: 'UA', name: 'Ukraine', cii: 87, flag: '\u{1F1FA}\u{1F1E6}', lat: 48.38, lng: 31.17 },
  { code: 'LY', name: 'Libya', cii: 86, flag: '\u{1F1F1}\u{1F1FE}', lat: 26.34, lng: 17.23 },

  // EXTREME (76-85)
  { code: 'IQ', name: 'Iraq', cii: 85, flag: '\u{1F1EE}\u{1F1F6}', lat: 33.22, lng: 43.68 },
  { code: 'CD', name: 'DR Congo', cii: 84, flag: '\u{1F1E8}\u{1F1E9}', lat: -4.04, lng: 21.76 },
  { code: 'CF', name: 'Central African Rep.', cii: 83, flag: '\u{1F1E8}\u{1F1EB}', lat: 6.61, lng: 20.94 },
  { code: 'HT', name: 'Haiti', cii: 82, flag: '\u{1F1ED}\u{1F1F9}', lat: 18.97, lng: -72.29 },
  { code: 'ML', name: 'Mali', cii: 81, flag: '\u{1F1F2}\u{1F1F1}', lat: 17.57, lng: -4.00 },
  { code: 'BF', name: 'Burkina Faso', cii: 80, flag: '\u{1F1E7}\u{1F1EB}', lat: 12.24, lng: -1.56 },
  { code: 'PS', name: 'Palestine', cii: 79, flag: '\u{1F1F5}\u{1F1F8}', lat: 31.95, lng: 35.23 },
  { code: 'ER', name: 'Eritrea', cii: 78, flag: '\u{1F1EA}\u{1F1F7}', lat: 15.18, lng: 39.78 },
  { code: 'NE', name: 'Niger', cii: 77, flag: '\u{1F1F3}\u{1F1EA}', lat: 17.61, lng: 8.08 },
  { code: 'TD', name: 'Chad', cii: 76, flag: '\u{1F1F9}\u{1F1E9}', lat: 15.45, lng: 18.73 },

  // SEVERE (66-75)
  { code: 'KP', name: 'North Korea', cii: 75, flag: '\u{1F1F0}\u{1F1F5}', lat: 40.34, lng: 127.51 },
  { code: 'VE', name: 'Venezuela', cii: 74, flag: '\u{1F1FB}\u{1F1EA}', lat: 6.42, lng: -66.59 },
  { code: 'NG', name: 'Nigeria', cii: 73, flag: '\u{1F1F3}\u{1F1EC}', lat: 9.08, lng: 7.49 },
  { code: 'ET', name: 'Ethiopia', cii: 72, flag: '\u{1F1EA}\u{1F1F9}', lat: 9.15, lng: 40.49 },
  { code: 'PK', name: 'Pakistan', cii: 71, flag: '\u{1F1F5}\u{1F1F0}', lat: 30.38, lng: 69.35 },
  { code: 'LB', name: 'Lebanon', cii: 70, flag: '\u{1F1F1}\u{1F1E7}', lat: 33.85, lng: 35.86 },
  { code: 'MZ', name: 'Mozambique', cii: 69, flag: '\u{1F1F2}\u{1F1FF}', lat: -18.67, lng: 35.53 },
  { code: 'CM', name: 'Cameroon', cii: 68, flag: '\u{1F1E8}\u{1F1F2}', lat: 7.37, lng: 12.35 },
  { code: 'CG', name: 'Congo', cii: 67, flag: '\u{1F1E8}\u{1F1EC}', lat: -0.23, lng: 15.83 },
  { code: 'BI', name: 'Burundi', cii: 66, flag: '\u{1F1E7}\u{1F1EE}', lat: -3.37, lng: 29.92 },

  // STORMY (56-65)
  { code: 'IR', name: 'Iran', cii: 65, flag: '\u{1F1EE}\u{1F1F7}', lat: 32.43, lng: 53.69 },
  { code: 'RU', name: 'Russia', cii: 64, flag: '\u{1F1F7}\u{1F1FA}', lat: 61.52, lng: 105.32 },
  { code: 'IL', name: 'Israel', cii: 63, flag: '\u{1F1EE}\u{1F1F1}', lat: 31.05, lng: 34.85 },
  { code: 'EG', name: 'Egypt', cii: 62, flag: '\u{1F1EA}\u{1F1EC}', lat: 26.82, lng: 30.80 },
  { code: 'CO', name: 'Colombia', cii: 61, flag: '\u{1F1E8}\u{1F1F4}', lat: 4.57, lng: -74.30 },
  { code: 'ZW', name: 'Zimbabwe', cii: 60, flag: '\u{1F1FF}\u{1F1FC}', lat: -19.02, lng: 29.15 },
  { code: 'TN', name: 'Tunisia', cii: 59, flag: '\u{1F1F9}\u{1F1F3}', lat: 33.89, lng: 9.54 },
  { code: 'BD', name: 'Bangladesh', cii: 58, flag: '\u{1F1E7}\u{1F1E9}', lat: 23.68, lng: 90.36 },
  { code: 'NI', name: 'Nicaragua', cii: 57, flag: '\u{1F1F3}\u{1F1EE}', lat: 12.87, lng: -85.21 },
  { code: 'BY', name: 'Belarus', cii: 56, flag: '\u{1F1E7}\u{1F1FE}', lat: 53.71, lng: 27.95 },

  // CLOUDY (46-55)
  { code: 'TR', name: 'Turkey', cii: 55, flag: '\u{1F1F9}\u{1F1F7}', lat: 38.96, lng: 35.24 },
  { code: 'CN', name: 'China', cii: 54, flag: '\u{1F1E8}\u{1F1F3}', lat: 35.86, lng: 104.20 },
  { code: 'SA', name: 'Saudi Arabia', cii: 53, flag: '\u{1F1F8}\u{1F1E6}', lat: 23.89, lng: 45.08 },
  { code: 'IN', name: 'India', cii: 52, flag: '\u{1F1EE}\u{1F1F3}', lat: 20.59, lng: 78.96 },
  { code: 'TH', name: 'Thailand', cii: 51, flag: '\u{1F1F9}\u{1F1ED}', lat: 15.87, lng: 100.99 },
  { code: 'PH', name: 'Philippines', cii: 50, flag: '\u{1F1F5}\u{1F1ED}', lat: 12.88, lng: 121.77 },
  { code: 'MX', name: 'Mexico', cii: 49, flag: '\u{1F1F2}\u{1F1FD}', lat: 23.63, lng: -102.55 },
  { code: 'KE', name: 'Kenya', cii: 48, flag: '\u{1F1F0}\u{1F1EA}', lat: -0.02, lng: 37.91 },
  { code: 'DZ', name: 'Algeria', cii: 47, flag: '\u{1F1E9}\u{1F1FF}', lat: 28.03, lng: 1.66 },
  { code: 'UG', name: 'Uganda', cii: 46, flag: '\u{1F1FA}\u{1F1EC}', lat: 1.37, lng: 32.29 },

  // CLEAR (0-45)
  { code: 'US', name: 'United States', cii: 32, flag: '\u{1F1FA}\u{1F1F8}', lat: 37.09, lng: -95.71 },
  { code: 'GB', name: 'United Kingdom', cii: 22, flag: '\u{1F1EC}\u{1F1E7}', lat: 55.38, lng: -3.44 },
  { code: 'FR', name: 'France', cii: 28, flag: '\u{1F1EB}\u{1F1F7}', lat: 46.23, lng: 2.21 },
  { code: 'DE', name: 'Germany', cii: 20, flag: '\u{1F1E9}\u{1F1EA}', lat: 51.17, lng: 10.45 },
  { code: 'JP', name: 'Japan', cii: 18, flag: '\u{1F1EF}\u{1F1F5}', lat: 36.20, lng: 138.25 },
  { code: 'KR', name: 'South Korea', cii: 38, flag: '\u{1F1F0}\u{1F1F7}', lat: 35.91, lng: 127.77 },
  { code: 'AU', name: 'Australia', cii: 15, flag: '\u{1F1E6}\u{1F1FA}', lat: -25.27, lng: 133.78 },
  { code: 'CA', name: 'Canada', cii: 14, flag: '\u{1F1E8}\u{1F1E6}', lat: 56.13, lng: -106.35 },
  { code: 'BR', name: 'Brazil', cii: 42, flag: '\u{1F1E7}\u{1F1F7}', lat: -14.24, lng: -51.93 },
  { code: 'AR', name: 'Argentina', cii: 44, flag: '\u{1F1E6}\u{1F1F7}', lat: -38.42, lng: -63.62 },
  { code: 'IT', name: 'Italy', cii: 25, flag: '\u{1F1EE}\u{1F1F9}', lat: 41.87, lng: 12.57 },
  { code: 'ES', name: 'Spain', cii: 23, flag: '\u{1F1EA}\u{1F1F8}', lat: 40.46, lng: -3.75 },
  { code: 'PT', name: 'Portugal', cii: 16, flag: '\u{1F1F5}\u{1F1F9}', lat: 39.40, lng: -8.22 },
  { code: 'NL', name: 'Netherlands', cii: 13, flag: '\u{1F1F3}\u{1F1F1}', lat: 52.13, lng: 5.29 },
  { code: 'BE', name: 'Belgium', cii: 17, flag: '\u{1F1E7}\u{1F1EA}', lat: 50.50, lng: 4.47 },
  { code: 'CH', name: 'Switzerland', cii: 8, flag: '\u{1F1E8}\u{1F1ED}', lat: 46.82, lng: 8.23 },
  { code: 'AT', name: 'Austria', cii: 12, flag: '\u{1F1E6}\u{1F1F9}', lat: 47.52, lng: 14.55 },
  { code: 'SE', name: 'Sweden', cii: 11, flag: '\u{1F1F8}\u{1F1EA}', lat: 60.13, lng: 18.64 },
  { code: 'NO', name: 'Norway', cii: 9, flag: '\u{1F1F3}\u{1F1F4}', lat: 60.47, lng: 8.47 },
  { code: 'FI', name: 'Finland', cii: 10, flag: '\u{1F1EB}\u{1F1EE}', lat: 61.92, lng: 25.75 },
  { code: 'DK', name: 'Denmark', cii: 11, flag: '\u{1F1E9}\u{1F1F0}', lat: 56.26, lng: 9.50 },
  { code: 'IE', name: 'Ireland', cii: 12, flag: '\u{1F1EE}\u{1F1EA}', lat: 53.14, lng: -7.69 },
  { code: 'PL', name: 'Poland', cii: 24, flag: '\u{1F1F5}\u{1F1F1}', lat: 51.92, lng: 19.15 },
  { code: 'CZ', name: 'Czech Republic', cii: 15, flag: '\u{1F1E8}\u{1F1FF}', lat: 49.82, lng: 15.47 },
  { code: 'RO', name: 'Romania', cii: 30, flag: '\u{1F1F7}\u{1F1F4}', lat: 45.94, lng: 24.97 },
  { code: 'HU', name: 'Hungary', cii: 35, flag: '\u{1F1ED}\u{1F1FA}', lat: 47.16, lng: 19.50 },
  { code: 'GR', name: 'Greece', cii: 33, flag: '\u{1F1EC}\u{1F1F7}', lat: 39.07, lng: 21.82 },
  { code: 'HR', name: 'Croatia', cii: 19, flag: '\u{1F1ED}\u{1F1F7}', lat: 45.10, lng: 15.20 },
  { code: 'RS', name: 'Serbia', cii: 40, flag: '\u{1F1F7}\u{1F1F8}', lat: 44.02, lng: 21.01 },
  { code: 'BA', name: 'Bosnia & Herzegovina', cii: 42, flag: '\u{1F1E7}\u{1F1E6}', lat: 43.92, lng: 17.68 },
  { code: 'AL', name: 'Albania', cii: 38, flag: '\u{1F1E6}\u{1F1F1}', lat: 41.15, lng: 20.17 },
  { code: 'BG', name: 'Bulgaria', cii: 28, flag: '\u{1F1E7}\u{1F1EC}', lat: 42.73, lng: 25.49 },
  { code: 'SK', name: 'Slovakia', cii: 22, flag: '\u{1F1F8}\u{1F1F0}', lat: 48.67, lng: 19.70 },
  { code: 'SI', name: 'Slovenia', cii: 14, flag: '\u{1F1F8}\u{1F1EE}', lat: 46.15, lng: 14.99 },
  { code: 'EE', name: 'Estonia', cii: 16, flag: '\u{1F1EA}\u{1F1EA}', lat: 58.60, lng: 25.01 },
  { code: 'LV', name: 'Latvia', cii: 18, flag: '\u{1F1F1}\u{1F1FB}', lat: 56.88, lng: 24.60 },
  { code: 'LT', name: 'Lithuania', cii: 17, flag: '\u{1F1F1}\u{1F1F9}', lat: 55.17, lng: 23.88 },
  { code: 'GE', name: 'Georgia', cii: 45, flag: '\u{1F1EC}\u{1F1EA}', lat: 42.32, lng: 43.36 },
  { code: 'AM', name: 'Armenia', cii: 44, flag: '\u{1F1E6}\u{1F1F2}', lat: 40.07, lng: 45.04 },
  { code: 'AZ', name: 'Azerbaijan', cii: 43, flag: '\u{1F1E6}\u{1F1FF}', lat: 40.14, lng: 47.58 },
  { code: 'KZ', name: 'Kazakhstan', cii: 39, flag: '\u{1F1F0}\u{1F1FF}', lat: 48.02, lng: 66.92 },
  { code: 'UZ', name: 'Uzbekistan', cii: 41, flag: '\u{1F1FA}\u{1F1FF}', lat: 41.38, lng: 64.59 },
  { code: 'TM', name: 'Turkmenistan', cii: 44, flag: '\u{1F1F9}\u{1F1F2}', lat: 38.97, lng: 59.56 },
  { code: 'KG', name: 'Kyrgyzstan', cii: 42, flag: '\u{1F1F0}\u{1F1EC}', lat: 41.20, lng: 74.77 },
  { code: 'TJ', name: 'Tajikistan', cii: 45, flag: '\u{1F1F9}\u{1F1EF}', lat: 38.86, lng: 71.28 },
  { code: 'NZ', name: 'New Zealand', cii: 10, flag: '\u{1F1F3}\u{1F1FF}', lat: -40.90, lng: 174.89 },
  { code: 'SG', name: 'Singapore', cii: 12, flag: '\u{1F1F8}\u{1F1EC}', lat: 1.35, lng: 103.82 },
  { code: 'MY', name: 'Malaysia', cii: 34, flag: '\u{1F1F2}\u{1F1FE}', lat: 4.21, lng: 101.98 },
  { code: 'ID', name: 'Indonesia', cii: 40, flag: '\u{1F1EE}\u{1F1E9}', lat: -0.79, lng: 113.92 },
  { code: 'VN', name: 'Vietnam', cii: 36, flag: '\u{1F1FB}\u{1F1F3}', lat: 14.06, lng: 108.28 },
  { code: 'TW', name: 'Taiwan', cii: 42, flag: '\u{1F1F9}\u{1F1FC}', lat: 23.70, lng: 120.96 },
  { code: 'AE', name: 'UAE', cii: 26, flag: '\u{1F1E6}\u{1F1EA}', lat: 23.42, lng: 53.85 },
  { code: 'QA', name: 'Qatar', cii: 24, flag: '\u{1F1F6}\u{1F1E6}', lat: 25.35, lng: 51.18 },
  { code: 'KW', name: 'Kuwait', cii: 30, flag: '\u{1F1F0}\u{1F1FC}', lat: 29.31, lng: 47.48 },
  { code: 'OM', name: 'Oman', cii: 22, flag: '\u{1F1F4}\u{1F1F2}', lat: 21.51, lng: 55.92 },
  { code: 'BH', name: 'Bahrain', cii: 32, flag: '\u{1F1E7}\u{1F1ED}', lat: 26.07, lng: 50.56 },
  { code: 'JO', name: 'Jordan', cii: 44, flag: '\u{1F1EF}\u{1F1F4}', lat: 30.59, lng: 36.24 },
  { code: 'MA', name: 'Morocco', cii: 35, flag: '\u{1F1F2}\u{1F1E6}', lat: 31.79, lng: -7.09 },
  { code: 'GH', name: 'Ghana', cii: 33, flag: '\u{1F1EC}\u{1F1ED}', lat: 7.95, lng: -1.02 },
  { code: 'SN', name: 'Senegal', cii: 34, flag: '\u{1F1F8}\u{1F1F3}', lat: 14.50, lng: -14.45 },
  { code: 'TZ', name: 'Tanzania', cii: 36, flag: '\u{1F1F9}\u{1F1FF}', lat: -6.37, lng: 34.89 },
  { code: 'ZA', name: 'South Africa', cii: 44, flag: '\u{1F1FF}\u{1F1E6}', lat: -30.56, lng: 22.94 },
  { code: 'AO', name: 'Angola', cii: 45, flag: '\u{1F1E6}\u{1F1F4}', lat: -11.20, lng: 17.87 },
  { code: 'CL', name: 'Chile', cii: 28, flag: '\u{1F1E8}\u{1F1F1}', lat: -35.68, lng: -71.54 },
  { code: 'PE', name: 'Peru', cii: 42, flag: '\u{1F1F5}\u{1F1EA}', lat: -9.19, lng: -75.02 },
  { code: 'EC', name: 'Ecuador', cii: 45, flag: '\u{1F1EA}\u{1F1E8}', lat: -1.83, lng: -78.18 },
  { code: 'BO', name: 'Bolivia', cii: 43, flag: '\u{1F1E7}\u{1F1F4}', lat: -16.29, lng: -63.59 },
  { code: 'UY', name: 'Uruguay', cii: 18, flag: '\u{1F1FA}\u{1F1FE}', lat: -32.52, lng: -55.77 },
  { code: 'PY', name: 'Paraguay', cii: 35, flag: '\u{1F1F5}\u{1F1FE}', lat: -23.44, lng: -58.44 },
  { code: 'CU', name: 'Cuba', cii: 55, flag: '\u{1F1E8}\u{1F1FA}', lat: 21.52, lng: -77.78 },
  { code: 'DO', name: 'Dominican Republic', cii: 34, flag: '\u{1F1E9}\u{1F1F4}', lat: 18.74, lng: -70.16 },
  { code: 'GT', name: 'Guatemala', cii: 44, flag: '\u{1F1EC}\u{1F1F9}', lat: 15.78, lng: -90.23 },
  { code: 'HN', name: 'Honduras', cii: 45, flag: '\u{1F1ED}\u{1F1F3}', lat: 15.20, lng: -86.24 },
  { code: 'SV', name: 'El Salvador', cii: 40, flag: '\u{1F1F8}\u{1F1FB}', lat: 13.79, lng: -88.90 },
  { code: 'PA', name: 'Panama', cii: 30, flag: '\u{1F1F5}\u{1F1E6}', lat: 8.54, lng: -80.78 },
  { code: 'CR', name: 'Costa Rica', cii: 20, flag: '\u{1F1E8}\u{1F1F7}', lat: 9.75, lng: -83.75 },
  { code: 'JM', name: 'Jamaica', cii: 38, flag: '\u{1F1EF}\u{1F1F2}', lat: 18.11, lng: -77.30 },
  { code: 'TT', name: 'Trinidad & Tobago', cii: 32, flag: '\u{1F1F9}\u{1F1F9}', lat: 10.69, lng: -61.22 },
  { code: 'IS', name: 'Iceland', cii: 6, flag: '\u{1F1EE}\u{1F1F8}', lat: 64.96, lng: -19.02 },
  { code: 'LU', name: 'Luxembourg', cii: 8, flag: '\u{1F1F1}\u{1F1FA}', lat: 49.82, lng: 6.13 },
  { code: 'MT', name: 'Malta', cii: 14, flag: '\u{1F1F2}\u{1F1F9}', lat: 35.94, lng: 14.38 },
  { code: 'CY', name: 'Cyprus', cii: 28, flag: '\u{1F1E8}\u{1F1FE}', lat: 35.13, lng: 33.43 },
  { code: 'MD', name: 'Moldova', cii: 44, flag: '\u{1F1F2}\u{1F1E9}', lat: 47.41, lng: 28.37 },
  { code: 'MN', name: 'Mongolia', cii: 32, flag: '\u{1F1F2}\u{1F1F3}', lat: 46.86, lng: 103.85 },
  { code: 'NP', name: 'Nepal', cii: 42, flag: '\u{1F1F3}\u{1F1F5}', lat: 28.39, lng: 84.12 },
  { code: 'LK', name: 'Sri Lanka', cii: 44, flag: '\u{1F1F1}\u{1F1F0}', lat: 7.87, lng: 80.77 },
  { code: 'LA', name: 'Laos', cii: 38, flag: '\u{1F1F1}\u{1F1E6}', lat: 19.86, lng: 102.50 },
  { code: 'KH', name: 'Cambodia', cii: 40, flag: '\u{1F1F0}\u{1F1ED}', lat: 12.57, lng: 104.99 },
  { code: 'FJ', name: 'Fiji', cii: 26, flag: '\u{1F1EB}\u{1F1EF}', lat: -17.71, lng: 178.07 },
  { code: 'PG', name: 'Papua New Guinea', cii: 44, flag: '\u{1F1F5}\u{1F1EC}', lat: -6.31, lng: 143.96 },
  { code: 'MW', name: 'Malawi', cii: 42, flag: '\u{1F1F2}\u{1F1FC}', lat: -13.25, lng: 34.30 },
  { code: 'ZM', name: 'Zambia', cii: 38, flag: '\u{1F1FF}\u{1F1F2}', lat: -13.13, lng: 27.85 },
  { code: 'BW', name: 'Botswana', cii: 22, flag: '\u{1F1E7}\u{1F1FC}', lat: -22.33, lng: 24.68 },
  { code: 'NA', name: 'Namibia', cii: 24, flag: '\u{1F1F3}\u{1F1E6}', lat: -22.96, lng: 18.49 },
  { code: 'MG', name: 'Madagascar', cii: 40, flag: '\u{1F1F2}\u{1F1EC}', lat: -18.77, lng: 46.87 },
  { code: 'RW', name: 'Rwanda', cii: 36, flag: '\u{1F1F7}\u{1F1FC}', lat: -1.94, lng: 29.87 },
  { code: 'CI', name: "Cote d'Ivoire", cii: 42, flag: '\u{1F1E8}\u{1F1EE}', lat: 7.54, lng: -5.55 },
  { code: 'GN', name: 'Guinea', cii: 45, flag: '\u{1F1EC}\u{1F1F3}', lat: 9.95, lng: -9.70 },
  { code: 'SL', name: 'Sierra Leone', cii: 44, flag: '\u{1F1F8}\u{1F1F1}', lat: 8.46, lng: -11.78 },
  { code: 'LR', name: 'Liberia', cii: 43, flag: '\u{1F1F1}\u{1F1F7}', lat: 6.43, lng: -9.43 },
  { code: 'TG', name: 'Togo', cii: 40, flag: '\u{1F1F9}\u{1F1EC}', lat: 8.62, lng: 0.82 },
  { code: 'BJ', name: 'Benin', cii: 38, flag: '\u{1F1E7}\u{1F1EF}', lat: 9.31, lng: 2.32 },
  { code: 'GM', name: 'Gambia', cii: 36, flag: '\u{1F1EC}\u{1F1F2}', lat: 13.44, lng: -15.31 },
  { code: 'MR', name: 'Mauritania', cii: 44, flag: '\u{1F1F2}\u{1F1F7}', lat: 21.01, lng: -10.94 },
  { code: 'DJ', name: 'Djibouti', cii: 42, flag: '\u{1F1E9}\u{1F1EF}', lat: 11.83, lng: 42.59 },
  { code: 'GA', name: 'Gabon', cii: 36, flag: '\u{1F1EC}\u{1F1E6}', lat: -0.80, lng: 11.61 },
  { code: 'GQ', name: 'Equatorial Guinea', cii: 44, flag: '\u{1F1EC}\u{1F1F6}', lat: 1.65, lng: 10.27 },
  { code: 'MU', name: 'Mauritius', cii: 18, flag: '\u{1F1F2}\u{1F1FA}', lat: -20.35, lng: 57.55 },
  { code: 'SC', name: 'Seychelles', cii: 16, flag: '\u{1F1F8}\u{1F1E8}', lat: -4.68, lng: 55.49 },
  { code: 'CV', name: 'Cape Verde', cii: 18, flag: '\u{1F1E8}\u{1F1FB}', lat: 16.00, lng: -24.01 },
];

export function getCountriesByRisk(level: RiskLevel): Country[] {
  return countries.filter(c => getRiskLevel(c.cii) === level);
}

export function getCriticalCountries(): Country[] {
  return countries.filter(c => c.cii >= 76).sort((a, b) => b.cii - a.cii);
}

export function getCountryStats() {
  const critical = countries.filter(c => c.cii >= 76).length;
  const highRisk = countries.filter(c => c.cii >= 56 && c.cii < 76).length;
  const stable = countries.filter(c => c.cii < 56).length;
  return { critical, highRisk, stable, total: countries.length };
}

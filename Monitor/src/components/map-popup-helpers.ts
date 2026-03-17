import type { CableAdvisory, RepairShip } from '@/types';
import { t } from '@/services/i18n';
import { nameToCountryCode } from '@/services/country-geometry';

export function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return t('popups.timeAgo.s', { count: seconds });
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t('popups.timeAgo.m', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('popups.timeAgo.h', { count: hours });
  const days = Math.floor(hours / 24);
  return t('popups.timeAgo.d', { count: days });
}

export function getTimeUntil(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  const ms = d.getTime() - Date.now();
  if (ms <= 0) return t('popups.expired');
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours < 1) return `${Math.floor(ms / (1000 * 60))}${t('popups.timeUnits.m')}`;
  if (hours < 24) return `${hours}${t('popups.timeUnits.h')}`;
  return `${Math.floor(hours / 24)}${t('popups.timeUnits.d')}`;
}

export function getMarketStatus(hours: { open: string; close: string; timezone: string }): 'open' | 'closed' | 'unknown' {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: hours.timezone,
    });
    const currentTime = formatter.format(now);
    const [openH = 0, openM = 0] = hours.open.split(':').map(Number);
    const [closeH = 0, closeM = 0] = hours.close.split(':').map(Number);
    const [currH = 0, currM = 0] = currentTime.split(':').map(Number);

    const openMins = openH * 60 + openM;
    const closeMins = closeH * 60 + closeM;
    const currMins = currH * 60 + currM;

    if (currMins >= openMins && currMins < closeMins) {
      return 'open';
    }
    return 'closed';
  } catch {
    return 'unknown';
  }
}

export function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  try {
    return String.fromCodePoint(...codePoints);
  } catch {
    return '';
  }
}

export const OPERATOR_COUNTRY_MAP: Record<string, string> = {
  usn: 'US', usaf: 'US', usmc: 'US', usa: 'US', uscg: 'US',
  rn: 'GB', raf: 'GB',
  plan: 'CN', plaaf: 'CN',
  vks: 'RU', ruf: 'RU',
  faf: 'FR', fn: 'FR',
  gaf: 'DE',
  iaf: 'IL',
  jmsdf: 'JP',
  rokn: 'KR',
};

export function getOperatorCountryCode(vessel: { operator: string; operatorCountry?: string }): string {
  return (vessel.operatorCountry ? nameToCountryCode(vessel.operatorCountry) : null)
    || OPERATOR_COUNTRY_MAP[vessel.operator]
    || '';
}

export function formatCoord(lat: number, lon: number): string {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(3)}°${ns}, ${Math.abs(lon).toFixed(3)}°${ew}`;
}

export function sanitizeClassToken(value: string | undefined, fallback = 'unknown'): string {
  const token = String(value || '').trim().replace(/[^A-Za-z0-9_-]/g, '').replace(/^[^A-Za-z_]/, '');
  return token || fallback;
}

export function normalizeSeverity(s: string): 'high' | 'medium' | 'low' {
  const v = (s || '').trim().toLowerCase();
  if (v === 'high') return 'high';
  if (v === 'medium') return 'medium';
  return 'low';
}

export function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toString();
}

export function getLocalizedHotspotSubtext(subtext: string): string {
  const slug = subtext
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const key = `popups.hotspotSubtexts.${slug}`;
  const localized = t(key);
  return localized === key ? subtext : localized;
}

export function getLatestCableAdvisory(cableAdvisories: CableAdvisory[], cableId: string): CableAdvisory | undefined {
  const advisories = cableAdvisories.filter((item) => item.cableId === cableId);
  return advisories.reduce<CableAdvisory | undefined>((latest, advisory) => {
    if (!latest) return advisory;
    return advisory.reported.getTime() > latest.reported.getTime() ? advisory : latest;
  }, undefined);
}

export function getPriorityRepairShip(repairShips: RepairShip[], cableId: string): RepairShip | undefined {
  const ships = repairShips.filter((item) => item.cableId === cableId);
  if (ships.length === 0) return undefined;
  const onStation = ships.find((ship) => ship.status === 'on-station');
  return onStation || ships[0];
}

import { lookup } from 'dns/promises';
import { ValidationError } from '@gambit/common';

// Denied CIDRs for SSRF prevention
const DENIED_CIDRS: Array<{ base: number; mask: number }> = [
  { base: cidrBase('10.0.0.0'),     mask: cidrMask(8)  },   // RFC 1918 private
  { base: cidrBase('172.16.0.0'),   mask: cidrMask(12) },   // RFC 1918 private
  { base: cidrBase('192.168.0.0'),  mask: cidrMask(16) },   // RFC 1918 private
  { base: cidrBase('127.0.0.0'),    mask: cidrMask(8)  },   // Loopback
  { base: cidrBase('169.254.0.0'),  mask: cidrMask(16) },   // Link-local / AWS metadata
  { base: cidrBase('100.64.0.0'),   mask: cidrMask(10) },   // Shared address space (RFC 6598)
];

function cidrBase(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) | parseInt(octet, 10), 0) >>> 0;
}

function cidrMask(bits: number): number {
  return (0xffffffff << (32 - bits)) >>> 0;
}

function ipToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) | parseInt(octet, 10), 0) >>> 0;
}

function isIpv4Address(value: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(value);
}

function isDeniedIp(ip: string): boolean {
  const ipInt = ipToInt(ip);
  return DENIED_CIDRS.some(({ base, mask }) => ((ipInt & mask) >>> 0) === base);
}

/**
 * Validates a webhook URL against SSRF attack vectors.
 * Throws ValidationError if the URL is invalid or potentially malicious.
 */
export async function validateWebhookUrl(url: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ValidationError('Invalid webhook URL format', { url });
  }

  // HTTPS only
  if (parsed.protocol !== 'https:') {
    throw new ValidationError('Webhook URL must use HTTPS', { url, protocol: parsed.protocol });
  }

  const hostname = parsed.hostname;

  // Reject localhost variants
  if (
    hostname === 'localhost' ||
    hostname === '::1' ||
    hostname.endsWith('.localhost')
  ) {
    throw new ValidationError('Webhook URL must not target localhost', { url, hostname });
  }

  // Reject raw IPv4 addresses (use hostnames only)
  if (isIpv4Address(hostname)) {
    if (isDeniedIp(hostname)) {
      throw new ValidationError('Webhook URL targets a denied IP range', { url, ip: hostname });
    }
    // Disallow all raw IPs — require DNS names
    throw new ValidationError('Webhook URL must use a DNS hostname, not a raw IP address', { url, hostname });
  }

  // Reject IPv6 literals (basic detection via brackets)
  if (hostname.startsWith('[')) {
    throw new ValidationError('Webhook URL must not use IPv6 literals', { url, hostname });
  }

  // DNS resolution check — resolve and validate each returned address
  let addresses: string[];
  try {
    const result = await lookup(hostname, { all: true, family: 4 });
    addresses = result.map((r) => r.address);
  } catch {
    throw new ValidationError('Webhook URL hostname could not be resolved', { url, hostname });
  }

  for (const ip of addresses) {
    if (isDeniedIp(ip)) {
      throw new ValidationError('Webhook URL resolves to a denied IP range', { url, hostname, ip });
    }
  }
}

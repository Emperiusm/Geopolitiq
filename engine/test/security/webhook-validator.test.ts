import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateWebhookUrl } from '../../src/security/webhook-validator';
import { ValidationError } from '@gambit/common';

// ---------------------------------------------------------------------------
// Mock dns/promises lookup so tests run without actual DNS resolution
// ---------------------------------------------------------------------------
vi.mock('dns/promises', () => ({
  lookup: vi.fn(),
}));

import { lookup } from 'dns/promises';
const mockLookup = vi.mocked(lookup);

beforeEach(() => {
  // Default: resolve to a safe public IP
  mockLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }] as any);
});

afterEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('validateWebhookUrl', () => {
  it('accepts a valid HTTPS URL', async () => {
    await expect(validateWebhookUrl('https://example.com/webhook')).resolves.toBeUndefined();
  });

  it('rejects HTTP (non-HTTPS) URLs', async () => {
    await expect(validateWebhookUrl('http://example.com/webhook'))
      .rejects.toThrow(ValidationError);
  });

  it('rejects localhost', async () => {
    await expect(validateWebhookUrl('https://localhost/webhook'))
      .rejects.toThrow(ValidationError);
  });

  it('rejects localhost subdomain', async () => {
    await expect(validateWebhookUrl('https://evil.localhost/webhook'))
      .rejects.toThrow(ValidationError);
  });

  it('rejects raw IP addresses (any)', async () => {
    // Public IP as raw address should be rejected — require hostname
    await expect(validateWebhookUrl('https://93.184.216.34/webhook'))
      .rejects.toThrow(ValidationError);
  });

  it('rejects 127.0.0.1 (loopback)', async () => {
    await expect(validateWebhookUrl('https://127.0.0.1/webhook'))
      .rejects.toThrow(ValidationError);
  });

  it('rejects private range 10.x.x.x', async () => {
    await expect(validateWebhookUrl('https://10.0.0.1/webhook'))
      .rejects.toThrow(ValidationError);
  });

  it('rejects private range 192.168.x.x', async () => {
    await expect(validateWebhookUrl('https://192.168.1.1/webhook'))
      .rejects.toThrow(ValidationError);
  });

  it('rejects link-local 169.254.x.x (AWS metadata)', async () => {
    await expect(validateWebhookUrl('https://169.254.169.254/latest/meta-data'))
      .rejects.toThrow(ValidationError);
  });

  it('rejects URLs that resolve to a denied private IP', async () => {
    mockLookup.mockResolvedValue([{ address: '10.0.0.5', family: 4 }] as any);
    await expect(validateWebhookUrl('https://internal.example.com/webhook'))
      .rejects.toThrow(ValidationError);
  });

  it('rejects URLs that resolve to a link-local IP via DNS', async () => {
    mockLookup.mockResolvedValue([{ address: '169.254.1.1', family: 4 }] as any);
    await expect(validateWebhookUrl('https://metadata.example.com/webhook'))
      .rejects.toThrow(ValidationError);
  });

  it('rejects URLs with unresolvable hostnames', async () => {
    mockLookup.mockRejectedValue(new Error('ENOTFOUND'));
    await expect(validateWebhookUrl('https://this-does-not-exist.invalid/webhook'))
      .rejects.toThrow(ValidationError);
  });

  it('rejects IPv6 literals', async () => {
    await expect(validateWebhookUrl('https://[::1]/webhook'))
      .rejects.toThrow(ValidationError);
  });
});

import type { FetchResult, ParsedSignal, Claim } from '../pipeline/types';
import type { Parser } from './registry';

interface FccAuthorization {
  id?: string;
  frn?: string;
  callsign?: string;
  applicant?: string;
  applicantName?: string;
  grantDate?: string;
  expirationDate?: string;
  equipmentClass?: string;
  serviceCode?: string;
  serviceDescription?: string;
  radioServiceCode?: string;
  radioServiceDescription?: string;
  fileNumber?: string;
  status?: string;
  contact?: { name?: string; address?: { city?: string; state?: string } };
}

export class FccParser implements Parser {
  sourceId = 'fcc-authorizations';

  parse(raw: FetchResult): ParsedSignal[] {
    const signals: ParsedSignal[] = [];

    for (const item of raw.items) {
      let data: FccAuthorization | { Hits?: { hits?: Array<{ _source?: FccAuthorization }> }; results?: FccAuthorization[] };
      try {
        data = JSON.parse(item.raw);
      } catch {
        continue;
      }

      // Support Elasticsearch-style Hits response, simple results array, or single record
      let records: FccAuthorization[] = [];
      if ((data as any)?.Hits?.hits) {
        records = ((data as any).Hits.hits as Array<{ _source?: FccAuthorization }>)
          .map((h) => h._source)
          .filter((s): s is FccAuthorization => !!s);
      } else if (Array.isArray((data as any).results)) {
        records = (data as any).results as FccAuthorization[];
      } else {
        records = [data as FccAuthorization];
      }

      for (const record of records) {
        const applicant = record.applicantName ?? record.applicant;
        if (!applicant) continue;

        const equipmentType =
          record.radioServiceDescription ?? record.serviceDescription ?? record.equipmentClass ?? 'RF equipment';
        const authDate = record.grantDate ?? item.publishedAt ?? new Date().toISOString();

        const claims: Claim[] = [
          {
            subject: applicant,
            predicate: 'received-fcc-authorization-for',
            object: equipmentType,
            confidence: 0.95,
            meta: {
              frn: record.frn,
              callsign: record.callsign,
              fileNumber: record.fileNumber,
              radioServiceCode: record.radioServiceCode,
            },
          },
        ];

        const tags = ['fcc-authorization'];
        if (record.radioServiceCode) tags.push(`rsc:${record.radioServiceCode}`);
        if (record.callsign) tags.push(record.callsign);

        signals.push({
          headline: `${applicant} received FCC authorization for ${equipmentType}`,
          url: item.url,
          publishedAt: new Date(authDate).toISOString(),
          category: 'fcc-authorization',
          entityNames: [applicant],
          domains: ['telecommunications', 'regulatory'],
          intensity: 0.4,
          confidence: 0.9,
          claims,
          tags,
          rawPayload: {
            frn: record.frn,
            callsign: record.callsign,
            fileNumber: record.fileNumber,
            radioServiceCode: record.radioServiceCode,
            status: record.status,
          },
          meta: {
            frn: record.frn,
            equipmentClass: record.equipmentClass,
            radioServiceCode: record.radioServiceCode,
            grantDate: record.grantDate,
            expirationDate: record.expirationDate,
          },
        });
      }
    }

    return signals;
  }

  validate(signal: ParsedSignal): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!signal.headline) errors.push('Missing required field: headline');
    if (!signal.publishedAt) errors.push('Missing required field: publishedAt');
    return { valid: errors.length === 0, errors };
  }
}

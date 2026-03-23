import type { FetchResult, ParsedSignal, Claim } from '../pipeline/types';
import type { Parser } from './registry';

interface AwardResult {
  id?: string;
  type?: string;
  type_description?: string;
  description?: string;
  total_obligation?: number;
  base_and_all_options_value?: number;
  date_signed?: string;
  period_of_performance_start_date?: string;
  period_of_performance_current_end_date?: string;
  naics_code?: string;
  naics_description?: string;
  product_or_service_code?: string;
  recipient?: {
    recipient_name?: string;
    recipient_uei?: string;
    location?: {
      city_name?: string;
      state_code?: string;
      country_name?: string;
    };
  };
  awarding_agency?: {
    toptier_agency?: { name?: string; abbreviation?: string };
    subtier_agency?: { name?: string; abbreviation?: string };
  };
}

function magnitudeLabel(amount: number): string {
  if (amount >= 1_000_000_000) return 'B';
  if (amount >= 1_000_000) return 'M';
  return 'K';
}

export class UsaSpendingParser implements Parser {
  sourceId = 'usaspending';

  parse(raw: FetchResult): ParsedSignal[] {
    const signals: ParsedSignal[] = [];

    for (const item of raw.items) {
      let data: { results?: AwardResult[]; count?: number } | AwardResult;
      try {
        data = JSON.parse(item.raw);
      } catch {
        continue;
      }

      // Support both array response (search endpoint) and single award
      const awards: AwardResult[] = Array.isArray((data as any).results)
        ? ((data as any).results as AwardResult[])
        : [data as AwardResult];

      for (const award of awards) {
        const recipientName = award.recipient?.recipient_name;
        const agencyName =
          award.awarding_agency?.subtier_agency?.name ??
          award.awarding_agency?.toptier_agency?.name ??
          'Unknown Agency';
        const agencyAbbrev =
          award.awarding_agency?.toptier_agency?.abbreviation ?? agencyName;

        if (!recipientName && !award.description) continue;

        const amount = award.total_obligation ?? award.base_and_all_options_value ?? 0;
        const description = award.description ?? '';
        const naicsCode = award.naics_code;
        const naicsDesc = award.naics_description;
        const periodStart = award.period_of_performance_start_date;
        const periodEnd = award.period_of_performance_current_end_date;
        const dateSigned = award.date_signed ?? item.publishedAt ?? new Date().toISOString();

        const entityNames: string[] = [];
        if (recipientName) entityNames.push(recipientName);
        entityNames.push(agencyName);

        const claims: Claim[] = [];

        if (recipientName) {
          claims.push({
            subject: recipientName,
            predicate: 'received-government-contract-from',
            object: agencyAbbrev,
            confidence: 0.95,
            meta: {
              amount,
              naicsCode,
              periodStart,
              periodEnd,
              awardId: award.id,
            },
          });
        }

        const tags: string[] = ['government-contract'];
        if (naicsCode) tags.push(`naics:${naicsCode}`);
        if (award.product_or_service_code) tags.push(`psc:${award.product_or_service_code}`);

        const headline = recipientName
          ? `${recipientName} wins $${(amount / 1_000_000).toFixed(1)}M contract from ${agencyAbbrev}`
          : `${agencyAbbrev} contract award: ${description.slice(0, 80)}`;

        signals.push({
          headline,
          body: [
            description,
            naicsDesc ? `NAICS: ${naicsCode} — ${naicsDesc}` : undefined,
            periodStart && periodEnd ? `Performance: ${periodStart} to ${periodEnd}` : undefined,
          ]
            .filter(Boolean)
            .join('\n'),
          url: item.url,
          publishedAt: new Date(dateSigned).toISOString(),
          category: 'government-contract',
          entityNames,
          domains: ['defense', 'government-spending'],
          intensity: Math.min(1, amount / 500_000_000),
          confidence: 0.9,
          claims,
          tags,
          financialWeight: {
            amount,
            currency: 'USD',
            magnitude: magnitudeLabel(amount),
          },
          rawPayload: {
            awardId: award.id,
            awardType: award.type,
            naicsCode,
            recipientUei: award.recipient?.recipient_uei,
          },
          meta: {
            naicsCode,
            naicsDescription: naicsDesc,
            periodStart,
            periodEnd,
            agencyAbbrev,
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

import { z } from 'zod';

export const entityListSchema = z.object({
  q: z.string().optional(),
  type: z.string().optional(),
  status: z.string().default('active'),
  risk: z.string().optional(),
  sector: z.string().optional(),
  domain: z.string().optional(),
  tag: z.string().optional(),
  sortBy: z.enum(['updated_at', 'name', 'reality_score']).default('updated_at'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().min(1).max(200).default(50),
  cursor: z.string().optional(),
});

export const entityResolveSchema = z.object({
  query: z.string().min(1),
  type: z.string().optional(),
});

export const entityBatchSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
});

export type EntityListParams = z.infer<typeof entityListSchema>;
export type EntityResolveParams = z.infer<typeof entityResolveSchema>;
export type EntityBatchParams = z.infer<typeof entityBatchSchema>;

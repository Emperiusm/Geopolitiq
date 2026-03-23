import type { ParsedSignal } from '../types';

/**
 * Classify activity — placeholder that passes signals through.
 * Classification is handled by the agent parser when source.polarity === 'classify'.
 * This activity exists as an integration point for future dedicated classification models.
 */
export async function classifyActivity(signals: ParsedSignal[]): Promise<ParsedSignal[]> {
  // Pass-through: classification is done by AgentParser when polarity='classify'
  return signals;
}

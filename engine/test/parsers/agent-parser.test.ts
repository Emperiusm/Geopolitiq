import { describe, it, expect } from 'vitest';
import { renderPrompt, sanitizeInput } from '../../src/parsers/agent-parser';

describe('AgentParser', () => {
  it('renders prompt template with variables', () => {
    const template = 'Extract from: {{raw_text}} in category: {{source_category}}';
    const result = renderPrompt(template, { raw_text: 'test content', source_category: 'patent-filing' });
    expect(result).toBe('Extract from: test content in category: patent-filing');
  });

  it('sanitizes input by stripping processing instructions', () => {
    const input = '<?xml version="1.0"?><doc>content</doc>';
    const result = sanitizeInput(input);
    expect(result).not.toContain('<?xml');
    expect(result).toContain('content');
  });

  it('truncates input to max chars', () => {
    const longInput = 'a '.repeat(10000);
    const result = sanitizeInput(longInput, 100);
    expect(result.length).toBeLessThanOrEqual(110); // 100 + [TRUNCATED] marker
  });

  it('strips DOCTYPE declarations', () => {
    const input = '<!DOCTYPE html><html>content</html>';
    const result = sanitizeInput(input);
    expect(result).not.toContain('DOCTYPE');
  });

  it('handles empty template variables gracefully', () => {
    const template = 'Hello {{name}}!';
    const result = renderPrompt(template, {});
    expect(result).toBe('Hello !');
  });
});

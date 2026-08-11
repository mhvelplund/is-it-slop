import { describe, it, expect } from 'vitest';
import { renderVerdictContent } from './verdict-content';
import type { SlopVerdict } from './types';

const VERDICT: SlopVerdict = {
  verdict: 'likely_ai',
  confidence: 87.6,
  reasoning: 'Overuses em dashes and generic transitions.',
  matchedCriteria: ['em dashes'],
};

describe('renderVerdictContent', () => {
  it('labels a likely_ai verdict and rounds confidence', () => {
    const content = renderVerdictContent(VERDICT, 'anthropic');
    expect(content.label).toBe('Likely AI-generated');
    expect(content.confidenceText).toBe('88% confidence');
    expect(content.reasoning).toBe(VERDICT.reasoning);
    expect(content.attribution).toBe('via Claude Haiku');
  });

  it('labels a likely_human verdict', () => {
    const content = renderVerdictContent({ ...VERDICT, verdict: 'likely_human' }, 'openai');
    expect(content.label).toBe('Likely human-written');
    expect(content.attribution).toBe('via GPT-5.6 Luna');
  });

  it('labels an unclear verdict', () => {
    const content = renderVerdictContent({ ...VERDICT, verdict: 'unclear' }, 'anthropic');
    expect(content.label).toBe('Unclear');
  });
});

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const delta = (a: number, b: number) => ({
  current: a,
  previous: b,
  absoluteChange: a - b,
  percentChange: b === 0 ? null : ((a - b) / b) * 100,
});

// Deterministic context selection. Truncation is explicit; selected text is not evidence of completeness.
export function boundedContext(
  items: Array<{ source: string; content: string }>,
  maxChars: number,
) {
  let remaining = maxChars;
  const selected: Array<{ source: string; content: string; partial: boolean }> =
    [];
  const omitted: string[] = [];
  for (const item of items) {
    const overhead = item.source.length + 30;
    if (remaining <= overhead) {
      omitted.push(item.source);
      continue;
    }
    const content = item.content.slice(0, remaining - overhead);
    selected.push({
      source: item.source,
      content,
      partial: content.length < item.content.length,
    });
    remaining -= content.length + overhead;
  }
  return {
    selected,
    omitted,
    chars: maxChars - remaining,
    estimatedTokens: Math.ceil((maxChars - remaining) / 3),
    tokenEstimateOnly: true,
  };
}

export function comparisonPeriod(startDate: string, endDate: string) {
  const start = Date.parse(startDate);
  const days = Math.round((Date.parse(endDate) - start) / 86400000) + 1;
  return {
    startDate: iso(start - days * 86400000),
    endDate: iso(start - 86400000),
  };
}

export function compareMetrics(
  current: { clicks: number; impressions: number },
  previous: { clicks: number; impressions: number },
) {
  return {
    clicks: delta(current.clicks, previous.clicks),
    impressions: delta(current.impressions, previous.impressions),
  };
}

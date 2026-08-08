import type { JobData } from '../types';

export async function scrapeJasoseol(): Promise<JobData | null> {
  // 1. STRICT GUARD: Check modal URL parameter (?ec=)
  const ec = new URLSearchParams(window.location.search).get('ec');
  if (!ec) {
    console.log('[Jasoseol Scraper] No modal URL parameter (?ec=) found. Skipping.');
    return null;
  }

  // 2. Locate Active Container
  let activeContainer = document.querySelector('[data-current="true"]') as HTMLElement;

  if (!activeContainer) {
    const ecAnchors = Array.from(document.querySelectorAll(`a[href*="ec=${ec}"], [data-ec="${ec}"]`)) as HTMLElement[];
    if (ecAnchors.length > 0) {
      let parent: HTMLElement | null = ecAnchors[0];
      while (parent && parent !== document.body) {
        if (parent.innerText.length > 100) {
          activeContainer = parent;
          break;
        }
        parent = parent.parentElement;
      }
    }
  }

  if (!activeContainer) {
    console.warn(`[Jasoseol Scraper] Could not find modal container for ec=${ec}`);
    return null;
  }

  const text = activeContainer.innerText || '';
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  if (lines.length < 7) {
    console.warn('[Jasoseol Scraper] Insufficient text lines in modal.');
    return null;
  }

  // 3. Company Extraction (Regex or Line 5)
  const companyMatch = text.match(/([가-힠a-zA-Z0-9㈜(주)\s&.\-]+)\s*>/);
  const company = companyMatch ? companyMatch[1].trim() : (lines[5] || '');

  // 4. Title Extraction (Explicitly target Line 6 as requested)
  const title = lines[6] || '';

  // 5. Deadline Extraction
  let deadline = '';
  const allDates = text.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/g);
  if (allDates && allDates.length > 0) {
    const lastDateStr = allDates[allDates.length - 1];
    const match = lastDateStr.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
    if (match) {
      const [_, y, m, d] = match;
      deadline = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }

  return {
    company,
    title,
    deadline,
    url: `https://jasoseol.com/recruit?ec=${ec}`,
    description: '',
    site: 'jasoseol'
  };
}

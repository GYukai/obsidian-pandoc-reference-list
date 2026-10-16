/** Expand only complete citation wikilinks; never consume neighbouring text. */
export function citationReplacementRange(doc: string, start: number, end: number) {
  if (start > 0 && end < doc.length &&
      doc.slice(start - 1, start + 1) === '[[' &&
      doc.slice(end - 1, end + 1) === ']]') {
    const target = doc.slice(start + 1, end - 1);
    // Aliases and embeds retain their native handling.
    if (target.startsWith('@') && !/[|\n\r]/.test(target) && doc[start - 2] !== '!') {
      return { start: start - 1, end: end + 1, linkText: target };
    }
  }
  return { start, end, linkText: undefined as string | undefined };
}

import { citationReplacementRange as range } from './citationRange';

test('replaces both wikilink brackets and preserves the complete target', () => {
  expect(range('前 [[@paper2026]] 后', 3, 15)).toEqual({start:2,end:16,linkText:'@paper2026'});
});
test('ordinary citations remain unchanged', () => {
  expect(range('[@paper]',0,8)).toEqual({start:0,end:8,linkText:undefined});
});
test('adjacent wikilinks do not consume each other', () => {
  expect(range('[[@a]][[@b]]',1,5)).toEqual({start:0,end:6,linkText:'@a'});
  expect(range('[[@a]][[@b]]',7,11)).toEqual({start:6,end:12,linkText:'@b'});
});
test('malformed links, aliases and embeds are not expanded', () => {
  for (const doc of ['[[@a]', '[[@a|alias]]', '![[解说]]']) {
    const start = doc.indexOf('[',doc.indexOf('[')+1), end = doc.lastIndexOf(']');
    expect(range(doc,start,end)).toEqual({start,end,linkText:undefined});
  }
});

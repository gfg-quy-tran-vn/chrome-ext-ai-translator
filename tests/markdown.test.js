import test from 'node:test';
import assert from 'node:assert/strict';

import { renderMarkdown } from '../src/sidepanel/markdown.js';

test('escapes HTML so AI output cannot inject markup', () => {
  const html = renderMarkdown('<img src=x onerror=alert(1)>');
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('&lt;img'));
});

test('renders bold and italic', () => {
  assert.equal(renderMarkdown('**Score: 88%**'), '<p><strong>Score: 88%</strong></p>');
  assert.equal(renderMarkdown('a *word* here'), '<p>a <em>word</em> here</p>');
});

test('renders ATX headings at the right level', () => {
  assert.equal(renderMarkdown('### Potential ATS risks'), '<h3>Potential ATS risks</h3>');
  assert.equal(renderMarkdown('# Title'), '<h1>Title</h1>');
});

test('renders unordered lists', () => {
  const html = renderMarkdown('- one\n- two');
  assert.equal(html, '<ul><li>one</li><li>two</li></ul>');
});

test('renders ordered lists', () => {
  const html = renderMarkdown('1. first\n2. second');
  assert.equal(html, '<ol><li>first</li><li>second</li></ol>');
});

test('renders inline code without formatting its contents', () => {
  assert.equal(renderMarkdown('use `a_b*c`'), '<p>use <code>a_b*c</code></p>');
});

test('renders fenced code blocks with escaped content', () => {
  const html = renderMarkdown('```\n<b>hi</b>\n```');
  assert.equal(html, '<pre><code>&lt;b&gt;hi&lt;/b&gt;</code></pre>');
});

test('renders blockquotes', () => {
  assert.equal(renderMarkdown('> quoted'), '<blockquote><p>quoted</p></blockquote>');
});

test('renders horizontal rules', () => {
  assert.equal(renderMarkdown('---'), '<hr>');
});

test('renders safe links and drops dangerous schemes', () => {
  const safe = renderMarkdown('[site](https://example.com)');
  assert.ok(safe.includes('href="https://example.com"'));
  assert.ok(safe.includes('rel="noopener noreferrer"'));

  const unsafe = renderMarkdown('[x](javascript:alert(1))');
  assert.ok(!unsafe.includes('href'));
  assert.ok(unsafe.includes('[x]'));
});

test('separates paragraphs on blank lines', () => {
  assert.equal(renderMarkdown('one\n\ntwo'), '<p>one</p><p>two</p>');
});

test('keeps hard line breaks inside a paragraph', () => {
  assert.equal(renderMarkdown('one\ntwo'), '<p>one<br>two</p>');
});

test('returns an empty string for empty input', () => {
  assert.equal(renderMarkdown(''), '');
  assert.equal(renderMarkdown(null), '');
});

// Minimal, dependency-free Markdown renderer tuned for AI chat responses.
//
// Security: the input comes from an AI provider and must be treated as
// untrusted. Every piece of text is HTML-escaped before any markup is added,
// and links are restricted to safe schemes, so the output is safe to assign
// to innerHTML.

export function renderMarkdown(source) {
  const text = String(source ?? '').replace(/\r\n?/g, '\n');
  if (!text.trim()) {
    return '';
  }

  const lines = text.split('\n');
  const html = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    // Fenced code block
    if (/^\s*```/.test(line)) {
      const code = [];
      i += 1;
      while (i < lines.length && !/^\s*```/.test(lines[i])) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1; // consume the closing fence (if present)
      html.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }

    // Horizontal rule
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      html.push('<hr>');
      i += 1;
      continue;
    }

    // ATX heading
    const heading = line.match(/^\s*(#{1,6})\s+(.*?)\s*#*\s*$/);
    if (heading) {
      const level = heading[1].length;
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      i += 1;
      continue;
    }

    // Blockquote
    if (/^\s*>/.test(line)) {
      const quote = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        quote.push(lines[i].replace(/^\s*>\s?/, ''));
        i += 1;
      }
      html.push(`<blockquote>${renderMarkdown(quote.join('\n'))}</blockquote>`);
      continue;
    }

    // Unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(inline(lines[i].replace(/^\s*[-*+]\s+/, '')));
        i += 1;
      }
      html.push(`<ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul>`);
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(inline(lines[i].replace(/^\s*\d+\.\s+/, '')));
        i += 1;
      }
      html.push(`<ol>${items.map((item) => `<li>${item}</li>`).join('')}</ol>`);
      continue;
    }

    // Paragraph: gather consecutive lines until a blank line or a new block.
    const paragraph = [];
    while (i < lines.length && lines[i].trim() && !startsBlock(lines[i])) {
      paragraph.push(inline(lines[i]));
      i += 1;
    }
    html.push(`<p>${paragraph.join('<br>')}</p>`);
  }

  return html.join('');
}

function startsBlock(line) {
  return (
    /^\s*```/.test(line) ||
    /^\s*(#{1,6})\s+/.test(line) ||
    /^\s*>/.test(line) ||
    /^\s*[-*+]\s+/.test(line) ||
    /^\s*\d+\.\s+/.test(line) ||
    /^\s*([-*_])(\s*\1){2,}\s*$/.test(line)
  );
}

// Render inline spans. Split on inline-code first so formatting markers inside
// `code` are left untouched, then format the remaining (non-code) segments.
function inline(raw) {
  return escapeHtml(raw)
    .split(/(`[^`]+`)/g)
    .map((segment) => {
      const code = segment.match(/^`([^`]+)`$/);
      if (code) {
        return `<code>${code[1]}</code>`;
      }
      return formatSpans(segment);
    })
    .join('');
}

function formatSpans(segment) {
  return segment
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label, url) => {
      const safe = sanitizeUrl(url);
      return safe
        ? `<a href="${safe}" target="_blank" rel="noopener noreferrer">${label}</a>`
        : match;
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/(^|[\s(])_([^_]+)_(?=$|[\s).,!?])/g, '$1<em>$2</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>');
}

function sanitizeUrl(url) {
  const trimmed = url.trim();
  if (/^(https?:|mailto:)/i.test(trimmed)) {
    return trimmed;
  }
  if (/^(\/|#|\.)/.test(trimmed)) {
    return trimmed;
  }
  return null;
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

import {
  createOptimizedPicture,
  decorateButtons,
  decorateIcons,
  loadScript,
  toCamelCase,
  toClassName,
} from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';
import { render } from './mustache.js';

const DEFAULT_TEMPLATE = `
<div class="mustache-template-card">
  {{#field2}}<span class="mustache-template-badge">{{field2}}</span>{{/field2}}
  {{#field1}}<h3 class="mustache-template-title">{{field1}}</h3>{{/field1}}
  {{#field3}}<div class="mustache-template-description">{{{field3}}}</div>{{/field3}}
  {{#field4}}
    <p class="button-container">
      {{#field5}}
        <a href="{{field5}}" class="button primary mustache-template-cta">{{field4}}</a>
      {{/field5}}
      {{^field5}}
        <button type="button" class="button primary mustache-template-cta">{{field4}}</button>
      {{/field5}}
    </p>
  {{/field4}}
</div>
`;

/**
 * Safely sanitizes rendered HTML using DOMPurify if available or loaded.
 * @param {string} html Unsanitized HTML
 * @returns {Promise<string>} Sanitized HTML
 */
async function sanitizeHTML(html) {
  if (typeof window !== 'undefined' && !window.DOMPurify) {
    try {
      await loadScript(`${window.hlx.codeBasePath}/scripts/dompurify.min.js`);
    } catch (error) {
      // Proceed gracefully if script load fails
    }
  }

  if (typeof window !== 'undefined' && window.DOMPurify) {
    return window.DOMPurify.sanitize(html, {
      ADD_ATTR: ['target', 'rel'],
      ADD_TAGS: ['use', 'symbol'],
    });
  }

  return html;
}

/**
 * Checks if a cell content looks like a Mustache template.
 * @param {string} text Text content of the cell
 * @param {Element} col DOM element of the cell
 * @returns {boolean} True if content appears to be a template
 */
function looksLikeTemplate(text, col) {
  if (col.querySelector('pre > code, code')) return true;
  const link = col.querySelector('a');
  if (link && link.href) {
    const lower = link.href.toLowerCase();
    if (lower.endsWith('.mustache') || lower.endsWith('.html') || lower.endsWith('.txt')) {
      return true;
    }
  }
  return text.includes('{{') && text.includes('}}');
}

/**
 * Extracts a template string from a cell or remote URL.
 * Handles:
 * - Code blocks (<pre><code>)
 * - Remote URLs (.mustache, .html, .txt)
 * - Multiline HTML entered across <p> paragraphs
 * - Rich text HTML DOM elements
 * @param {Element} col DOM element containing template
 * @returns {Promise<string>} Template string
 */
async function extractTemplate(col) {
  // 1. Check for code blocks
  const codeEl = col.querySelector('pre > code, code');
  if (codeEl) {
    return codeEl.textContent.trim();
  }

  // 2. Check for external template URL link
  const linkEl = col.querySelector('a');
  if (linkEl && linkEl.href) {
    const url = linkEl.href;
    const lower = url.toLowerCase();
    if (lower.endsWith('.mustache') || lower.endsWith('.html') || lower.endsWith('.txt')) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          return (await response.text()).trim();
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('Failed to load remote Mustache template:', url, err);
      }
    }
  }

  // 3. Handle multiline text in <p> tags from document authoring or textareas
  const paragraphs = [...col.querySelectorAll('p')];
  const combinedText = paragraphs.length > 0
    ? paragraphs.map((p) => p.textContent).join('\n').trim()
    : col.textContent.trim();

  if (combinedText.includes('<') && combinedText.includes('>')) {
    return combinedText;
  }

  // 4. Handle rich text HTML DOM markup
  if (col.children.length > 0 && col.innerHTML.includes('<') && col.innerHTML.includes('>')) {
    return col.innerHTML.trim();
  }

  return combinedText || col.textContent.trim();
}

/**
 * Extracts structured values (text, html, url, image) from a field cell.
 * @param {Element} col DOM element of property value
 * @returns {Object} Extracted field values
 */
function extractFieldValue(col) {
  const text = col.textContent.trim();
  const html = col.innerHTML.trim();
  const result = {
    text,
    html,
  };

  const link = col.querySelector('a');
  if (link) {
    result.url = link.getAttribute('href') || link.href;
    result.linkText = link.textContent.trim();
  }

  const img = col.querySelector('picture > img, img');
  if (img) {
    result.image = img.getAttribute('src') || img.src;
    result.alt = img.getAttribute('alt') || img.alt || '';
  }

  return result;
}

/**
 * Parses block DOM rows into template and structured context.
 * Supports both key-value pairs and positional rows.
 * @param {Element} block EDS block element
 * @returns {Promise<{template: string, context: Object}>} Parsed template and context
 */
async function parseBlockContent(block) {
  const rows = [...block.children];
  const data = {};
  let template = '';
  const positionalFields = [];

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const cols = [...row.children];

    if (cols.length >= 2) {
      const rawKey = cols[0].textContent.trim();
      const key = toClassName(rawKey);
      const valCol = cols[1];

      if (key === 'template' || key === 'html-template' || key === 'mustache-template') {
        // eslint-disable-next-line no-await-in-loop
        template = await extractTemplate(valCol);
      } else {
        const extracted = extractFieldValue(valCol);
        const camelKey = toCamelCase(key);

        data[key] = extracted.text;
        data[camelKey] = extracted.text;

        if (extracted.html && extracted.html.includes('<')) {
          data[`${camelKey}Html`] = extracted.html;
          data[`${key}-html`] = extracted.html;
        }
        if (extracted.url) {
          data[`${camelKey}Url`] = extracted.url;
          data[`${key}-url`] = extracted.url;
        }
        if (extracted.image) {
          data[`${camelKey}Image`] = extracted.image;
          data[`${key}-image`] = extracted.image;
          data[`${camelKey}Alt`] = extracted.alt;
        }

        positionalFields.push({ key, value: extracted.text, raw: extracted });
      }
    } else if (cols.length === 1) {
      const col = cols[0];
      const text = col.textContent.trim();

      if (!template && positionalFields.length === 0 && looksLikeTemplate(text, col)) {
        // eslint-disable-next-line no-await-in-loop
        template = await extractTemplate(col);
      } else {
        const extracted = extractFieldValue(col);
        const fieldKey = `field${positionalFields.length + 1}`;
        data[fieldKey] = extracted.text;
        if (extracted.html && extracted.html.includes('<')) {
          data[`${fieldKey}Html`] = extracted.html;
        }
        if (extracted.url) {
          data[`${fieldKey}Url`] = extracted.url;
        }
        if (extracted.image) {
          data[`${fieldKey}Image`] = extracted.image;
          data[`${fieldKey}Alt`] = extracted.alt;
        }
        positionalFields.push({ key: fieldKey, value: extracted.text, raw: extracted });
      }
    }
  }

  // Resolve the 5 standard property fields
  const field1 = data.field1
    || data['field-1']
    || data.title
    || data.heading
    || positionalFields[0]?.value
    || '';

  const field2 = data.field2
    || data['field-2']
    || data.subtitle
    || data.badge
    || data.tagline
    || positionalFields[1]?.value
    || '';

  // Field 3: Use rich text HTML if present, else plain text
  const rawField3 = positionalFields[2]?.raw;
  const field3Html = data.field3Html
    || data['field-3-html']
    || data.descriptionHtml
    || (rawField3?.html?.includes('<') ? rawField3.html : '');

  const field3 = field3Html
    || data.field3
    || data['field-3']
    || data.description
    || data.text
    || data.content
    || positionalFields[2]?.value
    || '';

  const field3Text = data.field3
    || data['field-3']
    || data.description
    || positionalFields[2]?.value
    || '';

  // Field 4: CTA Button Label
  const rawField4 = positionalFields[3]?.raw;
  const field4 = data.field4
    || data['field-4']
    || data.ctatext
    || data.ctaText
    || data['cta-text']
    || data.buttontext
    || data.buttonText
    || data['button-text']
    || data.label
    || rawField4?.linkText
    || positionalFields[3]?.value
    || '';

  // Field 5: CTA URL / Destination Link
  const rawField5 = positionalFields[4]?.raw;
  const field5 = data.field5Url
    || rawField5?.url
    || data.ctaurl
    || data.ctaUrl
    || data['cta-url']
    || data.buttonurl
    || data.buttonUrl
    || data['button-url']
    || data.link
    || data.url
    || data.field5
    || data['field-5']
    || positionalFields[4]?.value
    || '';

  const context = {
    ...data,
    field1,
    field2,
    field3,
    field3Text,
    field4,
    field5,
    title: field1,
    heading: field1,
    subtitle: field2,
    badge: field2,
    tagline: field2,
    description: field3,
    descriptionText: field3Text,
    ctaText: field4,
    buttonText: field4,
    ctaUrl: field5,
    buttonUrl: field5,
  };

  return {
    template: template || DEFAULT_TEMPLATE.trim(),
    context,
  };
}

/**
 * Decorates the mustache-template block.
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  // 1. Parse template and context properties
  const { template, context } = await parseBlockContent(block);

  // 2. Render Mustache template
  let renderedHtml = '';
  try {
    renderedHtml = render(template, context);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Mustache rendering error:', error);
    block.innerHTML = `
      <div class="mustache-template-error">
        <p class="mustache-template-error-title">Template Rendering Error</p>
        <pre class="mustache-template-error-message">${error.message}</pre>
      </div>
    `;
    return;
  }

  // 3. Sanitize rendered markup
  const cleanHtml = await sanitizeHTML(renderedHtml);

  // 4. Wrap content and mount in block
  const container = document.createElement('div');
  container.className = 'mustache-template-content';
  container.innerHTML = cleanHtml;

  // 5. Optimize pictures
  container.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });

  // 6. Replace block content with rendered DOM
  block.replaceChildren(container);

  // 7. Decorate standard buttons and icons
  decorateButtons(block);
  decorateIcons(block);
}

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
 * Extracts a template string from a cell or remote URL.
 * @param {Element} col DOM element containing template
 * @returns {Promise<string>} Template string
 */
async function extractTemplate(col) {
  // Check for code blocks
  const codeEl = col.querySelector('pre > code, code');
  if (codeEl) {
    return codeEl.textContent.trim();
  }

  // Check for external template URL link
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

  // If cell has children, check if it was authored as escaped text in a paragraph
  if (col.children.length > 0) {
    const firstP = col.querySelector('p');
    if (firstP && firstP.textContent.includes('<') && firstP.textContent.includes('>')) {
      return firstP.textContent.trim();
    }
    return col.innerHTML.trim();
  }

  return col.textContent.trim();
}

/**
 * Extracts structured values (text, html, url, image) from a field cell.
 * @param {Element} col DOM element of property value
 * @returns {Object} Extracted field values
 */
function extractFieldValue(col) {
  const result = {
    text: col.textContent.trim(),
    html: col.innerHTML.trim(),
  };

  const link = col.querySelector('a');
  if (link) {
    result.url = link.href;
    result.linkText = link.textContent.trim();
  }

  const img = col.querySelector('picture > img, img');
  if (img) {
    result.image = img.src;
    result.alt = img.alt || '';
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
        data[key] = extracted.text;
        data[toCamelCase(key)] = extracted.text;

        if (extracted.html) data[`${toCamelCase(key)}Html`] = extracted.html;
        if (extracted.url) data[`${toCamelCase(key)}Url`] = extracted.url;
        if (extracted.image) data[`${toCamelCase(key)}Image`] = extracted.image;
        if (extracted.alt) data[`${toCamelCase(key)}Alt`] = extracted.alt;

        positionalFields.push({ key, value: extracted.text, raw: extracted });
      }
    } else if (cols.length === 1) {
      const col = cols[0];
      if (!template && positionalFields.length === 0) {
        // eslint-disable-next-line no-await-in-loop
        template = await extractTemplate(col);
      } else {
        const extracted = extractFieldValue(col);
        const fieldKey = `field${positionalFields.length + 1}`;
        data[fieldKey] = extracted.text;
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

  const field3 = data.field3
    || data['field-3']
    || data.description
    || data.text
    || data.content
    || positionalFields[2]?.value
    || '';

  const field4 = data.field4
    || data['field-4']
    || data.ctatext
    || data.ctaText
    || data['cta-text']
    || data.buttontext
    || data.buttonText
    || data['button-text']
    || data.label
    || positionalFields[3]?.value
    || '';

  const field5 = data.field5
    || data['field-5']
    || data.ctaurl
    || data.ctaUrl
    || data['cta-url']
    || data.buttonurl
    || data.buttonUrl
    || data['button-url']
    || data.link
    || data.url
    || positionalFields[4]?.value
    || '';

  const context = {
    ...data,
    field1,
    field2,
    field3,
    field4,
    field5,
    title: field1,
    subtitle: field2,
    badge: field2,
    description: field3,
    ctaText: field4,
    ctaUrl: field5,
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

  // 4. Wrap content and preserve Universal Editor instrumentation
  const container = document.createElement('div');
  container.className = 'mustache-template-content';
  container.innerHTML = cleanHtml;
  moveInstrumentation(block, container);

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

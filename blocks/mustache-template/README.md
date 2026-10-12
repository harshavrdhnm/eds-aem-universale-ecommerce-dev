# Mustache Template Block (`mustache-template`)

The **Mustache Template** block is a flexible, secure, and high-performance Adobe Edge Delivery Services (EDS) component that dynamically renders custom HTML using the **Mustache templating engine** combined with **5 configurable property fields** (plus optional custom properties).

It supports:
- **HTML Mustache Templates** (inline or external `.mustache` / `.html` template URLs)
- **5 Core Property Fields** with semantic aliases (`field1`–`field5` or `title`, `subtitle`, `description`, `ctaText`, `ctaUrl`)
- **Universal Editor (UE)** authoring with full instrumentation retention (`moveInstrumentation`)
- **Document-Based Authoring** (Google Docs & SharePoint tables)
- **Built-in XSS Sanitization** with `DOMPurify`
- **Responsive Layout & Design Tokens** adhering to Adobe Commerce storefront styling
- **Automatic EDS Enhancements** (`createOptimizedPicture`, `decorateButtons`, `decorateIcons`)

---

## 1. The 5 Property Fields

| Field | Template Variable(s) | Typical Use | Description |
| :--- | :--- | :--- | :--- |
| **Field 1** | `{{field1}}` or `{{title}}` | Heading / Title | Primary headline or card title |
| **Field 2** | `{{field2}}` or `{{subtitle}}` or `{{badge}}` | Subtitle / Badge | Secondary eyebrow text, category, or pill badge |
| **Field 3** | `{{field3}}` or `{{description}}` | Body Text / Content | Main copy or description (use `{{{field3}}}` for rich HTML) |
| **Field 4** | `{{field4}}` or `{{ctaText}}` | CTA Label | Call-to-action button or link text |
| **Field 5** | `{{field5}}` or `{{ctaUrl}}` | CTA URL / Link | Target URL (e.g. `/shop`, `https://...`) or image link |

> **Note:** Authors can also supply any additional custom key-value rows (e.g. `price`, `discount`, `author`, `rating`), which are automatically passed into the Mustache data context.

---

## 2. Document-Based Authoring (Word / Google Docs)

### Format A: Key-Value Table (Recommended)

Create a 2-column table with `mustache-template` as the block header:

| Mustache Template | |
| --- | --- |
| template | `<div class="promo-card"><span class="badge">{{badge}}</span><h3>{{title}}</h3><p>{{description}}</p><a href="{{ctaUrl}}" class="button primary">{{ctaText}}</a></div>` |
| title | Summer Flash Sale 2026 |
| subtitle | 48 Hours Only |
| description | Enjoy up to 50% off sitewide on premium apparel and accessories. |
| ctaText | Shop Deals |
| ctaUrl | /promotions/summer-sale |

### Format B: Positional Rows

If keys are omitted, rows are sequentially assigned to `template`, `field1`, `field2`, `field3`, `field4`, and `field5`:

| Mustache Template |
| --- |
| `<div class="card"><h3>{{field1}}</h3><small>{{field2}}</small><p>{{field3}}</p><a href="{{field5}}" class="button">{{field4}}</a></div>` |
| Wireless Headphones Pro |
| Electronics / Audio |
| High-fidelity spatial audio with active noise cancellation. |
| Buy Now |
| /products/wireless-headphones |

### Format C: Default Template (No Template Needed)

If the `template` row is omitted, the block automatically uses the built-in responsive card template:

| Mustache Template | |
| --- | --- |
| title | Spring Collection |
| subtitle | Just Launched |
| description | Explore lightweight, breathable everyday essentials. |
| ctaText | Discover Now |
| ctaUrl | /collections/spring |

---

## 3. Universal Editor Authoring (AEM as Content Source)

When authoring in Adobe Universal Editor with **AEM as a Cloud Service** as the content source:

1. Insert the **Mustache Template** component from the **Blocks** group in the component tree.
2. In the properties panel (sidebar), the following fields are defined in [component-models.json](file:///component-models.json):
   - **HTML Mustache Template (`template`)**: Rendered as a `text-area` input where authors paste custom HTML containing `{{field1}}`–`{{field5}}` or aliases (`{{title}}`, `{{description}}`, `{{ctaUrl}}`, etc.), or an external template file path (`/templates/card.html`).
   - **Field 1 (Title / Heading) (`field1`)**: Primary title text.
   - **Field 2 (Subtitle / Badge) (`field2`)**: Eyebrow badge or secondary subtitle.
   - **Field 3 (Description / Body Text) (`field3`)**: Rich text or plain description (`{{{field3}}}` for raw HTML).
   - **Field 4 (CTA Button Label) (`field4`)**: Button or link text.
   - **Field 5 (CTA URL / Link) (`field5`)**: AEM Content / DAM reference picker for target URL.

> [!TIP]
> **Why might a property not appear in Universal Editor?**
> 1. **Schema Component Type**: Universal Editor uses `"component": "text-area"` for multi-line inputs (`"multiline"` is not recognized).
> 2. **Branch Sync**: Universal Editor loads `component-models.json` from the EDS preview URL (`https://<branch>--<repo>--<owner>.aem.page/component-models.json`). Changes must be pushed to git for Universal Editor to reflect new model fields.
> 3. **Editor Environment**: Ensure you are editing in the **Universal Editor** (`experience.adobe.com/#/@org/aem/editor/canvas/...`) rather than the legacy Touch UI (`editor.html`).

---

## 4. Mustache Syntax Reference

| Syntax | Example | Description |
| :--- | :--- | :--- |
| **Escaped Interpolation** | `{{title}}` | Escapes special HTML characters (`&`, `<`, `>`, `"`, `'`). |
| **Raw / Unescaped HTML** | `{{{description}}}` or `{{&description}}` | Renders raw HTML markup (sanitized with DOMPurify). |
| **Conditional Section** | `{{#ctaUrl}}<a href="{{ctaUrl}}">{{ctaText}}</a>{{/ctaUrl}}` | Renders inner HTML only if `ctaUrl` is truthy and not empty. |
| **Inverted Section** | `{{^field2}}<span>General</span>{{/field2}}` | Renders inner fallback HTML if `field2` is falsy or missing. |
| **Array Loop** | `{{#items}}<li>{{.}}</li>{{/items}}` | Loops over array items. |
| **Comment** | `{{! This is a comment }}` | Hidden in rendered output. |

---

## 5. Practical Examples

### Example 1: E-Commerce Product Teaser
```html
<div class="product-teaser-card">
  <div class="teaser-badge">{{field2}}</div>
  <h2 class="teaser-heading">{{field1}}</h2>
  <div class="teaser-body">{{{field3}}}</div>
  {{#field5}}
    <a href="{{field5}}" class="button primary">{{field4}}</a>
  {{/field5}}
</div>
```

### Example 2: Customer Testimonial
```html
<blockquote class="testimonial-box">
  <p class="testimonial-quote">"{{{field3}}}"</p>
  <footer class="testimonial-author">
    <strong>{{field1}}</strong>
    <span>{{field2}}</span>
  </footer>
  {{#field5}}
    <a href="{{field5}}" class="testimonial-link">{{field4}}</a>
  {{/field5}}
</blockquote>
```

### Example 3: External Template File
Instead of typing the template inside the table cell, link to a remote template file:

| Mustache Template | |
| --- | --- |
| template | [promo-banner.html](/templates/promo-banner.html) |
| title | Member Special Offer |
| subtitle | Exclusive |
| description | Sign in to receive free 2-day delivery on all orders over $75. |
| ctaText | Sign In |
| ctaUrl | /customer/account/login |

---

## 6. Architecture & Best Practices

1. **Self-Contained ES-Module Mustache Engine**:
   - Implemented in [mustache.js](file:///blocks/mustache-template/mustache.js) as a native ES6 module.
   - Zero external CDN dependencies, 100% compliant with strict Content Security Policies (CSP).
2. **Security**:
   - Escapes HTML by default for `{{var}}`.
   - Sanitizes raw HTML output through `DOMPurify` from `scripts/dompurify.min.js`.
3. **Universal Editor Compatibility**:
   - Preserves all Crosswalk `data-aue-*` instrumentation tags via `moveInstrumentation(block, container)`.
4. **Performance**:
   - Auto-enhances all `<img>` tags via `createOptimizedPicture` to ensure high PageSpeed and Core Web Vitals scores.
   - Runs standard EDS button (`decorateButtons`) and icon (`decorateIcons`) pipeline decorators.

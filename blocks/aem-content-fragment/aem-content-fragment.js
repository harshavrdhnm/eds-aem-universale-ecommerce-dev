export default async function decorate(block) {
  // Extract path from block content (Universal Editor structures it as divs)
  let cfPath = '';
  const link = block.querySelector('a');
  if (link) {
    cfPath = link.getAttribute('href');
  } else if (block.firstElementChild && block.firstElementChild.lastElementChild) {
    cfPath = block.firstElementChild.lastElementChild.textContent.trim();
  } else {
    cfPath = block.textContent.trim();
  }

  // Ensure there's a path before trying anything
  if (!cfPath) {
    block.innerHTML = '<div class="aem-cf-error">No Content Fragment Path provided.</div>';
    return;
  }

  // Basic styling wrapper
  block.innerHTML = `
    <div class="aem-cf-container">
      <h3 class="aem-cf-title">AEM Content Fragment</h3>
      <p class="aem-cf-path-info">Source: <code>${cfPath}</code></p>
      <div class="aem-cf-content"><div class="aem-cf-loading">Loading content...</div></div>
    </div>
  `;

  const contentDiv = block.querySelector('.aem-cf-content');

  try {
    // Strip trailing slashes or extensions if authored mistakenly
    cfPath = cfPath.replace(/\.json$/, '').replace(/\.model\.json$/, '');

    // 1) Try AEM Assets HTTP API
    let fetchUrl = cfPath;
    if (cfPath.startsWith('/content/dam/')) {
      fetchUrl = `/api/assets/${cfPath.replace('/content/dam/', '')}.json`;
    } else {
      fetchUrl = `${cfPath}.json`;
    }

    let response = await fetch(fetchUrl);

    // 2) Fallback to standard Sling node JSON
    if (!response.ok) {
      response = await fetch(`${cfPath}.json`);
    }

    // 3) Fallback to _jcr_content child
    if (!response.ok) {
      response = await fetch(`${cfPath}/_jcr_content.json`);
    }

    if (response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();

        // Render JSON nicely for authors to inspect
        const preEl = document.createElement('pre');
        preEl.className = 'aem-cf-json-preview';
        preEl.textContent = JSON.stringify(data, null, 2);

        contentDiv.innerHTML = '';
        contentDiv.append(preEl);
      } else {
        contentDiv.innerHTML = '<div class="aem-cf-error">Target path returned non-JSON content.</div>';
      }
    } else {
      contentDiv.innerHTML = `<div class="aem-cf-error">Failed to fetch. HTTP Status: ${response.status}</div>`;
    }
  } catch (err) {
    contentDiv.innerHTML = `<div class="aem-cf-error">Fetch Error: ${err.message}</div>`;
  }
}

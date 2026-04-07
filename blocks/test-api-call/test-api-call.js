export default async function decorate(block) {
  // Clear the existing block content and show a loading message
  block.innerHTML = '<div class="test-api-call-content"><p class="loading">Loading data from API...</p></div>';

  try {
    // Calling an open source API (DummyJSON quotes API)
    const response = await fetch('https://dummyjson.com/quotes/random');

    if (response.ok) {
      const data = await response.json();

      const quoteEl = document.createElement('blockquote');
      quoteEl.className = 'test-api-call-quote';
      quoteEl.textContent = `"${data.quote}"`;

      const authorEl = document.createElement('p');
      authorEl.className = 'test-api-call-author';
      authorEl.textContent = `- ${data.author}`;

      // Replace the loading message with the fetched data
      block.innerHTML = '';
      const contentWrapper = document.createElement('div');
      contentWrapper.className = 'test-api-call-content';
      contentWrapper.append(quoteEl, authorEl);
      block.append(contentWrapper);
    } else {
      block.innerHTML = '<div class="test-api-call-content"><p class="error">Failed to load data from API.</p></div>';
    }
  } catch (error) {
    block.innerHTML = `<div class="test-api-call-content"><p class="error">Error: ${error.message}</p></div>`;
  }
}

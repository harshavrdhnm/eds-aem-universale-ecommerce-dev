# AEM Content Fragment

A custom block designed to fetch and display the raw JSON structure of an AEM Content Fragment natively in your EDS storefront. 

## Overview
This block allows authors to easily inspect or display the structured data returned from AEM Headless mechanisms. It dynamically detects the best API endpoint to fetch the JSON Payload (e.g., attempting `/api/assets/` then falling back to `.json`).

## Configuration
- **Content Fragment Path**: The absolute path in AEM identifying the content fragment (e.g., `/content/dam/learning-academy/site-content/na/ca/en-ca/showcase/my-teams-no-teams-assigned`).

The component will automatically format and output the resulting JSON property graph onto the page.

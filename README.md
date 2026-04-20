# Edge Delivery Services with AEM Authoring Boilerplate for Commerce , Version 0.6

This project boilerplate is for AEM Authoring with Edge Delivery Services (aka Crosswalk) projects that integrate with Adobe Commerce.

## Documentation

Before using the boilerplate, we recommend you to go through the documentation on <https://experienceleague.adobe.com/developer/commerce/storefront/> and more specifically:

1. [Storefront Developer Tutorial](https://experienceleague.adobe.com/developer/commerce/storefront/get-started/)
1. [AEM Docs](https://www.aem.live/docs/)
1. [AEM Developer Tutorial](https://www.aem.live/developer/ue-tutorial)
1. [The Anatomy of an AEM Project](https://www.aem.live/developer/anatomy-of-a-project)
1. [Web Performance](https://www.aem.live/developer/keeping-it-100)
1. [Markup, Sections, Blocks, and Auto Blocking](https://www.aem.live/developer/markup-sections-blocks)
1. [Product Page Prerendering](https://github.com/adobe-rnd/aem-commerce-prerender)

## Getting Started

Alternatively, you can follow our [Guide](https://experienceleague.adobe.com/developer/commerce/storefront/get-started/) for a more detailed walkthrough.

## Updating Drop-in dependencies
You may need to update one of the drop-in components, or `@adobe/magento-storefront-event-collector` or `@adobe/magento-storefront-events-sdk` to a new version. Besides checking the release notes for any breaking changes, ensure you also execute the `postinstall` script so that the dependenices in your `scripts/__dropins__` directory are updated to the latest build. This should be run immediately after you update the component, for example:

```bash
npm install @dropins/storefront-cart@2.0. # Updates the storefront-cart dependency in node_modules/
npm run postinstall # Copies scripts from node_modules into scripts/__dropins__
```

This is a custom script which copies files out of `node_modules` and into a local directory which EDS can serve. You must manually run `postinstall` due to a design choice in `npm` which does not execute `postinstall` after you install a _specific_ package.

## Changelog

Major changes are described and documented as part of pull requests and tracked via the `changelog` tag. To keep your project up to date, please follow this list:

<https://github.com/hlxsites/aem-boilerplate-commerce/issues?q=label%3Achangelog+is%3Aclosed>

### Product Detail Pages (PDPs)
Since Ocotober 2025, folder mapping is no longer configured by default as its [deprecated](https://www.aem.live/developer/folder-mapping). To keep it easy to start, static product pages have been created as part ot the site template for all products listed on the homepage. 

It is highly recommended to create physical product detail pages in Edge Delivery Services. Use the [AEM Commerce Prerenderer](https://github.com/adobe-rnd/aem-commerce-prerender) to implement a [byom overaly](https://www.aem.live/developer/byom#setup-byom-as-content-overlay) that creates and publishes product detail pages from the product data available in Catalog Service.

## Custom Blocks

### AEM Content Fragment (`aem-content-fragment`)
A custom block designed to fetch and display the raw JSON structure of an AEM Content Fragment natively in your EDS storefront. This is extremely useful for verifying fragment data directly on a page or for building out deeper integrations with your AEM Headless assets. 

**How to use:**
1. In the Universal Editor, drag and drop the **AEM Content Fragment** block onto a page.
2. In the properties panel, paste the absolute path to your AEM content fragment into the **Content Fragment Path** field (e.g., `/content/dam/learning-academy/site-content/na/ca/en-ca/showcase/my-teams-no-teams-assigned`).
3. The component auto-detects the best AEM API mechanism (attempting `/api/assets/...`, falling back to standard Sling nodes `.json`, etc.) to safely fetch and display your formatted JSON data inline.
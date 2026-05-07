---
name: vendure-docs
description: 'Research Vendure documentation using the vendure-docs MCP tools. Use when: looking up Vendure APIs, plugins, entities, resolvers, strategies, services, configuration, migration guides, or any Vendure framework concept. Triggers: "look up vendure", "check vendure docs", "vendure API for", "how does vendure", "vendure plugin", "vendure entity", "vendure strategy", "vendure service", "vendure resolver", "vendure configuration", "vendure guide".'
argument-hint: 'Vendure concept, API, or feature to research (e.g. "custom fields", "payment plugin", "ShippingCalculator")'
---

# Research Vendure Docs

## When to Use

- Answering questions about Vendure APIs, interfaces, and types
- Finding the correct way to implement a plugin, strategy, resolver, or service
- Checking configuration options (e.g. `VendureConfig`, channel settings)
- Understanding lifecycle hooks, events, or job queue behavior
- Looking up entity relations and custom field configuration
- Verifying migration patterns or upgrade guides

## Procedure

### 1. Search First

Use `mcp_vendure-docs_search_docs` with a targeted query.

Key filters:

- `section`: `"Developer Guide"` for how-tos, `"Reference"` for API types/interfaces
- `packageId`: `"core"` for core APIs; omit to search all packages

```
mcp_vendure-docs_search_docs({ query: "<topic>", section: "Reference", limit: 5 })
```

### 2. Fetch Full Page When Needed

If the snippet is insufficient, use `mcp_vendure-docs_get_doc_page` with the URL from the search result.

```
mcp_vendure-docs_get_doc_page({ url: "https://docs.vendure.io/..." })
```

### 3. Apply to Task

- Cite the source URL inline when quoting doc content.
- If the docs show a deprecated API, flag it and find the current alternative.
- Prefer the `current` path in URLs over versioned paths unless the user is on a specific version.

## Common Search Queries

| Goal                | Query                                             |
| ------------------- | ------------------------------------------------- |
| Plugin structure    | `"plugin module decorator"`                       |
| Custom entity       | `"VendureEntity custom entity TypeORM"`           |
| Payment integration | `"PaymentMethodHandler payment plugin"`           |
| Shipping logic      | `"ShippingCalculator ShippingEligibilityChecker"` |
| Custom fields       | `"customFields configuration entity"`             |
| Job queue           | `"JobQueueService job queue worker"`              |
| Events / hooks      | `"EventBus VendureEvent plugin"`                  |
| Auth strategies     | `"AuthenticationStrategy native auth"`            |
| Admin API extension | `"extend schema AdminApiExtension resolver"`      |
| Stock control       | `"StockAllocationStrategy fulfillment"`           |

## Tips

- Vendure docs use TypeScript interfaces extensively — search by interface name for precise hits.
- The `"Reference"` section covers generated API docs; `"Developer Guide"` covers conceptual guides.
- For plugin APIs, search the plugin name plus `"plugin"` (e.g. `"email plugin configuration"`).

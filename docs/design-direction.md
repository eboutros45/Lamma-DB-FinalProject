# Design direction

Lamma uses a cobalt, ink-blue and citrus identity with locally hosted Manrope
variable type. A custom arch mark carries through the favicon, wordmark and
balance-card illustration. The font and its OFL license live in `public/fonts/`.

## Hierarchy

1. Personal balances occupy a solid cobalt surface with large white numerals.
2. Primary actions use clear verbs, blue controls and selective citrus emphasis.
3. Wallets, requests, invoices and receipts have distinct layouts for their jobs.
4. Names and amounts lead each row; statuses use both text and semantic colors.
5. Supporting metadata uses darker muted blue for contrast on pale surfaces.

Desktop has a white sidebar and spacious content grid. Tablet layouts collapse
complex dashboard and wallet columns. Phones use a floating ink-blue navigation
dock, four quick-action tiles, full-width cards and scrollable bottom-sheet forms.
Checkout remains above navigation. Forms retain 16px inputs, safe-area spacing,
visible focus and reduced-motion support.

Core colors in `public/style.css` are ink #17254b, cobalt #2048e6, citrus #e3f58b
and canvas #f3f5fb. Authentication uses a cobalt illustrated hero. Gift wallets,
business balances, customer bill tickets and paid receipts have distinct surfaces.
The presentation update preserves existing workflows, routes and stored data.

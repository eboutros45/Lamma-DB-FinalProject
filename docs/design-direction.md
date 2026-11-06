# Design direction

The revised visual identity emphasizes a substantial mobile finance app:
charcoal navigation and header, warm paper surfaces, and signal-orange balance
cards and primary confirmation actions. It replaces the low-contrast pastel
presentation with a more explicit hierarchy.

## Hierarchy

1. Available balance: largest number, high-contrast orange surface.
2. Money actions: solid icon controls and clear action verbs.
3. Section headings and wallet totals: bold type with distinct scale.
4. Names, statuses, and amounts: readable transaction rows and semantic badges.
5. Supporting metadata: smaller, darker text; never the primary visual element.

Mobile keeps fixed bottom navigation, 46–50px main controls, 16px form inputs,
scrollable bottom sheets and safe-area padding. The home screen uses compact wallet rows; the complete wallets page holds
group-wallet cards, with temporary restaurant wallets organized under Bills. The desktop sidebar follows the same charcoal/orange identity.

Core colors live in `public/style.css`: ink #181c1b, orange #ff7544, paper #eeefe9.
Positive, pending and cancelled states retain separate readable colors and labels.
Reduced-motion preferences remain supported. This pass changes presentation and
copy; financial workflows and stored data stay compatible.

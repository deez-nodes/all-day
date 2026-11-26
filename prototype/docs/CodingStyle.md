## Build Incrementally

Build one verified piece at a time. Never deliver a large untested block.

1. Skeleton — container with a placeholder (e.g., a `chatbox` div with dummy content)
2. Verify it compiles and runs with zero errors
3. Replace the placeholder with the real element
4. Add the function that handles it
5. Add the data store behind it
6. Repeat for the next piece

An alternative flow is fine: full layout first, then fill in each piece bottom-up. Either way, every step must compile clean before the next begins.

## No Comments

Write zero comments — inline, block, or doc — unless explicitly requested.

Code must explain itself through naming. If code seems to need a comment, rename or restructure until it doesn't.

- Good: `calculateMonthlyInvoiceTotal()`
- Bad: `calc() // computes the monthly invoice total`

## Pragmatic Paradigms

Use the clearest, fastest expression for the problem. Plain functions and simple objects are usually enough.

Avoid:

- OOP excess — deep inheritance, factory-factories, abstraction for pattern purity
- Functional excess — long point-free chains, clever composition that hides intent
- Any abstraction that doesn't pay for itself in clarity or reuse; inline it instead

## No Magic Strings

Never inline a raw string literal where a named reference can work.

- Good: `<Thing className={namedClass} />`
- Bad: `<Thing className="cname" />`

Hoist to named constants at the top of the file (or a shared constants module):

- CSS class names
- Object keys and event names
- Route paths and identifiers
- Config values and repeated literals

This buys autocompletion, typo safety, and single-point-of-change.

## Naming

Names carry the full meaning: descriptive, unambiguous, specific. Name constants for what they mean, not what they contain.
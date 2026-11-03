# Style ownership

`global.css` contains only font faces, document defaults and the mobile box-sizing
reset. `index.tsx` applies the `Foundations.module.css` application class to the
existing root element; no wrapper is added.

Foundations owns the shared page geometry, typography, link, input and button
defaults that previously leaked out of page and dialog stylesheets. Its element
selectors are descendants of a local application class. Shared link defaults use `:where()` around the entire selector so they have
zero specificity. Other defaults retain their original specificity, including
the current rule that hides disabled buttons.
Markdown-generated headings and links inherit these same explicit shared rules.

Navigation, section geometry, portal counts and dialogs have shared modules.
Page/component modules own their remaining layout and state rules. Consumers
reference imported CSS Module exports directly. When an element needs classes
from several modules, `classNames` joins the explicit module references; it also
filters optional state classes. It does not resolve class names from strings. Existing DOM IDs remain for
anchors, labels and behavior; CSS uses local `id*` classes instead. CSS Module class names use camelCase,
and consumers access their exports with dot notation.

`styleOrder.ts` imports the original module order before component evaluation,
so sharing a module or navigating to another page does not reorder the cascade.
The new shared modules follow the page modules; their extracted rules preserve
specificity and relative order.

Module rules live in the `components` cascade layer, preserving their existing
specificity and relative order. Former inline declarations use single named
local classes in the later `overrides` layer. This gives explicit component
states precedence over page defaults without repeating selectors or adding
`!important`; existing important declarations continue to win. Layer order is
declared in `global.css` before module styles load. Finite visual
states use classes. Only image URLs, arbitrary title colors, search-result font
sizes, category counts and expanded-record heights use typed `cssVariables`.
Recharts continues to manage its own generated styles.

Sidebar state classes retain the 100ms label reveal and 300ms stacking change.
The width chosen when expanding is retained until the next toggle, matching the
previous imperative behavior. Moderator backdrop visibility is declarative.

Run `npm run lint`, `npm run type-check`, and `npm run build` after edits.

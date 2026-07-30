# Pool Designer workspace update

This package updates only the Pool Designer experience and its bundled Three.js integration.

## Included
- Full-height modelling workspace with the 3D canvas as the primary focus.
- Narrow collapsible desktop control panel.
- Mobile bottom toolbar and bottom-sheet controls.
- Direct `window.postMessage()` bridge to the bundled Three.js designer.
- Three.js state remains authoritative and returns `DESIGN_STATE_CHANGED` messages.
- Auto-started embedded designer with duplicate internal panels minimised.
- Pool, spa, steps, bench, finish, tile, camera, screenshot and share controls.
- Pool Designer-only auto-hiding header and desktop top-edge reveal zone.
- Loading, connection status and iframe error states.
- No Base44 dependency.

## Main changed files
- `pool-designer/index.html`
- `assets/css/site.css`
- `assets/js/designer-page.js`
- `pool-designer-app/frontend/js/designer-bridge.js`
- `pool-designer-app/frontend/js/main.js`
- `pool-designer-app/frontend/css/styles.css`

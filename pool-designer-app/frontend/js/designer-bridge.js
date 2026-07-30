const SOURCE_IN = 'atelier3d-controls';
const SOURCE_OUT = 'atelier3d-designer';
const params = new URLSearchParams(location.search);
const embedded = params.get('embedded') === '1';
let app = null;
let starterPresets = [];

function parentOriginAllowed(origin) {
  return origin === location.origin || origin === 'https://nathandickha.github.io';
}
function post(type, payload = {}) {
  if (window.parent === window) return;
  window.parent.postMessage({ source: SOURCE_OUT, type, payload }, location.origin);
}
function input(id, value, event='change') {
  const el = document.getElementById(id); if (!el) return false;
  el.value = String(value); el.dispatchEvent(new Event(event, { bubbles:true })); return true;
}
function clickData(selector, value) {
  const el = document.querySelector(`${selector}[data-step-wall="${value}"],${selector}[data-step-position="${value}"],${selector}[data-step-shape="${value}"],${selector}[data-step-bench-mode="${value}"]`);
  el?.click(); return !!el;
}
function snapshot() {
  const p = app?.poolParams?.snapshot?.() || app?.poolParams || {};
  const spa = app?.spa;
  return { pool: { ...p, raised: !!p.raised, poolElevation: Number(p.poolElevation || 0) }, spa: { enabled:!!spa, shape:spa?.userData?.spaShape || null, width:spa?.userData?.spaWidth || null, length:spa?.userData?.spaLength || null, height:Number(document.getElementById('spaTopHeight')?.value || 0), x:spa?.position?.x || 0, y:spa?.position?.y || 0 }, camera: { section:!!app?.sectionViewEnabled } };
}
function changed() { post('DESIGN_STATE_CHANGED', snapshot()); }
async function apply(type, payload={}) {
  if (!app) throw new Error('Designer is not ready');
  const isPreview = type === 'PREVIEW_POOL_DIMENSIONS' || type === 'PREVIEW_SPA' || type === 'PREVIEW_POOL_HEIGHT';
  if (!isPreview) post('LOADING_STARTED', { type });
  switch(type) {
    case 'REQUEST_DESIGN_STATE': changed(); break;
    case 'SET_RENDER_PAUSED': app._renderPaused = !!payload.paused; break;
    case 'SET_STARTER_POOL': { const preset = starterPresets.find(x => x.id === payload.id); if (preset) await app.applyStarterPreset(preset); break; }
    case 'SET_POOL_SHAPE': input('shape', payload.shape); break;
    case 'SET_POOL_RAISED': await app.setPoolRaised?.(!!payload.raised); break;
    case 'PREVIEW_POOL_HEIGHT':
    case 'SET_POOL_HEIGHT':
      if (payload.height != null) await app.setPoolElevationHeight?.(Number(payload.height), { captureUndo: type === 'SET_POOL_HEIGHT' });
      break;
    case 'BEGIN_POOL_DIMENSION_PREVIEW':
      if (!app._live?.dragging) {
        if (!app._live.baseParams) app._live.baseParams = { ...(app.poolGroup?.userData?.poolParams || app.poolParams) };
        await app._setLiveDragging?.(true);
      }
      break;
    case 'PREVIEW_POOL_DIMENSIONS':
      if (!app._live?.dragging) {
        if (!app._live.baseParams) app._live.baseParams = { ...(app.poolGroup?.userData?.poolParams || app.poolParams) };
        await app._setLiveDragging?.(true);
      }
      if (payload.length != null) input('length', payload.length, 'input');
      if (payload.width != null) input('width', payload.width, 'input');
      if (payload.shallowDepth != null) input('shallow', payload.shallowDepth, 'input');
      if (payload.deepDepth != null) input('deep', payload.deepDepth, 'input');
      break;
    case 'SET_POOL_DIMENSIONS':
      if (payload.length != null) input('length', payload.length, 'input');
      if (payload.width != null) input('width', payload.width, 'input');
      if (payload.shallowDepth != null) input('shallow', payload.shallowDepth, 'input');
      if (payload.deepDepth != null) input('deep', payload.deepDepth, 'input');
      await app._setLiveDragging?.(false); break;
    case 'RESET_DIMENSIONS': Object.assign(app.poolParams,{length:8,width:4,shallow:1.2,deep:1.8}); app.syncSlidersFromParams(); await app.rebuildPoolForCurrentShape(); break;
    case 'RESET_DESIGN': location.reload(); return;
    case 'PREVIEW_SPA':
    case 'UPDATE_SPA':
      if (payload.enabled != null && payload.enabled !== !!app.spa) document.getElementById('addRemoveSpa')?.click();
      if (payload.shape) input('spaShape', payload.shape);
      if (payload.width != null) input('spaWidth', payload.width, 'input');
      if (payload.length != null) input('spaLength', payload.length, 'input');
      if (payload.height != null) input('spaTopHeight', payload.height, 'input');
      break;
    case 'UPDATE_STEPS':
      if (payload.count != null) input('stepCount', payload.count, 'input');
      if (payload.depth != null) input('stepDepth', payload.depth, 'input');
      if (payload.width != null) input('stepWidth', payload.width, 'input');
      if (payload.wall) clickData('.step-toggle-btn', payload.wall);
      if (payload.position) clickData('.step-toggle-btn', payload.position);
      if (payload.style) clickData('.step-toggle-btn', payload.style);
      break;
    case 'UPDATE_BENCH': if (payload.mode) clickData('.step-toggle-btn', payload.mode); break;
    case 'SET_INTERIOR_TILE':
    case 'SET_WATERLINE_TILE': { const wanted = String(payload.value||'').toLowerCase(); const btn=[...document.querySelectorAll('#tile-grid button')].find(b => (b.textContent||'').toLowerCase().includes(wanted)); btn?.click(); break; }
    case 'SET_CAMERA_VIEW': if (payload.view === 'section') app.setSectionViewEnabled(true); else { if(app.sectionViewEnabled) app.setSectionViewEnabled(false); if(payload.view === 'top'){ app.camera.position.set(0,0,18); app.camera.lookAt(0,0,0); } else app.focusCameraOnPoolShape(); } break;
    case 'RESET_CAMERA': app.focusCameraOnPoolShape(); break;
    case 'SAVE_SCREENSHOT': await app.captureCurrentCanvasScreenshot(); break;
    case 'SET_COPING':
    case 'SET_PAVING': console.info(type, payload.value, 'uses current bundled material system'); break;
    default: console.warn('Unsupported designer command', type, payload);
  }
  if (isPreview) changed(); else { setTimeout(changed, 60); post('LOADING_COMPLETE', { type }); }
}
window.addEventListener('message', event => {
  if (!parentOriginAllowed(event.origin)) return;
  const message = event.data || {}; if (message.source !== SOURCE_IN) return;
  apply(message.type, message.payload).catch(error => post('DESIGN_ERROR', { type:message.type, message:error.message }));
});
export function connectDesignerBridge(poolApp, presets=[]) {
  app = poolApp; starterPresets = presets;
  if (embedded && params.get('externalControls') === '1') document.documentElement.classList.add('external-controls');
  let stateFrame = 0;
  const scheduleChanged = () => {
    if (stateFrame) return;
    stateFrame = requestAnimationFrame(() => { stateFrame = 0; changed(); });
  };
  app.poolParams?.subscribe?.(scheduleChanged);
  app._notifyDesignerStateChanged = scheduleChanged;
  post('DESIGNER_READY', snapshot()); changed();
}

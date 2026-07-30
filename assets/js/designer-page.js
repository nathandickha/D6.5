(() => {
  const frame = document.getElementById('pool-designer-frame');
  const loading = document.getElementById('designerLoading');
  const error = document.getElementById('designerError');
  const status = document.getElementById('controlStatus');
  const controls = document.getElementById('designerControls');
  const accordion = document.getElementById('designerAccordion');
  const targetOrigin = window.location.origin;
  let ready = false;
  let loadAttempted = false;
  let loadFailureTimer = 0;
  let state = {};

  function sendDesignerCommand(type, payload = {}) {
    if (!frame?.contentWindow) return;
    frame.contentWindow.postMessage({ source: 'atelier3d-controls', type, payload }, targetOrigin);
  }
  window.sendDesignerCommand = sendDesignerCommand;

  function numericPayload(group) {
    const payload = {};
    document.querySelectorAll(`[data-group="${group}"]`).forEach(input => payload[input.dataset.key] = Number(input.value));
    return payload;
  }
  function setOutput(key, value, suffix = ' m') {
    const out = document.querySelector(`[data-output="${key}"]`);
    if (!out || value == null) return;
    out.textContent = key === 'stepCount' ? String(value) : `${Number(value).toFixed(key === 'stepDepth' ? 2 : 1)}${suffix}`;
  }

  document.querySelectorAll('[data-group]').forEach(input => {
    input.addEventListener('input', () => {
      const map = { length:'length', width:'width', shallowDepth:'shallowDepth', deepDepth:'deepDepth', count:'stepCount', depth:'stepDepth', spaWidth:'spaWidth', spaLength:'spaLength', height:'spaHeight' };
      setOutput(map[input.dataset.key] || input.dataset.key, input.value);
    });
    input.addEventListener('change', () => {
      const group = input.dataset.group;
      if (group === 'poolDimensions') sendDesignerCommand('SET_POOL_DIMENSIONS', numericPayload(group));
      if (group === 'spa') sendDesignerCommand('UPDATE_SPA', numericPayload(group));
      if (group === 'steps') sendDesignerCommand('UPDATE_STEPS', numericPayload(group));
    });
  });

  document.querySelectorAll('[data-command]').forEach(el => {
    if (el.dataset.group) return;
    const eventName = (el.tagName === 'SELECT' || el.type === 'checkbox') ? 'change' : 'click';
    el.addEventListener(eventName, async () => {
      const type = el.dataset.command;
      let payload = {};
      if (el.dataset.value != null) payload.value = el.dataset.value;
      if (el.dataset.key) payload[el.dataset.key] = el.type === 'checkbox' ? el.checked : el.value;
      if (type === 'SHARE_DESIGN') {
        try { await navigator.clipboard.writeText(window.location.href); status.textContent = 'Design link copied'; } catch (_) { status.textContent = 'Copy unavailable'; }
        return;
      }
      sendDesignerCommand(type, payload);
    });
  });

  // Always present the complete Pool controls when the designer page opens.
  // Browsers may restore a previously collapsed <details> state during navigation,
  // so explicitly reopen the Pool section after the DOM is ready.
  const poolControlsSection = document.getElementById('poolControlsSection');
  if (poolControlsSection) poolControlsSection.open = true;

  const controlTabs = [...document.querySelectorAll('[data-control-tab]')];
  const controlPanels = [...document.querySelectorAll('[data-control-panel]')];
  const lastOpenByPanel = new Map([['pool-spa', 'poolControlsSection']]);

  function activateControlTab(tabName, focusTab = false) {
    controlTabs.forEach(tab => {
      const active = tab.dataset.controlTab === tabName;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
      if (active && focusTab) tab.focus();
    });
    controlPanels.forEach(panel => {
      const active = panel.dataset.controlPanel === tabName;
      panel.hidden = !active;
      panel.classList.toggle('is-active', active);
      if (active) {
        const rememberedId = lastOpenByPanel.get(tabName);
        const remembered = rememberedId ? panel.querySelector(`#${rememberedId}`) : null;
        const first = panel.querySelector('details');
        (remembered || first)?.setAttribute('open', '');
      }
    });
  }

  controlTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activateControlTab(tab.dataset.controlTab));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      let nextIndex = index;
      if (event.key === 'ArrowLeft') nextIndex = (index - 1 + controlTabs.length) % controlTabs.length;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % controlTabs.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = controlTabs.length - 1;
      activateControlTab(controlTabs[nextIndex].dataset.controlTab, true);
    });
  });

  controlPanels.forEach(panel => {
    panel.querySelectorAll('details').forEach(item => item.addEventListener('toggle', () => {
      if (!item.open) return;
      if (item.id) lastOpenByPanel.set(panel.dataset.controlPanel, item.id);
      panel.querySelectorAll('details').forEach(other => { if (other !== item) other.open = false; });
    }));
  });

  activateControlTab('pool-spa');

  document.getElementById('panelCollapse')?.addEventListener('click', () => {
    controls.classList.toggle('is-collapsed');
    document.querySelector('.designer-workspace').style.gridTemplateColumns = controls.classList.contains('is-collapsed') ? '220px minmax(0,1fr) 52px' : '';
  });

  const backdrop = document.getElementById('sheetBackdrop');
  const setSheet = open => { controls.classList.toggle('sheet-open', open); backdrop.hidden = !open; backdrop.classList.toggle('is-open', open); };
  document.getElementById('openMobileControls')?.addEventListener('click', () => setSheet(true));
  backdrop?.addEventListener('click', () => setSheet(false));

  function updateDesignerControls(next = {}) {
    state = next;
    const p = next.pool || next.poolParams || {};
    const s = next.spa || {};
    document.querySelector('[data-summary="shape"]').textContent = p.shape || '—';
    document.querySelector('[data-summary="size"]').textContent = p.length && p.width ? `${Number(p.length).toFixed(1)} × ${Number(p.width).toFixed(1)} m` : '—';
    document.querySelector('[data-summary="depth"]').textContent = p.shallow != null && p.deep != null ? `${Number(p.shallow).toFixed(1)}–${Number(p.deep).toFixed(1)} m` : '—';
    document.querySelector('[data-summary="spa"]').textContent = s.enabled ? (s.shape || 'Enabled') : 'Off';
    const raisedToggle = document.querySelector('[data-command="SET_POOL_RAISED"][data-key="raised"]');
    if (raisedToggle) raisedToggle.checked = !!p.raised;
    const values = { length:p.length, width:p.width, shallowDepth:p.shallow, deepDepth:p.deep, spaWidth:s.width, spaLength:s.length, spaHeight:s.height, stepCount:p.stepCount, stepDepth:p.stepDepth, stepWidth:p.stepWidth };
    Object.entries(values).forEach(([key,value]) => {
      if (value == null) return;
      const input = document.querySelector(`[data-key="${key}"]`) || document.querySelector(`[data-output="${key}"]`)?.parentElement?.querySelector('input');
      if (input) input.value = value;
      setOutput(key, value);
    });
  }

  window.addEventListener('message', event => {
    if (event.source !== frame.contentWindow || event.origin !== targetOrigin) return;
    const message = event.data || {};
    if (message.source !== 'atelier3d-designer') return;
    switch (message.type) {
      case 'DESIGN_LOADING_STARTED':
        loadAttempted = true;
        ready = false;
        error.hidden = true;
        loading.hidden = false;
        loading.classList.remove('is-ready');
        status.textContent = 'Loading designer…';
        clearTimeout(loadFailureTimer);
        loadFailureTimer = window.setTimeout(() => {
          if (loadAttempted && !ready) {
            error.hidden = false;
            loading.hidden = true;
          }
        }, 30000);
        break;
      case 'DESIGNER_READY':
        ready = true;
        clearTimeout(loadFailureTimer);
        loading?.classList.add('is-ready');
        status.textContent = 'Connected';
        sendDesignerCommand('REQUEST_DESIGN_STATE');
        requestAnimationFrame(() => updateRenderPause(false));
        break;
      case 'DESIGN_LOAD_FAILED':
        clearTimeout(loadFailureTimer);
        if (loadAttempted) {
          error.hidden = false;
          loading.hidden = true;
        }
        status.textContent = 'Designer failed to load';
        break;
      case 'DESIGN_STATE_CHANGED': updateDesignerControls(message.payload); status.textContent = 'Saved in model'; break;
      case 'LOADING_STARTED': status.textContent = 'Updating…'; break;
      case 'LOADING_COMPLETE': status.textContent = 'Connected'; break;
      case 'DESIGN_ERROR': status.textContent = 'Update failed'; console.error(message.payload); break;
    }
  });

  // The iframe initially displays the starter-pool chooser, which is a valid
  // idle state. Do not show loading or failure UI until a starter pool is chosen.
  frame?.addEventListener('load', () => {
    error.hidden = true;
    if (!loadAttempted) loading.hidden = true;
  });
  frame?.addEventListener('error', () => {
    if (!loadAttempted) return;
    clearTimeout(loadFailureTimer);
    error.hidden = false;
    loading.hidden = true;
  });

  let previousScrollY = window.scrollY;
  let scrollFrame = 0;
  let scrollEndTimer = 0;
  let workspaceVisible = true;
  let renderPaused = false;
  const header = document.querySelector('.site-header');
  const reveal = document.querySelector('.designer-header-reveal');
  const workspace = document.querySelector('.designer-workspace');
  const showHeader = () => header?.classList.remove('designer-header-hidden');
  const hideHeader = () => { if (!document.querySelector('.main-nav.open')) header?.classList.add('designer-header-hidden'); };

  function updateRenderPause(scrolling = false) {
    const shouldPause = scrolling || !workspaceVisible || document.hidden;
    if (!ready || shouldPause === renderPaused) return;
    renderPaused = shouldPause;
    sendDesignerCommand('SET_RENDER_PAUSED', { paused: shouldPause });
  }

  // Throttle scroll work to one update per painted frame. The header is moved
  // only with transform, so scrolling never resizes the WebGL iframe.
  window.addEventListener('scroll', () => {
    updateRenderPause(true);
    clearTimeout(scrollEndTimer);
    scrollEndTimer = window.setTimeout(() => updateRenderPause(false), 160);
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      const y = window.scrollY;
      if (y < 30) showHeader();
      else if (y > previousScrollY && y > 70) hideHeader();
      else if (y < previousScrollY) showHeader();
      previousScrollY = y;
    });
  }, { passive:true });

  if ('IntersectionObserver' in window && workspace) {
    new IntersectionObserver(([entry]) => {
      workspaceVisible = entry.isIntersecting && entry.intersectionRatio > 0.08;
      updateRenderPause(false);
    }, { threshold:[0, 0.08, 0.25] }).observe(workspace);
  }
  document.addEventListener('visibilitychange', () => updateRenderPause(false));
  reveal?.addEventListener('pointerenter', showHeader);
  header?.addEventListener('focusin', showHeader);
})();

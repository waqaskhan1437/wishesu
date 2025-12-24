import { SECTION_TEMPLATES } from './templates.js';

export function enableEditing(wrapper) {
  const editableSelectors = 'h1,h2,h3,h4,h5,h6,p,a,span,li';
  wrapper.querySelectorAll(editableSelectors).forEach(el => {
    el.setAttribute('contenteditable', 'true');
    el.addEventListener('focus', () => {
      el.style.outline = '2px solid #3b82f6';
      el.style.outlineOffset = '2px';
    });
    el.addEventListener('blur', () => {
      el.style.outline = '';
      el.style.outlineOffset = '';
    });
  });
}

export function attachControls(wrapper) {
  const controls = document.createElement('div');
  controls.className = 'section-controls';
  const upBtn = document.createElement('button');
  upBtn.innerText = '';
  const downBtn = document.createElement('button');
  downBtn.innerText = '';
  const delBtn = document.createElement('button');
  delBtn.innerText = '-';
  const codeBtn = document.createElement('button');
  codeBtn.innerText = '</>';
  controls.appendChild(upBtn);
  controls.appendChild(downBtn);
  controls.appendChild(delBtn);
  controls.appendChild(codeBtn);
  wrapper.appendChild(controls);

  upBtn.addEventListener('click', () => {
    const prev = wrapper.previousElementSibling;
    if (prev) wrapper.parentNode.insertBefore(wrapper, prev);
  });
  downBtn.addEventListener('click', () => {
    const next = wrapper.nextElementSibling;
    if (next) wrapper.parentNode.insertBefore(next, wrapper);
  });
  delBtn.addEventListener('click', () => {
    wrapper.remove();
  });
  codeBtn.addEventListener('click', () => {
    if (wrapper.getAttribute('data-embed')) {
      alert('This section is generated dynamically and cannot be edited via raw HTML.');
      return;
    }
    const clone = wrapper.cloneNode(true);
    const ctrl = clone.querySelector('.section-controls');
    if (ctrl) ctrl.remove();
    const currentHtml = clone.innerHTML.trim();
    const overlay = document.createElement('div');
    overlay.className = 'code-editor-overlay';
    const textarea = document.createElement('textarea');
    textarea.value = currentHtml;
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'actions';
    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'save-btn';
    saveBtn.textContent = 'Save';
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'cancel-btn';
    cancelBtn.textContent = 'Cancel';
    actionsDiv.appendChild(saveBtn);
    actionsDiv.appendChild(cancelBtn);
    overlay.appendChild(textarea);
    overlay.appendChild(actionsDiv);
    document.body.appendChild(overlay);
    saveBtn.addEventListener('click', () => {
      const newMarkup = textarea.value;
      wrapper.innerHTML = newMarkup;
      enableEditing(wrapper);
      attachControls(wrapper);
      overlay.remove();
    });
    cancelBtn.addEventListener('click', () => {
      overlay.remove();
    });
  });
}

export function addSection(key) {
  let html = SECTION_TEMPLATES[key];
  if (!html) return;
  if (key === 'header') {
    const saved = localStorage.getItem('defaultHeader');
    if (saved) {
      html = saved;
    }
  } else if (key === 'footer') {
    const saved = localStorage.getItem('defaultFooter');
    if (saved) {
      html = saved;
    }
  }
  const wrapper = document.createElement('div');
  wrapper.className = 'section-wrapper';
  wrapper.innerHTML = html.trim();
  enableEditing(wrapper);
  attachControls(wrapper);
  document.getElementById('builder-canvas').appendChild(wrapper);
  if (key === 'header') {
    const setDefault = confirm('Set this header as the default header for future pages? OK=Yes / Cancel=No');
    if (setDefault) {
      localStorage.setItem('defaultHeader', wrapper.innerHTML);
    }
  } else if (key === 'footer') {
    const setDefault = confirm('Set this footer as the default footer for future pages? OK=Yes / Cancel=No');
    if (setDefault) {
      localStorage.setItem('defaultFooter', wrapper.innerHTML);
    }
  }
}

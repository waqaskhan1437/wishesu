var PageBuilderState = (function() {
  var state = {
    currentPageType: 'custom',
    editingSection: null,
    editingPageId: null,
    originalPageSlug: '',
    previousEditableSlug: ''
  };

  var undoStack = [];
  var redoStack = [];
  var lastSnapshot = '';

  function takeSnapshot() {
    var canvas = document.getElementById('builder-canvas');
    if (!canvas) return;
    var snap = canvas.innerHTML;
    if (snap === lastSnapshot) return;
    undoStack.push(lastSnapshot);
    if (undoStack.length > 50) undoStack.shift();
    redoStack = [];
    lastSnapshot = snap;
    updateUndoRedoButtons();
  }

  function restoreSnapshot(snap) {
    var canvas = document.getElementById('builder-canvas');
    if (!canvas) return;
    canvas.innerHTML = snap;
    lastSnapshot = snap;
    PageBuilderUtils.updateCanvasEmptyState();
    canvas.querySelectorAll('.section-wrapper').forEach(function(w) {
      PageBuilderUtils.enableEditing(w);
      PageBuilderWidgets.initDynamicWidgets(w);
    });
    updateUndoRedoButtons();
  }

  function updateUndoRedoButtons() {
    var undoBtn = document.getElementById('undo-btn');
    var redoBtn = document.getElementById('redo-btn');
    if (undoBtn) undoBtn.disabled = undoStack.length === 0;
    if (redoBtn) redoBtn.disabled = redoStack.length === 0;
  }

  function undo() {
    if (undoStack.length === 0) return;
    redoStack.push(lastSnapshot);
    restoreSnapshot(undoStack.pop());
  }

  function redo() {
    if (redoStack.length === 0) return;
    undoStack.push(lastSnapshot);
    restoreSnapshot(redoStack.pop());
  }

  function initUndoRedo() {
    var canvas = document.getElementById('builder-canvas');
    if (!canvas) return;
    lastSnapshot = canvas.innerHTML;

    var debounceTimer = null;
    var observer = new MutationObserver(function() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(takeSnapshot, 600);
    });
    observer.observe(canvas, { childList: true, subtree: true, characterData: true, attributes: true });

    var undoBtn = document.getElementById('undo-btn');
    var redoBtn = document.getElementById('redo-btn');
    if (undoBtn) {
      undoBtn.addEventListener('click', function() {
        undo();
      });
    }
    if (redoBtn) {
      redoBtn.addEventListener('click', function() {
        redo();
      });
    }
  }

  function getState() {
    return state;
  }

  function setState(key, value) {
    state[key] = value;
  }

  function getStateValue(key) {
    return state[key];
  }

  function resetState() {
    state = {
      currentPageType: 'custom',
      editingSection: null,
      editingPageId: null,
      originalPageSlug: '',
      previousEditableSlug: ''
    };
  }

  return {
    state: state,
    takeSnapshot: takeSnapshot,
    restoreSnapshot: restoreSnapshot,
    updateUndoRedoButtons: updateUndoRedoButtons,
    undo: undo,
    redo: redo,
    initUndoRedo: initUndoRedo,
    getState: getState,
    setState: setState,
    getStateValue: getStateValue,
    resetState: resetState
  };
})();

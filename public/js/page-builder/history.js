// Page Builder - History (Undo/Redo) Management
// Contains undo/redo functionality with snapshot management

(function(global) {
  'use strict';

  const PageBuilderHistory = {
    undoStack: [],
    redoStack: [],
    lastSnapshot: '',
    isEnabled: false,

    // Initialize history management
    init: function(canvasSelector) {
      var canvas = document.querySelector(canvasSelector);
      if (!canvas) return;
      
      this.lastSnapshot = canvas.innerHTML;
      this.isEnabled = true;
      
      var self = this;
      var debounceTimer = null;
      
      var observer = new MutationObserver(function() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function() {
          self.takeSnapshot();
        }, 600);
      });
      
      observer.observe(canvas, { 
        childList: true, 
        subtree: true, 
        characterData: true, 
        attributes: true 
      });
    },

    // Take a snapshot of current state
    takeSnapshot: function() {
      var canvas = document.querySelector('#builder-canvas');
      if (!canvas) return;
      
      var snap = canvas.innerHTML;
      if (snap === this.lastSnapshot) return;
      
      this.undoStack.push(this.lastSnapshot);
      if (this.undoStack.length > 50) {
        this.undoStack.shift();
      }
      this.redoStack = [];
      this.lastSnapshot = snap;
      this.updateButtons();
    },

    // Restore to a specific snapshot
    restoreSnapshot: function(snap) {
      var canvas = document.querySelector('#builder-canvas');
      if (!canvas) return;
      
      canvas.innerHTML = snap;
      this.lastSnapshot = snap;
      
      // Re-initialize widgets and editing
      if (typeof PageBuilderCore !== 'undefined') {
        PageBuilderCore.updateCanvasEmptyState();
      }
      
      var wrappers = canvas.querySelectorAll('.section-wrapper');
      wrappers.forEach(function(w) {
        if (typeof PageBuilderCore !== 'undefined' && PageBuilderCore.enableEditing) {
          PageBuilderCore.enableEditing(w);
        }
        if (typeof PageBuilderWidgets !== 'undefined') {
          PageBuilderWidgets.initWidgets(w);
        }
      });
      
      this.updateButtons();
    },

    // Undo action
    undo: function() {
      if (this.undoStack.length === 0) return;
      
      var canvas = document.querySelector('#builder-canvas');
      if (!canvas) return;
      
      this.redoStack.push(this.lastSnapshot);
      this.restoreSnapshot(this.undoStack.pop());
    },

    // Redo action
    redo: function() {
      if (this.redoStack.length === 0) return;
      
      var canvas = document.querySelector('#builder-canvas');
      if (!canvas) return;
      
      this.undoStack.push(this.lastSnapshot);
      this.restoreSnapshot(this.redoStack.pop());
    },

    // Update button states
    updateButtons: function() {
      var undoBtn = document.getElementById('undo-btn');
      var redoBtn = document.getElementById('redo-btn');
      
      if (undoBtn) undoBtn.disabled = this.undoStack.length === 0;
      if (redoBtn) redoBtn.disabled = this.redoStack.length === 0;
    },

    // Clear all history
    clear: function() {
      this.undoStack = [];
      this.redoStack = [];
      this.lastSnapshot = '';
      this.updateButtons();
    }
  };

  // Export to global
  global.PageBuilderHistory = PageBuilderHistory;

})(typeof window !== 'undefined' ? window : this);
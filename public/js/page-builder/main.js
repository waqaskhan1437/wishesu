var PageBuilder = (function() {
  function init() {
    initDOMReady();
    initEventListeners();
    initURLParams();
  }

  function initDOMReady() {
    document.addEventListener('DOMContentLoaded', function() {
      PageBuilderUtils.updateCanvasEmptyState();
      PageBuilderAPI.loadCurrentDefaults();
      PageBuilderUI.initSlugSync();
      PageBuilderUI.initFeatureImagePreview();
      PageBuilderUI.initSerpPreview();
      PageBuilderUI.initCodeModal();
      PageBuilderState.initUndoRedo();
    });
  }

  function initEventListeners() {
    document.addEventListener('DOMContentLoaded', function() {
      var saveBtn = document.getElementById('save-btn');
      if (saveBtn) {
        saveBtn.addEventListener('click', function() {
          PageBuilderAPI.savePage()
            .then(function(result) {
              alert('✅ Page saved!\n\nURL: ' + window.location.origin + result.publicUrl);
              PageBuilderAPI.loadCurrentDefaults();
            })
            .catch(function(err) {
              alert('❌ Save failed: ' + err.message);
            });
        });
      }

      var previewBtn = document.getElementById('preview-btn');
      if (previewBtn) {
        previewBtn.addEventListener('click', function() {
          var html = PageBuilderAPI.generatePreviewHtml();
          var title = document.getElementById('seo-title').value || 'Preview';
          var previewWindow = window.open('', 'preview', 'width=1200,height=800');
          previewWindow.document.write(html);
          previewWindow.document.close();
        });
      }

      var loadBtn = document.getElementById('load-btn');
      if (loadBtn) {
        loadBtn.addEventListener('click', function() {
          var name = prompt('Enter page slug to load:');
          if (!name) return;
          PageBuilderAPI.loadExistingPage(name)
            .then(function() {
              alert('✅ Page loaded!');
            })
            .catch(function(err) {
              alert('❌ Error: ' + err.message);
            });
        });
      }

      document.querySelectorAll('.template-card').forEach(function(card) {
        var onclick = card.getAttribute('onclick');
        if (onclick) {
          var match = onclick.match(/loadTemplate\('([^']+)'\)/);
          if (match) {
            card.removeAttribute('onclick');
            card.style.cursor = 'pointer';
            card.addEventListener('click', function() {
              PageBuilderTemplates.loadTemplate(match[1]);
            });
          }
        }
      });

      document.querySelectorAll('.block-btn').forEach(function(btn) {
        var onclick = btn.getAttribute('onclick');
        if (onclick) {
          var match = onclick.match(/addSection\('([^']+)'\)/);
          if (match) {
            btn.removeAttribute('onclick');
            btn.style.cursor = 'pointer';
            btn.addEventListener('click', function() {
              PageBuilderSections.addSection(match[1]);
            });
          }
        }
      });

      document.querySelectorAll('.type-option').forEach(function(opt) {
        var onclick = opt.getAttribute('onclick');
        if (onclick) {
          var match = onclick.match(/setPageType\('([^']+)'\)/);
          if (match) {
            opt.removeAttribute('onclick');
            opt.style.cursor = 'pointer';
            opt.addEventListener('click', function() {
              PageBuilderUI.setPageType(match[1]);
            });
          }
        }
      });

      document.querySelectorAll('.preview-mode-btn').forEach(function(btn) {
        var onclick = btn.getAttribute('onclick');
        if (onclick) {
          var match = onclick.match(/setPreviewMode\('([^']+)'\)/);
          if (match) {
            btn.removeAttribute('onclick');
            btn.addEventListener('click', function() {
              PageBuilderUI.setPreviewMode(match[1]);
            });
          }
        }
      });
    });
  }

  function initURLParams() {
    document.addEventListener('DOMContentLoaded', function() {
      var params = new URLSearchParams(window.location.search);
      var editPage = params.get('edit');
      if (editPage) {
        PageBuilderAPI.loadExistingPage(editPage)
          .then(function() {
            console.log('Loaded page for editing:', editPage);
          })
          .catch(function(err) {
            console.error('Error loading page:', err);
          });
      }
    });
  }

  function initPageBuilder() {
    init();
  }

  return {
    init: initPageBuilder
  };
})();

PageBuilder.init();

var PageBuilderSectionsActions = (function() {
  function moveSection(wrapper, direction) {
    var canvas = document.getElementById('builder-canvas');
    var sections = Array.from(canvas.querySelectorAll('.section-wrapper'));
    var index = sections.indexOf(wrapper);
    var newIndex = index + direction;
    if (newIndex < 0 || newIndex >= sections.length) return;
    if (direction < 0) canvas.insertBefore(wrapper, sections[newIndex]);
    else canvas.insertBefore(sections[newIndex], wrapper);
  }

  function duplicateSection(wrapper) {
    var clone = wrapper.cloneNode(true);
    wrapper.parentNode.insertBefore(clone, wrapper.nextSibling);
    PageBuilderUtils.enableEditing(clone);
    PageBuilderWidgets.initDynamicWidgets(clone);
  }

  function deleteSection(wrapper) {
    if (!confirm('Delete this section?')) return;
    wrapper.remove();
    PageBuilderUtils.updateCanvasEmptyState();
  }

  function editCode(wrapper) {
    PageBuilderState.setState('editingSection', wrapper);
    var content = Array.from(wrapper.children)
      .filter(function(child) { return !child.classList.contains('section-controls'); })
      .map(function(child) { return child.outerHTML; })
      .join('\n');
    document.getElementById('code-editor').value = content;
    window.showModal('code-modal');
  }

  function saveCode() {
    var editingSection = PageBuilderState.getStateValue('editingSection');
    if (!editingSection) return;
    var code = document.getElementById('code-editor').value;
    var preserveCustomCode = document.getElementById('preserve-custom-code').checked;

    editingSection.innerHTML = code + PageBuilderUtils.createControls();
    PageBuilderUtils.enableEditing(editingSection);

    if (!preserveCustomCode) {
      PageBuilderWidgets.initDynamicWidgets(editingSection);
    } else {
      var hasWidgetConfig = editingSection.querySelector('.widget-config');
      if (hasWidgetConfig) {
        PageBuilderWidgets.setupLimitCustomInput(editingSection);
      }
    }

    window.hideModal('code-modal');
    PageBuilderState.setState('editingSection', null);
  }

  function closeCodeModal() {
    window.hideModal('code-modal');
    PageBuilderState.setState('editingSection', null);
  }

  return {
    moveSection: moveSection,
    duplicateSection: duplicateSection,
    deleteSection: deleteSection,
    editCode: editCode,
    saveCode: saveCode,
    closeCodeModal: closeCodeModal
  };
})();

window.PageBuilderActions = PageBuilderSectionsActions;
window.moveSection = function(w, d) { PageBuilderSectionsActions.moveSection(w, d); };
window.duplicateSection = function(w) { PageBuilderSectionsActions.duplicateSection(w); };
window.deleteSection = function(w) { PageBuilderSectionsActions.deleteSection(w); };
window.editCode = function(w) { PageBuilderSectionsActions.editCode(w); };
window.saveCode = function() { PageBuilderSectionsActions.saveCode(); };
window.closeCodeModal = function() { PageBuilderSectionsActions.closeCodeModal(); };

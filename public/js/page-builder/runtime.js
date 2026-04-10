(function() {
  function parseDataEmbed(element, fallback) {
    try {
      return Object.assign({}, fallback, JSON.parse(element.getAttribute('data-embed') || '{}'));
    } catch (_) {
      return fallback;
    }
  }

  function ensureContainerId(element, prefix, index) {
    if (!element.id) {
      element.id = 'pb-' + prefix + '-' + index + '-' + Date.now();
    }
    return element.id;
  }

  function renderProductWidgets() {
    document.querySelectorAll('.product-widget-container[data-embed*="product"]').forEach(function(element, index) {
      if (typeof window.ProductCards === 'undefined') return;

      var config = parseDataEmbed(element, {
        type: 'product',
        limit: 6,
        columns: 3,
        layout: 'grid',
        filter: 'all',
        ids: []
      });
      var containerId = ensureContainerId(element, 'product', index);

      if (config.layout === 'slider' && typeof window.ProductCards.renderSlider === 'function') {
        window.ProductCards.renderSlider(containerId, config);
      } else {
        window.ProductCards.render(containerId, config);
      }
    });
  }

  function renderBlogWidgets() {
    document.querySelectorAll('.blog-widget-container[data-embed*="blog"]').forEach(function(element, index) {
      if (typeof window.BlogCards === 'undefined') return;

      var config = parseDataEmbed(element, {
        type: 'blog',
        limit: 6,
        columns: 3,
        layout: 'grid',
        filter: 'all',
        ids: [],
        showPagination: false
      });
      var containerId = ensureContainerId(element, 'blog', index);

      if (config.layout === 'slider' && typeof window.BlogCards.renderSlider === 'function') {
        window.BlogCards.renderSlider(containerId, config);
      } else {
        window.BlogCards.render(containerId, {
          limit: config.limit,
          columns: config.columns,
          ids: config.ids || [],
          showPagination: config.showPagination === true
        });
      }
    });
  }

  function renderReviewWidgets() {
    document.querySelectorAll('.reviews-widget-container[data-embed*="review"]').forEach(function(element, index) {
      if (typeof window.ReviewsWidget === 'undefined') return;

      var config = parseDataEmbed(element, {
        type: 'review',
        limit: 6,
        columns: 3,
        minRating: 5,
        showAvatar: true
      });
      var containerId = ensureContainerId(element, 'review', index);

      window.ReviewsWidget.render(containerId, config);
    });
  }

  function initFaqToggles() {
    document.querySelectorAll('.faq-toggle').forEach(function(button) {
      if (button.dataset.pbBound === '1') return;
      button.dataset.pbBound = '1';
      button.addEventListener('click', function() {
        button.parentElement.classList.toggle('open');
      });
    });
  }

  function initCountdowns() {
    document.querySelectorAll('.countdown-timer').forEach(function(timer) {
      if (timer.dataset.pbCountdownReady === '1') return;
      timer.dataset.pbCountdownReady = '1';

      var endAttr = timer.getAttribute('data-end');
      var endTime = endAttr ? new Date(endAttr).getTime() : Date.now() + (7 * 24 * 60 * 60 * 1000);

      function update() {
        var diff = Math.max(0, endTime - Date.now());
        var days = Math.floor(diff / 86400000);
        var hours = Math.floor((diff % 86400000) / 3600000);
        var minutes = Math.floor((diff % 3600000) / 60000);
        var seconds = Math.floor((diff % 60000) / 1000);

        var daysElement = timer.querySelector('.countdown-days');
        var hoursElement = timer.querySelector('.countdown-hours');
        var minutesElement = timer.querySelector('.countdown-mins');
        var secondsElement = timer.querySelector('.countdown-secs');

        if (daysElement) daysElement.textContent = String(days).padStart(2, '0');
        if (hoursElement) hoursElement.textContent = String(hours).padStart(2, '0');
        if (minutesElement) minutesElement.textContent = String(minutes).padStart(2, '0');
        if (secondsElement) secondsElement.textContent = String(seconds).padStart(2, '0');

        if (diff <= 0) {
          clearInterval(intervalId);
        }
      }

      update();
      var intervalId = window.setInterval(update, 1000);
    });
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function setForumMessage(messageElement, text, tone) {
    if (!messageElement) return;

    messageElement.style.display = 'block';
    if (tone === 'success') {
      messageElement.style.background = '#d1fae5';
      messageElement.style.color = '#065f46';
    } else {
      messageElement.style.background = '#fee2e2';
      messageElement.style.color = '#991b1b';
    }
    messageElement.textContent = text;
  }

  function renderForumPagination(container, currentPage, totalPages) {
    if (!container) return;
    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    var html = '';

    if (currentPage > 1) {
      html += '<button type="button" data-forum-page="' + (currentPage - 1) + '" style="padding:8px 16px;border:1px solid #e5e7eb;background:white;border-radius:8px;cursor:pointer;">Prev</button>';
    }

    for (var page = 1; page <= totalPages; page += 1) {
      if (page === currentPage) {
        html += '<button type="button" style="padding:8px 16px;border:none;background:#10b981;color:white;border-radius:8px;">' + page + '</button>';
      } else if (page === 1 || page === totalPages || Math.abs(page - currentPage) <= 2) {
        html += '<button type="button" data-forum-page="' + page + '" style="padding:8px 16px;border:1px solid #e5e7eb;background:white;border-radius:8px;cursor:pointer;">' + page + '</button>';
      } else if (Math.abs(page - currentPage) === 3) {
        html += '<span style="padding:8px;">...</span>';
      }
    }

    if (currentPage < totalPages) {
      html += '<button type="button" data-forum-page="' + (currentPage + 1) + '" style="padding:8px 16px;border:1px solid #e5e7eb;background:white;border-radius:8px;cursor:pointer;">Next</button>';
    }

    container.innerHTML = html;
  }

  function buildForumQuestionCard(question) {
    var preview = (question.content || '').substring(0, 150);
    if ((question.content || '').length > 150) {
      preview += '...';
    }

    var questionHref = question.slug
      ? '/forum/' + encodeURIComponent(question.slug)
      : '/forum/question.html?id=' + encodeURIComponent(question.id);

    return '<a class="forum-question-card" href="' + questionHref + '" style="display:block;background:white;border-radius:12px;padding:20px;margin-bottom:15px;box-shadow:0 2px 8px rgba(0,0,0,0.06);text-decoration:none;transition:transform 0.2s,box-shadow 0.2s;">'
      + '<h4 style="color:#1f2937;margin-bottom:8px;font-size:1.1rem;">' + escapeHtml(question.title) + '</h4>'
      + '<p style="color:#6b7280;font-size:0.9rem;line-height:1.5;margin-bottom:10px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">' + escapeHtml(preview) + '</p>'
      + '<div style="display:flex;gap:15px;font-size:0.85rem;color:#9ca3af;">'
      + '<span>By ' + escapeHtml(question.name) + '</span>'
      + '<span>' + (question.reply_count || 0) + ' replies</span>'
      + '</div>'
      + '</a>';
  }

  function setupForumArchive(root) {
    if (root.dataset.pbForumReady === '1') return;
    root.dataset.pbForumReady = '1';

    var questionsContainer = root.querySelector('[data-forum-questions]');
    var paginationContainer = root.querySelector('[data-forum-pagination]');
    var form = root.querySelector('[data-forum-ask-form]');
    var messageElement = root.querySelector('[data-forum-ask-message]');
    var submitButton = root.querySelector('[data-forum-submit]');

    function loadForumQuestions(page) {
      var currentPage = page || 1;
      root.dataset.currentPage = String(currentPage);

      if (questionsContainer) {
        questionsContainer.innerHTML = '<p style="text-align:center;color:#6b7280;padding:20px;">Loading questions...</p>';
      }

      fetch('/api/forum/questions?limit=20&page=' + currentPage)
        .then(function(response) {
          return response.json();
        })
        .then(function(data) {
          var questions = Array.isArray(data.questions) ? data.questions : [];
          var totalPages = data.pagination && data.pagination.totalPages ? data.pagination.totalPages : 1;
          root.dataset.totalPages = String(totalPages);

          if (!questionsContainer) return;

          if (questions.length === 0) {
            questionsContainer.innerHTML = '<p style="text-align:center;color:#6b7280;padding:40px;background:white;border-radius:12px;">No questions yet. Be the first to ask!</p>';
            if (paginationContainer) {
              paginationContainer.innerHTML = '';
            }
            return;
          }

          questionsContainer.innerHTML = '<h3 style="margin-bottom:20px;color:#1f2937;">Recent Questions</h3>' + questions.map(buildForumQuestionCard).join('');
          renderForumPagination(paginationContainer, currentPage, totalPages);
        })
        .catch(function() {
          if (questionsContainer) {
            questionsContainer.innerHTML = '<p style="text-align:center;color:#ef4444;">Error loading questions</p>';
          }
        });
    }

    if (paginationContainer) {
      paginationContainer.addEventListener('click', function(event) {
        var button = event.target.closest('[data-forum-page]');
        if (!button) return;
        var nextPage = parseInt(button.getAttribute('data-forum-page') || '', 10);
        if (!Number.isFinite(nextPage) || nextPage < 1) return;
        loadForumQuestions(nextPage);
      });
    }

    if (form) {
      form.addEventListener('submit', function(event) {
        event.preventDefault();

        var payload = {
          name: (root.querySelector('[data-forum-name]') || {}).value || '',
          email: (root.querySelector('[data-forum-email]') || {}).value || '',
          title: (root.querySelector('[data-forum-title]') || {}).value || '',
          content: (root.querySelector('[data-forum-content]') || {}).value || ''
        };

        payload.name = payload.name.trim();
        payload.email = payload.email.trim();
        payload.title = payload.title.trim();
        payload.content = payload.content.trim();

        if (!payload.name || !payload.email || !payload.title || !payload.content) {
          setForumMessage(messageElement, 'Please fill all fields', 'error');
          return;
        }

        if (submitButton) {
          submitButton.disabled = true;
          submitButton.textContent = 'Submitting...';
        }

        fetch('/api/forum/submit-question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
          .then(function(response) {
            return response.json();
          })
          .then(function(result) {
            if (result.success) {
              setForumMessage(messageElement, 'Question submitted. It will appear after approval.', 'success');
              form.reset();
            } else {
              setForumMessage(messageElement, result.error || 'Failed to submit', 'error');
            }
          })
          .catch(function() {
            setForumMessage(messageElement, 'Error. Please try again.', 'error');
          })
          .finally(function() {
            if (submitButton) {
              submitButton.disabled = false;
              submitButton.textContent = 'Submit Question';
            }
          });
      });
    }

    loadForumQuestions(1);
  }

  function initForumArchives() {
    document.querySelectorAll('[data-page-builder-forum-archive]').forEach(setupForumArchive);
  }

  function init() {
    renderProductWidgets();
    renderBlogWidgets();
    renderReviewWidgets();
    initFaqToggles();
    initCountdowns();
    initForumArchives();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

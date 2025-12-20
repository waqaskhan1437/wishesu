/**
 * ZERO-REFRESH COUNTDOWN SYSTEM
 * - All calculations in browser
 * - No auto-reload
 * - No API calls
 * - Pure client-side
 */

(function() {
  // Initialize countdown for any element with data-countdown
  function initCountdowns() {
    document.querySelectorAll('[data-countdown]').forEach(element => {
      const createdAt = element.dataset.countdownStart;
      const minutes = parseInt(element.dataset.countdownMinutes || 60);
      
      if (!createdAt) {
        return;
      }
      
      startCountdown(element, createdAt, minutes);
    });
  }

  function startCountdown(element, createdAtISO, minutes) {
    const createdTime = new Date(createdAtISO).getTime();
    const deliveryTime = createdTime + (minutes * 60 * 1000);
    
    // Update immediately
    updateCountdown();
    
    // Then update every second
    const interval = setInterval(updateCountdown, 1000);
    
    function updateCountdown() {
      const now = Date.now();
      const remaining = deliveryTime - now;
      
      if (remaining <= 0) {
        clearInterval(interval);
        element.textContent = '⏰ Time Expired - Refresh to check status';
        element.style.color = '#ef4444';
        element.style.fontWeight = 'bold';
        
        // NO AUTO-RELOAD!
        return;
      }
      
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((remaining % (1000 * 60)) / 1000);
      
      // Format: HH:MM:SS or MM:SS
      if (hours > 0) {
        element.textContent = `${hours}:${pad(mins)}:${pad(secs)}`;
      } else {
        element.textContent = `${mins}:${pad(secs)}`;
      }
      
      // Color coding
      if (remaining < 5 * 60 * 1000) {
        element.style.color = '#ef4444'; // Red - less than 5 min
      } else if (remaining < 15 * 60 * 1000) {
        element.style.color = '#f59e0b'; // Orange - less than 15 min
      } else {
        element.style.color = '#10b981'; // Green - plenty of time
      }
    }
  }
  
  function pad(num) {
    return num.toString().padStart(2, '0');
  }
  
  // Initialize on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCountdowns);
  } else {
    initCountdowns();
  }
  
  // Expose for manual initialization
  window.initCountdowns = initCountdowns;
})();

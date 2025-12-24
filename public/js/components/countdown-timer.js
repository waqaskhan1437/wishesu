/**
 * Countdown Timer Component
 * Reusable countdown timer with formatting
 * Replaces shared-timer-utils.js functionality
 */

import { getCountdown, formatCountdown } from '../../utils/date-utils.js';

export class CountdownTimer {
  constructor(targetDate, options = {}) {
    this.targetDate = targetDate;
    this.options = {
      format: options.format || 'full', // full, short, minimal
      onExpire: options.onExpire || null,
      onTick: options.onTick || null,
      autoStart: options.autoStart !== false
    };

    this.interval = null;
    this.element = null;
    this.isRunning = false;
  }

  /**
   * Start countdown
   */
  start() {
    if (this.isRunning) return this;

    this.isRunning = true;
    this._tick();

    this.interval = setInterval(() => {
      this._tick();
    }, 1000);

    return this;
  }

  /**
   * Stop countdown
   */
  stop() {
    if (!this.isRunning) return this;

    this.isRunning = false;

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    return this;
  }

  /**
   * Update countdown
   */
  _tick() {
    const countdown = getCountdown(this.targetDate);

    if (!countdown) {
      this.stop();
      return;
    }

    if (countdown.expired) {
      this.stop();
      if (this.options.onExpire) {
        this.options.onExpire();
      }
      return;
    }

    if (this.options.onTick) {
      this.options.onTick(countdown);
    }

    if (this.element) {
      this._updateDisplay(countdown);
    }
  }

  /**
   * Update display element
   */
  _updateDisplay(countdown) {
    let text = '';

    switch (this.options.format) {
      case 'full':
        text = `${countdown.days}d ${countdown.hours}h ${countdown.minutes}m ${countdown.seconds}s`;
        break;

      case 'short':
        if (countdown.days > 0) {
          text = `${countdown.days}d ${countdown.hours}h`;
        } else if (countdown.hours > 0) {
          text = `${countdown.hours}h ${countdown.minutes}m`;
        } else {
          text = `${countdown.minutes}m ${countdown.seconds}s`;
        }
        break;

      case 'minimal':
        if (countdown.days > 0) {
          text = `${countdown.days}d`;
        } else if (countdown.hours > 0) {
          text = `${countdown.hours}h`;
        } else if (countdown.minutes > 0) {
          text = `${countdown.minutes}m`;
        } else {
          text = `${countdown.seconds}s`;
        }
        break;

      default:
        text = formatCountdown(this.targetDate);
    }

    this.element.textContent = text;
  }

  /**
   * Bind to element
   */
  bindTo(element) {
    this.element = typeof element === 'string'
      ? document.querySelector(element)
      : element;

    if (this.options.autoStart) {
      this.start();
    }

    return this;
  }

  /**
   * Destroy timer
   */
  destroy() {
    this.stop();
    this.element = null;
  }

  /**
   * Static helper
   */
  static create(targetDate, element, options = {}) {
    const timer = new CountdownTimer(targetDate, options);
    if (element) {
      timer.bindTo(element);
    }
    return timer;
  }
}

export default CountdownTimer;

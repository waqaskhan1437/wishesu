/**
 * Review card builder.
 */

import { scrollToPlayer, setPlayerSource, showHighlight } from './reviews-player.js';

function applyReadMore(card, reviewText) {
  const words = reviewText.split(' ');
  const maxWords = 60;

  if (words.length <= maxWords) return;

  const shortText = words.slice(0, maxWords).join(' ') + '...';
  const fullText = reviewText;

  const textDiv = card.querySelector('.review-text') || document.createElement('div');
  textDiv.className = 'review-text';

  const textSpan = document.createElement('span');
  textSpan.textContent = shortText;
  textDiv.innerHTML = '';
  textDiv.appendChild(textSpan);

  const readMoreBtn = document.createElement('button');
  readMoreBtn.textContent = 'Read More';
  readMoreBtn.style.cssText = 'color:#667eea;background:none;border:none;cursor:pointer;font-weight:600;margin-left:6px;text-decoration:underline';

  let expanded = false;
  readMoreBtn.onclick = (e) => {
    e.stopPropagation();
    expanded = !expanded;
    textSpan.textContent = expanded ? fullText : shortText;
    readMoreBtn.textContent = expanded ? 'Read Less' : 'Read More';
  };

  textDiv.appendChild(readMoreBtn);

  if (!card.querySelector('.review-text')) {
    card.appendChild(textDiv);
  }
}

export function buildReviewCard(review) {
  const temp = document.createElement('div');
  temp.innerHTML = window.ReviewsWidget.renderReview(review, true);
  return temp.firstElementChild;
}

export function appendPortfolioRow(card, review) {
  const portfolioVideoUrl = (review.delivered_video_url || '').toString().trim();
  const canWatch = !!portfolioVideoUrl && Number(review.show_on_product) === 1;
  if (!canWatch) return;

  const portfolioRow = document.createElement('div');
  portfolioRow.className = 'review-portfolio-row';
  portfolioRow.style.cssText = 'display:flex; align-items:center; gap:16px; margin-top:16px; padding-top:16px; border-top:1px solid #f3f4f6; flex-wrap:wrap;';

  const thumbContainer = document.createElement('div');
  thumbContainer.style.cssText = 'position:relative; width:260px; height:146px; flex-shrink:0; cursor:pointer; border-radius:10px; overflow:hidden; box-shadow:0 4px 6px rgba(0,0,0,0.1); transition:transform 0.2s, box-shadow 0.2s; background:#000;';
  thumbContainer.setAttribute('role', 'button');
  thumbContainer.setAttribute('tabindex', '0');
  thumbContainer.setAttribute('aria-label', 'Watch review video');

  const videoThumb = document.createElement('video');
  videoThumb.src = portfolioVideoUrl;
  videoThumb.preload = 'metadata';
  videoThumb.style.cssText = 'width:100%; height:100%; object-fit:cover;';
  videoThumb.muted = true;
  videoThumb.setAttribute('aria-hidden', 'true');
  videoThumb.setAttribute('tabindex', '-1');
  thumbContainer.appendChild(videoThumb);

  const reviewBadge = document.createElement('div');
  reviewBadge.textContent = 'Review';
  reviewBadge.style.cssText = 'position:absolute; top:8px; right:8px; background:rgba(16,185,129,0.95); color:white; padding:5px 12px; border-radius:6px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; box-shadow:0 2px 6px rgba(0,0,0,0.3);';
  thumbContainer.appendChild(reviewBadge);

  const playIcon = document.createElement('div');
  playIcon.innerHTML = 'Play';
  playIcon.style.cssText = 'position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); background:rgba(0,0,0,0.75); color:white; width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:16px; padding-left:3px; transition:background 0.2s;';
  playIcon.setAttribute('aria-hidden', 'true');
  thumbContainer.appendChild(playIcon);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = 'Watch Video';
  btn.style.cssText = 'background:#111827; color:white; border:0; padding:12px 16px; border-radius:8px; cursor:pointer; font-weight:600; font-size:15px; transition:background 0.2s;';

  const onWatch = () => {
    showHighlight(review);
    scrollToPlayer();
    setPlayerSource(portfolioVideoUrl, null);
  };

  thumbContainer.addEventListener('mouseenter', () => {
    thumbContainer.style.transform = 'scale(1.03)';
    thumbContainer.style.boxShadow = '0 6px 12px rgba(0,0,0,0.15)';
    playIcon.style.background = 'rgba(0,0,0,0.85)';
  });

  thumbContainer.addEventListener('mouseleave', () => {
    thumbContainer.style.transform = 'scale(1)';
    thumbContainer.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
    playIcon.style.background = 'rgba(0,0,0,0.75)';
  });

  btn.addEventListener('mouseenter', () => {
    btn.style.background = '#1f2937';
  });

  btn.addEventListener('mouseleave', () => {
    btn.style.background = '#111827';
  });

  thumbContainer.addEventListener('click', onWatch);
  thumbContainer.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onWatch();
    }
  });
  btn.addEventListener('click', onWatch);

  portfolioRow.appendChild(thumbContainer);
  portfolioRow.appendChild(btn);
  card.appendChild(portfolioRow);
}

export function enhanceReviewCard(card, review) {
  const reviewText = review.review_text || review.comment || '';
  if (reviewText) {
    applyReadMore(card, reviewText);
  }

  appendPortfolioRow(card, review);
}

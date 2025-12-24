/**
 * Review pagination helpers.
 */

export function createPaginationControls(totalPages, currentPage, onPageChange, scrollTarget) {
  if (totalPages <= 1) return null;

  const pag = document.createElement('div');
  pag.style.cssText = 'display:flex;justify-content:center;gap:12px;margin-top:30px;padding:20px 0;';

  const prev = document.createElement('button');
  prev.type = 'button';
  prev.textContent = 'Prev';
  prev.setAttribute('aria-label', 'Previous reviews page');
  prev.disabled = currentPage === 1;
  prev.style.cssText = `padding:10px 20px;background:${currentPage===1?'#94a3b8':'#0f172a'};color:#fff;border:none;border-radius:8px;cursor:${currentPage===1?'not-allowed':'pointer'};font-weight:600`;
  if (currentPage > 1) prev.onclick = () => { onPageChange(currentPage - 1); scrollTarget.scrollIntoView({behavior:'smooth'}); };
  pag.appendChild(prev);

  const info = document.createElement('span');
  info.textContent = `Page ${currentPage} of ${totalPages}`;
  info.style.cssText = 'color:#666;font-weight:600;padding:10px;display:flex;align-items:center;';
  pag.appendChild(info);

  const next = document.createElement('button');
  next.type = 'button';
  next.textContent = 'Next';
  next.setAttribute('aria-label', 'Next reviews page');
  next.disabled = currentPage === totalPages;
  next.style.cssText = `padding:10px 20px;background:${currentPage===totalPages?'#94a3b8':'#0f172a'};color:#fff;border:none;border-radius:8px;cursor:${currentPage===totalPages?'not-allowed':'pointer'};font-weight:600`;
  if (currentPage < totalPages) next.onclick = () => { onPageChange(currentPage + 1); scrollTarget.scrollIntoView({behavior:'smooth'}); };
  pag.appendChild(next);

  return pag;
}

/**
 * Shared Frontend Utilities - Use via <script src="/js/utils/helpers.js"></script>
 */
function escapeHtml(t){if(!t)return'';const d=document.createElement('div');d.textContent=t;return d.innerHTML;}
function formatDate(d){if(!d)return'';return new Date(d).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'});}
function formatDateTime(d){if(!d)return'';return new Date(d).toLocaleString('en-US',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});}
function formatCurrency(a,c='USD'){return new Intl.NumberFormat('en-US',{style:'currency',currency:c}).format(a||0);}
function truncate(t,m=50){if(!t||t.length<=m)return t||'';return t.substring(0,m)+'...';}
function debounce(f,w=300){let t;return function(...a){clearTimeout(t);t=setTimeout(()=>f(...a),w);};}
async function copyToClipboard(t){try{await navigator.clipboard.writeText(t);return true;}catch(e){return false;}}
window.escapeHtml=escapeHtml;window.formatDate=formatDate;window.formatDateTime=formatDateTime;
window.formatCurrency=formatCurrency;window.truncate=truncate;window.debounce=debounce;window.copyToClipboard=copyToClipboard;

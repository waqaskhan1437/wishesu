/**
 * Forum render scripts.
 */

export function archiveScript() {
  return `const btn=document.getElementById('forum-submit');const msg=document.getElementById('forum-msg');const search=document.getElementById('forum-search');const list=document.getElementById('forum-list');btn.addEventListener('click',async()=>{msg.textContent='';const payload={name:document.getElementById('forum-name').value.trim(),email:document.getElementById('forum-email').value.trim(),title:document.getElementById('forum-title').value.trim(),body:document.getElementById('forum-body').value.trim()};try{const res=await fetch('/api/forum/topic/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const data=await res.json();if(!data.success)throw new Error(data.error||'Failed to submit');msg.style.color='#047857';msg.textContent='Submitted! Waiting for admin approval.';document.getElementById('forum-title').value='';document.getElementById('forum-body').value='';}catch(e){msg.style.color='#b91c1c';msg.textContent=e.message||'Failed to submit';}});if(search&&list){search.addEventListener('input',()=>{const q=search.value.trim().toLowerCase();const cards=list.querySelectorAll('.topic-card');cards.forEach(c=>{const hay=(c.getAttribute('data-search')||'').toLowerCase();c.style.display=!q||hay.includes(q)?'':'none';});});}`;
}

export function topicScript(topicSlug) {
  const slug = JSON.stringify(topicSlug || '');
  return `const btn=document.getElementById('reply-submit');const msg=document.getElementById('reply-msg');btn.addEventListener('click',async()=>{msg.textContent='';const payload={name:document.getElementById('reply-name').value.trim(),email:document.getElementById('reply-email').value.trim(),body:document.getElementById('reply-body').value.trim(),slug:${slug}};try{const res=await fetch('/api/forum/reply/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const data=await res.json();if(!data.success)throw new Error(data.error||'Failed to submit');msg.style.color='#047857';msg.textContent='Reply submitted for approval.';document.getElementById('reply-body').value='';}catch(e){msg.style.color='#b91c1c';msg.textContent=e.message||'Failed to submit';}});`;
}

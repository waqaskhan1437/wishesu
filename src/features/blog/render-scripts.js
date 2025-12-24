/**
 * Blog render scripts.
 */

export function submitScript() {
  return `const btn=document.getElementById('blog-submit');const msg=document.getElementById('blog-msg');btn.addEventListener('click',async()=>{msg.textContent='';const payload={name:document.getElementById('blog-name').value.trim(),email:document.getElementById('blog-email').value.trim(),title:document.getElementById('blog-title').value.trim(),body:document.getElementById('blog-body').value.trim()};try{const res=await fetch('/api/blog/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const data=await res.json();if(!data.success)throw new Error(data.error||'Failed to submit');msg.style.color='#047857';msg.textContent='Submitted! Waiting for admin approval.';document.getElementById('blog-title').value='';document.getElementById('blog-body').value='';}catch(e){msg.style.color='#b91c1c';msg.textContent=e.message||'Failed to submit';}});`;
}

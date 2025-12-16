import { AutoMigration } from "./core/auto-migration";
import { Container } from "./core/container";
import { Router } from "./core/router";
import { loadModules } from "./modules/loader";

let initialized = false;

const ADMIN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Product Admin</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
:root {
  --primary: #4f46e5; --primary-dark: #4338ca; --bg: #f9fafb; --card: #fff; --border: #e5e7eb;
  --text: #1f2937; --text-light: #6b7280; --success: #10b981; --error: #ef4444;
}
body { font-family: -apple-system, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; }
.container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
h1 { margin-bottom: 2rem; font-size: 2rem; }
.card { background: var(--card); border-radius: 12px; padding: 2rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.progress-bar { height: 4px; background: var(--border); border-radius: 2px; margin-bottom: 2rem; }
.progress-fill { height: 100%; background: var(--primary); transition: width 0.3s; }
.tabs { display: flex; gap: 0.5rem; margin-bottom: 2rem; border-bottom: 2px solid var(--border); }
.tab { padding: 1rem 1.5rem; background: none; border: none; border-bottom: 3px solid transparent; 
       cursor: pointer; font-weight: 500; color: var(--text-light); transition: all 0.2s; }
.tab:hover { color: var(--text); background: rgba(79,70,229,0.05); }
.tab.active { color: var(--primary); border-bottom-color: var(--primary); }
.tab.completed { color: var(--success); }
.tab-content { display: none; }
.tab-content.active { display: block; animation: fadeIn 0.3s; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.form-group { margin-bottom: 1.5rem; }
label { display: block; margin-bottom: 0.5rem; font-size: 0.875rem; font-weight: 500; }
input, textarea, select { width: 100%; padding: 0.75rem; border: 1px solid var(--border); 
                           border-radius: 8px; font-size: 0.875rem; font-family: inherit; }
input:focus, textarea:focus, select:focus { outline: none; border-color: var(--primary); }
input[type="checkbox"], input[type="radio"] { width: auto; margin-right: 0.5rem; }
small { color: var(--text-light); font-size: 0.75rem; display: block; margin-top: 0.25rem; }
.btn { padding: 0.75rem 1.5rem; border: none; border-radius: 8px; font-weight: 500; 
       cursor: pointer; transition: all 0.2s; background: var(--border); }
.btn-primary { background: var(--primary); color: white; }
.btn-primary:hover { background: var(--primary-dark); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.tab-nav { display: flex; justify-content: space-between; margin-top: 2rem; padding-top: 2rem; border-top: 1px solid var(--border); }
.media-section { margin-bottom: 2rem; padding: 1.5rem; background: #fafafa; border-radius: 8px; border: 1px solid var(--border); }
.media-section h3 { font-size: 1rem; margin-bottom: 1rem; }
.gallery-group { border: 2px solid var(--primary); border-radius: 8px; padding: 1rem; margin-bottom: 1rem; background: #fff; }
.gallery-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.gallery-header input { flex: 1; margin-right: 0.5rem; font-weight: 600; }
.media-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 1rem; margin-top: 1rem; }
.media-item { position: relative; border: 2px solid var(--border); border-radius: 8px; background: #fff; cursor: move; }
.media-item.dragging { opacity: 0.5; }
.media-item img { width: 100%; height: 150px; object-fit: cover; border-radius: 6px 6px 0 0; }
.media-info { padding: 0.5rem; }
.media-info input { padding: 0.5rem; font-size: 0.75rem; margin-bottom: 0.5rem; }
.media-item .remove { position: absolute; top: 0.5rem; right: 0.5rem; background: var(--error); 
                      color: white; border: none; border-radius: 50%; width: 24px; height: 24px; 
                      cursor: pointer; font-size: 16px; z-index: 10; }
.media-item .order { position: absolute; top: 0.5rem; left: 0.5rem; background: var(--primary); 
                     color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; 
                     align-items: center; justify-content: center; font-weight: 600; font-size: 0.75rem; }
.video-card { border: 2px solid #9333ea; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; background: #fff; }
.video-layout { display: grid; grid-template-columns: 220px 1fr; gap: 1.5rem; align-items: start; }
.thumbnail-area { display: flex; flex-direction: column; gap: 0.75rem; }
.thumbnail-preview { width: 220px; height: 165px; background: #f3f4f6; border: 2px dashed var(--border); 
                     border-radius: 8px; display: flex; align-items: center; justify-content: center; 
                     font-size: 4rem; overflow: hidden; }
.thumbnail-preview img { width: 100%; height: 100%; object-fit: cover; border-radius: 6px; }
.video-fields { display: flex; flex-direction: column; gap: 1rem; }
.addons-toolbar { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin-bottom: 20px; }
.btn-add-type { padding: 12px 10px; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; 
                cursor: pointer; transition: all 0.3s; display: flex; align-items: center; 
                justify-content: center; gap: 6px; color: white; }
.btn-add-type:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
.btn-add-type[data-type="heading"] { background: linear-gradient(135deg, #667eea, #764ba2); }
.btn-add-type[data-type="text"] { background: linear-gradient(135deg, #4facfe, #00f2fe); }
.btn-add-type[data-type="textarea"] { background: linear-gradient(135deg, #43e97b, #38f9d7); }
.btn-add-type[data-type="email"] { background: linear-gradient(135deg, #fa709a, #fee140); }
.btn-add-type[data-type="file"] { background: linear-gradient(135deg, #fbc2eb, #a6c1ee); }
.btn-add-type[data-type="radio"] { background: linear-gradient(135deg, #30cfd0, #330867); }
.btn-add-type[data-type="select"] { background: linear-gradient(135deg, #a8edea, #fed6e3); }
.btn-add-type[data-type="checkbox_group"] { background: linear-gradient(135deg, #ff9a9e, #fecfef); }
.addon-field { border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; background: #fff; }
.addon-header { display: flex; justify-content: space-between; margin-bottom: 1rem; align-items: center; }
.addon-config { margin-top: 1rem; padding: 1rem; background: #f9fafb; border-radius: 6px; }
.addon-option { border: 1px solid var(--border); padding: 1rem; margin-bottom: 0.75rem; border-radius: 6px; background: #fff; }
.addon-option-main { display: grid; grid-template-columns: 2fr 1fr; gap: 0.5rem; margin-bottom: 0.75rem; }
.addon-option-flags { display: flex; gap: 1rem; margin-bottom: 0.75rem; align-items: center; flex-wrap: wrap; }
.addon-option-flags label { font-size: 0.875rem; display: flex; align-items: center; margin-bottom: 0; }
.addon-option-extra { margin-top: 0.75rem; padding: 0.75rem; background: #f0f0f0; border-radius: 6px; }
.delivery-config { margin-top: 0.5rem; padding: 0.75rem; background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; }
.btn-sm { padding: 0.5rem 0.75rem; font-size: 0.75rem; }
.section-divider { margin: 2rem 0; border-top: 2px solid var(--border); }
</style>
</head>
<body>
<div class="container">
  <h1>📦 Product Manager</h1>
  <div class="card">
    <div class="progress-bar"><div class="progress-fill" id="progress"></div></div>
    <div class="tabs" id="tabs"></div>
    <form id="form">
      <div class="tab-content active" data-tab="0">
        <div class="form-group"><label>Title *</label><input type="text" id="title" required></div>
        <div class="form-group"><label>Slug *</label><input type="text" id="slug" required><small>Auto-generated</small></div>
        <div class="form-group"><label>Description</label><textarea id="description" rows="4"></textarea></div>
        <div class="form-group"><label>Status</label>
          <select id="status"><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></select>
        </div>
      </div>
      <div class="tab-content" data-tab="1">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
          <div class="form-group"><label>Regular Price *</label><input type="number" id="price" min="0" step="0.01" required></div>
          <div class="form-group"><label>Sale Price</label><input type="number" id="sale-price" min="0" step="0.01"><small>Leave empty if no sale</small></div>
        </div>
        <div class="form-group"><label>Currency</label>
          <select id="currency"><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option><option value="PKR">PKR</option></select>
        </div>
        <div class="form-group"><label>Stock</label><input type="number" id="stock" min="0" value="0"></div>
        <div class="form-group"><label>SKU</label><input type="text" id="sku"></div>
      </div>
      <div class="tab-content" data-tab="2">
        <div class="media-section">
          <h3>🖼️ Image Galleries</h3>
          <button type="button" class="btn btn-primary" onclick="addGallery()">+ Add Gallery</button>
          <div id="galleries-container" style="margin-top:1rem"></div>
        </div>
        <div class="section-divider"></div>
        <div class="media-section">
          <h3>🎥 Videos</h3>
          <button type="button" class="btn btn-primary" onclick="addVideo()">+ Add Video</button>
          <div id="videos-container" style="margin-top:1rem"></div>
        </div>
      </div>
      <div class="tab-content" data-tab="3">
        <div class="form-group">
          <label>Add Field Type:</label>
          <div class="addons-toolbar">
            <button type="button" class="btn-add-type" data-type="heading" onclick="addAddonType('heading')">📋 Heading</button>
            <button type="button" class="btn-add-type" data-type="text" onclick="addAddonType('text')">✏️ Text</button>
            <button type="button" class="btn-add-type" data-type="textarea" onclick="addAddonType('textarea')">📝 Long Text</button>
            <button type="button" class="btn-add-type" data-type="email" onclick="addAddonType('email')">📧 Email</button>
            <button type="button" class="btn-add-type" data-type="file" onclick="addAddonType('file')">📎 File</button>
            <button type="button" class="btn-add-type" data-type="radio" onclick="addAddonType('radio')">⭕ Radio</button>
            <button type="button" class="btn-add-type" data-type="select" onclick="addAddonType('select')">📋 Dropdown</button>
            <button type="button" class="btn-add-type" data-type="checkbox_group" onclick="addAddonType('checkbox_group')">☑️ Checkboxes</button>
          </div>
        </div>
        <div id="addons-list"></div>
      </div>
      <div class="tab-content" data-tab="4">
        <div class="form-group"><label>Meta Title</label><input type="text" id="meta-title" maxlength="60"><small><span id="tc">0</span>/60</small></div>
        <div class="form-group"><label>Meta Description</label><textarea id="meta-desc" rows="3" maxlength="160"></textarea><small><span id="dc">0</span>/160</small></div>
        <div class="form-group"><label>Keywords</label><input type="text" id="keywords"></div>
        <div class="form-group"><label>Canonical URL</label><input type="url" id="canonical"></div>
      </div>
    </form>
    <div class="tab-nav">
      <button type="button" class="btn" id="prev" disabled>← Prev</button>
      <button type="button" class="btn btn-primary" id="next">Next →</button>
    </div>
  </div>
</div>
<script>
const S={tab:0,completed:new Set(),galleries:[],videos:[],addons:[]};
const tabs=['📝 Basic','💰 Pricing','🖼️ Media','➕ Addons','🔍 SEO'];

function init(){
  document.getElementById('tabs').innerHTML=tabs.map((t,i)=>
    \`<button type="button" class="tab \${i===0?'active':''}" onclick="switchTab(\${i})">\${t}</button>\`).join('');
  document.getElementById('prev').onclick=()=>switchTab(S.tab-1);
  document.getElementById('next').onclick=()=>{
    if(S.tab===4)save();else{S.completed.add(S.tab);switchTab(S.tab+1);}
  };
  document.getElementById('title').oninput=()=>{
    if(!new URLSearchParams(location.search).get('id')){
      document.getElementById('slug').value=document.getElementById('title').value
        .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
    }
  };
  document.getElementById('meta-title').oninput=e=>document.getElementById('tc').textContent=e.target.value.length;
  document.getElementById('meta-desc').oninput=e=>document.getElementById('dc').textContent=e.target.value.length;
  
  renderGalleries();
  renderVideos();
  
  load();
}

function switchTab(i){
  if(i<0||i>4)return;
  S.tab=i;
  document.querySelectorAll('.tab').forEach((b,idx)=>{
    b.className='tab'+(idx===i?' active':'')+(S.completed.has(idx)?' completed':'');
  });
  document.querySelectorAll('.tab-content').forEach((c,idx)=>{
    c.className='tab-content'+(idx===i?' active':'');
  });
  document.getElementById('prev').disabled=i===0;
  document.getElementById('next').textContent=i===4?'Save Product':'Next →';
  document.getElementById('progress').style.width=((i+1)/5*100)+'%';
}

function addGallery(){
  S.galleries.push({id:Date.now(),name:'Gallery '+(S.galleries.length+1),images:[]});
  renderGalleries();
}

function addGalleryImage(gi){
  const input=document.createElement('input');
  input.type='file';
  input.accept='image/*';
  input.multiple=true;
  input.onchange=e=>{
    for(const f of e.target.files){
      const r=new FileReader();
      r.onload=ev=>{
        S.galleries[gi].images.push({id:Date.now()+Math.random(),preview:ev.target.result,url:'',type:'upload'});
        renderGalleries();
      };
      r.readAsDataURL(f);
    }
  };
  input.click();
}

function addGalleryImageUrl(gi){
  const url=prompt('Image URL:');
  if(url){
    S.galleries[gi].images.push({id:Date.now(),preview:url,url:url,type:'url'});
    renderGalleries();
  }
}

function renderGalleries(){
  const c=document.getElementById('galleries-container');
  if(S.galleries.length===0){
    c.innerHTML='<p style="text-align:center;color:var(--text-light);padding:2rem">No galleries. Click + Add Gallery</p>';
    return;
  }
  c.innerHTML=S.galleries.map((gallery,gi)=>
    \`<div class="gallery-group">
      <div class="gallery-header">
        <input type="text" value="\${gallery.name||''}" placeholder="Gallery name" onchange="S.galleries[\${gi}].name=this.value">
        <div style="display:flex;gap:0.5rem">
          <button type="button" class="btn btn-sm btn-primary" onclick="addGalleryImage(\${gi})">+ Upload</button>
          <button type="button" class="btn btn-sm" onclick="addGalleryImageUrl(\${gi})">+ URL</button>
          <button type="button" class="btn btn-sm" style="background:var(--error);color:white" onclick="S.galleries.splice(\${gi},1);renderGalleries()">Remove</button>
        </div>
      </div>
      <div class="media-grid">
        \${gallery.images.map((img,ii)=>
          \`<div class="media-item" draggable="true" data-gallery="\${gi}" data-index="\${ii}">
            <div class="order">\${ii+1}</div>
            <img src="\${img.preview}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22150%22 height=%22150%22%3E%3Crect fill=%22%23eee%22 width=%22150%22 height=%22150%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 font-size=%2240%22%3E🖼️%3C/text%3E%3C/svg%3E'">
            <button type="button" class="remove" onclick="S.galleries[\${gi}].images.splice(\${ii},1);renderGalleries()">×</button>
            <div class="media-info">
              <input type="url" placeholder="Image URL *" value="\${img.url||''}" onchange="S.galleries[\${gi}].images[\${ii}].url=this.value" required>
            </div>
          </div>\`
        ).join('')}
      </div>
      \${gallery.images.length===0?'<p style="text-align:center;color:var(--text-light);padding:1rem">No images</p>':''}
    </div>\`
  ).join('');
  setupGalleryDrag();
}

function setupGalleryDrag(){
  document.querySelectorAll('.gallery-group .media-item').forEach(el=>{
    el.ondragstart=e=>{e.dataTransfer.setData('gallery',e.target.dataset.gallery);e.dataTransfer.setData('index',e.target.dataset.index);};
    el.ondragover=e=>e.preventDefault();
    el.ondrop=e=>{
      e.preventDefault();
      const srcGal=parseInt(e.dataTransfer.getData('gallery'));
      const srcIdx=parseInt(e.dataTransfer.getData('index'));
      const dstGal=parseInt(e.currentTarget.dataset.gallery);
      const dstIdx=parseInt(e.currentTarget.dataset.index);
      if(srcGal===dstGal && srcIdx!==dstIdx){
        const item=S.galleries[srcGal].images.splice(srcIdx,1)[0];
        S.galleries[srcGal].images.splice(dstIdx,0,item);
        renderGalleries();
      }
    };
  });
}

function addVideo(){
  S.videos.push({id:Date.now(),url:'',thumbnail:'',thumbnailPreview:'',type:'url'});
  renderVideos();
}

function uploadThumbnail(vi){
  const input=document.createElement('input');
  input.type='file';
  input.accept='image/*';
  input.onchange=e=>{
    const f=e.target.files[0];
    if(f){
      const r=new FileReader();
      r.onload=ev=>{
        S.videos[vi].thumbnailPreview=ev.target.result;
        renderVideos();
      };
      r.readAsDataURL(f);
    }
  };
  input.click();
}

function renderVideos(){
  const c=document.getElementById('videos-container');
  if(S.videos.length===0){
    c.innerHTML='<p style="text-align:center;color:var(--text-light);padding:2rem">No videos. Click + Add Video</p>';
    return;
  }
  c.innerHTML=S.videos.map((vid,i)=>
    \`<div class="video-card">
      <div class="video-layout">
        <div class="thumbnail-area">
          <div class="thumbnail-preview">
            \${vid.thumbnailPreview?\`<img src="\${vid.thumbnailPreview}" alt="Thumbnail">\`:'🎥'}
          </div>
          <button type="button" class="btn btn-sm btn-primary" onclick="uploadThumbnail(\${i})">📤 Upload Thumbnail</button>
          <small style="text-align:center">Or enter URL below</small>
        </div>
        <div class="video-fields">
          <div class="form-group">
            <label>Video URL *</label>
            <input type="url" placeholder="https://youtube.com/watch?v=..." value="\${vid.url||''}" onchange="S.videos[\${i}].url=this.value" required>
          </div>
          <div class="form-group">
            <label>Thumbnail URL</label>
            <input type="url" placeholder="https://img.youtube.com/vi/.../maxresdefault.jpg" value="\${vid.thumbnail||''}" onchange="S.videos[\${i}].thumbnail=this.value;S.videos[\${i}].thumbnailPreview=this.value;renderVideos()">
            <small>Paste thumbnail image URL</small>
          </div>
          <button type="button" class="btn btn-sm" style="background:var(--error);color:white" onclick="S.videos.splice(\${i},1);renderVideos()">Remove Video</button>
        </div>
      </div>
    </div>\`
  ).join('');
}

function addAddonType(type){
  const labels={
    heading:'Section Heading',text:'Text Input',textarea:'Long Text Area',email:'Email Address',
    file:'File Upload',radio:'Radio Buttons',select:'Dropdown List',checkbox_group:'Checkbox Group'
  };
  S.addons.push({
    id:Date.now(),type:type,label:labels[type]||'',required:false,price:0,placeholder:'',text:'',
    options:['radio','select','checkbox_group'].includes(type)?[{
      label:'',price:0,default:true,file:false,fileQuantity:1,
      textField:false,textLabel:'',textPlaceholder:'',
      delivery:false,instantDelivery:false,deliveryDays:1
    }]:[]
  });
  renderAddons();
}

function renderAddons(){
  const c=document.getElementById('addons-list');
  if(S.addons.length===0){
    c.innerHTML='<p style="text-align:center;color:var(--text-light);padding:2rem">No fields. Click a button above to add</p>';
    return;
  }
  c.innerHTML=S.addons.map((addon,i)=>{
    let config='';
    if(addon.type==='heading'){
      config=\`<div class="addon-config"><div class="form-group"><label>Heading Text</label>
        <input type="text" value="\${addon.text||addon.label||''}" onchange="S.addons[\${i}].text=this.value"></div></div>\`;
    }
    else if(['text','textarea','email'].includes(addon.type)){
      config=\`<div class="addon-config" style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
        <div class="form-group"><label>Placeholder</label><input type="text" value="\${addon.placeholder||''}" onchange="S.addons[\${i}].placeholder=this.value"></div>
        <div class="form-group"><label>Extra Price</label><input type="number" value="\${addon.price||0}" step="0.01" onchange="S.addons[\${i}].price=parseFloat(this.value)||0"></div>
        <div class="form-group"><label><input type="checkbox" \${addon.required?'checked':''} onchange="S.addons[\${i}].required=this.checked"> Required</label></div>
      </div>\`;
    }
    else if(addon.type==='file'){
      config=\`<div class="addon-config" style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
        <div class="form-group"><label>Extra Price</label><input type="number" value="\${addon.price||0}" step="0.01" onchange="S.addons[\${i}].price=parseFloat(this.value)||0"></div>
        <div class="form-group"><label><input type="checkbox" \${addon.required?'checked':''} onchange="S.addons[\${i}].required=this.checked"> Required</label></div>
      </div>\`;
    }
    else if(['radio','select','checkbox_group'].includes(addon.type)){
      config=\`<div class="addon-config">
        <button type="button" class="btn btn-sm btn-primary" onclick="addOption(\${i})">+ Add Option</button>
        <div style="margin-top:1rem">\${(addon.options||[]).map((opt,oi)=>
          \`<div class="addon-option">
            <div class="addon-option-main">
              <input type="text" placeholder="Option label *" value="\${opt.label||''}" onchange="S.addons[\${i}].options[\${oi}].label=this.value" required>
              <input type="number" placeholder="Price" value="\${opt.price||0}" step="0.01" onchange="S.addons[\${i}].options[\${oi}].price=parseFloat(this.value)||0">
            </div>
            <div class="addon-option-flags">
              <label><input type="checkbox" \${opt.file?'checked':''} onchange="S.addons[\${i}].options[\${oi}].file=this.checked;renderAddons()"> 📎 File</label>
              <label><input type="checkbox" \${opt.textField?'checked':''} onchange="S.addons[\${i}].options[\${oi}].textField=this.checked;renderAddons()"> ✏️ Text</label>
              <label><input type="checkbox" \${opt.delivery?'checked':''} onchange="S.addons[\${i}].options[\${oi}].delivery=this.checked;renderAddons()"> 🚚 Delivery</label>
              \${addon.type!=='checkbox_group'?\`<label><input type="radio" name="default-\${i}" \${opt.default?'checked':''} onchange="S.addons[\${i}].options.forEach((o,idx)=>o.default=idx===\${oi});renderAddons()"> ⭐ Default</label>\`:''}
              <button type="button" class="btn btn-sm" style="background:var(--error);color:white" onclick="S.addons[\${i}].options.splice(\${oi},1);renderAddons()">×</button>
            </div>
            \${opt.file||opt.textField||opt.delivery?\`<div class="addon-option-extra">
              \${opt.file?\`<div class="form-group"><label>📎 File Quantity</label>
                <input type="number" min="1" value="\${opt.fileQuantity||1}" onchange="S.addons[\${i}].options[\${oi}].fileQuantity=parseInt(this.value)||1">
                <small>Number of files</small></div>\`:''}
              \${opt.textField?\`<div class="form-group"><label>✏️ Text Field Label</label>
                <input type="text" placeholder="e.g., Song link" value="\${opt.textLabel||''}" onchange="S.addons[\${i}].options[\${oi}].textLabel=this.value"></div>
                <div class="form-group"><label>Text Placeholder</label>
                <input type="text" placeholder="e.g., Paste link" value="\${opt.textPlaceholder||''}" onchange="S.addons[\${i}].options[\${oi}].textPlaceholder=this.value"></div>\`:''}
              \${opt.delivery?\`<div class="delivery-config">
                <div class="form-group"><label><input type="checkbox" \${opt.instantDelivery?'checked':''} onchange="S.addons[\${i}].options[\${oi}].instantDelivery=this.checked"> ⚡ Instant Delivery</label></div>
                <div class="form-group"><label>🗓️ Delivery Days</label>
                  <input type="number" min="1" max="365" value="\${opt.deliveryDays||1}" onchange="S.addons[\${i}].options[\${oi}].deliveryDays=parseInt(this.value)||1">
                  <small>Days</small></div>
              </div>\`:''}
            </div>\`:''}
          </div>\`
        ).join('')}</div>
      </div>\`;
    }
    return \`<div class="addon-field">
      <div class="addon-header">
        <strong>\${addon.type?addon.type.toUpperCase():''} - \${addon.label||'Field '+(i+1)}</strong>
        <button type="button" class="btn btn-sm" style="background:var(--error);color:white" onclick="S.addons.splice(\${i},1);renderAddons()">Remove</button>
      </div>
      <div class="form-group"><label>Field Label *</label>
        <input type="text" value="\${addon.label||''}" placeholder="e.g., Choose size" onchange="S.addons[\${i}].label=this.value" required>
      </div>
      \${config}
    </div>\`;
  }).join('');
}

function addOption(i){
  if(!S.addons[i].options)S.addons[i].options=[];
  S.addons[i].options.push({
    label:'',price:0,default:false,file:false,fileQuantity:1,
    textField:false,textLabel:'',textPlaceholder:'',
    delivery:false,instantDelivery:false,deliveryDays:1
  });
  renderAddons();
}

async function load(){
  const id=new URLSearchParams(location.search).get('id');
  if(!id)return;
  try{
    const r=await fetch('/products/'+id);
    const p=await r.json();
    document.getElementById('title').value=p.title||'';
    document.getElementById('slug').value=p.slug||'';
    document.getElementById('description').value=p.description||'';
    document.getElementById('status').value=p.status||'draft';
    document.getElementById('price').value=p.price||0;
    document.getElementById('sale-price').value=p.sale_price||'';
    document.getElementById('currency').value=p.currency||'USD';
    document.getElementById('stock').value=p.stock||0;
    document.getElementById('sku').value=p.sku||'';
    if(p.galleries){S.galleries=p.galleries;renderGalleries();}
    if(p.videos){S.videos=p.videos;renderVideos();}
    if(p.addons){S.addons=p.addons;renderAddons();}
    if(p.seo){
      document.getElementById('meta-title').value=p.seo.meta_title||'';
      document.getElementById('meta-desc').value=p.seo.meta_description||'';
      document.getElementById('keywords').value=p.seo.keywords||'';
      document.getElementById('canonical').value=p.seo.canonical_url||'';
      document.getElementById('meta-title').dispatchEvent(new Event('input'));
      document.getElementById('meta-desc').dispatchEvent(new Event('input'));
    }
  }catch(e){console.error(e);alert('Failed to load product');}
}

async function save(){
  const btn=document.getElementById('next');
  btn.disabled=true;btn.textContent='Saving...';
  try{
    const data={
      title:document.getElementById('title').value,
      slug:document.getElementById('slug').value,
      description:document.getElementById('description').value,
      status:document.getElementById('status').value,
      price:parseFloat(document.getElementById('price').value)||0,
      sale_price:parseFloat(document.getElementById('sale-price').value)||null,
      currency:document.getElementById('currency').value,
      stock:parseInt(document.getElementById('stock').value)||0,
      sku:document.getElementById('sku').value,
      galleries:S.galleries,
      videos:S.videos,
      addons:S.addons,
      seo:{
        meta_title:document.getElementById('meta-title').value,
        meta_description:document.getElementById('meta-desc').value,
        keywords:document.getElementById('keywords').value,
        canonical_url:document.getElementById('canonical').value
      }
    };
    const id=new URLSearchParams(location.search).get('id');
    const r=await fetch(id?'/products/'+id:'/products',{
      method:id?'PUT':'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(data)
    });
    if(!r.ok)throw new Error('Save failed');
    const res=await r.json();
    alert('✅ Product saved successfully!');
    if(!id&&res.id)location.href='?id='+res.id;
  }catch(e){alert('❌ '+e.message);}
  finally{btn.disabled=false;btn.textContent='Save Product';}
}

init();
</script>
</body>
</html>`;

export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    const url = new URL(request.url);
    
    if (url.pathname === '/admin' || url.pathname === '/admin/') {
      return new Response(ADMIN_HTML, {
        headers: { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache' }
      });
    }
    
    if (!initialized) {
      const migration = new AutoMigration(env);
      await migration.autoSetup();
      initialized = true;
    }

    const container = new Container();
    container.bind("db", () => env.DB);
    container.bind("storage", () => env.MEDIA);
    container.bind("secret", () => env.TOKEN_SECRET || "default-secret");

    const router = new Router();
    const modules = loadModules(container);
    
    modules.forEach(module => {
      module.routes.forEach(route => {
        router.add(route.method, route.path, route.handler);
      });
    });

    try {
      return await router.handle(request);
    } catch (error: any) {
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, headers: { "Content-Type": "application/json" }
      });
    }
  },
};

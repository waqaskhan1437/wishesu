const uploadQueue = new Map();
let activeUploads = 0;

const isVideoFile = (file) => {
  const name = (file?.name || '').toLowerCase();
  return file?.type?.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm|m4v|flv|wmv)$/.test(name);
};

const setStatus = (input, text, fileName = '', state = '') => {
  let status = input.parentElement?.querySelector('.upload-status');
  if (!status) {
    status = document.createElement('div');
    status.className = 'upload-status';
    input.parentElement?.appendChild(status);
  }
  status.classList.toggle('is-error', state === 'error');
  status.classList.toggle('is-loading', state === 'loading');
  status.textContent = fileName ? `${text} ${fileName}` : text;
};

const ensureInputId = (input) => {
  if (input.id) return input.id;
  const id = `file_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  input.id = id;
  return id;
};

const uploadToR2 = async (inputKey, file) => {
  const sessionId = `upload_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const filename = file.name || 'upload.bin';
  const url = `/api/upload/temp-file?sessionId=${encodeURIComponent(sessionId)}&filename=${encodeURIComponent(filename)}`;
  const formData = new FormData();
  formData.append('file', file, file.name || 'upload.bin');
  const response = await fetch(url, {
    method: 'POST',
    body: formData
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) throw new Error(data.error || 'Upload failed');
  const key = data.tempUrl ? data.tempUrl.replace('r2://', '') : '';
  return `/api/r2/file?key=${encodeURIComponent(key)}`;
};

const uploadToArchive = async (file) => {
  const credResponse = await fetch('/api/upload/archive-credentials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  if (!credResponse.ok) throw new Error('Failed to get upload credentials');
  const creds = await credResponse.json();
  if (!creds.success) throw new Error(creds.error || 'Credentials error');

  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).slice(2, 9);
  const itemId = `wishesu_${timestamp}_${randomStr}`;
  const safeFilename = (file.name || 'video.mp4').replace(/[^a-zA-Z0-9.-]/g, '_');
  const archiveUrl = `https://s3.us.archive.org/${itemId}/${safeFilename}`;

  const uploadResponse = await fetch(archiveUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `LOW ${creds.accessKey}:${creds.secretKey}`,
      'Content-Type': file.type || 'video/mp4',
      'x-archive-auto-make-bucket': '1',
      'x-archive-meta-mediatype': 'movies',
      'x-archive-meta-collection': 'opensource_movies',
      'x-archive-meta-title': file.name || 'Video upload',
      'x-archive-meta-description': 'Video uploaded via Wishesu'
    },
    body: file
  });

  if (!uploadResponse.ok) throw new Error(`Archive upload failed: ${uploadResponse.status}`);
  return `https://archive.org/download/${itemId}/${safeFilename}`;
};

const handleUpload = async (input, file, index = 0) => {
  activeUploads += 1;
  const inputId = ensureInputId(input);
  const inputKey = `${inputId}:${index}`;
  setStatus(input, 'Uploading:', file.name || 'file', 'loading');

  try {
    const url = isVideoFile(file) ? await uploadToArchive(file) : await uploadToR2(inputKey, file);
    uploadQueue.set(inputKey, { status: 'uploaded', url, fileName: file.name });
    setStatus(input, 'Uploaded:', file.name || 'file', 'done');
    const existing = input.dataset.uploaded ? JSON.parse(input.dataset.uploaded) : [];
    existing[index] = url;
    input.dataset.uploaded = JSON.stringify(existing);
  } catch (err) {
    uploadQueue.set(inputKey, { status: 'failed', error: err.message || 'Upload failed' });
    setStatus(input, err.message || 'Upload failed', file.name || 'file', 'error');
  } finally {
    activeUploads = Math.max(0, activeUploads - 1);
  }
};

export const initAddonUploads = (root) => {
  root.querySelectorAll('input[type="file"]').forEach((input) => {
    input.addEventListener('change', async () => {
      const files = Array.from(input.files || []);
      if (!files.length) return;
      if (input.multiple) {
        await Promise.all(files.map((file, idx) => handleUpload(input, file, idx)));
        return;
      }
      await handleUpload(input, files[0], 0);
    });
  });
};

window.getUploadedFiles = function() {
  const files = {};
  uploadQueue.forEach((data, inputId) => {
    if (data.status === 'uploaded' && data.url) files[inputId] = data.url;
  });
  return files;
};

window.areAllFilesUploaded = function() {
  let allUploaded = true;
  uploadQueue.forEach((data) => {
    if (data.status !== 'uploaded') allUploaded = false;
  });
  return allUploaded;
};

window.isUploadInProgress = function() {
  return activeUploads > 0;
};

/**
 * Product Form Upload Handler
 * Handles file uploads with progress tracking
 */

export async function uploadFileWithProgress(file, label, form) {
  return new Promise((resolve, reject) => {
    const sessionId = Date.now().toString();
    const filename = file.name;

    let progressContainer = document.getElementById('upload-progress-container');
    if (!progressContainer) {
      progressContainer = document.createElement('div');
      progressContainer.id = 'upload-progress-container';
      progressContainer.style.cssText = 'margin: 15px 0; padding: 10px; background: #f3f4f6; border-radius: 8px;';
      form.appendChild(progressContainer);
    }

    const progressEl = document.createElement('div');
    progressEl.style.cssText = 'margin: 8px 0;';
    progressEl.innerHTML = `
      <div style="font-size: 14px; margin-bottom: 5px; color: #374151;">
        <strong>${label}:</strong> ${filename}
      </div>
      <div style="background: #e5e7eb; border-radius: 4px; height: 20px; overflow: hidden;">
        <div id="progress-${label}" style="background: linear-gradient(90deg, #10b981, #059669); height: 100%; width: 0%; transition: width 0.3s; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: bold;"></div>
      </div>
    `;
    progressContainer.appendChild(progressEl);

    const progressBar = progressEl.querySelector(`#progress-${label}`);
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentComplete = (e.loaded / e.total) * 100;
        progressBar.style.width = percentComplete + '%';
        progressBar.textContent = Math.round(percentComplete) + '%';
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.success && response.tempUrl) {
            progressBar.style.width = '100%';
            progressBar.textContent = '✓ Done';
            progressBar.style.background = '#10b981';

            const r2Key = response.tempUrl.replace('r2://', '');
            const publicUrl = `/api/r2/file?key=${encodeURIComponent(r2Key)}`;

            setTimeout(() => {
              progressEl.remove();
              if (progressContainer.children.length === 0) {
                progressContainer.remove();
              }
            }, 2000);

            resolve(publicUrl);
          } else {
            throw new Error(response.error || 'Upload failed');
          }
        } catch (err) {
          progressBar.style.background = '#ef4444';
          progressBar.textContent = '✗ Failed';
          reject(err);
        }
      } else {
        progressBar.style.background = '#ef4444';
        progressBar.textContent = '✗ Error';
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      progressBar.style.background = '#ef4444';
      progressBar.textContent = '✗ Error';
      reject(new Error('Upload failed'));
    });

    xhr.open('POST', `/api/upload/temp-file?sessionId=${sessionId}&filename=${encodeURIComponent(filename)}`);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.send(file);
  });
}

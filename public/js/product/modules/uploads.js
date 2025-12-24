/**
 * Uploaded file helpers.
 */

export function collectUploadedFileAddons() {
  const selectedAddons = [];
  const uploadedFiles = window.getUploadedFiles ? window.getUploadedFiles() : {};

  Object.keys(uploadedFiles).forEach(inputId => {
    const fileUrl = uploadedFiles[inputId];
    if (fileUrl) {
      selectedAddons.push({
        field: inputId,
        value: `[PHOTO LINK]: ${fileUrl}`
      });
    }
  });

  return { selectedAddons, uploadedFiles };
}

export function isUploadInProgress() {
  return window.isUploadInProgress && window.isUploadInProgress();
}

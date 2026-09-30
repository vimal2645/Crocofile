window.isPDF = function (file) {
  return file && (file.type === 'application/pdf' || /\.pdf$/i.test(file.name));
};
window.isImage = function (file) {
  return file && /^image\/(jpeg|png|webp)$/.test(file.type);
};
window.maxSizeCheck = function (file, mb) {
  return file.size <= mb * 1024 * 1024;
};
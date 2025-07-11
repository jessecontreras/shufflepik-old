const path = require('path');
const fse = require('fs-extra');

/**
 * Move image paths to the deleted-media directory.
 *
 * @param {Array<string|{image_url:string}>} imagePaths Array of paths or objects containing image_url
 * @param {string} [baseDir] Base directory containing uploads and deleted-media folders
 */
async function moveFilesToDeletedMedia(imagePaths, baseDir = path.join(__dirname, '..')) {
  if (!Array.isArray(imagePaths)) {
    throw new Error('imagePaths must be an array');
  }

  for (const ref of imagePaths) {
    const imagePath = typeof ref === 'string' ? ref : ref.image_url;
    if (!imagePath) continue;

    const relativePath = imagePath.replace(/^\/+/, '');
    const parts = relativePath.split(/[\\/]/);
    if (parts.length < 3) continue;
    const subDir = parts[1];
    const fileName = parts.slice(2).join('/');

    const src = path.join(baseDir, relativePath);
    const destDir = path.join(baseDir, 'deleted-media', subDir);
    const dest = path.join(destDir, fileName);

    await fse.ensureDir(destDir);
    await fse.move(src, dest, { overwrite: true });
  }
}

module.exports = {
  moveFilesToDeletedMedia,
};

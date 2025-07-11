const test = require('node:test');
const assert = require('assert');
const path = require('path');
const os = require('os');
const fse = require('fs-extra');

const { moveFilesToDeletedMedia } = require('./fileMover');

test('moves files from uploads to deleted-media', async () => {
  const tmpDir = await fse.mkdtemp(path.join(os.tmpdir(), 'fileMover-'));
  const uploadsDir = path.join(tmpDir, 'uploads', 'guild1');
  await fse.ensureDir(uploadsDir);
  const srcFile = path.join(uploadsDir, 'test.txt');
  await fse.writeFile(srcFile, 'hello');

  await moveFilesToDeletedMedia(['/uploads/guild1/test.txt'], tmpDir);

  const destFile = path.join(tmpDir, 'deleted-media', 'guild1', 'test.txt');
  const srcExists = await fse.pathExists(srcFile);
  const destExists = await fse.pathExists(destFile);

  assert.strictEqual(srcExists, false);
  assert.strictEqual(destExists, true);

  await fse.remove(tmpDir);
});

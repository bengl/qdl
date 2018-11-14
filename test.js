'use strict';

const { deepStrictEqual: deq, ok } = require('assert');
const path = require('path');
const pifall = require('pifall');
const { qdownloadAsync: qdownload } = pifall({ qdownload: require('./index.js') });
const fs = pifall(require('fs'));
const { execAsync: exec } = pifall(require('child_process'));

const test = require('pitesti')({ timeout: 60000 });

const qfastfsUrl = 'https://registry.npmjs.org/qfastfs/-/qfastfs-1.0.0.tgz';
const qfastfsSha = 'sha512-4FySBpNMnrDULzycXH6JmCImjWRWUTzqrnnqhkrbTExcmcn2Zt' +
  'A9ZftAY8qYiVFGGkLBfrozCjEzAY3sB2Y84Q==';

const qfastfsTree = {
  'LICENSE.txt': [0o100644, 1080],
  'README.md': [0o100644, 810],
  'index.js': [0o100755, 202],
  lib: {
    'cp.js': [0o100644, 1838],
    'general.js': [0o100644, 1383],
    'mkdirp.js': [0o100644, 794],
    'util.js': [0o100644, 184]
  },
  'package.json': [0o100644, 1004]
};

test`cache only`(async () => {
  const cacheDir = path.join(__dirname, 'testcache1');
  await qdownload(qfastfsUrl, qfastfsSha, cacheDir, null);
  const cacheTree = await tree(cacheDir);
  deq(qfastfsTree, cacheTree);
  await exec(`rm -rf ${cacheDir}`);
});

test`dest only`(async () => {
  const destDir = path.join(__dirname, 'testdest1');
  await qdownload(qfastfsUrl, qfastfsSha, null, destDir);
  const destTree = await tree(destDir);
  deq(qfastfsTree, destTree);
  await exec(`rm -rf ${destDir}`);
});

test`both`(async () => {
  const cacheDir = path.join(__dirname, 'testcache2');
  const destDir = path.join(__dirname, 'testdest2');
  await qdownload(qfastfsUrl, qfastfsSha, cacheDir, destDir);
  const destTree = await tree(destDir);
  deq(qfastfsTree, destTree);
  const cacheTree = await tree(cacheDir);
  deq(qfastfsTree, cacheTree);
  await exec(`rm -rf ${destDir}`);
  await exec(`rm -rf ${cacheDir}`);
});

test`integrity fail`(async () => {
  const cacheDir = path.join(__dirname, 'testcache3');
  let err;
  try {
    await qdownload(qfastfsUrl, 'sha1-ReN/s56No/JbruP/U2niu18iAXo=', cacheDir, null);
  } catch (e) {
    err = e;
  }
  ok(err);
  await exec(`rm -rf ${cacheDir}`);
});

test();

async function tree (dir) {
  const contents = await fs.readdirAsync(dir);
  const result = {};
  for (let i = 0; i < contents.length; i++) {
    const item = contents[i];
    if (item.startsWith('.')) {
      continue;
    }
    const fullItem = dir + '/' + item;
    const stats = await fs.statAsync(fullItem);
    if (stats.isDirectory()) {
      result[item] = await tree(fullItem);
    } else {
      result[item] = [stats.mode, stats.size];
    }
  }
  return result;
}

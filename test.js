'use strict';

const { deepStrictEqual: deq, ok } = require('assert');
const path = require('path');
const pifall = require('pifall');
const { qdlAsync: qdl } = pifall({ qdl: require('./index.js') });
const fs = pifall(require('fs'));
const { execAsync: exec } = pifall(require('child_process'));

const test = require('pitesti')({ timeout: 60000 });

const qfastfsUrl = 'https://registry.npmjs.org/qfastfs/-/qfastfs-1.0.0.tgz';
const qfastfsSha = 'sha512-4FySBpNMnrDULzycXH6JmCImjWRWUTzqrnnqhkrbTExcmcn2Zt' +
  'A9ZftAY8qYiVFGGkLBfrozCjEzAY3sB2Y84Q==';

const qfastfsTree = {
  'LICENSE.txt': 1080,
  'README.md': 810,
  'index.js': 202,
  lib: {
    'cp.js': 1838,
    'general.js': 1383,
    'mkdirp.js': 794,
    'util.js': 184
  },
  'package.json': 1004
};

test`cache only`(async () => {
  const cacheDir = path.join(__dirname, 'testcache1');
  await qdl(qfastfsUrl, qfastfsSha, cacheDir, null);
  const cacheTree = await tree(cacheDir);
  deq(qfastfsTree, cacheTree);
  await exec(`rm -rf ${cacheDir}`);
});

test`dest only`(async () => {
  const destDir = path.join(__dirname, 'testdest1');
  await qdl(qfastfsUrl, qfastfsSha, null, destDir);
  const destTree = await tree(destDir);
  deq(qfastfsTree, destTree);
  await exec(`rm -rf ${destDir}`);
});

test`both`(async () => {
  const cacheDir = path.join(__dirname, 'testcache2');
  const destDir = path.join(__dirname, 'testdest2');
  await qdl(qfastfsUrl, qfastfsSha, cacheDir, destDir);
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
    await qdl(qfastfsUrl, 'sha1-ReN/s56No/JbruP/U2niu18iAXo=', cacheDir, null);
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
      result[item] = stats.size;
    }
  }
  return result;
}

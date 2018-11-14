'use strict';

const zlib = require('minizlib');
const tarStream = require('tar-stream');
const fs = require('fs-minipass');
const { dirname } = require('path');
const { mkdirp } = require('qfastfs');

function writeOne (filename, mode, stream, next) {
  mkdirp(dirname(filename), (err) => {
    if (err) {
      return next(err);
    }
    const writeStream = new fs.WriteStream(filename, { mode });
    writeStream.on('close', next);
    stream.pipe(writeStream);
  });
}

module.exports = function tar (cacheDir, destDir) {
  const gunzip = new zlib.Gunzip();
  const extractStream = tarStream.extract();
  extractStream.on('entry', (header, stream, next) => {
    if (header.type !== 'file') {
      stream.resume();
      stream.on('end', next);
      return;
    }
    const name = header.name.slice(header.name.indexOf('/'));
    if (!cacheDir) {
      writeOne(destDir + name, header.mode, stream, next);
      return;
    }
    if (!destDir) {
      writeOne(cacheDir + name, header.mode, stream, next);
      return;
    }
    const filename1 = destDir + name;
    const filename2 = cacheDir + name;
    let toMkdirp = 2;
    mkdirp(dirname(filename1), onOneMkdirp);
    mkdirp(dirname(filename2), onOneMkdirp);
    function onOneMkdirp (err) {
      if (err) {
        return next(err);
      }
      if (--toMkdirp === 0) {
        onBothMkdirp();
      }
    }
    function onBothMkdirp () {
      const opts = { mode: header.mode || 0o666 };
      const writeStream1 = new fs.WriteStream(filename1, opts);
      const writeStream2 = new fs.WriteStream(filename2, opts);
      let closed = 0;
      const onClose = () => {
        if (++closed === 2) {
          next();
        }
      };
      writeStream1.on('close', onClose);
      writeStream2.on('close', onClose);
      stream.pipe(writeStream1);
      stream.pipe(writeStream2);
    }
  });
  extractStream.on('finish', () => gunzip.emit('tar_finish'));
  extractStream.on('error', e => gunzip.emit('error', e));
  gunzip.pipe(extractStream);
  return gunzip;
};

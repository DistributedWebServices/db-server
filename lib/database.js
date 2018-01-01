const crypto = require('crypto');
const path = require('path');

const async = require('async');
const levelup = require('levelup');
const leveldown = require('leveldown');
const get_folder_size = require('get-folder-size');
const xor = require('bitwise-xor');

const WebInterface = require('./web');

class Database {

  constructor(name, options={}) {
    this._name = name;
    this._db_path = path.join(options.storage_dir, this._name);
  }

  create() {
    if (!this._db) {
      this._db = levelup(leveldown(this._db_path), {
        errorIfExists: true
      });
    }
  }

  open() {
    if (!this._db) {
      this._db = levelup(leveldown(this._db_path), {
        createIfMissing: false
      });
    }
  }

  get(key, callback) {
    this._db.get(key, function(err, value) {
      if (err) {
        if (err.type != 'NotFoundError') {
          callback(err);
        } else {
          callback('NotFoundError');
        }
      } else {
        callback(null, JSON.parse(value.toString()));
      }
    });
  }

  put(key, value, callback) {
    this._db.put(key, JSON.stringify(value), callback);
  }

  del(key, callback) {
    this._db.del(key, callback);
  }

  get_stats(callback) {
    get_folder_size(this._db_path, function(err, size) {
      callback(err, {
        size: size
      });
    });
  }

  hash_challenges(salts, callback) {
    console.log(salts);
    const tasks = salts.map((salt) => {
      return (cb) => {
        this.hash_challenge(salt, cb);
      }
    });
    async.series(tasks, callback);
  }

  hash_challenge(salt, callback) {
    console.log(salt);
    var current_hash;
    this._db.createReadStream()
      .on('data', function(data) {
        var m = crypto.createHash('sha256');
        var new_hash = m.update(data.key).update(data.value).update(salt).digest();
        if (current_hash) {
          current_hash = xor(current_hash, new_hash);
        } else {
          current_hash = new_hash;
        }
      })
      .on('error', function(err) {
        callback(err);
      })
      .on('end', function() {
        callback(null, current_hash.toString('hex'))
      });
  }

}

module.exports = Database;

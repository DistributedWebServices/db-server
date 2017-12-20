const crypto = require('crypto');
const path = require('path');
const net = require('net');

const levelup = require('levelup');
const leveldown = require('leveldown');
const mkdirp = require('mkdirp');
const Web3 = require('web3');

const WebInterface = require('./web');

class Metastore {

  constructor(options={}) {
    this._dbs_info = {};
    this._dbs = {};
    this._storage_dir = options.storage_dir || './storage';
    mkdirp.sync(this._storage_dir);

    this._ws_endpoint = options.ws_endpoint || 'ws://localhost:8546';
    this.web3 = new Web3(new Web3.providers.WebsocketProvider(this._ws_endpoint));

    this._meta_db_name = options.meta_db_name || '__meta.db';
    this._meta_db_path = path.join(path.resolve(this._storage_dir), this._meta_db_name);
    this._meta_db = levelup(leveldown(this._meta_db_path));

  }

  _init(callback) {
    this._meta_db.create
    db.createReadStream({ gte: 'db_info_@', lte: 'db_info_{' })
      .on('data', function (data) {
        this._dbs_info(data.key) = JSON.parse(data.value);
      })
      .on('error', function (err) {
        callback(err);
      })
      .on('end', function () {
        callback();
      })
  }

  // TODO this needs to lock out other create calls
  create_db(db_name, admin_public_key, callback) {
    if (!(db_name in this._dbs)) {
      const db_path = path.join(this._storage_dir, db_name);
      const db = levelup(leveldown(db_path), {
        errorIfExists: true
      });
      db.put(this.internal_prefix+'admin_public_key', admin_public_key, (err) => {
        if (err) {
          callback(err);
        } else {
          this._dbs[db_name] = db;
          this._meta_db.put('db_info_'+db_name, 
          callback(null, db);
          })
        }
      }); 
    } else {
      callback("Database already exists with that name")
    }
  }

  open_db(db_name, owner_address) {
    if (!(db_name in dbs)) {
      const db_path = path.join(this._storage_dir, db_name);
      this._dbs[db_name] = levelup(leveldown(db_path), {
        createIfMissing: false
      });
    }
  }

  _subscribe() {
    if (!this._subscription) {
      this._subscription = this.web3.eth.subscribe('newBlockHeaders', function(err) {
        if (err) {
          console.log(err);
        }
      })
      .on("data", function(log){
        if (log.number) {
          this._checkForContractChanges();
        }
      })
      .on("changed", function(log){
        console.log('CHANGED', log);
      })
      .on("error", function(err) {
        console.log("ERROR", err);
      })
    }
  }

  _checkForContractChanges() {
    
  }

  _processLog(log) {
    console.log(log);
  }

  _startWebInterface() {
    var app = new WebInterface();
    app.listen(); 
  }

  start() {
    if (!this._started) {
      this._listening = true;

      this._init();
      this._startWebInterface();
      this._subscribe();

      console.log("Metastore has started...");
    }
  }

}

module.exports = Metastore;

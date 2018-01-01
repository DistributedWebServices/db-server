const crypto = require('crypto');
const path = require('path');
const net = require('net');

const dnode = require('dnode');
const levelup = require('levelup');
const leveldown = require('leveldown');
const mkdirp = require('mkdirp');
const Web3 = require('web3');

const Database = require('./database');
const WebInterface = require('./web');

class Metastore {

  constructor(options={}) {
    this._dbs = {};
    this._db_infos = {};
    this._storage_dir = options.storage_dir || './storage';
    mkdirp.sync(this._storage_dir);

    this._eth_address = options.eth_address;

    if (this._eth_address) {
      this._ws_endpoint = options.ws_endpoint || 'ws://localhost:8546';
      this._web3 = new Web3(new Web3.providers.WebsocketProvider(this._ws_endpoint));
    }

    this._meta_db_name = options.meta_db_name || '__meta.db';
    this._meta_db_path = path.join(path.resolve(this._storage_dir), this._meta_db_name);
    this._meta_db = levelup(leveldown(this._meta_db_path));
  }

  _init(callback) {
    this._meta_db.createReadStream({ gte: 'db_info_@', lte: 'db_info_{' })
      .on('data', (data) => {
        const db_info = JSON.parse(data.value);
        this._db_infos[db_info.name] = db_info;
      })
      .on('error', (err) => {
        callback && callback(err);
      })
      .on('end', () => {
        callback && callback();
      })
  }

  // TODO this needs to lock out other create calls
  create_db(db_name, admin_public_key, callback) {
    if (!(db_name in this._dbs)) {

      const db = new Database(db_name, {
        storage_dir: this._storage_dir
      });
      db.create();

      this._dbs[db_name] = db;
      const db_info = {
        name: db_name,
        admin_public_key: admin_public_key
      };
      this._meta_db.put('db_info_'+db_name, JSON.stringify(db_info), function(err) {
        callback(err, db);
      });

    } else {
      callback("Database already exists with that name")
    }
  }

  get_db(db_name, owner_address) {
    if (!(db_name in this._db_infos)) {
      throw "No database exists with that name";
    }

    if (!(db_name in this._dbs)) {
      const db_path = path.join(this._storage_dir, db_name);

      var db = new Database(db_name, {
        storage_dir: this._storage_dir
      });
      db.open();

      this._dbs[db_name] = db;
    } else {
      var db = this._dbs[db_name];
    }
    return db;
  }

  _subscribe() {
    if (!this._subscription && this._eth_address) {
      this._subscription = this._web3.eth.subscribe('newBlockHeaders', function(err) {
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

  _startDNode() {
    this._dnode_server = dnode({
      get: (db_name, key, callback) => {
        this.get_db(db_name).get(key, callback);
      },
      put: (db_name, key, value, callback) => {
        this.get_db(db_name).put(key, value, callback);
      },
      del: (db_name, key, callback) => {
        this.get_db(db_name).del(key, callback);
      },
      hash_challenge: (db_name, salt, callback) => {
        this.get_db(db_name).hash_challenge(salt, callback);
      },
      hash_challenges: (db_name, salts, callback) => {
        this.get_db(db_name).hash_challenges(salts, callback);
      }
    });
    this._dnode_server.listen(5004);
  }

  get_stats(db_name, callback) {
    if (db_name in this._db_infos) {
      const db = this.get_db(db_name);
      db.get_stats(callback);
    } else {
      throw "No database exists with name "+db_name;
    }
  }

  start(callback) {
    if (!this._started) {
      this._listening = true;

      this._init(callback);
      this._startWebInterface();
      this._startDNode();
      this._subscribe();

      console.log("Metastore has started...");
    }
  }

}

module.exports = Metastore;

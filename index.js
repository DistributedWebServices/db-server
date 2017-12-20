#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const program = require('commander')
  .version('0.1.0');

const Metastore = require('./lib/metastore');
const util = require('./lib/util');

const m = new Metastore();

program
  .command('run')
  .description('Run the database')
  .action(function(options) {
    m.listen();
  });

program
  .command('createdb <name> <admin_public_key_file>')
  .action(function(name, admin_public_key_file, options) {
    const public_key = fs.readFileSync(path.resolve(__dirname, admin_public_key_file), 'utf-8');
    m.create_db(name, public_key, function(err, db) {
      if (err) {
        console.log(err);
      } else {
        console.log("Successfully created database with name %s", name);
      }
      process.exit();
    });
  });

program
  .command('genkeys')
  .action(function(options) {
    console.log("Generating key pair, this may take a moment...");
    const keypair = util.createKeypair();
    fs.writeFileSync(path.join(__dirname,'id_rsa'), keypair.private);
    fs.writeFileSync(path.join(__dirname,'id_rsa.pub'), keypair.public);
    console.log("Saved keypair to id_rsa and id_rsa.pub");
    process.exit();
  });

program.parse(process.argv);

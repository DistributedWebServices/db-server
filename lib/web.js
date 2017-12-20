const express = require('express');

class WebInterface {

  constructor() {
    this.app = express();
  }

  listen() {
    this.app.listen();
  }

}

module.exports = WebInterface;

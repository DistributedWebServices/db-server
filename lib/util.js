const NodeRSA = require('node-rsa');

module.exports.createKeypair = function createKeypair() {
  const key = new NodeRSA({b: 512});
  key.generateKeyPair()

  return {
    'public': key.exportKey('public'),
    'private': key.exportKey('private')
  }
}

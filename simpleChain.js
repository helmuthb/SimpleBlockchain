const SHA256 = require('crypto-js/sha256');

/**
 * Block Class
 * Class with a constructor for block
 */
class Block {
  constructor(data) {
    this.hash = '';
    this.height = 0;
    this.body = data;
    this.time = 0;
    this.previousBlockHash = '';
  }

  clone() {
    return new Block(this.body);
  }

  calculateHash() {
    return SHA256(JSON.stringify(this)).toString();
  }

  validateHash() {
    const theHash = this.hash;
    this.hash = '';
    const validHash = this.calculateHash();
    this.hash = theHash;
    if (theHash === validHash) {
      return true;
    }

    console.log(`Block #${this.height} invalid hash:\n${theHash}<>${validHash}`);
    return false;
  }
}

/**
 * Blockchain Class
 * Class with a constructor for new blockchain
 */
class Blockchain {
  constructor() {
    this.chain = [];
    this.addBlock(new Block('First block in the chain - Genesis block'));
  }

  // Add new block
  addBlock(aBlock) {
    const newBlock = aBlock.clone();
    const height = this.getBlockHeight();
    newBlock.height = height + 1;
    newBlock.time = new Date().getTime().toString().slice(0, -3);
    if (height >= 0) {
      const previousBlock = this.chain[height];
      newBlock.previousBlockHash = previousBlock.hash;
    }
    newBlock.hash = newBlock.calculateHash();
    this.chain[height + 1] = newBlock;
  }

  // Get block height promise
  getBlockHeight() {
    return this.chain.length - 1;
  }

  // get block
  getBlock(blockHeight) {
    return this.chain[blockHeight];
  }

  // push block
  pushBlock(block) {
    this.chain.push(block);
  }

  // validate block
  validateBlock(blockHeight) {
    // get block object
    const block = this.getBlock(blockHeight);
    return block.validateHash();
  }

  // Validate blockchain
  validateChain() {
    const errorLog = [];
    for (let i = 0; i < this.getBlockHeight(); i++) {
      const block = this.getBlock(i);
      const nextBlock = this.getBlock(i + 1);
      // validate block
      if (!block.validateHash()) {
        errorLog.push(i);
      }
      // compare blocks hash link
      const blockHash = block.hash;
      const previousHash = nextBlock.previousBlockHash;
      if (blockHash !== previousHash) {
        errorLog.push(i);
      }
    }
    if (errorLog.length > 0) {
      console.log(`Block errors = ${errorLog.length}`);
      console.log(`Blocks: ${errorLog}`);
      return false;
    }
    console.log('No errors detected');
    return true;
  }
}

module.exports = {
  Block, Blockchain,
};

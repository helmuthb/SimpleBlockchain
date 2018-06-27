const SHA256 = require('crypto-js/sha256');
const level = require('level');

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
    const hash = SHA256(JSON.stringify(this)).toString();
    return hash;
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
 * Queue operator
 * A mechanism to have a linked list of operations waiting to be performed.
 */
class QueueOps {
  constructor() {
    this.first = null;
    this.last = null;
  }

  _doOp(fn, resolve, reject) {
    let result = fn();
    if ('then' in result) {
      result.then(data => {
        resolve(data);
        this._runNext();
      }, err => {
        reject(err);
        this._runNext();
      })
    }
    else {
      resolve(result);
      this._runNext();
    }
  }

  /**
   * Put the function fn to the list.
   * The function fn returns a promise, and the function add returns an
   * equivalent promise.
   */
  add(fn) {
    // are we first?
    if (!this.last) {
      this.first = {
        'next': null,
        'operation': null
      };
      this.last = this.first;
      return new Promise((resolve, reject) => {
        this._doOp(fn, resolve, reject);
      });
    }
    else {
      // no, we add us to the end of the list
      return new Promise((resolve, reject) => {
        this.last.next = {
          'next': null,
          'operation': fn,
          'resolve': resolve,
          'reject': reject
        };
        this.last = this.last.next;
      });
    }
  }

  /**
   * Internal function: run the next from the operations queue
   */
  _runNext() {
    while (this.first !== null && this.first.operation === null) {
      this.first = this.first.next;
    }
    if (this.first === null) {
      // we have worked through the queue
      this.last = null;
      return;
    }
    let operation = this.first.operation;
    let resolve = this.first.resolve;
    let reject = this.first.reject;
    this.first = this.first.next;
    if (this.first == null) {
      this.last = null;
    }
    this._doOp(operation, resolve, reject);
  }
}

/**
 * Blockchain Class
 * Class with a constructor for new blockchain
 */
class Blockchain {
  constructor() {
    this.chain = [];
    this.queue = new QueueOps();
    this.doNext(() => {
      return new Promise((resolve, reject) => {
        this.chainDB = level('./chaindb', {}, (err, db) => {
          if (err) {
            reject(err);
          }
          else {
            this._getBlockHeight().then(height => {
              if (height < 0) {
                this._addBlock(new Block('First block in the chain - Genesis block')).then(resolve, reject);
              }
              else {
                resolve(true);
              }
            })
          }
        });
      });
    });
  }

  /**
   * runNext - queue an operation to be run
   */
  doNext(fn) {
    return this.queue.add(fn);
  }

  reset() {
    return this.chainDB.del("height");
  }

  /**
   * Add a block
   */
  _addBlock(aBlock) {
    const newBlock = aBlock.clone();
    return this._getBlockHeight().then(height => {
      newBlock.height = 1 + Number(height);
      newBlock.time = new Date().getTime().toString().slice(0, -3);
      let p;
      if (height >= 0) {
        p = this._getBlock(height).then(block => {
          newBlock.previousBlockHash = block.hash;
          return newBlock;
        });
      }
      else {
        p = Promise.resolve(newBlock);
      }
      return p.then(nb => {
        nb.hash = nb.calculateHash();
        return this.chainDB.put(height+1, JSON.stringify(nb)).then(() => {
          return this.chainDB.put("height", height+1);
        });
      });
    });
  }

  addBlock(aBlock) {
    return this.doNext(() => {
      return this._addBlock(aBlock);
    })
  }

  updateBlock(height, block) {
    return this.doNext(() => {
      return this.chainDB.put(height, JSON.stringify(block));
    })
  }

  // output the content of the chainDB
  outputChain() {
    return this.doNext(() => {
      return new Promise((resolve, reject) => {
        this.chainDB.createReadStream()
          .on('data', data => console.log(data.key, '=', data.value))
          .on('error', err => console.log("Oh! ", er))
          .on('close', () => console.log("Stream closed"))
          .on('end', () => resolve());
      });
    });
  }

  // Get block height promise
  _getBlockHeight() {
    return this.chainDB.get("height").then(height => {
      return Number(height);
    }, err => {
      return -1;
    });
  }

  getBlockHeight() {
    return this.doNext(() => {
      return this._getBlockHeight();
    })
  }

  // get block
  _getBlock(blockHeight) {
    return this.chainDB.get(blockHeight).then(block => {
      block = JSON.parse(block);
      block.__proto__ = Block.prototype;
      return block;
    });
  }

  getBlock(blockHeight) {
    return this.doNext(() => {
      return this._getBlock(blockHeight);
    });
  }

  // push block
  pushBlock(block) {
    return this.doNext(() => {
      return this.getBlockHeight.then(height => {
        return this.chainDB.put(height+1, block);
      })
    })
  }

  // validate block
  validateBlock(blockHeight) {
    // get block object
    return this.doNext(() => {
      return this._getBlock(blockHeight).then(block => {
        return block.validateHash();
      })
    });
  }

  // get all blocks (for validation)
  _getAllBlocks() {
    const blocksP = [];
    return this._getBlockHeight().then(height => {
      for (let i=0; i<=height; i++) {
        blocksP[i] = this._getBlock(i);
      }
      return Promise.all(blocksP);
    });
  }

  // Validate blockchain
  validateChain() {
    return this.doNext(() => {
      return this._getAllBlocks().then(blocks => {
        const errorLog = [];
        const height = blocks.length-1;
        for (let i=0; i<=height; i++) {
          if(!blocks[i].validateHash()) {
            errorLog.push(i);
          }
          if (i < height) {
            if (blocks[i].hash != blocks[i+1].previousBlockHash) {
              errorLog.push(i);
            }
          }
        }
        if (errorLog.length > 0) {
          console.log(`Block errors = ${errorLog.length}`);
          console.log(`Blocks: ${errorLog}`);
          return false;
        }
        console.log('No errors detected');
        return true;
      });
    });
  }
  
  close() {
    return this.doNext(() => {
      return new Promise((resolve, reject) => {
        this.chainDB.close(err => {
          if (err) {
            reject(err);
          }
          else {
            resolve();
          }
        });
      });
    });
  }
}

module.exports = {
  Block, Blockchain,
};

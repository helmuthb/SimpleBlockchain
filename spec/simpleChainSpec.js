describe('SimpleChain', () => {
  const { Block, Blockchain } = require('../simpleChain');

  beforeEach((done) => {
    blockchain = new Blockchain();
    blockchain.doNext(() => {
      let promise = Promise.resolve(true);
      for (let i = 0; i < 10; i++) {
        promise = promise.then(() => {
          return blockchain._addBlock(new Block(`test data ${i}`));
        });
      }
      return promise.then(() => {
        done();
      });
    });
  });

  afterEach((done) => {
    blockchain.reset().then(() => {
      blockchain.close().then(() => done());
    });
  });

  it('should validate a correct Blockchain', (done) => {
    blockchain.validateChain().then(rc => {
      blockchain.outputChain();
      expect(rc).toBe(true);
      done();
    });
  });

  it('should raise errors in manipulated chain', (done) => {
    const inducedErrorBlocks = [2, 4, 7];
    const inducedPromises = [];
    for (let i = 0; i < inducedErrorBlocks.length; i++) {
      let idx = inducedErrorBlocks[i];
      inducedPromises[i] = blockchain.getBlock(idx).then(block => {
        block.body = 'induced chain error';
        return blockchain.updateBlock(idx, block);
      });
    }
    Promise.all(inducedPromises).then(() => {
      blockchain.validateChain().then(rc => {
        expect(rc).toBe(false);
        done();
      })
    });
  });
});

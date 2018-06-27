describe("SimpleChain", function() {
  var {Block, Blockchain} = require('../simpleChain');
  
    beforeEach(function() {
      blockchain = new Blockchain();
    });
    
    it("should validate a correct Blockchain", function() {
      for (let i=0; i<10; i++) {
        blockchain.addBlock(new Block("test data " + i));
      }
      expect(blockchain.validateChain()).toBe(true);
    });

    it("should raise errors in manipulated chain", function() {
      for (let i=0; i<10; i++) {
        blockchain.addBlock(new Block("test data " + i));
      }
      let inducedErrorBlocks = [2,4,7];
      for (let i=0; i<inducedErrorBlocks.length; i++) {
        let block = blockchain.getBlock(inducedErrorBlocks[i]);
        block.body = 'induced chain error';
      }
      expect(blockchain.validateChain()).toBe(false);
    });
  });
  
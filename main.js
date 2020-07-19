const SHA256 = require('crypto-js/sha1');

// Class defination of block

class Block {
    constructor(index, timestamp, data, previoushash = ""){
        this.index = index;
        this.timestamp = timestamp;
        this.data = data;
        this.previoushash = previoushash;
        this.hash = this.calculateHash();
    }

    // Function for calculating hash
    calculateHash(){
        return SHA256(this.index + this.previoushash + this.timestamp + JSON.stringify(this.data))
    }
}

// Creating blockchain

class Blockchain{
    constructor(){
        // GensisBlock is the first block which is included in the blockchain
        this.chain = [this.createGenesisBlock()];
    }

    createGenesisBlock(){
        return new Block(0, "01/07/2020", "Gensis Block", {amount : "0"});
    }

    getLatestBlock(){
        return this.chain[this.chain.length];
    }

    addBlock(newBlock){
        newBlock.previoushash = this.getLatestBlock.hash;
        newBlock.hash = newBlock.calculateHash();
        this.chain.push(newBlock)
    }

    isChainValid(){
        for(let i = 0; i<this.chain.length; i++){
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i-1];
            if (currentBlock.hash !== currentBlock.calculateHash()){
                return false;
            }
            if (currentBlock.previoushash !== previousBlock.hash){
                return false;
            }
        }
    }
}

let demoBlockChain = new Blockchain();
demoBlockChain.addBlock(new Block(1, "17/07/2020", {amount:4}));
demoBlockChain.addBlock(new Block(2, "29/07/2020", {amount:15}));

console.log("Is Blockchain valid? " +demoBlockChain.isChainValid());

console.log(JSON.stringify(demoBlockChain, null, 4));

'use strict';
var CryptoJS = require("crypto-js"); 
var express = require("express");
var bodyParser = require("body-parser");
var WebSocket = require("ws");

var http_port = process.env.HTTP_PORT || 30001;
var p2p_port = process.env.P2P_PORT || 60001;
var initialPeers = process.env.PEERS ? process.env.PEERS.split(','):[];

class Block {
    constructor(index, previoushash, timestamp, data, hash){
        this.index = index;
        this.timestamp = timestamp;
        this.data = data;
        this.previoushash = previoushash;
        this.hash = hash.toString();
    }
}

// Imitialisig sockets
var sockets = [];
var MessageType = {
    QUERY_LATEST: 0,
    Query_ALL: 1,
    RESPONSE_BLOCKCHAIN: 2
};

// Creating genesis block
var getGenesisBlock = () => {
    return new Block(0, "0", 1402201890320, "my genesis block !!", "3f2163c1acb1567ff53233a3b31391bec9bc16a9d93cb4b46e13cdc462a194a6");
};

// Creating a blockchain
var blockchain = [getGenesisBlock()];

var calculateHash = (index, previoushash, timestamp, data) => {
   return CryptoJS.SHA256(index + previoushash + timestamp +data).toString();         
};

var calculateHashForBlock = (index, previoushash, timestamp, data) => {
    return calculateHash(block.index, block.previoushash, block.timestamp, block.data);
};

// Generating Next block
var generateNextBlock = (blockData) => {
    var previousBlock = getLatestBlock();
    var nextIndex = previousBlock.index + 1;
    var nextTimestamp = new Date().getTime()/1000;
    var nextHash = calculateHash(nextIndex, previousBlock.hash, nextTimestamp, blockData);
    return new Block(nextIndex, previousBlock.hash, nextTimestamp, blockData, nextHash);
};

var isValidNewBlock = (newBlock, previousBlock) => {
    if(previousBlock.index + 1 !== newBlock.index){
        console.log("Invalid Index");
        return false; 
    }
    else if(previousBlock.hash !== newBlock.previoushash){
        console.log("Invalid Previous Hash");
        return false;
    }
    else if(calculateHashForBlock(newBlock) !== newBlock.hash){
        console.log(typeof(newBlock.hash)+''+typeof calculateHashForBlock(newBlock));
        console.log("Invalid hash");
        return false;
    }
    return true;
}

// Adding a new Block
var addBlock = (newBlock) => {
    if(isValidNewBlock(newBlock, getLatestBlock())){
        blockchain.push(newBlock);
    }
};

// HTTP server
var initHttpServer = () => {
    var app = express();
    app.use(bodyParser.json());
    app.get('/blocks', (req, res) => res.send(JSON.stringify(blockchain)));
    app.post('/mineBlock', (req,res) => {
        var newBlock = generateNextBlock(req.body.data);
        Broadcast(responseLatestMessage());
        console.log("Block Added: "+ JSON.stringify(newBlock));
        res.send();
    });
    app.get('/peers', (req,res) => {
        res.send(sockets.map(s => s._socket.remoteAddress)+ ':' + s._socket.remotePort);
    });

    app.post('/addPeer', (req,res) => {
        connectToPeers(req.body.peer);
        res.send();
    });
    app.listen(http_port, () => {
        console.log("Listening http on port: "+ http_port);
    });
};

//P2P Server
var initP2PServer = () => {
    var server = new WebSocket.Server({port: p2p_port});
    server.on('connection', ws => initConnection(ws));
    console.log("Listening Websocket P2P port on: "+ p2p_port);
};

var initConnection = (ws) => {
    sockets.push(ws);
    initMessageHandler(ws);
    initErrorHandler(ws);
    write(ws.queryChainLengthMsg());
};

// For handling Messages
var initMessageHandler = (ws) => {
    ws.on('message', data => {
        var message = JSON.parse(data);
        console.log('Received Message: '+ JSON.stringify(message));
        switch(message.type){
            case MessageType.QUERY_LATEST:
                write(ws, responseLatestMessage());
                break;
            case MessageType.Query_ALL:
                write(ws, responseChainMessage());
                break;
            case MessageType.RESPONSE_BLOCKCHAIN:
                handleBlockChainResponse(message);
                break;
        }
    });
};

// For handling Errors
var initErrorHandler = (ws) => {
    var closeConnection = (ws) => {
        console.log("Connection Failed to peer: "+ ws.url);  
        sockets.splice(sockets.indexOf(ws)); 
    };
    ws.on('close', () => closeConnection(ws));
    ws.on('error', () => closeConnection(ws));
};

// For getting Latest Message
var responseLatestMessage = () => ({
    'type' : MessageType.RESPONSE_BLOCKCHAIN,
    'data' : JSON.stringify([getLatestBlock])
});

// For printing response chain message
var responseChainMessage = () => ({
    'type' : MessageType.RESPONSE_BLOCKCHAIN,
    'data' : JSON.stringify(blockchain)
});

// Connecting with Peers
var connectToPeers = (newPeers) => {
    newPeers.forEach((peer) => {
        var ws = new WebSocket(peer);
        ws.on('open', () => initConnection(ws));
        ws.on('error', () => {
            console.log("connection failed");
        })
    });
};

var handleBlockChainResponse = (message) => {
    var receivedBlocks = JSON.parse(message.data).sort((b1,b2) => (b1.index-b2.index));
    var LatestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
    var LatestBlockHeld = getLatestBlock();
    if(LatestBlockReceived.index > LatestBlockHeld.index){
        console.log("blockchain possibly behind " + LatestBlockHeld.index + "peer got: " + LatestBlockReceived.index);
        if(LatestBlockHeld.hash === LatestBlockReceived.previoushash){
            console.log("We can append the received block to your chain");
            blockchain.push(LatestBlockReceived);
            Broadcast(responseLatestMessage());
        } else if(receivedBlocks.length === 1){
            console.log("We have to query the chain from our peer");
        } else {
            console.log("Received blockchain is longer than current blockchain");
        }
    } else{
        console.log("Received blockchain is not longer than current blockchain. Do nothing");
    } 
};

var replaceChain = (newBlocks) => {
    if(isVaildChain(newBlocks) && newBlocks.length > blockchain.length){
        console.log("Received blockchain is valid. Replacing current blockchain with received blockchain");
        blockchain = newBlocks;
        Broadcast(responseLatestMessage());
    }
    else {
        console.log("Received blockchain is invalid");
    }
};

var isVaildChain = (blockchainToValidate) => {
    if(JSON.stringify(blockchainToValidate[0] !== JSON.stringify(getGenesisBlock()))){
        return false;
    }
    var tempBlocks = [blockchainToValidate[0]];
    for(i=1; i<blockchainToValidate.length; i++){
        if(isValidNewBlock(blockchainToValidate[i], tempBlocks[i-1])){
            tempBlocks.push(blockchainToValidate[i]);
        } else {
            return false;
        }
    }
    return true;
};

var write = (ws, message) => ws.send(JSON.stringify(message));
var broadcast = (message) => sockets.forEach(socket => write(socket.message));
connectToPeers(initialPeers);
initHttpServer();
initP2PServer();

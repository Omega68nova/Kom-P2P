/**
 * This file is loaded via the <script> tag in the index.html file and will
 * be executed in the renderer process for that window. No Node.js APIs are
 * available in this process because `nodeIntegration` is turned off and
 * `contextIsolation` is turned on. Use the contextBridge API in `preload.js`
 * to expose Node.js functionality from the main process.
 */
const chatMenu = document.getElementById("chats");
const { ipcRenderer } = require('electron');
const {shell} = require('electron') 
const PeerServer = require('peer').PeerServer;
const EventEmitter = require('events');
//const mainEvents = new EventEmitter();
const path = require('path');
//import { DataConnection, ConnectionEventType, BaseConnection } from './peerjs.min.js'
const { emitKeypressEvents } = require('readline');
const fs = require('fs')
const sqlite3 = require('sqlite3')
const open = require('sqlite').open

import {Peer} from "https://esm.sh/peerjs@1.5.2?bundle-deps"
//const Peer = require('peerjs').Peer;
import {P2PTreeNode,P2PTreeNodeTree, P2PMeshNode, P2PFullConnectedTopo} from "./topology.js"
import {ConHandler, ConData, PEERJS_OPTIONS,CON_OPTIONS,setPeerJsOptions,resetPeerJsOptions} from "./conHandler.js"
//var  = require("./conHandler.js").PEERJS_OPTIONS

import {encryptWithPublicKey,decryptWithPrivateKey,sign,verify,generateKeys,importKey,exportKey} from "./crypto.js"
const pre = "omega68ChatApp-user-";
const preChat = "omega68ChatApp-chat-";
const { Queue } = require("./queue.js");
const preChatUser = "omega68ChatApp-chatUser-";
var me ={};
var chats=new Map();
var currentChat2=null;



window.onload = function () {
  document.querySelector("#plus").addEventListener('click', changeModeCC);
  document.querySelector("#DMsButton").addEventListener('click', changeModeDM);

  /*document.querySelector("#createUserButton").addEventListener('click', userCreate);
  document.querySelector("#chatSendMessageButton").addEventListener('click', chatSendMessage);
  document.querySelector("#joinChatButton").addEventListener('click', chatJoin);
  document.querySelector("#createChatButton").addEventListener('click', chatCreate);
  document.querySelector("#dmButton").addEventListener('click', dm);*/

  document.querySelector("#createUserForm").addEventListener('submit', e => {
    e.preventDefault();
    userCreate()
  });
  document.querySelector("#dmForm").addEventListener('submit', e => {
    e.preventDefault();
    dm();
  });
  document.querySelector("#chatForm").addEventListener('submit', e => {
    e.preventDefault();
    chatSendMessage();
  });
  document.querySelector("#ccForm").addEventListener('submit', e => {
    e.preventDefault();
    chatCreate();
  });
  /*document.querySelector("#jcForm").addEventListener('submit', e => {
    e.preventDefault();
    chatJoin();
  });*/
  document.querySelector("#chatTree").addEventListener('click', e => {
    e.preventDefault();
    chatShowTree();
  });
  document.querySelector("#chatUsers").addEventListener('click', e => {
    e.preventDefault();
    chatShowUserTable();
  });
  document.querySelector("#chatForceUpdate").addEventListener('click', e => {
    e.preventDefault();
    chatUpdateCons();
  });
  document.querySelector("#chatConHandler").addEventListener('click', e => {
    e.preventDefault();
    chatShowConHandlers();
  });
  document.querySelector("#fileUploadForm").addEventListener('submit', e => {
    e.preventDefault();
    chatShareFile();
  });
  document.querySelector("#chatRQLOGS").addEventListener('click', e => {
    e.preventDefault();
    chats.get(currentChat).sendRoot({"command":"RQLOGS"})
  });
  document.querySelector("#emoteUploadForm").addEventListener('submit', e => {
    e.preventDefault();
    chatShareEmote();
  });
  document.querySelector("#defaultPeerServerButton").addEventListener('click', e => {
    e.preventDefault();
    setPeerServerToDefault();
  });
  document.querySelector("#createPeerServerButton").addEventListener('click', e => {
    e.preventDefault();
    let dir = document.getElementById("createServerName").value;
    let IP = document.getElementById("createServerIP").value;
    let port =document.getElementById("createServerport").value;
    createPeerServer(dir,port)
  });
  document.querySelector("#joinPeerServerButton").addEventListener('click', e => {
    e.preventDefault();
    let dir = document.getElementById("createServerName").value;
    let IP = document.getElementById("createServerIP").value;
    let port =document.getElementById("createServerport").value;
    joinPeerServer(dir,IP,port);
  });

  show('peerServer')
  hide('start');
  hide('chat');
  hide('DMs');
  hide('chatCreation');
  //hide('peerServer');
  hide('emoteMenu');
};
function setPeerServerToDefault(){
  hide('peerServer')
  show('start');
}
function joinPeerServer(dir,IP,port){
  setPeerJsOptions({
    'host': IP,
		'port': port,
		'path': dir,
    'iceServers': [
{ 'urls': 'stun:stun.l.google.com:19302' },
{
  'urls': "turn:omegachatapp.metered.live:80",
  'username': "371bec6b38c070c460b0046f",
  'credential': "0WiOAZKfxs9jqcLT",
},
{
  'urls': "turn:omegachatapp.metered.live:80?transport=tcp",
  'username': "371bec6b38c070c460b0046f",
  'credential': "0WiOAZKfxs9jqcLT",
},
{
  'urls': "turn:omegachatapp.metered.live:443",
  'username': "371bec6b38c070c460b0046f",
  'credential': "0WiOAZKfxs9jqcLT",
},
{
  'urls': "turn:omegachatapp.metered.live:443?transport=tcp",
  'username': "371bec6b38c070c460b0046f",
  'credential': "0WiOAZKfxs9jqcLT",
}
], 
'sdpSemantics': 'unified-plan' 
  })
  let testPeer = new Peer(undefined,PEERJS_OPTIONS)
  testPeer.on('open', function(id) {
    console.log('My peer ID is: ' + id);
    hide('peerServer')
    show('start');
    testPeer.close()
    });
    testPeer.on('error',function(err){
      hide('start')
      show('peerServer');
      displayGeneralError("Error joining peerServer: "+err.type)
      resetPeerJsOptions()
      testPeer.close()
    })
}
function createPeerServer(dir,port){
  try{
    var server = PeerServer({port: port, path: dir}); 
    setPeerJsOptions({
      'host': "127.0.0.1",
      'port': port,
      'path': dir,
      'iceServers': [
      { 'urls': 'stun:stun.l.google.com:19302' },
      {
        'urls': "turn:omegachatapp.metered.live:80",
        'username': "371bec6b38c070c460b0046f",
        'credential': "0WiOAZKfxs9jqcLT",
      },
      {
        'urls': "turn:omegachatapp.metered.live:80?transport=tcp",
        'username': "371bec6b38c070c460b0046f",
        'credential': "0WiOAZKfxs9jqcLT",
      },
      {
        'urls': "turn:omegachatapp.metered.live:443",
        'username': "371bec6b38c070c460b0046f",
        'credential': "0WiOAZKfxs9jqcLT",
      },
      {
        'urls': "turn:omegachatapp.metered.live:443?transport=tcp",
        'username': "371bec6b38c070c460b0046f",
        'credential': "0WiOAZKfxs9jqcLT",
      }
      ], 
      'sdpSemantics': 'unified-plan' 
    })
    console.log(server)
    server.on('connection', (client) => { console.log("Connected: "+client) });
    server.on('disconnect', (client) => { console.log("Disconnected: "+client) });
    let testPeer = new Peer(undefined,PEERJS_OPTIONS)
  testPeer.on('open', function(id) {
    console.log('My peer ID is: ' + id);
    hide('peerServer')
    show('start');
    });
    testPeer.on('error',function(err){
      hide('start')
      show('peerServer');
      displayGeneralError("Error creating peerServer: "+err.type)
      resetPeerJsOptions()
      
      testPeer.destroy()
    })
    window.setTimeout(function(){
      try{
        testPeer.destroy()
      }catch(err){}
    },2000)
  
  }catch(err){
    displayGeneralError(err)
  }
}

window.onbeforeunload = (e) => {
  if(me.username)
    saveSession(me.username)
  //if(document.getElementById("fileUploadForm").style.display!=="block")
    //e.returnValue = false;
}

function changeModeCC(){
  changeMode('chatCreation')
}
function changeModeDM(){
  changeMode('DMs')
}



var currentChat = "";
var mode='start'; 
//var messages=new Map();
var nextmessageID=0;
var myID;



///////////////////CLASSES/////////////////////



// Stores data of the chat that is shared among users
/**
 * 
 */
class chatData{
  //name: chats name
  //users: chats users in an array (see the user class)
  //conTree: a tree of all connections in the network, used to know who to connect to in case of a neighboor dissapearing.
  //nextID: the ID that is going to be assigned to the next user that joins the chat.
  /**
   * The name of the user, without the app extension.
   */
  myName
  constructor(name,pass,myName,puKey,prKey,isAdmin,onComplete=function(){},onFailure=function(){},settings=null){
    let chat = this;
    //Shared data.
    this.name=name;
    this.pass=pass;
    this.myName=myName;
    //Data that is not always synced between users
    this.users=[];
    this.logs=[];
    this.emotes=new Map;
    this.on=false;
    //Private data
    this.isAdmin=isAdmin;
    this.closed=false;
    this.puKey = puKey;
    this.prKey = prKey;
    this.fileLinks= new Map;

    if(isAdmin){
      this.adminName=this.myName;
      this.rootName=this.myName;
    }


    this.users.push(new user(0,this.myName,this.puKey,true));
    this.load();
    this.normalCommunicator = new EventEmitter();
    this.conTree = new P2PTreeNodeTree(chat.myName);

   
    if(isAdmin){
      this.adminName=this.myName;
      this.rootName=this.myName;
      this.rootCommunicator = new EventEmitter();
      this.setupRootComs(function(){
        displayGeneralError("Failed to Create chat, trying to log in instead.");
        chat.isRoot=false;
        chat.rootName=undefined;
        try{
          chat.rootConHandler.close()
        }catch(e){

        }
        
        chat.rootConHandler=undefined;
        chat.setupConHandler(onComplete,
          function(){
            displayGeneralError('Chat with name '+chatName+' could not be created or joined; name must only be made out of letters, spaces and numbers, and password must match the set one if joining.');
          onFailure()
        });
      }
        //onFailure
        );
        chat.rootConHandler = new ConHandler(preChat+name,undefined,function(){
        chat.setupConHandler(onComplete,onFailure);
      },chat.rootCommunicator)
    }else{
      chat.setupConHandler(onComplete,
        function(){
          displayGeneralError("Failed to Join chat, try creating it instead.");
          chat.rootFailureProtocol()
          //this.close()
          //onFailure()
        }
        //onFailure
      );
    }
    //chat.startupPeer(onFailure,onComplete);

    this.settings= new Map();
    if(settings){
      settings.forEach(setting => {
        this.settings.set(setting[0],setting[1]);
      });
    }

    //TO-DO: WIP onSuddenClose()
    this.onSuddenClose=onFailure;



  }
  setupRootComs(onFailure){
    let chat = this;
    this.rootCommunicator.on("setupFailure",function(){
      onFailure();
    })
    this.rootCommunicator.on("validateAndFinishSetup",function([id]){
      console.log("Finishing setting up rootCon to "+id+"@validateAndFinishSetup")
      let u = chat.users[chat.nameFromPeerID(id)]
      let onMessage;
      let onDisconnect;
      let onError;
      //if(!u){//Not in known users, give stranger handlers aka ask for login info.
          onMessage= function(id,data){
            
            chat.handleCommandToAdmin(id,data)
          }
          onDisconnect=function(){
            if(chat.closed) return
            chat.rootConHandler.cons.delete(id);
            chat.logout(chat.nameFromPeerID(id))
            chat.sendAllRoot({"command":'LOGOUT',"name":chat.nameFromPeerID(id)});
          }
      //}else if(u.online){//Normal user handlers

      //}else{//TODO Check if user is fr fr, and not  login(user) and then normal handlers
      //}
      //chat.rootConHandler.cons.get(id).type="Normal"
      chat.rootConHandler.finishConSetup(id,onMessage,onDisconnect,onError,true)
      //chat.rootConHandler.send({"command":"REQLOGS"},id)

    });
    console.log("Finished setting up rootFailure.")
  }
  setupConHandler(onComplete,onFailure){
    let chat = this;
    this.normalCommunicator.on("setupFailure",function(){
      onFailure();
      chat.close();
    })
    this.normalCommunicator.on("validateAndFinishSetup",function([id]){

      let onMessage;
      let onDisconnect;
      let onError;
      let isNormal;
      console.log("NormalCommunicator request setup of connection to "+id)
      if(id === preChat+chat.name){
        onMessage= function(id,data){
          chat.handleCommandFromAdmin(data)
          if(!chat.on&&data.command==="GIVDAT"){chat.on=true;onComplete();//chat.sendRoot({'command':'RQLOGS'});        chat.sendRoot({'command':'SHLOGS'});
          //chat.loadAndSendFile("logs",chat.rootName,1)
        };
          if(data.command==="BADLOG"){displayGeneralError("Failed to log into chat.");onFailure();return;}
          
        }
        onDisconnect= function(id){
          if(chat.closed) return
          console.log("Con to "+this.id+" disconnected.")
          chat.rootFailureProtocol()
        }
        //onError = chat.handleError

        chat.conHandler.finishRootConSetup(onMessage,onDisconnect,onError)
        chat.sendRoot({'command':'USRDAT','puKey':exportKey(chat.puKey),'pass':chat.pass})
        return;
      }
      let u = chat.conTree.find(chat.nameFromPeerID(id));
      let me = chat.conTree.find(chat.myName)
      if(!u){//Not in conTree Ignore? close? probably close
        console.log("Con "+id+" not found in conTree, removing connection." )
        chat.conHandler.removeCon(id);
        return;
      }else if(me.neighboorIDs().includes(chat.nameFromPeerID(id))){//Normal user handlers
        onMessage= function(id,data){chat.handleCommand(id,data)}
        isNormal = true;
        //onDisconnect= function(from){if(from===chat.peerIDFromName(chat.rootName))chat.rootFailureProtocol()}
        onDisconnect= function(id){ ////CAUTION - ENABLING THIS BREAKS THE CLOSE FUNCTION FOR SOME REASON DONT TOUCH
          let me = chat.conTree.find(chat.myName)
          if(me.neighboorIDs().includes(chat.nameFromPeerID(id)))
            chat.sendRoot({"command":'USRLOS',"name":chat.nameFromPeerID(id)})
          //if(id===chat.peerIDFromName(chat.rootName))chat.rootFailureProtocol()
          //else 
        };

        }else{// user is in contree but not a neighboor, set handlers
        onMessage= function(id,data){chat.handleFarCommand(id,data)}
        /*onDisconnect=function(id){ ABCD
          let transfer
          if(transfer = chat.fileTransfers.find(t=>t.peer===chat.nameFromPeerID(id))!==null){
            if(transfer.action==="s")
            chat.conHandler.resetCon(id)
          }
        }*/
        }
        
      
      chat.conHandler.finishConSetup(id,onMessage,onDisconnect,onError,isNormal)
    });
   // this.normalCommunicator.on("resetUpRootCon",function(){

    //})
    this.normalCommunicator.on("resetUpRootCon",function(){
      try{
        chat.conHandler.restartRootCon(function(){
          
          console.log("Root succesfully reset connections to.")
          chat.isRoot=true;
          //chat.conTree.makeNewRoot(chat.myName);
          chat.logout(chat.rootName);
          chat.rootName= chat.myName;
          if(forced)
            chat.rootConHandler.setNecessaryConnections(chat.users.map(v=>v.name),[]);
        })
      }catch(err){
        console.log(err)
      }

    })
    this.normalCommunicator.on("failureAt",function(name){
      console.log("Failure at"+name+"!")
      if(""+name===preChat+chat.chatName//||name===chat.peerIDFromName(chat.rootName)
      ){

        chat.rootFailureProtocol(chat.myName===chat.rootName||chat.users.findIndex(chat.rootName)!==-1||!chat.users.findUser(chat.rootName).online)
      }else{
        chat.sendRoot({"command":'USRLOS',"name":name})
      }
    });
    this.conHandler = new ConHandler(chat.peerIDFromName(this.myName),preChat+this.name,function(){
      onComplete
    },this.normalCommunicator)
  }



  reSend(data,from){
    console.log("Resending:")
    console.log(data)
    this.conHandler.sendExcept([from],data)
  }
  sendAll(data){
    console.log("Sending all:")
    console.log(data)
    this.conHandler.sendAll(this.encodeMessage(data))
  }
  sendRoot(data){
    console.log("Sending to root:")
    console.log(data)
    this.conHandler.sendRoot(data)
  }
  sendAllRoot(data){
    console.log("Sending to all as root:")
    console.log(data)
    this.rootConHandler.sendAll(data)
  }

  login(name){

    let u=this.findUser(name);
    if(u){
      if(!u.online){
        let event = {'date': new Date().getTime(),'message':'User '+name+' rejoined the chat.','chat':this.name}
        addEventToChat(event.date,event.message,this.name);
        this.logs.push(event);
        u.online=true;
        if(!this.conTree.find(u.name)){
          this.conTree.insert(name);
          this.updateConnections();
        }

      }else{
        console.log("User already online.")
      }

      
    }else{

      throw new Error('User not found!');
    }
  }
  logout(name){
    //check if user is in users first
    //logout from users, remove from tree, then if neighboors affected by change change connections
    //this.rootConHandler.sendAll({"command":'LOGOUT',"name":this.nameFromPeerID(id)})
    if(name===this.myName){
      displayGeneralError("Kicked from "+this.name+".")
      this.close()
      this.onSuddenClose()
      this.close()
      this.onSuddenClose()
      return;
    }
    console.log("User logging out: "+ name)
    //this.pre(insideAnother);

    let u=this.findUser(name);
    if(u){
      if(u.online===true){
        
        let event = {'date': new Date().getTime(),'message':'User '+name+' left the chat.','chat':this.name}
        addEventToChat(event.date,event.message,this.name);
        this.logs.push(event);
        u.online=false;
        if(name){
          this.conTree.remove(name);
        }
        if(this.conHandler.cons.has(this.peerIDFromName(name)))

        if(this.rootName===this.myName&&this.rootConHandler&&this.rootConHandler.cons.has(this.peerIDFromName(name))){
          try{this.rootConHandler.removeCon(this.peerIDFromName(name))}catch(e){}
        }
        //if(name===this.adminName) this.rootFailureProtocol(undefined,true);
        this.updateConnections();
      }
    }else{
      //this.post(insideAnother);
      //throw new Error('User not found!');
    }
    //this.post(insideAnother);
  }

  addUser(u){
    if(!this.findUser(u.name)){
      let event = {'date': new Date().getTime(),'message':'User '+u.name+' joined the chat.','chat':this.name}
      addEventToChat(event.date,event.message,this.name);
      this.logs.push(event);
      this.users.push(u);
      if(u.online && this.conTree&&!this.conTree.find(u.name)){
          this.conTree.insert(u.name);
          this.updateConnections();
      }
      return true;
    }else{
      console.log('User already exists in user database. Logging user in instead.');
      this.login(u.name);
      return false;
    }
  }
  findUser(name){
    for (let i = 0; i < this.users.length; i++) {
      if (this.users[i].name===name) {
        return this.users[i];
      }
    }
    return null;
  }
  deleteUser(name){
    let event = {'date': new Date().getTime(),'message':'User '+name+' was kicked from the chat.','chat':this.name}
    addEventToChat(event.date,event.message,this.name);
    this.logs.push(event);
    u=this.findUser(name);
    if(u){
      u.online=false;
      if(name){
        this.conTree.remove(name);
      }
      this.updateConnections();
    }else{
      throw new Error('User not found!');
    }
  };

  ////PROTOCOL AREA
/**
 * Returns a peer ID from the id stored in the database.
 * @param {String} id 
 * @returns {String}
 */
  peerIDFromName(id){
    if(id.startsWith(preChatUser+this.name+'-'))return id
    return preChatUser+this.name+'-'+id;
  }
  /**
 * Returns ID of the user from the peer name.
 * @param {String} name con.peer
 * @returns {String}
 */
  nameFromPeerID(name){
    return (''+name).replace(preChatUser+this.name+'-','');
  }

  canUser(username,behaviour){
    return true;
    /*let u = this.findUser(username);
    if(u){
      if(this.getBehaviourPermLevel(behaviour)<=u.role){
        return true;
      }
    }
   return false;*/
  }
  getBehaviourPermLevel(behaviour){
    let s = this.settings.get(behaviour);
    if(s) return s;
    return 1;
  }
  conIsLegal(con){
    if(con.peer.startsWith(preChatUser+this.name+'-')){
        //if(this.users.find((u)=>u.name===con.peer&&u.online===true&&u.role<3))
            return true;
    }
    return false;
  }
  conIsLegalForAdmin(from){
      if(from.startsWith(preChatUser+this.name+'-')){
          let u =this.users.find((u)=>u.name===this.nameFromPeerID(from))
          if(u){
              if(u.online)
                  return ["online",u];
              return ["offline",u];
          }
          return ["unregistered",undefined];
      }else return [null,null];
  }

  encodeMessage(message){
    return {'from':this.myName,'contents':JSON.stringify(message),'sign':sign(JSON.stringify(message),this.prKey)}
  }
  decodeMessage(message){
    let isverified;
    if(message.from&&message.sign){
      try{
        let u = this.users.find(u=>u.name===message.from)
        console.log(u)
        console.log(u.puKey)
         isverified= verify(message.sign,message.contents,u.puKey)
      }catch(err){
        console.log("Sender not found.")
        console.log(err)
        return null;
      }

      if(isverified){
        console.log(message.contents)
        return  [message.from,JSON.parse(message.contents)];
      }else{
        console.log("Bad message, not correctly signed or wrong sender.")
        return null;
      }
    }else{
      console.log("Bad message, no signature.")
      return null;
    }
  }

  handleCommand(from,data){
    //console.log("HandleCommand:")
    //console.log(data)
    let chat=this;
    let dataOld=data;
    let trueFrom=chat.nameFromPeerID(from);
    if(data.contents){
      let contents;
      [trueFrom,contents] = chat.decodeMessage(data);
      if(contents){
        data=contents;
      }else{
        this.conHandler.send({"command":"ERR",'message':"Message not properly cyphered at "+chat.myName+"/"+from+"."},from);
        console.log("Error reading contents!")
        return;
      }
    }else trueFrom= chat.nameFromPeerID(from)
    if(data.command.startsWith!=="F"){
      console.log(trueFrom)
      console.log(data)
    }else{
      //console.log("Sending file data from:"+trueFrom)
    }
    //console.log("Data received at set con: "+data.command);
    switch (data.command) {
      case 'LOGINN':
          if(trueFrom!==this.rootName){
            chat.conHandler.sendTo([from],{"command":"ERR",'message':"Tried to fake message!"});
            return;
          }
          chat.login(data.name);
          addEventToChat(data.date,data.name+' logged back in.',chat.name);
          chat.logs.push({'date':data.date,'message':data.name+' logged back in.'});
          if(dataOld!==data)
            chat.reSend(dataOld,from);
          break;
      case 'NEWUSR':
          if(trueFrom!==this.rootName){
            chat.conHandler.sendTo([from],{"command":"ERR",'message':"Tried to fake message!"});
            return;
          }
          let u = new user(2,data.name,data.puKey,true);
          chat.addUser(u);
          addEventToChat(data.date,data.name+' joined the chat.',chat.name);
          chat.logs.push({'date':data.date,'message':data.name+' joined the chat.'});
          if(dataOld!==data)
            chat.reSend(dataOld,from);
          break;
      case 'LOGOUT':
          if(trueFrom!==this.rootName&&trueFrom!==this.myName){
            this.conHandler.sendTo([from],{"command":"ERR",'message':"Tried to fake message!"});
            return;
          }
          chat.logout(data.name);
          addEventToChat(data.date,data.name+' logged out.',chat.name);
          chat.logs.push({'date':data.date,'message':data.name+' logged out.'});
          if(dataOld!==data)
            chat.reSend(dataOld,from);
          break;
     /* case 'USRLOS':
          if(chat.amRoot){
              chat.logout(data.name);
              addEventToChat(data.date,data.name+' logged out.',chat.name)
              chat.logs.push({'date':data.date,'message':data.name+' logged out.'});
              chat.sendAll({"command":'LOGOUT',"name":data.name});
          }else{
              chat.reSend(dataOld,from);
          }
          break;*/
      
      case 'SNDMES':
          chat.logs.push({'from':data.from,'date':data.date,'message':data.message});
          let m = new Message(data.from,data.date,data.message);   
          addToChat(chat.name,m);
          if(dataOld!==data)
            chat.reSend(dataOld,from);
          break;
      case 'GIVDAT':
        try{
          if(trueFrom!==this.rootName&&trueFrom!==this.conTree.find(this.myName).parentID()){
            this.conHandler.sendTo([from],{"command":"ERR",'message':"Tried to fake message!"});
            return;
          }
        }catch(err){
          this.conHandler.sendTo([from],{"command":"ERR",'message':"Tried to fake message!"});
          return;
        }
          //console.log(data.tree);

              chat.conTree.fromObject(data.tree);
              chat.usersFromObject(data.users);
              chat.rootName=data.root;
              chat.emotesFromObject(data.emotes)
              chat.adminName=data.admin;
              chat.updateConnections();

          break;

      case'ASKDAT':
      chat.logs.push({'from':data.trueFrom,'date':data.date,'message':data.message});
          chat.send({"command":"GIVDAT","tree":chat.conTree.toObject(),"users":chat.usersToObject(true),"admin":chat.adminName,"root":chat.rootName},from);
          break;
      case'SHLINK':
        chat.displayShareLink(trueFrom,data.filename,data.size)
        chat.logs.push({"from":trueFrom,"file":data.filename,"size":data.size,"date":Date.now()})
        console.log(chat.logs)
        if(dataOld!==data)
          chat.reSend(dataOld,from);
        break;
      case 'RQFILE':
        if(chat.fileLinks.has(data.filename)){
          chat.requestDirectFileTransfer(trueFrom,data.filename)
        }else{
          if(dataOld!==data)
            chat.reSend(dataOld,from);
        }
        break;
      case 'ERR':
      //TO-DO: Error handling?
          console.log('Error in connection.');
          break;
      case "UPTCON":
          console.log('Closing connection due to tree update.');
          //chat.disabledCons.push(con)
          //if(this.cons.get(con.peer)===con){
          //  this.cons.delete(con.peer.replace(preChatUser+chat.name+'-',''));
          //}
          console.log("Redundant connection notified. Closing.");
          chat.conHandler.removeCon(from)
          //con.close();
          chat.sendRoot({"command":'ASKDAT'});
          break;
      case 'DUPCON':
          /*chat.disabledCons.push(con)

          if(this.cons.get(con.peer)===con){
            this.cons.delete(con.peer);
          }
          try{
            console.log("Duplicate connection notified. Closing.");
            con.close();
          }catch(err){
              console.log("Error trying to close duplicate peer con.");
              console.log(err);
          }*/
          break;
      default:
            chat.handleFileCommand(from,trueFrom,data)


    }
  }
  /**
   * A array of objects that describe transferences structured like so
   * {
   *    peer: username
   *    action: "s"/"r" <== sender or receiver of the file
   *    file: filename
   * }
   * This is used to close the special connection when all transfers are finished.
   */
  fileTransfers=[]
/**
 * 
 * @param {*} from the id of the peer the data was received from. (peerId format)
 * @param {*} trueFrom the name of the true origin of the data. (name format)
 * @param {Object} data the data that is being handled.
 * @param {Number} comMode 0 (default) => sends as normal. 1 => sends TO root, 2 => sends FROM root to the user.
 * @returns 
 */
  handleFileCommand(from,trueFrom,data,comMode=0){
    console.log("handleFileCommand - trueFrom: "+trueFrom)
    let chat = this;
    let fPath
    let sendF
      if(comMode===0)
        sendF = function(data,to){
          chat.sendNotEncoded(data,to)
        }
      else if (comMode ===1) 
        sendF  = function(data,to){
          chat.sendRoot(data)
        }
      else
        sendF  = function(data,to){
          chat.sendAsRoot(data,to)
        }
    if(data.filename){
      fPath = path.join('.', 'UserData', chat.myName,chat.name,'Downloads',(""+data.filename).replace(':',"_"));
    }
    switch (data.command) {
      case 'RQLOGS':
        console.log("Beginning to send logs.")
        sendF({'command':'SHLOGS'},from);
        this.loadAndSendFile("logs",trueFrom,comMode)
        break;
      case 'SHLOGS':
        chat.fileTransfers.push({
          peer: trueFrom,
          action: "r",
          path:path.join('.', 'UserData', chat.myName,chat.name,(trueFrom+"_logs")),
          file: "logs",
          stream: fs.createWriteStream( path.join('.', 'UserData', chat.myName,chat.name,(trueFrom+"_logs")), {encoding: 'binary',flags: 'w'})
        })
        break;
      case 'FOFFNO':
        let i = chat.fileTransfers.findIndex(transfer=>transfer.file===data.filename&&transfer.peer===chat.trueFrom)
        chat.fileTransfers.splice(i);
        break;
      case 'FOFFOK':

        this.loadAndSendFile(data.filename,trueFrom,comMode)

        break;
      case 'OFFERF':
        if(chat.fileTransfers.findIndex(v=>v.file===data.filename)!==-1){
          sendF({"command":"FOFFNO","filename":data.filename},from)
          return;
        }
        let downloadfolder = path.join('.', 'UserData', chat.myName,chat.name,'Downloads');
        if(!fs.existsSync(downloadfolder)){
          fs.mkdirSync(downloadfolder)
        }
        
        chat.fileTransfers.push({
          peer: trueFrom,
          action: "r",
          file: data.filename,
          path:fPath,
          stream: fs.createWriteStream(fPath, {encoding: 'binary',flags: 'w'})
        })
        sendF({"command":"FOFFOK","filename":data.filename},from)
        break;
      case 'FILDAT':
        console.log(chat.fileTransfers)
        let transfer =chat.fileTransfers.find(v=>v.file===data.filename&&v.action==="r");

        if(!transfer||transfer.peer!==trueFrom&&data.filename!=="logs"){
          sendF({"command":"FOFFNO","filename":data.filename},from)
        }
        transfer =chat.fileTransfers.find(v=>v.file===data.filename&&v.action==="r"&&v.peer===trueFrom);

        if(!transfer){
          sendF({"command":"FOFFNO","filename":data.filename},from)
          return;
        }
        if(!transfer.chunksLeft){
          transfer.chunksLeft=10;
        }
        transfer.chunksLeft--;
         chat.ensureConStability()
        //let fPath = path.join('.', 'UserData', chat.myName,chat.name,'Downloads',data.filename.replace(':',"_"));
          
       // if(fs.existsSync(fPath)){
          console.log("Writing into file.")
          transfer.stream.write(data.chunk)
          transfer.stream.once('drain', function(){
            
            window.setTimeout(function(){sendF({"command":"FDATOK","filename":data.filename},from)},1000)
          });
            
          
          
        //}else{

          //var writeStream = fs.createWriteStream(fPath, {encoding: 'binary',flags: 'w'});
          //writeStream.write(data.chunk)
          //writeStream.close()
          //let filename = data.filename.replace(':','_')
          //var writeStream = fs.createWriteStream(chat.fileLinks.get(data.filename).path, {flags: 'w'});
          //writeStream.write(data.chunk)

        break;
      case 'FDATOK':
        let chunk;
        let transfer3 = chat.fileTransfers.find(t=>t.peer===trueFrom&&t.action==="s"&&t.file===data.filename)
        if(!transfer3) return;
        /*if(!transfer3&&this.fileLinks.get(data.filename)){
          chat.fileTransfers.push({
            peer: trueFrom,
            action: "s",
            file: data.filename,
            stream: fs.createReadStream(chat.fileLinks.get(data.filename), {encoding: 'binary',flags: 'r'})
          })
        }*/
        let step = 0;
        while (transfer3&&transfer3.stream&&(chunk = transfer3.stream.read()) !== null&&step<10) {
          step++
          sendF({"command":"FILDAT","filename":data.filename,"chunk":chunk},chat.peerIDFromName(trueFrom))
        }
        break;
      case 'FILEND':
        let j = chat.fileTransfers.findIndex(v=>v.file===data.filename&&v.action==="r"&&v.peer===trueFrom)
        if(j===-1){
          console.log("File transfer not found!")
          return;
        }
        let [transfer2]=chat.fileTransfers.splice(j);
        let p = transfer2.stream.path;

          transfer2.stream.close()
        transfer2.stream.on('finish',()=>{
          if(transfer2.file==="logs"){
            console.log("Starting log merge.")
            let logsPath =  path.join('.', 'UserData', chat.myName,chat.name,(trueFrom+"_logs"))
            if (fs.existsSync(logsPath)) {
              
              let l = (fs.readFileSync(logsPath,{encoding:"binary"}))
              console.log(l)
              if(chat.logsFromObject(JSON.parse(l))){
                resetChat(chat.logs)
              }
              fs.rm(logsPath,console.log);
            }
           
          }else{
            let d = {
              "name":data.filename,
              "path":p,
              "date":data.date,
              "type":data.type,
              "size":data.size,
              "from":chat.nameFromPeerID(trueFrom),
              "isEmote":Boolean(data.isEmote)||Boolean(transfer2.isEmote)
            }
            if(data.isEmote){
              console.log("It is indeed a emote")
              console.log(path.extname(p))
              if(!path.extname(p).match("^\.(jpg|jpeg|png|gif|webp)$")){
                console.log("Not supported sadly.")
                return;
              }
              //If emote exists assign link to emote
              
                if(!transfer2.emoteName){
                  this.emotes.forEach((link,emote)=>{
                    if(data.filename===link){
                      transfer2.emoteName=emote;
                    }
                    
                  })
                  /*
                  while(emote=emoteList.next()!==null){
                    console.log(emote)
                    if(emote[1]===data.filename){
                      transfer2.emoteName=emote[0];
                      break;
                    }
                  }*/
                  if(!transfer2.emoteName){
                    console.log("Emote rejected. No name found for the emote.")
                    sendF({"command":"EMOTNO","name":data.filename},from)
                    fs.rmSync(p);
                    return;
                  }
                }
                setTimeout(function(){
                  let name="";
                  if(chat.emotes.has(transfer2.emoteName)){
                    
                      name = chat.loadLink(d,true)
                      chat.emotes.set(transfer2.emoteName,name)
                      addEmoteToEmoteMenu(transfer2.emoteName,chat.displayEmote(transfer2.emoteName))
                      chat.updateAllEmotes(transfer2.emoteName)
                      console.log("Emote found, adding.")


                  }else{//Create emote
                      if(chat.rootName===chat.myName){
                        console.log("Emote not found but is root, adding.")
                        let name = chat.loadLink(d,true)
                        chat.emotes.set(transfer2.emoteName,name)
                        chat.sendAllRoot({'command':"NEWEMO","name":transfer2.emoteName,"link":name})
                      }
                      console.log("Done adding.")
                  }
                  try{chat.displayFile(name)}catch(e){}
                },100)
            }
            if(!data.isEmote){
              setTimeout(function(){
                let name= chat.loadLink(d,true)
                chat.displayFile(name)
              },100)
            }
          }
          let i = chat.fileTransfers.findIndex(v=>v.file===data.filename&&v.action==="r"&&v.peer===trueFrom)
          if(i)
            chat.fileTransfers.splice(i)
        })


        break;
      case 'NEWEMO':
        if(trueFrom==="root"||trueFrom===this.rootName){
          this.emotes.set(data.name,//{"name":data.name,"link":
          data.link//}
        )
          console.log(this.emotes)
          console.log(this.fileLinks)
          console.log(this.fileTransfers)
          addEmoteToEmoteMenu(data.name,this.displayEmote(data.name))
        }
          

          return true;
      case 'REMEMO':
        if(trueFrom==="root"||trueFrom===this.rootName)
          this.emotes.delete(data.name)
          removeEmoteFromMenu(data.name)
          this.updateAllEmotes(data.name)
        return true;
      case 'OFFEMO':
        console.log(trueFrom)
        if((trueFrom===this.myName||(trueFrom==="root"&&this.rootName===this.myName))&&this.fileLinks.has(data.link)){
          this.sendAllRoot({'command':'NEWEMO','name':data.name,'link':data.link})
        }else
          this.prepareForEmote(trueFrom,from,data.name,data.link,sendF)
        return true;
      case 'EMOTOK':
        console.log("Beginning to send emote.")
        this.loadAndSendFile(data.link,trueFrom,comMode)

        return true;
      case 'EMOTNO':
        displayGeneralError("Emote rejected: "+data.name)
        return true;
      default:
        return false;
    }
    return true;
  }
  prepareForEmote(trueFrom,from,name,link,sendF){
    let chat = this;
    let f = {
      peer: trueFrom,
      action: "r",
      file: link,
      emoteName:name,
      stream: null,
      isEmote:true
    }
    f.peer=trueFrom;
    console.log(trueFrom)
    if(this.myName===this.rootName||this.emotes.has(data.name)){
      //if(this.canUser(trueFrom,"OFFEMO")){
        if(chat.fileTransfers.find(v=>v.file===link)){
          sendF({"command":"EMOTNO","filename":name},from)
          console.log("File already being transfered.")
          return;
        }

        let emotefolder = path.join('.', 'UserData', chat.myName,chat.name,'Downloads');
        let ePath = path.join('.', 'UserData', chat.myName,chat.name,'Downloads',(''+link).replace(':','_'));

        if(!fs.existsSync(emotefolder)){
          fs.mkdirSync(emotefolder)
        }
        f.stream= fs.createWriteStream(ePath, {encoding: 'binary',flags: 'w'})
        console.log(f)
        this.fileTransfers.push(f)


        console.log(this.fileTransfers)
        sendF({"command":"EMOTOK","link":link},from)
      //}else{
        //sendF({"command":"EMOTNO","name":data.name},from)
      //}          
    }
  }
  sendMessage(date,message){
    let data={
          "from":this.myName,
          "command":"SNDMES",
          "date":date,
          "message":message
    };
    console.log('Sending message:', message);
    this.logs.push({'from':data.from,'date':date,'message':message});
    this.sendAll(data);
  }

  async handleFarCommand(from,data){
    //Nothing here yet
  
    let chat=this;
    let dataOld=data;
    let trueFrom=from;
    if(data.contents){
      let contents;
      [trueFrom,contents] = chat.decodeMessage(data);
      if(contents){
        data=contents;
      }else{
        this.conHandler.sendTo([from],{"command":"ERR",'message':"Message not properly cyphered at "+chat.myName+"/"+from+"."});
        console.log("Error reading contents!")
        return;
      }
    }else trueFrom= chat.nameFromPeerID(from)
    if(data.command.startsWith!=="F"){
      console.log(trueFrom)
      console.log(data)
    }else{
      //console.log("Sending file data from:"+trueFrom)
    }


    //console.log("Data received at set con: "+data.command);
    chat.handleFileCommand(from,trueFrom,data)
    /*console.log("handleFarCommand:")
    console.log(command)
    "command":"OFFERF", "file":filename,
    chat.send({"command":"FILDAT","file":filename,"chunk":chunk},username)
  }).on('end', function() {
    chat.send({"command":"FILEND","file":filename},username)*/
  }
  timesUntilEnsureConStability=5;

  ensureConStability(){

    this.timesUntilEnsureConStability--;
    if(this.timesUntilEnsureConStability<0){
      this.timesUntilEnsureConStability=5
      this.conHandler.sendRoot({"command":"PING"})
      if(this.rootConHandler){
        this.rootConHandler.sendAll({"command":"PING"})
      }
      let now = Date.now()
      this.conHandler.rootCon.lastContactDate=now
      if(this.rootConHandler){
        this.rootConHandler.cons.forEach(cD=>cD.lastContactDate=now)
      }
    }

  }
  send(data,to){
    this.conHandler.send(this.encodeMessage(data),to)
  }
  sendNotEncoded(data,to){
    this.conHandler.send(data,to)
  }
  sendAsRoot(data,to){
    console.log("Sending from Root:")
    console.log(data)
    this.rootConHandler.sendTo([to],data)
  }
  updateConnections(){
    if (this.isRoot){
      this.updateRootConnections()
    }
    let chat = this;
    let rootUser = this.users.find(user=>user.name===this.rootName);
    if(!rootUser||!rootUser.online){
      this.rootFailureProtocol(true);
      return;
    }

    let meNode = this.conTree.find(this.myName);
    if(meNode){
      let parent = meNode.parentID()
      let awaitFrom;
      if (parent) awaitFrom = [parent] 
      else awaitFrom = []
      let children = meNode.childrenIDs()
      this.conHandler.setNecessaryConnections(children.map((childName)=>chat.peerIDFromName(childName)),awaitFrom.map((childName)=>chat.peerIDFromName(childName)))
    }else{
      //chat.close()
    }
    chat.save()
  }
  updateRootConnections(){
    let chat = this;
    let userIDs = this.users.filter((u)=>u.online===true).map((u)=>this.peerIDFromName(u.name))
    this.rootConHandler.setNecessaryConnections([],userIDs)
  }

  handleCommandToAdmin(from,data){
    console.log("handleCommandToAdmin:")
    console.log(from, data)
    let [uState,u] = this.conIsLegalForAdmin(from);
    console.log(uState,u)
    let chat = this;
    if(uState ==="online"){
        switch (data.command) {
            case 'ASKDAT':
                let chatData ={"command":"GIVDAT","tree":chat.conTree.toObject(),"users":chat.usersToObject(),"emotes": chat.emotesToObject(),"admin":chat.adminName,"root":chat.rootName};
                chat.sendAsRoot(chatData,from)
                break;
            case 'USRLOS':
                console.log("User lost!");
                if(this.rootConHandler.cons.has(data.name)&&this.rootConHandler.cons.get(data.name).state!=="Off"){
                  let chatData ={"command":"GIVDAT","tree":chat.conTree.toObject(),"users":chat.usersToObject(),"emotes": chat.emotesToObject(),"admin":chat.adminName,"root":chat.rootName};
                  if(this.conTree.find(this.nameFromPeerID(from)).connected.includes(this.nameFromPeerID(data.name))){
                    chat.sendAsRoot(chatData,data.name)
                  }
                  chat.sendAsRoot(chatData,from)
                }else{
                  //let message ={'date':new Date().getTime(),'message':data.name+' logged out.'};
                  //chat.logs.push(message);
                  let chatData ={"command":"GIVDAT","tree":chat.conTree.toObject(),"users":chat.usersToObject(),"emotes": chat.emotesToObject(),"admin":chat.adminName,"root":chat.rootName};
                  chat.sendAsRoot(chatData,from)
                  //chat.sendAsRoot(chatData,data.name)
                }
                break;
            case 'USRKEY':
              this.sendAllRoot({'command':"KEYCHG",'name':from,'puKey':data.puKey})
              break;
            case 'USRDAT':
                let chatData2 ={"command":"GIVDAT","tree":chat.conTree.toObject(),"users":chat.usersToObject(),"emotes": chat.emotesToObject(),"admin":chat.adminName,"root":chat.rootName};
                if(u.puKey!==data.puKey){
                  this.sendAllRoot({'command':"KEYCHG",'name':from,'puKey':data.puKey})
                }
                console.log("ASKDATA RECEIVED. Sending")
                this.sendAsRoot(chatData2,from)
              break;
            default:
                chat.handleFileCommand(from,chat.nameFromPeerID(from),data,2)

                //console.log("Unhandled command at admincon to "+from+".");
        }
    }else
        if(data.command==="USRDAT"){
            let message;
            
            if((uState === "unregistered" || !uState) ){
              if( chat.pass===data.pass){
                console.log(from)
                u=new user(1,chat.nameFromPeerID(from),importKey(data.puKey),true);
                console.log(u)
                message={"command":'NEWUSR',"role":u.role,"name":u.name,"puKey":u.puKey};
              }else{
                this.sendAsRoot({"command":"BADLOG",from})
                this.rootConHandler.removeCon(from);
                return;
              }

            }
            if(uState === "offline"){
              if(chat.pass===data.pass){
                if(u.puKey!==data.puKey){
                  this.sendAllRoot({'command':"KEYCHG",'name':from,'puKey':data.puKey})
                }
                chat.login(u.name);
                message={"command":'LOGINN',"name":chat.nameFromPeerID(from)};
              }else{

                  this.sendAsRoot({"command":"BADLOG"},from)
                  this.rootConHandler.removeCon(from);
                  return;
                }
            }
            let chatData ={"command":"GIVDAT","tree":chat.conTree.toObject(),"users":chat.usersToObject(),"emotes": chat.emotesToObject(),"admin":chat.adminName,"root":chat.rootName};
            console.log("ASKDATA RECEIVED. Sending")
            this.sendAsRoot(chatData,from)
            if(message){
              this.sendAllRoot(message);
            }
            
            this.updateConnections();

            //chat.updateConnections();
        }else{
          console.log("BAD MESSAGE")
            //chat.sendAsRoot({"command":'ERR','message':'Bad Login.'},from)
            //con.close();
        }
    

  }
  handleCommandFromAdmin(data){
    console.log("handleCommandFromAdmin:")
    console.log(data)
    let chat=this;
    switch (data.command) {
          case 'LOGINN':
            chat.login(data.name);

            chat.updateConnections()
            //chat.sendAllRoot(data);
            break;
        case 'NEWUSR':

            let u = new user(data.role,data.name,data.puKey,true);
            if(!chat.addUser(u)){
              chat.findUser(data.name).puKey=data.puKey;
            }

            chat.updateConnections()
            //chat.sendAllRoot(data);
            break;
        case 'LOGOUT':

            chat.logout(data.name);
            
            chat.updateConnections()
            //chat.sendAllRoot(data);
            break;
        case 'CYPHER':
          console.log("cypher received");
          this.adminPuKey=data.puKey;
        case 'GIVDAT':
            //console.log(data.tree)
            chat.conTree.fromObject(data.tree);
            chat.usersFromObject(data.users);
            chat.adminName=data.admin;
            chat.rootName=data.root;
            chat.emotesFromObject(data.emotes)
            chat.updateConnections();
            break;
        case 'UPTCON':
            this.sendRoot({"command":'ASKDAT'});
            break;
        case 'KEYCHG':
            this.findUser(data.name).puKey=data.puKey;
            break;  
        case 'DUPCON':
            break;
        default:
            chat.handleFileCommand(chat.rootName,"root",data,1)
    }
  }
  displayUsers(){
    let chat = this;
    var table = document.createElement('TABLE');
    table.border = '1';
  
    var tableBody = document.createElement('TBODY');
    table.appendChild(tableBody);
  
    var tr = document.createElement('TR');
    tableBody.appendChild(tr);
    let names = ["Name:","Role:","Public key:","Online:"]
    let value = ["name","role","puKey","online"]
    for (var j = 0; j < names.length; j++) {
      var td = document.createElement('TD');
      td.width = '75';
      td.appendChild(document.createTextNode(names[j]));
      tr.appendChild(td);
    }

    this.users.forEach(function(user){
      var tr = document.createElement('TR');
      tableBody.appendChild(tr);
  
      for (var j = 0; j < names.length; j++) {
        var td = document.createElement('TD');
        if(j===2){
          let div = document.createElement("div");
          div.style.display = "none";
          div.appendChild(document.createTextNode(user[value[j]]));
          let button = document.createElement("button");
          button.innerHTML = "Show/Hide";
          button.addEventListener ("click", function() {
            if(div.style.display==="block"){
              div.style.display = "none";
            }else{ 
              div.style.display = "block";
            }
          });
          td.appendChild(div);
          td.appendChild(button);
        }else{
          td.appendChild(document.createTextNode(user[value[j]]));

          if(j===3&&chat.rootName===chat.myName&&user[value[j]]===true){
            let button = document.createElement("button");
            button.innerHTML = "Kick";
            button.addEventListener ("click", function() {
              chat.sendAllRoot({"command":"LOGOUT","name":user.name,"date":Date.now()})
              displayGeneralError("User "+user.name+" kicked.")
            });
            td.appendChild(button);
          }
        }
        tr.appendChild(td);
        

      }
    })

    return table
  }

  rootFailureProtocol(forced = true,attempt = 1){
    console.log("Beginning root failure protocol.")
    //throw new Error()
    this.onSuddenClose()
    this.close()
    this.onSuddenClose()
    this.close()
    return;
    /*
    let chat = this;
    
   console.log("Beginning root failure protocol.")
    if(this.isRoot&&!forced){
      this.updateConnections();
      return;
    }
    if (!chat.rootCommunicator){
      chat.rootCommunicator = new EventEmitter();
          
    chat.setupRootComs(function(){
      console.log("Error creating new root peer, retrying to set up connection to root.")
      chat.normalCommunicator.emit("resetUpRootCon")
    });
      //chat.rootCommunicator.removeAllListeners();
   }

    chat.rootConHandler = new ConHandler(preChat+chat.name,undefined,function(){
      console.log("Success creating new root peer, retrying to set up connection to root.")
      if(chat.rootName!=chat.myName&&chat.rootConHandler.peer.id){
        chat.normalCommunicator.emit("resetUpRootCon")
       
      }
      
    },chat.rootCommunicator)
    
    /*console.log("Beginning root failure protocol.")
    if(this.isRoot&&!forced){
      this.updateConnections();
      return;
    }
    if (!chat.rootCommunicator){
      chat.rootCommunicator = new EventEmitter();
          
    chat.setupRootComs(function(){
      console.log("Error creating new root peer, retrying to set up connection to root.")
      chat.normalCommunicator.emit("resetUpRootCon")
    });
      chat.rootCommunicator.removeAllListeners();
   }

    chat.rootConHandler = new ConHandler(preChat+chat.name,undefined,function(){
      console.log("Success creating new root peer, retrying to set up connection to root.")
      if(chat.rootName!=chat.myName&&chat.rootConHandler.peer.id){
        chat.isRoot=true;
        //chat.conTree.makeNewRoot(chat.myName);
        chat.logout(chat.rootName);
        chat.rootName= chat.myName;
        if(forced)
          chat.rootConHandler.setNecessaryConnections(chat.users.map(v=>v.name),[]);
      }
      chat.normalCommunicator.emit("resetUpRootCon")
    },chat.rootCommunicator)

  
*/
      //chat.rootCommunicator.removeAllListeners();
   }
////STORAGE AREA
  shareFiles(fileArray){
    let chat = this;
    Array.from(fileArray).forEach(file=>{
      let name = null;
      try{
        name = chat.makeFileLink(file)
        chat.shareFileLink(name);
      }catch(e){
        console.log("Removed inputted file due to error.")
        console.log(e)
        if (name){
          chat.fileLinks.delete(name)
        }
      } 
    })
  }
  /**
   * Loads file from the file link database using it's nickname and begins its transfer to another user.
   * @param {String} filename nickname of the file, might be changed if necessary.
   * @param {String} username username (also accepts peerIds)
   * @param {Number} comMode 0 (default) => sends as normal. 1 => sends TO root, 2 => sends FROM root to the user.
   */
  loadAndSendFile(filename,username,comMode = 0){
    let chat = this;
    let sendF

    if (!filename||!(this.fileLinks.has(filename)||filename==="logs")){
      return false;
    }else{
     
      if(comMode===0)
        sendF = function(data,to){
          chat.sendNotEncoded(data,to)
        }
      else if (comMode ===1) 
        sendF  = function(data,to){
          chat.sendRoot(data)
        }
      else
        sendF  = function(data,to){
          chat.sendAsRoot(data,to)
        }

      let link
      if(filename==="logs"){
        filename = filename
        chat.fileTransfers.push({
          peer: username,
          action: "s",
          file: filename
        })
        chat.saveLogs();
        link = {
          path: path.join('.', 'UserData', this.myName,this.name,'logs.json'),
          date:Date.now(),
          type:"logs",
          size:fs.statSync(path.join('.', 'UserData', this.myName,this.name,'logs.json')).fileSizeInBytes
        }

      }else{
        //if(!filename.startsWith(chat.myName+":")){
        //  filename = chat.myName+":"+filename
        //}
        /*chat.fileTransfers.push({
          peer: username,
          action: "s",
          file: filename
        })*/
        link = this.fileLinks.get(filename);
      }
      console.log(filename)
      console.log(this.fileLinks)
      console.log(link)
      
      let readStream = fs.createReadStream(link.path,{ highWaterMark: 1  * 1024, encoding: 'binary' });
      chat.fileTransfers.push({
        peer: username,
        action: "s",
        file: filename,
        stream: readStream
      })
      readStream.on('readable', async function() {
        // There is some data to read now.
        let chunk;
        let transfer = chat.fileTransfers.find(t=>t.peer===username&&t.action==="s"&&t.file===filename)
        let step = 0;
        while ((chunk = this.read()) !== null&&step<10) {
          step++
          if(!transfer){
            if(!readStream.destroyed)
              readStream.destroy()
            chat.fileTransfers.splice(chat.fileTransfers.findIndex(t=>t.peer===username&&t.action==="s"&&t.file===filename))
            return;
          }

          sendF({"command":"FILDAT","filename":filename,"chunk":chunk},chat.peerIDFromName(username))
          chat.ensureConStability()
        }
      }).on('end', function() {
        sendF({"command":"FILEND","filename":filename,"date":link.date,
        "type":link.type,
        "size":link.size,"isEmote":true&&link.isEmote},chat.peerIDFromName(username))
        let i = chat.fileTransfers.findIndex(transfer=>transfer.peer===username&&transfer.action==="s"&&transfer.file===filename);
        if(i)
          chat.fileTransfers.splice(i)
      });
    }
  }
//TO-DO
/**
 * Shows the sharing in the chat, if the sharer is not you it will show a download button.
 * 
 * @param {String} trueFrom 
 * @param {String} filename 
 * @param {Number} size 
 */
  displayShareLink(trueFrom,filename,size){
    let chat=this;
    if(currentChat!=chat.name)
      return
    if(document.getElementById("chatfile-"+filename)){
      document.getElementById("chatfile-"+filename).outerHTML = "";
    }

    console.log("Adding to chat!");
    let li=document.createElement("li");
    li.setAttribute('id',"chatfile-"+filename);
    if(trueFrom === this.myName){
      
      let messageText = document.createTextNode("I started sharing the file \""+filename+"\" ("+displayFileSize(Number(size))+") ");
      li.appendChild(messageText);

    }else{
      let messageText = document.createTextNode(trueFrom+" wants to share the file \""+filename+"\" ("+displayFileSize(Number(size))+") ");
      var button = document.createElement("button");
      button.innerHTML = "Request";
      button.setAttribute('id',"chatFileButton-file-"+filename);
      button.addEventListener ("click", function() {
        chat.sendAll({"command":"RQFILE","filename":filename})
        
        button.disabled=true;
        button.innerHTML = "Requesting...";
      });
      li.appendChild(messageText);
      li.appendChild(button);
    }
    addElementToChat(chat.name,li)
    if(trueFrom===this.myName||this.fileLinks.get(filename)){
      this.displayFile(filename)
    }
  }
  displayFile(filename){
    let file = this.fileLinks.get(filename);
    if(!file){
      console.log(new Error("File "+filename+" not found."))
      return;
    }
    try{
    if(file.from!==this.myName){
      document.getElementById("chatFileButton-file-"+filename).innerHTML = "Downloaded"
      document.getElementById("chatFileButton-file-"+filename).disabled = true
    }

    if(this.fileLinks.get(filename).type.includes("audio")){
      let audio = document.createElement('audio');
      if(path.isAbsolute(file.path)){
        audio.src = file.path;
      }else{
        audio.src = path.resolve(".\\"+file.path).replace("\\resouces\\app","")
      }
      audio.autoplay = false;
      audio.controls=true;
      document.getElementById("chatfile-"+filename).appendChild(audio)

    }else
    if(this.fileLinks.get(filename).type.includes("image")){
      let img = document.createElement('img');
      if(path.isAbsolute(file.path)){
        img.src = file.path;
      }else{
        img.src = path.resolve(".\\"+file.path).replace("\\resouces\\app","")
      }
      document.getElementById("chatfile-"+filename).appendChild(img)

    }else
    if(this.fileLinks.get(filename).type.includes("video")){
      let video = document.createElement('video');
      if(path.isAbsolute(file.path)){
        video.src = file.path;
      }else{
        video.src = path.resolve(".\\"+file.path).replace("\\resouces\\app","")
      }
      video.autoplay = false;
      video.controls=true;
      document.getElementById("chatfile-"+filename).appendChild(video)
    }else
    {
      let button = document.createElement('BUTTON')
      button.innerHTML = "Show File"
      button.onclick = function(){
        if(path.isAbsolute(file.path)){
          let p =file.path

          shell.openPath(p.substring(0, p.lastIndexOf("\\"))) 
        }else{
          let p =  path.resolve(".\\"+file.path).replace("\\resouces\\app","")

          shell.openPath(p.substring(0, p.lastIndexOf("\\"))) 
        }
        
      }
      document.getElementById("chatfile-"+filename).appendChild(button)
      
    }
  }catch(err){console.log(err)}
  }
  shareFileLink(name){
    let file = this.fileLinks.get(name)
    if(!file){
      displayGeneralError("File not found.")
      console.log("ERROR FOUND")
      return;
    }
    this.sendAll({
      "command":"SHLINK",
      "filename":name,
      "size":file.size
    })
    this.logs.push({"from":this.myName,"file":name,"size":file.size,"date":Date.now()})
    this.displayShareLink(this.myName,name,file.size)
  }
  makeFileLink(file,isEmote=false){
    let name = this.myName+":"+file.name;
    let data = {
      "name":name,
      "path":file.path,
      "date":file.lastModified,
      "type":file.type,
      "size":file.size,
      "from":this.myName,
      "isEmote":isEmote
    }
    name= this.loadLink(data,true)
    return name;
  }
  removeFile(name,shouldDelete){

    let file = this.fileLinks.get(name);
    if(!file){
      return;
    }
    let filePath = file.path;
    this.fileLinks.delete(name);
    if(shouldDelete&&this.pathBelongsToThisChat(filePath)){
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath)
      }
    }
      
  }
  pathBelongsToThisChat(p){
    const relative = path.relative(path.join('.', 'UserData', this.myName,this.name), p);
    return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
  }
  usersToObject(){

    let objects =[];
    this.users.forEach(function(item,index){
      objects.push({role:item.role,name:item.name,puKey:item.puKey,'online':item.online});
    });

    return objects;
  }
  emotesToObject(){
    let emoteArray=[]
    this.emotes.forEach((link,name)=>emoteArray.push({"name":name,"link":link}))
    return emoteArray;
  }
  emotesFromObject(objectArray){
    let chat = this;
    objectArray.forEach(object=>chat.emotes.set(object.name,object.link))
  }
  async save(){
    /*(async () => {
      const db = await open({
        filename: './UserData/'+this.myName+'/'+this.name+'/storage.db',
        driver: sqlite3.cached.Database
      })
      await db.exec('CREATE TABLE usr (col TEXT)')
    
    })()*/
    let fName = path.join('.', 'UserData', this.myName,this.name);
    try {
      if (!fs.existsSync(fName)) {
        fs.mkdirSync(fName);
      }
    } catch (err) {
      console.error(err);
    }
    fName = path.join('.', 'UserData', this.myName,this.name,'users.json');
    fs.writeFile(fName, JSON.stringify(this.usersToObject()), err => {
      if (err) {
        console.error(err);
      } else {
        // file written successfully
      }
    });
    fName = path.join('.', 'UserData', this.myName,this.name,'emotes.json');
    fs.writeFile(fName, JSON.stringify(this.emotesToObject()), err => {
      if (err) {
        console.error(err);
      } else {
        // file written successfully
      }
    });
    fName = path.join('.', 'UserData', this.myName,this.name,'logs.json');
    fs.writeFile(fName, this.stringifyLogs(), err => {
      if (err) {
        console.error(err);
      } else {
        // file written successfully
      }
    });
    fName = path.join('.', 'UserData', this.myName,this.name,'config.json');
    fs.writeFile(fName, JSON.stringify(this.giveConfig()), err => {
      if (err) {
        console.error(err);
      } else {
        // file written successfully
      }
    });
    fName = path.join('.', 'UserData', this.myName,this.name,'linkPaths.json');
    fs.writeFile(fName, JSON.stringify(this.linksToObjects()), err => {
      if (err) {
        console.error(err);
      } else {
        // file written successfully
      }
    });
  }
  saveLogs(){
    let fName = path.join('.', 'UserData', this.myName,this.name,'logs.json');
    fs.writeFileSync(fName, this.stringifyLogs());
  }
  stringifyLogs(){
    return JSON.stringify(this.logs.filter(log=>log.from))
  }
  load(){
    let folderPath = path.join('.', 'UserData', this.myName,this.name);
    let usersPath = path.join('.', 'UserData', this.myName,this.name,'users.json');
    let logsPath = path.join('.', 'UserData', this.myName,this.name,'logs.json');
    let emotesPath = path.join('.', 'UserData', this.myName,this.name,'emotes.json');
    let configPath = path.join('.', 'UserData', this.myName,this.name,'config.json');
    let linkPath = path.join('.', 'UserData', this.myName,this.name,'linkPaths.json');
    if (!fs.existsSync(folderPath)) {
      return;
    }
    try{
      if (fs.existsSync(configPath)) {
        this.readConfig(JSON.parse(fs.readFileSync(configPath,{encoding:"ascii"})))
      }
    }catch(err){
      console.log("Error loading config!")
    } 
    try{
      if (fs.existsSync(logsPath)) {
        this.loadLinks(JSON.parse(fs.readFileSync(linkPath,{encoding:"ascii"})))
      }
    }catch(err){
      console.log("Error loading linked files!")
    }
    try{
    if (fs.existsSync(usersPath)) {
      this.usersFromObject(JSON.parse(fs.readFileSync(usersPath,{encoding:"ascii"})),false)
    }
  }catch(err){
    console.log("Error loading users!")
  }
  try{
    if (fs.existsSync(emotesPath)) {
      this.emotesFromObject(JSON.parse(fs.readFileSync(emotesPath,{encoding:"ascii"})))
    }
  }catch(err){
    console.log("Error loading emotes!")
  }
  try{
    if (fs.existsSync(logsPath)) {
      this.logsFromObject(JSON.parse(fs.readFileSync(logsPath,{encoding:"ascii"})))
    }
  }catch(err){
    console.log("Error loading logs!")
  }
  




  }
  loadLinks(links){
    links.forEach(l=>this.loadLink(l,false))
  }
  loadLink(linkObject,hasPriority){
    while(this.fileLinks.has(linkObject.name)){
      let f = this.fileLinks.get(linkObject.name)
      if(f.path === linkObject.path&&f.from===linkObject.from){
        if(hasPriority){
          f.date=linkObject.date
          f.size=linkObject.size
          if(linkObject.isEmote)
            f.isEmote=true
        }
        return linkObject.name;
      }else{
        if(linkObject.name.match("$[(][0-9]+[)]")){
          let splitted=linkObject.name.split("(");
          linkObject.name=splitted.slice(0,-1).join()+(1+splitted[splitted.length-1].slice(0,-1));
        }else{
          linkObject.name=linkObject.name+"(1)";
        }
      }
    }
    let isEmote = Boolean(linkObject.isEmote)
    this.fileLinks.set(linkObject.name,
      {
        "path":linkObject.path,
        "date":linkObject.date,
        "type":linkObject.type,
        "size":linkObject.size,
        "from":linkObject.from,
        "isEmote": isEmote
      });
      console.log("Link to "+linkObject.name+" loaded:")
      console.log(this.fileLinks.get(linkObject.name))
      return linkObject.name
  }
  linksToObjects(){
    let linkList=[]
    this.fileLinks.forEach((data,name)=>
      linkList.push({
        name:name,
        path:data.path,
        date:data.date,
        type:data.type,
        size:data.size,
        from:data.from
      })
    )
    return linkList;
  }
  /**
   * Adds a log array to the current logs, mixing them in correct date order and removing duplicates.
   * @param {Array} logs 
   * @returns 
   */
  logsFromObject(logs){
    console.log(this.logs)
    console.log(logs)
    let addedSomething = false;
    if(this.logs.length===0){
      this.logs=logs;
      return false;
    }
    if(logs.length===0){
      return false;
    }
    if(logs[logs.length-1].date<this.logs[0].date){
      this.logs=logs.concat(this.logs);
      return true;
    }else if(this.logs[this.logs.length-1].date<logs[0].date){
      this.logs=this.logs.concat(logs);
      return true;
    }else{
      let finalLog = []
      let i = 0;
      let j = 0;
      while(i<this.logs.length&&j<logs.length){
        if(deepEqual(this.logs[i],logs[j])){
          finalLog.push(this.logs[i])
          i++
          j++
        }else if(this.logs[i].date<logs[j].date){
            finalLog.push(this.logs[i])
            i++
        }else if(this.logs[i].date>logs[j].date){
            finalLog.push(logs[j])
            j++
            addedSomething=true;
        }else{
          finalLog.push(this.logs[i])
          finalLog.push(logs[j])
          i++
          j++
          addedSomething=true;
        }
      }
      if(i === this.logs.length){
        finalLog=finalLog.concat(logs.slice(j))
        addedSomething=true;
      }
      if(j === logs.length){
        finalLog=finalLog.concat(this.logs.slice(i))
      }
      this.logs=finalLog
    }
    return addedSomething
    
  }
  usersFromObject(usersObjects,outer=true){

    //console.log("usersFromObject:"+JSON.stringify(usersObjects));
    this.users=[];
    for (let i = 0; i < usersObjects.length; i++) {
      let u = this.users.find(user=>user.name===usersObjects[i].name)
      if(u){
        u.role=usersObjects[i].role;
        if(u.name!==this.myName){
          u.puKey=usersObjects[i].puKey;
          if(outer)
            u.online=usersObjects[i].online;
        }else{
          if(u.puKey!==this.puKey){
            if(outer){
              this.sendRoot({'command':'USRKEY','puKey':exportKey(this.puKey),'pass':this.pass})
            }
          }
        }
      }else
        this.users.push(new user(usersObjects[i].role,usersObjects[i].name,usersObjects[i].puKey,outer&&usersObjects[i].online));
    }

  }
  giveConfig(){
    return {
      adminName:this.adminName,
      //name:this.name,
      //pass:this.pass,
      myName:this.myName,
      puKey:this.puKey,
      prKey:this.prKey
    }
  }
  readConfig(config){
    if(config.adminName){
      this.adminName=config.adminName;
    }
    //if(config.name){
      //this.name=config.name;
    //}
    //if(config.pass){
      this.pass=config.pass;
    //}
    if(config.myName){
      this.myName=config.myName;
    }
    if(config.puKey){
      this.puKey=config.puKey;
    }
    if(config.prKey){
      this.prKey=config.prKey;
    }
  }
  requestDirectFileTransfer(to,filename){
    let chat= this;
    if(!this.conHandler.cons.has(this.peerIDFromName(to))){
      this.conHandler.createSpecialCon(chat.peerIDFromName(to),function(){
        chat.fileTransfers.push({
              peer: to,
              action: "s",
              file: filename
        })
        chat.sendNotEncoded({
          "command":"OFFERF", "filename":filename
        },chat.peerIDFromName(to))
      });

    }else
    chat.sendNotEncoded({
      "command":"OFFERF", "filename":filename
    },chat.peerIDFromName(to))

  }
  loadEmoteList(){
    let emoteList = document.getElementById("emoteList")
    emoteList.innerHTML=""
    this.emotes.forEach((value,key)=>{
      addEmoteToEmoteMenu(key,this.displayEmote(key))
    })
  }
  /////////////////////////EMOTE FUNCTIONS
  setupEmoteButton(keyword){
    let chat = this;
    let button = document.createElement("button");
    button.innerHTML = keyword;
    button.classList.add("emote")
    button.classList.add("emote_"+keyword)
    button.addEventListener ("click", function() {
      chat.sendAll({"command":"RQFILE","filename":chat.emotes.get(keyword)})
      button.innerHTML = "Requesting...";
    });
    return button;
  }
  setupEmoteImg(keyword){
    let link = this.fileLinks.get(this.emotes.get(keyword))
    let img = document.createElement('img');
    img.classList.add("emote")
    img.classList.add("emote_"+keyword)
    if(path.isAbsolute(link.path)){
      img.src = link.path;
    }else{
      img.src = path.resolve(".\\"+link.path).replace("\\resouces\\app","")
    }
    
    img.addEventListener('click',function(){
      document.getElementById("chatMessageInput").value+=":"+keyword+":"
    })
    return img;
  }
  setupEmoteText(keyword){
    let p = document.createElement("p")
    p.classList.add("emote")
    p.classList.add("emote_"+keyword)
    p.innerText=":"+keyword+":"
    return p;
  }
/**
 * @param {String} keyword the keyword of the emote
 * @param {Node?} e the element if it needs to be replaced
 * @returns the new element. (Note: it will also replace the old element if its given in e)
 */
  displayEmote(keyword, e=null){
    let chat = this;
    if(this.emotes.has(keyword)){//emote exists in database and...
      let link = this.fileLinks.get(this.emotes.get(keyword))

      if(e===null||!e){
        if(link){
          e = this.setupEmoteImg(keyword)
        }else{
          e = this.setupEmoteButton(keyword)
        }
        //document.getElementById("emoteList").appendChild(e)
        return e;
      }else{
        if(e.tagName==="IMG"){//Is a image
          if(!link){
            let a = this.setupEmoteButton(keyword)
            e.parentNode.replaceChild(a,e)
            return a
          }
        }else{//its not.
          if(link){
            let a =this.setupEmoteImg(keyword)
            e.parentNode.replaceChild(a,e)
            return a
          }
        }
      }
    }else{//emote doesnt exist, so draw as text
      if(e!==null){
        let a = this.setupEmoteText(keyword)
        e.parentNode.replaceChild(a,e)
        return a

      }else{
        return this.setupEmoteText(keyword);
      }
    }
  }
  /**
   * Checks the whole document and replaces instances of the emote if necesary (both the emote menu button and all instances of it in chat).
   * @param {String?} keyword the name of the emote, leave empty to update all emotes.
   */
  updateAllEmotes(keyword=undefined){
    let elements
    let chat = this;
    if(!keyword){
      elements = document.getElementsByClassName("emote")
      Array.from(elements).forEach((element) => {
        keyword=(""+element.classList[1]).replace("emote_","")
        chat.displayEmote(keyword,element)
      });
    }
    else{
      elements = document.getElementsByClassName("emote_"+keyword)
      Array.from(elements).forEach((element) => {
        chat.displayEmote(keyword,element)
      });
    }
      

  }
  shareEmote(name,selectedFile){
    //selectedFile.type="emote";
    console.log("selectedFile")
    console.log(selectedFile)
    let link = this.makeFileLink(selectedFile,true)
    this.sendRoot({'command':"OFFEMO","name":name,"link":link})
  }
  ////OTHER
  /**
   * Closes all connections, basically making the chat dead.
   */
    close(){
      this.save()
      console.log("Closing the chat.")
  
      this.closed=true;
      this.normalCommunicator.removeAllListeners();
      if (this.rootConHandler){
        this.rootConHandler.close()
      }
      if (this.conHandler){
        this.conHandler.close()
      }
  
      chats.delete(this.name);
      delete this;
    }
}

// 
// id: number assigned to user in order of joining
// role: 0 =admin, 1=mod, 2=user, 3= requesting
/**
 * Stores public data of each user. Has the parameters role, used to diferentiate user privilege levels, a name, a public key for message validation and whether it's online or not.
 */
class user{
  /**
   * Creatues a user from the following parameters:
   * @param {Number} role Used to check if the user has permissions to do certain actions in the chat according to its protocol. Usually: 0 = admin, 1 = moderator, 2 = user, 3 = requesting to join. 
   * @param {String} name The name of the user.
   * @param {String} puKey The public key of the user, used for crypto, mainly for message validation so there is no impersonations.
   * @param {Boolean} online Whether the user is online or not.
   */

    constructor(role,name,puKey,online=true){
      this.role=role;
      this.name=name;
      this.puKey=puKey;
      this.online=online;
    }
  }


/////////////////////////////////////////////


//////////////////FUNCTIONS//////////////////




//Step 1: Setup the user.
//TO-DO:
// -Setup PEERJS_OPTIONS.
// -Add cyphering.
function setupUser(username,settings){
  me.username=username;
  //me.password=password;
  if(!settings){
    settings = {}
  }
  [me.prKey,me.puKey]=generateKeys();
  //console.log(me)
  //let a = sign("hello",  me.prKey, username, password)//, me.username,me.password)
  //let b = verify(a,"hello", me.puKey);
  //console.log(b)
  //me.peerJsOptions=settings.peerJsOptions;
  me.peer = new Peer(pre.concat(username),PEERJS_OPTIONS);
  me.peer.on('error',function(err){
    console.log(err);
    if(err.type==='unavailable-id'||err.type==='invalid-id'){
      displayGeneralError("Username invalid or already taken, please try another one.")
      me.username=null;
      me.peer.destroy();
    }else if (err.type==='peer-unavailable'){
      displayDmErr("User not found online, message will not reach them.");
    }else{
      displayGeneralError("Error with user peer detected. This might be nothing, or it might be fatal to the ability to connect to other users. If so, please notify the app developer.")
    }
  });
  me.peer.on('connection', function(con) {
    con.serialization='json';
    console.log("Connected to user "+(''+con.peer).replace(pre,''));
    var sender=(''+con.peer).replace(pre,'');
    con.on('data', function(data) {
      console.log("Data received at user con: "+data.command);
      if(data.command==="INVCHT"){
        me.dmLogs.push({command:"/invite",args:[sender,data.date,data.chatId,data.pass,false]})
        displayInvite(sender,data.date,data.chatId,data.pass,false);
      }
      if(data.command==="DM"){
        
        me.dmLogs.push({command:"/dm",args:[sender,me.username,data.message,data.date]})
        displayDm(sender,me.username,data.message,data.date)
        
        
      }
    });
  });
  me.peer.on('open',function(){
    me.dmLogs=[]
    document.getElementById("username").appendChild(document.createTextNode("Welcome, "+username));
    document.getElementById('DMsButton').disabled = false;
    document.getElementById('plus').disabled = false;
    changeMode('chatCreation');
    var folderName = path.join('.', 'UserData');
    try {
      if (!fs.existsSync(folderName)) {
        fs.mkdirSync(folderName);
      }
    } catch (err) {
      console.error(err);
    }
    var folderName = path.join('.', 'UserData', username);
    try {
      if (!fs.existsSync(folderName)) {
        fs.mkdirSync(folderName);
        var jsonPath = path.join('.', 'UserData', username, 'config.json');
        fs.writeFile(jsonPath, JSON.stringify(me.settings), err => {
          if (err) {
            console.error(err);
          } else {
            // file written successfully
          }
        });
      }else{
        loadSession(username)
      }
    } catch (err) {
      console.error(err);
    }
    
  });
}
//Step 2.A: Create a chat.
//TO-DO:
// -Setup PEERJS_OPTIONS.
// -Add cyphering.
// -Add admin acceptance of users.

function createChat(chatName,chatPass){
  //Star chat Peer
  if(!chatName.match("^[a-zA-Z0-9]*$")){
    displayGeneralError('Invalid chat name. Name must only include numbers and letters.')
    return;
  }
  let chat  = new chatData(chatName,chatPass,me.username,me.puKey,me.prKey,true,function(){
    currentChat2=chatName;
    chats.set(chat.name,chat);
    saveSession(me.username)
    chatPrepareTab(chat.name);
    
  },function(){
    displayGeneralError('Chat with name '+chatName+' could not be created.')
    chat.close();
    chatClose(chatName);
  });
}

//Step 2.B: Join a chat.


function joinChat(chatName,chatPass){
  var chatName;

  //Step 1: Rcv Pukey back, send cyphered Password to connection, if error tell renderer
  let chat  = new chatData(chatName,chatPass,me.username,me.puKey,me.prKey,false,function(){
    currentChat2=chatName;
    chats.set(chat.name,chat);
    saveSession(me.username)
    chatPrepareTab(chat.name);
  },function(){
    displayGeneralError('Chat with name '+chatName+' could not be joined.');
    chat.close();
    chatClose(chatName);
  });
}


//Setup message handling -> setConInGroup

//Step 3: Send Message.



//Step 4: Switch chats.


//Step 5: Close chat.

  //console.log("Closing chat: ["+ params+"]")


//DM stuff




//DM stuff



function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class Message{
  constructor(user,date,message){
    this.id=nextmessageID;
    this.from=user;
    this.date=date;
    this.message=message;

    nextmessageID+=1;
  }
}

//Session:
function loadSession(username){
  console.log("loading")
  let jsonPath = path.join('.', 'UserData', username, 'config.json');
  let chatsPath = path.join('.', 'UserData', username, 'onlineChats.json');
  let sessionDMsPath = path.join('.', 'UserData', username, 'DMs.json');
  try{
    me.config= JSON.parse(fs.readFileSync(jsonPath))
  }catch(err){
    console.log(err)
  }
  try{
    let chatList = JSON.parse(fs.readFileSync(chatsPath))
    chatList.forEach(t=>chats.set(t.name,createChat(t.name,t.pass)))
  }catch(err){
    console.log(err)
  }
  try{
    me.dmLogs = JSON.parse(fs.readFileSync(sessionDMsPath))
    me.dmLogs.forEach(dm=>{
      if(dm.command==="/dm"){
        displayDm(...dm.args)
      }else if(dm.command==="/invite"){
        displayInvite(...dm.args)
      }
    })
  }catch(err){
    console.log(err)
  }
  
  


}
function saveSession(username){
  console.log("Saving user data:")
    let jsonPath = path.join('.', 'UserData', username, 'config.json');
    //fs.writeFileSync(jsonPath, JSON.stringify(me.config))
    /*, err => {
      if (err) {
        console.error(err);
      } else {
        // file written successfully
      }
    })*/
    let chatsPath = path.join('.', 'UserData', username, 'onlineChats.json');
    let chatList=[]
    chats.forEach((chat,name)=>{if(chat)chatList.push({'name':name,'pass':chat.pass})})
    fs.writeFileSync(chatsPath, JSON.stringify(chatList))
    console.log(JSON.stringify(chatList))
    /*, err => {
      if (err) {
        console.error(err);
      } else {
        // file written successfully
      }
    })*/
    let sessionDMsPath = path.join('.', 'UserData', username, 'DMs.json');
    fs.writeFileSync(sessionDMsPath, JSON.stringify(me.dmLogs))
    console.log(JSON.stringify(me.dmLogs))
    /*, err => {
      if (err) {
        console.error(err);
      } else {
        // file written successfully
      }
    })*/
    chats.forEach((chat,name)=>{
      if(chat&&chat.myName)
        chat.save()
      else{
        chats.delete(name)
      }
    })

}





//Add messages to chat
function addElementToChat(chatName,e){
  if(chatName===currentChat)
    document.getElementById("chatBox").appendChild(e);
}
function addToChat(chatName,message){
    if(chatName!==currentChat)
      return;
    let chat= chats.get(currentChat)
    let li=document.createElement("li");
    li.setAttribute('id',message.id);
    let time = new Date(message.date);
    let messageDate = document.createTextNode(''+time.getHours()+':'+time.getMinutes()+' ');
    let name=document.createElement("b").appendChild(document.createTextNode(message.from));
    let messageText = document.createTextNode(': ');
    let parsedMessage = ""+message.message;

    li.appendChild(messageDate);
    li.appendChild(name);
    li.appendChild(messageText);
    let wasLastEmote = false;
    parsedMessage.split(":").forEach((subR,i)=>{
      if(i===0||i==parsedMessage.length-1){
        li.appendChild(document.createTextNode(subR));
        wasLastEmote=false;

      }else
      if(chat.emotes.has(subR)){
        li.appendChild(chat.displayEmote(subR))
        wasLastEmote=true;
      }else{
        if(!wasLastEmote){
          li.appendChild(document.createTextNode(":"+subR));
        }else{
          li.appendChild(document.createTextNode(subR));
        }
        
        wasLastEmote=false;
      }
    })
    //messages.push(mParsed);
    document.getElementById("chatBox").appendChild(li);

}
function addEventToChat(date,message,chat){
  if(chat&&chat!==currentChat) return
  let li=document.createElement("li");
  //li.setAttribute('id',mParsed.id); no need for a ID
  let time = new Date(date);
  let messageDate = document.createTextNode(''+time.getHours()+':'+time.getMinutes()+' ');
  let text = document.createTextNode(message);
  li.appendChild(messageDate);
  li.appendChild(text);
  
  //messages.push(message);
  document.getElementById("chatBox").appendChild(li);
}

//Creates User
function userCreate(){
  var username = document.getElementById("createUserName").value;
  console.log(username)
  //var password = document.getElementById("createUserPass").value;
  var settings = {"peerJsOptions":PEERJS_OPTIONS};
  myID=username;
 setupUser(username//,password
 ,settings)
}
//Creates/Joins a chat and prepares the html to host it
function chatJoin(){
  var name =document.getElementById("joinChatName").value;
  var pass =document.getElementById("joinChatPass").value;
  if(deepEqual(me,{})){
    displayGeneralError('User not setup, please set username first.')
  }else{
  joinChat(name,pass);
  }
}
function chatCreate(){
  var name =document.getElementById("createChatName").value;
  var pass =document.getElementById("createChatPass").value;
  if (deepEqual(me,{})){
    displayGeneralError('User not setup, please set username first.')
  }else{
    createChat(name,pass);
  }
}
function chatPrepareTab(id){
  var button = document.createElement("button");
  button.innerHTML = id;
  button.setAttribute('id',"chatButton"+id);
  button.addEventListener ("click", function() {
    changeMode('chat',id);
  });
  var buttonClose = document.createElement("button");
  buttonClose.innerHTML = 'x';
  buttonClose.setAttribute('id',"chatClose"+id);
  buttonClose.addEventListener ("click", function() {
    chatClose(id);
  });
  chatMenu.prepend(buttonClose);
  chatMenu.prepend(button);
  changeMode('chat',id);
}
//Closes chat tab
function chatClose(chatName){
  let button = document.getElementById("chatButton"+chatName);
  let button2 = document.getElementById("chatClose"+chatName);
  if(mode ==='chat' && currentChat===chatName){
    changeMode('chatCreation');
  }
  if (button)
    button.remove();
  if (button2)
    button2.remove();
    let chat=chats.get(chatName);
    //if (!chat){
      //displayGeneralError('Chat with name '+chatName+' does not exist.');
    //}else{
    try{
      chats.delete(chatName);
      chat.close();
      saveSession(me.username)
    }catch(e){console.log(e)}
    if(currentChat2===chatName){
      currentChat2=null;
    }
}

//Switches chat
function chatSwitchStart(chatName){
  if (!chats.get(chatName)){
    displayGeneralError('Chat with name '+chatName+' does not exist.')
  }else{
    currentChat2=chatName;
    document.getElementById("chatName").textContent=currentChat2;
    console.log(chats.get(currentChat2).logs);
    //myID=0;
    resetChat(chats.get(currentChat2).logs)
    chats.get(currentChat).loadEmoteList()
  }
}

//Changes between chat, dm, and new chat menus.
function changeMode(m, chat=null){
  //console.log(m);
  //console.log(mode);
  if(mode!==m){
    hide(mode);
    mode=m;
    show(mode);
  }
  if(chat&&chat!==currentChat){
    mode='chat';
    currentChat=chat;
    chatSwitchStart(chat);
  }
}
function hide(id){
  let e =document.getElementById(id);
  e.style.display = "none";
}
function show(id){
  let e =document.getElementById(id);
  e.style.display = "block";
}
//Sends and receives chat messages/events
function chatSendMessage(){
  let date= new Date().getTime();
  let message = document.getElementById("chatMessageInput").value;
  let chat=chats.get(currentChat);
  chat.sendMessage(date,message)
  console.log('Message sent:', message);
  addToChat(currentChat,new Message(myID,date,message));
  document.querySelector("#chatMessageInput").value="";
}

//Treats dm messages and sends them
function dm(){
  let time = Date.now()
  let message = document.getElementById("dmMessageInput").value;

  let command = message.split(' ')[0];
  let to = message.split(' ')[1].split(',')[0].trim();
  let text = message.split(',')[1].trim();
  if(!command ||!text || !to){
    return;
  }
  if(command==="/dm"){
    let sender = me.username;
    displayDm(sender,to,text,time)
    me.dmLogs.push({command,args:[sender,to,text,time]})
    sendDM(to, time, text)
  }else if (command==="/invite"){
    let pass=inviteToChat(to, time, text)
    if (pass||pass===""){
      me.dmLogs.push({command,args:[to,time,text,pass,true]})
      displayInvite(to,time,text,pass,true);
    }
  }
  document.querySelector("#dmMessageInput").value="";
  
  saveSession(me.username)

}
function displayDm(sender,to,message,date){
    if(typeof date === "number"||typeof date ==="string")
      date = new Date(date)
    let li=document.createElement("li");
    let text = document.createTextNode(''+date.getHours()+':'+date.getMinutes()+' '+sender+'=>'+to+': ' + message);
    li.appendChild(text);
    document.getElementById("dms").appendChild(li);
}
function displayInvite(friend,date,chat,pass,isSender=true){
  if(typeof date === "number"||typeof date ==="string")
  date = new Date(date)
  if(isSender){
    let li=document.createElement("li");
    let messageDate = document.createTextNode(''+date.getHours()+':'+date.getMinutes()+' ');
    let name=document.createElement("b").appendChild(document.createTextNode('You have invited '+friend+' to chat '+chat+'.'));
    li.appendChild(messageDate);
    li.appendChild(name);
    document.getElementById("dms").appendChild(li);
  }else{
    let li=document.createElement("li");
    let text = document.createTextNode(''+friend+' has invited you to join the chat named"' + chat+'".');
    var button = document.createElement("button");
    button.innerHTML = "Join";
    li.appendChild(text);
    li.appendChild(button);
    document.getElementById("dms").appendChild(li);
    button.addEventListener ("click", function() {
      //button.disabled = true;
      button.innerHTML = "Joined"
      createChat(chat,pass);
    });
  }
}
function sendDM(user, time, text){
  if (deepEqual(me,{})){
    displayGeneralError("User not setup, please set username first");
  }else{
    let con =me.peer.connect(pre+user,{"serialization":"json"});
    con.serialization='json';
    con.on('error', function(err){
      console.log(err);
      displayDmErr("Error in connection to "+user+".");
      con.close();
    });
    con.on('close', function(){
      console.log("con closed");
    });
    con.on('open',async function(){
      con.send({"command":"DM",'user':me.username,'date':time,'message':text});
      await sleep(100);
      con.close();
    });
  }
}

function inviteToChat(user, time, chat){
  if (deepEqual(me,{})){
    displayGeneralError("User not setup, please set username first");
    return;
  }
  console.log("Chat:"+chat)
  var c =chats.get(chat);
  if (!c){displayDmErr("User is not in chat. Can't invite other users to a place where you aren't."); return;}
  if (c.canUser(c.myName,"invite")) {
    let con =me.peer.connect(pre+user,{"serialization":"json"});
    con.on('error', function(err){
      console.log(err);
      displayDmErr("Error in connection to "+user+".");
      con.close();
    });
    con.on('close', function(){
      console.log("con closed");
    });
    con.on('open',async function(){
      con.send({"command":"INVCHT",'date':time,'chatId':c.name,"pass":c.pass});
      //TO-DO: proof via private key encoding of date+invited username.
      await sleep(100);
      con.close();
    });
    return c.pass;
  }else displayDmErr("User doesn't have permissions to invite another user.");
  
}


function resetChat(logs){
  console.log(logs)
  let i=0;
  document.getElementById("chatBox").textContent='';
  logs.forEach(function(item){
    console.log(item)
    if(item.from){
      if(item.file){
        console.log("ITS A FILE")
        chats.get(currentChat).displayShareLink(item.from,item.file,item.size)
      }else{
        console.log("ITS A MESSAGE")
        let m= new Message(item.from,item.date,item.message)
        addToChat(currentChat,m);
      }

    }else{
      console.log("ITS A EVENT")
      addEventToChat(item.date,item.message,currentChat);
      i=i+1;
    }
  });
}


//Error popup.
//var stayAmmount = 0;


function displayGeneralError(data){
  let stayAmmount= 5000;
  document.getElementById("ErrorText").innerHTML=data;
  console.log(data)
  sleep(stayAmmount);
  setTimeout(()=>{
    if(document.getElementById("ErrorText").innerHTML===data)
            document.getElementById("ErrorText").innerHTML="";
  },5000);
}
document.getElementById("ErrorText").addEventListener('click',function(){
  document.getElementById("ErrorText").innerHTML=""
});


function fadeOutEffect(name) {
  var fadeTarget = document.getElementById(name);
  if (!fadeTarget.style.opacity) {
    fadeTarget.style.opacity = 1;
  }
  if (name.opacity===1){
    var fadeEffect = setInterval(function () {
        if (fadeTarget.style.opacity > 0) {
          fadeTarget.style.opacity -= 0.1;
        } else {
          fadeTarget.style.display = "none";
          clearInterval(fadeEffect);
        }
    }, 200);    
  }
  
}
function fadeInEffect(name) {
  var fadeTarget = document.getElementById(name);
  if (!fadeTarget.style.opacity) {
    fadeTarget.style.opacity = 1;
  }
  if (name.opacity===0){
    var fadeEffect = setInterval(function () {
        if (fadeTarget.style.opacity < 1) {
          fadeTarget.style.opacity += 0.1;
        } else {
          fadeTarget.style.display = "block";
          clearInterval(fadeEffect);
        }
    }, 200);    
  }
  
}


    //source: https://dmitripavlutin.com/how-to-compare-objects-in-javascript/
    function deepEqual(object1, object2) {
      const keys1 = Object.keys(object1);
      const keys2 = Object.keys(object2);
    
      if (keys1.length !== keys2.length) {
        return false;
      }
    
      for (const key of keys1) {
        const val1 = object1[key];
        const val2 = object2[key];
        const areObjects = isObject(val1) && isObject(val2);
        if (
          areObjects && !deepEqual(val1, val2) ||
          !areObjects && val1 !== val2
        ) {
          return false;
        }
      }
    
      return true;
    }
    
    function isObject(object) {
      return object != null && typeof object === 'object';
    }





function displayDmErr(err){
  let li=document.createElement("li");
  let text = document.createTextNode(err);
  li.appendChild(text);
  document.getElementById("dms").appendChild(li);
}



function chatShowTree(){
  document.getElementById("dataDisplayArea").innerHTML=chats.get(currentChat).conTree.display();

}
function chatShowUserTable(){
  document.getElementById("dataDisplayArea").innerHTML="Root ID:"+chats.get(currentChat).rootName;
  document.getElementById("dataDisplayArea").appendChild(chats.get(currentChat).displayUsers());

}
function chatUpdateCons(){
  chats.get(currentChat).updateConnections();
}
function chatShowConHandlers(){
  let chat = chats.get(currentChat);
  document.getElementById("dataDisplayArea").innerHTML="Normal conHandler:"
  document.getElementById("dataDisplayArea").appendChild(chats.get(currentChat).conHandler.display());
  if (chat.rootConHandler){
    document.getElementById("dataDisplayArea").appendChild(document.createTextNode("Root peer connections:"))
    document.getElementById("dataDisplayArea").appendChild(chats.get(currentChat).rootConHandler.display());
  }
}
function chatShareFile(){
  let chat = chats.get(currentChat);
  chat.shareFiles(document.getElementById("fileToShare").files);
}
function chatShareEmote(){
  let chat = chats.get(currentChat);
  let selectedFile = document.getElementById("emoteUpload").files[0];
   selectedFile = {
    name:selectedFile.name,
    path:selectedFile.path,
    lastModified:selectedFile.lastModified,
    size:selectedFile.size,
    type:selectedFile.type

  }
  console.log( document.getElementById("emoteUpload").files[0])
  let name = document.getElementById("emoteName").value;
  chat.shareEmote(name,selectedFile);
}
function displayFileSize(byteCount){
  let fileSize = byteCount.toString();

  if(fileSize.length < 7) return `${Math.round(+fileSize/1024).toFixed(2)}kb`
      return `${(Math.round(+fileSize/1024)/1000).toFixed(2)}MB`

}
function addEmoteToEmoteMenu(name,htmlElement){
  console.log("Adding emote to menu: "+ name)
  console.log(htmlElement)
  let eList = document.getElementById("emoteList")
  let emotes = eList.getElementsByClassName("emote_"+name)
  console.log(emotes)
  if(emotes.length!==0){
    emotes[0].parentNode.replaceChild(htmlElement,emotes[0])
    //eList.removeChild(emotes[0])
  }else{
    eList.appendChild(htmlElement)
    if(chats.get(currentChat).myName===chats.get(currentChat).rootName){
      let button = document.createElement("button");
      button.innerHTML="x"
      button.setAttribute('id', "emoteRemove_"+name);
      button.addEventListener ("click", function() {
        chats.get(currentChat).sendAllRoot({"command":"REMEMO","name":name})
      });
      eList.appendChild(button)
    }

  }
  
}
function removeEmoteFromMenu(name){
  let eList = document.getElementById("emoteList")
  try{
    eList.removeChild(document.getElementById("emoteRemove_"+name))
  }catch(e){}
  eList.removeChild(eList.getElementsByClassName("emote_"+name)[0])
}

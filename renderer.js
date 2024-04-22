/**
 * This file is loaded via the <script> tag in the index.html file and will
 * be executed in the renderer process for that window. No Node.js APIs are
 * available in this process because `nodeIntegration` is turned off and
 * `contextIsolation` is turned on. Use the contextBridge API in `preload.js`
 * to expose Node.js functionality from the main process.
 */
const chatMenu = document.getElementById("chats");
const EventEmitter = require('events');
const mainEvents = new EventEmitter();
const path = require('path');
//import { DataConnection, ConnectionEventType, BaseConnection } from './peerjs.min.js'
const { emitKeypressEvents } = require('readline');
const fs = require('fs')
const sqlite3 = require('sqlite3')
const open = require('sqlite').open

import {Peer} from "https://esm.sh/peerjs@1.5.2?bundle-deps"
//const Peer = require('peerjs').Peer;
import {P2PTreeNode,P2PTreeNodeTree, P2PMeshNode, P2PFullConnectedTopo} from "./topology.js"
import {ConHandler, ConData,PEERJS_OPTIONS, CON_OPTIONS} from "./conHandler.js"
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
  document.querySelector("#fileUploadForm").addEventListener('click', e => {
    e.preventDefault();
    chatShareFile();
  });
  document.querySelector("#chatRQLOGS").addEventListener('click', e => {
    e.preventDefault();
    chats.get(currentChat).sendRoot({"command":"RQLOGS"})
  });
  show('start');
  hide('chat');
  hide('DMs');
  hide('chatCreation');
  hide('peerServer');




};



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
    }


    this.users.push(new user(2,this.myName,this.puKey,true));
    this.load();
    this.normalCommunicator = new EventEmitter();
    this.conTree = new P2PTreeNodeTree(chat.myName);

   
    if(isAdmin){
      this.adminName=this.myName;
      this.rootName=this.adminName;
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
        chat.setupConHandler(onComplete,onFailure);
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
        //onDisconnect= function(id){ ////CAUTION - ENABLING THIS BREAKS THE CLOSE FUNCTION FOR SOME REASON DONT TOUCH
          //if(id===chat.peerIDFromName(chat.rootName))chat.rootFailureProtocol()
          //else chat.sendRoot({"command":'USRLOS',"name":chat.nameFromPeerID(id)})
        //};

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
        chat.sendRoot({"command":'USRLOS',"name":chat.nameFromPeerID(id)})
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
        mainEvents.emit('renderer:chatEvent',event);
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
    //console.log("User logging out: "+ name)
    //this.pre(insideAnother);

    let u=this.findUser(name);
    if(u){
      if(u.online===true){
        
        let event = {'date': new Date().getTime(),'message':'User '+name+' left the chat.','chat':this.name}
        mainEvents.emit('renderer:chatEvent',event);
        this.logs.push(event);
        u.online=false;
        this.conTree.remove(name);
        //if(name===this.adminName) this.rootFailureProtocol(undefined,true);
        this.updateConnections();
      }
    }else{
      //this.post(insideAnother);
      throw new Error('User not found!');
    }
    //this.post(insideAnother);
  }

  addUser(u){
    if(!this.findUser(u.name)){
      let event = {'date': new Date().getTime(),'message':'User '+u.name+' joined the chat.','chat':this.name}
      mainEvents.emit('renderer:chatEvent',event);
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
    mainEvents.emit('renderer:chatEvent',event);
    this.logs.push(event);
    u=this.findUser(name);
    if(u){
      u.online=false;
      this.conTree.remove(name);
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
    let u = this.findUser(username);
    if(u){
      if(this.getBehaviourPermLevel(behaviour)>=u.role){
        return true;
      }
    }
   return false;
  }
  getBehaviourPermLevel(behaviour){
    let s = this.settings.get(behaviour);
    if(s) return s;
    return 2;
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
    if(data.command!=="FILDAT"){
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
          mainEvents.emit('renderer:chatEvent',{'date':data.date,'message':data.name+' logged back in.'});
          chat.logs.push({'date':data.date,'message':data.name+' logged back in.'});
          chat.reSend(dataOld,from);
          break;
      case 'NEWUSR':
          if(trueFrom!==this.rootName){
            chat.conHandler.sendTo([from],{"command":"ERR",'message':"Tried to fake message!"});
            return;
          }
          let u = new user(1,data.name,data.puKey,true);
          chat.addUser(u);
          mainEvents.emit('renderer:chatEvent',{'date':data.date,'message':data.name+' joined the chat.','chat':chat.name});
          chat.logs.push({'date':data.date,'message':data.name+' joined the chat.'});
          chat.reSend(dataOld,from);
          break;
      case 'LOGOUT':
          if(trueFrom!==this.rootName&&trueFrom!==this.myName){
            this.conHandler.sendTo([from],{"command":"ERR",'message':"Tried to fake message!"});
            return;
          }
          chat.logout(data.name);
          mainEvents.emit('renderer:chatEvent',{'date':data.date,'message':data.name+' logged out.'});
          chat.logs.push({'date':data.date,'message':data.name+' logged out.'});
          chat.reSend(dataOld,from);
          break;
      case 'USRLOS':
          if(chat.amRoot){
              chat.logout(data.name);
              mainEvents.emit('renderer:chatEvent',{'date':data.date,'message':data.name+' logged out.'});
              chat.logs.push({'date':data.date,'message':data.name+' logged out.'});
              chat.sendAll({"command":'LOGOUT',"name":data.name});
          }else{
              chat.reSend(dataOld,from);
          }
          break;
      
      case 'SNDMES':
          chat.logs.push({'from':data.from,'date':data.date,'message':data.message});
          mainEvents.emit('renderer:messageRcv',{'user':data.from, 'date':data.date, 'message':data.message});
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
        chat.reSend(dataOld,from)
        break;
      case 'RQFILE':
        if(chat.fileLinks.has(data.filename)){
          chat.requestDirectFileTransfer(trueFrom,data.filename)
        }else{
          chat.reSend(dataOld,from)
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
          if(!chat.handleEmoteCommand(from,trueFrom,data))
            chat.handleFileCommand(from,trueFrom,data)


    }
  }

  setEmo(name,fileLink){
    this.sendAllRoot({'command':'NEWEMO','name':name,'fileLink':fileLink})
  }
  handleEmoteCommand(from,trueFrom,data){
  switch(data.commmand){
    case 'NEWEMO':
      if(trueFrom===this.rootName)
        this.emotes.set(data.name,data.fileLink)
        return true;
    case'REMEMO':
      if(trueFrom===this.rootName)
        this.emotes.delete(data.name)
      return true;
    case 'OFFEMO':
      if(this.myName===this.rootName){
        if(!this.fileLinks.has(data.fileLink)){
          this.send({"command":"RQFILE","filename":data.fileLink},from)
        }
        
          
      }

       
      return true;
    default:
      return false;
  }
}
/**
 * 
 * @param {*} from the id of the peer the data was received from. (peerId format)
 * @param {*} trueFrom the name of the true origin of the data. (name format)
 * @param {Object} data the data that is being handled.
 * @param {Number} comMode 0 (default) => sends as normal. 1 => sends TO root, 2 => sends FROM root to the user.
 * @returns 
 */
  handleFileCommand(from,trueFrom,data,comMode=0){
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
          stream: fs.createWriteStream(fPath, {encoding: 'binary',flags: 'w'})
        })
        sendF({"command":"FOFFOK","filename":data.filename},from)
        break;
      case 'FILDAT':
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
        let transfer3 = chat.fileTransfers.find(t=>t.peer=trueFrom&&t.action==="s"&&t.file===data.filename)
        let step = 0;
        while ((chunk = transfer3.stream.read()) !== null&&step<10) {
          step++
          sendF({"command":"FILDAT","filename":data.filename,"chunk":chunk},chat.peerIDFromName(trueFrom))
        }
        break;
      case 'FILEND':
        let j = chat.fileTransfers.findIndex(v=>v.file===data.filename&&v.action==="r"&&v.peer===trueFrom)
        if(j===-1){
          return;
        }
        let [transfer2]=chat.fileTransfers.splice(j);
        try{
          transfer2.stream.close()
        }catch(e){
          console.log(e)
        }
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
            "path":path.join('.', 'UserData', chat.myName,chat.name,'downloads',(""+data.filename).replace(':',"_")),
            "date":data.date,
            "type":data.type,
            "size":data.size,
            "from":chat.nameFromPeerID(trueFrom)
          }
          let name= this.loadLink(d,true)
          chat.displayFile(name)
        }

        break;
      default:
        return false;
    }
    return true;
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
    if(data.command!=="FILDAT"){
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
                let chatData ={"command":"GIVDAT","tree":chat.conTree.toObject(),"users":chat.usersToObject(),"admin":chat.adminName,"root":chat.rootName};
                chat.sendAsRoot(chatData,from)
                break;
            case 'USRLOS':
                console.log("User lost!");
                if(this.rootConHandler.cons.has(data.name)&&this.rootConHandler.cons.get(data.name).state!=="Off"){
                  let chatData ={"command":"GIVDAT","tree":chat.conTree.toObject(),"users":chat.usersToObject(),"admin":chat.adminName,"root":chat.rootName};
                  chat.sendAsRoot(chatData,from)
                }else{
                  //let message ={'date':new Date().getTime(),'message':data.name+' logged out.'};
                  //mainEvents.emit('renderer:chatEvent',message);
                  //chat.logs.push(message);
  
                  chat.sendAllRoot({"command":'LOGOUT',"name":data.name});
                }
                break;
            case 'USRKEY':
              this.sendAllRoot({'command':"KEYCHG",'name':from,'puKey':data.puKey})
              break;
            default:
              if(!chat.handleEmoteCommand(from,trueFrom,data))
                chat.handleFileCommand(from,chat.nameFromPeerID(from),data,2)

                //console.log("Unhandled command at admincon to "+from+".");
        }
    }else{
        if(data.command==="USRDAT"){
            let message;
            
            if((uState === "unregistered" || !uState) ){
              if( chat.pass===data.pass){
                u=new user(1,chat.nameFromPeerID(from),importKey(data.puKey),true);
                chat.addUser(u);
                message={"command":'NEWUSR',"role":u.role,"name":u.name,"puKey":u.puKey};
              }else{
                this.sendAsRoot({"command":"BADLOG",from})
                this.rootConHandler.removeCon(from);
                return;
              }

            }
            if(uState === "offline"){
              if(chat.pass===data.pass){
                u.puKey=importKey(data.puKey)
                chat.login(u.name);
                message={"command":'LOGINN',"name":chat.nameFromPeerID(from)};
              }else{
                  //this.sendAsRoot({"command":"BADLOG"},from)
                  //this.rootConHandler.removeCon(from);
                  return;
                }
            }
            let chatData ={"command":"GIVDAT","tree":chat.conTree.toObject(),"users":chat.usersToObject(),"admin":chat.adminName,"root":chat.rootName};
            console.log("ASKDATA RECEIVED. Sending")
            this.sendAsRoot(chatData,from)
            this.sendAllRoot(message);
            this.updateConnections();

            //chat.updateConnections();
        }else{
          console.log("BAD MESSAGE")
            //chat.sendAsRoot({"command":'ERR','message':'Bad Login.'},from)
            //con.close();
        }
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
          if(!chat.handleEmoteCommand(chat.rootName,chat.rootName,data))
            chat.handleFileCommand(chat.rootName,chat.rootName,data,1)
    }
  }
  displayUsers(){
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
        td.width = '75';
        td.appendChild(document.createTextNode(user[value[j]]));
        tr.appendChild(td);
      }
    })

    return table
  }

  rootFailureProtocol(forced = true,attempt = 1){
    this.onSuddenClose()
    this.close()
    this.onSuddenClose()
    this.close()
    let chat = this;


   /* console.log("Beginning root failure protocol.")
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

    if (!filename||filename!=="logs"&&!this.fileLinks.has(filename)){
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
        this.saveLogs();
        link = {
          path: path.join('.', 'UserData', this.myName,this.name,'logs.json'),
          date:Date.now(),
          type:"logs",
          size:fs.statSync(path.join('.', 'UserData', this.myName,this.name,'logs.json')).fileSizeInBytes
        }

      }else{
        filename = chat.myName+":"+filename
        chat.fileTransfers.push({
          peer: username,
          action: "s",
          file: filename
        })
        link = this.fileLinks.get(filename);
      }
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
        let transfer = chat.fileTransfers.find(t=>t.peer=username&&t.action==="s"&&t.file===filename)
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
        "size":link.size},chat.peerIDFromName(username))
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
    addElementToChat(li)
    if(trueFrom===this.myName||this.fileLinks.get(filename)){
      this.displayFile(filename)
    }
  }
  displayFile(filename){
    let file = this.fileLinks.get(filename);
    if(!file){
      console.log("File "+filename+" not found.")
      return;
    }
    if(file.from!==this.myName)
      document.getElementById("chatFileButton-file-"+filename).innerHTML = "Downloaded"

    if(this.fileLinks.get(filename).type.includes("audio")){
      let audio = document.createElement('audio');
      audio.src = file.path;
      audio.autoplay = false;
      audio.controls=true;
      document.getElementById("chatfile-"+filename).appendChild(audio)

    }else
    if(this.fileLinks.get(filename).type.includes("image")){
      let img = document.createElement('img');
      img.src = file.path;
      document.getElementById("chatfile-"+filename).appendChild(img)

    }else
    if(this.fileLinks.get(filename).type.includes("video")){
      let video = document.createElement('video');
      video.src = file.path;
      video.autoplay = false;
      video.controls=true;
      document.getElementById("chatfile-"+filename).appendChild(video)
    }else
    {}
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
  makeFileLink(file){
    let name = this.myName+":"+file.name;
    let data = {
      "name":name,
      "path":file.path,
      "date":file.lastModified,
      "type":file.type,
      "size":file.size,
      "from":this.myName
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
    let configPath = path.join('.', 'UserData', this.myName,this.name,'config.json');
    let linkPath = path.join('.', 'UserData', this.myName,this.name,'linkPaths.json');
    if (!fs.existsSync(folderPath)) {
      return;
    }
    if (fs.existsSync(configPath)) {
      this.readConfig(JSON.parse(fs.readFileSync(configPath,{encoding:"ascii"})))
    }
    if (fs.existsSync(logsPath)) {
      this.loadLinks(JSON.parse(fs.readFileSync(linkPath,{encoding:"ascii"})))
    }
    if (fs.existsSync(usersPath)) {
      this.usersFromObject(JSON.parse(fs.readFileSync(usersPath,{encoding:"ascii"})),false)
    }
    if (fs.existsSync(logsPath)) {
      this.logsFromObject(JSON.parse(fs.readFileSync(logsPath,{encoding:"ascii"})))
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
        }
        return;
      }else{
        if(linkObject.name.match("$[(][0-9]+[)]")){
          let splitted=linkObject.name.split("(");
          linkObject.name=splitted.slice(0,-1).join()+(1+splitted[splitted.length-1].slice(0,-1));
        }else{
          linkObject.name=linkObject.name+"(1)";
        }
      }
    }
    this.fileLinks.set(linkObject.name,
      {
        "path":linkObject.path,
        "date":linkObject.date,
        "type":linkObject.type,
        "size":linkObject.size,
        "from":linkObject.from
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
      console.log(this.logs.length)
      console.log(logs.length)
      while(i<this.logs.length&&j<logs.length){
        console.log(i)
        console.log(this.logs[i])
        console.log(j)
        console.log(logs[j])
        if(deepEqual(this.logs[i],logs[j])){
          finalLog.push(this.logs[i])
          i++
          j++
        }else 
          if(this.logs[i].date<logs[j].date){
            finalLog.push(this.logs[i])
            i++
          }else
          if(this.logs[i].date>logs[j].date){
            finalLog.push(logs[j])
            j++
            addedSomething=true;
        }else{
          finalLog.push(this.logs[i])
          finalLog.push(logs[j])
          i++
          j++
        }
      }
      if(i === this.logs.length){
        finalLog.concat(logs.slice(j,logs))
        addedSomething=true;
      }else{
        finalLog.concat(this.logs.slice(i,this.logs))
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
      name:this.name,
      pass:this.pass,
      myName:this.myName,
      puKey:this.puKey,
      prKey:this.prKey
    }
  }
  readConfig(config){
    if(config.adminName){
      this.adminName=config.adminName;
    }
    if(config.name){
      this.name=config.name;
    }
    if(config.pass){
      this.pass=config.pass;
    }
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

// Stores public data of each user.
// id: number assigned to user in order of joining
// role: 0 =admin, 1=mod, 2=user, 3= requesting
class user{
  constructor(role,username,puKey,online=true){
    this.role=role;
    this.name=username;
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

  [me.prKey,me.puKey]=generateKeys();
  //console.log(me)
  //let a = sign("hello",  me.prKey, username, password)//, me.username,me.password)
  //let b = verify(a,"hello", me.puKey);
  //console.log(b)
  me.peerJsOptions=settings.peerJsOptions;
  me.peer = new Peer(pre.concat(username),me.peerJsOptions);
  me.peer.on('error',function(err){
    console.log(err);
    if(err.type==='unavailable-id'||err.type==='invalid-id'){
      mainEvents.emit('renderer:err',{'err':"Username invalid or already taken, please try another one."});
      me.username=null;
      me.peer.destroy();
    }else if (err.type==='peer-unavailable'){
      mainEvents.emit('renderer:dmErr',{'err':"User not found online, message will not reach them."});
    }else{
      mainEvents.emit('renderer:err',{'err':"Error with user peer detected. This might be nothing, or it might be fatal to the ability to connect to other users. If so, please notify the app developer."});
    }
  });
  me.peer.on('connection', function(con) {
    con.serialization='json';
    console.log("Connected to user "+(''+con.peer).replace(pre,''));
    var sender=(''+con.peer).replace(pre,'');
    mainEvents.emit('renderer:anonCon',{'username':sender});
    con.on('data', function(data) {
      console.log("Data received at user con: "+data.command);
      if(data.command==="INVCHT"){
        mainEvents.emit('renderer:chatInvite',{'user':sender,'to':data.chatId,pass:data.pass});
      }
      // TO-DO: cyphering of DMs
      if(data.command==="DM"){
        
        mainEvents.emit('renderer:dm',{'user':sender,'date':data.date,'message':data.message});
      }
    });
  });
  me.peer.on('open',function(){
    mainEvents.emit('renderer:setupComplete',{'username':username});
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
      }
    } catch (err) {
      console.error(err);
    }
    var jsonPath = path.join('.', 'UserData', username, 'config.json');
    fs.writeFile(jsonPath, "content", err => {
      if (err) {
        console.error(err);
      } else {
        // file written successfully
      }
    });
  });
}
//Step 2.A: Create a chat.
//TO-DO:
// -Setup PEERJS_OPTIONS.
// -Add cyphering.
// -Add admin acceptance of users.
mainEvents.on('main:chatCreate',( params) => {
  if (deepEqual(me,{})){
    mainEvents.emit('renderer:err',{'err':'User not setup, please set username first.'});
  }else{
    createChat(params.name,params.pass);
  }
});
function createChat(chatName,chatPass){
  //Star chat Peer
  let chat  = new chatData(chatName,chatPass,me.username,me.puKey,me.prKey,true,function(){
    currentChat2=chatName;
    chats.set(chat.name,chat);
    mainEvents.emit('renderer:chatConnected',{'chat':chat.name});
  },function(){
    mainEvents.emit('renderer:err',{'err':'Chat with name '+chatName+' could not be created.'});
    chat.close();
    chatClose(chatName);
  });

}

//Step 2.B: Join a chat.
mainEvents.on('main:chatJoin',( params) => {
  if(deepEqual(me,{})){
    mainEvents.emit('renderer:err',{'err':'User not setup, please set username first.'});
  }else{
  joinChat(params.name,params.pass);
  }
});

function joinChat(chatName,chatPass){
  var chatName;

  //Step 1: Rcv Pukey back, send cyphered Password to connection, if error tell renderer
  let chat  = new chatData(chatName,chatPass,me.username,me.puKey,me.prKey,false,function(){
    currentChat2=chatName;
    chats.set(chat.name,chat);
    mainEvents.emit('renderer:chatConnected',{'chat':chat.name});
  },function(){
    mainEvents.emit('renderer:err',{'err':'Chat with name '+chatName+' could not be joined.'});
    chat.close();
    chatClose(chatName);
  });
}


//Setup message handling -> setConInGroup

//Step 3: Send Message.

mainEvents.on('main:sendMessage',( params) => {
  sendMessage(params);
});
function sendMessage(content){
  let chat=chats.get(currentChat2);
  let data={
        "from":chat.myName,
        "command":"SNDMES",
        "date":content.date,
        "message":content.message
  };
  console.log('Sending message:', content.message);
  chat.logs.push({'from':data.from,'date':data.date,'message':data.message});
  chat.sendAll(data);
  console.log('Message sent:', content.message);
}

//Step 4: Switch chats.
mainEvents.on('main:chatSwitch',( params) => {
  if (!chats.get(params.chatName)){
    mainEvents.emit('renderer:err',{'err':'Chat with name '+params.chatName+' does not exist.'});
  }else{
    currentChat2=params.chatName;
    mainEvents.emit('renderer:switched',{'chat':currentChat2,'logs':chats.get(currentChat2).logs});
  }
});

//Step 5: Close chat.
mainEvents.on('main:chatClose',( params) => {
  //console.log("Closing chat: ["+ params+"]")
  let chat=chats.get(params.chatName);
  if (!chat){
    mainEvents.emit('renderer:err',{'err':'Chat with name '+params.chatName+' does not exist.'});
  }else{
    chat.close();
    chats.delete(params.chatName);
  }
  if(currentChat2===params.chatName){
    currentChat2=null;
  }
});

//DM stuff
mainEvents.on('main:dm',( params) => {
  sendDM(params.user,params.time,params.text);
});

function sendDM(user, time, text){
  if (deepEqual(me,{})){
    mainEvents.emit('renderer:err',{'message':'User not setup, please set username first.'});
  }else{
    let con =me.peer.connect(pre+user,{"serialization":"json"});
    con.serialization='json';
    con.on('error', function(err){
      console.log(err);
      mainEvents.emit('renderer:dmErr',{'err':"Error in connection to "+user+"."});
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

//DM stuff
mainEvents.on('main:invite',( params) => {
  inviteToChat(params.user,params.time,params.chat);
});
function inviteToChat(user, time, chat){
  if (deepEqual(me,{})){
    mainEvents.emit('renderer:err',{'message':'User not setup, please set username first.'});
    return;
  }
  console.log("Chat:"+chat)
  var c =chats.get(chat);
  if (!c){mainEvents.emit('renderer:dmErr',{'err':"User is not in this chat."}); return;}
  if (c.canUser(c.myName,"invite")) {
    let con =me.peer.connect(pre+user,{"serialization":"json"});
    con.serialization='json';
    con.on('error', function(err){
      console.log(err);
      mainEvents.emit('renderer:dmErr',{'err':"Error in connection to "+user+"."});
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
  }else mainEvents.emit('renderer:dmErr',{'err':"User doesn't have permissions to invite another user."});
  
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
//TO-DO
function generateKeyPair(){
  let puKey = ' ';
  let prKey = ' ';
  return (puKey,prKey);
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







//Add messages to chat
function addElementToChat(e){
  document.getElementById("chatBox").appendChild(e);
}
function addToChat(message){
    let li=document.createElement("li");
    li.setAttribute('id',message.id);
    let time = new Date(message.date);
    let messageDate = document.createTextNode(''+time.getHours()+':'+time.getMinutes()+' ');
    let name=document.createElement("b").appendChild(document.createTextNode(message.from));
    let messageText = document.createTextNode(': ' + message.message);
    
    li.appendChild(messageDate);
    li.appendChild(name);
    li.appendChild(messageText);
    //messages.push(mParsed);
    document.getElementById("chatBox").appendChild(li);

}
function addEventToChat(date,message){
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
  mainEvents.emit('main:chatJoin', {
    name, pass
  });
}
function chatCreate(){
  var name =document.getElementById("createChatName").value;
  var pass =document.getElementById("createChatPass").value;
  mainEvents.emit('main:chatCreate', {
    name, pass
  });
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
  mainEvents.emit('main:chatClose', {
    chatName
  });
}

//Switches chat
function chatSwitchStart(chatName){
  mainEvents.emit('main:chatSwitch', {
    chatName
  });
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
  mainEvents.emit('main:sendMessage', {
    date, message
  });
  addToChat(new Message(myID,date,message));
  document.querySelector("#chatMessageInput").value="";
}

//Treats dm messages and sends them
function dm(){
  let message = document.getElementById("dmMessageInput").value;
  //  /dm [username], [message]<br />
  let command = message.split(' ')[0];
  if(command==="/dm"){
    
    //let user = message.split(':')[0].split(' ')[1];
    let user = message.split(' ')[1].split(',')[0].trim();
    let text = message.split(',')[1].trim();
    if(!text || !user){

    }else{


    let time = new Date();
    mainEvents.emit('main:dm', {
      user,time,text
    });
   

    let li=document.createElement("li");
    let messageDate = document.createTextNode(''+time.getHours()+':'+time.getMinutes()+' ');
    let name=document.createElement("b").appendChild(document.createTextNode(myID+'=>'+user));
    let messageText = document.createTextNode(': ' + text);
    li.appendChild(messageDate);
    li.appendChild(name);
    li.appendChild(messageText);
    document.getElementById("dms").appendChild(li);
    document.querySelector("#dmMessageInput").value="";
        }
  }
  if(command ==="/invite"){
    let user = message.split(' ')[1].split(',')[0].trim();
    let chat = message.split(',')[1].trim();
    console.log("Inviting user:"+user+" to chat:"+chat+".")
    if(!user || !chat){

    }else{
      let time = new Date();
      mainEvents.emit('main:invite', {
        user,time,chat
      });
      let li=document.createElement("li");
      let messageDate = document.createTextNode(''+time.getHours()+':'+time.getMinutes()+' ');
      let name=document.createElement("b").appendChild(document.createTextNode(myID+' invited '+user+' to chat '+chat+'.'));
      li.appendChild(messageDate);
      li.appendChild(name);
      document.getElementById("dms").appendChild(li);
      document.querySelector("#dmMessageInput").value="";
    }
  }
}

mainEvents.on('renderer:err', function (data)  {displayGeneralError(data);});
mainEvents.on('renderer:chatConnected', function (data)  {
  //Chat setup complete; switch to chat.
  chatPrepareTab(data.chat);
});
mainEvents.on('renderer:chatEvent', function (data)  {addEventToChat(data.date,data.message)});
mainEvents.on('renderer:messageRcv', function (data)  {   
  let m = new Message(data.user,data.date,data.message);   
  addToChat(m);
});
function resetChat(logs){
  let i=0;
  document.getElementById("chatBox").textContent='';
  logs.forEach(function(item){
    console.log(item)
    if(item.from){
      if(item.file){
        console.log("ITS A FILE")
        chats.get(currentChat).displayShareLink(item.from,item.file,item.size)
      }else{
        console.log(item);
        let m= new Message(item.from,item.date,item.message)
        addToChat(m);
      }

    }else{
      addEventToChat(item.date,item.message);
      i=i+1;
    }
  });
}
mainEvents.on('renderer:switched', function (data)  {

  document.getElementById("chatName").textContent=data.chat;
  console.log(data.logs);
  //myID=0;
  resetChat(data.logs)
});
//mainEvents.on('renderer:anonCon', function (data)  {});  //TO-DO
mainEvents.on('renderer:chatInvite', function (data)  {
  let li=document.createElement("li");
  let text = document.createTextNode(''+data.user+' has invited you to join the chat named"' + data.to+'".');
  var button = document.createElement("button");
  button.innerHTML = "Join";
  li.appendChild(text);
  li.appendChild(button);
  let name =data.to;
  let pass = data.pass;
  document.getElementById("dms").appendChild(li);
  button.addEventListener ("click", function() {
    button.disabled = true;
    button.innerHTML = "Joined"
    mainEvents.emit('main:chatJoin', {
      name, pass
    });
  });
});
mainEvents.on('renderer:dm', function (data)  {
  let li=document.createElement("li");
  let time = new Date();
  let text = document.createTextNode(''+time.getHours()+':'+time.getMinutes()+' '+data.user+'=>'+myID+': ' + data.message);
  li.appendChild(text);
  document.getElementById("dms").appendChild(li);
});

mainEvents.on('renderer:userCreateErr', function (data)  {
  displayGeneralError(data);
});
//Error popup.
var stayAmmount = 0;


async function displayGeneralError(data){
  document.getElementById("ErrorText").innerHTML=data.err;
  if(stayAmmount>0){
    stayAmmount= 5000;
  }else{
    fadeInEffect("ErrorText");
    await sleep(stayAmmount);
    fadeOutEffect("ErrorText");
    document.getElementById("ErrorText").innerHTML="";
  }
}
document.getElementById("ErrorText").addEventListener('click', fadeOutEffect);
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




mainEvents.on('renderer:dmErr', function (data)  {
  let li=document.createElement("li");
  let text = document.createTextNode(data.err);
  li.appendChild(text);
  document.getElementById("dms").appendChild(li);
});    
mainEvents.on('renderer:setupComplete', function (data)  {
  //User setup complete; enable chat creation, dms buttons, switch to creation menu.
  document.getElementById("username").appendChild(document.createTextNode("Welcome, "+data.username));
  document.getElementById('DMsButton').disabled = false;
  document.getElementById('plus').disabled = false;
  changeMode('chatCreation');
}); 

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
function displayFileSize(byteCount){
  let fileSize = byteCount.toString();

  if(fileSize.length < 7) return `${Math.round(+fileSize/1024).toFixed(2)}kb`
      return `${(Math.round(+fileSize/1024)/1000).toFixed(2)}MB`

}

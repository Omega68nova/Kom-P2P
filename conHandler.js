const EventEmitter = require('events');
//import {EventEmitter} from "events"
import {Peer} from "https://esm.sh/peerjs@1.5.2?bundle-deps"
//const { Queue } = require("./queue.js");

function delay(t) {
  return new Promise(function(resolve) {
      setTimeout(resolve, t)
  });
}

class Queue {
  constructor() {
    this.elements = {};
    this.head = 0;
    this.tail = 0;
  }
  enqueue(element) {
    this.elements[this.tail] = element;
    this.tail++;
  }
  dequeue() {
    const item = this.elements[this.head];
    delete this.elements[this.head];
    this.head++;
    return item;
  }
  peek() {
    return this.elements[this.head];
  }
  get length() {
    return this.tail - this.head;
  }
  get isEmpty() {
    return this.length === 0;
  }
}
function setPeerJsOptions(options){
  PEERJS_OPTIONS = options
}
function resetPeerJsOptions(){
  PEERJS_OPTIONS = Object.assign({}, DEFAULT_PEERJS_OPTIONS);
}
var DEFAULT_PEERJS_OPTIONS = {    

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
};
var PEERJS_OPTIONS = Object.assign({}, DEFAULT_PEERJS_OPTIONS);
 /* { 
		//'host': "127.0.0.1",
		//'port': 9000,
	//	'path': "/myapp",
  //'secure':true,
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
  };*/
const CON_OPTIONS = {"serialization":"json",'ordered': true,"reliable":true};

class ConData{
  //Type: "Normal" | "Special"
  //State: Off, SettingUp, Validating, On, Special
                //^on('data') ^needs from above ^For file transfer or other non mesh related connections.
/**
 * @param {String} id The id of the peer you need to connect to.
 * @param {*} connection The connection, if it exists.
 * @param {String} type Accepts the following Strings: "Normal", "Special", "ToRoot", "AsRoot"
 * @param {String} state Accepts the following Strings: "Off", "SettingUp", "Validating", "On"
 */
    constructor(id, connection=undefined, type="Normal", state="Off",important=false) {
        let conData=this;
        this.id = id;
        this.type = type;
        this.state = state;
        this.important=important;
        this.lastContactDate= Date.now();
        this.dataBacklog =new Queue();
        this.funcStorage = {
          onMessage: function onMessage(id,data){
            conData.dataBacklog.enqueue(id,data);
          },
          onDisconnect: function onDisconnect(id){
      
          },
          onError: function onError(id,err){
            throw new Error("Function onError @ connection to "+id+" not setup, and yet it was called... The error is this by the way:   "+err)
            
          },
          onMessageOld:null,
          onDisconnectOld:null,
          onErrorOld:null
        }
        if(connection){
          this.setCon(connection);
        }
    }
    send(data){
      if(this.state!=="Off"){
        if(!this.connection||!this.connection.peer) {this.funcStorage.onDisconnect(this.id);this.state="Off";return;}
        this.connection.send(data)
      }else throw new Error("Connection not set yet!")
    }
    setCon(connection){
      if(this.intervalID){
        window.clearInterval(this.intervalID)
      }
      //console.log("setting up connection for con: "+this.id)

      if (this.connection!==connection){
      this.connection=connection;
      let conData = this;
      conData.lastContactDate=  Date.now();
      let onData = function(data){
        conData.lastContactDate= Date.now();
        if(data.command==="PING"){
          //console.log("PINGRECEIVED")
          connection.send({"command":"PONG"})
          return;
        }else if(data.command==="PONG"){
          return;
        }else{
        //[...]
        if(conData.state!=="On"){
          conData.dataBacklog.enqueue(data);
          console.log("Con is not on, sending to backlog.")
          console.log(conData)
        }else{
          //if(data.command==="FORCLS"){
          //  conData.state="Off"
          //  conData.connection.close();
          //}
          //console.log("Data received at con "+conData.id+".")
          //console.log(data)
          //console.log(conData.funcStorage.onMessage)
          conData.funcStorage.onMessage(data);
        }
        }
      }
      let onClose =  function(){
        console.log("Con "+conData.id+" is closing.")
        //[...]
        conData.funcStorage.onDisconnect();
        conData.state="Off"
      }
      let onError = function(err){
        //[...]
        conData.funcStorage.onError(err);
      }
      this.connection.on('data', onData)
      this.connection.on('close', onClose)
      this.connection.on('error', onError)
      this.funcStorage.onMessageOld =onData;
      this.funcStorage.onCloseOld =onClose;
      this.funcStorage.onErrorOld =onError;
      let  myCallback = function() {
        if(conData.state==="Off"){
          window.clearInterval(conData.intervalID);
          return;
        }
        try{  
          conData.connection.send({"command":"PING"})
        }catch(err){

          if(this.connection){
            this.connection.off('close',conData.funcStorage.onCloseOld)
            conData.connection.close()
          }
          console.log("Can't send message to "+conData.id)
          window.clearInterval(conData.intervalID);
          conData.funcStorage.onCloseOld()
        }
        if( ((Date.now()-conData.lastContactDate)/1000)>3){
          console.log("Connection timed out to "+conData.id)
          window.clearInterval(conData.intervalID);
          if(this.connection){
            this.connection.off('close',conData.funcStorage.onCloseOld)
            conData.connection.close()
          }
          conData.funcStorage.onCloseOld()

        }
        
      }
      if(this.important)this.intervalID = window.setInterval(myCallback, 1000);
      
      }
    }
    /**
     * Assigns functions to ConData; these functions can later be used to set up the connection.
     * @param {Function} onMessage 
     * @param {Function} onDisconnect 
     * @param {Function} onError 
     */
    setupFunctions(onMessage,onDisconnect,onError){
      console.log("setting up functions for con: "+this.id)
      console.log("OnMessage: "+onMessage+". OnDisconnect: "+onDisconnect+". OnError: "+onError)
      let conData=this;
      if(onMessage){
        this.funcStorage.onMessage=onMessage;
      }
      if(onDisconnect){
        this.funcStorage.onDisconnect=onDisconnect;
      }
      if(onError){
        this.funcStorage.onError=onError;
      }
      let onClose =  function(){
        console.log("Con "+conData.id+" is closing.")
        //[...]
        conData.funcStorage.onDisconnect(conData.id);
        conData.state="Off"
      }
      let onData = //data => 
      function(data){
        //console.log("Data received at con "+conData.id+".")
        //console.log(data)

        //[...]
        conData.lastContactDate= Date.now();
        if(data.command==="PING"){
          try{
            conData.connection.send({"command":"PONG"})
            return;
          }catch{

          }
          
          return;
        }else if(data.command==="PONG"){
          return;
        }else
        if(data.command==="FORCLS"){
            
          conData.state="Off"
          conData.connection.close();
          onClose()
        }else
        if(conData.state!=="On"){
          conData.dataBacklog.enqueue(data);
          console.log("Con is not on, sending to backlog.")
          console.log(conData)
        }else{
            //console.log(conData.funcStorage.onMessage)
            conData.funcStorage.onMessage(conData.id,data);
        }

      }
      let onErr = //err => 
      function(err){
        //[...]
        conData.funcStorage.onError(conData.id,err);
      }
      if(this.funcStorage.onMessageOld){
        this.connection.off('data',conData.funcStorage.onMessageOld)
      }
      if(this.funcStorage.onCloseOld){
        this.connection.off('close',conData.funcStorage.onCloseOld)
      }
      if(this.funcStorage.onErrorOld){
        this.connection.off('close',conData.funcStorage.onErrorOld)
      }
      this.connection.on('data', onData)
      this.connection.on('close', onClose)
      this.connection.on('error', onErr)
      
      this.funcStorage.onMessageOld =onData;
      this.funcStorage.onCloseOld =onClose;
      this.funcStorage.onErrorOld =onErr;

      this.state="On"
      while(!this.dataBacklog.isEmpty){
        let data = this.dataBacklog.dequeue();
        this.funcStorage.onData(data);
      }

    }
    close(){
      try{
        this.connection.off(this.funcStorage.onCloseOld);
      }catch(err){

      }
      
      if (this.connection&&this.connection.open){
        this.connection.send({"command":"FORCLS"})
        this.connection.close()
      }
     //delete this;
    }
}
class ConHandler{
      constructor(peerId,rootId,onComplete,eventCommunicator){
          this.rootId = rootId;
          this.peerId = peerId;
          this.peer = new Peer(peerId, PEERJS_OPTIONS);
          this.cons = new Map();
          this.backlog = [];
          if(eventCommunicator){
            this.eventCommunicator = eventCommunicator;
          }else 
            this.eventCommunicator = new EventEmitter();
            this.setupPeer(onComplete)
      }
      setupPeer(onComplete){
        let conHandler= this;
        conHandler.peer.on('error',async function(err){
          console.log(err);
          console.log(err.type)
          if (err.type==='peer-unavailable'){
            let name = err.message.split(" ")[5];
            conHandler.eventCommunicator.emit("failureAt",name);
          }else if(err.type==='unavailable-id'||err.type==='invalid-id'){
            console.log("Detected setup failure")
            if(!this.alreadyOn){
              conHandler.eventCommunicator.emit("setupFailure");
            }else{
              try {
                this.peer.reconnect()
              } catch (error) {
                console.log(error)
              }
            }
          }else{
            conHandler.eventCommunicator.emit('peerErr',{'err':"Error with user chat detected. This might be nothing, or it might be fatal to the ability to connect to other users. If so, please notify the app developer."});
          }
           if(err.type==='network'){
            console.log(new Error(err))
            //conHandler.peer.reconnect()
          }
        });
        conHandler.peer.on('disconnected',function(){
          //conHandler.eventCommunicator.emit("setupFailure");
        })
        this.peer.on('open',function(){
          console.log("Peer "+conHandler.peer.id+" opened succesfully.")
          if(conHandler.rootId){
            conHandler.setupRootCon(onComplete)
          }else{
            conHandler.alreadyOn=true;
            onComplete();
          }
          conHandler.peer.on('connection',function(c) {
            console.log("Peer "+conHandler.peer.id+" received connection to "+c.peer+".")
            //ON open was disabled before
            c.on('open', function() {
              conHandler.onConnectionOpen(c);
            })
          });

        });
      }
      onError(err){
        throw new Error(err);
      }
      /**
       * Updates neighboor connections according sent lists of neighboors. When closing a past connection it will send it the command UPTCON to notify it.
       * @param {*} connectTo list of peerIDs that the peer must connect to itself.
       * @param {*} awaitConnectionFrom list of peerIDs that the peer must receive a connection from. If not connected by them after 3 seconds, a notice is sent to the root.
       */
      setNecessaryConnections(connectTo, awaitConnectionFrom){
        console.log("Setting up necessary connections to:")
        console.log("Need to connect:"+connectTo)
        console.log("Await connection:"+awaitConnectionFrom)
        if(this.peer.id===null){
          this.peer.destroy();
          //this.peer.disconnect();
          this.peer = new Peer(this.peerId, PEERJS_OPTIONS);
          this.setupPeer(function(){setNecessaryConnections(connectTo, awaitConnectionFrom)})
          return;
        }
        let childrenIDs = connectTo;
        let parentIDs = awaitConnectionFrom;
        this.cons.forEach((con,id)=>{
          if (!childrenIDs.includes(id)&&!parentIDs.includes(id)&&con.type==="Normal"){
            console.log("Removing connection to:"+id)
            try{
              con.send({"command":'UPTCON'});}catch(err){
            }
            con.close();
            this.cons.delete(id);
          }
        })
        connectTo.forEach((id)=>{
          if(!this.cons.has(id)){
            let con = this.peer.connect(id,CON_OPTIONS);
            this.cons.set(id,new ConData(id,con,"Normal","SettingUp",(this.rootId&&id===this.rootId)||!this.rootId));
            console.log("Creating con to: "+id)
            this.setupNormalCon(id,con);
          }else if(this.cons.get(id).state==="off"){
            let con = this.peer.connect(id,CON_OPTIONS);
            this.cons.get(id).type="Normal"
            this.setupNormalCon(id,con)
          }else if(this.cons.get(id).type==="Special"){
            this.cons.get(id).type="Normal"
            this.setupNormalCon(id)
          }
        })
        awaitConnectionFrom.forEach((id)=>{
          if(!this.cons.has(id)){
            this.cons.set(id,new ConData(id,null,"Normal","Off",this.rootId&&id===this.rootId||!this.rootId))
            this.checkIfConnectedIn(id,5000)
          }if(this.cons.get(id).state==="off"){
            this.checkIfConnectedIn(id,5000)
          }else{
            this.cons.get(id).type="Normal"
            this.setupNormalCon(id)
          }
        });
      }
      createSpecialCon(id, onOpen = function(){}){
        let con = this.peer.connect(id,CON_OPTIONS);
        this.cons.set(id,new ConData(id,con,"Special","SettingUp",this.rootId&&id===this.rootId||!this.rootId));
        console.log("Creating special con to: "+id)

        if(con.open){
          this.cons.get(id).state="Validating";
          this.eventCommunicator.emit("validateAndFinishSetup",[id]);
          onOpen()
        }else{
          let conHandler = this;
          con.on('open',function(){
            conHandler.cons.get(id).state="Validating";
            conHandler.eventCommunicator.emit("validateAndFinishSetup",[id]);
            onOpen()
          })
        }
      }
      async checkIfConnectedIn(to,miliseconds){
        await delay(miliseconds);
        if(!this.cons.has(to)||this.cons.get(to).state==="Off"){
          this.eventCommunicator.emit("failureAt",to);
        }
      }
   
      setupNormalCon(id,con=undefined){
        let cData = this.cons.get(id)
        if(!cData){
          if(con){
            cData= new ConData(id,con,"Special","SettingUp",this.rootId&&id===this.rootId||!this.rootId);
            this.cons.set(id,cData)
          }else  throw new Error("SetupNormalCon @ conHandler for con "+id+": connection list doesnt include connection and none was given.")
        }else{
          
          if(con//&&cData.state==="Off"
            ){
            cData.state="SettingUp";
            cData.setCon(con);
          }
        }

        if(cData.connection&&cData.connection.open){
          this.cons.get(id).state="Validating";
          this.eventCommunicator.emit("validateAndFinishSetup",[id]);
          
        }else if(cData.connection){
          let conHandler = this;
          cData.connection.on('open',function(){
            conHandler.cons.get(id).state="Validating";
            conHandler.eventCommunicator.emit("validateAndFinishSetup",[id]);
          })
        }else{
          throw new Error("Can't setup connection if there was none to begin with.")
        }
      }

      finishConSetup(peerId,onMessage,onDisconnect,onError,forceNormal=false){
        console.log("Finishing con setup for "+peerId+" @ peer "+this.peer.id+".")
        //if(this.peer.id===null){

        //  return;
        //}
        //console.log(peerId)//[0]
        let conData = this.cons.get(peerId);//[0]
        //console.log(this.cons)
        //console.log(this.cons)
        conData.setupFunctions(onMessage,onDisconnect,onError)
        conData.state="On";
        if (forceNormal){
          conData.type="Normal"
        }
        this.unloadBacklog(peerId)
      }

      /**
       * @returns two items, connected users in the first, and users that are online but yet to connect in the second.
       */
      getOnAndConUsers(){
        let connected = []
        let yetToConnect = []
        this.cons.forEach(function(conData,id){
          if(conData.state==="On"){
            connected.push(id)
          }else if(conData.type!=="Special"){
            yetToConnect.push(id)
          }
        })
        return [connected, yetToConnect];
      }
      unloadBacklog(peerId){
        let [connected, yetToConnect] = this.getOnAndConUsers();
        let sendGeneralMessages = yetToConnect.length===0
        let i = this.backlog.length-1;
        while (i>=0){
          if(((!this.backlog[i][2])&&sendGeneralMessages)||this.backlog[i][2]===peerId){
            this[this.backlog[i][0]](this.backlog[i][1],this.backlog[i][2])
            this.backlog.splice(i)
          }else
          i--;
        }
      }

      onConnectionOpen(con){
        //setup con as a stray conData if not, then check if its amongst normal cons, if yes ok, if not ask boss what to do
        if(this.cons.has(con.peer)){
          if(this.cons.get(con.peer).state==="Off"){
            this.setupNormalCon(con.peer,con)
          }else{
            this.eventCommunicator.emit("dupCon",con);
          }
        }else{
          this.setupNormalCon(con.peer,con)
          //let u =new ConData(con.peer,con,"Special","SettingUp")
          //this.cons.set(con.peer,u);
          //this.eventCommunicator.emit('conOpen',{'id':con.peer})
        }
      }

      /*
      onConnectionOpen(peerId,con=undefined){

          let foundUser =this.cons.get(peerId)
          if(foundUser){
            if (foundUser.state!=="On"){
              foundUser.online=true;
            }else{
              //User was online, but not connected, that means there might be stuff to send
              this.unloadBacklog(peerId)
            }
          }else{
            if(!con){
              throw new Error("Attempted to open connection, but connection isnt in database and no con parameter given given.")
            }
            foundUser =new ConData(peerId,con,"Special","SettingUp")
            this.users.push(foundUser);
            this.eventCommunicator.emit('conOpen',{'id':peerId})
            //chat.sendCommand({command:'USRS',users:chat.usersToObject()},peerId)
          }
          console.log('${peerId} joined, setting up...'); 
          //there is ${chat.nCons} users connected to us now! We should have ${chat.totalOnline} connections, by the way.`)
      }
      */
      /////////////////////////// ADMIN SETUP///////////////////////////////////////////////////
      
      setupRootCon(onComplete){
        let conHandler = this;
        this.rootBacklog=[];
        console.log("Peer "+this.peer.id+" setting up RootCon.")
        let con = this.peer.connect(this.rootId,CON_OPTIONS)
        con.on('open',function(){
          console.log("Peer "+conHandler.peer.id+" setting up RootCon phase 1-OPEN.")
          conHandler.rootCon= new ConData(conHandler.rootId,con,"ToRoot","SettingUp",true);
          //if(con.open){
            conHandler.rootCon.state="Validating";
            onComplete()
            //console.log(conHandler.rootCon.id)
            conHandler.eventCommunicator.emit("validateAndFinishSetup",[conHandler.rootCon.id]);
          //}else{
          //  con.on('open',function(){
          //    conHandler.rootCon.state="Validating";
          //    onComplete()
          //    conHandler.eventCommunicator.emit("validateAndFinishSetup",id);
          //  })
         // } 
        })
      }
      restartRootCon(onComplete){
        let conHandler = this;
        if (!this.rootBacklog){
          this.rootBacklog=[]
        }
        console.log("Peer "+this.peer.id+" setting up RootCon.")
        let con = this.peer.connect(this.rootId,CON_OPTIONS)
        con.on('open',function(){
          console.log("Peer "+conHandler.peer.id+" setting up RootCon phase 1-OPEN.")
          conHandler.rootCon= new ConData(conHandler.rootId,con,"ToRoot","SettingUp",true);
            conHandler.rootCon.state="Validating";
            onComplete()
            //console.log(conHandler.rootCon.id)
            conHandler.eventCommunicator.emit("validateAndFinishSetup",[conHandler.rootCon.id]);
        })
      }
      finishRootConSetup(onMessage,onDisconnect,onError){
        console.log("Finishing root con setup for "+this.rootCon.id+" @ peer "+this.peer.id+".")
        if(this.rootCon.connection){
          this.rootCon.setupFunctions(onMessage,onDisconnect,onError)
          this.unloadRootBacklog();
        }else throw new Error("RootCon connection not defined.")

      }
      ////////////////////////////// To Root Send and receive methods //////////////////////////////
      unloadRootBacklog(){
        this.rootBacklog.forEach((element) => element())
      }
      sendRoot(actionObject){
        //console.log("Sending message to Root:")
        //console.log(actionObject);
          if (!this.rootCon) return;
          else if(this.rootCon.state==="On") {this.rootCon.send(actionObject);}
          else this.rootBacklog.push(function(){
            this.rootCon.send(actionObject);
          });
      }

      removeCon(id){
        if(this.cons.get(id)){
          this.cons.get(id).connection.close();
          this.cons.delete(id);
        }
      }
      ////////////////////////////// Normal Send methods //////////////////////////////
      secureSend(actionName,actionObject,peerId=undefined,params=[]){
        //console.log("Sending the action securely;")
        if (peerId){
          //console.log("To "+peerId+".")
          let foundUser =this.cons.get(peerId)
          if (!foundUser) return;
          else if(foundUser.state==="On"||foundUser.state==="Special") this[actionName+"Inner"](actionObject,peerId,params);
          else this.backlog.push([actionName,actionObject,peerId])
        }else{
          let connected
          let yetToConnect
          [connected, yetToConnect] = this.getOnAndConUsers()
          if (yetToConnect.length===0)this[actionName+"Inner"](actionObject,params);
          else {
            this.backlog.push([actionName,actionObject])
            console.log("NEVERMIND, there is people still yet to connect")
            console.log( yetToConnect)
          }
        }
      }
      send(actionObject,peerId){
        this.secureSend("send",actionObject,peerId)
      }
      sendInner(actionObject,peerId){
        this.cons.get(peerId).send(actionObject)
        //.connection.send(actionObject);
      }

      sendAll(actionObject){
        console.log(this.cons)
        this.secureSend("sendAll",actionObject)
      }
      sendAllInner(actionObject){
        this.cons.forEach(function(conData){
          if(conData.type==="Normal")
            conData.send(actionObject);
        })
      }
      sendExcept(exceptionNames,actionObject){
        this.secureSend("sendExcept",actionObject,undefined,exceptionNames)
      }
      sendExceptInner(actionObject,exceptionNames){
        this.cons.forEach(function(conData,name){
          if(!exceptionNames.includes(name)&&conData.type==="Normal")
            conData.send(actionObject);
        })
      }
      sendTo(targetNames,actionObject){
        console.log("Sending message to:")
        console.log(targetNames);
        this.secureSend("sendTo",actionObject,undefined,targetNames)
      }
      sendToInner(actionObject,targetNames){
        console.log("SentoinnerReached")
        this.cons.forEach(function(conData,name){
          if(targetNames.includes(name)){
            console.log("sending to "+name)
            conData.send(actionObject);
          }
        })
      }

      /**
       * Closes its event communicator and peer.
       */
      close(){
        
        this.eventCommunicator.removeAllListeners()
        if (this.peer){
          this.peer.disconnect()
          if(this.rootCon){
            this.rootCon.close();
          }
          
          this.cons.forEach(function(conData){
            conData.close();
          })
          
          
          this.peer.destroy();
        }
       
        //delete this.peer;
        //delete this;
        
      }
      display(){
        var div = document.createElement('div')
        div.appendChild(document.createTextNode("PeerID:"+this.peer.id))
        var table = document.createElement('TABLE');
        div.appendChild(table)
        table.border = '1';
      
        var tableBody = document.createElement('TBODY');
        table.appendChild(tableBody);
      
        var tr = document.createElement('TR');
        tableBody.appendChild(tr);
        let names = ["Name:","Type:","State:","Online:"]
        let value = ["id","type","state","connection"]
        for (var j = 0; j < names.length; j++) {
          var td = document.createElement('TD');
          td.width = '75';
          td.appendChild(document.createTextNode(names[j]));
          tr.appendChild(td);
        }
        if(this.rootCon){
          var tr = document.createElement('TR');
          tableBody.appendChild(tr);
          for (var j = 0; j < names.length; j++) {
            var td = document.createElement('TD');
            td.width = '75';
            if(value ==="id"){
              td.appendChild(document.createTextNode("RootConnection:"+this.rootCon[value[j]]));
            }
            else if(value[j]==="connection"&&this.rootCon[value[j]]){
              td.appendChild(document.createTextNode(this.rootCon[value[j]].open));
            }else
              td.appendChild(document.createTextNode(this.rootCon[value[j]]));
            tr.appendChild(td);
          }
        }
        this.cons.forEach(function(user){
          var tr = document.createElement('TR');
          tableBody.appendChild(tr);
      
          for (var j = 0; j < names.length; j++) {
            var td = document.createElement('TD');
            td.width = '75';
            if(value[j]==="connection"&&user[value[j]]){
              td.appendChild(document.createTextNode(user[value[j]].open));
            }else
              td.appendChild(document.createTextNode(user[value[j]]));
            tr.appendChild(td);
          }
        })


        
        return div

      }
}
//module.exports = {ConHandler, ConData,PEERJS_OPTIONS, CON_OPTIONS}
export{ConHandler, ConData,PEERJS_OPTIONS, CON_OPTIONS,setPeerJsOptions,resetPeerJsOptions}
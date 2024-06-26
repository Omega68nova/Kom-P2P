// Modules to control application life and create native browser window
const { app, BrowserWindow, Menu, ipcMain } = require('electron');
//var PeerServer = require('peer').PeerServer;
const path = require('path')

function createWindow () {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 400,
    height: 800,
    webPreferences: {
        contextIsolation: false,
        nodeIntegration: true,
        nodeIntegrationInWorker: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })
 /* mainWindow.on('close', (e) => {

    const choice = this.dialog.showMessageBox(
      this.mainWindow,
      {
        type: 'question',
        buttons: ['Yes', 'No, hang on'],
        title: 'Confirm your actions',
        message: 'Do you really want to close the application?'
      }
    );
    console.log('CHOICE: ', choice);
    if (choice > 0) e.preventDefault();
  });*/
  // and load the index.html of the app.
  mainWindow.loadFile('index.html')
  try{
    //const peerServer = PeerServer({ port: 1234, path: "/omegaChatAppServer" });
  }catch(err){
    console.log(err)
  }
  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
}
/*
ipcMain.on('renderer:createPeerServer',(e,[dir,IP,port])=>{
  console.log([dir,IP,port])
try{
  var server = PeerServer({port: port, path: dir}); 
}catch(err){
  ipcMain.emit('main:createPeerServerFail',err)
}

server.on('connection', (client) => { console.log("Connected: "+client) });
server.on('disconnect', (client) => { console.log("Disconnected: "+client) });
})*/
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

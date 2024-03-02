// COMMON.JS

var PIXEL1x1 = "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";

// Helper class for state management for hypertext processing
// Able to turn "open-tag" hyperlinks to compliant HTML

class State 
{
  constructor()
  {
    this.props = new Map();
    this.open = false;
  }
  print() 
  {
    var out = "";
    this.props.forEach((v,k)=>{
      out += k+":"+v+";";
    });
    return out;
  }
  printSpan() 
  {
    return "<span style=\""+this.print()+"\">";
  }
  close()
  {
    return this.open ? "</span>" : "";
  }
  add(prop,val)
  {
    var closer = this.close();
    this.props.set(prop,val);
    this.open = true;
    return closer + this.printSpan();
  }
  remove(prop) 
  {
    var closer = this.close();
    this.props.delete(prop);
    this.open = true;
    return closer + this.printSpan();
  }
  toggle(prop,val) 
  {
    var closer = this.close();
    if (this.props.has(prop))
    {
      this.props.delete(prop);
    }
    else
    {
      this.props.set(prop,val);
    }
    this.open = true;
    return closer + this.printSpan();
  }
} 

function ArrayBufferToString(buf)
{
  return Array.prototype.map.call(new Uint8Array(buf),x=>String.fromCharCode(x)).join('');
}

function ArrayBufferToBase64(buf) {
  return btoa(
    new Uint8Array(buf).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );
}

// from https://stackoverflow.com/a/38133146
function clearStylesheetRules()
{
  for (var i in document.styleSheets)
  {
    if (document.styleSheets[i].ownerNode.id=="edition-rules")
    {
      while(document.styleSheets[i].cssRules.length)
      {
        document.styleSheets[i].deleteRule(0);
      }
      break;
    }
  }
}

function changeStylesheetRule(selector, property, value)
{
  var stylesheet = null;
  for (var i in document.styleSheets)
  {
    if (document.styleSheets[i].ownerNode.id=="edition-rules")
    {
      stylesheet = document.styleSheets[i];
      break;
    }
  }
  if (!stylesheet)
  {
    return;
  }

  // Make the strings lowercase
  selector = selector.toLowerCase();
  property = property.toLowerCase();
  value = value.toLowerCase();

  // Change it if it exists
  for(var i = 0; i < stylesheet.cssRules.length; i++)
  {
    var rule = stylesheet.cssRules[i];
    if(rule.selectorText === selector)
    {
      rule.style[property] = value;
      return;
    }
  }

  // Add it if it does not
  stylesheet.insertRule(selector + " { " + property + ": " + value + "; }", 0);
}

function toHex(v)
{
  return v<16 ? "0" + parseInt(v).toString(16) : parseInt(v).toString(16);
}

class MagInterface
{
  // ---------------------------------------------------------------------
  // ABSTRACT INTERFACE, IMPLEMETED BY THE SPECIFIC MAGS
  // ---------------------------------------------------------------------

  // get the (human-written) name of the mag
  getMagDisplayName() { return ""; }
  
  // return the file extension for the datafiles
  getExtension() { return ""; }

  // return an array of objects that define the issues of the magazine
  // the object must contain at least an "url" and a "title" field
  getIssues() { return []; }
  
  // return the HTML required by the mag; this will be placed within the resizing container
  generateHTML() { return ""; }

  // return an object where keys represent css selectors, and the values represent which mode they should be visible in
  getModes() { return {}; }

  // load a file from the specified identifier; id can be either a filename / url or just a number; returns a Promise
  loadFileFromArchive( id ) {}

  // load a specific issue of the mag from the
  // calls `finishedCallback` with no parameter when finished
  loadMagIssueData( array_buffer ) {}
  
  // load and display the main menu / main screen of the magazine
  loadMenu( firstTime ) {}

  // load and display an article with the specified identifier; id can be either a filename / url or just a number
  loadArticle( id ) {}

  // ---------------------------------------------------------------------
  // SHARED INTERFACE
  // ---------------------------------------------------------------------
  
  constructor()
  {
    this.issueX = 640;
    this.issueY = 480;
    this.container = "#container";
    this.magDataDir = "./";
    this.xhr = null;
    this.chiptune = null;
    this.musicPaused = true;
    this.musicDataWaiting = null;
    this.musicDataWaitingIsMP3 = false;
  }
  
  // The index of the currently viewed issue
  currentIssueIndex = -1;
  
  // Get the record from GetIssues
  getCurrentIssueInfo() { return this.currentIssueIndex == -1 ? null : this.getIssues()[this.currentIssueIndex]; }

  // get a human-readable version of the currently selected issue name (usually the file name without extension)
  getEditionID()
  {
    if (this.getCurrentIssueInfo().editionID)
    {
      return this.getCurrentIssueInfo().editionID;
    }
    var url = this.getCurrentIssueInfo().url;
    return url.substr(0,url.indexOf("."));
  }
  
  setWindowTitle(title)
  {
    var str = this.getCurrentIssueInfo().title;
    if (title)
    {
      str = title + " :: " + str;
    }
    document.title = str;
  }

  // load a file from the specified identifier; id can be either a filename / url or just a number; returns a Promise
  loadASCIIStringFromArchive( id ) 
  {
    return new Promise((resolve,reject) => {
      this.loadFileFromArchive( id )
        .then((array_buffer)=>{
          resolve( String.fromCharCode.apply(null, new Uint8Array(array_buffer)) );
        })
        .catch(reject)      
    });
  }

  // load a file from the specified identifier; id can be either a filename / url or just a number; returns a Promise
  loadBlobFromArchive( id ) 
  {
    return new Promise((resolve,reject) => {
      this.loadFileFromArchive( id )
        .then((array_buffer)=>{
          resolve( new Blob([array_buffer]) );
        })
        .catch(reject)      
    });
  }

  // load a file from the specified identifier; id can be either a filename / url or just a number; returns a Promise
  loadBlobURLFromArchive( id ) 
  {
    return new Promise((resolve,reject) => {
      this.loadFileFromArchive( id )
        .then((array_buffer)=>{
          resolve( URL.createObjectURL(new Blob([array_buffer])) );
        })
        .catch(reject)      
    });
  }

  // switch "mode" (= show/hide html elements) based on the common elements + the mag-provided lookup table
  switchMode(mode)
  {
    var selector = document.querySelector("#selector");
    if (selector) selector.style.display = mode == "selector" ? null : "none";
  
    var container = document.querySelector(this.container);
    if (container) container.style.display = mode != "selector" ? null : "none";
    var zoom = document.querySelector("#zoom");
    if (zoom) zoom.style.display = mode != "selector" ? null : "none";
    var music = document.querySelector("#toggleMusic");
    if (music) music.style.display = mode != "selector" ? null : "none";

    var modes = this.getModes();
    Object.entries(modes).forEach(kvp=>{
      var element = document.querySelector(kvp[0]);
      if (element) element.style.display = mode == kvp[1] ? null : "none";
    });
  }
  
  // initialise the issue selector
  loadSelector()
  {
    this.currentIssueIndex = -1;
    clearStylesheetRules();
  
    document.title = this.getMagDisplayName() + " Online";
    
    this.switchMode("selector");
    
    var menu = document.querySelector("#selector");
    menu.innerHTML = "";
    this.getIssues().forEach(((i)=>
    {
      if (i.hidden)
      {
        return;
      }
      var li = document.createElement("li")
      li.innerHTML = i.title;
      menu.insertBefore( li, null );
      li.setAttribute("data-edition",i.editionID ?? i.url.replace(this.getExtension(),""));
      li.onclick = (function(e)
      {
        var edition = li.getAttribute("data-edition");
  
        this.pushNavigationState({"edition":edition})
  
        this.loadIssue(edition)
          .then((function(){ this.loadMenu(true); }).bind(this));
        
        e.stopPropagation();
      }).bind(this);
    }).bind(this));
  }

  // load a file; returns a Promise
  updateFileStatus(filename,status)
  {
    var files = document.querySelector("#files");
    if (!files)
    {
      return;
    }
    var file = files.querySelector("li[data-filename='"+filename+"']");
    if (!file)
    {
      file = document.createElement("li");
      file.setAttribute("data-filename",filename);
      file.innerHTML = "<a href='#' class='name'></a> <span class='size'></span> <span class='status'></span>";
      files.insertBefore(file, null);
    }
    
    var basename = filename.split('/').reverse()[0];
    file.querySelector(".name").innerHTML = basename;
    file.querySelector(".name").href = this.magDataDir + filename;
    file.querySelector(".status").innerHTML = status;
  }
  
  loadFile( filename, useProgressBar )
  {
    return new Promise((resolve, reject) => {
      this.xhr = new XMLHttpRequest();
      if (useProgressBar)
      {
        this.xhr.onprogress = (function(e)
        {
          var loading = document.querySelector("#loading");
          if (!loading)
          {
            loading = document.createElement("div")
            document.body.insertBefore(loading,null);
            loading.setAttribute("id", "loading");
          }

          var msg = "";
          if (e.total > 0)
          {
            var perc = e.loaded / e.total;
            msg = (perc*100).toFixed(2)+"%";
          }
          else
          {
            msg = (e.loaded/1024/1024).toFixed(2)+"MB";
          }
          loading.innerHTML = "Loading ("+msg+")";
          this.updateFileStatus(filename,"Loading: "+msg);
        }).bind(this);
      }
      else
      {
        this.xhr.onprogress = (function(e)
        {
          var msg = "";
          if (e.total > 0)
          {
            var perc = e.loaded / e.total;
            msg = (perc*100).toFixed(2)+"%";
          }
          else
          {
            msg = (e.loaded/1024/1024).toFixed(2)+"MB";
          }
          this.updateFileStatus(filename,"Loading: "+msg);
        }).bind(this);
      }
      this.xhr.onerror = (function(e)
      {
        this.updateFileStatus(filename,"Error!");
        reject(e);
      }).bind(this);
      this.xhr.timeout = (function(e)
      {
        this.updateFileStatus(filename,"Error: timeout");
        reject(e);
      }).bind(this);
      this.xhr.onload = (function(e)
      {
        this.updateFileStatus(filename,"Loaded.");
        this.xhr = null;
        var loading = document.querySelector("#loading");
        if (loading)
        {
          loading.remove();
        }
        var file = new File([e.target.response],filename);
      	let blob = file.slice();
      	let file_name = file.name;
    
      	// Convert the blob into an array buffer
      	let reader = new FileReader();
      	reader.onload = function(evt) {
      		let array_buffer = reader.result;
      		
      		resolve( array_buffer );
      	};
      	reader.readAsArrayBuffer(blob);
      }).bind(this);
      this.updateFileStatus(filename,"");      

      this.xhr.responseType = "blob";
      this.xhr.open("GET", this.magDataDir + filename);
      this.xhr.send();
    });
  }
  
  loadIssue( editionID )
  {
    return new Promise((resolve, reject) => {
      
      this.switchMode("loading");
      
      var music = document.querySelector("#toggleMusic");
      if (music)
      {
        music.innerHTML = "&#x1F507;"; // TODO: for now
      }
    
      var newIdx = this.getIssues().findIndex( s => s.editionID == editionID || s.url == editionID + this.getExtension() )
      if (this.currentIssueIndex == newIdx)
      {
        resolve();
        return;
      }
      
      this.currentIssueIndex = newIdx;
 
      var container = document.querySelector(this.container);
      container.setAttribute("data-issue",this.getEditionID());
     
      this.setWindowTitle(null);
  
      this.loadFile( this.getCurrentIssueInfo().url, true )
        .then(a=>{ return this.loadMagIssueData(a); })
        .then(resolve)
        .catch(reject)
    });
  }
  
  // push a navigation state object into the browser history stack
  replaceNavigationState(stateObj)
  {
    var urlString = Object.entries(stateObj).map(s=>`${s[0]}=${encodeURIComponent(s[1])}`).join("/");
    history.replaceState(stateObj, "", "#/" + urlString );
  }

  // push a navigation state object into the browser history stack
  pushNavigationState(stateObj)
  {
    var urlString = Object.entries(stateObj).map(s=>`${s[0]}=${encodeURIComponent(s[1])}`).join("/");
    history.pushState(stateObj, "", "#/" + urlString );
  }
  
  // handle the state object (either from an url hash or the navigation history
  // returns true if it handled it and all navigation has been performed
  handleMagNavigationState(stateObj)
  {
    if (stateObj && stateObj.edition)
    {
      if (stateObj.article)
      {
        this.loadIssue(stateObj.edition)
          .then( (function(){ this.loadArticle(stateObj.article); }).bind(this) )
          .catch( (err) => console.error(err) );
      }
      else
      {
        this.loadIssue(stateObj.edition)
          .then( (function(){ this.loadMenu(false); }).bind(this) )
          .catch( (err) => console.error(err) );
      }
      return true;
    }
    return false;
  }
  
  // handle the browser back/forward buttons
  handlePopState(event)
  {
    if (this.handleMagNavigationState(event.state))
    {
      return;
    }
  
    this.handleClose();  
  }
  
  handleClose()
  {
    if (this.onCloseCallback)
    {
      this.onCloseCallback();
      return;
    }
    
    this.loadSelector();
  }
  
  // handle url if pasted into the address bar
  handleUrlHash()
  {
    var search = {}
    location.hash.substr(1).split("/").forEach(s=>{
      var a = s.split("=");
      if (a[0]) search[a[0]] = decodeURIComponent(a[1]);
    });
  
    if (this.handleMagNavigationState(search))
    {
      return true;
    }
    
    return false;
  }
  
  // initialize the framework
  create()
  {
    var container = document.querySelector(this.container);
    container.innerHTML = this.generateHTML();
    
    // fit-to-screen function
    window.onresize = (function()
    {
      var container = document.querySelector(this.container);
      var scale = 1;
      if (this.zoom)
      {
        if (window.innerWidth > window.innerHeight)
        {
          // wider than tall
          scale = window.innerHeight / this.issueY;
        }
        else
        {
          // taller than wide
          scale = window.innerWidth / this.issueX;
        }
      }
      container.style.transform = "translate(calc(50vw - 50%),calc(50vh - 50%)) scale("+scale.toFixed(2)+")";
    }).bind(this)
    window.onresize();
  
    // toggle zoom
    var zoom = document.querySelector("#zoom");
    if (zoom)
    {
      zoom.onclick = (function(e)
      {
        this.zoom = !this.zoom;
        window.onresize();
      }).bind(this)
    }
    var close = document.querySelector("#close");
    if (close)
    {
      close.onclick = (function(e)
      {
        this.handleClose();
      }).bind(this)
    }
    // toggle zoom
    var music = document.querySelector("#toggleMusic");
    if (music)
    {
      music.onclick = (function(e)
      {
        this.toggleMusic();
        this.updateMusicIcon();
      }).bind(this)
    }
    
    // handle back/fwd keys
    window.onpopstate = (function(e)
    {
      if (!e.state)
      {
        if (this.handleUrlHash())
        {
          return;
        }
      }
      this.handlePopState(e);
    }).bind(this)
  
    if (this.handleUrlHash())
    {
      return;
    }
  }
  
  updateMusicIcon()
  {
    var music = document.querySelector("#toggleMusic");
    if (!music)
    {
      return;
    }
    if (!this.musicPaused)
    {
      music.innerHTML = "&#x1F50A;"; // loud
    }
    else
    {
      music.innerHTML = "&#x1F507;"; // muted
    }
  }
  
  stopMusic()
  {
    var audio = document.querySelector(this.container+" audio");
    if (audio)
    {
      audio.pause();      
    }  
    if (this.chiptune)
    {
      this.chiptune.stop();
    }
  }
  
  playMusicInternal(data, is_mp3 = false)
  {
    this.stopMusic()
    
    if (is_mp3)
    {
      var container = document.querySelector(this.container);
      var audio = container.querySelector("audio");
      if (!audio)
      {
        audio = document.createElement("audio")
        container.insertBefore( audio, null );
      }
      audio.src = "data:audio/mp3;base64,"+ArrayBufferToBase64(data);
      audio.play();
      return;
    }
    
    var play = (function(data)
    {
      this.chiptune.play(data);
    }).bind(this)
    
    if (!this.chiptune)
    {
      import('./external/chiptune/chiptune3.js').then((mod=>{
        this.chiptune = new mod.ChiptuneJsPlayer();
        this.chiptune.onInitialized((() => {
          play(data);
        }).bind(this))
      }).bind(this))
      return;
    }
    
    play(data);      
  }
  
  playMusic(data, is_mp3 = false)
  {
    var onDownloaded = (function(data, is_mp3)
    {
      this.testAudioContext = new AudioContext();
      var requiresUserInteraction = this.testAudioContext.state == "suspended";
      if (requiresUserInteraction)
      {
        this.testAudioContext.onstatechange = () => {
          if (this.testAudioContext.state != "suspended" && this.musicDataWaiting != null)
          {
            this.playMusicInternal(this.musicDataWaiting, this.musicDataWaitingIsMP3);
            this.musicDataWaiting = null; 
            this.musicDataWaitingIsMP3 = false;
            this.musicPaused = false;
            this.testAudioContext = null;
            this.updateMusicIcon();
          }
        }
        this.musicDataWaiting = data;
        this.musicDataWaitingIsMP3 = is_mp3;
        this.musicPaused = true;
        return;
      }
      
      this.testAudioContext = null;
      this.playMusicInternal(data, is_mp3);
      this.musicPaused = false;
    }).bind(this);
    
    if (typeof data == "string")
    {
      this.loadFile(data).then(byteData=>{ onDownloaded(byteData,data.substr(-4).toLowerCase() == ".mp3"); });
      return;
    }
    onDownloaded(data, is_mp3);
  }
  
  nextMusicTrack()
  {
  }
  
  // returns true if music is now playing, false if it's now stopped
  toggleMusic()
  {
    if (this.musicDataWaiting)
    {
      this.playMusicInternal(this.musicDataWaiting, this.musicDataWaitingIsMP3);
      this.musicDataWaiting = null; 
      this.musicDataWaitingIsMP3 = false;
      this.musicPaused = false;
      return true;
    }
    
    // TODO: this is a bit of a mess because what if we're supporting both mp3s and mods? deal with this later when track skipping is an option
    var container = document.querySelector(this.container);
    var audio = container.querySelector("audio");
    if (audio)
    {
      if (audio.paused)
      {
        audio.play();
        this.musicPaused = false;
        return true;
      }
      audio.pause();
      this.musicPaused = true;
      return false;
    }
    if (this.chiptune)
    {
      this.chiptune.togglePause();
      this.musicPaused = !this.musicPaused;
      return !this.musicPaused; // returning pause state not currently supported by chiptune3.js
    }
  }
  
  destroy()
  {
    var loading = document.querySelector("#loading");
    if (loading)
    {
      loading.remove();
    }
    if (this.xhr)
    {
      this.xhr.abort()
    }
    this.stopMusic();
    this.chiptune = null;
  }
}
class Sunray extends MagInterface
{
  getColor(color)
  {
    return "#"
    +toHex(this.palette[color].r)
    +toHex(this.palette[color].g)
    +toHex(this.palette[color].b);
  }

  parseToHTML(str)
  {
    var out = "";
    var xPos = 0;
    var divClose = "";
    for(var x=0; x<str.length; x++)
    {
      switch (str[x])
      {
        case "<":
          {
            if (str.slice(x+1,x+3) == "sl")
            {
              // start link
              var link = str.slice(x+3,str.indexOf(">",x));

              var aAttrib = {};
              aAttrib["href"] = "#/edition="+this.getEditionID()+"/article="+encodeURIComponent(link)
              aAttrib["data-url"] = link;
              aAttrib["data-type"] = "link";
          
              out += "<a "+Object.entries(aAttrib).map(i=>{ return `${i[0]}="${i[1]}"`; }).join(" ")+">";
              
              x += 3 + link.length;
            }
            else if (str.slice(x+1,x+3) == "ss")
            {
              // start link
              var link = str.slice(x+3,str.indexOf(">",x));

              var aAttrib = {};
              aAttrib["href"] = location.href;
              aAttrib["data-url"] = link;
              aAttrib["data-type"] = "music";
          
              out += "<a "+Object.entries(aAttrib).map(i=>{ return `${i[0]}="${i[1]}"`; }).join(" ")+">";
              
              x += 3 + link.length;
            }
            else if (str[x+1] == "p")
            {
              // picture
              var link = str.slice(x+2,str.indexOf(">",x));
              console.log("p",link);
              
              var attrib = {};
              attrib["data-url"] = link;
              attrib["src"] = PIXEL1x1;

              out += "<img "+Object.entries(attrib).map(i=>{ return `${i[0]}="${i[1]}"`; }).join(" ")+">";
              
              x += 2 + link.length;
            }
            else if (str.slice(x+1,x+3) == "sL")
            {
              // end link
              out += "</a>";
              
              x += 3;
            }
            else if (str.slice(x+1,x+3) == "sc")
            {
              // center?
              out += this.state.close() + divClose + "<div style=\"text-align:center;"+this.state.print()+"\">";
              this.state.open = false;
              divClose = "</div>";
              
              x += 3;
            }
            else if (str.slice(x+1,x+3) == "o0")
            {
              // default mode; can ignore?
              
              x += 3;
            }
            else if (str.slice(x+1,x+3) == "o1")
            {
              // two column mode?
              var article = document.querySelector("#article");
              article.className = "columns";
              
              x += 3;
            }
            else if (str.slice(x+1,x+3) == "o2")
            {
              // monospace?
              var article = document.querySelector("#article");
              article.className = "mono";
              
              x += 3;
            }
            else if (str[x+1] == "c")
            {
              // color
              var color = str.slice(x+2,str.indexOf(">",x));
              
              out += this.state.add("color","#"+color);
              
              x += 2 + color.length;
            }
            else if (str.slice(x+1,x+3) == "si")
            {
              // italic on

              out += this.state.add("font-style","italic");

              x += 3;
            }
            else if (str.slice(x+1,x+3) == "sI")
            {
              // italic off
              out += this.state.remove("font-style");

              x += 3;
            }
          }
          break;
        default:
          out += str[x];
          xPos++;
          break;
      }
    }
    return out;
  }

  loadArticle(articlename)
  {
    this.loadASCIIStringFromArchive( articlename ).then(str=>{
      this.switchMode("article");

      var article = document.querySelector("#article");
      article.className = "";

      article.innerHTML = "";
      this.state = new State();
      var out = this.parseToHTML(str);
      article.innerHTML = out + this.state.close();
      
      var links = Array.from( article.querySelectorAll("a[data-url]") );
      links.forEach(i=>{
        i.onclick = e=>{
          var event = e || window.event;
          e.stopPropagation();

          var url = i.getAttribute("data-url");
          var type = i.getAttribute("data-type");

          if(type == "link")
          {
            this.pushNavigationState({"edition":this.getEditionID(),"article":url})
            this.loadArticle( url );
          }
          else if(type == "music")
          {
            this.playMusicTrackByFilename(url);
          }
        };
      });
      
      var images = Array.from( article.querySelectorAll("img[data-url]") );
      images.forEach(i=>{
        this.loadImage(i.getAttribute("data-url")).then(function(blob){
          i.src = blob;
        });
      });
      
      article.scrollTo(0,0);
    });
  }

  loadImage(index,savePal)
  {
    return new Promise((resolve,reject)=>{
      this.loadBlobURLFromArchive( index ).then(blobURL=>{
        resolve(blobURL);
      });
    });
  }

  loadMenu(first)
  {
    this.loadArticle("MENU.TXT");
  }

  loadConfig(cb)
  {
    return new Promise((resolve,reject)=>{
      clearStylesheetRules();
      changeStylesheetRule(this.container,"width" ,this.issueX + "px");
      changeStylesheetRule(this.container,"height",this.issueY + "px");
      
      // lol how the f did this even work in the original, that file clearly doesnt exist...
      // maybe it discarded the path and only checked for the base name?!
      this.fileMap["OTHERS/RTS/RTS9.TXT".toLowerCase()] = this.fileMap["OTHERS/RTS9/RTS9.TXT".toLowerCase()];
      
      this.trackIdx = 0;
      this.playMusicTrack(0);
      
      this.loadImage("BACK.JPG").then(blobUrl=>{
        changeStylesheetRule(this.container,"background","url("+blobUrl+")");
      });
      resolve();
    });
  }

  playMusicTrack(idx)
  {
    var musicFiles = this.files.filter(s=>s.type==3).slice(3); // first 3 are images, tsk-tsk!
    this.playMusicTrackByFilename(musicFiles[idx].path);
  }

  playMusicTrackByFilename(filename)
  {
    this.loadFileFromArchive(filename)
      .then(
        (data  => { this.playMusic(data); }).bind(this),
        (error => { this.playMusic(this.getCurrentIssueInfo().editionID + "/" + musicFile); }).bind(this)
      );
  }
  
  nextMusicTrack()
  {
    this.trackIdx = (this.trackIdx + 1) % this.getCurrentIssueInfo().music.length;
    this.playMusicTrack(this.trackIdx);
  }

  // ---------------------------------------------------------------------
  // IMPLEMENT SUPERCLASS
  // ---------------------------------------------------------------------

  // get the (human-written) name of the mag
  getMagDisplayName() { return "Sunray"; }

  // return the file extension for the datafiles
  getExtension() { return ".DAT"; }

  // return an array of objects that define the issues of the magazine
  // the object must contain at least an "url" and a "name" field
  getIssues()
  {
    return SUNRAY_ISSUES;
  }

  // return the HTML required by the mag; this will be placed within the resizing container
  generateHTML()
  {
    return "<ul id='menu-main'></ul><div id='article'></div><div id='article-title'></div><div id='article-image'></div>";
  }

  // return an object where keys represent css selectors, and the values represent which mode they should be visible in
  getModes()
  {
    var obj =
    {
      "#menu-main": "mainmenu",
      "#article": "article",
      "#article-image": "article-image",
    };
    return obj;
  }

  // load a file from the specified identifier; id can be either a filename / url or just a number; returns a Promise
  loadFileFromArchive( id )
  {
    return new Promise( ( (resolve, reject) => {
      var file = this.fileMap[id.toLowerCase()];
      if (file)
      {
        resolve( this.fileMap[id.toLowerCase()].data );
      }
      else
      {
        reject( "FILE NOT FOUND: " + id );
      }
    } ).bind(this) );
  }
  
  parseDataFile(array_buffer,startingImageCount)
  {
    var view = new DataView(array_buffer, 0, array_buffer.byteLength);
    
    var ptr = 0;
    
    // skip for now
    for(var i=0; i<startingImageCount;i++)
    {
      var imageSize = view.getUint32(ptr,true);
      ptr += 4;
      ptr += imageSize;
    }
    
    this.contextTOC = [];
    var contextTOCLength = view.getUint32(ptr,true); ptr += 4;
    for(var i=0; i<contextTOCLength; i++)
    {
      var entry = {};
      entry.label = ArrayBufferToString( array_buffer.slice(ptr,ptr+256) ).replace(/\0+$/,""); ptr += 256;
      entry.path  = ArrayBufferToString( array_buffer.slice(ptr,ptr+256) ).replace(/\0+$/,""); ptr += 256;
    }

    var fileCount = view.getUint32(ptr,true); ptr += 4;
    for(var i=0; i<fileCount; i++)
    {
      var entry = {};
      entry.type = view.getUint32(ptr,true); ptr += 4;
      entry.length = view.getUint32(ptr,true); ptr += 4;
      entry.path = ArrayBufferToString( array_buffer.slice(ptr,ptr+256) ).replace(/\0+$/,""); ptr += 256;
      entry.data = array_buffer.slice(ptr,ptr+entry.length); ptr += entry.length;
      this.files.push(entry);
      this.fileMap[entry.path.toLowerCase()] = entry;
    }
  }

  // load a specific issue of the mag from the
  // calls `finishedCallback` with no parameter when finished
  loadMagIssueData( array_buffer )
  {
    return new Promise( (function(resolve, reject){

      var view = new DataView(array_buffer, 0, array_buffer.byteLength);
      try
      {
        this.issueX = 800;
        this.issueY = 600;
        window.onresize();
        
        this.fileMap = {};
        this.files = [];
        
        this.parseDataFile(array_buffer,3);
        
        this.loadFile("SUNRAY.DA2").then( ( function(array_buffer2){
          this.parseDataFile(array_buffer2,2);
          this.loadConfig()
            .then(resolve,reject);
        } ).bind(this) );
        
      }
      catch(e)
      {
        reject(e);
      }
    }).bind(this) );
  }
}

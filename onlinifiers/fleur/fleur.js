UNICODETABLE = [
    32, 9786, 9787, 9829, 9830, 9827, 9824, 8226, 9688, 9675, 9689, 9794, 9792, 9834, 9835, 9788, 
  9658, 9668, 8597, 8252,  182,  167, 9644, 8616, 8593, 8595, 8594, 8592, 8735, 8596, 9650, 9660, 
    32,   33,   34,   35,   36,   37,   38,   39,   40,   41,   42,   43,   44,   45,   46,   47, 
    48,   49,   50,   51,   52,   53,   54,   55,   56,   57,   58,   59,   60,   61,   62,   63, 
    64,   65,   66,   67,   68,   69,   70,   71,   72,   73,   74,   75,   76,   77,   78,   79, 
    80,   81,   82,   83,   84,   85,   86,   87,   88,   89,   90,   91,   92,   93,   94,   95, 
    96,   97,   98,   99,  100,  101,  102,  103,  104,  105,  106,  107,  108,  109,  110,  111, 
   112,  113,  114,  115,  116,  117,  118,  119,  120,  121,  122,  123,  124,  125,  126, 8962, 
   199,  252,  233,  226,  228,  224,  229,  231,  234,  235,  232,  239,  238,  236,  196,  197, 
   201,  230,  198,  244,  246,  242,  251,  249,  255,  214,  220,  162,  163,  165, 8359,  402, 
   225,  237,  243,  250,  241,  209,  170,  186,  191, 8976,  172,  189,  188,  161,  171,  187, 
  9617, 9618, 9619, 9474, 9508, 9569, 9570, 9558, 9557, 9571, 9553, 9559, 9565, 9564, 9563, 9488, 
  9492, 9524, 9516, 9500, 9472, 9532, 9566, 9567, 9562, 9556, 9577, 9574, 9568, 9552, 9580, 9575, 
  9576, 9572, 9573, 9561, 9560, 9554, 9555, 9579, 9578, 9496, 9484, 9608, 9604, 9612, 9616, 9600, 
   945,  223,  915,  960,  931,  963,  181,  964,  934,  920,  937,  948, 8734,  966,  949, 8745, 
  8801,  177, 8805, 8804, 8992, 8993,  247, 8776,  176, 8729,  183, 8730, 8319,  178, 9632,   32,  
];

class Fleur extends MagInterface
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
    for(var x=0; x<str.length; x++)
    {
      switch (str[x])
      {
        case "\xAB": // tab
          {
            out += this.state.toggle("color",this.highlightColor()) + " ";
          }
          break;
        default:
          out += "&#"+UNICODETABLE[str.charCodeAt(x)]+";";
          xPos++;
          break;
      }
    }
    return out;
  }

  loadArticle(articlename)
  {
    if (articlename.slice(-4) == ".scx")
    {
      this.switchMode("article-image");
      
      var article = document.querySelector("#article-image");
      article.innerHTML = "";
  
      this.loadImage( articlename, false ).then((blobURL)=>{
        article.innerHTML = "<img src='"+blobURL+"'/>";  
      });
    }
    else
    {
      this.switchMode("article");
    
      var article = document.querySelector("#article");
  
      article.innerHTML = "";
      this.loadASCIIStringFromArchive( articlename ).then((str)=>{
        var articleStr = str.split("\r\n");
        this.state = new State();
        var out = ""
        articleStr.forEach((i,idx)=>{
          var parsed = this.parseToHTML(i,idx);
          out += parsed + "\n";
        });
        article.innerHTML = out + this.state.close();
        article.scrollTo(0,0);
      });
    }
  }

  loadImage(index,savePal)
  {
    return new Promise((resolve,reject)=>{
      this.loadFileFromArchive( index ).then((data)=>{
        var rix = new RIX();
        rix.load(data);
        if (savePal)
        {
          this.palette = rix.palette
        }
        rix.renderCanvas((blobUrl)=>{resolve(blobUrl);});
      });
    });
  }

  loadMenu(first)
  {
    this.switchMode("mainmenu");
  
    this.loadASCIIStringFromArchive( this.tocFile ).then((str)=>{

      var menu = document.querySelector("#menu-main");
      menu.innerHTML = "";
  
      var toc = str.split("\r\n");      
      toc.forEach( (function(i){
        var li = document.createElement("li")
  
        var title = i.slice(0,59);
        var number = i.slice(60,62);
        var isImage = i[62];
        var filename = i.slice(63).replace(/[\s\xff]+$/,"");
        if (this.tocFormat == 2)
        {
          title = i.slice(0,60);
          number = i.slice(60,62);
          isImage = i[62];
          filename = i.slice(63).replace(/[\s\xff]+$/,"");
        }
        
        var idx = 0;
        this.state = new State();
        li.innerHTML = title.length ? this.parseToHTML(title) : "&nbsp;";
        menu.insertBefore( li, null );
        
        if (number == "--" || number == " *")
        {
          li.setAttribute("data-idx",filename);
          li.onclick = (function(e)
          {
            var idx = li.getAttribute("data-idx");
      
            this.pushNavigationState({"edition":this.getEditionID(),"article":idx});
            
            this.loadArticle(idx);
    
            e.stopPropagation();
          }).bind(this)
        }
      }).bind(this) );
    });
  
    if (first)
    {
      setTimeout(function(){ 
        var menu = document.querySelector("#menu-main");
        menu.scrollTo(0,0);
      }, 10);
    }
  }

  loadConfig(cb)
  {
    return new Promise((resolve,reject)=>{
      
      this.trackIdx = 0;
      this.playMusicTrack(this.trackIdx);
    
      if (this.menuBackground)
      {
        this.loadImage(this.menuBackground,true).then(blobUrl=>{
          changeStylesheetRule(this.container,"background","url("+blobUrl+")");
        });
      }
    
      resolve();
    });
  }

  playMusicTrack(idx)
  {
    var musicFile = this.getCurrentIssueInfo().music[idx];
    this.loadFileFromArchive(musicFile)
      .then(
        (data  => { this.playMusic(data); }).bind(this),
        (error => { this.playMusic(this.magDataDir + "/" + this.getCurrentIssueInfo().editionID + "/" + musicFile); }).bind(this)
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
  getMagDisplayName() { return "Fleur"; }

  // return the file extension for the datafiles
  getExtension() { return ".EXE"; }

  // return an array of objects that define the issues of the magazine
  // the object must contain at least an "url" and a "name" field
  getIssues()
  {
    return FLEUR_ISSUES;
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
      var entry = this.tocEntries.find(s=>s.name.toLowerCase()==id.toLowerCase());
      if (!entry)
      {
        reject();
        return;
      }
      
      var unpacker = null;
      if (this.unpacker == "lzexe")
      {
        unpacker = new LZEXE();
      }
      if (this.unpacker == "diet")
      {
        unpacker = new Diet();
      }
      
      resolve( unpacker.decompress( this.exeData.slice( this.tocOffset + entry.offset, this.tocOffset + entry.offset + entry.compressedLength ), entry.uncompressedLength ) );
    } ).bind(this) );
  }

  // load a specific issue of the mag from the
  // calls `finishedCallback` with no parameter when finished
  loadMagIssueData( array_buffer )
  {
    return new Promise( (function(resolve, reject){

      var signature = ArrayBufferToString(array_buffer.slice(0,2));
      if (signature != "MZ")
      {
        reject("EXE is invalid");
        return;
      }
      
      var view = new DataView(array_buffer, 0, array_buffer.byteLength);
      try
      {
        let tocSize = view.getUint32(array_buffer.byteLength - 4, true);
        this.tocOffset = array_buffer.byteLength - tocSize;
        
        this.signature = ArrayBufferToString(array_buffer.slice(this.tocOffset,this.tocOffset+15));

        this.exeData = array_buffer;
        this.tocEntries = []
        
        var fileCount = 0;
        this.menuBackground = "menu.scx";
        if (this.signature == "OVL MAKER v1.1o")
        {
          this.tocFormat = 1;
          this.unpacker = "lzexe";
          this.tocFile = "cont3.txt";
          this.highlightColor = () => "#B8E0FC";
          
          var ptr = this.tocOffset + 15;
          fileCount = view.getUint8(ptr++);
          
          for (var x=0; x<fileCount; x++)
          {
            var entry = {}
            
            entry.name = ArrayBufferToString(array_buffer.slice(ptr,ptr+12)).replace(/\0+$/,""); ptr+=12;
            entry.offset = view.getUint32(ptr, true); ptr+=4;
            entry.compressedLength = view.getUint32(ptr, true); ptr+=4;
            entry.uncompressedLength = view.getUint32(ptr, true); ptr+=4;
            ptr += 8;
            
            this.tocEntries.push(entry);
          }
        }
        else if (this.signature == "fleurfleurfleur")
        {
          this.tocFormat = 2;
          this.unpacker = "diet";
          this.tocFile = "tartalom.txt";
          this.highlightColor = (function() { return this.getColor(28); }).bind(this);

          var u8buf = new Uint8Array(array_buffer);
          fileCount = 0x1000;
          for(var x=0; x<0x20 * fileCount + 1; x++)
          {
            var c = u8buf[x + this.tocOffset + 15];
          
            var d = ((c - x + 1) >>> 0) & 0xFF;
            
            if (x == 0)
            {
              fileCount = d - 1;
            }
          
            u8buf[x + this.tocOffset + 15] = d;
          }
          
          view = new DataView(u8buf.buffer, 0, u8buf.buffer.byteLength);

          var ptr = this.tocOffset + 15;
          fileCount = view.getUint8(ptr++);

          for (var x=0; x<fileCount - 1; x++)
          {
            var entry = {}
            
            entry.name = ArrayBufferToString(u8buf.slice(ptr,ptr+15)).replace(/\0+$/,""); ptr+=15;
            entry.type = view.getUint8(ptr++);
            entry.offset = view.getUint32(ptr, true); ptr+=4;
            entry.compressedLength = view.getUint32(ptr, true); ptr+=4;
            entry.uncompressedLength = view.getUint32(ptr, true); ptr+=4;
            ptr += 4;
            
            this.tocEntries.push(entry);
          }
        }
        
        this.loadConfig()
          .then(resolve,reject);
      }
      catch(e)
      {
        reject(e);
      }
    }).bind(this) );
  }
}

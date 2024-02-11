IMPHOBIA_ARTICLE_UNICODETABLE =
[
  32,   33,   34,   32,   32,   32,   38,   39,   40,   41,   32,   43,   44,   45,   46,   47, 
  48,   49,   50,   51,   52,   53,   54,   55,   56,   57,   58,   32,   32,   32,   32,   63, 
  32,   65,   66,   67,   68,   69,   70,   71,   72,   73,   74,   75,   76,   77,   78,   79, 
  80,   81,   82,   83,   84,   85,   86,   87,   88,   89,   90,   91,   92,   93,   32,   32,
  96,   97,   98,   99,  100,  101,  102,  103,  104,  105,  106,  107,  108,  109,  110,  111, 
 112,  113,  114,  115,  116,  117,  118,  119,  120,  121,  122,   32,   32,   32,   32,   32,
];

IMPHOBIA_READING_UNICODETABLE =
[
  32,   33,   34,   35,   36,   37,   38,   39,   40,   41,   42,   43,   44,   45,   46,   47, 
  48,   49,   50,   51,   52,   53,   54,   55,   56,   57,   58,   59,   60,   61,   62,   63, 
  64,   65,   66,   67,   68,   69,   70,   71,   72,   73,   74,   75,   76,   77,   78,   79, 
  80,   81,   82,   83,   84,   85,   86,   87,   88,   89,   90,   91,   92,   93,   94,   95, 
  96,   97,   98,   99,  100,  101,  102,  103,  104,  105,  106,  107,  108,  109,  110,  111, 
 112,  113,  114,  115,  116,  117,  118,  119,  120,  121,  122,  123,  124,  125,  126, 8962, 
 199,  252,  233,  226,  228,  224,  229,  231,  234,  235,  232,  239,  238,  236,  196,  197, 
 201,  230,  198,  244,  246,  242,  251,  249,  255,  214,  220,  248,  163,  216, 8359,  402, 
 225,  237,  243,  250,  241,  209,  170,  186,  191, 8976,  172,  189,  188,  161,  171,  187, 
9617, 9618, 9619, 9474, 9508, 9569, 9570, 9558, 9557, 9571, 9553, 9559, 9565, 9564, 9563, 9488, 
9492, 9524, 9516, 9500, 9472, 9532, 9566, 9567, 9562, 9556, 9577, 9574, 9568, 9552, 9580, 9575, 
9576, 9572, 9573, 9561, 9560, 9554, 9555, 9579, 9578, 9496, 9484, 9608, 9604, 9612, 9616, 9600, 
 945,  223,  915,  960,  931,  963,  181,  964,  934,  920,  937,  948, 8734,  966,  949, 8745, 
8801,  177, 8805, 8804, 8992, 8993,  247, 8776,  176, 8729,  183, 8730, 8319,  178, 9632,   32,
]

class ImphobiaSPRElement
{
  constructor(width,height,palette,data)
  {
    this.width = width;
    this.height = height;
    this.bitplanes = 4;
    this.palette = palette;
    this.pixelData = new Uint8Array(data);
    this.planarToChunky();
  }
  planarToChunky()
  {
    var planarPixelData = this.pixelData;

    this.pixelData = new Uint8Array(this.width * this.height);
    var bytesPerPlaneLine = this.width >>> 3;
    for (var b = 0; b < this.bitplanes; b++)
    {
      var planePtr = this.height * bytesPerPlaneLine * b;
      for (var y = 0; y < this.height; y++)
      {
        var srcLinePtr = planePtr + y * bytesPerPlaneLine;
        for (var x = 0; x < this.width; x++)
        {
          if ( planarPixelData[ srcLinePtr + (x >>> 3) ] & ( 1 << ( 7 - (x & 7) ) ) )
          {
            this.pixelData[ x + y * this.width ] |= (1 << b);
          }
        }
      }
    }
  }
  
  renderCanvas(paletteOffset,cb)
  {
    // create off-screen canvas element
    var canvas = document.createElement('canvas'),
        ctx = canvas.getContext('2d');
    
    canvas.width = this.width;
    canvas.height = this.height;

    var i = 0;
    var ofs = 0;
    var buffer = new Uint8ClampedArray(canvas.width * canvas.height * 4);
    for(var y = 0; y < canvas.height; y++) 
    {
      for(var x = 0; x < canvas.width; x++) 
      {
        var idx = this.pixelData[ofs++] + paletteOffset;
        buffer[i++] = this.palette[idx].r;
        buffer[i++] = this.palette[idx].g;
        buffer[i++] = this.palette[idx].b;
        buffer[i++] = 255;
      }
    }
    
    // create imageData object
    var idata = ctx.createImageData(canvas.width, canvas.height);
    
    // set our buffer as source
    idata.data.set(buffer);
    
    // update canvas with new data
    ctx.putImageData(idata, 0, 0);
    
    canvas.toBlob((blob)=>{
      cb( URL.createObjectURL( new Blob([blob]) ) );
    });
  }  
}

class ImphobiaSPR
{
  constructor(palette)
  {
    this.palette = palette;
  }

  load(array_buffer)
  {
    var view = new DataView(array_buffer, 0, array_buffer.byteLength);
    
    var ptr = 0;
    var elementCount = view.getUint32(ptr,true); ptr+=4;
    ptr+=4;
    
    this.elements = [];
    var planarDataPtr = 8 + (elementCount - 1) * 8;
    for(var i=0; i < elementCount - 1; i++)
    {
      var widthInBytes = view.getUint16(ptr,true); ptr+=2;
      var height       = view.getUint16(ptr,true); ptr+=2;
      
      ptr+=2; // unknown, probably position
      ptr+=2; // unknown, probably position
      
      var size = widthInBytes * height * 4;
      
      this.elements.push( new ImphobiaSPRElement( widthInBytes * 8, height, this.palette, array_buffer.slice(planarDataPtr, planarDataPtr + size) ) );
      
      planarDataPtr += size;
    }
  }
}

class Imphobia extends MagInterface
{
  getColor(color)
  {
    return "#"
    +toHex(this.palette[color].r)
    +toHex(this.palette[color].g)
    +toHex(this.palette[color].b);
  }

  parseToHTML(str, formats)
  {
    var out = "";
    var xPos = 0;
    var state = new State();
    var formatCounter = 0;
    var issue = this.getCurrentIssueInfo();
    for(var x=0; x<str.length; x++)
    {
      var format = formats.find(s=>s.offset == x);
      if (format)
      {
        switch (format.format & 0x0F) // color
        {
          case 0x0C:
            out += state.add("color",this.getColor(issue.highlightColor1));
            break;
          case 0x0D:
            out += state.add("color",this.getColor(issue.highlightColor2));
            break;
          case 0x0E:
            out += state.add("color",this.getColor(issue.highlightColor3));
            break;
          case 0x0F:
            out += state.remove("color");
            break;
        }
        switch (format.format & 0x10) // font
        {
          case 0x10:
            state.add("font","32px 'Imphobia Big'");
            out += state.add("line-height","32px");
            break;
          //case 0x00:
          //  out += state.remove("font");
          //  break;
        }
        formatCounter = format.length;
      }
      var code = str.charCodeAt(x);
      out += "&#"+IMPHOBIA_READING_UNICODETABLE[code]+";";
      xPos++;
      if (formatCounter)
      {
        formatCounter--;
        if (formatCounter==0)
        {
          out += state.close();
        }
      }
    }
    out += state.close();
    return out;
  }

  loadIRFFile(filename, container, rowCount)
  {
    return new Promise((resolve,reject)=>{
      this.loadFileFromArchive( filename ).then(data=>{
        var view = new DataView( data, 0, data.byteLength );
        
        var ptr = 0;
        var fullRowByteSize = view.getUint16(ptr, true); ptr += 2;
        var columnCount = view.getUint32(ptr, true); ptr += 4;
        var formatFieldCount = view.getUint16(ptr, true); ptr += 2;
        var columnWidths = new Uint8Array( data.slice( ptr, ptr + 36 ) ); ptr += 36;
        
        var dataStart = ptr;
        
        var lines = [];
        var longest = 0;
        for (var y=0; y<rowCount; y++)
        {
          for (var x=0; x<columnCount; x++)
          {
            var width = columnWidths[x];
            longest = Math.max(longest,width);
            lines.push( {
              start: ptr - dataStart,
              end: ptr - dataStart + width,
              data: new Uint8Array( data.slice( ptr, ptr + width ) ),
              formats: []
            } );
            ptr += width;
          }
        }
        
        for (var x=0; x<formatFieldCount; x++)
        {
          var startOffset = view.getUint16(ptr, true); ptr += 2;
          var length = view.getUint8(ptr, true); ptr++;
          var format = view.getUint8(ptr, true); ptr++;
          var lineIdx = lines.findIndex( s => s.start <= startOffset && startOffset < s.end );
          if (lineIdx != -1)
          {
            lines[lineIdx].formats.push({
              offset: startOffset - lines[lineIdx].start,
              length: length,
              format: format,
            });
          }
        }
        
        container.innerHTML = "";
        
        var out = "";
        
        var isList = container.tagName == "UL";
        var skipNext = false;
        for (var x=0; x<columnCount; x++)
        {
          for (var y=0; y<rowCount; y++)
          {
            var line = lines[ x + y * columnCount ];
            var parsed = this.parseToHTML( ArrayBufferToString( line.data ), line.formats );
            if (isList)
            {
              var li = document.createElement("li")
              li.innerHTML = parsed;
              container.insertBefore( li, null );
            }
            else
            {
              if (!skipNext)
              {
                out += parsed + "\n";
              }
              skipNext = false;
              if (line.formats.find(s=>(s.format&0x10)>0))
              {
                // if we have large font, skip next line
                skipNext = true;
              }
            }
          }
        }
  
        if (!isList)
        {
          if (longest <= 40)
          {
            article.className = "columns";
          }
          else
          {
            article.className = "";
          }
                
          container.innerHTML = out;
          container.scrollTo(0,0);      
        }
        
        resolve();        
      });  
    });  
  }
  loadArticle(articlename)
  {
    this.switchMode("article");

    var article = document.querySelector("#article");

    const articleRowCount = 15;
    
    this.loadIRFFile(articlename,article, articleRowCount);
  }

  loadTopic(topicname)
  {
    this.switchMode("topic");

    var menu = document.querySelector("#menu-topic");

    const tocRowCount = 12;

    this.loadIRFFile(topicname, menu, tocRowCount).then(()=>{

      var toc = this.toc[ topicname.toLowerCase() ];
      
      if (toc)
      {
        var items = menu.querySelectorAll("li");
        items.forEach(((li,idx)=>{
          if (!toc[idx] || !toc[idx].name)
          {
            return;
          }
          li.setAttribute("data-idx",toc[idx].name);
          
          li.onclick = (function(e)
          {
            var articlepath = li.getAttribute("data-idx");
    
            this.pushNavigationState({"edition":this.getEditionID(),"article":articlepath})
    
            this.loadArticle(articlepath);
            e.stopPropagation();
          }).bind(this)
    
        }).bind(this));
      }

    });
    
  }

  loadMenu(first)
  {
    this.switchMode("mainmenu");
    
    var menu = document.querySelector("#menu-main");
    menu.innerHTML = "";
    
    var span = null;
    
    span = document.createElement("div");
    span.onclick = ((e)=>{ this.pushNavigationState({"edition":this.getEditionID(),"article":"EDITO.IRF"}); this.loadArticle("EDITO.IRF"); e.stopPropagation(); }).bind(this);
    menu.insertBefore(span,null);
    
    span = document.createElement("div");
    span.onclick = ((e)=>{ this.pushNavigationState({"edition":this.getEditionID(),"topic":"CHARTS.IRF"}); this.loadTopic("CHARTS.IRF"); e.stopPropagation(); }).bind(this);
    menu.insertBefore(span,null);
    
    span = document.createElement("div");
    span.onclick = ((e)=>{ this.pushNavigationState({"edition":this.getEditionID(),"topic":"ART.IRF"}); this.loadTopic("ART.IRF"); e.stopPropagation(); }).bind(this);
    menu.insertBefore(span,null);
    
    span = document.createElement("div");
    span.onclick = ((e)=>{ this.pushNavigationState({"edition":this.getEditionID(),"topic":"INT.IRF"}); this.loadTopic("INT.IRF"); e.stopPropagation(); }).bind(this);
    menu.insertBefore(span,null);
    
    span = document.createElement("div");
    span.onclick = ((e)=>{ this.pushNavigationState({"edition":this.getEditionID(),"article":"CREDITS.IRF"}); this.loadArticle("CREDITS.IRF"); e.stopPropagation(); }).bind(this);
    menu.insertBefore(span,null);
    
  }

  addBackgroundTile(blobUrl,x,y)
  {
    this.backgroundRules.push( "url("+blobUrl+") "+x+"px "+y+"px no-repeat" );
    var rules = [...this.backgroundRules];
    rules[rules.length-1] = this.getColor(0) + " " + rules[rules.length-1];
    changeStylesheetRule(this.container,"background",rules.join(", "));
  }
  
  loadConfig()
  {
    return new Promise((resolve,reject)=>{
      clearStylesheetRules();
      
      this.backgroundRules = [];
      
      this.loadFileFromArchive("SELECT.PAL").then(data=>{
        var data = new Uint8Array(data);
        
        this.palette = {};
        for(var i=0; i<256; i++)
        {
          this.palette[i] = {
            r: data[i*3+0] * 4,
            g: data[i*3+1] * 4,
            b: data[i*3+2] * 4,
          };
        }
        
        //changeStylesheetRule(this.container,"color",this.getColor(47));
        var issue = this.getCurrentIssueInfo();
        changeStylesheetRule(this.container,"color",this.getColor(issue.mainColorIdx));
        
        //this.backgroundRules.push(this.getColor(0));       

        this.loadFileFromArchive("DECORS1.SPR").then(data=>{
          var spr = new ImphobiaSPR(this.palette);
          spr.load(data);
          
          spr.elements[0].renderCanvas(0,blobUrl=>{
            this.addBackgroundTile(blobUrl,0,0);
          });
        });

        this.loadFileFromArchive("DECORS2.SPR").then(data=>{
          var spr = new ImphobiaSPR(this.palette);
          spr.load(data);

          spr.elements[0].renderCanvas(0x10,blobUrl=>{
            changeStylesheetRule("#menu-main","background","url("+blobUrl+")");
            changeStylesheetRule("#menu-main","width",spr.elements[0].width+"px");
            changeStylesheetRule("#menu-main","height",spr.elements[0].height+"px");
          });
          
          spr.elements[1].renderCanvas(0,blobUrl=>{
            this.addBackgroundTile(blobUrl,0,480-54);
          });
        });

        this.loadFileFromArchive("BACK.SPR").then(data=>{
          var spr = new ImphobiaSPR(this.palette);
          spr.load(data);
          
          spr.elements[0].renderCanvas(0x10,blobUrl=>{
            this.addBackgroundTile(blobUrl,0,150);
            this.addBackgroundTile(blobUrl,320,150);
          });
        });
      });
      
      this.trackIdx = 0;
      this.playMusicTrack(this.trackIdx);
      
      resolve();
    });
  }

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
      else if (stateObj.topic)
      {
        this.loadIssue(stateObj.edition)
          .then( (function(){ this.loadTopic(stateObj.topic); }).bind(this) )
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

  playMusicTrack(idx)
  {
    var musicFile = this.getCurrentIssueInfo().music[idx];
    this.playMusic(musicFile);
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
  getMagDisplayName() { return "Imphobia"; }

  // return the file extension for the datafiles
  getExtension() { return ".EXE"; }

  // return an array of objects that define the issues of the magazine
  // the object must contain at least an "url" and a "name" field
  getIssues()
  {
    return IMPHOBIA_ISSUES;
  }

  // return the HTML required by the mag; this will be placed within the resizing container
  generateHTML()
  {
    return "<div id='menu-main'></div><ul id='menu-topic'></ul><div id='article'></div><div id='article-title'></div><div id='article-image'></div>";
  }

  // return an object where keys represent css selectors, and the values represent which mode they should be visible in
  getModes()
  {
    var obj =
    {
      "#menu-main": "mainmenu",
      "#menu-topic": "topic",
      "#article": "article",
      "#article-image": "article-image",
    };
    return obj;
  }

  // load a file from the specified identifier; id can be either a filename / url or just a number; returns a Promise
  loadFileFromArchive( id )
  {
    return new Promise( ( (resolve, reject) => {
      var file = this.entries.find( s=>s.name.toLowerCase() == id.toLowerCase() );
      if (file)
      {
        resolve( this.data.slice( file.offset, file.offset + file.length ) );
      }
      else
      {
        reject( "FILE NOT FOUND: " + id );
      }
    } ).bind(this) );
  }
  
  // load a specific issue of the mag from the
  // calls `finishedCallback` with no parameter when finished
  loadMagIssueData( array_buffer )
  {
    return new Promise( (function(resolve, reject){

      var view = new DataView(array_buffer, 0, array_buffer.byteLength);
      try
      {
        this.files = {};
        
        var view = new DataView(array_buffer, 0, array_buffer.byteLength);
        if ( view.getUint32( 0x1E, true ) == PKLite.PKLI )
        {
          var pklite = new PKLiteEXE();
          array_buffer = pklite.decompress( array_buffer ).buffer;
          view = new DataView(array_buffer, 0, array_buffer.byteLength);
        }
        
        var issue = this.getCurrentIssueInfo();
        
        var ptr = issue.arcOfs;
        this.entries = [];
        for(var i=0; i<issue.arcCount; i++)
        {
          var entry = {};
          entry.name = ArrayBufferToString(array_buffer.slice(ptr,ptr+13)).replace(/\0+/g,"");
          ptr += 13;
          entry.offset = view.getUint32(ptr,true); ptr+=4;
          if (issue.arcLenSize == 2)
          {
            entry.length = view.getUint16(ptr,true); ptr+=2;
          }
          else if (issue.arcLenSize == 4)
          {
            entry.length = view.getUint32(ptr,true); ptr+=4;
          }
          this.entries.push(entry);
        }

        this.toc = {};
        Object.entries(issue.toc).forEach(kvp=>{
          var name = kvp[0];
          var ptr = kvp[1].offset;
          this.toc[name] = [];
          for(var i=0; i<kvp[1].count; i++)
          {
            var entry = {};
            entry.name = ArrayBufferToString(array_buffer.slice(ptr,ptr+12)).replace(/[\0\s]+/g,"");
            ptr += 13;
            entry.type = view.getUint8(ptr++);
            this.toc[name].push(entry);
          }
        });

        this.loadFile(issue.datafile).then( ( function(array_buffer2){
          this.data = array_buffer2;
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

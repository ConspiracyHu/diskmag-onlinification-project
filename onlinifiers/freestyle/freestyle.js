UNICODETABLE = [
     0, 9786, 9787, 9829, 9830, 9827, 9824, 8226, 9688, 9675, 9689, 9794, 9792, 9834, 9835, 9788, 
  9658, 9668, 8597, 8252,  182,  167, 9644, 8616, 8593, 8595, 8594, 8592, 8735, 8596, 9650, 9660, 
    32,   33,   34,   35,   36,   37,   38,   39,   40,   41,   42,   43,   44,   45,   46,   47, 
    48,   49,   50,   51,   52,   53,   54,   55,   56,   57,   58,   59,   60,   61,   62,   63, 
    64,   65,   66,   67,   68,   69,   70,   71,   72,   73,   74,   75,   76,   77,   78,   79, 
    80,   81,   82,   83,   84,   85,   86,   87,   88,   89,   90,   91,   92,   93,   94,   95, 
    96,   97,   98,   99,  100,  101,  102,  103,  104,  105,  106,  107,  108,  109,  110,  111, 
   112,  113,  114,  115,  116,  117,  118,  119,  120,  121,  122,  123,  124,  125,  126, 8962, 
   199,  252,  233,  226,  228,  224,  229,  231,  234,  235,  232,  239,  205,  205,  196,  193, 
   201,  230,  198,  337,  246,  211,  369,  218,  368,  214,  220,  162,  163,  165, 8359,  402, 
   225,  237,  243,  250,  241,  209,  170,  336,  191, 8976,  172,  189,  188,  161,  171,  187, 
  9617, 9618, 9619, 9474, 9508, 9569, 9570, 9558, 9557, 9571, 9553, 9559, 9565, 9564, 9563, 9488, 
  9492, 9524, 9516, 9500, 9472, 9532, 9566, 9567, 9562, 9556, 9577, 9574, 9568, 9552, 9580, 9575, 
  9576, 9572, 9573, 9561, 9560, 9554, 9555, 9579, 9578, 9496, 9484, 9608, 9604, 9612, 9616, 9600, 
   945,  223,  915,  960,  931,  963,  181,  964,  934,  920,  937,  948, 8734,  966,  949, 8745, 
  8801,  177, 8805, 8804, 8992, 8993,  247, 8776,  176, 8729,  183, 8730, 8319,  178, 9632,   32,
];

var FSTOC_BACKGROUND = 0;
var FSTOC_PALETTE    = 1;
var FSTOC_TAB        = 2;
var FSTOC_FONT       = 3;
var FSTOC_TOC        = 4;
var FSTOC_TITLE      = 5;

class Freestyle extends MagInterface
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
    var state = new State();
    for(var x=0; x<str.length; x++)
    {
      switch (str[x])
      {
        case "\x09": // tab
          var c = 8-((xPos+8)%8);
          for (var i=0; i<c; i++)
          {
            out += "&nbsp;";
            xPos ++;
          }
          break;
        case "`":
          x++;
          switch(str[x])
          {
            case "c":
              {
                x++;
                switch(str[x])
                {
                  case "h":
                    out += state.add("color",this.getColor(254));
                    break;
                  case "n":
                    out += state.remove("color");
                    break;
                }
              }
              break;
            case "u":
              out += state.toggle("text-decoration","underline");
              break;
          }
          break;
        default:
          out += "&#"+UNICODETABLE[str.charCodeAt(x)]+";";
          xPos++;
          break;
      }
    }
    out += state.close();
    return out;
  }

  loadArticle(articleidx)
  {
    if (articleidx >= 500)
    {
      this.switchMode("article-image");
      
      var article = document.querySelector("#article-image");
      article.innerHTML = "";
  
      this.loadFileFromArchive( articleidx - 500 ).then((data)=>{
        article.innerHTML = "<img src='"+URL.createObjectURL(new Blob([data]))+"'/>";  
      });
    }
    else
    {
      this.switchMode("article");
    
      var article = document.querySelector("#article");
  
      article.innerHTML = "";
      this.loadASCIIStringFromArchive( articleidx ).then((str)=>{
        var articleStr = str.split("\r\n");
        articleStr.forEach((i,idx)=>{
          var parsed = this.parseToHTML(i,idx);
          article.innerHTML += parsed + "\n";
        });
        article.scrollTo(0,0);
      });
    }
  }

  loadImage(index)
  {
    return new Promise((resolve,reject)=>{
      this.loadFileFromArchive( index ).then((data)=>{
        
        var view = new DataView(data, 0, data.byteLength);
    
        // create off-screen canvas element
        var canvas = document.createElement('canvas'),
            ctx = canvas.getContext('2d');
        
        canvas.width = 640;
        canvas.height = 480;
    
        var ofs = 0;
        var i = 0;
        var buffer = new Uint8ClampedArray(canvas.width * canvas.height * 4);
    
        for(var y = 0; y < canvas.height; y++) 
        {
          for(var x = 0; x < canvas.width; x++) 
          {
            var idx = view.getUint8(ofs++);
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
          resolve(URL.createObjectURL(new Blob([blob])));
        });
      });
    });
  }

  loadMenu(first)
  {
    this.switchMode("mainmenu");
  
    this.loadASCIIStringFromArchive( FSTOC_TOC ).then((str)=>{
      var menu = document.querySelector("#menu-main");
      menu.innerHTML = "";
  
      var toc = str.split("\r\n");
      
      toc.forEach( (function(i){
        var li = document.createElement("li")
  
        var title = i.slice(0,40);
        var idx = 0;
        if (i.length>40)
        {
          idx = parseInt(i.slice(40,44));
        }
        li.innerHTML = title.length ? this.parseToHTML(title) : "&nbsp;";
        menu.insertBefore( li, null );
        if (idx != 0 && title.length)
        {
          li.setAttribute("data-idx",idx);
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
      this.loadFileFromArchive( FSTOC_PALETTE ).then((data)=>{
        var u8 = new Uint8Array(data);
        
        this.palette = {}
        var ofs = 0;
        for (var i=0; i<256; i++)
        {
          this.palette[i] = {};
          this.palette[i].r = u8[ofs++] * 4;
          this.palette[i].g = u8[ofs++] * 4;
          this.palette[i].b = u8[ofs++] * 4;
        }    
    
        changeStylesheetRule("#article","color",this.getColor(255));
        changeStylesheetRule("#menu-main","color",this.getColor(255));
    
        this.loadImage(FSTOC_BACKGROUND).then(blobUrl=>{
          changeStylesheetRule(this.container,"background","url("+blobUrl+")");
        });
        
        this.chiptune.load(this.magDataDir + this.getCurrentIssueInfo().music);
    
        resolve();
      });
    });
  }
  
  // ---------------------------------------------------------------------
  // IMPLEMENT SUPERCLASS
  // ---------------------------------------------------------------------

  // get the (human-written) name of the mag
  getMagDisplayName() { return "Freestyle"; }

  // return the file extension for the datafiles
  getExtension() { return ".EXE"; }

  // return an array of objects that define the issues of the magazine
  // the object must contain at least an "url" and a "name" field
  getIssues()
  {
    return FREESTYLE_ISSUES;
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
      var entry = this.tocEntries[id];
      resolve(this.exeData.slice(entry.offset,entry.offset+entry.length));
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
        let overlaySize = view.getUint32(array_buffer.byteLength - 8, true);
        let overlayOffset = array_buffer.byteLength - overlaySize;
        let tocSize = view.getUint32(array_buffer.byteLength - 4, true);
        let tocOffset = array_buffer.byteLength - tocSize;
        
        this.exeData = array_buffer;
        this.tocEntries = []
        do {
          var entry = {}
          
          entry.offset = view.getUint32(tocOffset, true) + overlayOffset; tocOffset += 4;
          entry.length = view.getUint32(tocOffset, true); tocOffset += 4;
          
          this.tocEntries.push(entry);
        } while ( tocOffset < array_buffer.byteLength - 8 );

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

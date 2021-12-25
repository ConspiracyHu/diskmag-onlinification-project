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

class Kendermag extends MagInterface
{
  parseToHTML(str,y)
  {
    var out = "";
    var xPos = 0;
    var state = new State();
    for(var i=0; i<str.length; i++)
    {
      switch (str[i])
      {
        case "\x03": // hilite
          out += state.toggle("color","#FCE800");
          break;
        case "\x04": // raw
          out += "&#"+UNICODETABLE[str.charCodeAt(++i)]+";";
          xPos++;
          break;
        case "\x15": // color
          {
            var color = str[++i];
            switch(color)
            {
              case "A": out += state.toggle("color","#FCFCFC"); break;
              case "B": out += state.toggle("color","#DCB800"); break;
              case "C": out += state.toggle("color","#00A8A8"); break;
              case "D": out += state.toggle("color","#00C014"); break;
              case "E": out += state.toggle("color","#00A48C"); break;
              case "F": out += state.toggle("color","#A85400"); break;
              case "G": out += state.toggle("color","#AC0800"); break;
              case "H": out += state.toggle("color","#545454"); break;
              case "I": out += state.toggle("color","#141414"); break;
              case "J": out += state.toggle("color","#54FC54"); break;
              case "K": out += state.toggle("color","#14BCBC"); break;
              case "L": out += state.toggle("color","#B84400"); break;
              case "M": out += state.toggle("color","#007C94"); break;
              case "N": out += state.toggle("color","#84ACC0"); break;
              case "O": out += state.toggle("color","#FCE800"); break;
              case "P": out += state.toggle("color","#000000"); break;
            }        
          }
          break;
        case "\xF1": // image
          {
            var x = xPos * 8;
            var imageIdx = str.charCodeAt(++i);
            this.loadImage(imageIdx-0x42,82).then(function(blobUrl){
              article.innerHTML += "<img src='"+blobUrl+"' style='position:absolute;left:"+(x)+"px;top:"+(y*16)+"px;'/>";  
            });
          }
          break;
        case "\x09": // tab
          var c = 8-((xPos+8)%8);
          for (var t=0; t<c; t++)
          {
            out += "&nbsp;";
            xPos ++;
          }
          break;
        default:
          out += "&#"+UNICODETABLE[str.charCodeAt(i)]+";";
          xPos++;
          break;
      }
    }
    return out;
  }

  loadArticle(articleidx)
  {
    switch(this.kmData.toc[articleidx].type)
    {
      case 1:
      case 4: // article with attachment
        {
          this.switchMode("article");
        
          var article = document.querySelector("#article");
        
          article.innerHTML = "";
          
          var pageCount = this.kmData.articlePageLengths[articleidx];
          var pageOffset = this.kmData.articlePageOffsets[articleidx] - 1;
          
          var issue = this.getCurrentIssueInfo();
          var offset = issue.articleOffset ? issue.articleOffset : 0; // workaround for KM#4-8 buggy TOC
          
          var str = "";
          for (var i=0; i<pageCount; i++)
          {
            var pageBytes = new Uint8Array( this.kmExe.slice(this.kmData.pageOffsets[pageOffset + i] + offset, this.kmData.pageOffsets[pageOffset + i + 1] + offset) );
            for (var j=0; j<pageBytes.length; j++)
            {
              var c = pageBytes[j] ^ 0x1e;
              if ( c == 0xf0 )
              {
                break;
              }
              str += String.fromCharCode( c );
            }
          }
        
          str.split("\r\n").forEach((i,idx)=>{
            var parsed = this.parseToHTML(i,idx);
            article.innerHTML += parsed + "\n";
          });
          
          article.scrollTo(0,0);
        }
        break;
      case 2:
      case 3:
        {
          this.switchMode("article-image");
        
          var article = document.querySelector("#article-image");
          article.innerHTML = "";
          this.loadImage(this.kmData.toc[articleidx].attachmentIdx-1,-1).then(function(blobUrl){
            article.innerHTML = "<img src='"+blobUrl+"'/>";  
          });
        }
        break;
    }
  }

  loadImage(index, transparentColor)
  {
    return new Promise((resolve,reject)=>{
      var pcxData = this.kmExe.slice(this.kmData.imageOffsets[index], this.kmData.imageOffsets[index] + this.kmData.imageLengths[index]);
      
      try
      {
        var pcx = new PCX();
        pcx.load(pcxData);
        if (transparentColor)
        {
          pcx.transparentColor = transparentColor;
        }
        pcx.renderCanvas(function(data){
          resolve(data);
        });
      }
      catch(e)
      {
        reject("Error loading PCX #"+index);
        return;
      }
    });
  }

  loadMenu(first)
  {
    this.switchMode("mainmenu");
  
    var menu = document.querySelector("#menu-main");
    menu.innerHTML = "";
    this.kmData.toc.forEach((function(i,idx){
      var li = document.createElement("li")
  
      li.innerHTML = i.title.length ? this.parseToHTML(i.title) : "&nbsp;";
      menu.insertBefore( li, null );
      if (i.type != 0)
      {
        li.setAttribute("data-idx",idx);
        li.onclick = (function(e)
        {
          var idx = li.getAttribute("data-idx");
    
          this.pushNavigationState({"edition":this.getEditionID(),"article":idx})
          
          this.loadArticle(idx);
  
          e.stopPropagation();
        }).bind(this)
      }
    }).bind(this));
  
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
      this.loadImage(0,-1).then((function(blobUrl){
        changeStylesheetRule(this.container,"background","url("+blobUrl+")");
      }).bind(this));
      this.loadImage(1,-1).then((function(blobUrl){
        changeStylesheetRule("#article-underlay","background","url("+blobUrl+")");
      }).bind(this));
      resolve();
    });
  }

  // ---------------------------------------------------------------------
  // IMPLEMENT SUPERCLASS
  // ---------------------------------------------------------------------

  // get the (human-written) name of the mag
  getMagDisplayName() { return "Kendermag"; }

  // return the file extension for the datafiles
  getExtension() { return ".EXE"; }

  // return an array of objects that define the issues of the magazine
  // the object must contain at least an "url" and a "name" field
  getIssues()
  {
    return KENDERMAG_ISSUES;
  }

  // return the HTML required by the mag; this will be placed within the resizing container
  generateHTML()
  {
    return "<div id='article-underlay'></div><ul id='menu-main'></ul><div id='article'></div><div id='article-title'></div><div id='article-image'></div>";
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
    // NOT USED IN THIS CASE, WE DONT HAVE A SOLID CONCEPT OF A TOC IN KM
    return null;
  }

  // load a specific issue of the mag from the
  // calls `finishedCallback` with no parameter when finished
  loadMagIssueData( array_buffer )
  {
    return new Promise( (function(resolve, reject){
      try
      {    
      
        var signature = ArrayBufferToString(array_buffer.slice(0,2));
        if (signature != "MZ")
        {
          reject("EXE is invalid");
          return;
        }
        
        var view = new DataView(array_buffer, 0, array_buffer.byteLength);
  
        this.kmExe = array_buffer;
        this.kmInfo = {};
        var issueInfo = this.getCurrentIssueInfo();
        if (issueInfo.extendedFooter)
        {
          this.kmInfo.articleCount = view.getUint16(array_buffer.byteLength - 12, true);
          this.kmInfo.attachmentCount = view.getUint8(array_buffer.byteLength - 10, true);
          this.kmInfo.introFliCount = view.getUint8(array_buffer.byteLength - 9, true);
          this.kmInfo.introModCount = view.getUint8(array_buffer.byteLength - 8, true);
          this.kmInfo.imageCount = view.getUint8(array_buffer.byteLength - 7, true);
          this.kmInfo.articlePageCount = view.getUint16(array_buffer.byteLength - 6, true);
        }
        else
        {
          this.kmInfo = issueInfo.info;
        }
        this.kmInfo.tocOffset = view.getUint32(array_buffer.byteLength - 4, true);
  
        this.kmData = {};
        var ofs = this.kmInfo.tocOffset;
  
        this.kmData.pageOffsets = [];
        for (var i=0; i<this.kmInfo.articlePageCount; i++)
        {
          this.kmData.pageOffsets.push( view.getUint32(ofs, true) );
          ofs += 4;
        }
  
        this.kmData.imageOffsets = [];
        for (var i=0; i<this.kmInfo.imageCount; i++)
        {
          this.kmData.imageOffsets.push( view.getUint32(ofs, true) );
          ofs += 4;
        }
        
        this.kmData.imageLengths = [];
        for (var i=0; i<this.kmInfo.imageCount; i++)
        {
          this.kmData.imageLengths.push( view.getUint32(ofs, true) );
          ofs += 4;
        }
        
        this.kmData.introFliOffsets = [];
        for (var i=0; i<this.kmInfo.introFliCount; i++)
        {
          this.kmData.introFliOffsets.push( view.getUint32(ofs, true) );
          ofs += 4;
        }
        
        this.kmData.introFliLengths = [];
        for (var i=0; i<this.kmInfo.introFliCount; i++)
        {
          this.kmData.introFliLengths.push( view.getUint32(ofs, true) );
          ofs += 4;
        }
        
        this.kmData.introModOffsets = [];
        for (var i=0; i<this.kmInfo.introFliCount; i++)
        {
          this.kmData.introModOffsets.push( view.getUint32(ofs, true) );
          ofs += 4;
        }
        
        this.kmData.introModLengths = [];
        for (var i=0; i<this.kmInfo.introFliCount; i++)
        {
          this.kmData.introModLengths.push( view.getUint32(ofs, true) );
          ofs += 4;
        }
        
        this.kmData.attachmentOffsets = [];
        for (var i=0; i<this.kmInfo.attachmentCount; i++)
        {
          this.kmData.attachmentOffsets.push( view.getUint32(ofs, true) );
          ofs += 4;
        }
        
        this.kmData.attachmentLengths = [];
        for (var i=0; i<this.kmInfo.attachmentCount; i++)
        {
          this.kmData.attachmentLengths.push( view.getUint32(ofs, true) );
          ofs += 4;
        }
        
        this.kmData.articlePageOffsets = [];
        for (var i=0; i<this.kmInfo.articleCount; i++)
        {
          this.kmData.articlePageOffsets.push( view.getUint16(ofs, true) );
          ofs += 2;
        }
        
        this.kmData.unknownData1 = [];
        for (var i=0; i<this.kmInfo.imageCount; i++)
        {
          this.kmData.unknownData1.push( view.getUint16(ofs, true) );
          ofs += 2;
        }
        
        this.kmData.unknownData2 = [];
        for (var i=0; i<this.kmInfo.imageCount; i++)
        {
          this.kmData.unknownData2.push( view.getUint16(ofs, true) );
          ofs += 2;
        }
        
        this.kmData.articlePageLengths = [];
        for (var i=0; i<this.kmInfo.articleCount; i++)
        {
          this.kmData.articlePageLengths.push( view.getUint8(ofs, true) );
          ofs += 1;
        }
        
        this.kmData.toc = [];
        for (var i=0; i<this.kmInfo.articleCount; i++)
        {
          var entry = {};
          entry.type = view.getUint8(ofs, true); ofs++;
          entry.attachmentIdx = view.getUint8(ofs, true); ofs++;
          entry.title = ArrayBufferToString(array_buffer.slice(ofs,ofs+35)).replace(/\s+$/,""); ofs+=35;
          this.kmData.toc.push(entry);
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

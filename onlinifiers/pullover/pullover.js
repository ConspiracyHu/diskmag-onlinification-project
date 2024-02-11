UNICODETABLE = [
    32, 9786, 9787, 9829, 9830, 9827, 9824, 8226, 9688, 9675, 9689, 9794, 9792, 9834, 9835, 9788, 
  9658, 9668, 8597, 8252,  182,  167, 9644, 8616, 8593, 8595, 8594, 8592, 8735, 8596, 9650, 9660, 
    32,   33,   34,   35,   36,   37,   38,   39,   40,   41,   42,   43,   44,   45,   46,   47, 
    48,   49,   50,   51,   52,   53,   54,   55,   56,   57,   58,   59,   60,   61,   62,   63, 
    64,   65,   66,   67,   68,   69,   70,   71,   72,   73,   74,   75,   76,   77,   78,   79, 
    80,   81,   82,   83,   84,   85,   86,   87,   88,   89,   90,   91,   92,   93,   94,   95, 
    96,   97,   98,   99,  100,  101,  102,  103,  104,  105,  106,  107,  108,  109,  110,  111, 
   112,  113,  114,  115,  116,  117,  118,  119,  120,  121,  122,  123,  124,  125,  126, 8962, 
   199,  252,  233,  226,  228,  224,  229,  231,  234,  235,  336,  337,  238,  205,  196,  193, 
   201,  230,  198,  337,  246,  211,  369,  218,  368,  214,  220,  162,  163,  165, 8359,  402, 
   225,  237,  243,  250,  241,  209,  170,  186,  191, 8976,  172,  189,  188,  161,  171,  187, 
  9617, 9618, 9619, 9474, 9508, 9569, 9570, 9558, 9557, 9571, 9553, 9559, 9565, 9564, 9563, 9488, 
  9492, 9524, 9516, 9500, 9472, 9532, 9566, 9567, 9562, 9556, 9577, 9574, 9568, 9552, 9580, 9575, 
  9576, 9572, 9573, 9561, 9560, 9554, 9555, 9579, 9578, 9496, 9484, 9608, 9604, 9612, 9616, 9600, 
   945,  223,  915,  960,  931,  963,  181,  964,  934,  920,  937,  948, 8734,  966,  949, 8745, 
  8801,  177, 8805, 8804, 8992, 8993,  247, 8776,  176, 8729,  183, 8730, 8319,  178, 9632,   32,
];

class Pullover extends MagInterface
{
  parseToHTML(str)
  {
    var out = "";
    for(var x=0; x<str.length; x++)
    {
      out += "&#"+UNICODETABLE[str.charCodeAt(x)]+";";
    }
    return out;
  }
  loadArticle(articleidx)
  {
    this.switchMode("article");
  
    var entry = this.toc[articleidx];
    if (entry.textIdx == 99)
    {
      this.switchMode("article-image");
    
      var issue = this.getCurrentIssueInfo();
      
      var article = document.querySelector("#article-image");
      article.innerHTML = "";
      this.loadImage(issue.images[entry.imageIdx]).then(blobURL=>{
        article.innerHTML = "<img src='"+blobURL+"'/>";  
      });
    }
    else
    {
      var article = document.querySelector("#article");
      
      article.innerHTML = "";
      article.setAttribute("data-bg",entry.imageIdx);
    
      var ofs = this.tocOfs[entry.textIdx];
      var articleStr = "";
      for(var i=ofs; this.articleFile[i] != 0xF5; i++)
      {
        articleStr += String.fromCharCode(this.articleFile[i]);
      }
        
      articleStr.split("\r\n").forEach((i,idx)=>{
        var parsed = this.parseToHTML(i,idx);
        article.innerHTML += parsed + "\n";
      });
    
      article.scrollTo(0,0);
    }
  }
  loadMenu(first)
  {
    this.switchMode("mainmenu");
  
    var menu = document.querySelector("#menu-main");
    menu.innerHTML = "";
    
    this.toc.forEach((function(i,idx){
      var li = document.createElement("li")
      
      li.innerHTML = this.parseToHTML(i.title);
      menu.insertBefore( li, null );
      {
        li.setAttribute("data-link",i.textIdx);
        li.onclick = (function(e)
        {
          var link = li.getAttribute("data-link");
          
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

  loadImage(url)
  {
    return new Promise((resolve,reject)=>{
      var issue = this.getCurrentIssueInfo();
      url = url.replace("PIX/",issue.pixDir);
      this.loadFile(url).then(data=>{
        var lbm = new LBM();
        lbm.load(data);
  
        lbm.renderCanvas(blobURL=>{
          resolve(blobURL)
        })
      })
    });
  }

  loadConfig()
  {
    return new Promise((resolve,reject)=>{
      var issue = this.getCurrentIssueInfo();
      this.loadImage(issue.mainBackground).then(blobUrl=>{
        changeStylesheetRule(this.container,"background","url("+blobUrl+")");
        resolve();
      });
      this.playMusic(this.getCurrentIssueInfo().music);
      
      issue.backgrounds.forEach((fn,idx)=>{
        this.loadImage(fn).then(blobUrl=>{
          changeStylesheetRule("#article[data-bg=\""+idx+"\"]","background","url("+blobUrl+")");
        });
      });
    });
  }

  // ---------------------------------------------------------------------
  // IMPLEMENT SUPERCLASS
  // ---------------------------------------------------------------------

  // get the (human-written) name of the mag
  getMagDisplayName() { return "Pullover"; }

  // return the file extension for the datafiles
  getExtension() { return ".EXE"; }

  // return an array of objects that define the issues of the magazine
  // the object must contain at least an "url" and a "name" field
  getIssues()
  {
    return PULLOVER_ISSUES;
  }

  // return the HTML required by the mag; this will be placed within the resizing container
  generateHTML()
  {
    return "<ul id='menu-main'></ul><div id='article'></div><div id='article-image'></div>";
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
    // don't use
    return null;
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

      var exe = new DOS32Unpack();
      var unpacked = exe.unpack(array_buffer);
      
      var issue = this.getCurrentIssueInfo();
      var ofs = issue.exeDataOfs + 255 * 16 * 2; // fonts
      
      var tocData = unpacked.slice( ofs, unpacked.length );
      this.view = new DataView(tocData, 0, tocData.byteLength);

      var ptr = 0;
      var maxIdx = 0;
      this.toc = [];
      for( var i = 0; i<issue.articleCount; i++)
      {
        var entry = {};
        entry.imageIdx = this.view.getUint8(ptr++);
        entry.textIdx = this.view.getUint8(ptr++);
        if (entry.textIdx < 99 && maxIdx < entry.textIdx) maxIdx = entry.textIdx;
        entry.title = String.fromCharCode.apply(null, new Uint8Array(tocData.slice(ptr,ptr+37)));
        ptr+=38; // +0x0D
        this.toc.push(entry);
      }

      ptr += 14 * 16;
      this.tocOfs = [];
      for( var i = 0; i<=maxIdx; i++)
      {
        this.tocOfs.push( this.view.getUint32(ptr,true) );
        ptr += 4;
      }
      
      this.loadFile( issue.articleFile ).then((data)=>{
        this.articleFile = new Uint8Array(data);
        for (var x=0; x < this.articleFile.byteLength; x++)
        {
          this.articleFile[x] = this.articleFile[x] ^ 0x50;
        }
        
        this.loadConfig()
          .then(resolve,reject);
      })
    }).bind(this) );
  }
};
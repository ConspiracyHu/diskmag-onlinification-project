UNICODETABLE = [
  32, 9786, 9787, 9829, 9830, 9827, 9824, 8226, 9688, 9675, 9689, 9794, 9792, 9834, 9835, 9788,
9658, 9668, 8597, 8252,  182,  167, 9644, 8616, 8593, 8595, 8594, 8592, 8735, 8596, 9650, 9660,
  32,   33,   34,   35,   36,   37,   38,   39,   40,   41,   42,   43,   44,   45,   46,   47,
  48,   49,   50,   51,   52,   53,   54,   55,   56,   57,   58,   59,   60,   61,   62,   63,
  64,   65,   66,   67,   68,   69,   70,   71,   72,   73,   74,   75,   76,   77,   78,   79,
  80,   81,   82,   83,   84,   85,   86,   87,   88,   89,   90,   91,   92,   93,   94,   95,
  96,   97,   98,   99,  100,  101,  102,  103,  104,  105,  106,  107,  108,  109,  110,  111,
 112,  113,  114,  115,  116,  117,  118,  119,  120,  121,  122,  123,  124,  125,  126, 8962,
 199,  252,  233,  226,  228,  224,  229,  231,  234,  235,  336,  337,  206,  205,  196,  193,
 201,  230,  198,  337,  246,  242,  369,  249,  255,  214,  220,  162,  163,  165, 8359,  402,
 225,  237,  243,  250,  241,  209,  170,  336,  191, 8976,  172,  189,  188,  161,  171,  187,
9617, 9618, 9619, 9474, 9508, 9569, 9570, 9558, 9557, 9571, 9553, 9559, 9565, 9564, 9563, 9488,
9492, 9524, 9516, 9500, 9472, 9532, 9566, 9567, 9562, 9556, 9577, 9574, 9568, 9552, 9580, 9575,
9576, 9572, 9573, 9561, 9560, 9554, 9555, 9579, 9578, 9496, 9484, 9608, 9604, 9612, 9616, 9600,
 211,  223,  915,  960,  931,  963,  181,  964,  934,  218,  937,  368, 8734,  966,  949, 8745,
8801,  177, 8805, 8804, 8992, 8993,  247, 8776,  176, 8729,  183,  369, 8319,  178, 9632,   32,
];

class TNRawFullscreenImage
{
  static SIZE = (640 * 480) + (256 * 3); // W*H + palette
  constructor()
  {
    this.width = 640;
    this.height = 480;
    this.pixelData = null;
    this.palette = {};
  }

  load(array_buffer)
  {
    var view = new DataView(array_buffer, 0, array_buffer.length);
    
    for(var i=0; i<256; i++)
    {
      this.palette[i] = 
      {
        r: view.getUint8( i * 3 + 0 ) * 4,
        g: view.getUint8( i * 3 + 1 ) * 4,
        b: view.getUint8( i * 3 + 2 ) * 4
      };
    }
    
    this.pixelData = new Uint8Array( array_buffer.slice(768, array_buffer.byteLength) );
  }
  
  renderCanvas(cb)
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
        var idx = this.pixelData[ofs++];
        if (idx == this.transparentColor)
        {
          buffer[i++] = 0;
          buffer[i++] = 0;
          buffer[i++] = 0;
          buffer[i++] = 0;
        }
        else
        {
          buffer[i++] = this.palette[idx].r;
          buffer[i++] = this.palette[idx].g;
          buffer[i++] = this.palette[idx].b;
          buffer[i++] = 255;
        }
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

class TerrorNews extends MagInterface
{
  getColor(color)
  {
    return "#"
    +toHex(this.palette[color].r)
    +toHex(this.palette[color].g)
    +toHex(this.palette[color].b);
  }

  parseToHTML(str,_x,_y,parent)
  {
    var out = "";
    var xPos = 0;
    for(var i=0; i<str.length; i++)
    {
      switch (str[i])
      {
        case "\x1A": // end article
          return out;
        case "\xAB": // change colour
          out += this.state.add("color",this.getColor(73));
          break;
        case "\xAC": // change colour
          out += this.state.remove("color");
          break;
        case "\xAD": // change colour
          out += this.state.add("color",this.getColor(83));
          break;
        case "\xFD": // image
          {
            var nextSpace = str.indexOf(" ",i);
            var imageName = nextSpace == -1 ? str.slice(i+1) : str.slice(i+1, nextSpace);
            (function() {
              var x = _x + xPos * 8;
              var y = _y * 15;

              this.loadCELImage( imageName, 0 ).then(blobUrl=>{
                var img = document.createElement("img");
                img.src = blobUrl;
                img.setAttribute("style","position:absolute;pointer-events:none;left:"+x+"px;top:"+y+"px;");
                parent.insertBefore(img,null);
              });
            }).bind(this)();
            i += imageName.length;
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
    var issue = this.getCurrentIssueInfo();
    var articleOfs = this.articleOfs[ articleidx ];
    this.loadInternalFile("TNCIKK.UCZ",articleOfs).then(unpackedData=>{
      if ( (unpackedData[0] == 0x0A && 0 <= unpackedData[1] && unpackedData[1] <= 5) || unpackedData.byteLength == TNRawFullscreenImage.SIZE )
      {
        this.switchMode("article-image");

        var article = document.querySelector("#article-image");
        article.innerHTML = "";

        try
        {
          var image = unpackedData.byteLength == TNRawFullscreenImage.SIZE ? new TNRawFullscreenImage() : new PCX();
          image.load(unpackedData.buffer);
          //if (transparentColor)
          //{
          //  pcx.transparentColor = transparentColor;
          //}
          image.renderCanvas(function(blobUrl){
            article.innerHTML = "<img src='"+blobUrl+"'/>";
          });
        }
        catch(e)
        {
          console.log("Error loading PCX #"+articleidx+": "+e);
        }
      }
      else
      {
        this.switchMode("article");

        var article = document.querySelector("#article");

        article.innerHTML = "";

        var str = ArrayBufferToString(unpackedData.buffer);

        var out = "";
        this.state = new State();
        str.split("\r\n").forEach((i,idx)=>{
          var parsed = this.parseToHTML(i,0,idx,article);
          out += parsed + "\n";
        });
        article.innerHTML = out;

        article.scrollTo(0,0);
      }
    });
  }

  loadCELImage(index, transparentColor)
  {
    return new Promise((resolve,reject)=>{
      this.loadInternalFile("CELS.UCZ",this.inlineImages[index]).then(unpackedData=>{
        var view = new DataView( unpackedData.buffer, 0, unpackedData.buffer.byteLength );

        var sig = view.getUint16( 0, true );
        var ofs = sig == 0x9119 ? 2 : 0;
        var width = view.getUint16( ofs, true );
        var height = view.getUint16( ofs + 2, true );

        // create off-screen canvas element
        var canvas = document.createElement('canvas'),
            ctx = canvas.getContext('2d');

        canvas.width = width;
        canvas.height = height;

        var palette = {};
        if (sig == 0x9119)
        {
          for(var i = 0; i < 256; i++)
          {
            palette[i] = {
              r: view.getUint8( 0x20 + i * 3 + 0 ) * 4,
              g: view.getUint8( 0x20 + i * 3 + 1 ) * 4,
              b: view.getUint8( 0x20 + i * 3 + 2 ) * 4,
            };
          }
        }
        else
        {
          palette = this.palette;
        }

        var i = 0;
        var ofs = sig == 0x9119 ? 0x320 : 4;
        var buffer = new Uint8ClampedArray(canvas.width * canvas.height * 4);
        for(var y = 0; y < canvas.height; y++)
        {
          for(var x = 0; x < canvas.width; x++)
          {
            var idx = view.getUint8(ofs++);
            if (idx == transparentColor)
            {
              buffer[i++] = 0;
              buffer[i++] = 0;
              buffer[i++] = 0;
              buffer[i++] = 0;
            }
            else
            {
              buffer[i++] = palette[idx].r;
              buffer[i++] = palette[idx].g;
              buffer[i++] = palette[idx].b;
              buffer[i++] = 255;
            }
          }
        }

        // create imageData object
        var idata = ctx.createImageData(canvas.width, canvas.height);

        // set our buffer as source
        idata.data.set(buffer);

        // update canvas with new data
        ctx.putImageData(idata, 0, 0);

        canvas.toBlob((blob)=>{
          resolve( URL.createObjectURL( new Blob([blob]) ) );
        });
      }).catch(reject);
    });
  }

  loadMenu(first)
  {
    this.switchMode("mainmenu");

    var menu = document.querySelector("#menu-main");
    menu.innerHTML = "";
    var menuContainer = document.querySelector("#menu-container");
    menuContainer.querySelectorAll("img").forEach(e=>e.remove());

    var issue = this.getCurrentIssueInfo();
    this.state = new State();
    var linesPerMenu = 20;
    this.loadInternalFile("TNLST.UCM").then(unpackedData=>{
      console.log(unpackedData.byteLength / 32);
      for(var i=0; i<issue.visibleArticleCount; i++)
      {
        (function(){
          var li = document.createElement("li")

          var articleTitleLength = 31;
          var articleMeta = 2;
          var articleIsValid = false;
          switch(issue.format)
          {
            case 10:
              articleTitleLength = 31;
              articleMeta = 2;
              articleIsValid = this.articleOfs[ i ] != 0; // article is valid if the offset is nonzero (there's a 2-byte "TN" header that makes the first article valid)
              break;
            case 20:
              articleTitleLength = 31;
              articleMeta = 1;
              articleIsValid = unpackedData[ i * (articleTitleLength + articleMeta) + articleTitleLength ] != 0; // article is valid if meta byte is nonzero
              break;
          }
                 
          var articleRecordLength = articleTitleLength + articleMeta;
          var title = ArrayBufferToString( unpackedData.slice( i*articleRecordLength, i*articleRecordLength+articleTitleLength ) );

          li.innerHTML = this.parseToHTML(title, Math.floor(i / linesPerMenu) * 315, i % linesPerMenu, menuContainer);
          menu.insertBefore( li, null );
          if (articleIsValid)
          {
            li.setAttribute("data-idx",i);
            li.onclick = (function(e)
            {
              var idx = li.getAttribute("data-idx");

              this.pushNavigationState({"edition":this.getEditionID(),"article":idx})

              this.loadArticle(idx);

              e.stopPropagation();
            }).bind(this);
          }
        }).bind(this)();
      };
    });

    if (first)
    {
      setTimeout(function(){
        var menu = document.querySelector("#menu-main");
        menu.scrollTo(0,0);
      }, 10);
    }
  }

  loadConfig()
  {
    return new Promise((resolve,reject)=>{

      var issue = this.getCurrentIssueInfo();

      this.loadInternalFile("TAB.UCM").then(data=>{
        var view = new DataView(data.buffer, 0, data.buffer.byteLength);

        this.articleOfs = [];
        for(var i=0; i < data.buffer.byteLength / 4; i++)
        {
          var ofs = view.getUint32( i * 4, true );
          this.articleOfs.push(ofs);
        }

        this.loadInternalFile("CELTAB.UCM").then(data=>{
          var view = new DataView(data.buffer, 0, data.buffer.byteLength);

          this.inlineImages = {}
          var ptr = 0;
          switch(issue.format)
          {
            case 10:
              for(var i=0; i < data.buffer.byteLength / 16; i++)
              {
                var name = ArrayBufferToString( data.buffer.slice(ptr,ptr+12) ).replace(/[\s\0]+/g,"");
                this.inlineImages[name] = view.getUint32(ptr+12,true);
                ptr += 16;
              }
              break;
            case 20:
              for(var i=0; i < data.buffer.byteLength / 12; i++)
              {
                var name = ArrayBufferToString( data.buffer.slice(ptr,ptr+8) ).replace(/[\s\0]+/g,"");
                this.inlineImages[name+".CEL"] = view.getUint32(ptr+8,true);
                ptr += 12;
              }
              break;            
          }

          this.loadInternalFile("MENU.UCM").then(data=>{
            try
            {
              var image = data.byteLength == TNRawFullscreenImage.SIZE ?  new TNRawFullscreenImage() : new PCX();
              image.load(data.buffer);
              this.palette = image.palette;
              changeStylesheetRule("#article,#menu-main","color",this.getColor(4));
              changeStylesheetRule("#menu-main li","text-shadow","2px 2px 0px " + this.getColor(7));

              image.renderCanvas(blobUrl=>{
                changeStylesheetRule(this.container,"background","url("+blobUrl+")");
              });
            }
            catch(e)
            {
              reject("Error loading interface PCX: " + e);
              return;
            }
          });

          resolve();

        });
      });
    });
  }

  loadInternalFile(filename, offset)
  {
    return new Promise((resolve,reject)=>{
      var file = this.files[filename.toUpperCase()];
      var ofs = offset ?? 0;
      if (!file)
      {
        reject("FILE '"+filename+"' NOT FOUND");
        return;
      }

      var data = null;
      switch(file.source)
      {
        case "overlay":
          data = this.fullFile.slice(file.offset + ofs, this.fullFile.byteLength);
          break;
        case "exe":
          data = this.exeUnpData.slice(file.offset + ofs, this.exeUnpData.byteLength);
          break;
      }

      var unpacked = null;
      switch(file.packer)
      {
        case "PKWARE":
          unpacked = new PKWAREDCL().decompress(data);
          break;
        case "DEFLATE":
          unpacked = JSZip.compressions.DEFLATE.uncompress(new Uint8Array(data));
          break;
        default:
          unpacked = data;
          if (file.size)
          {
            unpacked = unpacked.slice(0, file.size);
          }
          break;
      }
      resolve(unpacked);
    });
  }

  // ---------------------------------------------------------------------
  // IMPLEMENT SUPERCLASS
  // ---------------------------------------------------------------------

  // get the (human-written) name of the mag
  getMagDisplayName() { return "Terror News"; }

  // return the file extension for the datafiles
  getExtension() { return ".EXE"; }

  // return an array of objects that define the issues of the magazine
  // the object must contain at least an "url" and a "name" field
  getIssues()
  {
    return TERRORNEWS_ISSUES;
  }

  // return the HTML required by the mag; this will be placed within the resizing container
  generateHTML()
  {
    return "<div id='article-underlay'></div><div id='menu-container'><ul id='menu-main'></ul></div><div id='article'></div><div id='article-title'></div><div id='article-image'></div>";
  }

  // return an object where keys represent css selectors, and the values represent which mode they should be visible in
  getModes()
  {
    var obj =
    {
      "#menu-main": "mainmenu",
      "#menu-container": "mainmenu",
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

        this.fullFile = array_buffer;
        var view = new DataView(array_buffer, 0, array_buffer.byteLength)

        var issue = this.getCurrentIssueInfo();
        this.files = {};
        switch (issue.format)
        {
          case 10:
            {
              // Format between #60 and #69;
              // Most offsets are hardwired; compression is done via PKWARE DCL

              this.exeUnpData = new DietEXE().decompress(array_buffer);
              var exeUnpView = new DataView(this.exeUnpData.buffer, 0, this.exeUnpData.buffer.byteLength);

              this.files["TNLST.UCM"] = {"offset":issue.tocTextOfs,"source":"exe"};

              // TNCIKK.UCZ
              var ovlOfs = exeUnpView.getInt32(issue.dataSeg,true);
              var ovlStart = array_buffer.byteLength + ovlOfs; // ovlOfs is negative
              this.files["TNCIKK.UCZ"] = {"offset":ovlStart,"packer":"PKWARE","source":"overlay"};

              // MENU.UCM
              var interfaceOfs = exeUnpView.getUint32(issue.dataSeg+4,true);
              this.files["MENU.UCM"] = {"offset":ovlStart + interfaceOfs,"packer":"PKWARE","source":"overlay"};

              // CELS.UCZ
              var logoBlockOfs = exeUnpView.getUint32(issue.dataSeg+8,true);
              this.files["CELS.UCZ"] = {"offset":ovlStart + logoBlockOfs,"packer":"PKWARE","source":"overlay"};

              // next dwords are:
              // CG logo (LOGO.UCM)
              // title screen (NYITOKEP.UCM)
              // music 1 (TN_1.S3M)
              // music 2 (TN_2.S3M)

              this.files["TAB.UCM"] = {"offset":issue.tocLUTOfs,"size":issue.articleCount*4,"source":"exe"};

              var ptr = issue.tocLUTOfs + issue.articleCount * 4;
              this.files["CELTAB.UCM"] = {"offset":ptr,"size":issue.inlineImgCount*16,"source":"exe"};
            } 
            break;
          case 20:
            {
              // Format between #70 and #79 (last issue)
              // File TOC is encrypted at the end of the file; compression is DEFLATE
              
              var tocCount = view.getUint16(array_buffer.byteLength - 2, true);
              var tocOfs = array_buffer.byteLength - 2 - tocCount * 16;
              for(var i=0; i<tocCount; i++)
              {
                var filename = "";
                var xor = 0x4A;
                for(var j=0; j<12; j++)
                {
                  var c = view.getUint8( tocOfs + i * 16 + j, true ) ^ xor;
                  if (!c)
                  {
                    break;
                  }
                  filename += String.fromCharCode(c);
                  
                  xor = (xor + 0x0D) & 0xFF;
                }
                
                this.files[filename] = {
                  "offset": view.getUint32( tocOfs + i * 16 + 12, true ),
                  "source": "overlay",
                  "packer": "DEFLATE"
                }                
              }
            }
            break;
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

CLI_UNICODETABLE = [
      0, 9786, 9787, 9829, 9830, 9827, 9824, 8226, 9688, 9675, 9689, 9794, 9792, 9834, 9835, 9788,
   9658, 9668, 8597, 8252,  182,  167, 9644, 8616, 8593, 8595, 8594, 8592, 8735, 8596, 9650, 9660,
     32,   33,   34,   35,   36,   37,   38,   39,   40,   41,   42,   43,   44,   45,   46,   47,
     48,   49,   50,   51,   52,   53,   54,   55,   56,   57,   58,   59,   60,   61,   62,   63,
     64,   65,   66,   67,   68,   69,   70,   71,   72,   73,   74,   75,   76,   77,   78,   79,
     80,   81,   82,   83,   84,   85,   86,   87,   88,   89,   90,   91,   92,   93,   94,   95,
     96,   97,   98,   99,  100,  101,  102,  103,  104,  105,  106,  107,  108,  109,  110,  111,
    112,  113,  114,  115,  116,  117,  118,  119,  120,  121,  122,  123,  124,  125,  126, 8962,
    199,  252,  233,  226,  228,  224,  229,  231,  234,  235,  232,  239,  238,  236,  196,  193,
    201,  205,  211,  337,  246,  242,  369,  218,  368,  214,  220,  336,  163,  165, 8359,  402,
    225,  237,  243,  250,  241,  209,  170,  186,  191, 8976,  172,  189,  188,  161,  171,  187,
   9617, 9618, 9619, 9474, 9508, 9569, 9570, 9558, 9557, 9571, 9553, 9559, 9565, 9564, 9563, 9488,
   9492, 9524, 9516, 9500, 9472, 9532, 9566, 9567, 9562, 9556, 9577, 9574, 9568, 9552, 9580, 9575,
   9576, 9572, 9573, 9561, 9560, 9554, 9555, 9579, 9578, 9496, 9484, 9608, 9604, 9612, 9616, 9600,
    945,  223,  915,  960,  931,  963,  181,  964,  934,  920,  937,  948, 8734,  966,  949, 8745,
   8801,  177, 8805, 8804, 8992, 8993,  247, 8776,  176, 8729,  183, 8730, 8319,  178, 9632,  160,
];

function cliDecompress(_src)
{
  var src = new Uint8Array(_src)
  var srcLen = src.byteLength;
  var srcView = new DataView(src.buffer, 0, srcLen);
  var srcPtr = 0;
  while(
    srcView.getUint32(srcPtr, true) != 0
    || srcView.getUint32(srcPtr + 4, true) != 0
  )
  {
    srcPtr += 2;
  }

  srcPtr += 8;
  var dstLen = srcView.getUint32(srcPtr, true);
  srcPtr += 4;
  var dst = new Uint8Array(dstLen);
  var dstPtr = 0;

  var currTablePtr = 0;
  while (dstPtr < dstLen)
  {
    var controlByte = src[srcPtr++];
    for (var i = 0; i < 8; i++)
    {
      if (controlByte & (128 >> i))
      {
        currTablePtr += 2;
      }
      currTablePtr += srcView.getUint16(currTablePtr, true) * 2;

      if (srcView.getUint16(currTablePtr, true) == 0)
      {
        dst[dstPtr++] = src[currTablePtr+2];
        currTablePtr = 0;
        if (dstPtr >= dstLen)
        {
          break;
        }
      }
    }
  }

  return dst;
}

class CLi extends MagInterface
{
  getColor(color)
  {
    return "#"
    +toHex(this.data.fontColors[color].r)
    +toHex(this.data.fontColors[color].g)
    +toHex(this.data.fontColors[color].b);
  }

  parseToHTML(cli,y)
  {
    var out = "";
    var span = false;
    var images = [];
    var xPos = 0;
    var state = new State();
    for(var x=0; x<cli.length; x++)
    {
      if (cli.charCodeAt(x) == 0xFF)
      {
        x++;
        switch(cli.charCodeAt(x))
        {
          case 0: // font color
            var color = cli.charCodeAt(x+1);
    				if (color==0xEF) color=1;
    				if (color>5) color=3;
            out += state.add("color",this.getColor(color));
            break;
          case 1: // normal font
            out += state.remove("font-weight");
            break;
          case 2: // bold font
            out += state.add("font-weight","bold");
            break;
          case 3: // picture
            var imagePath = cli.slice(x+1,x+9).replace(/\0+$/,"");
            x+=8;
            out += "<span data-imageurl='"+imagePath+"' style='position:absolute;left:"+(xPos*8)+"px;top:"+(y*17)+"px;'></span>";
            images.push({url:imagePath});
            out += "  ";
            break;
          case 4: // rowheight
            break;
        }
        x++;
      }
      else
      {
        var code = cli.charCodeAt(x);
        out += "&#"+CLI_UNICODETABLE[code]+";";
        xPos++;
      }
    }
    if (span)
    {
      out += "</span>";
    }
    return {html:out,images:images};
  }

  loadArticle(articlepath)
  {
    var tocEntry = this.TOC.find(s=>s.alias==articlepath);
    switch (tocEntry.type)
    {
      case 1:
        {
          this.switchMode("article");

          var article = document.querySelector("#article");
          article.innerHTML = "";
          this.loadASCIIStringFromArchive(articlepath).then((str)=>{
            var articleStr = str.split("\r\n");

            articleStr.forEach((i,idx)=>{
              if (idx==0)
              {
                var articleTitle = document.querySelector("#article-title");
                var str = this.parseToHTML(i,0).html;
                articleTitle.innerHTML = str;

                return;
              }

              var parsed = this.parseToHTML(i,idx-1);
              article.innerHTML += parsed.html + "\n";
              parsed.images.forEach(i=>{
                this.loadGrayscaleImage(i.url).then((blobUrl)=>{
                  var elements = document.querySelectorAll("span[data-imageurl=\""+i.url+"\"]");
                  elements.forEach(e=>{
                    e.innerHTML = "<img src='"+blobUrl+"'/>"
                  });
                });
              });
            });
            article.scrollTo(0,0);
          });
        }
        break;
      case 2:
        {
          this.switchMode("article-image");

          var article = document.querySelector("#article-image");
          article.innerHTML = "";
          this.loadImage(articlepath).then((result)=>{
            article.innerHTML = "<img src='"+result[0]+"'/>";
          });
        }
        break;
    }
  }

  loadMenu(first)
  {
    this.switchMode("mainmenu");

    var menu = document.querySelector("#menu-main");
    menu.innerHTML = "";

    this.TOC.forEach((i,idx)=>{
      if (idx == 0)
      {
        var articleTitle = document.querySelector("#article-title");
        articleTitle.innerHTML = this.parseToHTML(i.label??"").html;

        return;
      }
      var li = document.createElement("li")
      var parsed = this.parseToHTML(i.label??"",idx-1);
      parsed.images.forEach(i=>{
        this.loadGrayscaleImage(i.url).then((blobUrl)=>{
          var elements = document.querySelectorAll("span[data-imageurl=\""+i.url+"\"]");
          elements.forEach(e=>{
            e.innerHTML = "<img src='"+blobUrl+"'/>"
          });
        });
      });

      li.innerHTML = (i.label && i.label.length) ? parsed.html : " ";
      menu.insertBefore( li, null );
      if (i.type != 0)
      {
        li.setAttribute("data-alias",i.alias);
        li.onclick = (function(e)
        {
          var alias = li.getAttribute("data-alias");

          this.pushNavigationState({"edition":this.getEditionID(),"article":alias});

          this.loadArticle(alias);

          e.stopPropagation();
        }).bind(this)
      }
    });

    if (first)
    {
      setTimeout(function(){
        var menu = document.querySelector("#menu-main");
        menu.scrollTo(0,0);
      }, 10);
    }
  }

  loadImage(filename)
  {
    return new Promise((resolve,reject) => {
      this.loadFileFromArchive( filename ).then((data)=>{
        var view = new DataView(data.buffer, 0, data.length);

        // create off-screen canvas element
        var canvas = document.createElement('canvas'),
            ctx = canvas.getContext('2d');

        canvas.width = view.getUint16(0,true);
        canvas.height = view.getUint16(2,true);

        var ofs = 4;
        var palette = {};
        for (var i=0; i<256; i++)
        {
          palette[i] = {};
          palette[i].r = data[ofs++] * 4;
          palette[i].g = data[ofs++] * 4;
          palette[i].b = data[ofs++] * 4;
        }

        var i = 0;
        var buffer = new Uint8ClampedArray(canvas.width * canvas.height * 4);
        for(var y = 0; y < canvas.height; y++)
        {
          for(var x = 0; x < canvas.width; x++)
          {
            var idx = data[ofs++];
            buffer[i++] = palette[idx].r;
            buffer[i++] = palette[idx].g;
            buffer[i++] = palette[idx].b;
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
          resolve( [URL.createObjectURL(new Blob([blob])), palette] );
        });
      });
    });
  }

  loadGrayscaleImage(filename)
  {
    return new Promise((resolve,reject) => {
      this.loadFileFromArchive( filename ).then((data)=>{
        var view = new DataView(data.buffer, 0, data.length);

        // create off-screen canvas element
        var canvas = document.createElement('canvas'),
            ctx = canvas.getContext('2d');

        canvas.width = view.getUint16(0,true);
        canvas.height = view.getUint16(2,true);

        var ofs = 4;
        var i = 0;
        var buffer = new Uint8ClampedArray(canvas.width * canvas.height * 4);
        for(var y = 0; y < canvas.height; y++)
        {
          for(var x = 0; x < canvas.width; x++)
          {
            var idx = data[ofs++];
            buffer[i++] = this.palette[idx].r;
            buffer[i++] = this.palette[idx].g;
            buffer[i++] = this.palette[idx].b;
            buffer[i++] = idx == 0 ? 0 : 255;
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

  loadAssets()
  {
    return new Promise((resolve,reject)=>{
      var container = document.querySelector(this.container);

      this.loadImage( "_CLIMENU" ).then((result)=>{
        changeStylesheetRule(this.container,"background","url("+result[0]+")");
        this.palette = result[1];
        resolve();
      }).catch(reject);
    });
  }

  loadConfig()
  {
    return new Promise((resolve,reject)=>{
      clearStylesheetRules();

      this.TOC = [];
      this.data = {};

      this.loadFileFromArchive( "MAINMENU" ).then((data)=>{
        var tocStr = String.fromCharCode.apply(null, new Uint8Array(data)).split("\r\n");
        for(var i=0; i<tocStr.length; i++)
        {
          var entry = {};
          entry.label = tocStr[i];
          entry.type = 0;
          this.TOC.push(entry);
        }

        this.loadFileFromArchive( "_ANYAG" ).then((data)=>{
          for(var i=0; i<data.length / 9; i++)
          {
            while (this.TOC.length<=i+1)
            {
              this.TOC.push({});
            }
            this.TOC[i+1].type = data[i*9];
            this.TOC[i+1].alias = ArrayBufferToString(data.slice(i*9+1,i*9+9)).replace(/\0+$/, '');
          }

          this.loadFileFromArchive( "_DATAS" ).then((data)=>{
            var view = new DataView(data.buffer, 0, data.length);

            var ofs = 0;
            this.data.numStartPics = data[ofs++];
            this.data.articleTopY = view.getUint16(ofs,true); ofs+=2;
            this.data.articleBottomY = view.getUint16(ofs,true); ofs+=2;
            this.data.headlineX = view.getUint16(ofs,true); ofs+=2;
            this.data.headlineY = view.getUint16(ofs,true); ofs+=2;
            this.data.fontColors = {};
            for(var i=0; i<5; i++)
            {
              this.data.fontColors[i] = {};
              this.data.fontColors[i].r = data[ofs++] * 4;
              this.data.fontColors[i].g = data[ofs++] * 4;
              this.data.fontColors[i].b = data[ofs++] * 4;
            }

            var roundedHeight = (this.data.articleBottomY-this.data.articleTopY);
            roundedHeight = roundedHeight - (roundedHeight % 16);

            changeStylesheetRule("#article","top",this.data.articleTopY+"px");
            changeStylesheetRule("#article","height",roundedHeight+"px");
            changeStylesheetRule("#menu-main","top",this.data.articleTopY+"px");
            changeStylesheetRule("#menu-main","height",roundedHeight+"px");
            changeStylesheetRule("#article-title","left",this.data.headlineX+"px");
            changeStylesheetRule("#article-title","top",this.data.headlineY+"px");
            changeStylesheetRule("#article","color",this.getColor(0));
            changeStylesheetRule("#menu-main","color",this.getColor(0));
            changeStylesheetRule("#article-title","color",this.getColor(1));

            resolve();
          });

        });

      });
    });
  }

  // ---------------------------------------------------------------------
  // IMPLEMENT SUPERCLASS
  // ---------------------------------------------------------------------

  // get the (human-written) name of the mag
  getMagDisplayName() { return "CLi"; }

  // return the file extension for the datafiles
  getExtension() { return ".WAD"; }

  // return an array of objects that define the issues of the magazine
  // the object must contain at least an "url" and a "name" field
  getIssues()
  {
    return CLI_ISSUES;
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

      var entry = this.wadEntries.find(s=>s.name.toLowerCase() == id.toLowerCase());

      var result = cliDecompress(this.wadData.slice(entry.offset,entry.offset+entry.compressed_size))

      if (result)
      {
        resolve(result);
      }
      else
      {
        reject("Load failed: "+id);
      }
    } ).bind(this) );
  }

  // load a specific issue of the mag from the
  // calls `finishedCallback` with no parameter when finished
  loadMagIssueData( array_buffer )
  {
    return new Promise( (function(resolve, reject){

      var signature = ArrayBufferToString(array_buffer.slice(0,4));
      if (signature != "IWAD")
      {
        reject("Archive is not a valid IWAD");
        return;
      }
      var view = new DataView(array_buffer, 0, array_buffer.byteLength);
      
      let tocOffset = view.getUint32(4, true);
      try
      {
        this.wadData = array_buffer;
        this.wadEntries = []
        do {
          var entry = {}

          entry.name = ArrayBufferToString( array_buffer.slice(tocOffset,tocOffset+8) ).replace(/\0+$/, '');
          entry.offset = view.getUint32(tocOffset+8, true);
          entry.compressed_size = view.getUint32(tocOffset+12, true);
          tocOffset += 16;

          this.wadEntries.push(entry);
        } while ( tocOffset < array_buffer.byteLength );

        this.loadConfig()
          .then(a=>{ return this.loadAssets(); })
          .then(resolve,reject);
      }
      catch(e)
      {
        reject(e);
      }
    }).bind(this) );
  }
};


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

var SCENIAL_ARC_IMAGEBLOB   = 0;
var SCENIAL_ARC_BACKGROUND1 = 1;
var SCENIAL_ARC_INTROPIC1   = 2;
var SCENIAL_ARC_FONT1       = 3;
var SCENIAL_ARC_FONT2       = 4;
var SCENIAL_ARC_TOC         = 5;
var SCENIAL_ARC_BACKGROUND2 = 6;
var SCENIAL_ARC_TEXT        = 7;
var SCENIAL_ARC_INTROPIC2   = 8;

class ScenialImage
{
  constructor()
  {
    this.width = 0;
    this.height = 0;
    this.pixelData = null;
    this.transparentColor = -1;
    this.palette = {};
  }

  load(array_buffer)
  {
    var view = new DataView(array_buffer, 0, array_buffer.byteLength);
    
    var ptr = 0;
    this.width = view.getUint16( ptr, true ); ptr += 2;
    this.height = view.getUint16( ptr, true ); ptr += 2;
    for(var i=0; i<256; i++)
    {
      var color = view.getUint16( ptr, true ); ptr += 2;
      this.palette[i] = {
        b:((color >>  0) & 0x1F) << 3,
        g:((color >>  6) & 0x1F) << 3,
        r:((color >> 11) & 0x1F) << 3
      };
    }
    
    this.pixelData = new Uint8Array( array_buffer.slice( ptr, array_buffer.byteLength ) );
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

class Scenial extends MagInterface
{
  getColor(color)
  {
    return "#"
    +toHex(this.palette[color].r)
    +toHex(this.palette[color].g)
    +toHex(this.palette[color].b);
  }

  loadTextContent(buffer,container)
  {
    var view = new DataView( buffer, 0, buffer.byteLength );

    var linesPerPage = 18;
    var charsPerLine = 38;

    var bytes = new Uint8Array( buffer );

    var issue = this.getCurrentIssueInfo();

    var ptr = 0;
    var out = "";
    var lastFormat = 0xFF;
    var state = new State();

    var isList = container.tagName == "UL";
    for (var i=0; i < buffer.byteLength >> 1; i++)
    {
      var data = bytes[ptr++];
      var format = bytes[ptr++];
      var skip = false;

      if (format != lastFormat && data != 0x20)
      {
        out += state.add("color",this.getColor(format));
        lastFormat = format;
      }
      out += "&#"+UNICODETABLE[data]+";";

      if ((i % charsPerLine) == charsPerLine - 1)
      {
        if (isList)
        {
          var li = document.createElement("li")
          li.innerHTML = out;
          out = "";
          state = new State();
          lastFormat = 0xFF;
          container.insertBefore( li, null );
        }
        else
        {
          out += "\n";
        }
      }
    };

    article.innerHTML = out;

    article.scrollTo(0,0);
  }

  loadArticle(articleIdx)
  {
    this.switchMode("article");
    var article = document.querySelector("#article");

    var buffer = this.getArticleData(articleIdx);
    this.loadTextContent(buffer,article);
    
    for(var i=0; i<5; i++)
    {
      var imageData = this.toc[articleIdx].images[i];
      if (!imageData.length)
      {
        continue;
      }
      var buffer = this.arc[SCENIAL_ARC_IMAGEBLOB].buffer.slice(imageData.offset, imageData.offset + imageData.length);
      var offset = imageData.position;
      
      (function(offset,column){
        var image = new ScenialImage();
        image.transparentColor = 0;
        image.load(buffer);
        image.renderCanvas(blobUrl=>{
          var img = document.createElement("img");
          img.src = blobUrl;
          var width = 0x7800; // Not entirely sure how this comes out tbh
          var x = (offset % width) / 2 + column * 320 - 8;
          var y = Math.floor(offset / width) * 12;
          img.setAttribute("style","position:absolute;pointer-events:none;left:"+x+"px;top:"+y+"px;");
          article.insertBefore(img,null);
        });
      }(offset,imageData.column));
    }
  }

  loadMenu(first)
  {
    this.switchMode("mainmenu");

    var menu = document.querySelector("#menu-main");
    menu.innerHTML = "";

    var buffer = this.getArticleData(this.toc.length - 1);
    this.loadTextContent(buffer,menu);

    for(var i=0; i<menu.children.length; i++)
    {
      if (i >= this.toc.length || !this.toc[i].length)
      {
        continue;
      }
      if (this.toc[i].type == 0x60)
      {
        continue;
      }
      var li = menu.children[i];
      li.setAttribute("data-idx",i);

      li.onclick = (function(e)
      {
        var articlepath = e.currentTarget.getAttribute("data-idx");

        this.pushNavigationState({"edition":this.getEditionID(),"article":articlepath})

        this.loadArticle(articlepath);
        e.stopPropagation();
      }).bind(this)
    }
  }

  addBackgroundTile(rule)
  {
    this.backgroundRules.push( rule );
    changeStylesheetRule(this.container,"background",this.backgroundRules.join(", "));
  }

  loadConfig(cb)
  {
    return new Promise((resolve,reject)=>{
      clearStylesheetRules();
      changeStylesheetRule(this.container,"width" ,this.issueX + "px");
      changeStylesheetRule(this.container,"height",this.issueY + "px");

      this.palette = {
        0:{r:240, g:240, b:0},
        1:{r:  0, g:252, b:248},
        2:{r:  0, g:240, b:160},
        3:{r:240, g:240, b:240},
        4:{r:  0, g:180, b:208},
        5:{r:136, g:252, b:64},
      }

      this.backgroundRules = [];
      var lbm1 = new LBM();
      lbm1.load(this.arc[SCENIAL_ARC_BACKGROUND1].buffer);

      lbm1.renderCanvas(blobURL=>{
        this.addBackgroundTile("url("+blobURL+") no-repeat");
      });

      var lbm2 = new LBM();
      lbm2.load(this.arc[SCENIAL_ARC_BACKGROUND2].buffer);

      lbm2.renderCanvas(blobURL=>{
        this.addBackgroundTile("url("+blobURL+") bottom no-repeat");
      });

      var buffer = this.arc[SCENIAL_ARC_TOC].buffer;
      var view = new DataView(buffer, 0, buffer.byteLength);
      var count = buffer.byteLength / 0xF9;
      var ptr = 0;
      this.toc = [];
      for(var i=0; i<count; i++)
      {
        var entry = {};
        entry.offset = view.getUint32( ptr, true ); ptr += 4;
        entry.length = view.getUint32( ptr, true ); ptr += 4;
        entry.type = view.getUint8( ptr, true ); ptr++;
        entry.name = buffer.slice( ptr, ptr + 160 ); ptr += 160;
        entry.images = []
        for (var j=0; j<5; j++)
        {
          var image = {};
          image.length = view.getUint32( ptr, true ); ptr += 4;
          image.offset = view.getUint32( ptr, true ); ptr += 4;
          image.column = view.getUint32( ptr, true ); ptr += 4;
          image.position = view.getUint32( ptr, true ); ptr += 4;
          entry.images.push(image);
        }
        this.toc.push(entry);
      }
      
      this.chiptune.load(this.magDataDir + this.getCurrentIssueInfo().music);

      resolve();
    });
  }

  getArticleData(idx)
  {
    return this.arc[SCENIAL_ARC_TEXT].buffer.slice(this.toc[idx].offset, this.toc[idx].offset + this.toc[idx].length);
  }

  // ---------------------------------------------------------------------
  // IMPLEMENT SUPERCLASS
  // ---------------------------------------------------------------------

  // get the (human-written) name of the mag
  getMagDisplayName() { return "Scenial"; }

  // return the file extension for the datafiles
  getExtension() { return ".YOU"; }

  // return an array of objects that define the issues of the magazine
  // the object must contain at least an "url" and a "name" field
  getIssues()
  {
    return SCENIAL_ISSUES;
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
    return null; // not used in Scenial
  }

  // load a specific issue of the mag from the
  // calls `finishedCallback` with no parameter when finished
  loadMagIssueData( array_buffer )
  {
    return new Promise( (function(resolve, reject){

      var view = new DataView(array_buffer, 0, array_buffer.byteLength);
      try
      {
        this.issueX = 640;
        this.issueY = 400;
        window.onresize();

        var itemCount = 9;
        var ptr = array_buffer.byteLength - (itemCount * 8);
        this.arc = []
        for(var i = 0; i < itemCount; i++)
        {
          var offset = view.getUint32( ptr, true ); ptr += 4;
          var length = view.getUint32( ptr, true ); ptr += 4;

          this.arc[i] = new Uint8Array( array_buffer.slice(offset, offset + length) );
        }

        var xorVal = 0x42;
        var needsXor =
        [
          SCENIAL_ARC_BACKGROUND1,
          SCENIAL_ARC_INTROPIC1  ,
          SCENIAL_ARC_BACKGROUND2,
          SCENIAL_ARC_INTROPIC2
        ];
        for(var idx in needsXor)
        {
          for(var i=0; i<this.arc[needsXor[idx]].length; i++)
          {
            this.arc[needsXor[idx]][i] ^= xorVal;
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

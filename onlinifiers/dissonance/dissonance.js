UNICODETABLE = [
    32, 9786, 9787, 9829, 9830, 9827, 9824, 8226, 9688, 9675, 9689, 9794, 9792, 9834, 9835, 9788, 
  9658, 9668, 8597, 8252,  182,  167, 9644, 8616, 8593, 8595, 8594, 8592, 8735, 8596, 9650, 9660, 
    32,   33,   34,   35,   36,   37,   38,   39,   40,   41,   42,   43,   44,   45,   46,   47, 
    48,   49,   50,   51,   52,   53,   54,   55,   56,   57,   58,   59,   60,   61,   62,   63, 
    64,   65,   66,   67,   68,   69,   70,   71,   72,   73,   74,   75,   76,   77,   78,   79, 
    80,   81,   82,   83,   84,   85,   86,   87,   88,   89,   90,   91,   92,   93,   94,   95, 
    96,   97,   98,   99,  100,  101,  102,  103,  104,  105,  106,  107,  108,  109,  110,  111, 
   112,  113,  114,  115,  116,  117,  118,  119,  120,  121,  122,  123,  124,  125,  126, 8962, 
   199,  252,  233,  226,  228,  224,  229,  231,  234,  235,  232,  239,  238,  205,  196,  193, 
   201,  230,  198,  337,  246,  211,  369,  218,  368,  214,  220,  162,  163,  165, 8359,  402, 
   225,  237,  243,  250,  241,  209,  170,  336,  191, 8976,  172,  189,  188,  161,  171,  187, 
  9617, 9618, 9619, 9474, 9508, 9569, 9570, 9558, 9557, 9571, 9553, 9559, 9565, 9564, 9563, 9488, 
  9492, 9524, 9516, 9500, 9472, 9532, 9566, 9567, 9562, 9556, 9577, 9574, 9568, 9552, 9580, 9575, 
  9576, 9572, 9573, 9561, 9560, 9554, 9555, 9579, 9578, 9496, 9484, 9608, 9604, 9612, 9616, 9600, 
   945,  223,  915,  960,  931,  963,  181,  964,  934,  920,  937,  948, 8734,  966,  949, 8745, 
  8801,  177, 8805, 8804, 8992, 8993,  247, 8776,  176, 8729,  183, 8730, 8319,  178, 9632,   32,
];

class Dissonance extends MagInterface
{
  getColor(color)
  {
    return "#"
    +toHex(this.data.fontColors[color].r)
    +toHex(this.data.fontColors[color].g)
    +toHex(this.data.fontColors[color].b);
  }

  parseToHTML(str,y)
  {
    var out = "";
    var xPos = 0;
    var inLink = false;
    for(var i=0; i<str.length; i++)
    {
      if (str[i]=='\xff')
      {
        switch (str[++i])
        {
          case "C": // color
            {
              if (inLink)
              {
                out += "</a>";
              }
              var color = str[++i];
              switch(color)
              {
                case "A": out += this.state.add("color","#B8B8B8"); break;
                case "B": out += this.state.add("color","#D0D040"); break;
                case "C": out += this.state.add("color","#00B848"); break;
                case "D": out += this.state.add("color","#00B8D0"); break;
                case "E": out += this.state.add("color","#CC4040"); break;
              }
              // todo
            }
            break;
          case "P": // image
            {
              (function() {
              var image = str.slice(i+1,str.indexOf("~",i));
              
              var x = xPos * 8;
              var imageIdx = str.charCodeAt(++i);
              this.loadImage(image).then(blobUrl=>{
                article.innerHTML += "<img src='"+blobUrl+"' style='position:absolute;left:"+(x)+"px;top:"+(y*16)+"px;'/>";  
              });
              i += image.length + 1;
              }).bind(this)();
              
            }
            break;
          case "F": // fullscreen image
          case "L": // link
            {
              var link = str.slice(i+1,str.indexOf("~",i));
              
              var aAttrib = {};
              aAttrib["href"] = "#/edition="+this.getEditionID()+"/article="+encodeURIComponent(link)
              aAttrib["data-url"] = link;

              out += "<a "+Object.entries(aAttrib).map(i=>{ return `${i[0]}="${i[1]}"`; }).join(" ")+">";
              
              inLink = true;
              i += link.length + 1;
            }
            break;
        }
      }
      else
      {
        var chr = UNICODETABLE[str.charCodeAt(i)];
        out += (chr>=0x20 && chr<0x7a) ? String.fromCharCode(chr) : "&#"+UNICODETABLE[str.charCodeAt(i)]+";";
        xPos++;
      }
    }
    return out;
  }

  loadArticle(articlepath)
  {
    var ext = articlepath.split(".")[1].toLowerCase();
    switch(ext)
    {
      case "txt":
        {
          this.switchMode("article");
      
          var article = document.querySelector("#article");
          this.loadASCIIStringFromArchive(articlepath).then((str)=>{
            article.innerHTML = "";
            var articleStr = str.split("\r\n");
            this.state = new State();
            var out = ""
            articleStr.forEach((i,idx)=>{
              if (idx==0)
              {
                var articleTitle = document.querySelector("#article-title");
                i = i.replace(/~$/,"");
                var str = this.parseToHTML(i,0);
                articleTitle.innerHTML = str;
                return;
              }
              //out += "&#9617;" + idx + " " + this.parseToHTML(i,idx-1) + "\n";
              out += this.parseToHTML(i,idx-1) + "\n";
            });
            article.innerHTML = out + this.state.close();
            article.scrollTo(0,0);
            
            var links = Array.from( article.querySelectorAll("a[data-url]") );
            links.forEach(i=>{
              i.onclick = e=>{
                var event = e || window.event;
                e.stopPropagation();
      
                var url = i.getAttribute("data-url");
      
                this.pushNavigationState({"edition":this.getEditionID(),"article":url})
      
                this.loadArticle( url );
              };
            });
            
          });
        }
        break;
      case "gif":
        {
          this.switchMode("article-image");

          var article = document.querySelector("#article-image");

          this.loadBlobURLFromArchive(articlepath).then((blobUrl)=>{
            article.innerHTML = "<img src='"+blobUrl+"'/>";
          });
        }
        break;
    }
  }

  loadMenu(first)
  {
    this.loadArticle("MAIN.TXT");
  }

  loadImage(filename)
  {
    return new Promise((resolve,reject)=>{
      this.loadBlobURLFromArchive( filename ).then((data)=>{
        resolve(data);
      });
    });
  }

  loadConfig()
  {
    return new Promise((resolve,reject)=>{
      clearStylesheetRules();

      changeStylesheetRule(this.container,"width",this.issueX+"px");
      changeStylesheetRule(this.container,"height",this.issueY+"px");

      this.loadImage( "FRAME.GIF" ).then(blobUrl=>{
        changeStylesheetRule(this.container,"background","url("+blobUrl+")");
        resolve();
      });

    });
  }

  // ---------------------------------------------------------------------
  // IMPLEMENT SUPERCLASS
  // ---------------------------------------------------------------------

  // get the (human-written) name of the mag
  getMagDisplayName() { return "Dissonance"; }

  // return the file extension for the datafiles
  getExtension() { return ".MGF"; }

  // return an array of objects that define the issues of the magazine
  // the object must contain at least an "url" and a "name" field
  getIssues()
  {
    return DISSONANCE_ISSUES;
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

      var entry = this.entries.find(s=>s.name.toLowerCase() == id.toLowerCase());

      if (entry)
      {
        var encoded = new Uint8Array( this.data.slice( entry.offset, entry.offset + entry.length ) );
        var data = new Uint8Array(encoded.byteLength);
        for(var i=0; i<encoded.byteLength; i++)
        {
          data[i] = ((encoded[i]-1)>>>0)&0xFF;
        }
        resolve(data);
      }
      else
      {
        reject("Failed to load from archive: "+id);
      }
    } ).bind(this) );
  }

  // load a specific issue of the mag from the
  // calls `finishedCallback` with no parameter when finished
  loadMagIssueData( array_buffer )
  {
    return new Promise( (function(resolve, reject){

      var signature = ArrayBufferToString(array_buffer.slice(0,8));
      if (signature != "DISKMAG!")
      {
        reject("Archive isn't valid!");
        return;
      }
      var view = new DataView(array_buffer, 0, array_buffer.byteLength);
      
      this.issueX = 800;
      this.issueY = 600;
      window.onresize();
      
      let fileCount = view.getUint16(0x4f, true);
      try
      {
        this.data = array_buffer;
        this.entries = []
        var ofs = 0x55;
        for(var i=0; i<fileCount; i++)
        {
          var entry = {}

          var filenameLength = view.getUint8(ofs++);
          entry.name = ArrayBufferToString( array_buffer.slice(ofs,ofs+filenameLength) ).replace(/\0+$/, '');
          ofs+=13;
          entry.offset = view.getUint32(ofs, true) - 1; // <- lol pascal
          ofs += 4;
          entry.length = view.getUint32(ofs, true);
          ofs += 4;

          this.entries.push(entry);
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
};


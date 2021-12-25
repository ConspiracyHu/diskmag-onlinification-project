RandEncSeed = 0;
function RandEnc(b)
{
  var param = 0x100;
  RandEncSeed = (Math.imul(RandEncSeed,0x08088405) + 1) >>> 0;
  var xorVal = ((((param + (RandEncSeed & 0xFFFF)) >>> 16) + (param * (RandEncSeed >>> 16))) >>> 16) & 0xFF;
  return b ^ xorVal;
}

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

class Paradocs extends MagInterface
{
  parseToHTML(str)
  {
    var out = "";
    var xPos = 0;
    for(var x=0; x<str.length; x++)
    {
      out += "&#"+UNICODETABLE[str.charCodeAt(x)]+";";
      xPos++;
    }
    return out;
  }

  loadArticle(articleidx)
  {
    var ext = articleidx.split(".")[1];
    switch(ext)
    {
      case "ss":
        {
          this.switchMode("article");

          var article = document.querySelector("#article");

          article.innerHTML = "";

          this.loadASCIIStringFromArchive(articleidx).then((str)=>{
            var articleMetaStr = str.split("\r\n");
            var articleMeta = {};
            articleMetaStr.forEach(s=>{
              var cfgRegex = /#(\S+)\s+(.*?)\s*$/gm;
              var m = cfgRegex.exec(s);
              if (m)
              {
                switch(m[1])
                {
                  case "picture":
                  case "writeat":
                    if (!articleMeta[m[1]])
                    {
                      articleMeta[m[1]] = [];
                    }
                    articleMeta[m[1]].push(m[2]);
                    break;
                  default:
                    articleMeta[m[1]]=m[2];
                    break;
                }
              }
            });

            this.loadASCIIStringFromArchive(articleMeta["article"]).then((str)=>{
              var articleStr = str.split("\r\n");

              articleStr.forEach((i,idx)=>{
                var parsed = this.parseToHTML(i,idx);
                article.innerHTML += parsed + "\n";
              });

              if (articleMeta["picture"])
              {
                var verticalPixelsPerArticle = 400;
                articleMeta["picture"].forEach(i=>{
                  var params = i.split(",");
                  var x = parseInt(params[1]);
                  var y = (parseInt(params[0]) - 1) * verticalPixelsPerArticle + parseInt(params[2]);

                  this.loadBlobURLFromArchive(params[3]).then((blobUrl)=>{
                    article.innerHTML += "<img src='"+blobUrl+"' style='position:absolute;left:"+x+"px;top:"+y+"px;'/>";
                  });

                });
              }

              article.scrollTo(0,0);
            });
          });
        }
        break;
      case "txt":
        {
          this.switchMode("article");

          var article = document.querySelector("#article");
          article.innerHTML = "";

          this.loadASCIIStringFromArchive(articleidx).then((str)=>{
            var articleStr = str.split("\r\n");

            articleStr.forEach((i,idx)=>{
              var parsed = this.parseToHTML(i,idx);
              article.innerHTML += parsed + "\n";
            });

            article.scrollTo(0,0);
          });
        }
        break;
      case "jpg":
        {
          this.switchMode("article-image");

          var article = document.querySelector("#article-image");

          this.loadBlobURLFromArchive(articleidx).then((blobUrl)=>{
            article.innerHTML = "<img src='"+blobUrl+"'/>";
          });
        }
        break;
    }
  }

  // load and display the main menu / main screen of the magazine
  loadMenu(first)
  {
    this.switchMode("mainmenu");

    var menu = document.querySelector("#menu-main");
    menu.innerHTML = "";
    this.loadASCIIStringFromArchive("MENU.SS")
      .then((str)=>{

        var toc = str.split("\r\n");
        var result = [];

        toc.forEach((function(i){
          if (!i.length || i[0] != '#') return;

          var entry = {};
          entry.type = i[1];
          entry.title = i.slice(3,37);
          entry.link = i.slice(38);
          result.push(entry);
        }).bind(this));

        return result;
      })
      .catch(() => new Promise( (function(resolve, reject) {

        this.loadASCIIStringFromArchive("SCRIPT.SS")
          .then((str)=>{
            var toc = str.split("\r\n");
            var result = [];

            toc.forEach((function(i){
              if (!i.length || i[0] != '@') return;

              var entry = {};
              entry.type = i[1];
              entry.title = i.slice(2,36);
              entry.link = i.slice(36).replace("#","");
              result.push(entry);
            }).bind(this));

            resolve(result);
          });

      }).bind(this) ))
      .then( (toc)=>{
        toc.forEach( ((i)=>{
          var li = document.createElement("li")
          li.innerHTML = i.title.length ? this.parseToHTML(i.title) : "&nbsp;";
          menu.insertBefore( li, null );
          if (!i.link.length)
          {
            return;
          }
          li.setAttribute("data-link",i.link);
          li.onclick = (e=>
          {
            var link = li.getAttribute("data-link");

            this.pushNavigationState({"edition":this.getEditionID(),"article":link});

            this.loadArticle(link);

            e.stopPropagation();
          }).bind(this)
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

  loadConfig()
  {
    return new Promise((resolve,reject)=>{
      this.loadASCIIStringFromArchive("SKIN.SS")
        .then((str)=>
          {
            var skinStr = str.split("\r\n");
            var skin = {};
            var cfgRegex = /#(\S+)\s+(.*?)\s*$/gm;
            skinStr.forEach(s=>{
              var m = cfgRegex.exec(s);
              if (m)
              {
                skin[m[1]]=m[2];
              }
            });

            this.loadBlobURLFromArchive(skin["backgrnd"]).then((blobUrl)=>{
              changeStylesheetRule(this.container,"background","url("+blobUrl+")");
            });
            var readArea = skin["readarea"].split(",")
            changeStylesheetRule("#menu-main","left",parseInt(readArea[0])+"px");
            changeStylesheetRule("#article","left",parseInt(readArea[0])+"px");
            changeStylesheetRule("#menu-main","top",parseInt(readArea[1])+"px");
            changeStylesheetRule("#article","top",parseInt(readArea[1])+"px");
            resolve();
          })
        .catch(()=>
          {
            this.loadBlobURLFromArchive("LOAD.JPG").then((blobUrl)=>{
              changeStylesheetRule(this.container,"background","url("+blobUrl+")");
            });

            changeStylesheetRule("#menu-main","top","50px");
            changeStylesheetRule("#article","top","50px");
            changeStylesheetRule("#menu-main","left","30px");
            changeStylesheetRule("#article","left","30px");

            resolve();
          })
        .catch(reject)
    });
  }

  // ---------------------------------------------------------------------
  // IMPLEMENT SUPERCLASS
  // ---------------------------------------------------------------------

  // get the (human-written) name of the mag
  getMagDisplayName() { return "PaRaDoCS"; }

  // return the file extension for the datafiles
  getExtension() { return ".DAT"; }

  // return an array of objects that define the issues of the magazine
  // the object must contain at least an "url" and a "name" field
  getIssues()
  {
    return PARADOCS_ISSUES;
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
      var data = Object.values(this.archive.files).find(s=>s.name.toUpperCase()==id.toUpperCase());
      if (data)
      {
        resolve(data.asArrayBuffer());
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
      var issue = this.getCurrentIssueInfo();
      
      if (issue.xorUseRandEnc)
      {
        RandEncSeed = issue.xorSeed;

        var array = new Uint8Array(array_buffer)
        for (var x=0; x<array.byteLength; x++)
        {
          array[x] ^= RandEnc();
        }
      }
      else
      {
        var array = new Uint8Array(array_buffer)
        for (var x=0; x<array.byteLength; x++)
        {
          array[x] ^= issue.xorStatic;
        }
      }
      
      try
      {
        this.archive = new JSZip(array.buffer);
        this.loadConfig().then(resolve,reject);
      }
      catch(e)
      {
        reject(e);
      }
    }).bind(this) );
  }
};

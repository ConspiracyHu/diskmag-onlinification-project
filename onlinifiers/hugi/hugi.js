class Hugi extends MagInterface
{
  scaleFont(px)
  {
    return (parseInt(px,10) - 2) + "px";
  }

  applyFontStyle(selector,styleName)
  {
    var fontstyle = this.config.find(s=>s.tagName=="fontstyle" && s.name==styleName);
    if (fontstyle.inherit)
    {
      this.applyFontStyle(selector,fontstyle.inherit);
    }
    if (fontstyle.face !== undefined)
    {
      changeStylesheetRule(selector,"family",fontstyle.face);
    }
    if (fontstyle.height !== undefined)
    {
      changeStylesheetRule(selector,"font-size",this.scaleFont(fontstyle.height));
    }
    if (fontstyle.color !== undefined)
    {
      changeStylesheetRule(selector,"color","#"+this.colors[fontstyle.color].color);
    }
    if (fontstyle.b)
    {
      changeStylesheetRule(selector,"font-weight","bold");
    }
  }

  applyTheme(themeName)
  {
    var result = "";

    var theme = this.config.find(s=>s.tagName=="theme" && s.name==themeName);
    if (theme.inherit)
    {
      result += this.applyTheme(theme.inherit);
    }

    if (theme.image)
    {
      this.loadImage(theme.image).then((function(blob){
        changeStylesheetRule(this.container,"background","url("+blob+")");
      }).bind(this));
    }

    var pals = theme.children.filter(s=>s.tagName=="pal");
    if (pals)
    {
      pals.forEach((i,idx)=>{
        this.colors[i.index !== undefined ? i.index : idx] = i;
      });
    }

    var buttons = theme.children.filter(s=>s.tagName=="button");
    if (buttons)
    {
      buttons.forEach((i,idx)=>{
        result += this.createButton(i);
      });
    }

    var page = theme.children.find(s=>s.tagName=="page");
    if (page)
    {
      if (page.x !== undefined)
      {
        changeStylesheetRule("#article","left",page.x+"px");
      }
      if (page.y !== undefined)
      {
        changeStylesheetRule("#article","top",page.y+"px");
      }
      if (page.width !== undefined)
      {
        changeStylesheetRule("#article","width",page.width+"px");
      }
      if (page.height !== undefined)
      {
        changeStylesheetRule("#article","height",page.height+"px");
      }
    }

    return result;
  }

  applyScheme(schemeName)
  {
    clearStylesheetRules();

    changeStylesheetRule(this.container,"width",this.issueX+"px");
    changeStylesheetRule(this.container,"height",this.issueY+"px");

    this.colors = {
      0: "ffffff"
    };

    var result = "";

    var scheme = this.config.find(s=>s.tagName=="scheme" && s.name==schemeName);
    if (scheme.inherit)
    {
      result += this.applyScheme(scheme.inherit);
    }

    var background = scheme.children.find(s=>s.tagName=="background" && s.id==this.selectedBackground);
    if (background)
    {
      result += this.applyTheme(background.theme);
    }

    var p = scheme.children.find(s=>s.tagName=="p");
    if (p)
    {
      if (p.align !== undefined)
      {
        switch(p.align)
        {
          case "j":
            changeStylesheetRule("#article p","text-align","justify");
            break;
        }
      }
      if (p.spacing !== undefined)
      {
        changeStylesheetRule("#article p","margin-top",p.spacing+"px");
      }
      if (p.fl !== undefined)
      {
        changeStylesheetRule("#article p","text-indent",p.fl+"px");
      }
    }

    var page = scheme.children.find(s=>s.tagName=="page");
    if (page)
    {
      if (page.columns !== undefined && page.columns > 1)
      {
        changeStylesheetRule("#article","column-count",page.columns);
      }
      if (page.width !== undefined)
      {
        changeStylesheetRule("#article","width",page.width+"px");
      }
    }

    var link = scheme.children.find(s=>s.tagName=="link");
    if (link)
    {
      if (link.color !== undefined)
      {
        changeStylesheetRule("#article a","color","#"+this.colors[link.color].color);
      }
    }
    var font = scheme.children.find(s=>s.tagName=="font");
    if (font)
    {
      if (font.style !== undefined)
      {
        this.applyFontStyle("#article",font.style);
      }
    }

    return result;
  }

  parseToTagTree(str)
  {
    var toggleAttributes = [
      "b",
      "horizontal",
      "immsong",
    ];
    var result = [];
    for(var i=0; i<str.length; i++)
    {
      if (str[i] == "<")
      {
        var tagEntry = {};
        var tagStart = i+1;
        var tagEnd = str.indexOf(">",i+1);
        if (tagEnd == -1)
        {
          continue;
        }
        var tagData = str.slice(tagStart,tagEnd);

        var tokens = [];
        var currentToken = "";
        var inString = false;
        for(var j=0; j<tagData.length; j++)
        {
          if (tagData[j] == "\"")
          {
            inString = !inString;
            continue;
          }
          if (!inString && (tagData[j] == " " || tagData[j] == "\r" || tagData[j] == "\n" || tagData[j] == "\t" || tagData[j] == "="))
          {
            if (currentToken.length > 0)
            {
              tokens.push(currentToken);
              currentToken = "";
            }
            continue;
          }
          currentToken += tagData[j];
        }
        if (currentToken.length > 0)
        {
          tokens.push(currentToken);
          currentToken = "";
        }

        var tagName = tokens[0];

        tagEntry["tagName"] = tokens[0];
        for(var j=1; j<tokens.length; j++)
        {
          if (toggleAttributes.indexOf(tokens[j])!=-1)
          {
            tagEntry[tokens[j]] = true;
          }
          else
          {
            tagEntry[tokens[j]] = tokens[j+1];
            j++;
          }
        }

        var closingTag = str.indexOf("</"+tagName+">",tagEnd+1);
        if (closingTag != -1)
        {
          tagEntry.children = this.parseToTagTree( str.slice(tagEnd+1, closingTag) );
          i = closingTag + tagName.length + 3;
        }
        else
        {
          i = tagEnd;
        }
        i--;

        result.push(tagEntry);
      }
    }
    return result;
  }

  createButton(tagEntry)
  {
    var result = "";
    var aAttrib = {};
    var position = false;
    var style = "";
    if (tagEntry.x)
    {
      style += "left:"+tagEntry.x+"px;";
      position = true;
    }
    if (tagEntry.y)
    {
      style += "top:"+tagEntry.y+"px;";
      position = true;
    }
    if (tagEntry.width)
    {
      style += "width:"+tagEntry.width+"px;";
    }
    if (tagEntry.height)
    {
      style += "height:"+tagEntry.height+"px;";
    }
    if (position)
    {
      style += "position:absolute;"
      style += "display:inline-block;"
    }

    if (tagEntry.param)
    {
      aAttrib["href"] = "#/edition="+this.getEditionID()+"/article="+encodeURIComponent(tagEntry.param)
      aAttrib["data-url"] = tagEntry.param;
    }

    aAttrib["style"] = style;
    result += "<a "+Object.entries(aAttrib).map(i=>{ return `${i[0]}="${i[1]}"`; }).join(" ")+">";

    if (tagEntry.normal)
    {
      var imgAttrib = {};
      imgAttrib["data-url"] = tagEntry.normal;
      imgAttrib["src"] = PIXEL1x1;
      result += "<img "+Object.entries(imgAttrib).map(i=>{ return `${i[0]}="${i[1]}"`; }).join(" ")+">";
    }
    else
    {
      //result += "&nbsp;";
    }

    result += "</a>";

    return result;
  }

  parseToHTML(str)
  {
    var toggleAttributes = [
      "b",
      "horizontal",
      "immsong",
    ];
    var state = new State();
    var fontState = new State();
    var result = "";
    var inParagraph = false;
    for(var i=0; i<str.length; i++)
    {
      if (str[i] == "<")
      {
        var tagEntry = {};
        var tagStart = i+1;
        var tagEnd = str.indexOf(">",i+1);
        if (tagEnd == -1)
        {
          continue;
        }
        var tagData = str.slice(tagStart,tagEnd);

        var tokens = [];
        var currentToken = "";
        var inString = false;
        for(var j=0; j<tagData.length; j++)
        {
          if (tagData[j] == "\"")
          {
            inString = !inString;
            continue;
          }
          if (!inString && (tagData[j] == " " || tagData[j] == "\r" || tagData[j] == "\n" || tagData[j] == "\t" || tagData[j] == "="))
          {
            if (currentToken.length > 0)
            {
              tokens.push(currentToken);
              currentToken = "";
            }
            continue;
          }
          currentToken += tagData[j];
        }
        if (currentToken.length > 0)
        {
          tokens.push(currentToken);
          currentToken = "";
        }

        var tagName = tokens[0];

        for(var j=1; j<tokens.length; j++)
        {
          if (toggleAttributes.indexOf(tokens[j])!=-1)
          {
            tagEntry[tokens[j]] = true;
          }
          else
          {
            tagEntry[tokens[j]] = tokens[j+1];
            j++;
          }
        }

        switch(tagName)
        {
          case "article":
            {
              var themeContents = document.querySelector("#theme-contents");
              themeContents.innerHTML = this.applyScheme(tagEntry.scheme);
            }
            break;
          case "center":
            state.add("text-align","center");
            result += "<div style=\""+state.print()+"\">";
            break;
          case "/center":
            state.remove("text-align");
            result += "</div>";
            break;
          case "p":
            {
              if (inParagraph)
              {
                result += "</p>";
              }
              var style = "";
              if (tagEntry.align=="j")
              {
                state.add("text-align","justify");
              }
              else if (tagEntry.align=="c" || tagEntry.align=="center")
              {
                state.add("text-align","center");
              }
              else if (tagEntry.align=="r" || tagEntry.align=="right")
              {
                state.add("text-align","right");
              }
              else if (tagEntry.align=="l" || tagEntry.align=="left")
              {
                state.add("text-align","left");
              }
              if (tagEntry.fl)
              {
                state.add("text-indent",tagEntry.fl+"px");
              }
              if (tagEntry.spacing)
              {
                // Workaround for odd Chrome bug that causes columns to overlap?
                // https://cdn.discordapp.com/attachments/742432672550223980/922479750784639016/krombug.gif
                if (parseInt(tagEntry.spacing) < 500)
                {
                  state.add("margin-top",tagEntry.spacing+"px");
                }
              }
              result += "<p style=\""+state.print()+"\">";
              inParagraph = true;
            }
            break;
          case "font":
            {
              if (tagEntry.face)
              {
                fontState.add("font-family",tagEntry.face); // Might work
              }
              if (tagEntry.height)
              {
                fontState.add("font-size",this.scaleFont(tagEntry.height));
              }
              if (tagEntry.color)
              {
                fontState.add("color","#"+this.colors[tagEntry.color].color);
              }
              result += fontState.printSpan();
            }
            break;
          case "/font":
            {
              result += fontState.close();
            }
            break;
          case "br":
          case "brs":
            {
              result += "<br/>";
            }
            break;
          case "b":
            {
              result += state.add("font-weight","bold");
            }
            break;
          case "/b":
            {
              result += state.remove("font-weight");
            }
            break;
          case "i":
            {
              result += state.add("font-style","italic");
            }
            break;
          case "/i":
            {
              result += state.remove("font-style");
            }
            break;
          case "pre":
            {
              result += "<pre>";
            }
            break;
          case "/pre":
            {
              result += "</pre>";
            }
            break;
          case "imagemap":
            {
              result += "<span data-imagemap=\""+tagEntry.file+"\">";
            }
            break;
          case "/imagemap":
            {
              result += "</span>"; // fingers crossed
            }
            break;
          case "image":
            {
              var attrib = {};
              var style = "";
              if (tagEntry.align)
              {
                switch(tagEntry.align)
                {
                  case "l": style += "float:left;"; break;
                  case "r": style += "float:right;"; break;
                }
              }
              if (tagEntry.left)
              {
                style += "margin-left:"+tagEntry.left+"px;";
              }
              if (tagEntry.right)
              {
                style += "margin-right:"+tagEntry.right+"px;";
              }
              if (tagEntry.width)
              {
                style += "width:"+tagEntry.width+"px;";
              }
              if (tagEntry.height)
              {
                style += "height:"+tagEntry.height+"px;";
              }
              attrib["style"] = style;
              attrib["data-url"] = tagEntry.file;
              attrib["src"] = PIXEL1x1;

              result += "<img "+Object.entries(attrib).map(i=>{ return `${i[0]}="${i[1]}"`; }).join(" ")+">";
            }
            break;
          case "button":
            {
              result += this.createButton(tagEntry);
            }
            break;
          case "link":
            {
              var attrib = {};
              var position = false;
              var style = "";
              if (tagEntry.x)
              {
                style += "left:"+tagEntry.x+"px;";
                position = true;
              }
              if (tagEntry.y)
              {
                style += "top:"+tagEntry.y+"px;";
                position = true;
              }
              if (tagEntry.width)
              {
                style += "width:"+tagEntry.width+"px;";
              }
              if (tagEntry.height)
              {
                style += "height:"+tagEntry.height+"px;";
              }
              if (position)
              {
                style += "position:absolute;"
              }
              if (tagEntry.article)
              {
                attrib["href"] = "#/edition="+this.getEditionID()+"/article="+encodeURIComponent(tagEntry.article)
                attrib["data-url"] = tagEntry.article;
              }
              if (tagEntry.external)
              {
                attrib["href"] = tagEntry.external;
              }
              attrib["style"] = style;
              attrib["title"] = tagEntry.desc;

              result += "<a "+Object.entries(attrib).map(i=>{ return `${i[0]}="${i[1]}"`; }).join(" ")+">";
            }
            break;
          case "/link":
            {
              result += "</a>";
            }
            break;
        }

        i = tagEnd;
      }
      else
      {
        result += str[i];
      }
    }
    return result;
  }

  loadImage(filename)
  {
    return new Promise((resolve,reject)=>{
      if (this.imageCache[filename])
      {
        resolve(this.imageCache[filename]);
        return;
      }

      var maskFilename = filename.substr(0, filename.lastIndexOf(".")) + ".msk";
      var maskExists = this.archive.entries.find(s=>s.name.toLowerCase().replaceAll("/","\\") == maskFilename.toLowerCase().replaceAll("/","\\"));

      if (!maskExists)
      {
        this.loadBlobURLFromArchive(filename).then(blobUrl=>{
          this.imageCache[filename] = blobUrl;
          resolve(blobUrl);
        });
      }
      else
      {
        this.loadBlobURLFromArchive(filename).then(blobImageURL=>{
          this.loadBlobURLFromArchive(maskFilename).then(blobMaskURL=>{

            var image = document.createElement('img');
            image.onload = (function()
            {
              var imageMsk = document.createElement('img');
              imageMsk.onload = (function()
              {
                var canvas = document.createElement('canvas');
                var ctxImg = canvas.getContext('2d');
                canvas.width = image.width;
                canvas.height = image.height;
                ctxImg.drawImage(image, 0, 0);

                var cnvMsk = document.createElement('canvas');
                var ctxMsk = cnvMsk.getContext('2d');
                cnvMsk.width = image.width;
                cnvMsk.height = image.height;
                ctxMsk.drawImage(imageMsk, 0, 0);

                var imageData = ctxImg.getImageData(0,0, canvas.width, canvas.height)
                var maskData = ctxMsk.getImageData(0,0, canvas.width, canvas.height)
                for (var y=0; y<image.height; y++)
                {
                  for (var x=0; x<image.width; x++)
                  {
                    imageData.data[(x+y*image.width)*4+3] = 255 - maskData.data[(x+y*image.width)*4+0];
                  }
                }

                ctxImg.putImageData(imageData, 0, 0);

                canvas.toBlob((canvasBlob)=>{
                  var imageBlobUrl = URL.createObjectURL( new Blob([canvasBlob]) );

                  this.imageCache[filename] = imageBlobUrl;
                  resolve(imageBlobUrl);
                });
              }).bind(this);
              imageMsk.src = blobMaskURL;
            }).bind(this);
            image.src = blobImageURL;

          });
        });
      }

    });
  }

  loadArticle(articlePath)
  {
    this.switchMode("article");

    var article = document.querySelector("#article");
    article.innerHTML = "";
    var themeContents = document.querySelector("#theme-contents");
    themeContents.innerHTML = "";

    this.loadASCIIStringFromArchive(articlePath).then(str=>{
      article.innerHTML = this.parseToHTML(str);

      this.replaceNavigationState({"edition":this.getEditionID(),"article":articlePath})

      var links = Array.from( article.querySelectorAll("a[data-url]") );
      links = links.concat( Array.from( themeContents.querySelectorAll("a[data-url]") ) );
      links.forEach(i=>{
        i.onclick = e=>{
          var event = e || window.event;
          e.stopPropagation();

          var url = i.getAttribute("data-url");

          this.pushNavigationState({"edition":this.getEditionID(),"article":url})

          this.loadArticle( url );
        };
      });

      var images = Array.from( article.querySelectorAll("img[data-url]") );
      images = images.concat( Array.from( themeContents.querySelectorAll("img[data-url]") ) );
      images.forEach(i=>{
        this.loadImage(i.getAttribute("data-url")).then(function(blob){
          i.src = blob;
        });
      });

      var imageMaps = Array.from( article.querySelectorAll("span[data-imagemap]") );
      imageMaps = imageMaps.concat( Array.from( themeContents.querySelectorAll("span[data-imagemap]") ) );
      imageMaps.forEach(i=>{
        this.loadImage(i.getAttribute("data-imagemap")).then(function(blob){
          i.style.background = "url("+blob+")";
          i.style.display = "inline-block";
          i.style.position = "relative";
          var image = document.createElement('img');
          image.onload = function()
          {
            i.style.width = image.width + "px";
            i.style.height = image.height + "px";
            image.remove();
          }
          image.src = blob;
        });
      });
    });

    article.scrollTo(0,0);
  }

  loadMenu(first)
  {
    var mainArticle = this.config.find(s=>s.tagName=="parameters").main;
    if (mainArticle)
    {
      this.loadArticle(mainArticle);
    }
    else
    {
      this.loadArticle("MAIN.TXT");
    }
  }

  loadConfig()
  {
    return new Promise((resolve,reject)=>{

      this.config = {};
      this.loadASCIIStringFromArchive("config.txt").then(str=>{
        this.config = this.parseToTagTree( str );
        
        this.mods = [];
        this.config.filter(s=>s.tagName=="scheme").forEach(s=>{
          s.children.filter(s=>s.tagName=="song").forEach(t=>{
            this.mods.push(t.file);
          })
        })
        this.trackIdx = 0;
        this.playMusicTrack(this.trackIdx);

        var parameters = this.config.find(s=>s.tagName=="parameters");

        this.issueX = 640;
        this.issueY = 480;
        if (parameters.width && parameters.height)
        {
          this.issueX = parseInt(parameters.width);
          this.issueY = parseInt(parameters.height);
        }
        this.selectedBackground = 1;
        window.onresize();

        resolve();
      })
    });
  }

  playMusicTrack(idx)
  {
    var musicFile = this.mods[idx];
    this.loadFileFromArchive(musicFile)
      .then(
        (data  => { this.chiptune.play(data); }).bind(this),
        (error => { this.chiptune.load(this.magDataDir + "/" + this.getCurrentIssueInfo().editionID + "/" + musicFile.toLowerCase()); }).bind(this)
      );
  }
  
  nextMusicTrack()
  {
    this.trackIdx = (this.trackIdx + 1) % this.mods.length;
    this.playMusicTrack(this.trackIdx);
  }

  // ---------------------------------------------------------------------
  // IMPLEMENT SUPERCLASS
  // ---------------------------------------------------------------------

  // get the (human-written) name of the mag
  getMagDisplayName() { return "Hugi"; }

  // return the file extension for the datafiles
  getExtension() { return ".dat"; }

  // return an array of objects that define the issues of the magazine
  // the object must contain at least an "url" and a "name" field
  getIssues()
  {
    return HUGI_ISSUES;
  }

  // return the HTML required by the mag; this will be placed within the resizing container
  generateHTML()
  {
    return "<div id='article-underlay'></div><div id='theme-contents'></div><ul id='menu-main'></ul><div id='article'></div><div id='article-title'></div><div id='article-image'></div>";
  }

  // return an object where keys represent css selectors, and the values represent which mode they should be visible in
  getModes()
  {
    var obj =
    {
      "#menu-main": "mainmenu",
      "#theme-contents": "article",
      "#article": "article",
      "#article-image": "article-image",
    };
    return obj;
  }

  // load a file from the specified identifier; id can be either a filename / url or just a number; returns a Promise
  loadFileFromArchive( id )
  {
    return new Promise((resolve,reject)=>{
      var entry = this.archive.entries.find(s=>s.name.toLowerCase().replaceAll("/","\\") == id.toLowerCase().replaceAll("/","\\"));
      if (!entry)
      {
        reject("Entry not found: " + id);
        return;
      }
      entry.readData(function(data,err){
        if (err)
        {
          reject(err);
          return;
        }
        resolve(data);
      });
    });
  }

  // load a specific issue of the mag from the
  // calls `finishedCallback` with no parameter when finished
  loadMagIssueData( array_buffer )
  {
    return new Promise( (function(resolve, reject){
      try
      {

    		var seed = array_buffer.byteLength;
    		var dwordTab = new Uint32Array(256);
        var x = Math.imul(0x76E5290D,seed) >>> 0;
        for(var i=0; i < 256; i++)
        {
          dwordTab[i] = x >>> 0;
          x = Math.imul(x,0x08088405) >>> 0;
        }
    		var xortab = new Uint8Array(1024);
    		var x = 0;
        for(var i=0; i < 256; i++)
        {
          xortab[x++] = (dwordTab[i] >>>  0) & 0xFF;
          xortab[x++] = (dwordTab[i] >>>  8) & 0xFF;
          xortab[x++] = (dwordTab[i] >>> 16) & 0xFF;
          xortab[x++] = (dwordTab[i] >>> 24) & 0xFF;
        }

    		var dexor = new Uint8Array(array_buffer);
    		for(var i=0; i<dexor.byteLength; i++)
    		{
    		  dexor[i] ^= xortab[i & 0x3ff];
    		}

        this.imageCache = {};
      	this.archive = archiveOpenArrayBuffer("hugi.dat", null, dexor.buffer);

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

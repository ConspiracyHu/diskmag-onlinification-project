class Pain extends MagInterface
{
  formatArticleTitle(s)
  {
    if (s.indexOf("~")!=-1)
    {
      var parts = s.split("~");
      return parts[0] + "<span class='author'>"+parts[1]+"</span>";
    }
    return s;
  }

  scaleFont(px)
  {
    return (parseInt(px,10) * 1.3).toFixed(0);
  }

  parseToHTML(aua)
  {
    var out = "";
    var closers = "";
    var tabPos = 0;
    var images = [];
    var divClose = "";
    var state = new State();
    for(var i=0; i<aua.length; i++)
    {
      if (aua[i]!='<')
      {
        out += aua[i];
        continue;
      }

      var e = aua.indexOf('>',i);

      // small hack for "<char >>"
      if (aua.substring(i+1,i+6)=="char "
       && aua.substring(i+6,i+7)==">")
      {
        e++;
      }

      var params = aua.substring(i+1,e).split(/\s+/);
      switch(params[0].toLowerCase())
      {
        case "b":
          out += state.add("font-weight","bold");
          break;
        case "/b":
          out += state.remove("font-weight");
          break;
        case "i":
          out += state.add("font-style","italic");
          break;
        case "/i":
          out += state.remove("font-style");
          break;
        case "br":
          out += "<br/>";
          tabPos = 0;
          break;
        case "newpage":
          out += "<br style='clear:both'/>";
          tabPos = 0;
          break;
        case "ul":
          out += state.add("text-decoration","underline");
          break;
        case "/ul":
          out += state.remove("text-decoration");
          break;
        case "link":
          out += state.close() + "<a target='_blank' style='"+state.print()+"' href=\""+params[1]+"\">";
          break;
        case "/link":
          out += "</a><span style='"+state.print()+"'>";
          break;
        case "s":
          out += state.add("text-shadow","2px 2px 0px #000");
          break;
        case "/s":
          out += state.remove("text-shadow");
          break;
        case "left":
          out += state.close() + divClose + "<div style=\"text-align:left;"+state.print()+"\">";
          state.open = false;
          divClose = "</div>";
          break;
        case "center":
          out += state.close() + divClose + "<div style=\"text-align:center;"+state.print()+"\">";
          state.open = false;
          divClose = "</div>";
          break;
        case "right":
          out += state.close() + divClose + "<div style=\"text-align:right;"+state.print()+"\">";
          state.open = false;
          divClose = "</div>";
          break;
        case "aj":
          out += state.close() + divClose + "<div style=\"text-align:justify;"+state.print()+"\">";
          state.open = false;
          divClose = "</div>";
          break;
        case "font":
          switch(params[1])
          {
            case "cour":
              out += state.add("font-family","'Courier New', monospace");
              break;
            case "verdana":
              out += state.add("font-family","'Verdana', sans-serif");
              break;
            case "gara":
              out += state.add("font-family","'EB Garamond', serif");
              break;
            case "arial":
              out += state.add("font-family","'Arial', sans-serif");
              break;
            default:
              console.log("unhandled font: "+params[1]);
              break;
          }
          closers = "</span>" + closers;
          break;
        case "size":
          out += state.add("font-size",this.scaleFont(params[1])+"px");
          break;
        case "char":
          if (params[1])
          {
            out += "&#"+params[1].charCodeAt(0)+";";
          }
          else
          {
            out += "&nbsp;";
          }
          break;
        case "image":
        case "imagetrans":
          out += "<span data-imageurl='"+params[1]+"' class='image'></span>";
          if (images.find(s=>s.url==params[1]) === undefined)
          {
            images.push({url:params[1],transparent:params[0]=="imagetrans"});
          }
          break;
        case "imagexy":
        case "imagexytrans":
          var x = parseInt(params[2]);
          out += "<span data-imageurl='"+params[1]+"' class='imagexy "+(x<this.issueX/2?"left":"right")+"'></span>";
          if (images.find(s=>s.url==params[1]) === undefined)
          {
            images.push({url:params[1],transparent:params[0]=="imagexytrans"});
          }
          break;
        case "color":
          if (params[1].length == 6)
          {
            out += state.add("color","#"+params[1]);
          }
          else
          {
            out += state.add("color","#"+toHex(params[1])+toHex(params[2])+toHex(params[3]));
          }
          break;
        default:
          console.log("unhandled AUA tag: "+params[0]);
          break;
      }
      i = e;
    }
    return {html:out,images:images};
  }

  loadArticle(articlepath)
  {
    var articleTitle = document.querySelector("#article-title");
    this.config.forEach((v,k)=>{
      v.forEach((title,path)=>{
        if (path == articlepath)
        {
          articleTitle.innerHTML = this.formatArticleTitle(title);
        }
      });
    });

    this.switchMode("article");

    var article = document.querySelector("#article");

    this.loadASCIIStringFromArchive(articlepath).then(auaStr=>{

      var article = document.querySelector("#article");

      var parsed = null;
      if (articlepath.slice(articlepath.length-4).toLowerCase() == ".aua")
      {
        parsed = this.parseToHTML(auaStr)
        article.innerHTML = parsed.html;
      }
      else if (articlepath.slice(articlepath.length-4).toLowerCase() == ".bin")
      {
        article.innerHTML = "ANSI not yet supported";
      }
      else
      {
        article.innerHTML = "Unknown article format";
      }
      if (parsed.images)
      {
        parsed.images.forEach(i=>{
          this.loadImage(i.url).then(function(blobUrl){
            var elements = document.querySelectorAll("span[data-imageurl=\""+i.url+"\"]");
            if (i.transparent)
            {
            }
            elements.forEach(e=>{
              e.innerHTML = "<img src='"+blobUrl+"'/>"
            });
          });
        });
      }

      article.scrollTo(0,0);
    });
  }

  loadTopic(topic, loadFirstArticle)
  {
    this.switchMode("article");

    var menu = document.querySelector("#menu-topic");
    menu.innerHTML = "";
    var article = document.querySelector("#article");
    article.innerHTML = "";

    var firstArticlePath = null;
    this.config.get(topic).forEach((v,k)=>{
      var li = document.createElement("li")
      li.innerHTML = this.formatArticleTitle(v);
      if (!firstArticlePath)
      {
        firstArticlePath = k;
      }
      menu.insertBefore( li, null );
      li.setAttribute("data-articlepath",k);
      li.onclick = (function(e)
      {
        var articlepath = li.getAttribute("data-articlepath");

        this.pushNavigationState({"edition":this.getEditionID(),"topic":topic,"article":articlepath})

        this.loadArticle(articlepath);
        e.stopPropagation();
      }).bind(this)
    });
    menu.scrollTo(0,0);
    if (loadFirstArticle)
    {
      this.loadArticle(firstArticlePath);
    }
  }

  loadMenu(first)
  {
    this.switchMode("mainmenu");

    var menu = document.querySelector("#menu-main");
    menu.innerHTML = "";
    var article = document.querySelector("#article");
    article.innerHTML = "";

    this.config.get("topic").forEach((v,k)=>{
      var li = document.createElement("li")
      li.innerHTML = v;
      menu.insertBefore( li, null );
      li.setAttribute("data-topic",k);
      li.onclick = (function(e)
      {
        var topic = li.getAttribute("data-topic");

        this.pushNavigationState({"edition":this.getEditionID(),"topic":topic})

        this.loadTopic(topic, true);
        e.stopPropagation();
      }).bind(this)
    });
  }

  loadImage(filename)
  {
    return new Promise((resolve,reject)=>{
      this.loadBlobURLFromArchive(filename).then(blobUrl=>{
        resolve(blobUrl);
      });
    });
  }

  updateArticleBoxHeight()
  {
    changeStylesheetRule("#article","height",this.issueY - this.topbarY - this.menuY + "px");
  }

  loadAssets()
  {
    return new Promise((resolve,reject)=>{

      clearStylesheetRules();

      var painContainer = document.querySelector(this.container);

      var backgroundFileName = null;
      if (this.config.get("!skin") && this.config.get("!skin").get("full"))
      {
        backgroundFileName = this.config.get("!skin").get("full");
      }
      else
      {
        backgroundFileName = "_full.jpg"; // fallback in early versions
      }
      if (backgroundFileName)
      {
        this.loadImage(backgroundFileName).then( (function(blobUrl){
          changeStylesheetRule(this.container,"background","url("+blobUrl+")");
          var image = document.createElement('img');
          image.onload = (function()
          {
            this.issueX = image.width;
            this.issueY = image.height;
            changeStylesheetRule(this.container,"width",image.width+"px");
            changeStylesheetRule(this.container,"height",image.height+"px");
            image.remove();
            window.onresize();
          }).bind(this)
          image.src = blobUrl;
        }).bind(this) );
      }
      var menuBackgroundFileName = null;
      if (this.config.get("!skin") && this.config.get("!skin").get("help2"))
      {
        menuBackgroundFileName = this.config.get("!skin").get("help2");
      }
      else
      {
        menuBackgroundFileName = "_help2.jpg"; // fallback in early versions
      }
      if (menuBackgroundFileName)
      {
        this.loadImage(menuBackgroundFileName).then( (function(blobUrl){
          changeStylesheetRule("#menu-container","background","url("+blobUrl+")");
          var image = document.createElement('img');
          image.onload = (function()
          {
            changeStylesheetRule("#menu-container","height",image.height+"px");
            this.menuY = image.height;
            this.updateArticleBoxHeight();
            image.remove();
          }).bind(this)
          image.src = blobUrl;
        }).bind(this) );
      }
      var topbarBackgroundFileName = null;
      if (this.config.get("!skin") && this.config.get("!skin").get("topbar"))
      {
        topbarBackgroundFileName = this.config.get("!skin").get("topbar");
      }
      else
      {
        topbarBackgroundFileName = "_topbar.jpg"; // fallback in early versions
      }
      if (topbarBackgroundFileName)
      {
        this.loadImage(topbarBackgroundFileName).then( ( function(blobUrl){
          changeStylesheetRule("#top-bar","background","url("+blobUrl+")");
          var image = document.createElement('img');
          image.onload = ( function()
          {
            changeStylesheetRule("#top-bar","height",image.height+"px");
            changeStylesheetRule("#article","top",image.height+"px");
            this.topbarY = image.height;
            this.updateArticleBoxHeight();
            image.remove();
          }).bind(this) 
          image.src = blobUrl;
        }).bind(this) );
      }
      if (this.config.get("!menu") && this.config.get("!menu").get("x") && this.config.get("!menu").get("y"))
      {
        changeStylesheetRule("#menu-main","left",this.config.get("!menu").get("x") + "px");
        changeStylesheetRule("#menu-main","top",this.config.get("!menu").get("y") + "px");
      }
      if (this.config.get("!articlemenu") && this.config.get("!articlemenu").get("x") && this.config.get("!articlemenu").get("y"))
      {
        changeStylesheetRule("#menu-topic","left",this.config.get("!articlemenu").get("x") + "px");
        changeStylesheetRule("#menu-topic","top",this.config.get("!articlemenu").get("y") + "px");
      }
      if (this.config.get("!articlemenu") && this.config.get("!articlemenu").get("width"))
      {
        changeStylesheetRule("#menu-topic","width",this.config.get("!articlemenu").get("width") + "px");
      }
      if (this.config.get("!menu") && this.config.get("!menu").get("font"))
      {
        var font = this.config.get("!menu").get("font")
        if (font == "gara")
        {
          changeStylesheetRule("#menu-main","font-family","'EB Garamond', serif");
          changeStylesheetRule("#menu-topic","font-family","'EB Garamond', serif");
          changeStylesheetRule("#top-bar","font-family","'EB Garamond', serif");
        }
      }
      if (this.config.get("!menu") && this.config.get("!menu").get("fontsize"))
      {
        changeStylesheetRule("#menu-main","font-size",this.scaleFont(this.config.get("!menu").get("fontsize")) + "px");
        changeStylesheetRule("#menu-topic","font-size",this.scaleFont(this.config.get("!menu").get("fontsize")) + "px");
        changeStylesheetRule("#top-bar","font-size",this.scaleFont(this.config.get("!menu").get("fontsize")) + "px");
      }
      if (this.config.get("!menu") && this.config.get("!menu").get("menucolor"))
      {
        changeStylesheetRule("#menu-main","background","#" + this.config.get("!menu").get("menucolor") + "70");
        if (this.config.get("!articlebox")
          && this.config.get("!articlebox").get("enable")
          && this.config.get("!articlebox").get("enable") == "true")
        {
          changeStylesheetRule("#menu-topic","background","#" + this.config.get("!menu").get("menucolor") + "70");
        }
      }
      if (this.config.get("!menu") && this.config.get("!menu").get("selcolor"))
      {
        changeStylesheetRule("#menu-main li:hover","background","#" + this.config.get("!menu").get("selcolor") + "c0");
        changeStylesheetRule("#menu-topic li:hover","background","#" + this.config.get("!menu").get("selcolor") + "c0");
      }
      if (this.config.get("!menu") && this.config.get("!menu").get("textcolor"))
      {
        changeStylesheetRule("#menu-main li","color","#" + this.config.get("!menu").get("textcolor"));
        changeStylesheetRule("#menu-topic li","color","#" + this.config.get("!menu").get("textcolor"));
      }
      if (this.config.get("!menu")
        && this.config.get("!menu").get("bold")
        && this.config.get("!menu").get("bold") == "true")
      {
        changeStylesheetRule("#menu-main li","font-weight","bold");
      }
      if (this.config.get("!menu") && this.config.get("!menu").get("selcolor"))
      {
        changeStylesheetRule("#menu-main li:hover","background","#" + this.config.get("!menu").get("selcolor") + "70");
      }
      if (this.config.get("!menu") && this.config.get("!menu").get("selcolor"))
      {
        changeStylesheetRule("#menu-main li:hover","background","#" + this.config.get("!menu").get("selcolor") + "70");
      }
      if (this.config.get("!backdark") && this.config.get("!backdark").get("color"))
      {
        // we dont have straight-up subtractive blending in CSS (yet?) so we'll just multiply with the inverse; it's close enough
        var color = this.config.get("!backdark").get("color")
        var invert = 0xFFFFFF - parseInt(color,16);
        changeStylesheetRule("#article::before","background","#" + invert.toString(16));
      }
      if (this.config.get("!topbar") && this.config.get("!topbar").get("textcolor"))
      {
        changeStylesheetRule("#top-bar","color","#" + this.config.get("!topbar").get("textcolor"));
      }

      resolve();
    });
  }

  loadConfig()
  {
    return new Promise((resolve,reject)=>{
      this.config = new Map();

      this.loadASCIIStringFromArchive("pain.cfg").then(cfgStr=>{

        var cfgRegex = /(\S+)\s+(\S+)\s+(.*?)\s*$/gm;

        cfgStr.split(/[\r\n]/).forEach(s => {
          var m = cfgRegex.exec(s);
          if (m)
          {
            if (!this.config.has(m[1]))
            {
              this.config.set(m[1],new Map());
            }
            this.config.get(m[1]).set(m[2],m[3]);
          }
        });
        
        this.mods = []
        for(var i=1; i<99; i++)
        {
          var filename = this.config.get("!music").get("file"+i);
          if (!filename)
          {
            break;
          }
          this.mods.push(filename);
        }
        if (this.mods.length == 0)
        {
          var filename = this.config.get("!music").get("main");
          if (filename)
          {
            this.mods.push(filename);
          }
        }
        
        this.trackIdx = 0;
        this.playMusicTrack(this.trackIdx);

        resolve();
      })
    });
  }

  playMusicTrack(idx)
  {
    var musicFile = this.mods[idx];
    var url = this.magDataDir + "/" + this.getCurrentIssueInfo().url.replace(".dat","") + "/" + musicFile.toLowerCase()
    this.playMusic(url);
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
  getMagDisplayName() { return "PAiN"; }

  // return the file extension for the datafiles
  getExtension() { return ".dat"; }

  // return an array of objects that define the issues of the magazine
  // the object must contain at least an "url" and a "name" field
  getIssues()
  {
    return PAIN_ISSUES;
  }

  // return the HTML required by the mag; this will be placed within the resizing container
  generateHTML()
  {
    return "<ul id='menu-main'></ul><div id='menu-container'></div><ul id='menu-topic'></ul><div id='top-bar'><div id='article-title'></div></div><div id='article'></div>";
  }

  handleMagNavigationState(stateObj)
  {
    if (stateObj && stateObj.edition)
    {
      if (stateObj.article)
      {
        this.loadIssue(stateObj.edition)
          .then( (function(){ this.loadTopic(stateObj.topic, false); }).bind(this) )
          .then( (function(){ this.loadArticle(stateObj.article); }).bind(this) )
          .catch( (err) => console.error(err) );
      }
      else if (stateObj.topic)
      {
        this.loadIssue(stateObj.edition)
          .then( (function(){ this.loadTopic(stateObj.topic, true); }).bind(this) )
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
  
  // return an object where keys represent css selectors, and the values represent which mode they should be visible in
  getModes()
  {
    var obj =
    {
      "#menu-main": "mainmenu",
      "#menu-container": "mainmenu",
      "#menu-topic": "article",
      "#article": "article",
      "#top-bar": "article",
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
        this.menuY = 0;
        this.topbarY = 0;
        var issue = this.getCurrentIssueInfo();
      	this.archive = archiveOpenArrayBuffer("hugi.dat", issue.pwd, array_buffer);

        this.loadConfig()
          .then(a=>{return this.loadAssets();})
          .then(resolve,reject);
      }
      catch(e)
      {
        reject(e);
      }
    }).bind(this) );
  }
  
}

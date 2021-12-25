class RIX
{
  constructor()
  {
    this.width = 0;
    this.height = 0;
    this.pixelData = null;
    this.palette = {};
    this.transparentColor = -1;
  }

  load(array_buffer)
  {
    var view = new DataView(array_buffer.buffer, 0, array_buffer.buffer.byteLength);
    
    this.width = view.getUint16(4,true);
    this.height = view.getUint16(6,true);
    
    var ptr = 10;
    for(var i=0; i<256; i++)
    {
      this.palette[i] = {};
      this.palette[i].r = view.getUint8(ptr++) * 4;
      this.palette[i].g = view.getUint8(ptr++) * 4;
      this.palette[i].b = view.getUint8(ptr++) * 4;
    }
    console.log(this.palette);
    
    this.pixelData = new Uint8Array(this.width * this.height);
    for (var y = 0; y < this.height; y++)
    {
      for (var x = 0; x < this.width; x++)
      {
        this.pixelData[ x + y * this.width ] = view.getUint8( ptr++ );
      }
    }
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
      cb( URL.createObjectURL( new Blob([blob]) ) );
    });
  }  
}

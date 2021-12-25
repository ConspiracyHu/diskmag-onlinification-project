class PCX
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
    var view = new DataView(array_buffer, 0, array_buffer.length);
    
    var bitsPerPlanePixel = view.getUint8(3);
    this.width = view.getUint16(8,true) - view.getUint16(4,true) + 1;
    this.height = view.getUint16(10,true) - view.getUint16(6,true) + 1;
    var planeCount = view.getUint8(0x41);
    var bytesPerPlaneLine = view.getUint16(0x42,true);
    
    var paddedWidth = (this.width & 1) ? this.width + 1 : this.width;
    var planarPixelData = new Uint8Array(paddedWidth * this.height);
    var ptr = 128;
    var dstPtr = 0;
    
    for(var i=0; i<16; i++)
    {
      this.palette[i] = {};
      this.palette[i].r = view.getUint8(16+i*3);
      this.palette[i].g = view.getUint8(17+i*3);
      this.palette[i].b = view.getUint8(18+i*3);
    }
    
    while(dstPtr < this.width * this.height && ptr < array_buffer.byteLength)
    {
      var c = view.getUint8(ptr++,true);
      if ((c & 0xC0) == 0xC0)
      {
        var data = view.getUint8(ptr++,true);
        for (var i=0; i<(c&0x3F); i++)
        {
          planarPixelData[dstPtr++] = data;
        }
      }
      else
      {
        planarPixelData[dstPtr++] = c;
      }
    }
    
    this.pixelData = new Uint8Array(this.width * this.height);
    if (bitsPerPlanePixel == 8)
    {
      for (var y = 0; y < this.height; y++)
      {
        for (var x = 0; x < this.width; x++)
        {
          this.pixelData[ x + y * this.width ] = planarPixelData[ x + y * paddedWidth ];
        }
      }
    }
    else
    {
      this.pixelData = new Uint8Array(this.width * this.height);
      for (var y = 0; y < this.height; y++)
      {
        var srcLinePtr = y * bytesPerPlaneLine * planeCount;
        for (var x = 0; x < this.width; x++)
        {
          for (var b = 0; b < planeCount; b++)
          {
            var srcBytePtr = srcLinePtr + bytesPerPlaneLine * b;
            if ( planarPixelData[ srcBytePtr + (x >>> 3) ] & ( 1 << ( 7 - (x & 7) ) ) )
            {
              this.pixelData[ x + y * this.width ] |= (1 << b);
            }
          }
        }
      }
    }
    
    if (view.getUint8(array_buffer.byteLength-768-1) == 0x0C)
    {
      for(var i=0; i<256; i++)
      {
        this.palette[i] = {};
        this.palette[i].r = view.getUint8(array_buffer.byteLength-768+0+i*3);
        this.palette[i].g = view.getUint8(array_buffer.byteLength-768+1+i*3);
        this.palette[i].b = view.getUint8(array_buffer.byteLength-768+2+i*3);
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

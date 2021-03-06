class LBM
{
  static FORM = 0x4D524F46;
  static CMAP = 0x50414D43;
  static BMHD = 0x44484d42;
  static BODY = 0x59444F42;
  
  static ILBM = 0x4D424C49;
  static PBM  = 0x204D4250;
  
  constructor()
  {
    this.width = 0;
    this.height = 0;
    this.pixelData = null;
    this.ptr = 0;
    this.view = null;
    this.palette = {};
  }

  load(array_buffer)
  {
    this.view = new DataView(array_buffer, 0, array_buffer.length);
    this.ptr = 0;
    
    this.readChunk();
    
    if (this.isPlanar)
    {
      this.planarToChunky();
    }
       
    this.view = null;
  }
  
  readChunk()
  {
    if (this.ptr >= this.view.byteLength)
    {
      return false;
    }

    var signature = this.view.getUint32( this.ptr, true ); this.ptr += 4;
    var size = this.view.getUint32( this.ptr, false ); this.ptr += 4; // BigEnd
    //console.log(signature.toString(16),size);
    
    if (size & 1)
    {
      size++;
    }

    switch(signature)
    {
      case 0x21687865: // exh!
      case 0x21504f43: // exh!
      case LBM.FORM: // FORM
        { 
          // ILBM / PBM
          this.isPlanar = this.view.getUint32( this.ptr, true ) == LBM.ILBM;
          this.ptr += 4;
          
          while (true)
          {
            if (!this.readChunk())
            {
              break;
            }
          }
        } break;
      case LBM.BMHD: // BMHD
        {
          this.width = this.view.getUint16( this.ptr, false ); this.ptr += 2;
          this.height = this.view.getUint16( this.ptr, false ); this.ptr += 2;
          this.view.getUint16( this.ptr, false ); this.ptr += 2; // x
          this.view.getUint16( this.ptr, false ); this.ptr += 2; // y
          this.bitplanes = this.view.getUint8( this.ptr++ );
          this.view.getUint8( this.ptr++ ); // masking
          this.compression = this.view.getUint8( this.ptr++ );
          this.view.getUint8( this.ptr++ ); // pad1
          this.view.getUint16( this.ptr, false ); this.ptr += 2; // transparency
          this.view.getUint8( this.ptr++ ); // x aspect
          this.view.getUint8( this.ptr++ ); // y aspect
          this.view.getUint16( this.ptr, false ); this.ptr += 2; // page width
          this.view.getUint16( this.ptr, false ); this.ptr += 2; // page height         
        } break;
      case LBM.CMAP: // CMAP
        {
          for (var i=0; i<size/3; i++)
          {
            this.palette[i] = {};
            this.palette[i].r = this.view.getUint8(this.ptr++);
            this.palette[i].g = this.view.getUint8(this.ptr++);
            this.palette[i].b = this.view.getUint8(this.ptr++);
          }
        } break;
      case LBM.BODY: // BODY
        {
          if (this.compression == 0)
          {
            this.pixelData = new Uint8Array( this.view.buffer.slice( this.ptr, this.ptr + size ) );
          }
          else
          {
            this.pixelData = new Uint8Array( this.width * this.height );
            var dstPtr = 0;
            for (var i = 0; i < size; i++)
            {
              var c = this.view.getInt8(this.ptr + (i++));
              if (0 <= c && c <= 127)
              {
                for (var j = 0; j < c + 1; j++)
                {
                  if (i >= size)
                  {
                    break;
                  }
                  this.pixelData[dstPtr++] = this.view.getUint8(this.ptr + (i++));
                }
                i--;
              }
              else if (-127 <= c && c <= -1)
              {
                for (var j = 0; j < -c + 1; j++)
                {
                  this.pixelData[dstPtr++] = this.view.getUint8(this.ptr + i);
                }
              }
              else if (-128 == c)
              {
                // do nothing.
              }
            }
          }
          this.ptr += size;
        } break;
      default:
        {
          this.ptr += size;
        } break;
    }
    return true;
  }
  
  planarToChunky()
  {
    var planarPixelData = this.pixelData;

    this.pixelData = new Uint8Array(this.width * this.height);
    var bytesPerPlaneLine = this.width >>> 3;
    for (var y = 0; y < this.height; y++)
    {
      var srcLinePtr = y * bytesPerPlaneLine * this.bitplanes;
      for (var x = 0; x < this.width; x++)
      {
        for (var b = 0; b < this.bitplanes; b++)
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

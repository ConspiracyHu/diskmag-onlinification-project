/*

Unpacker for LZEXE binaries

Based on source in UNLZEXE5.ZIP / UNLZEXE.C

*/

class LZEXE
{
  constructor()
  {
    this.bitCount = 0;
    this.controlWord = 0;
    
    this.ptr = 0;
    this.view = null;
  }

  getbit()
  {
    var result = ( this.controlWord & ( 1 << this.bitCount++ ) );
    if ( this.bitCount >= 0x10 )
    {
      this.controlWord = this.view.getUint16(this.ptr,true);
      this.ptr += 2;
      this.bitCount = 0;
    }
    return result ? 1 : 0;
  }
  
  decompress( array_buffer )
  {
    this.view = new DataView(array_buffer, 0, array_buffer.byteLength);
    this.ptr = 0; 

    var dst = new Uint8Array(array_buffer.byteLength * 10); // hardwired, let's cross fingers
    var dstPtr = 0;

    var count = 0;
    var span = 0;
  
    this.controlWord = this.view.getUint16(this.ptr,true);
    this.ptr += 2;
  
    while ( true )
    {
      var o = 0;
      if ( this.getbit() )
      {
        dst[dstPtr++] = this.view.getUint8(this.ptr++);
        continue;
      }
      if ( !this.getbit() )
      {
        count = this.getbit() << 1;
        count |= this.getbit();
        count += 2;
        span = this.view.getUint8(this.ptr++) | 0xff00;
      }
      else
      {
        span = this.view.getUint8(this.ptr++);
        count = this.view.getUint8(this.ptr++);
        
        span |= ( ( count & ~0x07 ) << 5 ) | 0xe000;
        count = ( count & 0x07 ) + 2;
        
        if ( count == 2 )
        {
          count = this.view.getUint8(this.ptr++);
  
          if ( count == 0 )
          {
            break;    /* end mark of compressed load module */
          }
  
          if ( count == 1 )
          {
            continue; /* segment change */
          }
          else
          {
            count++;
          }
        }
      }

      var spanS16 = new Int16Array([span])[0];
      for ( ; count > 0; count--, dstPtr++ )
      {
        dst[dstPtr] = dst[dstPtr + spanS16];
      }
  
    }
    
    return dst.slice(0,dstPtr);
  }

}
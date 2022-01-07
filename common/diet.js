/*

Unpacker for DIET binaries

Reverse-engineered from the original source

*/

class Diet
{
  static DLZ0 = 0x307A6C64;
  
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
  
  decompress( array_buffer, uncompressed_length )
  {
    this.view = new DataView(array_buffer, 0, array_buffer.byteLength);
    this.ptr = 0; 

    var dst = new Uint8Array(uncompressed_length ? uncompressed_length : array_buffer.byteLength * 20); // hardwired, let's cross fingers
    var dstPtr = 0;

    this.controlWord = this.view.getUint16(this.ptr,true);
    this.ptr += 2;
  
    while ( true )
    {
      if ( this.getbit() ) // 1
      {
        // control bit on - copy byte
        dst[dstPtr++] = this.view.getUint8(this.ptr++);
        continue;
      }
  
      var bit = this.getbit(); // 2
      var al = this.view.getUint8(this.ptr++);
      var spanLo = al;
      var spanHi = 0xff;
      
      if ( !bit )
      {
        if ( !this.getbit() ) // 3
        {
          if ( spanHi != spanLo )
          {
            var spanS16 = new Int16Array([( spanHi << 8 ) | spanLo])[0];
            for ( var i = 0; i < 2; i++ )
            {
              dst[ dstPtr ] = dst[ dstPtr++ + spanS16 ];
            }
            continue;
          }
          else
          {
            if ( this.getbit() ) // 4
            {
              // end of segment/block
              continue;
            }
            else
            {
              // end of stream
              break;
            }
          }
        }
  
        for ( var i = 0; i < 3; i++ )
        {
          spanHi = ((( spanHi << 1 ) | this.getbit()) >>> 0) & 0xFF; // 5
        }
  
        spanHi--;
          
        // do rewind
        var spanS16 = new Int16Array([( spanHi << 8 ) | spanLo])[0];
        for ( var i = 0; i < 2; i++ )
        {
          dst[ dstPtr ] = dst[ dstPtr++ + spanS16 ];
        }
  
        continue;
      }
      
      spanHi = ( spanHi << 1 ) | this.getbit(); // 6
  
      var count = 0;
      if ( !this.getbit() ) // 7
      {
        count = 2;
        for ( var i = 0; i < 3; i++ )
        {
          if ( this.getbit() ) // 8
          {
            break;
          }
          spanHi = ((( spanHi << 1 ) | this.getbit()) >>> 0) & 0xFF; // 9
          count <<= 1;
        }
        spanHi -= count;
      }
  
      count = 2;
      var bail = false;
      for ( var j = 0; j < 4; j++ )
      {
        count++;
        if ( this.getbit() ) // 10
        {
          // do rewind
          var spanS16 = new Int16Array([( spanHi << 8 ) | spanLo])[0];
          for ( var i = 0; i < count; i++ )
          {
            dst[ dstPtr ] = dst[ dstPtr++ + spanS16 ];
          }
          bail = true;
          break;
        }
      }
      if ( bail )
      {
        continue;
      }
  
      if ( this.getbit() ) //11
      {
        count++;
        if ( this.getbit() ) // 12
        {
          count++;
        }
        
        // do rewind
        var spanS16 = new Int16Array([( spanHi << 8 ) | spanLo])[0];
        for ( var i = 0; i < count; i++ )
        {
          dst[ dstPtr ] = dst[ dstPtr++ + spanS16 ];
        }
        continue;
      }
  
      if ( !this.getbit() ) // 13
      {
        count = 0;
        for ( var j = 0; j < 3; j++ )
        {
          count = ( count << 1 ) | this.getbit(); // 14
        }
        count += 9;
  
        // do rewind
        var spanS16 = new Int16Array([( spanHi << 8 ) | spanLo])[0];
        for ( var i = 0; i < count; i++ )
        {
          dst[ dstPtr ] = dst[ dstPtr++ + spanS16 ];
        }
        continue;
      }
  
      al = this.view.getUint8(this.ptr++);
      // do rewind
      var spanS16 = new Int16Array([( spanHi << 8 ) | spanLo])[0];
      for ( var i = 0; i < al + 0x11; i++ )
      {
        dst[ dstPtr ] = dst[ dstPtr++ + spanS16 ];
      }
    }
    
    return dst.slice(0,dstPtr);
  }

}

class DietEXE extends Diet
{
  decompress( array_buffer, uncompressed_length )
  {
    var tempView = new DataView(array_buffer, 0, array_buffer.byteLength);
    for(var i=0; i<256; i++)
    {
      if (tempView.getUint32(i,true) == Diet.DLZ0) // 'dlz0'
      {
        return super.decompress( array_buffer.slice( i + 4 + 7, array_buffer.byteLength ) );
      }
    }
    return null;
  } 
}
/*

Unpacker for PKLite binaries

Converted from https://raw.githubusercontent.com/ReflectionHLE/ReflectionHLE/master/src/depklite/depklite.c

*/

PKLITE_BITTREE1 =
[
  [4,1,-1],
  [1,2,-1],
  [0,0, 2],
  [0,0, 3],
  [1,6,-1],
  [1,2,-1],
  [0,0, 4],
  [1,2,-1],
  [0,0, 5],
  [0,0, 6],
  [1,6,-1],
  [1,2,-1],
  [0,0, 7],
  [1,2,-1],
  [0,0, 8],
  [0,0, 9],
  [1,6,-1],
  [1,2,-1],
  [0,0,10],
  [1,2,-1],
  [0,0,11],
  [0,0,12],
  [1,6,-1],
  [1,2,-1],
  [0,0,25],
  [1,2,-1],
  [0,0,13],
  [0,0,14],
  [1,6,-1],
  [1,2,-1],
  [0,0,15],
  [1,2,-1],
  [0,0,16],
  [0,0,17],
  [1,6,-1],
  [1,2,-1],
  [0,0,18],
  [1,2,-1],
  [0,0,19],
  [0,0,20],
  [1,4,-1],
  [1,2,-1],
  [0,0,21],
  [0,0,22],
  [1,2,-1],
  [0,0,23],
  [0,0,24],
];

PKLITE_BITTREE2 =
[
  [2,1,-1],
  [0,0, 0],
  [1,12,-1],
  [1,4,-1],
  [1,2,-1],
  [0,0, 1],
  [0,0, 2],
  [1,4,-1],
  [1,2,-1],
  [0,0, 3],
  [0,0, 4],
  [1,2,-1],
  [0,0, 5],
  [0,0, 6],
  [1,18,-1],
  [1,8,-1],
  [1,4,-1],
  [1,2,-1],
  [0,0, 7],
  [0,0, 8],
  [1,2,-1],
  [0,0, 9],
  [0,0,10],
  [1,4,-1],
  [1,2,-1],
  [0,0,11],
  [0,0,12],
  [1,2,-1],
  [0,0,13],
  [1,2,-1],
  [0,0,14],
  [0,0,15],
  [1,16,-1],
  [1,8,-1],
  [1,4,-1],
  [1,2,-1],
  [0,0,16],
  [0,0,17],
  [1,2,-1],
  [0,0,18],
  [0,0,19],
  [1,4,-1],
  [1,2,-1],
  [0,0,20],
  [0,0,21],
  [1,2,-1],
  [0,0,22],
  [0,0,23],
  [1,8,-1],
  [1,4,-1],
  [1,2,-1],
  [0,0,24],
  [0,0,25],
  [1,2,-1],
  [0,0,26],
  [0,0,27],
  [1,4,-1],
  [1,2,-1],
  [0,0,28],
  [0,0,29],
  [1,2,-1],
  [0,0,30],
  [0,0,31],
];

class PKLite
{
  static PKLI = 0x494C4B50;
  
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
  
  getbittree( bittree )
  {
    var start = 0;
  
    // Walk the tree.
    while ( true )
    {
      var bit = this.getbit();
      // Decide which branch to use.
      if ( bit )
      {
        start += bittree[ start ][ 1 ];
      }
      else
      {
        start += bittree[ start ][ 0 ];
      }
      if ( bittree[ start ][ 0 ] == 0 && bittree[ start ][ 0 ] == 0 )
      {
        return bittree[ start ][ 2 ];
      }
    }
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
      // Decide which mode to use for the current bit.
      if ( this.getbit() )
      {
        var copy = this.getbittree( PKLITE_BITTREE1 );
  
        var copyCount = 0;
  
        if ( copy == 25 ) // Special value
        {
          var encryptedByte = this.view.getUint8( this.ptr++ );
  
          if ( encryptedByte == 0xFE )
          {
            continue;
          }
          else if ( encryptedByte == 0xFF )
          {
            break;
          }
          else
          {
            copyCount = encryptedByte + 25;
          }
        }
        else
        {
          copyCount = copy;
        }
  
        var mostSigByte = 0;
  
        if ( copyCount != 2 )
        {
          mostSigByte = this.getbittree( PKLITE_BITTREE2 );
        }
  
        var leastSigByte = this.view.getUint8( this.ptr++ );
  
        var offset = leastSigByte | ( mostSigByte << 8 );
  
        for ( var p = 0; p < copyCount; p++ )
        {
          dst[ dstPtr ] = dst[ dstPtr - offset ];
          dstPtr++;
        }
      }
      else
      {
        dst[ dstPtr++ ] = this.view.getUint8( this.ptr++ );
      }
    }
    return dst.slice(0, dstPtr);
  }
}

class PKLiteEXE extends PKLite
{
  decompress( array_buffer, uncompressed_length )
  {
    var tempView = new DataView(array_buffer, 0, array_buffer.byteLength);

    return super.decompress( array_buffer.slice( 0x340, array_buffer.byteLength ), uncompressed_length );
  } 
}
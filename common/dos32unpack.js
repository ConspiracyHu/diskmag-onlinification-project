/*

Unpacker for DOS32 extender binaries

According to the ref#10 in DOS32.DOC in dos32v33.zip,
this is based on LZSS.C.

*/

class DOS32Unpack
{
  constructor()
  {
    this.N = 4096;
    this.F = 18;
    this.THRESHOLD = 2;
    this.mask = 0;
    
    this.ptr = 0;
    this.view = null;
  }

  getbit(n) /* get n bits */
  {
    x = 0;
    for (i = 0; i < n; i++)
    {
      if (this.mask == 0)
      {
        buf = this.view.getUint8(this.ptr++);
        this.mask = 128;
      }
      x <<= 1;
      if (buf & this.mask) x++;
      this.mask >>= 1;
    }
    return x;
  }

  unpack(array_buffer)
  {
    this.view = new DataView(array_buffer, 0, array_buffer.length);
    this.ptr = 0x22D0; // hardwired but it works

    var dst = new Uint8Array(32000);
    var dstPtr = 0;

    var text_buf = []
    for (var i = 0; i < this.N - this.F; i++) text_buf[i] = 0;
    var r = this.N - this.F;
    var flags = 0;

    for (;;)
    {
      if (((flags >>= 1) & 256) == 0)
      {
        var c = this.view.getUint8(this.ptr++);
        if (this.ptr >= this.view.buffer.byteLength) break;
      	flags = c | 0xff00;		/* uses higher byte cleverly to count eight */
      }
      if (flags & 1)
      {
        var c = this.view.getUint8(this.ptr++);
        if (this.ptr >= this.view.buffer.byteLength) break;
      	dst[dstPtr++] = c;
      	text_buf[r++] = c;
      	r &= (this.N - 1);
      }
      else
      {
        var i = this.view.getUint8(this.ptr++);
        if (this.ptr >= this.view.buffer.byteLength) break;
        var j = this.view.getUint8(this.ptr++);
        if (this.ptr >= this.view.buffer.byteLength) break;
      	i |= ((j & 0xf0) << 4);
      	j = (j & 0x0f) + this.THRESHOLD;
      	for (var k = 0; k <= j; k++)
      	{
      		var c = text_buf[(i + k) & (this.N - 1)];
      		dst[dstPtr++] = c;
      		text_buf[r++] = c;
      		r &= (this.N - 1);
        }
      }
    }
    
    return dst.buffer.slice(0,dstPtr);
  }
}
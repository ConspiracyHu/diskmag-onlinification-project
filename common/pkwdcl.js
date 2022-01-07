/*

Unpacker for PKWARE Data Compression Library

Adapted from https://github.com/madler/zlib/blob/master/contrib/blast/blast.c

*/

PKWAREDCL_MAXBITS = 13;              /* maximum code length */
PKWAREDCL_MAXWIN = 4096;             /* maximum window size */

PKWAREDCL_LITLEN = [
    11, 124, 8, 7, 28, 7, 188, 13, 76, 4, 10, 8, 12, 10, 12, 10, 8, 23, 8,
    9, 7, 6, 7, 8, 7, 6, 55, 8, 23, 24, 12, 11, 7, 9, 11, 12, 6, 7, 22, 5,
    7, 24, 6, 11, 9, 6, 7, 22, 7, 11, 38, 7, 9, 8, 25, 11, 8, 11, 9, 12,
    8, 12, 5, 38, 5, 38, 5, 11, 7, 5, 6, 21, 6, 10, 53, 8, 7, 24, 10, 27,
    44, 253, 253, 253, 252, 252, 252, 13, 12, 45, 12, 45, 12, 61, 12, 45,
    44, 173];
    
    /* bit lengths of length codes 0..15 */
PKWAREDCL_LENLEN = [2, 35, 36, 53, 38, 23];
    /* bit lengths of distance codes 0..63 */
PKWAREDCL_DISTLEN = [2, 20, 53, 230, 247, 151, 248];
PKWAREDCL_BASE = [     /* base for length codes */
    3, 2, 4, 5, 6, 7, 8, 9, 10, 12, 16, 24, 40, 72, 136, 264];
PKWAREDCL_EXTRA = [     /* extra bits for length codes */
    0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8];

function PKWAREDCL_construct(rep)
{
    var symbol;         /* current symbol when stepping through length[] */
    var len;            /* current length when stepping through h->count[] */
    var left;           /* number of possible codes left of current length */
    var offs = new Array(PKWAREDCL_MAXBITS+1);      /* offsets in symbol table for each length */
    var length = new Array(256);  /* code lengths */
    var n = rep.length;

    /* convert compact repeat counts into symbol bit length list */
    symbol = 0;
    var i = 0;
    do {
        len = rep[i++];
        left = (len >> 4) + 1;
        len &= 15;
        do {
            length[symbol++] = len;
        } while (--left);
    } while (--n);
    n = symbol;

    var h = {"count":new Array(PKWAREDCL_MAXBITS + 1), "symbol":new Array(256)};
    /* count number of codes of each length */
    for (len = 0; len <= PKWAREDCL_MAXBITS; len++)
        h.count[len] = 0;
    for (symbol = 0; symbol < n; symbol++)
        (h.count[length[symbol]])++;   /* assumes lengths are within bounds */
    if (h.count[0] == n)               /* no codes! */
        return 0;                       /* complete, but decode() will fail */

    /* check for an over-subscribed or incomplete set of lengths */
    left = 1;                           /* one possible code of zero length */
    for (len = 1; len <= PKWAREDCL_MAXBITS; len++) {
        left <<= 1;                     /* one more bit, double codes left */
        left -= h.count[len];          /* deduct count from possible codes */
        if (left < 0) return left;      /* over-subscribed--return negative */
    }                                   /* left > 0 means incomplete */

    /* generate offsets into symbol table for each length for sorting */
    offs[1] = 0;
    for (len = 1; len < PKWAREDCL_MAXBITS; len++)
        offs[len + 1] = offs[len] + h.count[len];

    /*
     * put symbols in table sorted by length, by symbol order within each
     * length
     */
    for (symbol = 0; symbol < n; symbol++)
        if (length[symbol] != 0)
            h.symbol[offs[length[symbol]]++] = symbol;

    /* return zero for complete set, positive for incomplete set */
    return h;
}

PKWAREDCL_LITCODE = PKWAREDCL_construct(PKWAREDCL_LITLEN);
PKWAREDCL_LENCODE = PKWAREDCL_construct(PKWAREDCL_LENLEN);
PKWAREDCL_DISTCODE = PKWAREDCL_construct(PKWAREDCL_DISTLEN);
                
class PKWAREDCL
{
  constructor()
  {
    this.left = 0;
    this.bitbuf = 0;
    this.bitcnt = 0;

    this.next = 0;
    this.first = 1;  
    this.out = new Uint8Array(PKWAREDCL_MAXWIN);
  }

  bits(need)
  {
    /* load at least need bits into val */
    var val = this.bitbuf;
    while (this.bitcnt < need) 
    {
      val |= this.inStream[this.inPtr++] << this.bitcnt;          /* load eight bits */
      this.bitcnt += 8;
    }

    /* drop need bits and update buffer, always zero to seven bits left */
    this.bitbuf = val >> need;
    this.bitcnt -= need;

    /* return need bits, zeroing the bits above that */
    return val & ((1 << need) - 1);
  }
  
  decode(h)
  {
    var bitbuf = this.bitbuf;
    var left = this.bitcnt;
    var code = 0;
    var first = 0;
    var index = 0;
    var len = 1;
    var nextIdx = 1;
    while (1) 
    {
      while (left--) 
      {
        code |= (bitbuf & 1) ^ 1;   /* invert code */
        bitbuf >>= 1;
        var count = h.count[nextIdx++];
        if (code < first + count)
        {
          /* if length len, return symbol */
          this.bitbuf = bitbuf;
          this.bitcnt = (this.bitcnt - len) & 7;
          return h.symbol[index + (code - first)];
        }
        index += count;             /* else update for next length */
        first += count;
        first <<= 1;
        code <<= 1;
        len++;
      }
      left = (PKWAREDCL_MAXBITS + 1) - len;
      if (left == 0) break;
      bitbuf = this.inStream[this.inPtr++];
      if (left > 8) left = 8;
    }
    return -9;                          /* ran out of codes */
  }
  
  decompress( array_buffer, uncompressed_length )
  {
    this.inStream = new Uint8Array( array_buffer, 0, array_buffer.byteLength );
    this.inPtr = 0;
    this.outStream = new Uint8Array( uncompressed_length ? uncompressed_length : array_buffer.byteLength * 10 );
    this.outPtr = 0;
    
    var base = [     /* base for length codes */
        3, 2, 4, 5, 6, 7, 8, 9, 10, 12, 16, 24, 40, 72, 136, 264];
    var extra = [     /* extra bits for length codes */
        0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8];
        
    /* read header */
    var lit = this.bits(8);
    if (lit > 1)
    {
      return -1;
    }
    var dict = this.bits(8);
    if (dict < 4 || dict > 6)
    {
      return -2;
    }

    /* decode literals and length/distance pairs */
    do
    {
      if (this.bits(1)) 
      {
        /* get length */
        var symbol = this.decode(PKWAREDCL_LENCODE);
        var len = base[symbol] + this.bits(extra[symbol]);
        if (len == 519)
        {
          break;              /* end code */
        }

        /* get distance */
        symbol = len == 2 ? 2 : dict;
        var dist = this.decode(PKWAREDCL_DISTCODE) << symbol;
        dist += this.bits(symbol);
        dist++;
        if (this.first && dist > this.next)
        {
          return -3;              /* distance too far back */
        }

        /* copy length bytes from distance bytes back */
        do 
        {
          var to = this.next;
          var from = to - dist;
          var copy = PKWAREDCL_MAXWIN;
          if (this.next < dist) 
          {
            from += copy;
            copy = dist;
          }
          copy -= this.next;
          if (copy > len)
          {
            copy = len;
          }
          len -= copy;
          this.next += copy;
          do 
          {
            this.out[to++] = this.out[from++];
          } while (--copy);
          
          if (this.next == PKWAREDCL_MAXWIN) 
          {
            for (var i=0; i<this.next; i++)
            {
              this.outStream[this.outPtr++] = this.out[i];
            }
            this.next = 0;
            this.first = 0;
          }
        } while (len != 0);
      }
      else 
      {
        /* get literal and write it */
        var symbol = lit ? this.decode(PKWAREDCL_LITCODE) : this.bits(8);
        this.out[this.next++] = symbol;
        if (this.next == PKWAREDCL_MAXWIN) 
        {
          for (var i=0; i<this.next; i++)
          {
            this.outStream[this.outPtr++] = this.out[i];
          }
          this.next = 0;
          this.first = 0;
        }
      }
    } while (1);    

    for (var i=0; i<this.next; i++)
    {
      this.outStream[this.outPtr++] = this.out[i];
    }
    
    return this.outStream.slice(0,this.outPtr);
  } 
}
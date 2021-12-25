// "CRDATA00" / "PACK.EXE" decompressor, JavaScript reimplementation
// Originally coded (if the strings in the binary are to be believed)
// by Ross N. Williams (http://ross.net/compression/lzrw3.html)
//
// Reverse-engineered by Gargaj / Conspiracy, a man who should've
// looked closely in the binary to find the strings that show the
// name of the packer, but noooo...

"use strict";

(function() {

function _crdata00Read(view, offset, size) 
{
  return view.slice(offset, offset + size);
}

function crdata00GetEntries(filename, array_buffer) 
{
  let view = new Uint8Array(array_buffer);
  let offset = 0;
  let entries = [];

  let toc_offset = new DataView(view.buffer, 8, 4).getUint32(0, true);
  let file_count = new DataView(view.buffer, 12, 4).getUint32(0, true);
  
  for(var i=0; i<file_count; i++)
  {
    let offset = new DataView(view.buffer, toc_offset, 4).getUint32(0, true); toc_offset += 4;
    let comp   = new DataView(view.buffer, toc_offset, 4).getUint32(0, true); toc_offset += 4;
    let csize  = new DataView(view.buffer, toc_offset, 4).getUint32(0, true); toc_offset += 4;
    let usize  = new DataView(view.buffer, toc_offset, 4).getUint32(0, true); toc_offset += 4;
    let name = saneMap(view.slice(toc_offset,toc_offset+64),String.fromCharCode).join('').replace(/\0+$/, ''); toc_offset += 64;
    let entry = 
    {
      offset: offset,
      compressed_size: csize,
      uncompressed_size: usize,
      compression_type: comp,
      name: name
    };
    entries.push(entry);
  }

  return entries;
}

function crdata00Hash(symbol)
{
  var h = (((symbol[0] << 4) ^ symbol[1]) << 4) ^ symbol[2];
  
  var eax = h;
  var edx = eax * 39;
  
  edx = 0xFFFFFFFF - (edx - 1);
  edx = ((edx * 20 - eax) * 32 - eax) >> 4;
  
  return edx & 0xFFF;
}

function crdata00Decompress(_src, uncompressed_size)
{
  var src = new Uint8Array(_src);
  var dst = new Uint8Array(uncompressed_size);
  var dstPtr = 0;
  var srcPtr = 0;

  var compType = new DataView(src.buffer, srcPtr, 4).getUint32(0, true);
  if (compType != 0)
  {
    return new Uint8Array( src.slice(4, src.length - 4) );
  }
  srcPtr += 4;
  
  var dict = {};
  var counter = 0;
  while(true)
  {
    var controlWord = new DataView(src.buffer, srcPtr, 2).getUint16(0, true);
    srcPtr += 2;
    for(var bit = 0; bit < 16; bit++)
    {
      if (controlWord & (1 << bit))
      {
        var compMarker = new DataView(src.buffer, srcPtr, 2).getUint16(0, true);
        srcPtr += 2;
        var decompChars = (compMarker & 0x0F) + 3;
        var decompIndex = ((compMarker & 0xFF00) >> 8) | ((compMarker & 0xF0) << 4);
        
        var pos = dstPtr;
        for (var x = 0; x < decompChars; x++)
        {
          dst[dstPtr++] = dst[dict[decompIndex] + x];
        }
        
        if (counter)
        {
          var hash = crdata00Hash( dst.slice( pos - counter, pos - counter + 3 ) );
          dict[hash] = pos - counter;
          if (counter == 2)
          {
            var hash = crdata00Hash( dst.slice( pos - 1, pos + 2 ) );
            dict[hash] = pos - 1;
          }          
          counter = 0;
        }
        dict[decompIndex] = pos;
      }
      else
      {
        dst[dstPtr++] = src[srcPtr++];
        if (++counter == 3)
        {
          var hash = crdata00Hash( dst.slice( dstPtr - 3, dstPtr ) );
          dict[hash] = dstPtr - 3;
          counter = 2;
        }
      }
      if (dstPtr >= dst.length || srcPtr >= src.length)
      {
        return dst;
      }
    }
  }
  return dst;
}

function crdata00GetEntryData(entry, array_buffer)
{
  switch(entry.compression_type)
  {
    case 0:
      return new Uint8Array( array_buffer.slice(entry.offset, entry.offset + entry.compressed_size) );
      break;
    case 3:
      return crdata00Decompress(array_buffer.slice(entry.offset, entry.offset + entry.compressed_size), entry.uncompressed_size);
      break;
  }
}

// Figure out if we are running in a Window or Web Worker
let scope = null;
if (typeof window === 'object') {
  scope = window;
} else if (typeof importScripts === 'function') {
  scope = self;
}

// Set exports
scope.crdata00GetEntries = crdata00GetEntries;
scope.crdata00GetEntryData = crdata00GetEntryData;
})();

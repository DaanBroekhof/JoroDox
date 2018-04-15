/**
 * @author shaozilee
 *
 * Bmp format decoder,support 1bit 4bit 8bit 24bit bmp
 *
 */
export default class BmpDecoder {
  constructor(buffer, isWithAlpha) {
    this.pos = 0;
    this.buffer = buffer;
    this.isWithAlpha = !!isWithAlpha;
    this.flag = this.buffer.toString('utf-8', 0, this.pos += 2);
    if (this.flag !== 'BM') {
      throw new Error('Invalid BMP File');
    }
    this.parseHeader();
    this.parseBGR();
  }

  parseHeader() {
    this.fileSize = this.buffer.readUInt32LE(this.pos);
    this.pos += 4;
    this.reserved = this.buffer.readUInt32LE(this.pos);
    this.pos += 4;
    this.offset = this.buffer.readUInt32LE(this.pos);
    this.pos += 4;
    this.headerSize = this.buffer.readUInt32LE(this.pos);
    this.pos += 4;
    this.width = this.buffer.readUInt32LE(this.pos);
    this.pos += 4;
    this.height = this.buffer.readUInt32LE(this.pos);
    this.pos += 4;
    this.planes = this.buffer.readUInt16LE(this.pos);
    this.pos += 2;
    this.bitPP = this.buffer.readUInt16LE(this.pos);
    this.pos += 2;
    this.compress = this.buffer.readUInt32LE(this.pos);
    this.pos += 4;
    this.rawSize = this.buffer.readUInt32LE(this.pos);
    this.pos += 4;
    this.hr = this.buffer.readUInt32LE(this.pos);
    this.pos += 4;
    this.vr = this.buffer.readUInt32LE(this.pos);
    this.pos += 4;
    this.colors = this.buffer.readUInt32LE(this.pos);
    this.pos += 4;
    this.importantColors = this.buffer.readUInt32LE(this.pos);
    this.pos += 4;
  
    if(this.bitPP === 16 && this.isWithAlpha) {
      this.bitPP = 15;
    }

    if (this.bitPP < 15) {
      let len = this.colors === 0 ? 1 << this.bitPP : this.colors;
      this.palette = new Array(len);
      for (let i = 0; i < len; i += 1) {
        let blue = this.buffer.readUInt8(this.pos++);
        let green = this.buffer.readUInt8(this.pos++);
        let red = this.buffer.readUInt8(this.pos++);
        let quad = this.buffer.readUInt8(this.pos++);
        this.palette[i] = {
          red: red,
          green: green,
          blue: blue,
          quad: quad
        };
      }
    }
  }
  
  parseBGR() {
    this.pos = this.offset;
    try {
      let bitn = 'bit' + this.bitPP;
      let len = this.width * this.height * 4;
      this.data = new Buffer(len);

      this[bitn]();
    } catch (e) {
      console.log('bit decode error:' + e);
    }
  
  }
  
  bit1() {
    let xlen = Math.ceil(this.width / 8);
    let mode = xlen%4;
    for (let y = this.height - 1; y >= 0; y--) {
      for (let x = 0; x < xlen; x++) {
        let b = this.buffer.readUInt8(this.pos++);
        let location = y * this.width * 4 + x*8*4;
        for (let i = 0; i < 8; i++) {
          if(x*8+i<this.width){
            let rgb = this.palette[((b>>(7-i))&0x1)];
            this.data[location+i*4] = rgb.blue;
            this.data[location+i*4 + 1] = rgb.green;
            this.data[location+i*4 + 2] = rgb.red;
            this.data[location+i*4 + 3] = 0xFF;
          }else{
            break;
          }
        }
      }
  
      if (mode != 0){
        this.pos+=(4 - mode);
      }
    }
  }
  
  bit4() {
    let xlen = Math.ceil(this.width/2);
    let mode = xlen%4;
    for (let y = this.height - 1; y >= 0; y--) {
      for (let x = 0; x < xlen; x++) {
        let b = this.buffer.readUInt8(this.pos++);
        let location = y * this.width * 4 + x*2*4;
  
        let before = b>>4;
        let after = b&0x0F;
  
        let rgb = this.palette[before];
        this.data[location] = rgb.blue;
        this.data[location + 1] = rgb.green;
        this.data[location + 2] = rgb.red;
        this.data[location + 3] = 0xFF;
  
        if(x*2+1>=this.width)break;
  
        rgb = this.palette[after];
        this.data[location+4] = rgb.blue;
        this.data[location+4 + 1] = rgb.green;
        this.data[location+4 + 2] = rgb.red;
        this.data[location+4 + 3] = 0xFF;
      }
  
      if (mode != 0){
        this.pos+=(4 - mode);
      }
    }
  
  }
  
  bit8() {
    let mode = this.width%4;
    for (let y = this.height - 1; y >= 0; y--) {
      for (let x = 0; x < this.width; x++) {
        let b = this.buffer.readUInt8(this.pos++);
        let location = y * this.width * 4 + x*4;
        if(b < this.palette.length) {
          let rgb = this.palette[b];
          this.data[location] = rgb.blue;
          this.data[location + 1] = rgb.green;
          this.data[location + 2] = rgb.red;
          this.data[location + 3] = 0xFF;
        } else {
          this.data[location] = 0xFF;
          this.data[location + 1] = 0xFF;
          this.data[location + 2] = 0xFF;
          this.data[location + 3] = 0xFF;
        }
      }
      if (mode != 0){
        this.pos+=(4 - mode);
      }
    }
  }
  
  bit15() {
    let dif_w =this.width % 3;
    let _11111 = parseInt('11111', 2),_1_5 = _11111;
    for (let y = this.height - 1; y >= 0; y--) {
      for (let x = 0; x < this.width; x++) {
  
        let B = this.buffer.readUInt16LE(this.pos);
        this.pos+=2;
        let blue = (B & _1_5) / _1_5 * 255 | 0;
        let green = (B >> 5 & _1_5 ) / _1_5 * 255 | 0;
        let red = (B >> 10 & _1_5) / _1_5 * 255 | 0;
        let alpha = (B>>15)?0xFF:0x00;
  
        let location = y * this.width * 4 + x * 4;
        this.data[location] = red;
        this.data[location + 1] = green;
        this.data[location + 2] = blue;
        this.data[location + 3] = alpha;
      }
      //skip extra bytes
      this.pos += dif_w;
    }
  }
  
  bit16() {
    let dif_w =this.width % 3;
    let _11111 = parseInt('11111', 2),_1_5 = _11111;
    let _111111 = parseInt('111111', 2),_1_6 = _111111;
    for (let y = this.height - 1; y >= 0; y--) {
      for (let x = 0; x < this.width; x++) {
  
        let B = this.buffer.readUInt16LE(this.pos);
        this.pos+=2;
        let alpha = 0xFF;
        let blue = (B & _1_5) / _1_5 * 255 | 0;
        let green = (B >> 5 & _1_6 ) / _1_6 * 255 | 0;
        let red = (B >> 11) / _1_5 * 255 | 0;
  
        let location = y * this.width * 4 + x * 4;
        this.data[location] = red;
        this.data[location + 1] = green;
        this.data[location + 2] = blue;
        this.data[location + 3] = alpha;
      }
      //skip extra bytes
      this.pos += dif_w;
    }
  }
  
 bit24() {
    //when height > 0
    for (let y = this.height - 1; y >= 0; y--) {
      for (let x = 0; x < this.width; x++) {
        let blue = this.buffer.readUInt8(this.pos++);
        let green = this.buffer.readUInt8(this.pos++);
        let red = this.buffer.readUInt8(this.pos++);
        let location = y * this.width * 4 + x * 4;
        this.data[location] = red;
        this.data[location + 1] = green;
        this.data[location + 2] = blue;
        this.data[location + 3] = 0xFF;
      }
      //skip extra bytes
      this.pos += (this.width % 4);
    }
  
  }
  
  /**
   * add 32bit decode func
   * @author soubok
   */
  bit32() {
    //when height > 0
    for (let y = this.height - 1; y >= 0; y--) {
      for (let x = 0; x < this.width; x++) {
        let blue = this.buffer.readUInt8(this.pos++);
        let green = this.buffer.readUInt8(this.pos++);
        let red = this.buffer.readUInt8(this.pos++);
        let alpha = this.buffer.readUInt8(this.pos++);
        let location = y * this.width * 4 + x * 4;
        this.data[location] = red;
        this.data[location + 1] = green;
        this.data[location + 2] = blue;
        this.data[location + 3] = alpha;
      }
      //skip extra bytes
      this.pos += (this.width % 4);
    }
  
  }

  getData() {
    return this.data;
  }
}
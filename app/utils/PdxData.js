/* eslint-disable */

export default class PdxData {
  errors = [];
  fileType = 'binary';

  readFromBuffer(buffer) {
    const data = new DataView(buffer);
    let offset = 0;

    // Check file header type marker
    const headerStart = this.readString(data, offset, 4);
    if (headerStart === '@@b@') {
      this.fileType = 'binary';
    } else if (headerStart === '@@t@') {
      this.fileType = 'text';
      this.errors.push(`PdxMesh Model file is in text format.`);
    } else {
      this.errors.push(`Unknown file header start ${headerStart} at 0.`);
      return {};
    }
    offset += 4;

    const base = {
      type: 'object',
      name: 'pdxData',
      children: [],
      depth: 0,
      props: {}
    };
    this.readObject(base, data, offset, -1);

    return base;
  }

  readObject(object, data, offset, objectDepth) {
    // Read depth
    let depth = 0;
    while (data.getInt8(offset) === '['.charCodeAt(0)) {
      depth++;
      offset++;
    }
    if (depth <= objectDepth) {
      return offset - depth;
    }

    // Read property name
    if (depth > 0) {
      const name = this.readPropertyName(data, offset);
      offset += name.length + 1;
      const newObject = {
        type: 'object', name, children: [], depth, props: {}
      };
      object.children.push(newObject);
      object.props[name] = newObject;
      object = newObject;

      while (this.fileType === 'text' && data.getInt8(offset) === ']'.charCodeAt(0)) {
        offset++;
      }
    }

    // Iterate over properties / subobjects
    while (offset < data.byteLength) {
      const char = String.fromCharCode(data.getInt8(offset));
      if (this.fileType === 'binary') {
        if (char === '!') {
          offset = this.readProperty(object, data, offset);
        } else if (char === '[') {
          const newOffset = this.readObject(object, data, offset, depth);
          if (newOffset === offset) {
            // encountered out of scope object, fall to previous depth
            break;
          }
          offset = newOffset;
        } else {
          this.errors.push(`Unknown object start byte ${data.getInt8(offset)} at ${offset}`);
          break;
        }
      } else {
        if (char === '[') {
          const newOffset = this.readObject(object, data, offset, depth);
          if (newOffset === offset) {
            // encountered out of scope object, fall to previous depth
            break;
          }
          if (newOffset <= offset) {
            console.log('loop 1');
            break;
          }
          offset = newOffset;
        } else if (char === "\t" || char === "\n" || char === "\r") {
          offset++;
        } else {
          const newOffset = this.readProperty(object, data, offset);
          if (newOffset <= offset) {
            this.errors.push(`Read loop at offset ${offset}`);
            break;
          }
          offset = newOffset;
        }
      }
    }

    return offset;
  }

  readProperty(object, data, offset) {

    let propertyName = '';

    if (this.fileType === 'binary') {
      // '!'
      offset++;
      // Length propname in byte
      const propertyNameLength = data.getInt8(offset);
      offset++;
      // Propname
      propertyName = this.readString(data, offset, propertyNameLength);
      offset += propertyNameLength;
    } else if (this.fileType === 'text') {
      propertyName = this.readStringUntil(data, offset, ' ');
      offset += propertyName.length + 1;
    }

    // Value
    const property = this.readRawData(data, offset);

    property.name = propertyName;
    property.depth = object.depth + 1;
    property.value = property.data;

    object.children.push(property);
    object.props[propertyName] = property.data;

    return property.offset;
  }

  readRawData(data, offset) {
    const result = {data: null, offset: 0, type: null};
    if (data.getInt8(offset) === 'i'.charCodeAt(0)) {
      result.type = 'int';
      // 'i'
      offset++;
      if (this.fileType === 'binary') {
        // nr of ints
        const length = data.getUint32(offset, true);
        offset += 4;
        if (length === 1) {
          result.data = data.getInt32(offset, true);
        } else {
          result.data = [];
          for (let i = 0; i < length; i++) {
            result.data.push(data.getInt32(offset + i * 4, true));
          }
        }
        offset += 4 * length;
      } else if (this.fileType === 'text') {
        // Space
        offset++;
        let length = this.readStringUntil(data, offset, ' ');
        offset += length.length + 1;
        length = parseInt(length);
        result.data = [];
        for (let i = 0; i < length; i++) {
          const value = this.readStringUntilAny(data, offset, [' ', "\n"]);
          result.data.push(parseInt(value));
          offset += value.length + 1;
        }
        if (length === 1) {
          result.data = result.data[0];
        }
      }
    } else if (data.getInt8(offset) === 'f'.charCodeAt(0)) {
      result.type = 'float';

      // 'f'
      offset++;
      if (this.fileType === 'binary') {
        // nr of floats
        const length = data.getUint32(offset, true);
        offset += 4;
        if (length === 1) {
          result.data = data.getFloat32(offset, true);
        } else {
          result.data = [];
          for (let i = 0; i < length; i++) {
            result.data.push(data.getFloat32(offset + i * 4, true));
          }
        }
        offset += 4 * length;
      } else if (this.fileType === 'text') {
        // Space
        offset++;
        let length = this.readStringUntil(data, offset, ' ');
        offset += length.length + 1;
        length = parseInt(length);
        result.data = [];
        for (let i = 0; i < length; i++) {
          const value = this.readStringUntilAny(data, offset, [' ', "\n"]);
          result.data.push(parseFloat(value));
          offset += value.length + 1;
        }
        if (length === 1) {
          result.data = result.data[0];
        }
      }
    } else if (data.getInt8(offset) === 's'.charCodeAt(0)) {
      result.type = 'string';
      // 's' string.
      offset++;
      if (this.fileType === 'binary') {
        // Number of strings
        const length = data.getUint32(offset, true);
        offset += 4;

        result.data = [];
        for (let i = 0; i < length; i++) {
          const strLength = data.getUint32(offset, true);
          offset += 4;
          let str = this.readString(data, offset, strLength);
          // NullByte string
          const nullByteString = (str.charCodeAt(strLength - 1) === 0);
          if (nullByteString) {
            result.data.nullByteString = true;
            str = str.substr(0, strLength - 1);
          }
          result.data.push(str);
          offset += strLength;
        }
        if (length === 1) {
          result.data = result.data[0];
        }
      } else if (this.fileType === 'text') {
        // Space
        offset++;
        let length = this.readStringUntil(data, offset, ' ');
        offset += length.length + 1;
        length = parseInt(length);
        result.data = [];
        for (let i = 0; i < length; i++) {
          const [value, offsetChange] = this.readQuotedString(data, offset, [' ', "\n"]);
          result.data.push(value);
          offset += offsetChange;
        }
        if (length === 1) {
          result.data = result.data[0];
        }
      }
    }

    result.offset = offset;

    return result;
  }

  readPropertyName(data, offset) {
    if (this.fileType === 'binary') {
      return this.readNullByteString(data, offset);
    } else {
      return this.readStringUntilAny(data, offset, [' ', ']']);
    }
  }


  readString(data, offset, length) {
    let str = '';
    for (let i = 0; i < length; i++) {
      str += String.fromCharCode(data.getUint8(offset + i));
    }

    return str;
  }

  readStringUntil(data, offset, untilChar) {
    let str = '';

    const max = data.byteLength;
    for (let i = 0; offset + i < max; i++) {
      const char = String.fromCharCode(data.getUint8(offset + i));

      if (char === untilChar)
        break;

      str += char;
    }

    return str;
  }

  readStringUntilAny(data, offset, untilChars) {
    let str = '';

    const max = data.byteLength;
    for (let i = 0; offset + i < max; i++) {
      const char = String.fromCharCode(data.getUint8(offset + i));

      if (untilChars.includes(char))
        break;

      str += char;
    }

    return str;
  }

  readQuotedString(data, offset) {
    let str = '';

    let i = 0;
    const max = data.byteLength;
    while (i < max) {
      const char = String.fromCharCode(data.getUint8(offset + i));
      if (i === 0) {
        if (char !== '"') {
          this.errors.push(`Expected quoted string, instead got ${data.getInt8(offset)} at ${offset}`);
          break;
        }
        i++;
        continue;
      }

      if (char === '"') {
        i++;
        break;
      }

      if (char === '\\') {
        i++;
        str += String.fromCharCode(data.getUint8(offset + i))
        i++;
        continue;
      }

      str += char;
      i++;
    }

    return [str, i];
  }

  readNullByteString(data, offset) {
    let str = '';
    while (data.getUint8(offset) !== 0 && offset < data.byteLength) {
      str += String.fromCharCode(data.getUint8(offset));
      offset++;
    }

    return str;
  }

  writeToBuffer(data) {
    const buffer = {
      byteLength: 0,
      current: null,
      extendSize: 2048,
      objectDepth: 0,
    };

    // Write header
    this.writeChars(buffer, '@@b@');

    this.writeData(buffer, data);

    // Truncate buffer to actual length for result
    return buffer.current.buffer.slice(0, buffer.byteLength);
  }

  extendBuffer(buffer, extend) {
    if (!buffer.current) {
      buffer.current = new DataView(new ArrayBuffer(buffer.extendSize));
    } else if (buffer.byteLength + extend > buffer.current.byteLength) {
      const tmp = new Uint8Array(new ArrayBuffer(buffer.current.byteLength + buffer.extendSize));
      tmp.set(new Uint8Array(buffer.current.buffer), 0);

      buffer.current = new DataView(tmp.buffer);
    }
    return buffer;
  }

  writeData(buffer, data) {
    if (data.type === 'object') {
      this.writeObject(buffer, data);
    } else if (data.type === 'int') {
      this.writeIntProperty(buffer, data);
    } else if (data.type === 'float') {
      this.writeFloatProperty(buffer, data);
    } else if (data.type === 'string') {
      this.writeStringProperty(buffer, data);
    }
  }

  writeObject(buffer, objectData) {
    for (let i = 0; i < buffer.objectDepth; i++) {
      this.writeChar(buffer, '[');
    }

    if (buffer.objectDepth > 0) {
      this.writeNullByteString(buffer, objectData.name);
    }
    buffer.objectDepth++;

    const l = objectData.children.length;
    for (let i = 0; i < l; i++) {
      // Get data from 'props', if present. (for easier writing-back-to-file)
      if (objectData.props && objectData.props[objectData.children[i].name]
                && objectData.children[i].data !== objectData.props[objectData.children[i].name]) {
        objectData.children[i].data = objectData.props[objectData.children[i].name];
      }

      this.writeData(buffer, objectData.children[i]);
    }

    buffer.objectDepth--;
  }

  writeIntProperty(buffer, propertyData) {
    this.writeChar(buffer, '!');
    this.writeFixedString(buffer, propertyData.name);

    this.writeChar(buffer, 'i');

    let data = [];
    if (propertyData.data instanceof Int32Array) {
      data = propertyData.data;
    } else {
      data = data.concat(propertyData.data);
    }

    const l = data.length;
    this.writeUint32(buffer, l);
    for (let i = 0; i < l; i++) {
      this.writeUint32(buffer, data[i]);
    }
  }

  writeFloatProperty(buffer, propertyData) {
    this.writeChar(buffer, '!');
    this.writeFixedString(buffer, propertyData.name);

    this.writeChar(buffer, 'f');

    let data = [];
    if (propertyData.data instanceof Float32Array) {
      data = propertyData.data;
    } else {
      data = data.concat(propertyData.data);
    }

    const l = data.length;
    this.writeUint32(buffer, l);
    for (let i = 0; i < l; i++) {
      this.writeFloat32(buffer, data[i]);
    }
  }

  writeStringProperty(buffer, propertyData) {
    this.writeChar(buffer, '!');
    this.writeFixedString(buffer, propertyData.name);

    this.writeChar(buffer, 's');

    if ('stringType' in propertyData) {
      this.writeUint32(buffer, propertyData.stringType);
    } else {
      this.writeUint32(buffer, 1);
    }

    const l = propertyData.data.length + (propertyData.nullByteString ? 1 : 0);
    this.writeUint32(buffer, l);
    this.writeChars(buffer, propertyData.data + (propertyData.nullByteString ? '\0' : ''));
  }

  writeNullByteString(buffer, string) {
    for (let i = 0; i < string.length; i++) {
      this.writeUint8(buffer, string.charCodeAt(i));
    }
    this.writeUint8(buffer, 0);
  }

  writeFixedString(buffer, string) {
    this.writeUint8(buffer, string.length);
    for (let i = 0; i < string.length; i++) {
      this.writeUint8(buffer, string.charCodeAt(i));
    }
  }

  writeChars(buffer, chars) {
    for (let i = 0; i < chars.length; i++) {
      this.writeUint8(buffer, chars.charCodeAt(i));
    }
  }

  writeChar(buffer, char) {
    this.writeUint8(buffer, char.charCodeAt(0));
  }

  writeUint8(buffer, byte) {
    this.extendBuffer(buffer, 1);
    buffer.current.setUint8(buffer.byteLength, byte);
    buffer.byteLength += 1;
  }

  writeUint32(buffer, int) {
    this.extendBuffer(buffer, 4);
    buffer.current.setUint32(buffer.byteLength, int, true);
    buffer.byteLength += 4;
  }

  writeFloat32(buffer, float) {
    this.extendBuffer(buffer, 4);
    buffer.current.setFloat32(buffer.byteLength, float, true);
    buffer.byteLength += 4;
  }
}

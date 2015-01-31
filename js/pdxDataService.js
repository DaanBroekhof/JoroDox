var module = angular.module('pdxDataService', []);

module.factory('pdxDataService', ['$rootScope', function($rootScope) {

	var pdxDataService = {
		'readFromBuffer': function (buffer) {
			var data = new DataView(buffer);
			var offset = 0;

			// Skip '@@b@' file type marker
			offset += 4;

			var base = {type: 'object', name: 'pdxData', subNodes: [], depth: 0, 'props': {}};
			offset = this.readObject(base, data, offset, -1);

			return base;
		},

		'readObject': function (object, data, offset, objectDepth)
		{
			var depth = 0;
			while (data.getInt8(offset) == '['.charCodeAt(0))
			{
				depth++;
				offset++;
			}
			if (depth <= objectDepth)
				return offset - depth;

			if (depth > 0)
			{
				var name = this.readNullByteString(data, offset);
				offset += name.length + 1;
				var newObject = {type: 'object', 'name': name, subNodes: [], 'depth': depth, 'props': {}};
				object.subNodes.push(newObject);
				object.props[name] = newObject;
				object = newObject;
			}

			while (offset < data.byteLength)
			{
				if (data.getInt8(offset) == '!'.charCodeAt(0))
				{
					offset = this.readProperty(object, data, offset);
				}
				else if (data.getInt8(offset) == '['.charCodeAt(0))
				{
					var newOffset = this.readObject(object, data, offset, depth);
					// encountered out of scope object
					if (newOffset == offset)
						break;
					offset = newOffset;
				}
				else
				{
					console.log('Unknown object start byte '+ data.getInt8(offset) +' at '+ offset);
					break;
				}
			}

			return offset;
		},

		'readProperty': function (object, data, offset)
		{
			// '!'
			offset++;
			// Length propname in byte
			var propertyNameLength = data.getInt8(offset);
			offset++;
			// Propname
			var propertyName = this.readString(data, offset, propertyNameLength);
			offset += propertyNameLength;

			// Value
			var property = this.readRawData(data, offset);

			property.name = propertyName;
			property.depth = object.depth + 1;
			object.subNodes.push(property);
			object.props[propertyName] = property.data;

			return property.offset;
		},

		'readRawData': function (data, offset)
		{
			var result = {data: null, offset: 0, type: null};
			if (data.getInt8(offset) == 'i'.charCodeAt(0))
			{
				result.type = 'int';
				// 'i'
				offset++;
				// nr of ints
				var length = data.getUint32(offset, true);
				offset += 4;
				if (length == 1)
					result.data = data.getInt32(offset, true);
				else
				{
					result.data = [];
					for (var i = 0; i < length; i++)
						result.data.push(data.getInt32(offset + i * 4, true));
				}
				offset += 4*length;
			}
			else if (data.getInt8(offset) == 'f'.charCodeAt(0))
			{
				result.type = 'float';

				// 'f'
				offset++;
				// nr of floats
				var length = data.getUint32(offset, true);
				offset += 4;
				if (length == 1)
					result.data = data.getFloat32(offset, true);
				else
				{
					result.data = [];
					for (var i = 0; i < length; i++)
						result.data.push(data.getFloat32(offset + i * 4, true));
				}
				offset += 4*length;
			}
			else if (data.getInt8(offset) == 's'.charCodeAt(0))
			{
				result.type = 'string';
				// 's' string.
				offset++;
				// Unknown what this type number means. Usually is '1'
				result.stringType = data.getUint32(offset, true);
				if (result.stringType != 1)
					console.log('Non-type "1" string detected');

				offset += 4;
				var strLength = data.getUint32(offset, true);
				offset += 4;
				result.data = this.readString(data, offset, strLength);

				// NullByte string
				result.nullByteString = (result.data.charCodeAt(strLength-1) == 0);
				if (result.nullByteString)
					result.data = result.data.substr(0, strLength-1);

				offset += strLength;
			}

			result.offset = offset;

			return result;
		},

		'readString': function (data, offset, length)
		{
			var str = '';
			for (var i = 0; i < length; i++)
				str += String.fromCharCode(data.getUint8(offset + i));

			return str;
		},

		'readNullByteString': function (data, offset)
		{
			var str = '';
			while (data.getUint8(offset) != 0 && offset < data.byteLength)
			{
				str += String.fromCharCode(data.getUint8(offset));
				offset++;
			}

			return str;
		},

		'writeToBuffer': function (data) {
			var buffer = {
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
		},
		'extendBuffer': function (buffer, extend)
		{
			if (!buffer.current)
			{
				buffer.current = new DataView(new ArrayBuffer(buffer.extendSize));
			}
			else if (buffer.byteLength + extend > buffer.current.byteLength)
			{
				var tmp = new Uint8Array(new ArrayBuffer(buffer.current.byteLength + buffer.extendSize));
				tmp.set(new Uint8Array(buffer.current.buffer), 0);

				buffer.current = new DataView(tmp.buffer);
			}
			return buffer;
		},
		'writeData': function (buffer, data)
		{
			if (data.type == 'object')
			{
				this.writeObject(buffer, data);
			}
			else if (data.type == 'int')
			{
				this.writeIntProperty(buffer, data);
			}
			else if (data.type == 'float')
			{
				this.writeFloatProperty(buffer, data);
			}
			else if (data.type == 'string')
			{
				this.writeStringProperty(buffer, data);
			}
		},

		'writeObject': function (buffer, objectData)
		{
			for (var i = 0; i < buffer.objectDepth; i++)
				this.writeChar(buffer, '[');

			if (buffer.objectDepth > 0)
			{
				this.writeNullByteString(buffer, objectData.name);
			}
			buffer.objectDepth++;

			var l = objectData.subNodes.length;
			for (var i = 0; i < l; i++)
			{
				this.writeData(buffer, objectData.subNodes[i]);
			}

			buffer.objectDepth--;
		},
		'writeIntProperty': function (buffer, propertyData)
		{
			this.writeChar(buffer, '!');
			this.writeFixedString(buffer, propertyData.name);

			this.writeChar(buffer, 'i');

			var data = [].concat(propertyData.data);
			var l = data.length;
			this.writeUint32(buffer, l);
			for (var i = 0; i < l; i++)
				this.writeUint32(buffer, data[i]);
		},
		'writeFloatProperty': function (buffer, propertyData)
		{
			this.writeChar(buffer, '!');
			this.writeFixedString(buffer, propertyData.name);

			this.writeChar(buffer, 'f');

			if (propertyData.data)

			var data = [].concat(propertyData.data);
			var l = data.length;
			this.writeUint32(buffer, l);
			for (var i = 0; i < l; i++)
				this.writeFloat32(buffer, data[i]);
		},
		'writeStringProperty': function (buffer, propertyData)
		{
			this.writeChar(buffer, '!');
			this.writeFixedString(buffer, propertyData.name);

			this.writeChar(buffer, 's');

			if ('stringType' in propertyData)
				this.writeUint32(buffer, propertyData.stringType);
			else
				this.writeUint32(buffer, 1);

			var l = propertyData.data.length + (propertyData.nullByteString ? 1 : 0);
			this.writeUint32(buffer, l);
			this.writeChars(buffer, propertyData.data + (propertyData.nullByteString ? "\0" : ''));
		},
		'writeNullByteString': function (buffer, string) {
			for (var i = 0; i < string.length; i++)
				this.writeUint8(buffer, string.charCodeAt(i));
			this.writeUint8(buffer, 0);
		},
		'writeFixedString': function (buffer, string) {
			this.writeUint8(buffer, string.length);
			for (var i = 0; i < string.length; i++)
				this.writeUint8(buffer, string.charCodeAt(i));
		},
		'writeChars': function (buffer, chars) {
			for (var i = 0; i < chars.length; i++)
				this.writeUint8(buffer, chars.charCodeAt(i));
		},
		'writeChar': function (buffer, char) {
			this.writeUint8(buffer, char.charCodeAt(0));
		},
		'writeUint8': function (buffer, byte) {
			this.extendBuffer(buffer, 1);
			buffer.current.setUint8(buffer.byteLength, byte);
			buffer.byteLength += 1;
		},
		'writeUint32': function (buffer, int) {
			this.extendBuffer(buffer, 4);
			buffer.current.setUint32(buffer.byteLength, int, true);
			buffer.byteLength += 4;
		},
		'writeFloat32': function (buffer, float) {
			this.extendBuffer(buffer, 4);
			buffer.current.setFloat32(buffer.byteLength, float, true);
			buffer.byteLength += 4;
		},
	};
  	return pdxDataService;
}]);
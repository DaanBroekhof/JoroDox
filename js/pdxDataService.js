var module = angular.module('pdxDataService', []);

module.factory('pdxDataService', ['$rootScope', function($rootScope) {
	
	var pdxDataService = {
		'readFile': function (buffer) {
			var data = new DataView(buffer);
			var offset = 0;
			
			// Skip '@@b@' file type marker
			offset += 4;

			var base = {type: 'object', name: 'pdxData', subNodes: [], depth: 0};
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
				var newObject = {type: 'object', 'name': name, subNodes: [], 'depth': depth};
				object.subNodes.push(newObject);
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
			var dataArray = this.readRawData(data, offset);
			
			offset = dataArray.offset;
			object.subNodes.push({type: dataArray.type, name: propertyName, 'data': dataArray.data, depth: object.depth + 1});
			
			return offset;
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
				result.data = {};
				// Unknown what this type number means. Usually is '1'
				result.stringType = data.getUint32(offset, true);
				if (result.stringType != 1)
					console.log('Non-type "1" string detected');
					
				offset += 4;
				var strLength = data.getUint32(offset, true);
				offset += 4;
				result.data = this.readString(data, offset, strLength);
				offset += strLength;
			}
			
			result.offset = offset;
			
			return result;
		},

		'readString': function (data, offset, length)
		{
			var str = '';
			for (var i = 0; i < length; i++)
				str += String.fromCharCode(data.getInt8(offset + i));

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
	};
  	return pdxDataService;
}]);
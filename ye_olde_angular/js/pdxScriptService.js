var module = angular.module('pdxScriptService', []);

module.factory('pdxScriptService', ['$rootScope', function($rootScope) {

	var pdxScriptService = {

		currentLine: 0,
		currentOffset: 0,
		currentLineOffset: 0,
		whiteSpace: [' ', "\t", "\n", "\r"],
		lineScope: null,

		'readFile': function (data) {

			this.currentOffset = 0;
			this.currentLine = 1;
			this.data = data;
			this.lineScope = null;

			var base = {type: 'rootScope', name: 'pdxScript', subNodes: [], depth: 0, comments: [], 'data' : {}};

			do
			{
				token = this.readToken(base);

				if (token == false)
					break;

				var varScope = {type: 'object', name: token, subNodes: [], depth: 1, value: null, data: {}, comments: []};
				base.subNodes.push(varScope);

				// Copy any comments immediately above this statement to scope
				this.moveComments(base, varScope, this.currentLine - 1);

				var assign = this.readToken(varScope);
				if (assign != '=' && assign != '{')
					console.log('Expected token `=` or `{` at line '+ this.currentLine +'`, instead got "' + assign +'".');

				var value = assign;

				// Allow assigning with and '=' or with an '{'
				if (assign == '=')
					value = this.readToken(varScope);

				if (value == '{')
				{
					this.readObject(varScope);
				}
				else
				{
					varScope.value = value;
					varScope.data = value;
					varScope.type = 'property';
					varScope.icon = 'asterisk';
				}

				if (base.data[varScope.name])
				{
					if (!angular.isArray(base.data[varScope.name]))
					{
						base.data[varScope.name] = [base.data[varScope.name]];
						base.data[varScope.name].multipleKeys = true;
					}

					base.data[varScope.name].push(varScope.data);
				}
				else
				{
					base.data[varScope.name] = varScope.data;
				}
			}
			while (token !== false)

			return base;
		},

		'readObject': function (scope) {
			var token = null;
			var prevToken = null;
			do
			{
				if (token != null)
					prevToken = token;

				token = this.readToken(scope);

				// Allow assigning with and '=' or with an '{'
				if (token == '=' || token == '{')
				{
					// property style object

					var propertyScope = {type: 'property', name: prevToken, subNodes: [], depth: scope.depth+1, value: null, data: {}, comments: []};
					scope.subNodes.push(propertyScope);
					// Copy any comments immediately above this statement to scope
					this.moveComments(scope, propertyScope, this.currentLine - 1);

					// Value or '{' may follow '='
					if (token == '=')
						token = this.readToken(propertyScope);

					if (token == '{')
					{
						this.readObject(propertyScope);
					}
					else
					{
						propertyScope.type = 'property';
						propertyScope.icon = 'asterisk';
						propertyScope.value = token;
						propertyScope.data = token;
					}

					if (scope.data[propertyScope.name])
					{
						if (!angular.isArray(scope.data[propertyScope.name]))
						{
							scope.data[propertyScope.name] = [scope.data[propertyScope.name]];
							scope.data[propertyScope.name].multipleKeys = true;
						}

						scope.data[propertyScope.name].push(propertyScope.data);
					}
					else
					{
						scope.data[propertyScope.name] = propertyScope.data;
					}

					// Reset token for new property
					prevToken = null;
					token = null;
				}
				else if (prevToken != null)
				{
					// value list style object
					if (scope.value == null)
						scope.value = [];

					scope.icon = 'list';

					scope.value.push(prevToken);

					scope.data = scope.value;
				}

				if (token == '}')
				{
					if (scope.subNodes.length == 0 && scope.value == null)
					{
						// Empty array input
						scope.value = [];
						scope.icon = 'list';

						scope.data = scope.value;
					}
					break;
				}
			}
			while (token !== false)
		},

		'readToken': function (scope) {

			// Skip first whitespace
			while (this.whiteSpace.indexOf(this.data[this.currentOffset]) != -1)
			{
				if (this.data[this.currentOffset] == "\n")
				{
					this.lineScope = null;
					this.currentLine++;
					this.currentLineOffset = this.currentOffset + 1;
				}
				this.currentOffset++;
			}

			// Keep track of deepest scope in current line (for comments)
			if (!this.lineScope || scope.depth > this.lineScope.depth)
				this.lineScope = scope;

			var token = '';

			if (this.data[this.currentOffset] == '"')
				return this.readString(scope);

			while (this.currentOffset < this.data.length)
			{
				if (this.data[this.currentOffset] == '#')
				{
					this.readComment(this.lineScope);

					if (token != '')
						return token;
					else
						return this.readToken(scope);
				}
				// '=', '{', '}' can only be a solo token
				if (token != '' &&  (this.data[this.currentOffset] == '=' || this.data[this.currentOffset] == '{' || this.data[this.currentOffset] == '}'))
				{
					break;
				}

				token += this.data[this.currentOffset];

				this.currentOffset++;

				// '=', '{' can only be a solo operator
				if (token == '=' || token == '{')
					break;

				// Whitespace breaks token
				if (this.whiteSpace.indexOf(this.data[this.currentOffset]) != -1)
					break;
				// Closing tag breaks tokens
				if (this.data[this.currentOffset] == '}')
					break;
			}

			return token == '' ? false : token;
		},

		'readComment': function (scope) {
			this.currentOffset++;
			var comment = '';

			while (this.currentOffset < this.data.length)
			{
				if (comment == '' && (this.data[this.currentOffset] == ' ' || this.data[this.currentOffset] == "\t"))
					; // Skip whitespace after '#'
				else
					comment += this.data[this.currentOffset]
				this.currentOffset++;
				if (this.data[this.currentOffset] == "\n")
				{
					this.currentOffset++;
					this.lineScope = null;
					break;
				}
			}
			scope.comments[this.currentLine] = comment;
			this.currentLine++;
		},

		'readString': function (scope) {
			var string = '';

			while (this.currentOffset < this.data.length)
			{
				this.currentOffset++;
				if (this.data[this.currentOffset] == '\\')
				{
					this.currentOffset++;
					if (this.data[this.currentOffset] == 't')
						string += "\t";
					else if (this.data[this.currentOffset] == 'n')
						string += "\n";
					else if (this.data[this.currentOffset] == 'r')
						string += "\r";
					else if (this.data[this.currentOffset] == '\\')
						string += "\\";
					else if (this.data[this.currentOffset] == '"')
						string += '"';
					else
					{
						string += this.data[this.currentOffset];
						console.log('Unknown escape char `'+ this.data[this.currentOffset] +'` at line '+ this.currentLine);
					}
				}
				else if (this.data[this.currentOffset] == '"')
				{
					this.currentOffset++;
					break;
				}
				else
				{
					string += this.data[this.currentOffset];
				}
			}
			return string;
		},
		'moveComments': function (fromScope, toScope, startline) {
			while (fromScope.comments[startline])
			{
				toScope.comments[startline] = fromScope.comments[startline];
				fromScope.comments[startline] = null;
				startline--;
			}
		},
		'writeData': function (data, indent) {
			if (indent == undefined)
				indent = -1;

			var indentTxt = this.repeatString("\t", indent);

			var txt = '';

			if (angular.isArray(data))
			{
				txt += '{' + "\n";
				txt += indentTxt + "\t";
				var lineLength = 0;
				for (var i = 0; i < data.length; i++)
				{
					var valueTxt = this.writeData(data[i]);

					lineLength += valueTxt.length + 1;

					if (lineLength + indentTxt.length*4 > 80)
					{
						txt += valueTxt + "\n" + indentTxt + "\t";
						lineLength = 0;
					}
					else
					{
						txt += valueTxt + ' ';
					}
				}
				txt += "\n" + indentTxt + '}';
			}
			else if (angular.isObject(data))
			{
				if (indent != -1)
					txt += '{' + "\n";

				var indentTxtProp = this.repeatString("\t", indent + 1);

				angular.forEach(data, function (value, key) {

					// Array of non-strings = same key used multiple times
					if (angular.isArray(value) && 'multipleKeys' in value)
					{
						for (var i = 0; i < value.length; i++)
						{
							if (value[i] !== '')
								txt += indentTxtProp + key + ' = ' + this.writeData(value[i], indent + 1) + "\n";
						}
					}
					else
					{
						if (value !== '')
							txt += indentTxtProp + key + ' = ' + this.writeData(value, indent + 1) + "\n";
					}
				}.bind(this))

				if (indent != -1)
					txt += indentTxt + '}';
			}
			else
			{
				if (isNaN(data) && (data.toString().indexOf(' ') != -1) || (data.toString().indexOf('"') != -1) || (data.toString().indexOf('\'') != -1) || (data.toString().indexOf("\n") != -1))
					txt += '"'+ data.replace('"', '\\"') + '"';
				else
					txt += data;
			}

			return txt;
		},
		'repeatString': function (string, num)
		{
			return new Array(num + 1).join(string);
		},
/*		'writePdxData': function (data, valueData) {
			if (data.type == 'rootScope')
				return this.writePdxRootScope(data);
			else if (data.type == 'object')
				return this.writePdxObject(data);
			else if (data.type == 'property')
				return this.writePdxProperty(data);
			else
				console.log('Unknown PDX data type '+ data.type);
		},
		'writePdxRootScope': function (data) {

			var txt = '';
			for (var i = 0; i < data.subNodes.length; i++)
			{
				txt += this.writePdxData(data.subNodes[i]);
				txt += "\n";
			}

			return txt;
		},
		'writePdxObject': function (data) {
			var indent = this.repeatString("\t", data.depth - 1);

			var txt = indent + data.name + ' = {' + "\n";
			for (var i = 0; i < data.subNodes.length; i++)
			{
				txt += this.writePdxData(data.subNodes[i]);
				txt += "\n";
			}
			txt += indent + '}' + "\n";

			return txt;
		},
		'writePdxProperty': function (data) {
			var indent = this.repeatString("\t", data.depth - 1);

			var txt = '';

			if (angular.isArray(data.value))
			{
				txt = indent + data.name + ' = {' + "\n";
				for (var i = 0; i < data.value.length; i++)
				{
					txt += indent + "\t" + data.value[i] +"\n";
				}
				txt += indent + '}' + "\n";
			}
			else
			{
				txt = indent + data.name + ' = ' + data.value + "\n";
			}

			return txt;
		},
*/
	};
  	return pdxScriptService;
}]);
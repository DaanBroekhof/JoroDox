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

			var base = {type: 'rootScope', name: 'pdxScript', subNodes: [], depth: 0, comments: []};

			do
			{
				token = this.readToken(base);

				if (token == false)
					break;

				var varScope = {type: 'object', name: token, subNodes: [], depth: 1, data: null, comments: []};
				base.subNodes.push(varScope);

				// Copy any comments immediately above this statement to scope
				this.moveComments(base, varScope, this.currentLine - 1);

				var assign = this.readToken(varScope);
				if (assign != '=' && assign != '{')
					console.log('Expected token `=` or `{` at line '+ this.currentLine +'`, instead got "' + token +'".');

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
					varScope.data = value;
					varScope.type = 'property';
					varScope.icon = 'asterisk';
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

					var propertyScope = {type: 'property', name: prevToken, subNodes: [], depth: scope.depth+1, value: null, comments: []};
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
						propertyScope.data = token;
					}

					// Reset token for new property
					prevToken = null;
					token = null;
				}
				else if (prevToken != null)
				{
					// value list style object
					if (scope.data == null)
						scope.data = [];

					scope.icon = 'list';

					scope.data.push(prevToken);
				}

				if (token == '}')
				{
					if (scope.subNodes.length == 0 && scope.data == null)
					{
						// Empty array input
						scope.data = [];
						scope.icon = 'list';
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
				// '=' can only be a solo operator
				if (this.data[this.currentOffset] == '=' && token != '')
					break;

				token += this.data[this.currentOffset];

				this.currentOffset++;

				// '=' can only be a solo operator
				if (token == '=')
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
		}

	};
  	return pdxScriptService;
}]);
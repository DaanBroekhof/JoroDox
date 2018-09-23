
export default class PdxScript {
  constructor() {
    this.currentLine = 0;
    this.currentOffset = 0;
    this.currentLineOffset = 0;
    this.whiteSpace = [' ', '\t', '\n', '\r'];
    this.lineScope = null;
  }

  readFile(data) {
    this.currentOffset = 0;
    this.currentLine = 1;
    this.data = data;
    this.lineScope = null;
    this.lastId = 1;
    this.errors = [];

    const base = {
      id: this.lastId,
      type: 'rootScope',
      name: 'pdxScript',
      children: [],
      depth: 0,
      comments: [],
      data: Object.create(null),
      value: null,
    };
    this.lastId += 1;

    this.readObject(base);

    return base;
  }

  readObject(scope) {
    let token = null;
    let prevToken = null;
    do {
      if (token !== null) {
        prevToken = token;
      }

      token = this.readToken(scope);

      // Allow assigning with an '=' or with an '{'
      if (token === '=' || token === '{') {
        // property style object

        const propertyScope = {
          id: this.lastId, type: 'property', name: prevToken, children: [], depth: scope.depth + 1, value: null, data: Object.create(null), comments: []
        };
        this.lastId += 1;
        scope.children.push(propertyScope);
        // Copy any comments immediately above this statement to scope
        this.moveComments(scope, propertyScope, this.currentLine - 1);

        // Value or '{' may follow '='
        if (token === '=') {
          token = this.readToken(propertyScope);
        }

        if (token === '{') {
          this.readObject(propertyScope);
        } else {
          propertyScope.type = 'property';
          propertyScope.icon = 'asterisk'; // This should not be here, presentational
          propertyScope.value = token;
          propertyScope.data = token;
        }

        if (propertyScope.name === null) {
          // value list style object
          if (!Array.isArray(scope.value)) {
            if (scope.value !== null) {
              scope.value = [scope.value];
            } else {
              scope.value = [];
            }
          }
          scope.icon = 'list'; // Should not be here.
          scope.value.push(propertyScope.value);
        } else if (scope.data[propertyScope.name]) {
          // Convert key into array if there are multiple keys with the same name
          if (!Array.isArray(scope.data[propertyScope.name]) || !scope.data[propertyScope.name].multipleKeys) {
            scope.data[propertyScope.name] = [scope.data[propertyScope.name]];
            scope.data[propertyScope.name].multipleKeys = true;
          }

          scope.data[propertyScope.name].push(propertyScope.data);
        } else {
          // Set value
          scope.data[propertyScope.name] = propertyScope.data;
        }

        do {
          const nextToken = this.lookAheadToken(scope);
          if (nextToken === ',') {
            if (!Array.isArray(scope.data[propertyScope.name])) {
              scope.data[propertyScope.name] = [scope.data[propertyScope.name]];
            }
            // Read comma token
            this.readToken(scope);
            const valueToken = this.readToken(scope);
            scope.data[propertyScope.name].push(valueToken);
          } else {
            break;
          }
        } while (true);

        // Reset token for new property
        prevToken = null;
        token = null;
      } else if (prevToken !== null) {
        // value list style object
        if (!Array.isArray(scope.value)) {
          if (scope.value !== null) {
            scope.value = [scope.value];
          } else {
            scope.value = [];
          }
        }
        scope.icon = 'list'; // Should not be here.

        scope.value.push(prevToken);
      }

      if (token === '}') {
        break;
      }
    }
    while (token !== false);

    if (scope.children.length === 0 && scope.value === null) {
      scope.value = [];
    }

    if (Array.isArray(scope.value)) {
      if (_.keys(scope.data).length === 0) {
        // Empty array input
        scope.data = scope.value;
        scope.icon = 'list'; // Should not be here.
      } else {
        scope.data._array_ = scope.value;
      }
    }
  }

  lookAheadToken(scope, stopAtNewline) {
    const lineScope = this.lineScope;
    const currentLine = this.currentLine;
    const currentOffset = this.currentOffset;
    const currentLineOffset = this.currentLineOffset;

    const token = this.readToken(scope, stopAtNewline);

    this.lineScope = lineScope;
    this.currentLine = currentLine;
    this.currentOffset = currentOffset;
    this.currentLineOffset = currentLineOffset;

    return token;
  }

  readToken(scope, stopAtNewline) {
    // Skip first whitespace
    while (this.whiteSpace.indexOf(this.data[this.currentOffset]) !== -1) {
      this.currentOffset++;
      if (this.data[this.currentOffset] === '\n') {
        this.lineScope = null;
        this.currentLine++;
        this.currentLineOffset = this.currentOffset;

        if (stopAtNewline) {
          return false;
        }
      }
    }

    // Keep track of deepest scope in current line (for comments)
    if (!this.lineScope || scope.depth > this.lineScope.depth) {
      this.lineScope = scope;
    }

    let token = '';

    if (this.data[this.currentOffset] === '"') {
      return this.readString(scope);
    }

    while (this.currentOffset < this.data.length) {
      if (this.data[this.currentOffset] === '#') {
        this.readComment(this.lineScope);

        if (token !== '') {
          return token;
        }
        return this.readToken(scope);
      }
      // '=', '{', '}' can only be a solo token
      if (token !== '' && (this.data[this.currentOffset] === '=' || this.data[this.currentOffset] === '{' || this.data[this.currentOffset] === '}' || this.data[this.currentOffset] === ',')) {
        break;
      }

      token += this.data[this.currentOffset];

      this.currentOffset += 1;

      // '=', '{' and '}' can only be a solo operator
      if (token === '=' || token === '{' || token === '}') {
        break;
      }

      if (token === ',') {
        break;
      }


      // Whitespace breaks token
      if (this.whiteSpace.indexOf(this.data[this.currentOffset]) !== -1) {
        break;
      }
      // Closing tag breaks tokens
      if (this.data[this.currentOffset] === '}') {
        break;
      }
    }

    // Convert numeric values
    if (!isNaN(token) && token !== '') {
      token = +token;
    }

    return token === '' ? false : token;
  }

  readComment(scope) {
    this.currentOffset += 1;
    let comment = '';

    while (this.currentOffset < this.data.length) {
      if (comment === '' && (this.data[this.currentOffset] === ' ' || this.data[this.currentOffset] === '\t')) {
        // Skip whitespace after '#'
      } else {
        comment += this.data[this.currentOffset];
      }
      this.currentOffset += 1;
      if (this.data[this.currentOffset] === '\n') {
        this.currentOffset += 1;
        this.lineScope = null;
        break;
      }
    }
    scope.comments[this.currentLine] = comment;
    this.currentLine += 1;
  }

  readString(scope) {
    let string = '';

    while (this.currentOffset < this.data.length) {
      this.currentOffset += 1;
      if (this.data[this.currentOffset] === '"') {
        this.currentOffset += 1;
        break;
      } else {
        string += this.data[this.currentOffset];
      }
    }
    return string;
  }

  moveComments(fromScope, toScope, startline) {
    while (fromScope.comments[startline]) {
      toScope.comments[startline] = fromScope.comments[startline];
      fromScope.comments[startline] = null;
      startline -= 1;
    }
  }

  writeData(data, indent) {
    if (indent === undefined) {
      indent = -1;
    }

    const indentTxt = this.repeatString('\t', indent);

    let txt = '';

    if (Array.isArray(data)) {
      txt += '{\n';
      txt += `${indentTxt}\t`;
      let lineLength = 0;
      for (let i = 0; i < data.length; i += 1) {
        const valueTxt = this.writeData(data[i]);

        lineLength += valueTxt.length + 1;

        if (lineLength + (indentTxt.length * 4) > 80) {
          txt += `${valueTxt}\n${indentTxt}\t`;
          lineLength = 0;
        } else {
          txt += `${valueTxt} `;
        }
      }
      txt += `\n${indentTxt}}`;
    } else if (Array.isObject(data)) {
      if (indent !== -1) {
        txt += '{\n';
      }

      const indentTxtProp = this.repeatString('\t', indent + 1);

      Array.forEach(data, (value, key) => {
        // Array of non-strings = same key used multiple times
        if (Array.isArray(value) && 'multipleKeys' in value) {
          for (let i = 0; i < value.length; i += 1) {
            if (value[i] !== '') {
              txt += `${indentTxtProp + key} = ${this.writeData(value[i], indent + 1)}\n`;
            }
          }
        } else
        if (value !== '') {
          txt += `${indentTxtProp + key} = ${this.writeData(value, indent + 1)}\n`;
        }
      });

      if (indent !== -1) {
        txt += `${indentTxt}}`;
      }
    } else if (Number.isNaN(data) && (
      (data.toString().indexOf(' ') !== -1)
      || (data.toString().indexOf('"') !== -1)
      || (data.toString().indexOf('\'') !== -1)
      || (data.toString().indexOf('\n') !== -1)
    )) {
      txt += `"${data.replace('"', '\\"')}"`;
    } else {
      txt += data;
    }

    return txt;
  }

  repeatString(string, num) {
    return new Array(num + 1).join(string);
  }

/*
    'writePdxData': function (data, valueData) {
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

        let txt = '';
        for (let i = 0; i < data.children.length; i++)
        {
            txt += this.writePdxData(data.children[i]);
            txt += "\n";
        }

        return txt;
    },
    'writePdxObject': function (data) {
        let indent = this.repeatString("\t", data.depth - 1);

        let txt = indent + data.name + ' = {' + "\n";
        for (let i = 0; i < data.children.length; i++)
        {
            txt += this.writePdxData(data.children[i]);
            txt += "\n";
        }
        txt += indent + '}' + "\n";

        return txt;
    },
    'writePdxProperty': function (data) {
        let indent = this.repeatString("\t", data.depth - 1);

        let txt = '';

        if (Array.isArray(data.value))
        {
            txt = indent + data.name + ' = {' + "\n";
            for (let i = 0; i < data.value.length; i++)
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
}


export default class PdxScript {
    constructor() {
        this.currentLine = 0;
        this.currentOffset = 0;
        this.currentLineOffset = 0;
        this.whiteSpace = [' ', "\t", "\n", "\r"];
        this.lineScope = null;
    }

    readFile(data) {
        this.currentOffset = 0;
        this.currentLine = 1;
        this.data = data;
        this.lineScope = null;
        this.lastId = 1;
        this.errors = [];

        let base = {id: this.lastId++, type: 'rootScope', name: 'pdxScript', children: [], depth: 0, comments: [], 'data' : {}};
        let token = false;

        do
        {
            token = this.readToken(base);

            if (token === false)
                break;

            let varScope = {id: this.lastId++, type: 'object', name: token, children: [], depth: 1, value: null, data: {}, comments: []};
            base.children.push(varScope);

            // Copy any comments immediately above this statement to scope
            this.moveComments(base, varScope, this.currentLine - 1);

            let assign = this.readToken(varScope);
            if (assign !== '=' && assign !== '{') {
                this.errors.push('Expected token `=` or `{` at line ' + this.currentLine + '`, instead got "' + assign + '".');
            }

            let value = assign;

            // Allow assigning with and '=' or with an '{'
            if (assign === '=')
                value = this.readToken(varScope);

            if (value === '{')
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
                if (!Array.isArray(base.data[varScope.name]))
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
        while (token !== false);

        return base;
    }

    readObject (scope) {
        let token = null;
        let prevToken = null;
        do
        {
            if (token !== null)
                prevToken = token;

            token = this.readToken(scope);

            // Allow assigning with and '=' or with an '{'
            if (token === '=' || token === '{')
            {
                // property style object

                let propertyScope = {id: this.lastId++, type: 'property', name: prevToken, children: [], depth: scope.depth+1, value: null, data: {}, comments: []};
                scope.children.push(propertyScope);
                // Copy any comments immediately above this statement to scope
                this.moveComments(scope, propertyScope, this.currentLine - 1);

                // Value or '{' may follow '='
                if (token === '=')
                    token = this.readToken(propertyScope);

                if (token === '{')
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
                    if (!Array.isArray(scope.data[propertyScope.name]))
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
            else if (prevToken !== null)
            {
                // value list style object
                if (scope.value === null)
                    scope.value = [];

                scope.icon = 'list';

                scope.value.push(prevToken);

                scope.data = scope.value;
            }

            if (token === '}')
            {
                if (scope.children.length === 0 && scope.value === null)
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
    }

    readToken(scope) {

        // Skip first whitespace
        while (this.whiteSpace.indexOf(this.data[this.currentOffset]) !== -1)
        {
            if (this.data[this.currentOffset] === "\n")
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

        let token = '';

        if (this.data[this.currentOffset] === '"')
            return this.readString(scope);

        while (this.currentOffset < this.data.length)
        {
            if (this.data[this.currentOffset] === '#')
            {
                this.readComment(this.lineScope);

                if (token !== '')
                    return token;
                else
                    return this.readToken(scope);
            }
            // '=', '{', '}' can only be a solo token
            if (token !== '' &&  (this.data[this.currentOffset] === '=' || this.data[this.currentOffset] === '{' || this.data[this.currentOffset] === '}'))
            {
                break;
            }

            token += this.data[this.currentOffset];

            this.currentOffset++;

            // '=', '{' can only be a solo operator
            if (token === '=' || token === '{')
                break;

            // Whitespace breaks token
            if (this.whiteSpace.indexOf(this.data[this.currentOffset]) !== -1)
                break;
            // Closing tag breaks tokens
            if (this.data[this.currentOffset] === '}')
                break;
        }

        return token === '' ? false : token;
    }

    readComment(scope) {
        this.currentOffset++;
        let comment = '';

        while (this.currentOffset < this.data.length)
        {
            if (comment === '' && (this.data[this.currentOffset] === ' ' || this.data[this.currentOffset] === "\t"))
                ; // Skip whitespace after '#'
            else
                comment += this.data[this.currentOffset]
            this.currentOffset++;
            if (this.data[this.currentOffset] === "\n")
            {
                this.currentOffset++;
                this.lineScope = null;
                break;
            }
        }
        scope.comments[this.currentLine] = comment;
        this.currentLine++;
    }

    readString(scope) {
        let string = '';

        while (this.currentOffset < this.data.length)
        {
            this.currentOffset++;
            if (this.data[this.currentOffset] === '\\')
            {
                this.currentOffset++;
                if (this.data[this.currentOffset] === 't')
                    string += "\t";
                else if (this.data[this.currentOffset] === 'n')
                    string += "\n";
                else if (this.data[this.currentOffset] === 'r')
                    string += "\r";
                else if (this.data[this.currentOffset] === '\\')
                    string += "\\";
                else if (this.data[this.currentOffset] === '"')
                    string += '"';
                else
                {
                    string += this.data[this.currentOffset];
                    this.errors.push('Unknown escape char `'+ this.data[this.currentOffset] +'` at line '+ this.currentLine);
                }
            }
            else if (this.data[this.currentOffset] === '"')
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
    }

    moveComments(fromScope, toScope, startline) {
        while (fromScope.comments[startline])
        {
            toScope.comments[startline] = fromScope.comments[startline];
            fromScope.comments[startline] = null;
            startline--;
        }
    }

    writeData(data, indent) {
        if (indent === undefined)
            indent = -1;

        let indentTxt = this.repeatString("\t", indent);

        let txt = '';

        if (Array.isArray(data))
        {
            txt += '{' + "\n";
            txt += indentTxt + "\t";
            let lineLength = 0;
            for (let i = 0; i < data.length; i++)
            {
                let valueTxt = this.writeData(data[i]);

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
        else if (Array.isObject(data))
        {
            if (indent !== -1)
                txt += '{' + "\n";

            let indentTxtProp = this.repeatString("\t", indent + 1);

            Array.forEach(data, function (value, key) {

                // Array of non-strings = same key used multiple times
                if (Array.isArray(value) && 'multipleKeys' in value)
                {
                    for (let i = 0; i < value.length; i++)
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
            }.bind(this));

            if (indent !== -1)
                txt += indentTxt + '}';
        }
        else
        {
            if (isNaN(data) && (data.toString().indexOf(' ') !== -1) || (data.toString().indexOf('"') !== -1) || (data.toString().indexOf('\'') !== -1) || (data.toString().indexOf("\n") !== -1))
                txt += '"'+ data.replace('"', '\\"') + '"';
            else
                txt += data;
        }

        return txt;
    }

    repeatString(string, num)
    {
        return new Array(num + 1).join(string);
    }
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
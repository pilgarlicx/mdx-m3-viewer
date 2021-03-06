/**
 * Used to read and write structured text formats.
 */
export default class TokenStream {
    /**
     * @param {?string} buffer
     */
    constructor(buffer) {
        this.buffer = buffer || '';
        this.index = 0;
        this.ident = 0; // Used for writing blocks nicely.
    }

    /**
     * Reads the next token in the stream.
     * Whitespaces are ignored outside of strings in the form of "".
     * Comments in the form of // are ignored.
     * Commas and colons are ignored as well.
     * Curly braces are used as separators, generally to denote text blocks.
     * 
     * For example, given the following string:
     * 
     *     Header "A String" {
     *         Name Value, // A Comment
     *     }
     * 
     * Read will return the values in order:
     * 
     *     Header
     *     "A String"
     *     {
     *     Name
     *     Value
     *     }
     * 
     * There are wrappers around read, below, that help to read structured code, check them out!
     */
    read() {
        let buffer = this.buffer,
            length = buffer.length,
            inComment = false,
            inString = false,
            token = '';

        while (this.index < length) {
            let c = buffer[this.index++];

            if (inComment) {
                if (c === '\n') {
                    inComment = false;
                }
            } else if (inString) {
                if (c === '"') {
                    return token;
                } else {
                    token += c;
                }
            } else if (c === ' ' || c === ',' || c === '\t' || c === '\n' || c === ':' || c === '\r') {
                if (token.length) {
                    return token;
                }
            } else if (c === '{' || c === '}') {
                if (token.length) {
                    this.index--;
                    return token;
                } else {
                    return c;
                }
            } else if (c === '/' && buffer[this.index] === '/') {
                if (token.length) {
                    this.index--;
                    return token;
                } else {
                    inComment = true;
                }
            } else if (c === '"') {
                if (token.length) {
                    this.index--;
                    return token;
                } else {
                    inString = true;
                }
            } else {
                token += c;
            }
        }
    }

    /** 
     * Reads the next token without advancing the stream.
     */
    peek() {
        let index = this.index,
            value = this.read();

        this.index = index;

        return value;
    }

    /**
     * Reads the next token, and parses it as an integer.
     */
    readInt() {
        return parseInt(this.read());
    }

    /**
     * Reads the next token, and parses it as a float.
     */
    readFloat() {
        return parseFloat(this.read());
    }

    /**
     * Reads an array of integers in the form:
     * 
     *     { Value1, Value2, ..., ValueN }
     */
    readIntArray(view) {
        this.read(); // {

        for (let i = 0, l = view.length; i < l; i++) {
            view[i] = this.readInt();
        }

        this.read(); // }

        return view;
    }

    /**
     * Reads an array of floats in the form:
     * 
     *     { Value1, Value2, ..., ValueN }
     */
    readFloatArray(view) {
        this.read(); // {

        for (let i = 0, l = view.length; i < l; i++) {
            view[i] = this.readFloat();
        }

        this.read(); // }

        return view;
    }

    /**
     * Reads a color in the form:
     * 
     *      { R, G, B }
     * 
     * The color is sizzled to BGR.
     * 
     * @param {Float32Array} view 
     */
    readColor(view) {
        this.read(); // {

        view[2] = this.readFloat();
        view[1] = this.readFloat();
        view[0] = this.readFloat();

        this.read(); // }
    }

    /**
     * {
     *     { Value1, Value2, ..., ValueSize },
     *     { Value1, Value2, ..., ValueSize },
     *     ...
     * }
     * 
     * @param {TypedArray} view 
     * @param {number} size 
     */
    readVectorArray(view, size) {
        this.read(); // {

        for (let i = 0, l = view.length / size; i < l; i++) {
            this.read(); // {

            for (let j = 0; j < size; j++) {
                view[i * size + j] = this.readFloat();
            }

            this.read(); // }
        }

        this.read(); // }

        return view;
    }

    /**
     * Helper generator for block reading.
     * Let's say we have a block like so:
     *     {
     *         Key1 Value1
     *         Key2 Value2
     *         ...
     *         KeyN ValueN
     *     }
     * The generator yields the keys one by one, and the caller needs to read the values based on the keys.
     * It is used for most MDL blocks.
     */
    *readBlock() {
        this.read(); // {

        let token = this.read();

        while (token !== '}') {
            yield token;

            token = this.read();
        }
    }

    /**
     * Writes a color in the form:
     * 
     *      { B, G, R }
     * 
     * The color is sizzled to RGB.
     * 
     * @param {string} name 'Color' or 'static Color'.
     * @param {Float32Array} view 
     */
    writeColor(name, view) {
        this.writeLine(`${name} { ${view[2]}, ${view[1]}, ${view[0]} },`);
    }

    /**
     * Flag,
     * 
     * @param {string} flag 
     */
    writeFlag(flag) {
        this.writeLine(`${flag},`);
    }

    /**
     * Name Value,
     * 
     * @param {string} name
     * @param {number|string} value 
     */
    writeAttrib(name, value) {
        this.writeLine(`${name} ${value},`)
    }

    /**
     * Name "Value",
     * 
     * @param {string} name
     * @param {string} value 
     */
    writeStringAttrib(name, value) {
        this.writeLine(`${name} "${value}",`)
    }

    /**
     * Name { Value0, Value1, ..., ValueN },
     * 
     * @param {string} name 
     * @param {TypedArray} value 
     */
    writeArrayAttrib(name, value) {
        this.writeLine(`${name} { ${value.join(', ')} },`);
    }

    /**
     * { Value0, Value1, ..., ValueN },
     * 
     * @param {string} name 
     * @param {TypedArray} value 
     */
    writeArray(value) {
        this.writeLine(`{ ${value.join(', ')} },`);
    }

    /**
     * Name Entries {
     *     { Value1, Value2, ..., valueSize },
     *     { Value1, Value2, ..., valueSize },
     *     ...
     * }
     * 
     * @param {string} name 
     * @param {TypedArray} view 
     * @param {number} size 
     */
    writeVectorArray(name, view, size) {
        this.startBlock(name, view.length / size);

        for (let i = 0, l = view.length; i < l; i += size) {
            this.writeArray(view.subarray(i, i + size));
        }

        this.endBlock();
    }

    /**
     * Adds the given string to the buffer.
     * 
     * @param {string} s 
     */
    write(s) {
        this.buffer += s;
    }

    /**
     * Adds the given string to the buffer.
     * The current indentation level is prepended, and the stream goes to the next line after the write.
     * 
     * @param {string} line 
     */
    writeLine(line) {
        this.buffer += `${'\t'.repeat(this.ident)}${line}\n`;
    }

    /**
     * Starts a new block in the form:
     * 
     *      Header1 Header2 ... HeaderN {
     *          ...
     *      }
     * 
     * @param {...string} headers 
     */
    startBlock(...headers) {
        if (headers.length) {
            this.writeLine(`${headers.join(' ')} {`);
        } else {
            this.writeLine('{');
        }

        this.ident += 1;
    }

    /**
     * Starts a new block in the form:
     * 
     *      Header "Name" {
     *          ...
     *      }
     * 
     * @param {string} header 
     * @param {string} name 
     */
    startObjectBlock(header, name) {
        this.writeLine(`${header} "${name}" {`);
        this.ident += 1;
    }

    /**
     * Ends a previously started block, and handles the indentation.
     */
    endBlock() {
        this.ident -= 1;
        this.writeLine('}');
    }

    /**
     * Increases the indentation level for following line writes.
     */
    indent() {
        this.ident += 1;
    }

    /**
     * Decreases the indentation level for following line writes.
     */
    unindent() {
        this.ident -= 1;
    }
};

const { ConfigValidator } = require("../..");
const { expect } = require('chai');
const log = require("../log");

describe("ConfigValidator", function() {
    var validator;

    beforeEach(
    /** @this */
    function() {
        log.beforeEach(this);
        validator = new ConfigValidator({
            type: "object",
            properties: {
                foo: {
                    type: "object",
                    properties: {
                        bar: {
                            type: "integer"
                        }
                    }
                }
            }
        });
    });

    it("should be able to validate against a schema object", function() {
        var input = {
            foo: {
                bar: 42,
                allowExtras: "yup"
            }
        };
        var output = validator.validate(input);
        expect(input).to.equal(output);
    });

    it("should combine with a default config", function() {
        var input = {
            foo: {
                bar: 42,
                allowExtras: "yup"
            }
        };
        var defaults = {
            flibble: "wibble",
            foo: {
                baz: 100
            }
        };
        var output = validator.validate(input, defaults);
        expect(output).to.equal({
            flibble: "wibble",
            foo: {
                bar: 42,
                allowExtras: "yup",
                baz: 100
            }
        });
        // Ensure defaults isn't modified
        expect(defaults).to.equal({
            flibble: "wibble",
            foo: {
                baz: 100
            }
        });
    });

    it("should throw an error for invalid configs", function() {
        var input = {
            foo: {
                bar: "not a number",
            }
        };
        expect(function() {
            validator.validate(input);
        }).to.throw();
    });
});

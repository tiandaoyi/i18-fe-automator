export default mustache;
declare namespace mustache {
    /**
     * Clears all cached templates in the default writer.
     */
    export function clearCache(): void;
    /**
     * Parses and caches the given template in the default writer and returns the
     * array of tokens it contains. Doing this ahead of time avoids the need to
     * parse templates on the fly as they are rendered.
     */
    export function parse(template: any, tags: any): any;
    /**
     * Renders the `template` with the given `view`, `partials`, and `config`
     * using the default writer.
     */
    export function render(template: any, view: any, partials: any, config: any): string;
    export { escapeHtml as escape };
    export { Scanner };
    export { Context };
    export { Writer };
}
declare function escapeHtml(string: any): string;
/**
 * A simple string scanner that is used by the template parser to find
 * tokens in template strings.
 */
declare function Scanner(string: any): void;
declare class Scanner {
    /**
     * A simple string scanner that is used by the template parser to find
     * tokens in template strings.
     */
    constructor(string: any);
    string: any;
    tail: any;
    pos: number;
    /**
     * Returns `true` if the tail is empty (end of string).
     */
    eos(): boolean;
    /**
     * Tries to match the given regular expression at the current position.
     * Returns the matched text if it can match, the empty string otherwise.
     */
    scan(re: any): any;
    /**
     * Skips all text until the given regular expression can be matched. Returns
     * the skipped string, which is the entire tail if no match can be made.
     */
    scanUntil(re: any): any;
}
/**
 * Represents a rendering context by wrapping a view object and
 * maintaining a reference to the parent context.
 */
declare function Context(view: any, parentContext: any): void;
declare class Context {
    /**
     * Represents a rendering context by wrapping a view object and
     * maintaining a reference to the parent context.
     */
    constructor(view: any, parentContext: any);
    view: any;
    cache: {
        '.': any;
    };
    parent: any;
    /**
     * Creates a new context using the given view with this context
     * as the parent.
     */
    push(view: any): Context;
    /**
     * Returns the value of the given name in this context, traversing
     * up the context hierarchy if the value is absent in this context's view.
     */
    lookup(name: any): any;
}
/**
 * A Writer knows how to take a stream of tokens and render them to a
 * string, given a context. It also maintains a cache of templates to
 * avoid the need to parse the same template twice.
 */
declare function Writer(): void;
declare class Writer {
    templateCache: {
        _cache: {};
        set: (key: any, value: any) => void;
        get: (key: any) => any;
    };
    /**
     * Clears all cached templates in this writer.
     */
    clearCache(): void;
    /**
     * Parses and caches the given `template` according to the given `tags` or
     * `mustache.tags` if `tags` is omitted,  and returns the array of tokens
     * that is generated from the parse.
     */
    parse(template: any, tags: any): any;
    /**
     * High-level method that is used to render the given `template` with
     * the given `view`.
     *
     * The optional `partials` argument may be an object that contains the
     * names and templates of partials that are used in the template. It may
     * also be a function that is used to load partial templates on the fly
     * that takes a single argument: the name of the partial.
     *
     * If the optional `config` argument is given here, then it should be an
     * object with a `tags` attribute or an `escape` attribute or both.
     * If an array is passed, then it will be interpreted the same way as
     * a `tags` attribute on a `config` object.
     *
     * The `tags` attribute of a `config` object must be an array with two
     * string values: the opening and closing tags used in the template (e.g.
     * [ "<%", "%>" ]). The default is to mustache.tags.
     *
     * The `escape` attribute of a `config` object must be a function which
     * accepts a string as input and outputs a safely escaped string.
     * If an `escape` function is not provided, then an HTML-safe string
     * escaping function is used as the default.
     */
    render(template: any, view: any, partials: any, config: any): string;
    /**
     * Low-level method that renders the given array of `tokens` using
     * the given `context` and `partials`.
     *
     * Note: The `originalTemplate` is only ever used to extract the portion
     * of the original template that was contained in a higher-order section.
     * If the template doesn't use higher-order sections, this argument may
     * be omitted.
     */
    renderTokens(tokens: any, context: any, partials: any, originalTemplate: any, config: any): string;
    renderSection(token: any, context: any, partials: any, originalTemplate: any, config: any): string | undefined;
    renderInverted(token: any, context: any, partials: any, originalTemplate: any, config: any): string | undefined;
    indentPartial(partial: any, indentation: any, lineHasNonSpace: any): any;
    renderPartial(token: any, context: any, partials: any, config: any): string | undefined;
    unescapedValue(token: any, context: any): any;
    escapedValue(token: any, context: any, config: any): any;
    rawValue(token: any): any;
    getConfigTags(config: any): any;
    getConfigEscape(config: any): any;
}

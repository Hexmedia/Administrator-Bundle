
                /* File: temp/default/src/dependencies/rangy/rangy-core.js */
                /**
 * Rangy, a cross-browser JavaScript range and selection library
 * http://code.google.com/p/rangy/
 *
 * Copyright 2013, Tim Down
 * Licensed under the MIT license.
 * Version: 1.3alpha.783
 * Build date: 28 June 2013
 */

(function(global) {
    var amdSupported = (typeof global.define == "function" && global.define.amd);

    var OBJECT = "object", FUNCTION = "function", UNDEFINED = "undefined";

    // Minimal set of properties required for DOM Level 2 Range compliance. Comparison constants such as START_TO_START
    // are omitted because ranges in KHTML do not have them but otherwise work perfectly well. See issue 113.
    var domRangeProperties = ["startContainer", "startOffset", "endContainer", "endOffset", "collapsed",
        "commonAncestorContainer"];

    // Minimal set of methods required for DOM Level 2 Range compliance
    var domRangeMethods = ["setStart", "setStartBefore", "setStartAfter", "setEnd", "setEndBefore",
        "setEndAfter", "collapse", "selectNode", "selectNodeContents", "compareBoundaryPoints", "deleteContents",
        "extractContents", "cloneContents", "insertNode", "surroundContents", "cloneRange", "toString", "detach"];

    var textRangeProperties = ["boundingHeight", "boundingLeft", "boundingTop", "boundingWidth", "htmlText", "text"];

    // Subset of TextRange's full set of methods that we're interested in
    var textRangeMethods = ["collapse", "compareEndPoints", "duplicate", "moveToElementText", "parentElement", "select",
        "setEndPoint", "getBoundingClientRect"];

    /*----------------------------------------------------------------------------------------------------------------*/

    // Trio of functions taken from Peter Michaux's article:
    // http://peter.michaux.ca/articles/feature-detection-state-of-the-art-browser-scripting
    function isHostMethod(o, p) {
        var t = typeof o[p];
        return t == FUNCTION || (!!(t == OBJECT && o[p])) || t == "unknown";
    }

    function isHostObject(o, p) {
        return !!(typeof o[p] == OBJECT && o[p]);
    }

    function isHostProperty(o, p) {
        return typeof o[p] != UNDEFINED;
    }

    // Creates a convenience function to save verbose repeated calls to tests functions
    function createMultiplePropertyTest(testFunc) {
        return function(o, props) {
            var i = props.length;
            while (i--) {
                if (!testFunc(o, props[i])) {
                    return false;
                }
            }
            return true;
        };
    }

    // Next trio of functions are a convenience to save verbose repeated calls to previous two functions
    var areHostMethods = createMultiplePropertyTest(isHostMethod);
    var areHostObjects = createMultiplePropertyTest(isHostObject);
    var areHostProperties = createMultiplePropertyTest(isHostProperty);

    function isTextRange(range) {
        return range && areHostMethods(range, textRangeMethods) && areHostProperties(range, textRangeProperties);
    }

    function getBody(doc) {
        return isHostObject(doc, "body") ? doc.body : doc.getElementsByTagName("body")[0];
    }

    var modules = {};

    var api = {
        version: "1.3alpha.783",
        initialized: false,
        supported: true,

        util: {
            isHostMethod: isHostMethod,
            isHostObject: isHostObject,
            isHostProperty: isHostProperty,
            areHostMethods: areHostMethods,
            areHostObjects: areHostObjects,
            areHostProperties: areHostProperties,
            isTextRange: isTextRange,
            getBody: getBody
        },

        features: {},

        modules: modules,
        config: {
            alertOnFail: true,
            alertOnWarn: false,
            preferTextRange: false
        }
    };

    function consoleLog(msg) {
        if (isHostObject(window, "console") && isHostMethod(window.console, "log")) {
            window.console.log(msg);
        }
    }

    function alertOrLog(msg, shouldAlert) {
        if (shouldAlert) {
            window.alert(msg);
        } else  {
            consoleLog(msg);
        }
    }

    function fail(reason) {
        api.initialized = true;
        api.supported = false;
        alertOrLog("Rangy is not supported on this page in your browser. Reason: " + reason, api.config.alertOnFail);
    }

    api.fail = fail;

    function warn(msg) {
        alertOrLog("Rangy warning: " + msg, api.config.alertOnWarn);
    }

    api.warn = warn;

    // Add utility extend() method
    if ({}.hasOwnProperty) {
        api.util.extend = function(obj, props, deep) {
            var o, p;
            for (var i in props) {
                if (props.hasOwnProperty(i)) {
                    o = obj[i];
                    p = props[i];
                    //if (deep) alert([o !== null, typeof o == "object", p !== null, typeof p == "object"])
                    if (deep && o !== null && typeof o == "object" && p !== null && typeof p == "object") {
                        api.util.extend(o, p, true);
                    }
                    obj[i] = p;
                }
            }
            return obj;
        };
    } else {
        fail("hasOwnProperty not supported");
    }

    // Test whether Array.prototype.slice can be relied on for NodeLists and use an alternative toArray() if not
    (function() {
        var el = document.createElement("div");
        el.appendChild(document.createElement("span"));
        var slice = [].slice;
        var toArray;
        try {
            if (slice.call(el.childNodes, 0)[0].nodeType == 1) {
                toArray = function(arrayLike) {
                    return slice.call(arrayLike, 0);
                };
            }
        } catch (e) {}

        if (!toArray) {
            toArray = function(arrayLike) {
                var arr = [];
                for (var i = 0, len = arrayLike.length; i < len; ++i) {
                    arr[i] = arrayLike[i];
                }
                return arr;
            };
        }

        api.util.toArray = toArray;
    })();


    // Very simple event handler wrapper function that doesn't attempt to solve issues such as "this" handling or
    // normalization of event properties
    var addListener;
    if (isHostMethod(document, "addEventListener")) {
        addListener = function(obj, eventType, listener) {
            obj.addEventListener(eventType, listener, false);
        };
    } else if (isHostMethod(document, "attachEvent")) {
        addListener = function(obj, eventType, listener) {
            obj.attachEvent("on" + eventType, listener);
        };
    } else {
        fail("Document does not have required addEventListener or attachEvent method");
    }

    api.util.addListener = addListener;

    var initListeners = [];

    function getErrorDesc(ex) {
        return ex.message || ex.description || String(ex);
    }

    // Initialization
    function init() {
        if (api.initialized) {
            return;
        }
        var testRange;
        var implementsDomRange = false, implementsTextRange = false;

        // First, perform basic feature tests

        if (isHostMethod(document, "createRange")) {
            testRange = document.createRange();
            if (areHostMethods(testRange, domRangeMethods) && areHostProperties(testRange, domRangeProperties)) {
                implementsDomRange = true;
            }
            testRange.detach();
        }

        var body = getBody(document);
        if (!body || body.nodeName.toLowerCase() != "body") {
            fail("No body element found");
            return;
        }

        if (body && isHostMethod(body, "createTextRange")) {
            testRange = body.createTextRange();
            if (isTextRange(testRange)) {
                implementsTextRange = true;
            }
        }

        if (!implementsDomRange && !implementsTextRange) {
            fail("Neither Range nor TextRange are available");
            return;
        }

        api.initialized = true;
        api.features = {
            implementsDomRange: implementsDomRange,
            implementsTextRange: implementsTextRange
        };

        // Initialize modules
        var module, errorMessage;
        for (var moduleName in modules) {
            if ( (module = modules[moduleName]) instanceof Module ) {
                module.init(module, api);
            }
        }

        // Call init listeners
        for (var i = 0, len = initListeners.length; i < len; ++i) {
            try {
                initListeners[i](api);
            } catch (ex) {
                errorMessage = "Rangy init listener threw an exception. Continuing. Detail: " + getErrorDesc(ex);
                consoleLog(errorMessage);
            }
        }
    }

    // Allow external scripts to initialize this library in case it's loaded after the document has loaded
    api.init = init;

    // Execute listener immediately if already initialized
    api.addInitListener = function(listener) {
        if (api.initialized) {
            listener(api);
        } else {
            initListeners.push(listener);
        }
    };

    var createMissingNativeApiListeners = [];

    api.addCreateMissingNativeApiListener = function(listener) {
        createMissingNativeApiListeners.push(listener);
    };

    function createMissingNativeApi(win) {
        win = win || window;
        init();

        // Notify listeners
        for (var i = 0, len = createMissingNativeApiListeners.length; i < len; ++i) {
            createMissingNativeApiListeners[i](win);
        }
    }

    api.createMissingNativeApi = createMissingNativeApi;

    function Module(name, dependencies, initializer) {
        this.name = name;
        this.dependencies = dependencies;
        this.initialized = false;
        this.supported = false;
        this.initializer = initializer;
    }

    Module.prototype = {
        init: function(api) {
            var requiredModuleNames = this.dependencies || [];
            for (var i = 0, len = requiredModuleNames.length, requiredModule, moduleName; i < len; ++i) {
                moduleName = requiredModuleNames[i];

                requiredModule = modules[moduleName];
                if (!requiredModule || !(requiredModule instanceof Module)) {
                    throw new Error("required module '" + moduleName + "' not found");
                }

                requiredModule.init();

                if (!requiredModule.supported) {
                    throw new Error("required module '" + moduleName + "' not supported");
                }
            }

            // Now run initializer
            this.initializer(this)
        },

        fail: function(reason) {
            this.initialized = true;
            this.supported = false;
            throw new Error("Module '" + this.name + "' failed to load: " + reason);
        },

        warn: function(msg) {
            api.warn("Module " + this.name + ": " + msg);
        },

        deprecationNotice: function(deprecated, replacement) {
            api.warn("DEPRECATED: " + deprecated + " in module " + this.name + "is deprecated. Please use "
                + replacement + " instead");
        },

        createError: function(msg) {
            return new Error("Error in Rangy " + this.name + " module: " + msg);
        }
    };

    function createModule(isCore, name, dependencies, initFunc) {
        var newModule = new Module(name, dependencies, function(module) {
            if (!module.initialized) {
                module.initialized = true;
                try {
                    initFunc(api, module);
                    module.supported = true;
                } catch (ex) {
                    var errorMessage = "Module '" + name + "' failed to load: " + getErrorDesc(ex);
                    consoleLog(errorMessage);
                }
            }
        });
        modules[name] = newModule;

/*
        // Add module AMD support
        if (!isCore && amdSupported) {
            global.define(["rangy-core"], function(rangy) {

            });
        }
*/
    }

    api.createModule = function(name) {
        // Allow 2 or 3 arguments (second argument is an optional array of dependencies)
        var initFunc, dependencies;
        if (arguments.length == 2) {
            initFunc = arguments[1];
            dependencies = [];
        } else {
            initFunc = arguments[2];
            dependencies = arguments[1];
        }
        createModule(false, name, dependencies, initFunc);
    };

    api.createCoreModule = function(name, dependencies, initFunc) {
        createModule(true, name, dependencies, initFunc);
    };

    /*----------------------------------------------------------------------------------------------------------------*/

    // Ensure rangy.rangePrototype and rangy.selectionPrototype are available immediately

    function RangePrototype() {}
    api.RangePrototype = RangePrototype;
    api.rangePrototype = new RangePrototype();

    function SelectionPrototype() {}
    api.selectionPrototype = new SelectionPrototype();

    /*----------------------------------------------------------------------------------------------------------------*/

    // Wait for document to load before running tests

    var docReady = false;

    var loadHandler = function(e) {
        if (!docReady) {
            docReady = true;
            if (!api.initialized) {
                init();
            }
        }
    };

    // Test whether we have window and document objects that we will need
    if (typeof window == UNDEFINED) {
        fail("No window found");
        return;
    }
    if (typeof document == UNDEFINED) {
        fail("No document found");
        return;
    }

    if (isHostMethod(document, "addEventListener")) {
        document.addEventListener("DOMContentLoaded", loadHandler, false);
    }

    // Add a fallback in case the DOMContentLoaded event isn't supported
    addListener(window, "load", loadHandler);

    /*----------------------------------------------------------------------------------------------------------------*/

    // AMD, for those who like this kind of thing

    if (amdSupported) {
        // AMD. Register as an anonymous module.
        global.define(function() {
            api.amd = true;
            return api;
        });
    }

    // Create a "rangy" property of the global object in any case. Other Rangy modules (which use Rangy's own simple
    // module system) rely on the existence of this global property
    global.rangy = api;
})(this);

rangy.createCoreModule("DomUtil", [], function(api, module) {
    var UNDEF = "undefined";
    var util = api.util;

    // Perform feature tests
    if (!util.areHostMethods(document, ["createDocumentFragment", "createElement", "createTextNode"])) {
        module.fail("document missing a Node creation method");
    }

    if (!util.isHostMethod(document, "getElementsByTagName")) {
        module.fail("document missing getElementsByTagName method");
    }

    var el = document.createElement("div");
    if (!util.areHostMethods(el, ["insertBefore", "appendChild", "cloneNode"] ||
            !util.areHostObjects(el, ["previousSibling", "nextSibling", "childNodes", "parentNode"]))) {
        module.fail("Incomplete Element implementation");
    }

    // innerHTML is required for Range's createContextualFragment method
    if (!util.isHostProperty(el, "innerHTML")) {
        module.fail("Element is missing innerHTML property");
    }

    var textNode = document.createTextNode("test");
    if (!util.areHostMethods(textNode, ["splitText", "deleteData", "insertData", "appendData", "cloneNode"] ||
            !util.areHostObjects(el, ["previousSibling", "nextSibling", "childNodes", "parentNode"]) ||
            !util.areHostProperties(textNode, ["data"]))) {
        module.fail("Incomplete Text Node implementation");
    }

    /*----------------------------------------------------------------------------------------------------------------*/

    // Removed use of indexOf because of a bizarre bug in Opera that is thrown in one of the Acid3 tests. I haven't been
    // able to replicate it outside of the test. The bug is that indexOf returns -1 when called on an Array that
    // contains just the document as a single element and the value searched for is the document.
    var arrayContains = /*Array.prototype.indexOf ?
        function(arr, val) {
            return arr.indexOf(val) > -1;
        }:*/

        function(arr, val) {
            var i = arr.length;
            while (i--) {
                if (arr[i] === val) {
                    return true;
                }
            }
            return false;
        };

    // Opera 11 puts HTML elements in the null namespace, it seems, and IE 7 has undefined namespaceURI
    function isHtmlNamespace(node) {
        var ns;
        return typeof node.namespaceURI == UNDEF || ((ns = node.namespaceURI) === null || ns == "http://www.w3.org/1999/xhtml");
    }

    function parentElement(node) {
        var parent = node.parentNode;
        return (parent.nodeType == 1) ? parent : null;
    }

    function getNodeIndex(node) {
        var i = 0;
        while( (node = node.previousSibling) ) {
            ++i;
        }
        return i;
    }

    function getNodeLength(node) {
        switch (node.nodeType) {
            case 7:
            case 10:
                return 0;
            case 3:
            case 8:
                return node.length;
            default:
                return node.childNodes.length;
        }
    }

    function getCommonAncestor(node1, node2) {
        var ancestors = [], n;
        for (n = node1; n; n = n.parentNode) {
            ancestors.push(n);
        }

        for (n = node2; n; n = n.parentNode) {
            if (arrayContains(ancestors, n)) {
                return n;
            }
        }

        return null;
    }

    function isAncestorOf(ancestor, descendant, selfIsAncestor) {
        var n = selfIsAncestor ? descendant : descendant.parentNode;
        while (n) {
            if (n === ancestor) {
                return true;
            } else {
                n = n.parentNode;
            }
        }
        return false;
    }

    function isOrIsAncestorOf(ancestor, descendant) {
        return isAncestorOf(ancestor, descendant, true);
    }

    function getClosestAncestorIn(node, ancestor, selfIsAncestor) {
        var p, n = selfIsAncestor ? node : node.parentNode;
        while (n) {
            p = n.parentNode;
            if (p === ancestor) {
                return n;
            }
            n = p;
        }
        return null;
    }

    function isCharacterDataNode(node) {
        var t = node.nodeType;
        return t == 3 || t == 4 || t == 8 ; // Text, CDataSection or Comment
    }

    function isTextOrCommentNode(node) {
        if (!node) {
            return false;
        }
        var t = node.nodeType;
        return t == 3 || t == 8 ; // Text or Comment
    }

    function insertAfter(node, precedingNode) {
        var nextNode = precedingNode.nextSibling, parent = precedingNode.parentNode;
        if (nextNode) {
            parent.insertBefore(node, nextNode);
        } else {
            parent.appendChild(node);
        }
        return node;
    }

    // Note that we cannot use splitText() because it is bugridden in IE 9.
    function splitDataNode(node, index, positionsToPreserve) {
        var newNode = node.cloneNode(false);
        newNode.deleteData(0, index);
        node.deleteData(index, node.length - index);
        insertAfter(newNode, node);

        // Preserve positions
        if (positionsToPreserve) {
            for (var i = 0, position; position = positionsToPreserve[i++]; ) {
                // Handle case where position was inside the portion of node after the split point
                if (position.node == node && position.offset > index) {
                    position.node = newNode;
                    position.offset -= index;
                }
                // Handle the case where the position is a node offset within node's parent
                else if (position.node == node.parentNode && position.offset > getNodeIndex(node)) {
                    ++position.offset;
                }
            }
        }
        return newNode;
    }

    function getDocument(node) {
        if (node.nodeType == 9) {
            return node;
        } else if (typeof node.ownerDocument != UNDEF) {
            return node.ownerDocument;
        } else if (typeof node.document != UNDEF) {
            return node.document;
        } else if (node.parentNode) {
            return getDocument(node.parentNode);
        } else {
            throw module.createError("getDocument: no document found for node");
        }
    }

    function getWindow(node) {
        var doc = getDocument(node);
        if (typeof doc.defaultView != UNDEF) {
            return doc.defaultView;
        } else if (typeof doc.parentWindow != UNDEF) {
            return doc.parentWindow;
        } else {
            throw module.createError("Cannot get a window object for node");
        }
    }

    function getIframeDocument(iframeEl) {
        if (typeof iframeEl.contentDocument != UNDEF) {
            return iframeEl.contentDocument;
        } else if (typeof iframeEl.contentWindow != UNDEF) {
            return iframeEl.contentWindow.document;
        } else {
            throw module.createError("getIframeDocument: No Document object found for iframe element");
        }
    }

    function getIframeWindow(iframeEl) {
        if (typeof iframeEl.contentWindow != UNDEF) {
            return iframeEl.contentWindow;
        } else if (typeof iframeEl.contentDocument != UNDEF) {
            return iframeEl.contentDocument.defaultView;
        } else {
            throw module.createError("getIframeWindow: No Window object found for iframe element");
        }
    }

    // This looks bad. Is it worth it?
    function isWindow(obj) {
        return obj && util.isHostMethod(obj, "setTimeout") && util.isHostObject(obj, "document");
    }

    function getContentDocument(obj, module, methodName) {
        var doc;

        if (!obj) {
            doc = document;
        }

        // Test if a DOM node has been passed and obtain a document object for it if so
        else if (util.isHostProperty(obj, "nodeType")) {
            doc = (obj.nodeType == 1 && obj.tagName.toLowerCase() == "iframe")
                ? getIframeDocument(obj) : getDocument(obj);
        }

        // Test if the doc parameter appears to be a Window object
        else if (isWindow(obj)) {
            doc = obj.document;
        }

        if (!doc) {
            throw module.createError(methodName + "(): Parameter must be a Window object or DOM node");
        }

        return doc;
    }

    function getRootContainer(node) {
        var parent;
        while ( (parent = node.parentNode) ) {
            node = parent;
        }
        return node;
    }

    function comparePoints(nodeA, offsetA, nodeB, offsetB) {
        // See http://www.w3.org/TR/DOM-Level-2-Traversal-Range/ranges.html#Level-2-Range-Comparing
        var nodeC, root, childA, childB, n;
        if (nodeA == nodeB) {
            // Case 1: nodes are the same
            return offsetA === offsetB ? 0 : (offsetA < offsetB) ? -1 : 1;
        } else if ( (nodeC = getClosestAncestorIn(nodeB, nodeA, true)) ) {
            // Case 2: node C (container B or an ancestor) is a child node of A
            return offsetA <= getNodeIndex(nodeC) ? -1 : 1;
        } else if ( (nodeC = getClosestAncestorIn(nodeA, nodeB, true)) ) {
            // Case 3: node C (container A or an ancestor) is a child node of B
            return getNodeIndex(nodeC) < offsetB  ? -1 : 1;
        } else {
            root = getCommonAncestor(nodeA, nodeB);
            if (!root) {
                throw new Error("comparePoints error: nodes have no common ancestor");
            }

            // Case 4: containers are siblings or descendants of siblings
            childA = (nodeA === root) ? root : getClosestAncestorIn(nodeA, root, true);
            childB = (nodeB === root) ? root : getClosestAncestorIn(nodeB, root, true);

            if (childA === childB) {
                // This shouldn't be possible
                throw module.createError("comparePoints got to case 4 and childA and childB are the same!");
            } else {
                n = root.firstChild;
                while (n) {
                    if (n === childA) {
                        return -1;
                    } else if (n === childB) {
                        return 1;
                    }
                    n = n.nextSibling;
                }
            }
        }
    }

    /*----------------------------------------------------------------------------------------------------------------*/

    // Test for IE's crash (IE 6/7) or exception (IE >= 8) when a reference to garbage-collected text node is queried
    var crashyTextNodes = false;

    function isBrokenNode(node) {
        try {
            node.parentNode;
            return false;
        } catch (e) {
            return true;
        }
    }

    (function() {
        var el = document.createElement("b");
        el.innerHTML = "1";
        var textNode = el.firstChild;
        el.innerHTML = "<br>";
        crashyTextNodes = isBrokenNode(textNode);

        api.features.crashyTextNodes = crashyTextNodes;
    })();

    /*----------------------------------------------------------------------------------------------------------------*/

    function inspectNode(node) {
        if (!node) {
            return "[No node]";
        }
        if (crashyTextNodes && isBrokenNode(node)) {
            return "[Broken node]";
        }
        if (isCharacterDataNode(node)) {
            return '"' + node.data + '"';
        }
        if (node.nodeType == 1) {
            var idAttr = node.id ? ' id="' + node.id + '"' : "";
            return "<" + node.nodeName + idAttr + ">[" + node.childNodes.length + "][" + node.innerHTML.slice(0, 20) + "]";
        }
        return node.nodeName;
    }

    function fragmentFromNodeChildren(node) {
        var fragment = getDocument(node).createDocumentFragment(), child;
        while ( (child = node.firstChild) ) {
            fragment.appendChild(child);
        }
        return fragment;
    }

    var getComputedStyleProperty;
    if (typeof window.getComputedStyle != UNDEF) {
        getComputedStyleProperty = function(el, propName) {
            return getWindow(el).getComputedStyle(el, null)[propName];
        };
    } else if (typeof document.documentElement.currentStyle != UNDEF) {
        getComputedStyleProperty = function(el, propName) {
            return el.currentStyle[propName];
        };
    } else {
        module.fail("No means of obtaining computed style properties found");
    }

    function NodeIterator(root) {
        this.root = root;
        this._next = root;
    }

    NodeIterator.prototype = {
        _current: null,

        hasNext: function() {
            return !!this._next;
        },

        next: function() {
            var n = this._current = this._next;
            var child, next;
            if (this._current) {
                child = n.firstChild;
                if (child) {
                    this._next = child;
                } else {
                    next = null;
                    while ((n !== this.root) && !(next = n.nextSibling)) {
                        n = n.parentNode;
                    }
                    this._next = next;
                }
            }
            return this._current;
        },

        detach: function() {
            this._current = this._next = this.root = null;
        }
    };

    function createIterator(root) {
        return new NodeIterator(root);
    }

    function DomPosition(node, offset) {
        this.node = node;
        this.offset = offset;
    }

    DomPosition.prototype = {
        equals: function(pos) {
            return !!pos && this.node === pos.node && this.offset == pos.offset;
        },

        inspect: function() {
            return "[DomPosition(" + inspectNode(this.node) + ":" + this.offset + ")]";
        },

        toString: function() {
            return this.inspect();
        }
    };

    function DOMException(codeName) {
        this.code = this[codeName];
        this.codeName = codeName;
        this.message = "DOMException: " + this.codeName;
    }

    DOMException.prototype = {
        INDEX_SIZE_ERR: 1,
        HIERARCHY_REQUEST_ERR: 3,
        WRONG_DOCUMENT_ERR: 4,
        NO_MODIFICATION_ALLOWED_ERR: 7,
        NOT_FOUND_ERR: 8,
        NOT_SUPPORTED_ERR: 9,
        INVALID_STATE_ERR: 11
    };

    DOMException.prototype.toString = function() {
        return this.message;
    };

    api.dom = {
        arrayContains: arrayContains,
        isHtmlNamespace: isHtmlNamespace,
        parentElement: parentElement,
        getNodeIndex: getNodeIndex,
        getNodeLength: getNodeLength,
        getCommonAncestor: getCommonAncestor,
        isAncestorOf: isAncestorOf,
        isOrIsAncestorOf: isOrIsAncestorOf,
        getClosestAncestorIn: getClosestAncestorIn,
        isCharacterDataNode: isCharacterDataNode,
        isTextOrCommentNode: isTextOrCommentNode,
        insertAfter: insertAfter,
        splitDataNode: splitDataNode,
        getDocument: getDocument,
        getWindow: getWindow,
        getIframeWindow: getIframeWindow,
        getIframeDocument: getIframeDocument,
        getBody: util.getBody,
        isWindow: isWindow,
        getContentDocument: getContentDocument,
        getRootContainer: getRootContainer,
        comparePoints: comparePoints,
        isBrokenNode: isBrokenNode,
        inspectNode: inspectNode,
        getComputedStyleProperty: getComputedStyleProperty,
        fragmentFromNodeChildren: fragmentFromNodeChildren,
        createIterator: createIterator,
        DomPosition: DomPosition
    };

    api.DOMException = DOMException;
});
rangy.createCoreModule("DomRange", ["DomUtil"], function(api, module) {
    var dom = api.dom;
    var util = api.util;
    var DomPosition = dom.DomPosition;
    var DOMException = api.DOMException;

    var isCharacterDataNode = dom.isCharacterDataNode;
    var getNodeIndex = dom.getNodeIndex;
    var isOrIsAncestorOf = dom.isOrIsAncestorOf;
    var getDocument = dom.getDocument;
    var comparePoints = dom.comparePoints;
    var splitDataNode = dom.splitDataNode;
    var getClosestAncestorIn = dom.getClosestAncestorIn;
    var getNodeLength = dom.getNodeLength;
    var arrayContains = dom.arrayContains;
    var getRootContainer = dom.getRootContainer;
    var crashyTextNodes = api.features.crashyTextNodes;

    /*----------------------------------------------------------------------------------------------------------------*/

    // Utility functions

    function isNonTextPartiallySelected(node, range) {
        return (node.nodeType != 3) &&
               (isOrIsAncestorOf(node, range.startContainer) || isOrIsAncestorOf(node, range.endContainer));
    }

    function getRangeDocument(range) {
        return range.document || getDocument(range.startContainer);
    }

    function getBoundaryBeforeNode(node) {
        return new DomPosition(node.parentNode, getNodeIndex(node));
    }

    function getBoundaryAfterNode(node) {
        return new DomPosition(node.parentNode, getNodeIndex(node) + 1);
    }

    function insertNodeAtPosition(node, n, o) {
        var firstNodeInserted = node.nodeType == 11 ? node.firstChild : node;
        if (isCharacterDataNode(n)) {
            if (o == n.length) {
                dom.insertAfter(node, n);
            } else {
                n.parentNode.insertBefore(node, o == 0 ? n : splitDataNode(n, o));
            }
        } else if (o >= n.childNodes.length) {
            n.appendChild(node);
        } else {
            n.insertBefore(node, n.childNodes[o]);
        }
        return firstNodeInserted;
    }

    function rangesIntersect(rangeA, rangeB, touchingIsIntersecting) {
        assertRangeValid(rangeA);
        assertRangeValid(rangeB);

        if (getRangeDocument(rangeB) != getRangeDocument(rangeA)) {
            throw new DOMException("WRONG_DOCUMENT_ERR");
        }

        var startComparison = comparePoints(rangeA.startContainer, rangeA.startOffset, rangeB.endContainer, rangeB.endOffset),
            endComparison = comparePoints(rangeA.endContainer, rangeA.endOffset, rangeB.startContainer, rangeB.startOffset);

        return touchingIsIntersecting ? startComparison <= 0 && endComparison >= 0 : startComparison < 0 && endComparison > 0;
    }

    function cloneSubtree(iterator) {
        var partiallySelected;
        for (var node, frag = getRangeDocument(iterator.range).createDocumentFragment(), subIterator; node = iterator.next(); ) {
            partiallySelected = iterator.isPartiallySelectedSubtree();
            node = node.cloneNode(!partiallySelected);
            if (partiallySelected) {
                subIterator = iterator.getSubtreeIterator();
                node.appendChild(cloneSubtree(subIterator));
                subIterator.detach(true);
            }

            if (node.nodeType == 10) { // DocumentType
                throw new DOMException("HIERARCHY_REQUEST_ERR");
            }
            frag.appendChild(node);
        }
        return frag;
    }

    function iterateSubtree(rangeIterator, func, iteratorState) {
        var it, n;
        iteratorState = iteratorState || { stop: false };
        for (var node, subRangeIterator; node = rangeIterator.next(); ) {
            if (rangeIterator.isPartiallySelectedSubtree()) {
                if (func(node) === false) {
                    iteratorState.stop = true;
                    return;
                } else {
                    // The node is partially selected by the Range, so we can use a new RangeIterator on the portion of
                    // the node selected by the Range.
                    subRangeIterator = rangeIterator.getSubtreeIterator();
                    iterateSubtree(subRangeIterator, func, iteratorState);
                    subRangeIterator.detach(true);
                    if (iteratorState.stop) {
                        return;
                    }
                }
            } else {
                // The whole node is selected, so we can use efficient DOM iteration to iterate over the node and its
                // descendants
                it = dom.createIterator(node);
                while ( (n = it.next()) ) {
                    if (func(n) === false) {
                        iteratorState.stop = true;
                        return;
                    }
                }
            }
        }
    }

    function deleteSubtree(iterator) {
        var subIterator;
        while (iterator.next()) {
            if (iterator.isPartiallySelectedSubtree()) {
                subIterator = iterator.getSubtreeIterator();
                deleteSubtree(subIterator);
                subIterator.detach(true);
            } else {
                iterator.remove();
            }
        }
    }

    function extractSubtree(iterator) {
        for (var node, frag = getRangeDocument(iterator.range).createDocumentFragment(), subIterator; node = iterator.next(); ) {

            if (iterator.isPartiallySelectedSubtree()) {
                node = node.cloneNode(false);
                subIterator = iterator.getSubtreeIterator();
                node.appendChild(extractSubtree(subIterator));
                subIterator.detach(true);
            } else {
                iterator.remove();
            }
            if (node.nodeType == 10) { // DocumentType
                throw new DOMException("HIERARCHY_REQUEST_ERR");
            }
            frag.appendChild(node);
        }
        return frag;
    }

    function getNodesInRange(range, nodeTypes, filter) {
        var filterNodeTypes = !!(nodeTypes && nodeTypes.length), regex;
        var filterExists = !!filter;
        if (filterNodeTypes) {
            regex = new RegExp("^(" + nodeTypes.join("|") + ")$");
        }

        var nodes = [];
        iterateSubtree(new RangeIterator(range, false), function(node) {
            if ((!filterNodeTypes || regex.test(node.nodeType)) && (!filterExists || filter(node))) {
                nodes.push(node);
            }
        });
        return nodes;
    }

    function inspect(range) {
        var name = (typeof range.getName == "undefined") ? "Range" : range.getName();
        return "[" + name + "(" + dom.inspectNode(range.startContainer) + ":" + range.startOffset + ", " +
                dom.inspectNode(range.endContainer) + ":" + range.endOffset + ")]";
    }

    /*----------------------------------------------------------------------------------------------------------------*/

    // RangeIterator code partially borrows from IERange by Tim Ryan (http://github.com/timcameronryan/IERange)

    function RangeIterator(range, clonePartiallySelectedTextNodes) {
        this.range = range;
        this.clonePartiallySelectedTextNodes = clonePartiallySelectedTextNodes;


        if (!range.collapsed) {
            this.sc = range.startContainer;
            this.so = range.startOffset;
            this.ec = range.endContainer;
            this.eo = range.endOffset;
            var root = range.commonAncestorContainer;

            if (this.sc === this.ec && isCharacterDataNode(this.sc)) {
                this.isSingleCharacterDataNode = true;
                this._first = this._last = this._next = this.sc;
            } else {
                this._first = this._next = (this.sc === root && !isCharacterDataNode(this.sc)) ?
                    this.sc.childNodes[this.so] : getClosestAncestorIn(this.sc, root, true);
                this._last = (this.ec === root && !isCharacterDataNode(this.ec)) ?
                    this.ec.childNodes[this.eo - 1] : getClosestAncestorIn(this.ec, root, true);
            }
        }
    }

    RangeIterator.prototype = {
        _current: null,
        _next: null,
        _first: null,
        _last: null,
        isSingleCharacterDataNode: false,

        reset: function() {
            this._current = null;
            this._next = this._first;
        },

        hasNext: function() {
            return !!this._next;
        },

        next: function() {
            // Move to next node
            var current = this._current = this._next;
            if (current) {
                this._next = (current !== this._last) ? current.nextSibling : null;

                // Check for partially selected text nodes
                if (isCharacterDataNode(current) && this.clonePartiallySelectedTextNodes) {
                    if (current === this.ec) {
                        (current = current.cloneNode(true)).deleteData(this.eo, current.length - this.eo);
                    }
                    if (this._current === this.sc) {
                        (current = current.cloneNode(true)).deleteData(0, this.so);
                    }
                }
            }

            return current;
        },

        remove: function() {
            var current = this._current, start, end;

            if (isCharacterDataNode(current) && (current === this.sc || current === this.ec)) {
                start = (current === this.sc) ? this.so : 0;
                end = (current === this.ec) ? this.eo : current.length;
                if (start != end) {
                    current.deleteData(start, end - start);
                }
            } else {
                if (current.parentNode) {
                    current.parentNode.removeChild(current);
                } else {
                }
            }
        },

        // Checks if the current node is partially selected
        isPartiallySelectedSubtree: function() {
            var current = this._current;
            return isNonTextPartiallySelected(current, this.range);
        },

        getSubtreeIterator: function() {
            var subRange;
            if (this.isSingleCharacterDataNode) {
                subRange = this.range.cloneRange();
                subRange.collapse(false);
            } else {
                subRange = new Range(getRangeDocument(this.range));
                var current = this._current;
                var startContainer = current, startOffset = 0, endContainer = current, endOffset = getNodeLength(current);

                if (isOrIsAncestorOf(current, this.sc)) {
                    startContainer = this.sc;
                    startOffset = this.so;
                }
                if (isOrIsAncestorOf(current, this.ec)) {
                    endContainer = this.ec;
                    endOffset = this.eo;
                }

                updateBoundaries(subRange, startContainer, startOffset, endContainer, endOffset);
            }
            return new RangeIterator(subRange, this.clonePartiallySelectedTextNodes);
        },

        detach: function(detachRange) {
            if (detachRange) {
                this.range.detach();
            }
            this.range = this._current = this._next = this._first = this._last = this.sc = this.so = this.ec = this.eo = null;
        }
    };

    /*----------------------------------------------------------------------------------------------------------------*/

    // Exceptions

    function RangeException(codeName) {
        this.code = this[codeName];
        this.codeName = codeName;
        this.message = "RangeException: " + this.codeName;
    }

    RangeException.prototype = {
        BAD_BOUNDARYPOINTS_ERR: 1,
        INVALID_NODE_TYPE_ERR: 2
    };

    RangeException.prototype.toString = function() {
        return this.message;
    };

    /*----------------------------------------------------------------------------------------------------------------*/

    var beforeAfterNodeTypes = [1, 3, 4, 5, 7, 8, 10];
    var rootContainerNodeTypes = [2, 9, 11];
    var readonlyNodeTypes = [5, 6, 10, 12];
    var insertableNodeTypes = [1, 3, 4, 5, 7, 8, 10, 11];
    var surroundNodeTypes = [1, 3, 4, 5, 7, 8];

    function createAncestorFinder(nodeTypes) {
        return function(node, selfIsAncestor) {
            var t, n = selfIsAncestor ? node : node.parentNode;
            while (n) {
                t = n.nodeType;
                if (arrayContains(nodeTypes, t)) {
                    return n;
                }
                n = n.parentNode;
            }
            return null;
        };
    }

    var getDocumentOrFragmentContainer = createAncestorFinder( [9, 11] );
    var getReadonlyAncestor = createAncestorFinder(readonlyNodeTypes);
    var getDocTypeNotationEntityAncestor = createAncestorFinder( [6, 10, 12] );

    function assertNoDocTypeNotationEntityAncestor(node, allowSelf) {
        if (getDocTypeNotationEntityAncestor(node, allowSelf)) {
            throw new RangeException("INVALID_NODE_TYPE_ERR");
        }
    }

    function assertNotDetached(range) {
        if (!range.startContainer) {
            throw new DOMException("INVALID_STATE_ERR");
        }
    }

    function assertValidNodeType(node, invalidTypes) {
        if (!arrayContains(invalidTypes, node.nodeType)) {
            throw new RangeException("INVALID_NODE_TYPE_ERR");
        }
    }

    function assertValidOffset(node, offset) {
        if (offset < 0 || offset > (isCharacterDataNode(node) ? node.length : node.childNodes.length)) {
            throw new DOMException("INDEX_SIZE_ERR");
        }
    }

    function assertSameDocumentOrFragment(node1, node2) {
        if (getDocumentOrFragmentContainer(node1, true) !== getDocumentOrFragmentContainer(node2, true)) {
            throw new DOMException("WRONG_DOCUMENT_ERR");
        }
    }

    function assertNodeNotReadOnly(node) {
        if (getReadonlyAncestor(node, true)) {
            throw new DOMException("NO_MODIFICATION_ALLOWED_ERR");
        }
    }

    function assertNode(node, codeName) {
        if (!node) {
            throw new DOMException(codeName);
        }
    }

    function isOrphan(node) {
        return (crashyTextNodes && dom.isBrokenNode(node)) ||
            !arrayContains(rootContainerNodeTypes, node.nodeType) && !getDocumentOrFragmentContainer(node, true);
    }

    function isValidOffset(node, offset) {
        return offset <= (isCharacterDataNode(node) ? node.length : node.childNodes.length);
    }

    function isRangeValid(range) {
        return (!!range.startContainer && !!range.endContainer
                && !isOrphan(range.startContainer)
                && !isOrphan(range.endContainer)
                && isValidOffset(range.startContainer, range.startOffset)
                && isValidOffset(range.endContainer, range.endOffset));
    }

    function assertRangeValid(range) {
        assertNotDetached(range);
        if (!isRangeValid(range)) {
            throw new Error("Range error: Range is no longer valid after DOM mutation (" + range.inspect() + ")");
        }
    }

    /*----------------------------------------------------------------------------------------------------------------*/

    // Test the browser's innerHTML support to decide how to implement createContextualFragment
    var styleEl = document.createElement("style");
    var htmlParsingConforms = false;
    try {
        styleEl.innerHTML = "<b>x</b>";
        htmlParsingConforms = (styleEl.firstChild.nodeType == 3); // Opera incorrectly creates an element node
    } catch (e) {
        // IE 6 and 7 throw
    }

    api.features.htmlParsingConforms = htmlParsingConforms;

    var createContextualFragment = htmlParsingConforms ?

        // Implementation as per HTML parsing spec, trusting in the browser's implementation of innerHTML. See
        // discussion and base code for this implementation at issue 67.
        // Spec: http://html5.org/specs/dom-parsing.html#extensions-to-the-range-interface
        // Thanks to Aleks Williams.
        function(fragmentStr) {
            // "Let node the context object's start's node."
            var node = this.startContainer;
            var doc = getDocument(node);

            // "If the context object's start's node is null, raise an INVALID_STATE_ERR
            // exception and abort these steps."
            if (!node) {
                throw new DOMException("INVALID_STATE_ERR");
            }

            // "Let element be as follows, depending on node's interface:"
            // Document, Document Fragment: null
            var el = null;

            // "Element: node"
            if (node.nodeType == 1) {
                el = node;

            // "Text, Comment: node's parentElement"
            } else if (isCharacterDataNode(node)) {
                el = dom.parentElement(node);
            }

            // "If either element is null or element's ownerDocument is an HTML document
            // and element's local name is "html" and element's namespace is the HTML
            // namespace"
            if (el === null || (
                el.nodeName == "HTML"
                && dom.isHtmlNamespace(getDocument(el).documentElement)
                && dom.isHtmlNamespace(el)
            )) {

            // "let element be a new Element with "body" as its local name and the HTML
            // namespace as its namespace.""
                el = doc.createElement("body");
            } else {
                el = el.cloneNode(false);
            }

            // "If the node's document is an HTML document: Invoke the HTML fragment parsing algorithm."
            // "If the node's document is an XML document: Invoke the XML fragment parsing algorithm."
            // "In either case, the algorithm must be invoked with fragment as the input
            // and element as the context element."
            el.innerHTML = fragmentStr;

            // "If this raises an exception, then abort these steps. Otherwise, let new
            // children be the nodes returned."

            // "Let fragment be a new DocumentFragment."
            // "Append all new children to fragment."
            // "Return fragment."
            return dom.fragmentFromNodeChildren(el);
        } :

        // In this case, innerHTML cannot be trusted, so fall back to a simpler, non-conformant implementation that
        // previous versions of Rangy used (with the exception of using a body element rather than a div)
        function(fragmentStr) {
            assertNotDetached(this);
            var doc = getRangeDocument(this);
            var el = doc.createElement("body");
            el.innerHTML = fragmentStr;

            return dom.fragmentFromNodeChildren(el);
        };

    function splitRangeBoundaries(range, positionsToPreserve) {
        assertRangeValid(range);

        var sc = range.startContainer, so = range.startOffset, ec = range.endContainer, eo = range.endOffset;
        var startEndSame = (sc === ec);

        if (isCharacterDataNode(ec) && eo > 0 && eo < ec.length) {
            splitDataNode(ec, eo, positionsToPreserve);
        }

        if (isCharacterDataNode(sc) && so > 0 && so < sc.length) {
            sc = splitDataNode(sc, so, positionsToPreserve);
            if (startEndSame) {
                eo -= so;
                ec = sc;
            } else if (ec == sc.parentNode && eo >= getNodeIndex(sc)) {
                eo++;
            }
            so = 0;
        }
        range.setStartAndEnd(sc, so, ec, eo);
    }

    /*----------------------------------------------------------------------------------------------------------------*/

    var rangeProperties = ["startContainer", "startOffset", "endContainer", "endOffset", "collapsed",
        "commonAncestorContainer"];

    var s2s = 0, s2e = 1, e2e = 2, e2s = 3;
    var n_b = 0, n_a = 1, n_b_a = 2, n_i = 3;

    util.extend(api.rangePrototype, {
        compareBoundaryPoints: function(how, range) {
            assertRangeValid(this);
            assertSameDocumentOrFragment(this.startContainer, range.startContainer);

            var nodeA, offsetA, nodeB, offsetB;
            var prefixA = (how == e2s || how == s2s) ? "start" : "end";
            var prefixB = (how == s2e || how == s2s) ? "start" : "end";
            nodeA = this[prefixA + "Container"];
            offsetA = this[prefixA + "Offset"];
            nodeB = range[prefixB + "Container"];
            offsetB = range[prefixB + "Offset"];
            return comparePoints(nodeA, offsetA, nodeB, offsetB);
        },

        insertNode: function(node) {
            assertRangeValid(this);
            assertValidNodeType(node, insertableNodeTypes);
            assertNodeNotReadOnly(this.startContainer);

            if (isOrIsAncestorOf(node, this.startContainer)) {
                throw new DOMException("HIERARCHY_REQUEST_ERR");
            }

            // No check for whether the container of the start of the Range is of a type that does not allow
            // children of the type of node: the browser's DOM implementation should do this for us when we attempt
            // to add the node

            var firstNodeInserted = insertNodeAtPosition(node, this.startContainer, this.startOffset);
            this.setStartBefore(firstNodeInserted);
        },

        cloneContents: function() {
            assertRangeValid(this);

            var clone, frag;
            if (this.collapsed) {
                return getRangeDocument(this).createDocumentFragment();
            } else {
                if (this.startContainer === this.endContainer && isCharacterDataNode(this.startContainer)) {
                    clone = this.startContainer.cloneNode(true);
                    clone.data = clone.data.slice(this.startOffset, this.endOffset);
                    frag = getRangeDocument(this).createDocumentFragment();
                    frag.appendChild(clone);
                    return frag;
                } else {
                    var iterator = new RangeIterator(this, true);
                    clone = cloneSubtree(iterator);
                    iterator.detach();
                }
                return clone;
            }
        },

        canSurroundContents: function() {
            assertRangeValid(this);
            assertNodeNotReadOnly(this.startContainer);
            assertNodeNotReadOnly(this.endContainer);

            // Check if the contents can be surrounded. Specifically, this means whether the range partially selects
            // no non-text nodes.
            var iterator = new RangeIterator(this, true);
            var boundariesInvalid = (iterator._first && (isNonTextPartiallySelected(iterator._first, this)) ||
                    (iterator._last && isNonTextPartiallySelected(iterator._last, this)));
            iterator.detach();
            return !boundariesInvalid;
        },

        surroundContents: function(node) {
            assertValidNodeType(node, surroundNodeTypes);

            if (!this.canSurroundContents()) {
                throw new RangeException("BAD_BOUNDARYPOINTS_ERR");
            }

            // Extract the contents
            var content = this.extractContents();

            // Clear the children of the node
            if (node.hasChildNodes()) {
                while (node.lastChild) {
                    node.removeChild(node.lastChild);
                }
            }

            // Insert the new node and add the extracted contents
            insertNodeAtPosition(node, this.startContainer, this.startOffset);
            node.appendChild(content);

            this.selectNode(node);
        },

        cloneRange: function() {
            assertRangeValid(this);
            var range = new Range(getRangeDocument(this));
            var i = rangeProperties.length, prop;
            while (i--) {
                prop = rangeProperties[i];
                range[prop] = this[prop];
            }
            return range;
        },

        toString: function() {
            assertRangeValid(this);
            var sc = this.startContainer;
            if (sc === this.endContainer && isCharacterDataNode(sc)) {
                return (sc.nodeType == 3 || sc.nodeType == 4) ? sc.data.slice(this.startOffset, this.endOffset) : "";
            } else {
                var textBits = [], iterator = new RangeIterator(this, true);
                iterateSubtree(iterator, function(node) {
                    // Accept only text or CDATA nodes, not comments
                    if (node.nodeType == 3 || node.nodeType == 4) {
                        textBits.push(node.data);
                    }
                });
                iterator.detach();
                return textBits.join("");
            }
        },

        // The methods below are all non-standard. The following batch were introduced by Mozilla but have since
        // been removed from Mozilla.

        compareNode: function(node) {
            assertRangeValid(this);

            var parent = node.parentNode;
            var nodeIndex = getNodeIndex(node);

            if (!parent) {
                throw new DOMException("NOT_FOUND_ERR");
            }

            var startComparison = this.comparePoint(parent, nodeIndex),
                endComparison = this.comparePoint(parent, nodeIndex + 1);

            if (startComparison < 0) { // Node starts before
                return (endComparison > 0) ? n_b_a : n_b;
            } else {
                return (endComparison > 0) ? n_a : n_i;
            }
        },

        comparePoint: function(node, offset) {
            assertRangeValid(this);
            assertNode(node, "HIERARCHY_REQUEST_ERR");
            assertSameDocumentOrFragment(node, this.startContainer);

            if (comparePoints(node, offset, this.startContainer, this.startOffset) < 0) {
                return -1;
            } else if (comparePoints(node, offset, this.endContainer, this.endOffset) > 0) {
                return 1;
            }
            return 0;
        },

        createContextualFragment: createContextualFragment,

        toHtml: function() {
            assertRangeValid(this);
            var container = this.commonAncestorContainer.parentNode.cloneNode(false);
            container.appendChild(this.cloneContents());
            return container.innerHTML;
        },

        // touchingIsIntersecting determines whether this method considers a node that borders a range intersects
        // with it (as in WebKit) or not (as in Gecko pre-1.9, and the default)
        intersectsNode: function(node, touchingIsIntersecting) {
            assertRangeValid(this);
            assertNode(node, "NOT_FOUND_ERR");
            if (getDocument(node) !== getRangeDocument(this)) {
                return false;
            }

            var parent = node.parentNode, offset = getNodeIndex(node);
            assertNode(parent, "NOT_FOUND_ERR");

            var startComparison = comparePoints(parent, offset, this.endContainer, this.endOffset),
                endComparison = comparePoints(parent, offset + 1, this.startContainer, this.startOffset);

            return touchingIsIntersecting ? startComparison <= 0 && endComparison >= 0 : startComparison < 0 && endComparison > 0;
        },

        isPointInRange: function(node, offset) {
            assertRangeValid(this);
            assertNode(node, "HIERARCHY_REQUEST_ERR");
            assertSameDocumentOrFragment(node, this.startContainer);

            return (comparePoints(node, offset, this.startContainer, this.startOffset) >= 0) &&
                   (comparePoints(node, offset, this.endContainer, this.endOffset) <= 0);
        },

        // The methods below are non-standard and invented by me.

        // Sharing a boundary start-to-end or end-to-start does not count as intersection.
        intersectsRange: function(range) {
            return rangesIntersect(this, range, false);
        },

        // Sharing a boundary start-to-end or end-to-start does count as intersection.
        intersectsOrTouchesRange: function(range) {
            return rangesIntersect(this, range, true);
        },

        intersection: function(range) {
            if (this.intersectsRange(range)) {
                var startComparison = comparePoints(this.startContainer, this.startOffset, range.startContainer, range.startOffset),
                    endComparison = comparePoints(this.endContainer, this.endOffset, range.endContainer, range.endOffset);

                var intersectionRange = this.cloneRange();
                if (startComparison == -1) {
                    intersectionRange.setStart(range.startContainer, range.startOffset);
                }
                if (endComparison == 1) {
                    intersectionRange.setEnd(range.endContainer, range.endOffset);
                }
                return intersectionRange;
            }
            return null;
        },

        union: function(range) {
            if (this.intersectsOrTouchesRange(range)) {
                var unionRange = this.cloneRange();
                if (comparePoints(range.startContainer, range.startOffset, this.startContainer, this.startOffset) == -1) {
                    unionRange.setStart(range.startContainer, range.startOffset);
                }
                if (comparePoints(range.endContainer, range.endOffset, this.endContainer, this.endOffset) == 1) {
                    unionRange.setEnd(range.endContainer, range.endOffset);
                }
                return unionRange;
            } else {
                throw new RangeException("Ranges do not intersect");
            }
        },

        containsNode: function(node, allowPartial) {
            if (allowPartial) {
                return this.intersectsNode(node, false);
            } else {
                return this.compareNode(node) == n_i;
            }
        },

        containsNodeContents: function(node) {
            return this.comparePoint(node, 0) >= 0 && this.comparePoint(node, getNodeLength(node)) <= 0;
        },

        containsRange: function(range) {
            var intersection = this.intersection(range);
            return intersection !== null && range.equals(intersection);
        },

        containsNodeText: function(node) {
            var nodeRange = this.cloneRange();
            nodeRange.selectNode(node);
            var textNodes = nodeRange.getNodes([3]);
            if (textNodes.length > 0) {
                nodeRange.setStart(textNodes[0], 0);
                var lastTextNode = textNodes.pop();
                nodeRange.setEnd(lastTextNode, lastTextNode.length);
                var contains = this.containsRange(nodeRange);
                nodeRange.detach();
                return contains;
            } else {
                return this.containsNodeContents(node);
            }
        },

        getNodes: function(nodeTypes, filter) {
            assertRangeValid(this);
            return getNodesInRange(this, nodeTypes, filter);
        },

        getDocument: function() {
            return getRangeDocument(this);
        },

        collapseBefore: function(node) {
            assertNotDetached(this);

            this.setEndBefore(node);
            this.collapse(false);
        },

        collapseAfter: function(node) {
            assertNotDetached(this);

            this.setStartAfter(node);
            this.collapse(true);
        },

        getBookmark: function(containerNode) {
            var doc = getRangeDocument(this);
            var preSelectionRange = api.createRange(doc);
            containerNode = containerNode || dom.getBody(doc);
            preSelectionRange.selectNodeContents(containerNode);
            var range = this.intersection(preSelectionRange);
            var start = 0, end = 0;
            if (range) {
                preSelectionRange.setEnd(range.startContainer, range.startOffset);
                start = preSelectionRange.toString().length;
                end = start + range.toString().length;
                preSelectionRange.detach();
            }

            return {
                start: start,
                end: end,
                containerNode: containerNode
            };
        },

        moveToBookmark: function(bookmark) {
            var containerNode = bookmark.containerNode;
            var charIndex = 0;
            this.setStart(containerNode, 0);
            this.collapse(true);
            var nodeStack = [containerNode], node, foundStart = false, stop = false;
            var nextCharIndex, i, childNodes;

            while (!stop && (node = nodeStack.pop())) {
                if (node.nodeType == 3) {
                    nextCharIndex = charIndex + node.length;
                    if (!foundStart && bookmark.start >= charIndex && bookmark.start <= nextCharIndex) {
                        this.setStart(node, bookmark.start - charIndex);
                        foundStart = true;
                    }
                    if (foundStart && bookmark.end >= charIndex && bookmark.end <= nextCharIndex) {
                        this.setEnd(node, bookmark.end - charIndex);
                        stop = true;
                    }
                    charIndex = nextCharIndex;
                } else {
                    childNodes = node.childNodes;
                    i = childNodes.length;
                    while (i--) {
                        nodeStack.push(childNodes[i]);
                    }
                }
            }
        },

        getName: function() {
            return "DomRange";
        },

        equals: function(range) {
            return Range.rangesEqual(this, range);
        },

        isValid: function() {
            return isRangeValid(this);
        },

        inspect: function() {
            return inspect(this);
        }
    });

    function copyComparisonConstantsToObject(obj) {
        obj.START_TO_START = s2s;
        obj.START_TO_END = s2e;
        obj.END_TO_END = e2e;
        obj.END_TO_START = e2s;

        obj.NODE_BEFORE = n_b;
        obj.NODE_AFTER = n_a;
        obj.NODE_BEFORE_AND_AFTER = n_b_a;
        obj.NODE_INSIDE = n_i;
    }

    function copyComparisonConstants(constructor) {
        copyComparisonConstantsToObject(constructor);
        copyComparisonConstantsToObject(constructor.prototype);
    }

    function createRangeContentRemover(remover, boundaryUpdater) {
        return function() {
            assertRangeValid(this);

            var sc = this.startContainer, so = this.startOffset, root = this.commonAncestorContainer;

            var iterator = new RangeIterator(this, true);

            // Work out where to position the range after content removal
            var node, boundary;
            if (sc !== root) {
                node = getClosestAncestorIn(sc, root, true);
                boundary = getBoundaryAfterNode(node);
                sc = boundary.node;
                so = boundary.offset;
            }

            // Check none of the range is read-only
            iterateSubtree(iterator, assertNodeNotReadOnly);

            iterator.reset();

            // Remove the content
            var returnValue = remover(iterator);
            iterator.detach();

            // Move to the new position
            boundaryUpdater(this, sc, so, sc, so);

            return returnValue;
        };
    }

    function createPrototypeRange(constructor, boundaryUpdater, detacher) {
        function createBeforeAfterNodeSetter(isBefore, isStart) {
            return function(node) {
                assertNotDetached(this);
                assertValidNodeType(node, beforeAfterNodeTypes);
                assertValidNodeType(getRootContainer(node), rootContainerNodeTypes);

                var boundary = (isBefore ? getBoundaryBeforeNode : getBoundaryAfterNode)(node);
                (isStart ? setRangeStart : setRangeEnd)(this, boundary.node, boundary.offset);
            };
        }

        function setRangeStart(range, node, offset) {
            var ec = range.endContainer, eo = range.endOffset;
            if (node !== range.startContainer || offset !== range.startOffset) {
                // Check the root containers of the range and the new boundary, and also check whether the new boundary
                // is after the current end. In either case, collapse the range to the new position
                if (getRootContainer(node) != getRootContainer(ec) || comparePoints(node, offset, ec, eo) == 1) {
                    ec = node;
                    eo = offset;
                }
                boundaryUpdater(range, node, offset, ec, eo);
            }
        }

        function setRangeEnd(range, node, offset) {
            var sc = range.startContainer, so = range.startOffset;
            if (node !== range.endContainer || offset !== range.endOffset) {
                // Check the root containers of the range and the new boundary, and also check whether the new boundary
                // is after the current end. In either case, collapse the range to the new position
                if (getRootContainer(node) != getRootContainer(sc) || comparePoints(node, offset, sc, so) == -1) {
                    sc = node;
                    so = offset;
                }
                boundaryUpdater(range, sc, so, node, offset);
            }
        }

        // Set up inheritance
        var F = function() {};
        F.prototype = api.rangePrototype;
        constructor.prototype = new F();

        util.extend(constructor.prototype, {
            setStart: function(node, offset) {
                assertNotDetached(this);
                assertNoDocTypeNotationEntityAncestor(node, true);
                assertValidOffset(node, offset);

                setRangeStart(this, node, offset);
            },

            setEnd: function(node, offset) {
                assertNotDetached(this);
                assertNoDocTypeNotationEntityAncestor(node, true);
                assertValidOffset(node, offset);

                setRangeEnd(this, node, offset);
            },

            /**
             * Convenience method to set a range's start and end boundaries. Overloaded as follows:
             * - Two parameters (node, offset) creates a collapsed range at that position
             * - Three parameters (node, startOffset, endOffset) creates a range contained with node starting at
             *   startOffset and ending at endOffset
             * - Four parameters (startNode, startOffset, endNode, endOffset) creates a range starting at startOffset in
             *   startNode and ending at endOffset in endNode
             */
            setStartAndEnd: function() {
                assertNotDetached(this);

                var args = arguments;
                var sc = args[0], so = args[1], ec = sc, eo = so;

                switch (args.length) {
                    case 3:
                        eo = args[2];
                        break;
                    case 4:
                        ec = args[2];
                        eo = args[3];
                        break;
                }

                boundaryUpdater(this, sc, so, ec, eo);
            },

            setBoundary: function(node, offset, isStart) {
                this["set" + (isStart ? "Start" : "End")](node, offset);
            },

            setStartBefore: createBeforeAfterNodeSetter(true, true),
            setStartAfter: createBeforeAfterNodeSetter(false, true),
            setEndBefore: createBeforeAfterNodeSetter(true, false),
            setEndAfter: createBeforeAfterNodeSetter(false, false),

            collapse: function(isStart) {
                assertRangeValid(this);
                if (isStart) {
                    boundaryUpdater(this, this.startContainer, this.startOffset, this.startContainer, this.startOffset);
                } else {
                    boundaryUpdater(this, this.endContainer, this.endOffset, this.endContainer, this.endOffset);
                }
            },

            selectNodeContents: function(node) {
                assertNotDetached(this);
                assertNoDocTypeNotationEntityAncestor(node, true);

                boundaryUpdater(this, node, 0, node, getNodeLength(node));
            },

            selectNode: function(node) {
                assertNotDetached(this);
                assertNoDocTypeNotationEntityAncestor(node, false);
                assertValidNodeType(node, beforeAfterNodeTypes);

                var start = getBoundaryBeforeNode(node), end = getBoundaryAfterNode(node);
                boundaryUpdater(this, start.node, start.offset, end.node, end.offset);
            },

            extractContents: createRangeContentRemover(extractSubtree, boundaryUpdater),

            deleteContents: createRangeContentRemover(deleteSubtree, boundaryUpdater),

            canSurroundContents: function() {
                assertRangeValid(this);
                assertNodeNotReadOnly(this.startContainer);
                assertNodeNotReadOnly(this.endContainer);

                // Check if the contents can be surrounded. Specifically, this means whether the range partially selects
                // no non-text nodes.
                var iterator = new RangeIterator(this, true);
                var boundariesInvalid = (iterator._first && (isNonTextPartiallySelected(iterator._first, this)) ||
                        (iterator._last && isNonTextPartiallySelected(iterator._last, this)));
                iterator.detach();
                return !boundariesInvalid;
            },

            detach: function() {
                detacher(this);
            },

            splitBoundaries: function() {
                splitRangeBoundaries(this);
            },

            splitBoundariesPreservingPositions: function(positionsToPreserve) {
                splitRangeBoundaries(this, positionsToPreserve);
            },

            normalizeBoundaries: function() {
                assertRangeValid(this);

                var sc = this.startContainer, so = this.startOffset, ec = this.endContainer, eo = this.endOffset;

                var mergeForward = function(node) {
                    var sibling = node.nextSibling;
                    if (sibling && sibling.nodeType == node.nodeType) {
                        ec = node;
                        eo = node.length;
                        node.appendData(sibling.data);
                        sibling.parentNode.removeChild(sibling);
                    }
                };

                var mergeBackward = function(node) {
                    var sibling = node.previousSibling;
                    if (sibling && sibling.nodeType == node.nodeType) {
                        sc = node;
                        var nodeLength = node.length;
                        so = sibling.length;
                        node.insertData(0, sibling.data);
                        sibling.parentNode.removeChild(sibling);
                        if (sc == ec) {
                            eo += so;
                            ec = sc;
                        } else if (ec == node.parentNode) {
                            var nodeIndex = getNodeIndex(node);
                            if (eo == nodeIndex) {
                                ec = node;
                                eo = nodeLength;
                            } else if (eo > nodeIndex) {
                                eo--;
                            }
                        }
                    }
                };

                var normalizeStart = true;

                if (isCharacterDataNode(ec)) {
                    if (ec.length == eo) {
                        mergeForward(ec);
                    }
                } else {
                    if (eo > 0) {
                        var endNode = ec.childNodes[eo - 1];
                        if (endNode && isCharacterDataNode(endNode)) {
                            mergeForward(endNode);
                        }
                    }
                    normalizeStart = !this.collapsed;
                }

                if (normalizeStart) {
                    if (isCharacterDataNode(sc)) {
                        if (so == 0) {
                            mergeBackward(sc);
                        }
                    } else {
                        if (so < sc.childNodes.length) {
                            var startNode = sc.childNodes[so];
                            if (startNode && isCharacterDataNode(startNode)) {
                                mergeBackward(startNode);
                            }
                        }
                    }
                } else {
                    sc = ec;
                    so = eo;
                }

                boundaryUpdater(this, sc, so, ec, eo);
            },

            collapseToPoint: function(node, offset) {
                assertNotDetached(this);
                assertNoDocTypeNotationEntityAncestor(node, true);
                assertValidOffset(node, offset);
                this.setStartAndEnd(node, offset);
            }
        });

        copyComparisonConstants(constructor);
    }

    /*----------------------------------------------------------------------------------------------------------------*/

    // Updates commonAncestorContainer and collapsed after boundary change
    function updateCollapsedAndCommonAncestor(range) {
        range.collapsed = (range.startContainer === range.endContainer && range.startOffset === range.endOffset);
        range.commonAncestorContainer = range.collapsed ?
            range.startContainer : dom.getCommonAncestor(range.startContainer, range.endContainer);
    }

    function updateBoundaries(range, startContainer, startOffset, endContainer, endOffset) {
        range.startContainer = startContainer;
        range.startOffset = startOffset;
        range.endContainer = endContainer;
        range.endOffset = endOffset;
        range.document = dom.getDocument(startContainer);

        updateCollapsedAndCommonAncestor(range);
    }

    function detach(range) {
        assertNotDetached(range);
        range.startContainer = range.startOffset = range.endContainer = range.endOffset = range.document = null;
        range.collapsed = range.commonAncestorContainer = null;
    }

    function Range(doc) {
        this.startContainer = doc;
        this.startOffset = 0;
        this.endContainer = doc;
        this.endOffset = 0;
        this.document = doc;
        updateCollapsedAndCommonAncestor(this);
    }

    createPrototypeRange(Range, updateBoundaries, detach);

    util.extend(Range, {
        rangeProperties: rangeProperties,
        RangeIterator: RangeIterator,
        copyComparisonConstants: copyComparisonConstants,
        createPrototypeRange: createPrototypeRange,
        inspect: inspect,
        getRangeDocument: getRangeDocument,
        rangesEqual: function(r1, r2) {
            return r1.startContainer === r2.startContainer &&
                r1.startOffset === r2.startOffset &&
                r1.endContainer === r2.endContainer &&
                r1.endOffset === r2.endOffset;
        }
    });

    api.DomRange = Range;
    api.RangeException = RangeException;
});
rangy.createCoreModule("WrappedRange", ["DomRange"], function(api, module) {
    var WrappedRange, WrappedTextRange;
    var dom = api.dom;
    var util = api.util;
    var DomPosition = dom.DomPosition;
    var DomRange = api.DomRange;
    var getBody = dom.getBody;
    var getContentDocument = dom.getContentDocument;
    var isCharacterDataNode = dom.isCharacterDataNode;


    /*----------------------------------------------------------------------------------------------------------------*/

    if (api.features.implementsDomRange) {
        // This is a wrapper around the browser's native DOM Range. It has two aims:
        // - Provide workarounds for specific browser bugs
        // - provide convenient extensions, which are inherited from Rangy's DomRange

        (function() {
            var rangeProto;
            var rangeProperties = DomRange.rangeProperties;

            function updateRangeProperties(range) {
                var i = rangeProperties.length, prop;
                while (i--) {
                    prop = rangeProperties[i];
                    range[prop] = range.nativeRange[prop];
                }
                // Fix for broken collapsed property in IE 9.
                range.collapsed = (range.startContainer === range.endContainer && range.startOffset === range.endOffset);
            }

            function updateNativeRange(range, startContainer, startOffset, endContainer, endOffset) {
                var startMoved = (range.startContainer !== startContainer || range.startOffset != startOffset);
                var endMoved = (range.endContainer !== endContainer || range.endOffset != endOffset);
                var nativeRangeDifferent = !range.equals(range.nativeRange);

                // Always set both boundaries for the benefit of IE9 (see issue 35)
                if (startMoved || endMoved || nativeRangeDifferent) {
                    range.setEnd(endContainer, endOffset);
                    range.setStart(startContainer, startOffset);
                }
            }

            function detach(range) {
                range.nativeRange.detach();
                range.detached = true;
                var i = rangeProperties.length;
                while (i--) {
                    range[ rangeProperties[i] ] = null;
                }
            }

            var createBeforeAfterNodeSetter;

            WrappedRange = function(range) {
                if (!range) {
                    throw module.createError("WrappedRange: Range must be specified");
                }
                this.nativeRange = range;
                updateRangeProperties(this);
            };

            DomRange.createPrototypeRange(WrappedRange, updateNativeRange, detach);

            rangeProto = WrappedRange.prototype;

            rangeProto.selectNode = function(node) {
                this.nativeRange.selectNode(node);
                updateRangeProperties(this);
            };

            rangeProto.cloneContents = function() {
                return this.nativeRange.cloneContents();
            };

            // Due to a long-standing Firefox bug that I have not been able to find a reliable way to detect,
            // insertNode() is never delegated to the native range.

            rangeProto.surroundContents = function(node) {
                this.nativeRange.surroundContents(node);
                updateRangeProperties(this);
            };

            rangeProto.collapse = function(isStart) {
                this.nativeRange.collapse(isStart);
                updateRangeProperties(this);
            };

            rangeProto.cloneRange = function() {
                return new WrappedRange(this.nativeRange.cloneRange());
            };

            rangeProto.refresh = function() {
                updateRangeProperties(this);
            };

            rangeProto.toString = function() {
                return this.nativeRange.toString();
            };

            // Create test range and node for feature detection

            var testTextNode = document.createTextNode("test");
            getBody(document).appendChild(testTextNode);
            var range = document.createRange();

            /*--------------------------------------------------------------------------------------------------------*/

            // Test for Firefox 2 bug that prevents moving the start of a Range to a point after its current end and
            // correct for it

            range.setStart(testTextNode, 0);
            range.setEnd(testTextNode, 0);

            try {
                range.setStart(testTextNode, 1);

                rangeProto.setStart = function(node, offset) {
                    this.nativeRange.setStart(node, offset);
                    updateRangeProperties(this);
                };

                rangeProto.setEnd = function(node, offset) {
                    this.nativeRange.setEnd(node, offset);
                    updateRangeProperties(this);
                };

                createBeforeAfterNodeSetter = function(name) {
                    return function(node) {
                        this.nativeRange[name](node);
                        updateRangeProperties(this);
                    };
                };

            } catch(ex) {

                rangeProto.setStart = function(node, offset) {
                    try {
                        this.nativeRange.setStart(node, offset);
                    } catch (ex) {
                        this.nativeRange.setEnd(node, offset);
                        this.nativeRange.setStart(node, offset);
                    }
                    updateRangeProperties(this);
                };

                rangeProto.setEnd = function(node, offset) {
                    try {
                        this.nativeRange.setEnd(node, offset);
                    } catch (ex) {
                        this.nativeRange.setStart(node, offset);
                        this.nativeRange.setEnd(node, offset);
                    }
                    updateRangeProperties(this);
                };

                createBeforeAfterNodeSetter = function(name, oppositeName) {
                    return function(node) {
                        try {
                            this.nativeRange[name](node);
                        } catch (ex) {
                            this.nativeRange[oppositeName](node);
                            this.nativeRange[name](node);
                        }
                        updateRangeProperties(this);
                    };
                };
            }

            rangeProto.setStartBefore = createBeforeAfterNodeSetter("setStartBefore", "setEndBefore");
            rangeProto.setStartAfter = createBeforeAfterNodeSetter("setStartAfter", "setEndAfter");
            rangeProto.setEndBefore = createBeforeAfterNodeSetter("setEndBefore", "setStartBefore");
            rangeProto.setEndAfter = createBeforeAfterNodeSetter("setEndAfter", "setStartAfter");

            /*--------------------------------------------------------------------------------------------------------*/

            // Always use DOM4-compliant selectNodeContents implementation: it's simpler and less code than testing
            // whether the native implementation can be trusted
            rangeProto.selectNodeContents = function(node) {
                this.setStartAndEnd(node, 0, dom.getNodeLength(node));
            };

            /*--------------------------------------------------------------------------------------------------------*/

            // Test for and correct WebKit bug that has the behaviour of compareBoundaryPoints round the wrong way for
            // constants START_TO_END and END_TO_START: https://bugs.webkit.org/show_bug.cgi?id=20738

            range.selectNodeContents(testTextNode);
            range.setEnd(testTextNode, 3);

            var range2 = document.createRange();
            range2.selectNodeContents(testTextNode);
            range2.setEnd(testTextNode, 4);
            range2.setStart(testTextNode, 2);

            if (range.compareBoundaryPoints(range.START_TO_END, range2) == -1 &&
                    range.compareBoundaryPoints(range.END_TO_START, range2) == 1) {
                // This is the wrong way round, so correct for it

                rangeProto.compareBoundaryPoints = function(type, range) {
                    range = range.nativeRange || range;
                    if (type == range.START_TO_END) {
                        type = range.END_TO_START;
                    } else if (type == range.END_TO_START) {
                        type = range.START_TO_END;
                    }
                    return this.nativeRange.compareBoundaryPoints(type, range);
                };
            } else {
                rangeProto.compareBoundaryPoints = function(type, range) {
                    return this.nativeRange.compareBoundaryPoints(type, range.nativeRange || range);
                };
            }

            /*--------------------------------------------------------------------------------------------------------*/

            // Test for IE 9 deleteContents() and extractContents() bug and correct it. See issue 107.

            var el = document.createElement("div");
            el.innerHTML = "123";
            var textNode = el.firstChild;
            var body = getBody(document);
            body.appendChild(el);

            range.setStart(textNode, 1);
            range.setEnd(textNode, 2);
            range.deleteContents();

            if (textNode.data == "13") {
                // Behaviour is correct per DOM4 Range so wrap the browser's implementation of deleteContents() and
                // extractContents()
                rangeProto.deleteContents = function() {
                    this.nativeRange.deleteContents();
                    updateRangeProperties(this);
                };

                rangeProto.extractContents = function() {
                    var frag = this.nativeRange.extractContents();
                    updateRangeProperties(this);
                    return frag;
                };
            } else {
            }

            body.removeChild(el);
            body = null;

            /*--------------------------------------------------------------------------------------------------------*/

            // Test for existence of createContextualFragment and delegate to it if it exists
            if (util.isHostMethod(range, "createContextualFragment")) {
                rangeProto.createContextualFragment = function(fragmentStr) {
                    return this.nativeRange.createContextualFragment(fragmentStr);
                };
            }

            /*--------------------------------------------------------------------------------------------------------*/

            // Clean up
            getBody(document).removeChild(testTextNode);
            range.detach();
            range2.detach();

            rangeProto.getName = function() {
                return "WrappedRange";
            };

            api.WrappedRange = WrappedRange;

            api.createNativeRange = function(doc) {
                doc = getContentDocument(doc, module, "createNativeRange");
                return doc.createRange();
            };
        })();
    }

    if (api.features.implementsTextRange) {
        /*
        This is a workaround for a bug where IE returns the wrong container element from the TextRange's parentElement()
        method. For example, in the following (where pipes denote the selection boundaries):

        <ul id="ul"><li id="a">| a </li><li id="b"> b |</li></ul>

        var range = document.selection.createRange();
        alert(range.parentElement().id); // Should alert "ul" but alerts "b"

        This method returns the common ancestor node of the following:
        - the parentElement() of the textRange
        - the parentElement() of the textRange after calling collapse(true)
        - the parentElement() of the textRange after calling collapse(false)
        */
        var getTextRangeContainerElement = function(textRange) {
            var parentEl = textRange.parentElement();
            var range = textRange.duplicate();
            range.collapse(true);
            var startEl = range.parentElement();
            range = textRange.duplicate();
            range.collapse(false);
            var endEl = range.parentElement();
            var startEndContainer = (startEl == endEl) ? startEl : dom.getCommonAncestor(startEl, endEl);

            return startEndContainer == parentEl ? startEndContainer : dom.getCommonAncestor(parentEl, startEndContainer);
        };

        var textRangeIsCollapsed = function(textRange) {
            return textRange.compareEndPoints("StartToEnd", textRange) == 0;
        };

        // Gets the boundary of a TextRange expressed as a node and an offset within that node. This function started out as
        // an improved version of code found in Tim Cameron Ryan's IERange (http://code.google.com/p/ierange/) but has
        // grown, fixing problems with line breaks in preformatted text, adding workaround for IE TextRange bugs, handling
        // for inputs and images, plus optimizations.
        var getTextRangeBoundaryPosition = function(textRange, wholeRangeContainerElement, isStart, isCollapsed, startInfo) {
            var workingRange = textRange.duplicate();
            workingRange.collapse(isStart);
            var containerElement = workingRange.parentElement();

            // Sometimes collapsing a TextRange that's at the start of a text node can move it into the previous node, so
            // check for that
            if (!dom.isOrIsAncestorOf(wholeRangeContainerElement, containerElement)) {
                containerElement = wholeRangeContainerElement;
            }


            // Deal with nodes that cannot "contain rich HTML markup". In practice, this means form inputs, images and
            // similar. See http://msdn.microsoft.com/en-us/library/aa703950%28VS.85%29.aspx
            if (!containerElement.canHaveHTML) {
                var pos = new DomPosition(containerElement.parentNode, dom.getNodeIndex(containerElement));
                return {
                    boundaryPosition: pos,
                    nodeInfo: {
                        nodeIndex: pos.offset,
                        containerElement: pos.node
                    }
                };
            }

            var workingNode = dom.getDocument(containerElement).createElement("span");

            // Workaround for HTML5 Shiv's insane violation of document.createElement(). See Rangy issue 104 and HTML5
            // Shiv issue 64: https://github.com/aFarkas/html5shiv/issues/64
            if (workingNode.parentNode) {
                workingNode.parentNode.removeChild(workingNode);
            }

            var comparison, workingComparisonType = isStart ? "StartToStart" : "StartToEnd";
            var previousNode, nextNode, boundaryPosition, boundaryNode;
            var start = (startInfo && startInfo.containerElement == containerElement) ? startInfo.nodeIndex : 0;
            var childNodeCount = containerElement.childNodes.length;
            var end = childNodeCount;

            // Check end first. Code within the loop assumes that the endth child node of the container is definitely
            // after the range boundary.
            var nodeIndex = end;

            while (true) {
                if (nodeIndex == childNodeCount) {
                    containerElement.appendChild(workingNode);
                } else {
                    containerElement.insertBefore(workingNode, containerElement.childNodes[nodeIndex]);
                }
                workingRange.moveToElementText(workingNode);
                comparison = workingRange.compareEndPoints(workingComparisonType, textRange);
                if (comparison == 0 || start == end) {
                    break;
                } else if (comparison == -1) {
                    if (end == start + 1) {
                        // We know the endth child node is after the range boundary, so we must be done.
                        break;
                    } else {
                        start = nodeIndex;
                    }
                } else {
                    end = (end == start + 1) ? start : nodeIndex;
                }
                nodeIndex = Math.floor((start + end) / 2);
                containerElement.removeChild(workingNode);
            }


            // We've now reached or gone past the boundary of the text range we're interested in
            // so have identified the node we want
            boundaryNode = workingNode.nextSibling;

            if (comparison == -1 && boundaryNode && isCharacterDataNode(boundaryNode)) {
                // This is a character data node (text, comment, cdata). The working range is collapsed at the start of the
                // node containing the text range's boundary, so we move the end of the working range to the boundary point
                // and measure the length of its text to get the boundary's offset within the node.
                workingRange.setEndPoint(isStart ? "EndToStart" : "EndToEnd", textRange);

                var offset;

                if (/[\r\n]/.test(boundaryNode.data)) {
                    /*
                    For the particular case of a boundary within a text node containing rendered line breaks (within a <pre>
                    element, for example), we need a slightly complicated approach to get the boundary's offset in IE. The
                    facts:

                    - Each line break is represented as \r in the text node's data/nodeValue properties
                    - Each line break is represented as \r\n in the TextRange's 'text' property
                    - The 'text' property of the TextRange does not contain trailing line breaks

                    To get round the problem presented by the final fact above, we can use the fact that TextRange's
                    moveStart() and moveEnd() methods return the actual number of characters moved, which is not necessarily
                    the same as the number of characters it was instructed to move. The simplest approach is to use this to
                    store the characters moved when moving both the start and end of the range to the start of the document
                    body and subtracting the start offset from the end offset (the "move-negative-gazillion" method).
                    However, this is extremely slow when the document is large and the range is near the end of it. Clearly
                    doing the mirror image (i.e. moving the range boundaries to the end of the document) has the same
                    problem.

                    Another approach that works is to use moveStart() to move the start boundary of the range up to the end
                    boundary one character at a time and incrementing a counter with the value returned by the moveStart()
                    call. However, the check for whether the start boundary has reached the end boundary is expensive, so
                    this method is slow (although unlike "move-negative-gazillion" is largely unaffected by the location of
                    the range within the document).

                    The method below is a hybrid of the two methods above. It uses the fact that a string containing the
                    TextRange's 'text' property with each \r\n converted to a single \r character cannot be longer than the
                    text of the TextRange, so the start of the range is moved that length initially and then a character at
                    a time to make up for any trailing line breaks not contained in the 'text' property. This has good
                    performance in most situations compared to the previous two methods.
                    */
                    var tempRange = workingRange.duplicate();
                    var rangeLength = tempRange.text.replace(/\r\n/g, "\r").length;

                    offset = tempRange.moveStart("character", rangeLength);
                    while ( (comparison = tempRange.compareEndPoints("StartToEnd", tempRange)) == -1) {
                        offset++;
                        tempRange.moveStart("character", 1);
                    }
                } else {
                    offset = workingRange.text.length;
                }
                boundaryPosition = new DomPosition(boundaryNode, offset);
            } else {

                // If the boundary immediately follows a character data node and this is the end boundary, we should favour
                // a position within that, and likewise for a start boundary preceding a character data node
                previousNode = (isCollapsed || !isStart) && workingNode.previousSibling;
                nextNode = (isCollapsed || isStart) && workingNode.nextSibling;
                if (nextNode && isCharacterDataNode(nextNode)) {
                    boundaryPosition = new DomPosition(nextNode, 0);
                } else if (previousNode && isCharacterDataNode(previousNode)) {
                    boundaryPosition = new DomPosition(previousNode, previousNode.data.length);
                } else {
                    boundaryPosition = new DomPosition(containerElement, dom.getNodeIndex(workingNode));
                }
            }

            // Clean up
            workingNode.parentNode.removeChild(workingNode);

            return {
                boundaryPosition: boundaryPosition,
                nodeInfo: {
                    nodeIndex: nodeIndex,
                    containerElement: containerElement
                }
            };
        };

        // Returns a TextRange representing the boundary of a TextRange expressed as a node and an offset within that node.
        // This function started out as an optimized version of code found in Tim Cameron Ryan's IERange
        // (http://code.google.com/p/ierange/)
        var createBoundaryTextRange = function(boundaryPosition, isStart) {
            var boundaryNode, boundaryParent, boundaryOffset = boundaryPosition.offset;
            var doc = dom.getDocument(boundaryPosition.node);
            var workingNode, childNodes, workingRange = getBody(doc).createTextRange();
            var nodeIsDataNode = isCharacterDataNode(boundaryPosition.node);

            if (nodeIsDataNode) {
                boundaryNode = boundaryPosition.node;
                boundaryParent = boundaryNode.parentNode;
            } else {
                childNodes = boundaryPosition.node.childNodes;
                boundaryNode = (boundaryOffset < childNodes.length) ? childNodes[boundaryOffset] : null;
                boundaryParent = boundaryPosition.node;
            }

            // Position the range immediately before the node containing the boundary
            workingNode = doc.createElement("span");

            // Making the working element non-empty element persuades IE to consider the TextRange boundary to be within the
            // element rather than immediately before or after it
            workingNode.innerHTML = "&#feff;";

            // insertBefore is supposed to work like appendChild if the second parameter is null. However, a bug report
            // for IERange suggests that it can crash the browser: http://code.google.com/p/ierange/issues/detail?id=12
            if (boundaryNode) {
                boundaryParent.insertBefore(workingNode, boundaryNode);
            } else {
                boundaryParent.appendChild(workingNode);
            }

            workingRange.moveToElementText(workingNode);
            workingRange.collapse(!isStart);

            // Clean up
            boundaryParent.removeChild(workingNode);

            // Move the working range to the text offset, if required
            if (nodeIsDataNode) {
                workingRange[isStart ? "moveStart" : "moveEnd"]("character", boundaryOffset);
            }

            return workingRange;
        };

        /*------------------------------------------------------------------------------------------------------------*/

        // This is a wrapper around a TextRange, providing full DOM Range functionality using rangy's DomRange as a
        // prototype

        WrappedTextRange = function(textRange) {
            this.textRange = textRange;
            this.refresh();
        };

        WrappedTextRange.prototype = new DomRange(document);

        WrappedTextRange.prototype.refresh = function() {
            var start, end, startBoundary;

            // TextRange's parentElement() method cannot be trusted. getTextRangeContainerElement() works around that.
            var rangeContainerElement = getTextRangeContainerElement(this.textRange);

            if (textRangeIsCollapsed(this.textRange)) {
                end = start = getTextRangeBoundaryPosition(this.textRange, rangeContainerElement, true,
                    true).boundaryPosition;
            } else {
                startBoundary = getTextRangeBoundaryPosition(this.textRange, rangeContainerElement, true, false);
                start = startBoundary.boundaryPosition;

                // An optimization used here is that if the start and end boundaries have the same parent element, the
                // search scope for the end boundary can be limited to exclude the portion of the element that precedes
                // the start boundary
                end = getTextRangeBoundaryPosition(this.textRange, rangeContainerElement, false, false,
                    startBoundary.nodeInfo).boundaryPosition;
            }

            this.setStart(start.node, start.offset);
            this.setEnd(end.node, end.offset);
        };

        WrappedTextRange.prototype.getName = function() {
            return "WrappedTextRange";
        };

        DomRange.copyComparisonConstants(WrappedTextRange);

        WrappedTextRange.rangeToTextRange = function(range) {
            if (range.collapsed) {
                return createBoundaryTextRange(new DomPosition(range.startContainer, range.startOffset), true);
            } else {
                var startRange = createBoundaryTextRange(new DomPosition(range.startContainer, range.startOffset), true);
                var endRange = createBoundaryTextRange(new DomPosition(range.endContainer, range.endOffset), false);
                var textRange = getBody( DomRange.getRangeDocument(range) ).createTextRange();
                textRange.setEndPoint("StartToStart", startRange);
                textRange.setEndPoint("EndToEnd", endRange);
                return textRange;
            }
        };

        api.WrappedTextRange = WrappedTextRange;

        // IE 9 and above have both implementations and Rangy makes both available. The next few lines sets which
        // implementation to use by default.
        if (!api.features.implementsDomRange || api.config.preferTextRange) {
            // Add WrappedTextRange as the Range property of the global object to allow expression like Range.END_TO_END to work
            var globalObj = (function() { return this; })();
            if (typeof globalObj.Range == "undefined") {
                globalObj.Range = WrappedTextRange;
            }

            api.createNativeRange = function(doc) {
                doc = getContentDocument(doc, module, "createNativeRange");
                return getBody(doc).createTextRange();
            };

            api.WrappedRange = WrappedTextRange;
        }
    }

    api.createRange = function(doc) {
        doc = getContentDocument(doc, module, "createRange");
        return new api.WrappedRange(api.createNativeRange(doc));
    };

    api.createRangyRange = function(doc) {
        doc = getContentDocument(doc, module, "createRangyRange");
        return new DomRange(doc);
    };

    api.createIframeRange = function(iframeEl) {
        module.deprecationNotice("createIframeRange()", "createRange(iframeEl)");
        return api.createRange(iframeEl);
    };

    api.createIframeRangyRange = function(iframeEl) {
        module.deprecationNotice("createIframeRangyRange()", "createRangyRange(iframeEl)");
        return api.createRangyRange(iframeEl);
    };

    api.addCreateMissingNativeApiListener(function(win) {
        var doc = win.document;
        if (typeof doc.createRange == "undefined") {
            doc.createRange = function() {
                return api.createRange(doc);
            };
        }
        doc = win = null;
    });
});
// This module creates a selection object wrapper that conforms as closely as possible to the Selection specification
// in the HTML Editing spec (http://dvcs.w3.org/hg/editing/raw-file/tip/editing.html#selections)
rangy.createCoreModule("WrappedSelection", ["DomRange", "WrappedRange"], function(api, module) {
    api.config.checkSelectionRanges = true;

    var BOOLEAN = "boolean";
    var dom = api.dom;
    var util = api.util;
    var isHostMethod = util.isHostMethod;
    var DomRange = api.DomRange;
    var WrappedRange = api.WrappedRange;
    var DOMException = api.DOMException;
    var DomPosition = dom.DomPosition;
    var getNativeSelection;
    var selectionIsCollapsed;
    var features = api.features;
    var CONTROL = "Control";
    var getDocument = dom.getDocument;
    var getBody = dom.getBody;
    var rangesEqual = DomRange.rangesEqual;


    // Utility function to support direction parameters in the API that may be a string ("backward" or "forward") or a
    // Boolean (true for backwards).
    function isDirectionBackward(dir) {
        return (typeof dir == "string") ? (dir == "backward") : !!dir;
    }

    function getWindow(win, methodName) {
        if (!win) {
            return window;
        } else if (dom.isWindow(win)) {
            return win;
        } else if (win instanceof WrappedSelection) {
            return win.win;
        } else {
            var doc = dom.getContentDocument(win, module, methodName);
            return dom.getWindow(doc);
        }
    }

    function getWinSelection(winParam) {
        return getWindow(winParam, "getWinSelection").getSelection();
    }

    function getDocSelection(winParam) {
        return getWindow(winParam, "getDocSelection").document.selection;
    }

    // Test for the Range/TextRange and Selection features required
    // Test for ability to retrieve selection
    var implementsWinGetSelection = isHostMethod(window, "getSelection"),
        implementsDocSelection = util.isHostObject(document, "selection");

    features.implementsWinGetSelection = implementsWinGetSelection;
    features.implementsDocSelection = implementsDocSelection;

    var useDocumentSelection = implementsDocSelection && (!implementsWinGetSelection || api.config.preferTextRange);

    if (useDocumentSelection) {
        getNativeSelection = getDocSelection;
        api.isSelectionValid = function(winParam) {
            var doc = getWindow(winParam, "isSelectionValid").document, nativeSel = doc.selection;

            // Check whether the selection TextRange is actually contained within the correct document
            return (nativeSel.type != "None" || getDocument(nativeSel.createRange().parentElement()) == doc);
        };
    } else if (implementsWinGetSelection) {
        getNativeSelection = getWinSelection;
        api.isSelectionValid = function() {
            return true;
        };
    } else {
        module.fail("Neither document.selection or window.getSelection() detected.");
    }

    api.getNativeSelection = getNativeSelection;

    var testSelection = getNativeSelection();
    var testRange = api.createNativeRange(document);
    var body = getBody(document);

    // Obtaining a range from a selection
    var selectionHasAnchorAndFocus = util.areHostProperties(testSelection,
        ["anchorNode", "focusNode", "anchorOffset", "focusOffset"]);

    features.selectionHasAnchorAndFocus = selectionHasAnchorAndFocus;

    // Test for existence of native selection extend() method
    var selectionHasExtend = isHostMethod(testSelection, "extend");
    features.selectionHasExtend = selectionHasExtend;

    // Test if rangeCount exists
    var selectionHasRangeCount = (typeof testSelection.rangeCount == "number");
    features.selectionHasRangeCount = selectionHasRangeCount;

    var selectionSupportsMultipleRanges = false;
    var collapsedNonEditableSelectionsSupported = true;

    if (util.areHostMethods(testSelection, ["addRange", "getRangeAt", "removeAllRanges"]) &&
            typeof testSelection.rangeCount == "number" && features.implementsDomRange) {

        (function() {
            // Previously an iframe was used but this caused problems in some circumstances in IE, so tests are
            // performed on the current document's selection. See issue 109.

            // Note also that if a selection previously existed, it is wiped by these tests. This should usually be fine
            // because initialization usually happens when the document loads, but could be a problem for a script that
            // loads and initializes Rangy later. If anyone complains, code could be added to save and restore the
            // selection.
            var sel = window.getSelection();
            if (sel) {
                var body = getBody(document);
                var testEl = body.appendChild( document.createElement("div") );
                testEl.contentEditable = "false";
                var textNode = testEl.appendChild( document.createTextNode("\u00a0\u00a0\u00a0") );

                // Test whether the native selection will allow a collapsed selection within a non-editable element
                var r1 = document.createRange();

                r1.setStart(textNode, 1);
                r1.collapse(true);
                sel.addRange(r1);
                collapsedNonEditableSelectionsSupported = (sel.rangeCount == 1);
                sel.removeAllRanges();

                // Test whether the native selection is capable of supporting multiple ranges
                var r2 = r1.cloneRange();
                r1.setStart(textNode, 0);
                r2.setEnd(textNode, 3);
                r2.setStart(textNode, 2);
                sel.addRange(r1);
                sel.addRange(r2);

                selectionSupportsMultipleRanges = (sel.rangeCount == 2);

                // Clean up
                body.removeChild(testEl);
                sel.removeAllRanges();
                r1.detach();
                r2.detach();
            }
        })();
    }

    features.selectionSupportsMultipleRanges = selectionSupportsMultipleRanges;
    features.collapsedNonEditableSelectionsSupported = collapsedNonEditableSelectionsSupported;

    // ControlRanges
    var implementsControlRange = false, testControlRange;

    if (body && isHostMethod(body, "createControlRange")) {
        testControlRange = body.createControlRange();
        if (util.areHostProperties(testControlRange, ["item", "add"])) {
            implementsControlRange = true;
        }
    }
    features.implementsControlRange = implementsControlRange;

    // Selection collapsedness
    if (selectionHasAnchorAndFocus) {
        selectionIsCollapsed = function(sel) {
            return sel.anchorNode === sel.focusNode && sel.anchorOffset === sel.focusOffset;
        };
    } else {
        selectionIsCollapsed = function(sel) {
            return sel.rangeCount ? sel.getRangeAt(sel.rangeCount - 1).collapsed : false;
        };
    }

    function updateAnchorAndFocusFromRange(sel, range, backward) {
        var anchorPrefix = backward ? "end" : "start", focusPrefix = backward ? "start" : "end";
        sel.anchorNode = range[anchorPrefix + "Container"];
        sel.anchorOffset = range[anchorPrefix + "Offset"];
        sel.focusNode = range[focusPrefix + "Container"];
        sel.focusOffset = range[focusPrefix + "Offset"];
    }

    function updateAnchorAndFocusFromNativeSelection(sel) {
        var nativeSel = sel.nativeSelection;
        sel.anchorNode = nativeSel.anchorNode;
        sel.anchorOffset = nativeSel.anchorOffset;
        sel.focusNode = nativeSel.focusNode;
        sel.focusOffset = nativeSel.focusOffset;
    }

    function updateEmptySelection(sel) {
        sel.anchorNode = sel.focusNode = null;
        sel.anchorOffset = sel.focusOffset = 0;
        sel.rangeCount = 0;
        sel.isCollapsed = true;
        sel._ranges.length = 0;
    }

    function getNativeRange(range) {
        var nativeRange;
        if (range instanceof DomRange) {
            nativeRange = api.createNativeRange(range.getDocument());
            nativeRange.setEnd(range.endContainer, range.endOffset);
            nativeRange.setStart(range.startContainer, range.startOffset);
        } else if (range instanceof WrappedRange) {
            nativeRange = range.nativeRange;
        } else if (features.implementsDomRange && (range instanceof dom.getWindow(range.startContainer).Range)) {
            nativeRange = range;
        }
        return nativeRange;
    }

    function rangeContainsSingleElement(rangeNodes) {
        if (!rangeNodes.length || rangeNodes[0].nodeType != 1) {
            return false;
        }
        for (var i = 1, len = rangeNodes.length; i < len; ++i) {
            if (!dom.isAncestorOf(rangeNodes[0], rangeNodes[i])) {
                return false;
            }
        }
        return true;
    }

    function getSingleElementFromRange(range) {
        var nodes = range.getNodes();
        if (!rangeContainsSingleElement(nodes)) {
            throw module.createError("getSingleElementFromRange: range " + range.inspect() + " did not consist of a single element");
        }
        return nodes[0];
    }

    // Simple, quick test which only needs to distinguish between a TextRange and a ControlRange
    function isTextRange(range) {
        return !!range && typeof range.text != "undefined";
    }

    function updateFromTextRange(sel, range) {
        // Create a Range from the selected TextRange
        var wrappedRange = new WrappedRange(range);
        sel._ranges = [wrappedRange];

        updateAnchorAndFocusFromRange(sel, wrappedRange, false);
        sel.rangeCount = 1;
        sel.isCollapsed = wrappedRange.collapsed;
    }

    function updateControlSelection(sel) {
        // Update the wrapped selection based on what's now in the native selection
        sel._ranges.length = 0;
        if (sel.docSelection.type == "None") {
            updateEmptySelection(sel);
        } else {
            var controlRange = sel.docSelection.createRange();
            if (isTextRange(controlRange)) {
                // This case (where the selection type is "Control" and calling createRange() on the selection returns
                // a TextRange) can happen in IE 9. It happens, for example, when all elements in the selected
                // ControlRange have been removed from the ControlRange and removed from the document.
                updateFromTextRange(sel, controlRange);
            } else {
                sel.rangeCount = controlRange.length;
                var range, doc = getDocument(controlRange.item(0));
                for (var i = 0; i < sel.rangeCount; ++i) {
                    range = api.createRange(doc);
                    range.selectNode(controlRange.item(i));
                    sel._ranges.push(range);
                }
                sel.isCollapsed = sel.rangeCount == 1 && sel._ranges[0].collapsed;
                updateAnchorAndFocusFromRange(sel, sel._ranges[sel.rangeCount - 1], false);
            }
        }
    }

    function addRangeToControlSelection(sel, range) {
        var controlRange = sel.docSelection.createRange();
        var rangeElement = getSingleElementFromRange(range);

        // Create a new ControlRange containing all the elements in the selected ControlRange plus the element
        // contained by the supplied range
        var doc = getDocument(controlRange.item(0));
        var newControlRange = getBody(doc).createControlRange();
        for (var i = 0, len = controlRange.length; i < len; ++i) {
            newControlRange.add(controlRange.item(i));
        }
        try {
            newControlRange.add(rangeElement);
        } catch (ex) {
            throw module.createError("addRange(): Element within the specified Range could not be added to control selection (does it have layout?)");
        }
        newControlRange.select();

        // Update the wrapped selection based on what's now in the native selection
        updateControlSelection(sel);
    }

    var getSelectionRangeAt;

    if (isHostMethod(testSelection, "getRangeAt")) {
        // try/catch is present because getRangeAt() must have thrown an error in some browser and some situation.
        // Unfortunately, I didn't write a comment about the specifics and am now scared to take it out. Let that be a
        // lesson to us all, especially me.
        getSelectionRangeAt = function(sel, index) {
            try {
                return sel.getRangeAt(index);
            } catch (ex) {
                return null;
            }
        };
    } else if (selectionHasAnchorAndFocus) {
        getSelectionRangeAt = function(sel) {
            var doc = getDocument(sel.anchorNode);
            var range = api.createRange(doc);
            range.setStartAndEnd(sel.anchorNode, sel.anchorOffset, sel.focusNode, sel.focusOffset);

            // Handle the case when the selection was selected backwards (from the end to the start in the
            // document)
            if (range.collapsed !== this.isCollapsed) {
                range.setStartAndEnd(sel.focusNode, sel.focusOffset, sel.anchorNode, sel.anchorOffset);
            }

            return range;
        };
    }

    function WrappedSelection(selection, docSelection, win) {
        this.nativeSelection = selection;
        this.docSelection = docSelection;
        this._ranges = [];
        this.win = win;
        this.refresh();
    }

    WrappedSelection.prototype = api.selectionPrototype;

    function deleteProperties(sel) {
        sel.win = sel.anchorNode = sel.focusNode = sel._ranges = null;
        sel.rangeCount = sel.anchorOffset = sel.focusOffset = 0;
        sel.detached = true;
    }

    var cachedRangySelections = [];

    function findCachedSelection(win, action) {
        var i = cachedRangySelections.length, cached, sel;
        while (i--) {
            cached = cachedRangySelections[i];
            sel = cached.selection;
            if (action == "deleteAll") {
                deleteProperties(sel);
            } else if (cached.win == win) {
                if (action == "delete") {
                    cachedRangySelections.splice(i, 1);
                    return true;
                } else {
                    return sel;
                }
            }
        }
        if (action == "deleteAll") {
            cachedRangySelections.length = 0;
        }
        return null;
    }

    var getSelection = function(win) {
        // Check if the parameter is a Rangy Selection object
        if (win && win instanceof WrappedSelection) {
            win.refresh();
            return win;
        }

        win = getWindow(win, "getNativeSelection");

        var sel = findCachedSelection(win);
        var nativeSel = getNativeSelection(win), docSel = implementsDocSelection ? getDocSelection(win) : null;
        if (sel) {
            sel.nativeSelection = nativeSel;
            sel.docSelection = docSel;
            sel.refresh();
        } else {
            sel = new WrappedSelection(nativeSel, docSel, win);
            cachedRangySelections.push( { win: win, selection: sel } );
        }
        return sel;
    };

    api.getSelection = getSelection;

    api.getIframeSelection = function(iframeEl) {
        module.deprecationNotice("getIframeSelection()", "getSelection(iframeEl)");
        return api.getSelection(dom.getIframeWindow(iframeEl));
    };

    var selProto = WrappedSelection.prototype;

    function createControlSelection(sel, ranges) {
        // Ensure that the selection becomes of type "Control"
        var doc = getDocument(ranges[0].startContainer);
        var controlRange = getBody(doc).createControlRange();
        for (var i = 0, el, len = ranges.length; i < len; ++i) {
            el = getSingleElementFromRange(ranges[i]);
            try {
                controlRange.add(el);
            } catch (ex) {
                throw module.createError("setRanges(): Element within one of the specified Ranges could not be added to control selection (does it have layout?)");
            }
        }
        controlRange.select();

        // Update the wrapped selection based on what's now in the native selection
        updateControlSelection(sel);
    }

    // Selecting a range
    if (!useDocumentSelection && selectionHasAnchorAndFocus && util.areHostMethods(testSelection, ["removeAllRanges", "addRange"])) {
        selProto.removeAllRanges = function() {
            this.nativeSelection.removeAllRanges();
            updateEmptySelection(this);
        };

        var addRangeBackward = function(sel, range) {
            var doc = DomRange.getRangeDocument(range);
            var endRange = api.createRange(doc);
            endRange.collapseToPoint(range.endContainer, range.endOffset);
            sel.nativeSelection.addRange(getNativeRange(endRange));
            sel.nativeSelection.extend(range.startContainer, range.startOffset);
            sel.refresh();
        };

        if (selectionHasRangeCount) {
            selProto.addRange = function(range, direction) {
                if (implementsControlRange && implementsDocSelection && this.docSelection.type == CONTROL) {
                    addRangeToControlSelection(this, range);
                } else {
                    if (isDirectionBackward(direction) && selectionHasExtend) {
                        addRangeBackward(this, range);
                    } else {
                        var previousRangeCount;
                        if (selectionSupportsMultipleRanges) {
                            previousRangeCount = this.rangeCount;
                        } else {
                            this.removeAllRanges();
                            previousRangeCount = 0;
                        }
                        // Clone the native range so that changing the selected range does not affect the selection.
                        // This is contrary to the spec but is the only way to achieve consistency between browsers. See
                        // issue 80.
                        this.nativeSelection.addRange(getNativeRange(range).cloneRange());

                        // Check whether adding the range was successful
                        this.rangeCount = this.nativeSelection.rangeCount;

                        if (this.rangeCount == previousRangeCount + 1) {
                            // The range was added successfully

                            // Check whether the range that we added to the selection is reflected in the last range extracted from
                            // the selection
                            if (api.config.checkSelectionRanges) {
                                var nativeRange = getSelectionRangeAt(this.nativeSelection, this.rangeCount - 1);
                                if (nativeRange && !rangesEqual(nativeRange, range)) {
                                    // Happens in WebKit with, for example, a selection placed at the start of a text node
                                    range = new WrappedRange(nativeRange);
                                }
                            }
                            this._ranges[this.rangeCount - 1] = range;
                            updateAnchorAndFocusFromRange(this, range, selectionIsBackward(this.nativeSelection));
                            this.isCollapsed = selectionIsCollapsed(this);
                        } else {
                            // The range was not added successfully. The simplest thing is to refresh
                            this.refresh();
                        }
                    }
                }
            };
        } else {
            selProto.addRange = function(range, direction) {
                if (isDirectionBackward(direction) && selectionHasExtend) {
                    addRangeBackward(this, range);
                } else {
                    this.nativeSelection.addRange(getNativeRange(range));
                    this.refresh();
                }
            };
        }

        selProto.setRanges = function(ranges) {
            if (implementsControlRange && ranges.length > 1) {
                createControlSelection(this, ranges);
            } else {
                this.removeAllRanges();
                for (var i = 0, len = ranges.length; i < len; ++i) {
                    this.addRange(ranges[i]);
                }
            }
        };
    } else if (isHostMethod(testSelection, "empty") && isHostMethod(testRange, "select") &&
               implementsControlRange && useDocumentSelection) {

        selProto.removeAllRanges = function() {
            // Added try/catch as fix for issue #21
            try {
                this.docSelection.empty();

                // Check for empty() not working (issue #24)
                if (this.docSelection.type != "None") {
                    // Work around failure to empty a control selection by instead selecting a TextRange and then
                    // calling empty()
                    var doc;
                    if (this.anchorNode) {
                        doc = getDocument(this.anchorNode);
                    } else if (this.docSelection.type == CONTROL) {
                        var controlRange = this.docSelection.createRange();
                        if (controlRange.length) {
                            doc = getDocument( controlRange.item(0) );
                        }
                    }
                    if (doc) {
                        var textRange = getBody(doc).createTextRange();
                        textRange.select();
                        this.docSelection.empty();
                    }
                }
            } catch(ex) {}
            updateEmptySelection(this);
        };

        selProto.addRange = function(range) {
            if (this.docSelection.type == CONTROL) {
                addRangeToControlSelection(this, range);
            } else {
                api.WrappedTextRange.rangeToTextRange(range).select();
                this._ranges[0] = range;
                this.rangeCount = 1;
                this.isCollapsed = this._ranges[0].collapsed;
                updateAnchorAndFocusFromRange(this, range, false);
            }
        };

        selProto.setRanges = function(ranges) {
            this.removeAllRanges();
            var rangeCount = ranges.length;
            if (rangeCount > 1) {
                createControlSelection(this, ranges);
            } else if (rangeCount) {
                this.addRange(ranges[0]);
            }
        };
    } else {
        module.fail("No means of selecting a Range or TextRange was found");
        return false;
    }

    selProto.getRangeAt = function(index) {
        if (index < 0 || index >= this.rangeCount) {
            throw new DOMException("INDEX_SIZE_ERR");
        } else {
            // Clone the range to preserve selection-range independence. See issue 80.
            return this._ranges[index].cloneRange();
        }
    };

    var refreshSelection;

    if (useDocumentSelection) {
        refreshSelection = function(sel) {
            var range;
            if (api.isSelectionValid(sel.win)) {
                range = sel.docSelection.createRange();
            } else {
                range = getBody(sel.win.document).createTextRange();
                range.collapse(true);
            }

            if (sel.docSelection.type == CONTROL) {
                updateControlSelection(sel);
            } else if (isTextRange(range)) {
                updateFromTextRange(sel, range);
            } else {
                updateEmptySelection(sel);
            }
        };
    } else if (isHostMethod(testSelection, "getRangeAt") && typeof testSelection.rangeCount == "number") {
        refreshSelection = function(sel) {
            if (implementsControlRange && implementsDocSelection && sel.docSelection.type == CONTROL) {
                updateControlSelection(sel);
            } else {
                sel._ranges.length = sel.rangeCount = sel.nativeSelection.rangeCount;
                if (sel.rangeCount) {
                    for (var i = 0, len = sel.rangeCount; i < len; ++i) {
                        sel._ranges[i] = new api.WrappedRange(sel.nativeSelection.getRangeAt(i));
                    }
                    updateAnchorAndFocusFromRange(sel, sel._ranges[sel.rangeCount - 1], selectionIsBackward(sel.nativeSelection));
                    sel.isCollapsed = selectionIsCollapsed(sel);
                } else {
                    updateEmptySelection(sel);
                }
            }
        };
    } else if (selectionHasAnchorAndFocus && typeof testSelection.isCollapsed == BOOLEAN && typeof testRange.collapsed == BOOLEAN && features.implementsDomRange) {
        refreshSelection = function(sel) {
            var range, nativeSel = sel.nativeSelection;
            if (nativeSel.anchorNode) {
                range = getSelectionRangeAt(nativeSel, 0);
                sel._ranges = [range];
                sel.rangeCount = 1;
                updateAnchorAndFocusFromNativeSelection(sel);
                sel.isCollapsed = selectionIsCollapsed(sel);
            } else {
                updateEmptySelection(sel);
            }
        };
    } else {
        module.fail("No means of obtaining a Range or TextRange from the user's selection was found");
        return false;
    }

    selProto.refresh = function(checkForChanges) {
        var oldRanges = checkForChanges ? this._ranges.slice(0) : null;
        var oldAnchorNode = this.anchorNode, oldAnchorOffset = this.anchorOffset;

        refreshSelection(this);
        if (checkForChanges) {
            // Check the range count first
            var i = oldRanges.length;
            if (i != this._ranges.length) {
                return true;
            }

            // Now check the direction. Checking the anchor position is the same is enough since we're checking all the
            // ranges after this
            if (this.anchorNode != oldAnchorNode || this.anchorOffset != oldAnchorOffset) {
                return true;
            }

            // Finally, compare each range in turn
            while (i--) {
                if (!rangesEqual(oldRanges[i], this._ranges[i])) {
                    return true;
                }
            }
            return false;
        }
    };

    // Removal of a single range
    var removeRangeManually = function(sel, range) {
        var ranges = sel.getAllRanges();
        sel.removeAllRanges();
        for (var i = 0, len = ranges.length; i < len; ++i) {
            if (!rangesEqual(range, ranges[i])) {
                sel.addRange(ranges[i]);
            }
        }
        if (!sel.rangeCount) {
            updateEmptySelection(sel);
        }
    };

    if (implementsControlRange) {
        selProto.removeRange = function(range) {
            if (this.docSelection.type == CONTROL) {
                var controlRange = this.docSelection.createRange();
                var rangeElement = getSingleElementFromRange(range);

                // Create a new ControlRange containing all the elements in the selected ControlRange minus the
                // element contained by the supplied range
                var doc = getDocument(controlRange.item(0));
                var newControlRange = getBody(doc).createControlRange();
                var el, removed = false;
                for (var i = 0, len = controlRange.length; i < len; ++i) {
                    el = controlRange.item(i);
                    if (el !== rangeElement || removed) {
                        newControlRange.add(controlRange.item(i));
                    } else {
                        removed = true;
                    }
                }
                newControlRange.select();

                // Update the wrapped selection based on what's now in the native selection
                updateControlSelection(this);
            } else {
                removeRangeManually(this, range);
            }
        };
    } else {
        selProto.removeRange = function(range) {
            removeRangeManually(this, range);
        };
    }

    // Detecting if a selection is backward
    var selectionIsBackward;
    if (!useDocumentSelection && selectionHasAnchorAndFocus && features.implementsDomRange) {
        selectionIsBackward = function(sel) {
            var backward = false;
            if (sel.anchorNode) {
                backward = (dom.comparePoints(sel.anchorNode, sel.anchorOffset, sel.focusNode, sel.focusOffset) == 1);
            }
            return backward;
        };

        selProto.isBackward = function() {
            return selectionIsBackward(this);
        };
    } else {
        selectionIsBackward = selProto.isBackward = function() {
            return false;
        };
    }

    // Create an alias for backwards compatibility. From 1.3, everything is "backward" rather than "backwards"
    selProto.isBackwards = selProto.isBackward;

    // Selection stringifier
    // This is conformant to the old HTML5 selections draft spec but differs from WebKit and Mozilla's implementation.
    // The current spec does not yet define this method.
    selProto.toString = function() {
        var rangeTexts = [];
        for (var i = 0, len = this.rangeCount; i < len; ++i) {
            rangeTexts[i] = "" + this._ranges[i];
        }
        return rangeTexts.join("");
    };

    function assertNodeInSameDocument(sel, node) {
        if (sel.win.document != getDocument(node)) {
            throw new DOMException("WRONG_DOCUMENT_ERR");
        }
    }

    // No current browser conforms fully to the spec for this method, so Rangy's own method is always used
    selProto.collapse = function(node, offset) {
        assertNodeInSameDocument(this, node);
        var range = api.createRange(node);
        range.collapseToPoint(node, offset);
        this.setSingleRange(range);
        this.isCollapsed = true;
    };

    selProto.collapseToStart = function() {
        if (this.rangeCount) {
            var range = this._ranges[0];
            this.collapse(range.startContainer, range.startOffset);
        } else {
            throw new DOMException("INVALID_STATE_ERR");
        }
    };

    selProto.collapseToEnd = function() {
        if (this.rangeCount) {
            var range = this._ranges[this.rangeCount - 1];
            this.collapse(range.endContainer, range.endOffset);
        } else {
            throw new DOMException("INVALID_STATE_ERR");
        }
    };

    // The spec is very specific on how selectAllChildren should be implemented so the native implementation is
    // never used by Rangy.
    selProto.selectAllChildren = function(node) {
        assertNodeInSameDocument(this, node);
        var range = api.createRange(node);
        range.selectNodeContents(node);
        console.log("before", range.inspect());
        this.setSingleRange(range);
        console.log("after", this._ranges[0].inspect());
    };

    selProto.deleteFromDocument = function() {
        // Sepcial behaviour required for Control selections
        if (implementsControlRange && implementsDocSelection && this.docSelection.type == CONTROL) {
            var controlRange = this.docSelection.createRange();
            var element;
            while (controlRange.length) {
                element = controlRange.item(0);
                controlRange.remove(element);
                element.parentNode.removeChild(element);
            }
            this.refresh();
        } else if (this.rangeCount) {
            var ranges = this.getAllRanges();
            if (ranges.length) {
                this.removeAllRanges();
                for (var i = 0, len = ranges.length; i < len; ++i) {
                    ranges[i].deleteContents();
                }
                // The spec says nothing about what the selection should contain after calling deleteContents on each
                // range. Firefox moves the selection to where the final selected range was, so we emulate that
                this.addRange(ranges[len - 1]);
            }
        }
    };

    // The following are non-standard extensions
    selProto.eachRange = function(func, returnValue) {
        for (var i = 0, len = this._ranges.length; i < len; ++i) {
            if ( func( this.getRangeAt(i) ) ) {
                return returnValue;
            }
        }
    };

    selProto.getAllRanges = function() {
        var ranges = [];
        this.eachRange(function(range) {
            ranges.push(range);
        });
        return ranges;
    };

    selProto.setSingleRange = function(range, direction) {
        this.removeAllRanges();
        this.addRange(range, direction);
    };

    selProto.callMethodOnEachRange = function(methodName, params) {
        var results = [];
        this.eachRange( function(range) {
            results.push( range[methodName].apply(range, params) );
        } );
        return results;
    };

    function createStartOrEndSetter(isStart) {
        return function(node, offset) {
            var range;
            if (this.rangeCount) {
                range = this.getRangeAt(0);
                range["set" + (isStart ? "Start" : "End")](node, offset);
            } else {
                range = api.createRange(this.win.document);
                range.setStartAndEnd(node, offset);
            }
            this.setSingleRange(range, this.isBackward());
        };
    }

    selProto.setStart = createStartOrEndSetter(true);
    selProto.setEnd = createStartOrEndSetter(false);

    // Add cheeky select() method to Range prototype
    api.rangePrototype.select = function(direction) {
        getSelection( this.getDocument() ).setSingleRange(this, direction);
    };

    selProto.changeEachRange = function(func) {
        var ranges = [];
        var backward = this.isBackward();

        this.eachRange(function(range) {
            func(range);
            ranges.push(range);
        });

        this.removeAllRanges();
        if (backward && ranges.length == 1) {
            this.addRange(ranges[0], "backward");
        } else {
            this.setRanges(ranges);
        }
    };

    selProto.containsNode = function(node, allowPartial) {
        return this.eachRange( function(range) {
            return range.containsNode(node, allowPartial);
        }, true );
    };

    selProto.getBookmark = function(containerNode) {
        return {
            backward: this.isBackward(),
            rangeBookmarks: this.callMethodOnEachRange("getBookmark", [containerNode])
        };
    };

    selProto.moveToBookmark = function(bookmark) {
        var selRanges = [];
        for (var i = 0, rangeBookmark, range; rangeBookmark = bookmark.rangeBookmarks[i++]; ) {
            range = api.createRange(this.win);
            range.moveToBookmark(rangeBookmark);
            selRanges.push(range);
        }
        if (bookmark.backward) {
            this.setSingleRange(selRanges[0], "backward");
        } else {
            this.setRanges(selRanges);
        }
    };

    selProto.toHtml = function() {
        return this.callMethodOnEachRange("toHtml").join("");
    };

    function inspect(sel) {
        var rangeInspects = [];
        var anchor = new DomPosition(sel.anchorNode, sel.anchorOffset);
        var focus = new DomPosition(sel.focusNode, sel.focusOffset);
        var name = (typeof sel.getName == "function") ? sel.getName() : "Selection";

        if (typeof sel.rangeCount != "undefined") {
            for (var i = 0, len = sel.rangeCount; i < len; ++i) {
                rangeInspects[i] = DomRange.inspect(sel.getRangeAt(i));
            }
        }
        return "[" + name + "(Ranges: " + rangeInspects.join(", ") +
                ")(anchor: " + anchor.inspect() + ", focus: " + focus.inspect() + "]";
    }

    selProto.getName = function() {
        return "WrappedSelection";
    };

    selProto.inspect = function() {
        return inspect(this);
    };

    selProto.detach = function() {
        findCachedSelection(this.win, "delete");
        deleteProperties(this);
    };

    WrappedSelection.detachAll = function() {
        findCachedSelection(null, "deleteAll");
    };

    WrappedSelection.inspect = inspect;
    WrappedSelection.isDirectionBackward = isDirectionBackward;

    api.Selection = WrappedSelection;

    api.selectionPrototype = selProto;

    api.addCreateMissingNativeApiListener(function(win) {
        if (typeof win.getSelection == "undefined") {
            win.getSelection = function() {
                return getSelection(win);
            };
        }
        win = null;
    });
});

                /* End of file: temp/default/src/dependencies/rangy/rangy-core.js */
            
                /* File: temp/default/src/dependencies/rangy/rangy-applier.js */
                /**
 * Tag/attribute/class applier module for Rangy.
 *
 * Depends on Rangy core.
 *
 * Subject the Raptor licence: http://www.raptor-editor.com/license
 * @author Tim Down
 * @author David Neilsen david@panmedia.co.nz
 *
 * Derived from "CSS Class Applier module for Rangy." which is Copyright 2012,
 * Tim Down, and licensed under the MIT license.
 */
rangy.createModule("Applier", ["WrappedSelection"], function(api, module) {
    var dom = api.dom;
    var DomPosition = dom.DomPosition;

    function trim(str) {
        return str.replace(/^\s\s*/, "").replace(/\s\s*$/, "");
    }

    function hasClass(el, cssClass) {
        return el.className && new RegExp("(?:^|\\s)" + cssClass + "(?:\\s|$)").test(el.className);
    }

    function addClass(el, cssClass) {
        if (el.className) {
            if (!hasClass(el, cssClass)) {
                el.className += " " + cssClass;
            }
        } else {
            el.className = cssClass;
        }
    }

    var removeClass = (function() {
        function replacer(matched, whiteSpaceBefore, whiteSpaceAfter) {
            return (whiteSpaceBefore && whiteSpaceAfter) ? " " : "";
        }

        return function(el, cssClass) {
            if (el.className) {
                el.className = el.className.replace(new RegExp("(^|\\s)" + cssClass + "(\\s|$)"), replacer);
            }
        };
    })();

    function sortClassName(className) {
        return className.split(/\s+/).sort().join(" ");
    }

    function getSortedClassName(el) {
        return sortClassName(el.className);
    }

    function haveSameClasses(el1, el2) {
        return getSortedClassName(el1) == getSortedClassName(el2);
    }

    function compareRanges(r1, r2) {
        return r1.compareBoundaryPoints(r2.START_TO_START, r2);
    }

    function mergeOverlappingRanges(ranges) {

        for (var i = 0, len = ranges.length, r1, r2, j; i < len; ++i) {
        }
    }

    // Sorts and merges any overlapping ranges
    function normalizeRanges(ranges) {
        var sortedRanges = ranges.slice(0);
        sortedRanges.sort(compareRanges);
        var newRanges = [];

        // Check for overlaps and merge where they exist
        for (var i = 1, len = ranges.length, range, mergedRange = ranges[0]; i < len; ++i) {
            range = ranges[i];
            if (range.intersectsOrTouchesRange(mergedRange)) {
                mergedRange = mergedRange.union(range);
            } else {
                newRanges.push(mergedRange);
                mergedRange = range;
            }

        }
        newRanges.push(mergedRange);
        return newRanges;
    }

    function movePosition(position, oldParent, oldIndex, newParent, newIndex) {
        var node = position.node, offset = position.offset;

        var newNode = node, newOffset = offset;

        if (node == newParent && offset > newIndex) {
            newOffset++;
        }

        if (node == oldParent && (offset == oldIndex  || offset == oldIndex + 1)) {
            newNode = newParent;
            newOffset += newIndex - oldIndex;
        }

        if (node == oldParent && offset > oldIndex + 1) {
            newOffset--;
        }

        position.node = newNode;
        position.offset = newOffset;
    }

    function movePreservingPositions(node, newParent, newIndex, positionsToPreserve) {
        // For convenience, allow newIndex to be -1 to mean "insert at the end".
        if (newIndex == -1) {
            newIndex = newParent.childNodes.length;
        }

        var oldParent = node.parentNode;
        var oldIndex = dom.getNodeIndex(node);

        for (var i = 0, position; position = positionsToPreserve[i++]; ) {
            movePosition(position, oldParent, oldIndex, newParent, newIndex);
        }

        // Now actually move the node.
        if (newParent.childNodes.length == newIndex) {
            newParent.appendChild(node);
        } else {
            newParent.insertBefore(node, newParent.childNodes[newIndex]);
        }
    }

    function moveChildrenPreservingPositions(node, newParent, newIndex, removeNode, positionsToPreserve) {
        var child, children = [];
        while ( (child = node.firstChild) ) {
            movePreservingPositions(child, newParent, newIndex++, positionsToPreserve);
            children.push(child);
        }
        if (removeNode) {
            node.parentNode.removeChild(node);
        }
        return children;
    }

    function replaceWithOwnChildrenPreservingPositions(element, positionsToPreserve) {
        return moveChildrenPreservingPositions(element, element.parentNode, dom.getNodeIndex(element), true, positionsToPreserve);
    }

    function rangeSelectsAnyText(range, textNode) {
        var textRange = range.cloneRange();
        textRange.selectNodeContents(textNode);

        var intersectionRange = textRange.intersection(range);
        var text = intersectionRange ? intersectionRange.toString() : "";
        textRange.detach();

        return text != "";
    }

    function rangeSelectsAnySelfClosing(range) {
        var clonedRange = range.cloneRange();
        return /<img/.test(fragmentToHtml(clonedRange.cloneContents()));
    }

    function getEffectiveNodes(range) {
        return range.getNodes([], function(node) {
            if (node.nodeType === 3 && rangeSelectsAnyText(range, node)) {
                return node;
            } else if (node.nodeType === 1 && node.tagName === 'IMG') {
                return node;
            }
        });
    }

    function elementsHaveSameNonClassAttributes(el1, el2) {
        if (el1.attributes.length != el2.attributes.length) return false;
        for (var i = 0, len = el1.attributes.length, attr1, attr2, name; i < len; ++i) {
            attr1 = el1.attributes[i];
            name = attr1.name;
            if (name != "class") {
                attr2 = el2.attributes.getNamedItem(name);
                if (attr1.specified != attr2.specified) return false;
                if (attr1.specified && attr1.nodeValue !== attr2.nodeValue) return false;
            }
        }
        return true;
    }

    function elementHasNonClassAttributes(el, exceptions) {
        for (var i = 0, len = el.attributes.length, attrName; i < len; ++i) {
            attrName = el.attributes[i].name;
            if ( !(exceptions && dom.arrayContains(exceptions, attrName)) && el.attributes[i].specified && attrName != "class") {
                return true;
            }
        }
        return false;
    }

    function elementHasProps(el, props) {
        var propValue;
        for (var p in props) {
            if (props.hasOwnProperty(p)) {
                propValue = props[p];
                if (typeof propValue == "object") {
                    if (!elementHasProps(el[p], propValue)) {
                        return false;
                    }
                } else if (el[p] !== propValue) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Convert a DOMFragment to an HTML string. Optionally wraps the string in a tag.
     * @todo type for domFragment and tag.
     * @param {type} domFragment The fragment to be converted to a HTML string.
     * @param {type} tag The tag that the string may be wrapped in.
     * @returns {String} The DOMFragment as a string, optionally wrapped in a tag.
     */
    function fragmentToHtml(domFragment, tag) {
        var html = '';
        // Get all nodes in the extracted content
        for (var j = 0, l = domFragment.childNodes.length; j < l; j++) {
            var node = domFragment.childNodes.item(j);
            var content = node.nodeType === Node.TEXT_NODE ? node.nodeValue : elementOuterHtml($(node));
            if (content) {
                html += content;
            }
        }
        if (tag) {
            html = $('<' + tag + '>' + html + '</' + tag + '>');
            html.find('p').wrapInner('<' + tag + '/>');
            html.find('p > *').unwrap();
            html = $('<div/>').html(html).html();
        }
        return html;
    }

    var getComputedStyleProperty;

    if (typeof window.getComputedStyle != "undefined") {
        getComputedStyleProperty = function(el, propName) {
            return dom.getWindow(el).getComputedStyle(el, null)[propName];
        };
    } else if (typeof document.documentElement.currentStyle != "undefined") {
        getComputedStyleProperty = function(el, propName) {
            return el.currentStyle[propName];
        };
    } else {
        module.fail("No means of obtaining computed style properties found");
    }

    var isEditableElement;

    (function() {
        var testEl = document.createElement("div");
        if (typeof testEl.isContentEditable == "boolean") {
            isEditableElement = function(node) {
                return node && node.nodeType == 1 && node.isContentEditable;
            };
        } else {
            isEditableElement = function(node) {
                if (!node || node.nodeType != 1 || node.contentEditable == "false") {
                    return false;
                }
                return node.contentEditable == "true" || isEditableElement(node.parentNode);
            };
        }
    })();

    function isEditingHost(node) {
        var parent;
        return node && node.nodeType == 1
            && (( (parent = node.parentNode) && parent.nodeType == 9 && parent.designMode == "on")
            || (isEditableElement(node) && !isEditableElement(node.parentNode)));
    }

    function isEditable(node) {
        return (isEditableElement(node) || (node.nodeType != 1 && isEditableElement(node.parentNode))) && !isEditingHost(node);
    }

    var inlineDisplayRegex = /^inline(-block|-table)?$/i;

    function isNonInlineElement(node) {
        return node && node.nodeType == 1 && !inlineDisplayRegex.test(getComputedStyleProperty(node, "display"));
    }

    // White space characters as defined by HTML 4 (http://www.w3.org/TR/html401/struct/text.html)
    var htmlNonWhiteSpaceRegex = /[^\r\n\t\f \u200B]/;

    function isUnrenderedWhiteSpaceNode(node) {
        if (node.data.length == 0) {
            return true;
        }
        if (htmlNonWhiteSpaceRegex.test(node.data)) {
            return false;
        }
        var cssWhiteSpace = getComputedStyleProperty(node.parentNode, "whiteSpace");
        switch (cssWhiteSpace) {
            case "pre":
            case "pre-wrap":
            case "-moz-pre-wrap":
                return false;
            case "pre-line":
                if (/[\r\n]/.test(node.data)) {
                    return false;
                }
        }

        // We now have a whitespace-only text node that may be rendered depending on its context. If it is adjacent to a
        // non-inline element, it will not be rendered. This seems to be a good enough definition.
        return isNonInlineElement(node.previousSibling) || isNonInlineElement(node.nextSibling);
    }

    function getRangeBoundaries(ranges) {
        var positions = [], i, range;
        for (i = 0; range = ranges[i++]; ) {
            positions.push(
                new DomPosition(range.startContainer, range.startOffset),
                new DomPosition(range.endContainer, range.endOffset)
            );
        }
        return positions;
    }

    function updateRangesFromBoundaries(ranges, positions) {
        for (var i = 0, range, start, end, len = ranges.length; i < len; ++i) {
            range = ranges[i];
            start = positions[i * 2];
            end = positions[i * 2 + 1];
            range.setStartAndEnd(start.node, start.offset, end.node, end.offset);
        }
    }

    function arrayWithoutValue(arr, val) {
        var newArray = [];
        for (var i = 0, len = arr.length; i < len; ++i) {
            if (arr[i] !== val) {
                newArray.push(arr[i]);
            }
        }
        return newArray;
    }

    function isSplitPoint(node, offset) {
        if (dom.isCharacterDataNode(node)) {
            if (offset == 0) {
                return !!node.previousSibling;
            } else if (offset == node.length) {
                return !!node.nextSibling;
            } else {
                return true;
            }
        }

        return offset > 0 && offset < node.childNodes.length;
    }

    function splitNodeAt(node, descendantNode, descendantOffset, positionsToPreserve) {
        var newNode, parentNode;
        var splitAtStart = (descendantOffset == 0);

        if (dom.isAncestorOf(descendantNode, node)) {
            return node;
        }

        if (dom.isCharacterDataNode(descendantNode)) {
            var descendantIndex = dom.getNodeIndex(descendantNode);
            if (descendantOffset == 0) {
                descendantOffset = descendantIndex;
            } else if (descendantOffset == descendantNode.length) {
                descendantOffset = descendantIndex + 1;
            } else {
                throw module.createError("splitNodeAt() should not be called with offset in the middle of a data node ("
                    + descendantOffset + " in " + descendantNode.data);
            }
            descendantNode = descendantNode.parentNode;
        }

        if (isSplitPoint(descendantNode, descendantOffset)) {
            // descendantNode is now guaranteed not to be a text or other character node
            newNode = descendantNode.cloneNode(false);
            parentNode = descendantNode.parentNode;
            if (newNode.id) {
                newNode.removeAttribute("id");
            }
            var child, newChildIndex = 0;

            while ( (child = descendantNode.childNodes[descendantOffset]) ) {
                movePreservingPositions(child, newNode, newChildIndex++, positionsToPreserve);
                //newNode.appendChild(child);
            }
            movePreservingPositions(newNode, parentNode, dom.getNodeIndex(descendantNode) + 1, positionsToPreserve);
            //dom.insertAfter(newNode, descendantNode);
            return (descendantNode == node) ? newNode : splitNodeAt(node, parentNode, dom.getNodeIndex(newNode), positionsToPreserve);
        } else if (node != descendantNode) {
            newNode = descendantNode.parentNode;

            // Work out a new split point in the parent node
            var newNodeIndex = dom.getNodeIndex(descendantNode);

            if (!splitAtStart) {
                newNodeIndex++;
            }
            return splitNodeAt(node, newNode, newNodeIndex, positionsToPreserve);
        }
        return node;
    }

    function areElementsMergeable(el1, el2) {
        return el1.tagName == el2.tagName
            && haveSameClasses(el1, el2)
            && elementsHaveSameNonClassAttributes(el1, el2)
            && getComputedStyleProperty(el1, "display") == "inline"
            && getComputedStyleProperty(el2, "display") == "inline";
    }

    function createAdjacentMergeableTextNodeGetter(forward) {
        var propName = forward ? "nextSibling" : "previousSibling";

        return function(textNode, checkParentElement) {
            var el = textNode.parentNode;
            var adjacentNode = textNode[propName];
            if (adjacentNode) {
                // Can merge if the node's previous/next sibling is a text node
                if (adjacentNode && adjacentNode.nodeType == 3) {
                    return adjacentNode;
                }
            } else if (checkParentElement) {
                // Compare text node parent element with its sibling
                adjacentNode = el[propName];
                if (adjacentNode && adjacentNode.nodeType == 1 && areElementsMergeable(el, adjacentNode)) {
                    return adjacentNode[forward ? "firstChild" : "lastChild"];
                }
            }
            return null;
        };
    }

    var getPreviousMergeableTextNode = createAdjacentMergeableTextNodeGetter(false),
        getNextMergeableTextNode = createAdjacentMergeableTextNodeGetter(true);


    function Merge(firstNode) {
        this.isElementMerge = (firstNode.nodeType == 1);
        this.firstTextNode = this.isElementMerge ? firstNode.lastChild : firstNode;
        this.textNodes = [this.firstTextNode];
    }

    Merge.prototype = {
        doMerge: function(positionsToPreserve) {
            var textBits = [], combinedTextLength = 0, textNode, parent, text;
            for (var i = 0, len = this.textNodes.length, j, position; i < len; ++i) {
                textNode = this.textNodes[i];
                parent = textNode.parentNode;
                if (i > 0) {
                    parent.removeChild(textNode);
                    if (!parent.hasChildNodes()) {
                        parent.parentNode.removeChild(parent);
                    }
                    if (positionsToPreserve) {
                        for (j = 0; position = positionsToPreserve[j++]; ) {
                            // Handle case where position is inside the text node being merged into a preceding node
                            if (position.node == textNode) {
                                position.node = this.firstTextNode;
                                position.offset += combinedTextLength;
                            }
                        }
                    }
                }
                textBits[i] = textNode.data;
                combinedTextLength += textNode.data.length;
            }
            this.firstTextNode.data = text = textBits.join("");
            return text;
        },

        getLength: function() {
            var i = this.textNodes.length, len = 0;
            while (i--) {
                len += this.textNodes[i].length;
            }
            return len;
        },

        toString: function() {
            var textBits = [];
            for (var i = 0, len = this.textNodes.length; i < len; ++i) {
                textBits[i] = "'" + this.textNodes[i].data + "'";
            }
            return "[Merge(" + textBits.join(",") + ")]";
        }
    };

    // TODO: Populate this with every attribute name that corresponds to a property with a different name
    var attrNamesForProperties = {};

    function Applier(options) {
        this.tag = null;
        this.tags = [];
        this.classes = [];
        this.attributes = [];
        this.ignoreWhiteSpace = true;
        this.applyToEditableOnly = false;
        this.useExistingElements = true;
        this.ignoreClasses = false;
        this.ignoreAttributes = false;

        for (var key in options) {
            this[key] = options[key];
        }

        // Uppercase tag names
        for (var i = 0, l = this.tags.length; i < l; i++) {
            this.tags[i] = this.tags[i].toUpperCase();
        }
        if (this.tag) {
            this.tag = this.tag.toUpperCase();
            this.tags.push(this.tag);
        }
    }

    Applier.prototype = {
        copyPropertiesToElement: function(props, el, createCopy) {
            var s, elStyle, elProps = {}, elPropsStyle, propValue, elPropValue, attrName;

            for (var p in props) {
                if (props.hasOwnProperty(p)) {
                    propValue = props[p];
                    elPropValue = el[p];

                    // Special case for class. The copied properties object has the applier's CSS class as well as its
                    // own to simplify checks when removing styling elements
                    if (p == "className") {
                        addClass(el, propValue);
                        addClass(el, this.cssClass);
                        el[p] = sortClassName(el[p]);
                        if (createCopy) {
                            elProps[p] = el[p];
                        }
                    }

                    // Special case for style
                    else if (p == "style") {
                        elStyle = elPropValue;
                        if (createCopy) {
                            elProps[p] = elPropsStyle = {};
                        }
                        for (s in props[p]) {
                            elStyle[s] = propValue[s];
                            if (createCopy) {
                                elPropsStyle[s] = elStyle[s];
                            }
                        }
                        this.attrExceptions.push(p);
                    } else {
                        el[p] = propValue;
                        // Copy the property back from the dummy element so that later comparisons to check whether elements
                        // may be removed are checking against the right value. For example, the href property of an element
                        // returns a fully qualified URL even if it was previously assigned a relative URL.
                        if (createCopy) {
                            elProps[p] = el[p];

                            // Not all properties map to identically named attributes
                            attrName = attrNamesForProperties.hasOwnProperty(p) ? attrNamesForProperties[p] : p;
                            this.attrExceptions.push(attrName);
                        }
                    }
                }
            }

            return createCopy ? elProps : "";
        },

        isValid: function(node) {
            return this.isValidTag(node)
                && this.hasClasses(node)
                && this.hasAttributes(node);
        },

        isValidTag: function(node) {
            // Only elements are valid
            if (node.nodeType !== 1) {
                return false;
            }

            // Check if tag names are ignored
            if (this.tags.length === 0) {
                return true;
            }

            // Check for valid tag name
            for (var i = 0, l = this.tags.length; i < l; i++) {
                if (node.tagName === this.tags[i]) {
                    return true;
                }
            }
            return false;
        },

        hasClasses: function(node) {
            if (this.ignoreClasses) {
                return true;
            }
            for (var i = 0, l = this.classes.length; i < l; i++) {
                if (!hasClass(node, this.classes[i])) {
                    return false;
                }
            }
            return true;
        },

        hasAttributes: function(node) {
            if (this.ignoreAttributes) {
                return true;
            }
            for (var key in this.attributes) {
                if (!node.hasAttribute(key)) {
                    return false;
                }
            }
            return true;
        },

        getSelfOrAncestor: function(node) {
            while (node) {
                if (this.isValid(node)) {
                    return node;
                }
                node = node.parentNode;
            }
            return null;
        },

        isModifiable: function(node) {
            return !this.applyToEditableOnly || isEditable(node);
        },

        // White space adjacent to an unwrappable node can be ignored for wrapping
        isIgnorableWhiteSpaceNode: function(node) {
            return this.ignoreWhiteSpace && node && node.nodeType == 3 && isUnrenderedWhiteSpaceNode(node);
        },

        // Normalizes nodes after applying a CSS class to a Range.
        postApply: function(textNodes, range, positionsToPreserve, isUndo) {
            var firstNode = textNodes[0], lastNode = textNodes[textNodes.length - 1];
            var merges = [], currentMerge;

            var rangeStartNode = firstNode, rangeEndNode = lastNode;
            var rangeStartOffset = 0, rangeEndOffset = lastNode.length;

            var textNode, precedingTextNode;

            // Check for every required merge and create a Merge object for each
            for (var i = 0, len = textNodes.length; i < len; ++i) {
                textNode = textNodes[i];
                precedingTextNode = getPreviousMergeableTextNode(textNode, !isUndo);
                if (precedingTextNode) {
                    if (!currentMerge) {
                        currentMerge = new Merge(precedingTextNode);
                        merges.push(currentMerge);
                    }
                    currentMerge.textNodes.push(textNode);
                    if (textNode === firstNode) {
                        rangeStartNode = currentMerge.firstTextNode;
                        rangeStartOffset = rangeStartNode.length;
                    }
                    if (textNode === lastNode) {
                        rangeEndNode = currentMerge.firstTextNode;
                        rangeEndOffset = currentMerge.getLength();
                    }
                } else {
                    currentMerge = null;
                }
            }

            // Test whether the first node after the range needs merging
            var nextTextNode = getNextMergeableTextNode(lastNode, !isUndo);

            if (nextTextNode) {
                if (!currentMerge) {
                    currentMerge = new Merge(lastNode);
                    merges.push(currentMerge);
                }
                currentMerge.textNodes.push(nextTextNode);
            }

            // Apply the merges
            if (merges.length) {
                for (i = 0, len = merges.length; i < len; ++i) {
                    merges[i].doMerge(positionsToPreserve);
                }

                // Set the range boundaries
                range.setStartAndEnd(rangeStartNode, rangeStartOffset, rangeEndNode, rangeEndOffset);
            }
        },

        createContainer: function(doc) {
            var element = doc.createElement(this.tag);
            this.addClasses(element);
            this.addAttributes(element);
            return element;
        },

        addClasses: function(node) {
            for (var i = 0, l = this.classes.length; i < l; i++) {
                addClass(node, this.classes[i]);
            }
        },

        addAttributes: function(node) {
            for (var key in this.attributes) {
                node.setAttribute(key, this.attributes[key]);
            }
        },

        removeClasses: function(node) {
            for (var i = 0, l = this.classes.length; i < l; i++) {
                removeClass(node, this.classes[i]);
            }
        },

        removeAttributes: function(node) {
            for (var key in this.attributes) {
                node.removeAttribute(key);
            }
        },

        applyToTextNode: function(textNode, positionsToPreserve) {
            var parent = textNode.parentNode;
            if (parent.childNodes.length == 1
                    && dom.arrayContains(this.tags, parent.tagName)
                    && this.useExistingElements) {
                this.addClasses(parent);
                this.addAttributes(parent);
            } else {
                var element = this.createContainer(dom.getDocument(textNode));
                textNode.parentNode.insertBefore(element, textNode);
                element.appendChild(textNode);
            }
        },

        isRemovable: function(node) {
            return this.tags.length > 0
                && this.isValidTag(node)
                && this.hasClasses(node)
                && this.hasAttributes(node)
                && this.isModifiable(node);
        },

        undoToTextNode: function(textNode, range, ancestor, positionsToPreserve) {
            if (!range.containsNode(ancestor)) {
                // Split out the portion of the ancestor from which we can remove the CSS class
                //var parent = ancestorWithClass.parentNode, index = dom.getNodeIndex(ancestorWithClass);
                var ancestorRange = range.cloneRange();
                ancestorRange.selectNode(ancestor);
                if (ancestorRange.isPointInRange(range.endContainer, range.endOffset)) {
                    splitNodeAt(ancestor, range.endContainer, range.endOffset, positionsToPreserve);
                    range.setEndAfter(ancestor);
                }
                if (ancestorRange.isPointInRange(range.startContainer, range.startOffset)) {
                    ancestor = splitNodeAt(ancestor, range.startContainer, range.startOffset, positionsToPreserve);
                }
            }
            if (this.isRemovable(ancestor)) {
                replaceWithOwnChildrenPreservingPositions(ancestor, positionsToPreserve);
            } else {
                this.removeClasses(ancestor);
                this.removeAttributes(ancestor);
            }
        },

        applyToRange: function(range, rangesToPreserve) {
            rangesToPreserve = rangesToPreserve || [];

            // Create an array of range boundaries to preserve
            var positionsToPreserve = getRangeBoundaries(rangesToPreserve || []);

            range.splitBoundariesPreservingPositions(positionsToPreserve);
            var nodes = getEffectiveNodes(range);
            if (nodes.length) {
                for (var i = 0, textNode; textNode = nodes[i++]; ) {
                    if (!this.isIgnorableWhiteSpaceNode(textNode)
                            && this.isModifiable(textNode)) {
                        this.applyToTextNode(textNode, positionsToPreserve);
                    }
                }
                range.setStart(nodes[0], 0);
                textNode = nodes[nodes.length - 1];
                range.setEnd(textNode, textNode.length);
                if (this.normalize) {
                    this.postApply(nodes, range, positionsToPreserve, false);
                }

                // Update the ranges from the preserved boundary positions
                updateRangesFromBoundaries(rangesToPreserve, positionsToPreserve);
            }
        },

        applyToRanges: function(ranges) {
            var i = ranges.length;
            while (i--) {
                this.applyToRange(ranges[i], ranges);
            }
            return ranges;
        },

        applyToSelection: function(win) {
            var sel = api.getSelection(win);
            sel.setRanges( this.applyToRanges(sel.getAllRanges()) );
        },

        undoToRange: function(range, rangesToPreserve) {
            // Create an array of range boundaries to preserve
            rangesToPreserve = rangesToPreserve || [];
            var positionsToPreserve = getRangeBoundaries(rangesToPreserve);

            range.splitBoundariesPreservingPositions(positionsToPreserve);
            var textNodes = getEffectiveNodes(range);
            var textNode, validAncestor;
            var lastTextNode = textNodes[textNodes.length - 1];

            if (textNodes.length) {
                for (var i = 0, l = textNodes.length; i < l; ++i) {
                    textNode = textNodes[i];
                    validAncestor = this.getSelfOrAncestor(textNode);
                    if (validAncestor
                            && this.isModifiable(textNode)) {
                        this.undoToTextNode(textNode, range, validAncestor, positionsToPreserve);
                    }

                    // Ensure the range is still valid
                    range.setStart(textNodes[0], 0);
                    range.setEnd(lastTextNode, lastTextNode.length);
                }


                if (this.normalize) {
                    this.postApply(textNodes, range, positionsToPreserve, true);
                }

                // Update the ranges from the preserved boundary positions
                updateRangesFromBoundaries(rangesToPreserve, positionsToPreserve);
            }
        },

        undoToRanges: function(ranges) {
            // Get ranges returned in document order
            var i = ranges.length;

            while (i--) {
                //this.undoToRange(ranges[i], arrayWithoutValue(ranges, ranges[i]));
                this.undoToRange(ranges[i], ranges);
            }

            return ranges;
        },

        undoToSelection: function(win) {
            var sel = api.getSelection(win);
            var ranges = api.getSelection(win).getAllRanges();
            this.undoToRanges(ranges);
            sel.setRanges(ranges);
        },

        getTextSelectedByRange: function(textNode, range) {
            var textRange = range.cloneRange();
            textRange.selectNodeContents(textNode);

            var intersectionRange = textRange.intersection(range);
            var text = intersectionRange ? intersectionRange.toString() : "";
            textRange.detach();

            return text;
        },

        isAppliedToRange: function(range) {
            if (range.collapsed) {
                return !!this.getSelfOrAncestor(range.commonAncestorContainer);
            } else {
                var textNodes = range.getNodes( [3] );
                for (var i = 0, textNode; textNode = textNodes[i++]; ) {
                    if (!this.isIgnorableWhiteSpaceNode(textNode)) {
                        if (rangeSelectsAnyText(range, textNode)
                                && this.isModifiable(textNode)
                                && !this.getSelfOrAncestor(textNode)) {
                            return false;
                        } else if (rangeSelectsAnySelfClosing(range)) {
                            return false;
                        }
                    }
                }
                var html = fragmentToHtml(range.cloneContents());
                if (html.match(/^<(img)/) || trim(html.replace(/<.*?>/g, '')) === '') {
                    return false;
                }
                return true;
            }
        },

        isAppliedToRanges: function(ranges) {
            var i = ranges.length;
            if (i === 0) {
                return false;
            }
            while (i--) {
                if (!this.isAppliedToRange(ranges[i])) {
                    return false;
                }
            }
            return true;
        },

        isAppliedToSelection: function(win) {
            var sel = api.getSelection(win);
            return this.isAppliedToRanges(sel.getAllRanges());
        },

        toggleRange: function(range) {
            if (this.isAppliedToRange(range)) {
                this.undoToRange(range);
            } else {
                this.applyToRange(range);
            }
        },

        toggleRanges: function(ranges) {
            if (this.isAppliedToRanges(ranges)) {
                this.undoToRanges(ranges);
            } else {
                this.applyToRanges(ranges);
            }
        },

        toggleSelection: function(win) {
            if (this.isAppliedToSelection(win)) {
                this.undoToSelection(win);
            } else {
                this.applyToSelection(win);
            }
        },

        detach: function() {}
    };

    function createApplier(options) {
        return new Applier(options);
    }

    Applier.util = {
    };

    api.Applier = Applier;
    api.createApplier = createApplier;
});

                /* End of file: temp/default/src/dependencies/rangy/rangy-applier.js */
            
                /* File: temp/default/src/dependencies/rangy/rangy-cssclassapplier.js */
                /**
 * Class Applier module for Rangy.
 * Adds, removes and toggles classes on Ranges and Selections
 *
 * Part of Rangy, a cross-browser JavaScript range and selection library
 * http://code.google.com/p/rangy/
 *
 * Depends on Rangy core.
 *
 * Copyright 2013, Tim Down
 * Licensed under the MIT license.
 * Version: 1.3alpha.783
 * Build date: 28 June 2013
 */
rangy.createModule("ClassApplier", ["WrappedSelection"], function(api, module) {
    var dom = api.dom;
    var DomPosition = dom.DomPosition;
    var contains = dom.arrayContains;


    var defaultTagName = "span";

    /**
     * Convert a DOMFragment to an HTML string. Optionally wraps the string in a tag.
     * @todo type for domFragment and tag.
     * @param {type} domFragment The fragment to be converted to a HTML string.
     * @param {type} tag The tag that the string may be wrapped in.
     * @returns {String} The DOMFragment as a string, optionally wrapped in a tag.
     */
    function fragmentToHtml(domFragment, tag) {
        var html = '';
        // Get all nodes in the extracted content
        for (var j = 0, l = domFragment.childNodes.length; j < l; j++) {
            var node = domFragment.childNodes.item(j);
            var content = node.nodeType === Node.TEXT_NODE ? node.nodeValue : elementOuterHtml($(node));
            if (content) {
                html += content;
            }
        }
        if (tag) {
            html = $('<' + tag + '>' + html + '</' + tag + '>');
            html.find('p').wrapInner('<' + tag + '/>');
            html.find('p > *').unwrap();
            html = $('<div/>').html(html).html();
        }
        return html;
    }
    function trim(str) {
        return str.replace(/^\s\s*/, "").replace(/\s\s*$/, "");
    }

    function hasClass(el, cssClass) {
        return el.className && new RegExp("(?:^|\\s)" + cssClass + "(?:\\s|$)").test(el.className);
    }

    function addClass(el, cssClass) {
        if (el.className) {
            if (!hasClass(el, cssClass)) {
                el.className += " " + cssClass;
            }
        } else {
            el.className = cssClass;
        }
    }

    var removeClass = (function() {
        function replacer(matched, whiteSpaceBefore, whiteSpaceAfter) {
            return (whiteSpaceBefore && whiteSpaceAfter) ? " " : "";
        }

        return function(el, cssClass) {
            if (el.className) {
                el.className = el.className.replace(new RegExp("(^|\\s)" + cssClass + "(\\s|$)"), replacer);
            }
        };
    })();

    function sortClassName(className) {
        return className.split(/\s+/).sort().join(" ");
    }

    function getSortedClassName(el) {
        return sortClassName(el.className);
    }

    function haveSameClasses(el1, el2) {
        return getSortedClassName(el1) == getSortedClassName(el2);
    }

    function compareRanges(r1, r2) {
        return r1.compareBoundaryPoints(r2.START_TO_START, r2);
    }

    function movePosition(position, oldParent, oldIndex, newParent, newIndex) {
        var node = position.node, offset = position.offset;

        var newNode = node, newOffset = offset;

        if (node == newParent && offset > newIndex) {
            newOffset++;
        }

        if (node == oldParent && (offset == oldIndex  || offset == oldIndex + 1)) {
            newNode = newParent;
            newOffset += newIndex - oldIndex;
        }

        if (node == oldParent && offset > oldIndex + 1) {
            newOffset--;
        }

        position.node = newNode;
        position.offset = newOffset;
    }

    function movePreservingPositions(node, newParent, newIndex, positionsToPreserve) {
        // For convenience, allow newIndex to be -1 to mean "insert at the end".
        if (newIndex == -1) {
            newIndex = newParent.childNodes.length;
        }

        var oldParent = node.parentNode;
        var oldIndex = dom.getNodeIndex(node);

        for (var i = 0, position; position = positionsToPreserve[i++]; ) {
            movePosition(position, oldParent, oldIndex, newParent, newIndex);
        }

        // Now actually move the node.
        if (newParent.childNodes.length == newIndex) {
            newParent.appendChild(node);
        } else {
            newParent.insertBefore(node, newParent.childNodes[newIndex]);
        }
    }

    function moveChildrenPreservingPositions(node, newParent, newIndex, removeNode, positionsToPreserve) {
        var child, children = [];
        while ( (child = node.firstChild) ) {
            movePreservingPositions(child, newParent, newIndex++, positionsToPreserve);
            children.push(child);
        }
        if (removeNode) {
            node.parentNode.removeChild(node);
        }
        return children;
    }

    function replaceWithOwnChildrenPreservingPositions(element, positionsToPreserve) {
        return moveChildrenPreservingPositions(element, element.parentNode, dom.getNodeIndex(element), true, positionsToPreserve);
    }

    function rangeSelectsAnyText(range, textNode) {
        var textNodeRange = range.cloneRange();
        textNodeRange.selectNodeContents(textNode);

        var intersectionRange = textNodeRange.intersection(range);
        var text = intersectionRange ? intersectionRange.toString() : "";
        textNodeRange.detach();

        return text != "";
    }

    function getEffectiveTextNodes(range) {
        var nodes = range.getNodes([3]);

        // Optimization as per issue 145

        // Remove non-intersecting text nodes from the start of the range
        var start = 0, node;
        while ( (node = nodes[start]) && !rangeSelectsAnyText(range, node) ) {
            ++start;
        }

        // Remove non-intersecting text nodes from the start of the range
        var end = nodes.length - 1;
        while ( (node = nodes[end]) && !rangeSelectsAnyText(range, node) ) {
            --end;
        }

        return nodes.slice(start, end + 1);
    }

    function elementsHaveSameNonClassAttributes(el1, el2) {
        if (el1.attributes.length != el2.attributes.length) return false;
        for (var i = 0, len = el1.attributes.length, attr1, attr2, name; i < len; ++i) {
            attr1 = el1.attributes[i];
            name = attr1.name;
            if (name != "class") {
                attr2 = el2.attributes.getNamedItem(name);
                if (attr1.specified != attr2.specified) return false;
                if (attr1.specified && attr1.nodeValue !== attr2.nodeValue) return false;
            }
        }
        return true;
    }

    function elementHasNonClassAttributes(el, exceptions) {
        for (var i = 0, len = el.attributes.length, attrName; i < len; ++i) {
            attrName = el.attributes[i].name;
            if ( !(exceptions && contains(exceptions, attrName)) && el.attributes[i].specified && attrName != "class") {
                return true;
            }
        }
        return false;
    }

    function elementHasProps(el, props) {
        var propValue;
        for (var p in props) {
            if (props.hasOwnProperty(p)) {
                propValue = props[p];
                if (typeof propValue == "object") {
                    if (!elementHasProps(el[p], propValue)) {
                        return false;
                    }
                } else if (el[p] !== propValue) {
                    return false;
                }
            }
        }
        return true;
    }

    var getComputedStyleProperty = dom.getComputedStyleProperty;
    var isEditableElement;

    (function() {
        var testEl = document.createElement("div");
        if (typeof testEl.isContentEditable == "boolean") {
            isEditableElement = function(node) {
                return node && node.nodeType == 1 && node.isContentEditable;
            };
        } else {
            isEditableElement = function(node) {
                if (!node || node.nodeType != 1 || node.contentEditable == "false") {
                    return false;
                }
                return node.contentEditable == "true" || isEditableElement(node.parentNode);
            };
        }
    })();

    function isEditingHost(node) {
        var parent;
        return node && node.nodeType == 1
            && (( (parent = node.parentNode) && parent.nodeType == 9 && parent.designMode == "on")
            || (isEditableElement(node) && !isEditableElement(node.parentNode)));
    }

    function isEditable(node) {
        return (isEditableElement(node) || (node.nodeType != 1 && isEditableElement(node.parentNode))) && !isEditingHost(node);
    }

    var inlineDisplayRegex = /^inline(-block|-table)?$/i;

    function isNonInlineElement(node) {
        return node && node.nodeType == 1 && !inlineDisplayRegex.test(getComputedStyleProperty(node, "display"));
    }

    // White space characters as defined by HTML 4 (http://www.w3.org/TR/html401/struct/text.html)
    var htmlNonWhiteSpaceRegex = /[^\r\n\t\f \u200B]/;

    function isUnrenderedWhiteSpaceNode(node) {
        if (node.data.length == 0) {
            return true;
        }
        if (htmlNonWhiteSpaceRegex.test(node.data)) {
            return false;
        }
        var cssWhiteSpace = getComputedStyleProperty(node.parentNode, "whiteSpace");
        switch (cssWhiteSpace) {
            case "pre":
            case "pre-wrap":
            case "-moz-pre-wrap":
                return false;
            case "pre-line":
                if (/[\r\n]/.test(node.data)) {
                    return false;
                }
        }

        // We now have a whitespace-only text node that may be rendered depending on its context. If it is adjacent to a
        // non-inline element, it will not be rendered. This seems to be a good enough definition.
        return isNonInlineElement(node.previousSibling) || isNonInlineElement(node.nextSibling);
    }

    function getRangeBoundaries(ranges) {
        var positions = [], i, range;
        for (i = 0; range = ranges[i++]; ) {
            positions.push(
                new DomPosition(range.startContainer, range.startOffset),
                new DomPosition(range.endContainer, range.endOffset)
            );
        }
        return positions;
    }

    function updateRangesFromBoundaries(ranges, positions) {
        for (var i = 0, range, start, end, len = ranges.length; i < len; ++i) {
            range = ranges[i];
            start = positions[i * 2];
            end = positions[i * 2 + 1];
            range.setStartAndEnd(start.node, start.offset, end.node, end.offset);
        }
    }

    function isSplitPoint(node, offset) {
        if (dom.isCharacterDataNode(node)) {
            if (offset == 0) {
                return !!node.previousSibling;
            } else if (offset == node.length) {
                return !!node.nextSibling;
            } else {
                return true;
            }
        }

        return offset > 0 && offset < node.childNodes.length;
    }

    function splitNodeAt(node, descendantNode, descendantOffset, positionsToPreserve) {
        var newNode, parentNode;
        var splitAtStart = (descendantOffset == 0);

        if (dom.isAncestorOf(descendantNode, node)) {
            return node;
        }

        if (dom.isCharacterDataNode(descendantNode)) {
            var descendantIndex = dom.getNodeIndex(descendantNode);
            if (descendantOffset == 0) {
                descendantOffset = descendantIndex;
            } else if (descendantOffset == descendantNode.length) {
                descendantOffset = descendantIndex + 1;
            } else {
                throw module.createError("splitNodeAt() should not be called with offset in the middle of a data node ("
                    + descendantOffset + " in " + descendantNode.data);
            }
            descendantNode = descendantNode.parentNode;
        }

        if (isSplitPoint(descendantNode, descendantOffset)) {
            // descendantNode is now guaranteed not to be a text or other character node
            newNode = descendantNode.cloneNode(false);
            parentNode = descendantNode.parentNode;
            if (newNode.id) {
                newNode.removeAttribute("id");
            }
            var child, newChildIndex = 0;

            while ( (child = descendantNode.childNodes[descendantOffset]) ) {
                movePreservingPositions(child, newNode, newChildIndex++, positionsToPreserve);
                //newNode.appendChild(child);
            }
            movePreservingPositions(newNode, parentNode, dom.getNodeIndex(descendantNode) + 1, positionsToPreserve);
            //dom.insertAfter(newNode, descendantNode);
            return (descendantNode == node) ? newNode : splitNodeAt(node, parentNode, dom.getNodeIndex(newNode), positionsToPreserve);
        } else if (node != descendantNode) {
            newNode = descendantNode.parentNode;

            // Work out a new split point in the parent node
            var newNodeIndex = dom.getNodeIndex(descendantNode);

            if (!splitAtStart) {
                newNodeIndex++;
            }
            return splitNodeAt(node, newNode, newNodeIndex, positionsToPreserve);
        }
        return node;
    }

    function areElementsMergeable(el1, el2) {
        return el1.tagName == el2.tagName
            && haveSameClasses(el1, el2)
            && elementsHaveSameNonClassAttributes(el1, el2)
            && getComputedStyleProperty(el1, "display") == "inline"
            && getComputedStyleProperty(el2, "display") == "inline";
    }

    function createAdjacentMergeableTextNodeGetter(forward) {
        var propName = forward ? "nextSibling" : "previousSibling";

        return function(textNode, checkParentElement) {
            var el = textNode.parentNode;
            var adjacentNode = textNode[propName];
            if (adjacentNode) {
                // Can merge if the node's previous/next sibling is a text node
                if (adjacentNode && adjacentNode.nodeType == 3) {
                    return adjacentNode;
                }
            } else if (checkParentElement) {
                // Compare text node parent element with its sibling
                adjacentNode = el[propName];
                if (adjacentNode && adjacentNode.nodeType == 1 && areElementsMergeable(el, adjacentNode)/* && adjacentNode.hasChildNodes()*/) {
                    return adjacentNode[forward ? "firstChild" : "lastChild"];
                }
            }
            return null;
        };
    }

    var getPreviousMergeableTextNode = createAdjacentMergeableTextNodeGetter(false),
        getNextMergeableTextNode = createAdjacentMergeableTextNodeGetter(true);


    function Merge(firstNode) {
        this.isElementMerge = (firstNode.nodeType == 1);
        this.textNodes = [];
        var firstTextNode = this.isElementMerge ? firstNode.lastChild : firstNode;
        if (firstTextNode) {
            this.textNodes[0] = firstTextNode;
        }
    }

    Merge.prototype = {
        doMerge: function(positionsToPreserve) {
            var textNodes = this.textNodes;
            var firstTextNode = textNodes[0];
            if (textNodes.length > 1) {
                var textParts = [], combinedTextLength = 0, textNode, parent;
                for (var i = 0, len = textNodes.length, j, position; i < len; ++i) {
                    textNode = textNodes[i];
                    parent = textNode.parentNode;
                    if (i > 0) {
                        parent.removeChild(textNode);
                        if (!parent.hasChildNodes()) {
                            parent.parentNode.removeChild(parent);
                        }
                        if (positionsToPreserve) {
                            for (j = 0; position = positionsToPreserve[j++]; ) {
                                // Handle case where position is inside the text node being merged into a preceding node
                                if (position.node == textNode) {
                                    position.node = firstTextNode;
                                    position.offset += combinedTextLength;
                                }
                            }
                        }
                    }
                    textParts[i] = textNode.data;
                    combinedTextLength += textNode.data.length;
                }
                firstTextNode.data = textParts.join("");
            }
            return firstTextNode.data;
        },

        getLength: function() {
            var i = this.textNodes.length, len = 0;
            while (i--) {
                len += this.textNodes[i].length;
            }
            return len;
        },

        toString: function() {
            var textBits = [];
            for (var i = 0, len = this.textNodes.length; i < len; ++i) {
                textBits[i] = "'" + this.textNodes[i].data + "'";
            }
            return "[Merge(" + textBits.join(",") + ")]";
        }
    };

    var optionProperties = ["elementTagName", "ignoreWhiteSpace", "applyToEditableOnly", "useExistingElements",
        "removeEmptyElements"];

    // TODO: Populate this with every attribute name that corresponds to a property with a different name
    var attrNamesForProperties = {};

    function ClassApplier(cssClass, options, tagNames) {
        this.cssClass = cssClass;
        var normalize, i, len, propName;

        var elementPropertiesFromOptions = null;

        // Initialize from options object
        if (typeof options == "object" && options !== null) {
            tagNames = options.tagNames;
            elementPropertiesFromOptions = options.elementProperties;

            for (i = 0; propName = optionProperties[i++]; ) {
                if (options.hasOwnProperty(propName)) {
                    this[propName] = options[propName];
                }
            }
            normalize = options.normalize;
        } else {
            normalize = options;
        }

        // Backward compatibility: the second parameter can also be a Boolean indicating to normalize after unapplying
        this.normalize = (typeof normalize == "undefined") ? true : normalize;

        // Initialize element properties and attribute exceptions
        this.attrExceptions = [];
        var el = document.createElement(this.elementTagName);
        this.elementProperties = this.copyPropertiesToElement(elementPropertiesFromOptions, el, true);

        this.elementSortedClassName = this.elementProperties.hasOwnProperty("className") ?
            this.elementProperties.className : cssClass;

        // Initialize tag names
        this.applyToAnyTagName = false;
        var type = typeof tagNames;
        if (type == "string") {
            if (tagNames == "*") {
                this.applyToAnyTagName = true;
            } else {
                this.tagNames = trim(tagNames.toLowerCase()).split(/\s*,\s*/);
            }
        } else if (type == "object" && typeof tagNames.length == "number") {
            this.tagNames = [];
            for (i = 0, len = tagNames.length; i < len; ++i) {
                if (tagNames[i] == "*") {
                    this.applyToAnyTagName = true;
                } else {
                    this.tagNames.push(tagNames[i].toLowerCase());
                }
            }
        } else {
            this.tagNames = [this.elementTagName];
        }
    }

    ClassApplier.prototype = {
        elementTagName: defaultTagName,
        elementProperties: {},
        ignoreWhiteSpace: true,
        applyToEditableOnly: false,
        useExistingElements: true,
        removeEmptyElements: true,

        copyPropertiesToElement: function(props, el, createCopy) {
            var s, elStyle, elProps = {}, elPropsStyle, propValue, elPropValue, attrName;

            for (var p in props) {
                if (props.hasOwnProperty(p)) {
                    propValue = props[p];
                    elPropValue = el[p];

                    // Special case for class. The copied properties object has the applier's CSS class as well as its
                    // own to simplify checks when removing styling elements
                    if (p == "className") {
                        addClass(el, propValue);
                        addClass(el, this.cssClass);
                        el[p] = sortClassName(el[p]);
                        if (createCopy) {
                            elProps[p] = el[p];
                        }
                    }

                    // Special case for style
                    else if (p == "style") {
                        elStyle = elPropValue;
                        if (createCopy) {
                            elProps[p] = elPropsStyle = {};
                        }
                        for (s in props[p]) {
                            elStyle[s] = propValue[s];
                            if (createCopy) {
                                elPropsStyle[s] = elStyle[s];
                            }
                        }
                        this.attrExceptions.push(p);
                    } else {
                        el[p] = propValue;
                        // Copy the property back from the dummy element so that later comparisons to check whether
                        // elements may be removed are checking against the right value. For example, the href property
                        // of an element returns a fully qualified URL even if it was previously assigned a relative
                        // URL.
                        if (createCopy) {
                            elProps[p] = el[p];

                            // Not all properties map to identically named attributes
                            attrName = attrNamesForProperties.hasOwnProperty(p) ? attrNamesForProperties[p] : p;
                            this.attrExceptions.push(attrName);
                        }
                    }
                }
            }

            return createCopy ? elProps : "";
        },

        hasClass: function(node) {
            return node.nodeType == 1 &&
                contains(this.tagNames, node.tagName.toLowerCase()) &&
                hasClass(node, this.cssClass);
        },

        getSelfOrAncestorWithClass: function(node) {
            while (node) {
                if (this.hasClass(node)) {
                    return node;
                }
                node = node.parentNode;
            }
            return null;
        },

        isModifiable: function(node) {
            return !this.applyToEditableOnly || isEditable(node);
        },

        // White space adjacent to an unwrappable node can be ignored for wrapping
        isIgnorableWhiteSpaceNode: function(node) {
            return this.ignoreWhiteSpace && node && node.nodeType == 3 && isUnrenderedWhiteSpaceNode(node);
        },

        // Normalizes nodes after applying a CSS class to a Range.
        postApply: function(textNodes, range, positionsToPreserve, isUndo) {
            var firstNode = textNodes[0], lastNode = textNodes[textNodes.length - 1];

            var merges = [], currentMerge;

            var rangeStartNode = firstNode, rangeEndNode = lastNode;
            var rangeStartOffset = 0, rangeEndOffset = lastNode.length;

            var textNode, precedingTextNode;

            // Check for every required merge and create a Merge object for each
            for (var i = 0, len = textNodes.length; i < len; ++i) {
                textNode = textNodes[i];
                precedingTextNode = getPreviousMergeableTextNode(textNode, !isUndo);
                if (precedingTextNode) {
                    if (!currentMerge) {
                        currentMerge = new Merge(precedingTextNode);
                        merges.push(currentMerge);
                    }
                    currentMerge.textNodes.push(textNode);
                    if (textNode === firstNode) {
                        rangeStartNode = currentMerge.textNodes[0];
                        rangeStartOffset = rangeStartNode.length;
                    }
                    if (textNode === lastNode) {
                        rangeEndNode = currentMerge.textNodes[0];
                        rangeEndOffset = currentMerge.getLength();
                    }
                } else {
                    currentMerge = null;
                }
            }

            // Test whether the first node after the range needs merging
            var nextTextNode = getNextMergeableTextNode(lastNode, !isUndo);

            if (nextTextNode) {
                if (!currentMerge) {
                    currentMerge = new Merge(lastNode);
                    merges.push(currentMerge);
                }
                currentMerge.textNodes.push(nextTextNode);
            }

            // Apply the merges
            if (merges.length) {
                for (i = 0, len = merges.length; i < len; ++i) {
                    merges[i].doMerge(positionsToPreserve);
                }

                // Set the range boundaries
                range.setStartAndEnd(rangeStartNode, rangeStartOffset, rangeEndNode, rangeEndOffset);
            }
        },

        createContainer: function(doc) {
            var el = doc.createElement(this.elementTagName);
            this.copyPropertiesToElement(this.elementProperties, el, false);
            addClass(el, this.cssClass);
            return el;
        },

        applyToTextNode: function(textNode, positionsToPreserve) {
            var parent = textNode.parentNode;
            if (parent.childNodes.length == 1 &&
                    this.useExistingElements &&
                    contains(this.tagNames, parent.tagName.toLowerCase()) &&
                    elementHasProps(parent, this.elementProperties)) {

                addClass(parent, this.cssClass);
            } else {
                var el = this.createContainer(dom.getDocument(textNode));
                textNode.parentNode.insertBefore(el, textNode);
                el.appendChild(textNode);
            }
        },

        isRemovable: function(el) {
            return el.tagName.toLowerCase() == this.elementTagName
                && getSortedClassName(el) == this.elementSortedClassName
                && elementHasProps(el, this.elementProperties)
                && !elementHasNonClassAttributes(el, this.attrExceptions)
                && this.isModifiable(el);
        },

        isEmptyContainer: function(el) {
            var childNodeCount = el.childNodes.length;
            return el.nodeType == 1
                && this.isRemovable(el)
                && (childNodeCount == 0 || (childNodeCount == 1 && this.isEmptyContainer(el.firstChild)));
        },

        removeEmptyContainers: function(range) {
            var applier = this;
            var nodesToRemove = range.getNodes([1], function(el) {
                return applier.isEmptyContainer(el);
            });

            for (var i = 0, node; node = nodesToRemove[i++]; ) {
                node.parentNode.removeChild(node);
            }
        },

        undoToTextNode: function(textNode, range, ancestorWithClass, positionsToPreserve) {
            if (!range.containsNode(ancestorWithClass)) {
                // Split out the portion of the ancestor from which we can remove the CSS class
                //var parent = ancestorWithClass.parentNode, index = dom.getNodeIndex(ancestorWithClass);
                var ancestorRange = range.cloneRange();
                ancestorRange.selectNode(ancestorWithClass);
                if (ancestorRange.isPointInRange(range.endContainer, range.endOffset)) {
                    splitNodeAt(ancestorWithClass, range.endContainer, range.endOffset, positionsToPreserve);
                    range.setEndAfter(ancestorWithClass);
                }
                if (ancestorRange.isPointInRange(range.startContainer, range.startOffset)) {
                    ancestorWithClass = splitNodeAt(ancestorWithClass, range.startContainer, range.startOffset, positionsToPreserve);
                }
            }
            if (this.isRemovable(ancestorWithClass)) {
                replaceWithOwnChildrenPreservingPositions(ancestorWithClass, positionsToPreserve);
            } else {
                removeClass(ancestorWithClass, this.cssClass);
            }
        },

        applyToRange: function(range, rangesToPreserve) {
            rangesToPreserve = rangesToPreserve || [];

            // Create an array of range boundaries to preserve
            var positionsToPreserve = getRangeBoundaries(rangesToPreserve || []);

            range.splitBoundariesPreservingPositions(positionsToPreserve);

            // Tidy up the DOM by removing empty containers
            if (this.removeEmptyElements) {
                this.removeEmptyContainers(range);
            }

            var textNodes = getEffectiveTextNodes(range);

            if (textNodes.length) {
                for (var i = 0, textNode; textNode = textNodes[i++]; ) {
                    if (!this.isIgnorableWhiteSpaceNode(textNode) && !this.getSelfOrAncestorWithClass(textNode)
                            && this.isModifiable(textNode)) {
                        this.applyToTextNode(textNode, positionsToPreserve);
                    }
                }
                textNode = textNodes[textNodes.length - 1];
                range.setStartAndEnd(textNodes[0], 0, textNode, textNode.length);
                if (this.normalize) {
                    this.postApply(textNodes, range, positionsToPreserve, false);
                }

                // Update the ranges from the preserved boundary positions
                updateRangesFromBoundaries(rangesToPreserve, positionsToPreserve);
            }
        },

        applyToRanges: function(ranges) {

            var i = ranges.length;
            while (i--) {
                this.applyToRange(ranges[i], ranges);
            }


            return ranges;
        },

        applyToSelection: function(win) {
            var sel = api.getSelection(win);
            sel.setRanges( this.applyToRanges(sel.getAllRanges()) );
        },

        undoToRange: function(range, rangesToPreserve) {
            // Create an array of range boundaries to preserve
            rangesToPreserve = rangesToPreserve || [];
            var positionsToPreserve = getRangeBoundaries(rangesToPreserve);


            range.splitBoundariesPreservingPositions(positionsToPreserve);

            // Tidy up the DOM by removing empty containers
            if (this.removeEmptyElements) {
                this.removeEmptyContainers(range, positionsToPreserve);
            }

            var textNodes = getEffectiveTextNodes(range);
            var textNode, ancestorWithClass;
            var lastTextNode = textNodes[textNodes.length - 1];

            if (textNodes.length) {
                for (var i = 0, len = textNodes.length; i < len; ++i) {
                    textNode = textNodes[i];
                    ancestorWithClass = this.getSelfOrAncestorWithClass(textNode);
                    if (ancestorWithClass && this.isModifiable(textNode)) {
                        this.undoToTextNode(textNode, range, ancestorWithClass, positionsToPreserve);
                    }

                    // Ensure the range is still valid
                    range.setStartAndEnd(textNodes[0], 0, lastTextNode, lastTextNode.length);
                }


                if (this.normalize) {
                    this.postApply(textNodes, range, positionsToPreserve, true);
                }

                // Update the ranges from the preserved boundary positions
                updateRangesFromBoundaries(rangesToPreserve, positionsToPreserve);
            }
        },

        undoToRanges: function(ranges) {
            // Get ranges returned in document order
            var i = ranges.length;

            while (i--) {
                this.undoToRange(ranges[i], ranges);
            }

            return ranges;
        },

        undoToSelection: function(win) {
            var sel = api.getSelection(win);
            var ranges = api.getSelection(win).getAllRanges();
            this.undoToRanges(ranges);
            sel.setRanges(ranges);
        },

        getTextSelectedByRange: function(textNode, range) {
            var textRange = range.cloneRange();
            textRange.selectNodeContents(textNode);

            var intersectionRange = textRange.intersection(range);
            var text = intersectionRange ? intersectionRange.toString() : "";
            textRange.detach();

            return text;
        },

        isAppliedToRange: function(range) {
            if (range.collapsed || range.toString() == "") {
                return !!this.getSelfOrAncestorWithClass(range.commonAncestorContainer);
            } else {
                var textNodes = range.getNodes( [3] );
                if (textNodes.length)
                for (var i = 0, textNode; textNode = textNodes[i++]; ) {
                    if (!this.isIgnorableWhiteSpaceNode(textNode) && rangeSelectsAnyText(range, textNode)
                            && this.isModifiable(textNode) && !this.getSelfOrAncestorWithClass(textNode)) {
                        return false;
                    }
                }
                var html = fragmentToHtml(range.cloneContents());
                if (html.match(/^<(img)/) || trim(html.replace(/<.*?>/g, '')) === '') {
                    return false;
                }
                return true;
            }
        },

        isAppliedToRanges: function(ranges) {
            var i = ranges.length;
            if (i == 0) {
                return false;
            }
            while (i--) {
                if (!this.isAppliedToRange(ranges[i])) {
                    return false;
                }
            }
            return true;
        },

        isAppliedToSelection: function(win) {
            var sel = api.getSelection(win);
            return this.isAppliedToRanges(sel.getAllRanges());
        },

        toggleRange: function(range) {
            if (this.isAppliedToRange(range)) {
                this.undoToRange(range);
            } else {
                this.applyToRange(range);
            }
        },

        toggleRanges: function(ranges) {
            if (this.isAppliedToRanges(ranges)) {
                this.undoToRanges(ranges);
            } else {
                this.applyToRanges(ranges);
            }
        },

        toggleSelection: function(win) {
            if (this.isAppliedToSelection(win)) {
                this.undoToSelection(win);
            } else {
                this.applyToSelection(win);
            }
        },

        getElementsWithClassIntersectingRange: function(range) {
            var elements = [];
            var applier = this;
            range.getNodes([3], function(textNode) {
                var el = applier.getSelfOrAncestorWithClass(textNode);
                if (el && !contains(elements, el)) {
                    elements.push(el);
                }
            });
            return elements;
        },

        getElementsWithClassIntersectingSelection: function(win) {
            var sel = api.getSelection(win);
            var elements = [];
            var applier = this;
            sel.eachRange(function(range) {
                var rangeElements = applier.getElementsWithClassIntersectingRange(range);
                for (var i = 0, el; el = rangeElements[i++]; ) {
                    if (!contains(elements, el)) {
                        elements.push(el);
                    }
                }
            });
            return elements;
        },

        detach: function() {}
    };

    function createClassApplier(cssClass, options, tagNames) {
        return new ClassApplier(cssClass, options, tagNames);
    }

    ClassApplier.util = {
        hasClass: hasClass,
        addClass: addClass,
        removeClass: removeClass,
        hasSameClasses: haveSameClasses,
        replaceWithOwnChildren: replaceWithOwnChildrenPreservingPositions,
        elementsHaveSameNonClassAttributes: elementsHaveSameNonClassAttributes,
        elementHasNonClassAttributes: elementHasNonClassAttributes,
        splitNodeAt: splitNodeAt,
        isEditableElement: isEditableElement,
        isEditingHost: isEditingHost,
        isEditable: isEditable
    };

    api.CssClassApplier = api.ClassApplier = ClassApplier;
    api.createCssClassApplier = api.createClassApplier = createClassApplier;
});

                /* End of file: temp/default/src/dependencies/rangy/rangy-cssclassapplier.js */
            
                /* File: temp/default/src/dependencies/rangy/rangy-selectionsaverestore.js */
                /**
 * Selection save and restore module for Rangy.
 * Saves and restores user selections using marker invisible elements in the DOM.
 *
 * Part of Rangy, a cross-browser JavaScript range and selection library
 * http://code.google.com/p/rangy/
 *
 * Depends on Rangy core.
 *
 * Copyright 2013, Tim Down
 * Licensed under the MIT license.
 * Version: 1.3alpha.783
 * Build date: 28 June 2013
 */
rangy.createModule("SaveRestore", ["WrappedRange"], function(api, module) {
    var dom = api.dom;

    var markerTextChar = "\ufeff";

    function gEBI(id, doc) {
        return (doc || document).getElementById(id);
    }

    function insertRangeBoundaryMarker(range, atStart) {
        var markerId = "selectionBoundary_" + (+new Date()) + "_" + ("" + Math.random()).slice(2);
        var markerEl;
        var doc = dom.getDocument(range.startContainer);

        // Clone the Range and collapse to the appropriate boundary point
        var boundaryRange = range.cloneRange();
        boundaryRange.collapse(atStart);

        // Create the marker element containing a single invisible character using DOM methods and insert it
        markerEl = doc.createElement("span");
        markerEl.id = markerId;
        markerEl.style.lineHeight = "0";
        markerEl.style.display = "none";
        markerEl.className = "rangySelectionBoundary";
        markerEl.appendChild(doc.createTextNode(markerTextChar));

        boundaryRange.insertNode(markerEl);
        boundaryRange.detach();
        return markerEl;
    }

    function setRangeBoundary(doc, range, markerId, atStart) {
        var markerEl = gEBI(markerId, doc);
        if (markerEl) {
            range[atStart ? "setStartBefore" : "setEndBefore"](markerEl);
            markerEl.parentNode.removeChild(markerEl);
        } else {
            module.warn("Marker element has been removed. Cannot restore selection.");
        }
    }

    function compareRanges(r1, r2) {
        return r2.compareBoundaryPoints(r1.START_TO_START, r1);
    }

    function saveRange(range, backward) {
        var startEl, endEl, doc = api.DomRange.getRangeDocument(range), text = range.toString();

        if (range.collapsed) {
            endEl = insertRangeBoundaryMarker(range, false);
            return {
                document: doc,
                markerId: endEl.id,
                collapsed: true
            };
        } else {
            endEl = insertRangeBoundaryMarker(range, false);
            startEl = insertRangeBoundaryMarker(range, true);

            return {
                document: doc,
                startMarkerId: startEl.id,
                endMarkerId: endEl.id,
                collapsed: false,
                backward: backward,
                toString: function() {
                    return "original text: '" + text + "', new text: '" + range.toString() + "'";
                }
            };
        }
    }

    function restoreRange(rangeInfo, normalize) {
        var doc = rangeInfo.document;
        if (typeof normalize == "undefined") {
            normalize = true;
        }
        var range = api.createRange(doc);
        if (rangeInfo.collapsed) {
            var markerEl = gEBI(rangeInfo.markerId, doc);
            if (markerEl) {
                markerEl.style.display = "inline";
                var previousNode = markerEl.previousSibling;

                // Workaround for issue 17
                if (previousNode && previousNode.nodeType == 3) {
                    markerEl.parentNode.removeChild(markerEl);
                    range.collapseToPoint(previousNode, previousNode.length);
                } else {
                    range.collapseBefore(markerEl);
                    markerEl.parentNode.removeChild(markerEl);
                }
            } else {
                module.warn("Marker element has been removed. Cannot restore selection.");
            }
        } else {
            setRangeBoundary(doc, range, rangeInfo.startMarkerId, true);
            setRangeBoundary(doc, range, rangeInfo.endMarkerId, false);
        }

        if (normalize) {
            range.normalizeBoundaries();
        }

        return range;
    }

    function saveRanges(ranges, backward) {
        var rangeInfos = [], range, doc;

        // Order the ranges by position within the DOM, latest first, cloning the array to leave the original untouched
        ranges = ranges.slice(0);
        ranges.sort(compareRanges);

        for (var i = 0, len = ranges.length; i < len; ++i) {
            rangeInfos[i] = saveRange(ranges[i], backward);
        }

        // Now that all the markers are in place and DOM manipulation over, adjust each range's boundaries to lie
        // between its markers
        for (i = len - 1; i >= 0; --i) {
            range = ranges[i];
            doc = api.DomRange.getRangeDocument(range);
            if (range.collapsed) {
                range.collapseAfter(gEBI(rangeInfos[i].markerId, doc));
            } else {
                range.setEndBefore(gEBI(rangeInfos[i].endMarkerId, doc));
                range.setStartAfter(gEBI(rangeInfos[i].startMarkerId, doc));
            }
        }

        return rangeInfos;
    }

    function saveSelection(win) {
        if (!api.isSelectionValid(win)) {
            module.warn("Cannot save selection. This usually happens when the selection is collapsed and the selection document has lost focus.");
            return null;
        }
        var sel = api.getSelection(win);
        var ranges = sel.getAllRanges();
        var backward = (ranges.length == 1 && sel.isBackward());

        var rangeInfos = saveRanges(ranges, backward);

        // Ensure current selection is unaffected
        if (backward) {
            sel.setSingleRange(ranges[0], "backward");
        } else {
            sel.setRanges(ranges);
        }

        return {
            win: win,
            rangeInfos: rangeInfos,
            restored: false
        };
    }

    function restoreRanges(rangeInfos) {
        var ranges = [];

        // Ranges are in reverse order of appearance in the DOM. We want to restore earliest first to avoid
        // normalization affecting previously restored ranges.
        var rangeCount = rangeInfos.length;

        for (var i = rangeCount - 1; i >= 0; i--) {
            ranges[i] = restoreRange(rangeInfos[i], true);
        }

        return ranges;
    }

    function restoreSelection(savedSelection, preserveDirection) {
        if (!savedSelection.restored) {
            var rangeInfos = savedSelection.rangeInfos;
            var sel = api.getSelection(savedSelection.win);
            var ranges = restoreRanges(rangeInfos), rangeCount = rangeInfos.length;

            if (rangeCount == 1 && preserveDirection && api.features.selectionHasExtend && rangeInfos[0].backward) {
                sel.removeAllRanges();
                sel.addRange(ranges[0], true);
            } else {
                sel.setRanges(ranges);
            }

            savedSelection.restored = true;
        }
    }

    function removeMarkerElement(doc, markerId) {
        var markerEl = gEBI(markerId, doc);
        if (markerEl) {
            markerEl.parentNode.removeChild(markerEl);
        }
    }

    function removeMarkers(savedSelection) {
        var rangeInfos = savedSelection.rangeInfos;
        for (var i = 0, len = rangeInfos.length, rangeInfo; i < len; ++i) {
            rangeInfo = rangeInfos[i];
            if (rangeInfo.collapsed) {
                removeMarkerElement(savedSelection.doc, rangeInfo.markerId);
            } else {
                removeMarkerElement(savedSelection.doc, rangeInfo.startMarkerId);
                removeMarkerElement(savedSelection.doc, rangeInfo.endMarkerId);
            }
        }
    }

    api.util.extend(api, {
        saveRange: saveRange,
        restoreRange: restoreRange,
        saveRanges: saveRanges,
        restoreRanges: restoreRanges,
        saveSelection: saveSelection,
        restoreSelection: restoreSelection,
        removeMarkerElement: removeMarkerElement,
        removeMarkers: removeMarkers
    });
});

                /* End of file: temp/default/src/dependencies/rangy/rangy-selectionsaverestore.js */
            
                /* File: temp/default/src/dependencies/rangy/rangy-serializer.js */
                /**
 * Serializer module for Rangy.
 * Serializes Ranges and Selections. An example use would be to store a user's selection on a particular page in a
 * cookie or local storage and restore it on the user's next visit to the same page.
 *
 * Part of Rangy, a cross-browser JavaScript range and selection library
 * http://code.google.com/p/rangy/
 *
 * Depends on Rangy core.
 *
 * Copyright 2013, Tim Down
 * Licensed under the MIT license.
 * Version: 1.3alpha.783
 * Build date: 28 June 2013
 */
rangy.createModule("Serializer", ["WrappedSelection"], function(api, module) {
    var UNDEF = "undefined";

    // encodeURIComponent and decodeURIComponent are required for cookie handling
    if (typeof encodeURIComponent == UNDEF || typeof decodeURIComponent == UNDEF) {
        module.fail("Global object is missing encodeURIComponent and/or decodeURIComponent method");
    }

    // Checksum for checking whether range can be serialized
    var crc32 = (function() {
        function utf8encode(str) {
            var utf8CharCodes = [];

            for (var i = 0, len = str.length, c; i < len; ++i) {
                c = str.charCodeAt(i);
                if (c < 128) {
                    utf8CharCodes.push(c);
                } else if (c < 2048) {
                    utf8CharCodes.push((c >> 6) | 192, (c & 63) | 128);
                } else {
                    utf8CharCodes.push((c >> 12) | 224, ((c >> 6) & 63) | 128, (c & 63) | 128);
                }
            }
            return utf8CharCodes;
        }

        var cachedCrcTable = null;

        function buildCRCTable() {
            var table = [];
            for (var i = 0, j, crc; i < 256; ++i) {
                crc = i;
                j = 8;
                while (j--) {
                    if ((crc & 1) == 1) {
                        crc = (crc >>> 1) ^ 0xEDB88320;
                    } else {
                        crc >>>= 1;
                    }
                }
                table[i] = crc >>> 0;
            }
            return table;
        }

        function getCrcTable() {
            if (!cachedCrcTable) {
                cachedCrcTable = buildCRCTable();
            }
            return cachedCrcTable;
        }

        return function(str) {
            var utf8CharCodes = utf8encode(str), crc = -1, crcTable = getCrcTable();
            for (var i = 0, len = utf8CharCodes.length, y; i < len; ++i) {
                y = (crc ^ utf8CharCodes[i]) & 0xFF;
                crc = (crc >>> 8) ^ crcTable[y];
            }
            return (crc ^ -1) >>> 0;
        };
    })();

    var dom = api.dom;

    function escapeTextForHtml(str) {
        return str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function nodeToInfoString(node, infoParts) {
        infoParts = infoParts || [];
        var nodeType = node.nodeType, children = node.childNodes, childCount = children.length;
        var nodeInfo = [nodeType, node.nodeName, childCount].join(":");
        var start = "", end = "";
        switch (nodeType) {
            case 3: // Text node
                start = escapeTextForHtml(node.nodeValue);
                break;
            case 8: // Comment
                start = "<!--" + escapeTextForHtml(node.nodeValue) + "-->";
                break;
            default:
                start = "<" + nodeInfo + ">";
                end = "</>";
                break;
        }
        if (start) {
            infoParts.push(start);
        }
        for (var i = 0; i < childCount; ++i) {
            nodeToInfoString(children[i], infoParts);
        }
        if (end) {
            infoParts.push(end);
        }
        return infoParts;
    }

    // Creates a string representation of the specified element's contents that is similar to innerHTML but omits all
    // attributes and comments and includes child node counts. This is done instead of using innerHTML to work around
    // IE <= 8's policy of including element properties in attributes, which ruins things by changing an element's
    // innerHTML whenever the user changes an input within the element.
    function getElementChecksum(el) {
        var info = nodeToInfoString(el).join("");
        return crc32(info).toString(16);
    }

    function serializePosition(node, offset, rootNode) {
        var pathBits = [], n = node;
        rootNode = rootNode || dom.getDocument(node).documentElement;
        while (n && n != rootNode) {
            pathBits.push(dom.getNodeIndex(n, true));
            n = n.parentNode;
        }
        return pathBits.join("/") + ":" + offset;
    }

    function deserializePosition(serialized, rootNode, doc) {
        if (!rootNode) {
            rootNode = (doc || document).documentElement;
        }
        var bits = serialized.split(":");
        var node = rootNode;
        var nodeIndices = bits[0] ? bits[0].split("/") : [], i = nodeIndices.length, nodeIndex;

        while (i--) {
            nodeIndex = parseInt(nodeIndices[i], 10);
            if (nodeIndex < node.childNodes.length) {
                node = node.childNodes[nodeIndex];
            } else {
                throw module.createError("deserializePosition() failed: node " + dom.inspectNode(node) +
                        " has no child with index " + nodeIndex + ", " + i);
            }
        }

        return new dom.DomPosition(node, parseInt(bits[1], 10));
    }

    function serializeRange(range, omitChecksum, rootNode) {
        rootNode = rootNode || api.DomRange.getRangeDocument(range).documentElement;
        if (!dom.isOrIsAncestorOf(rootNode, range.commonAncestorContainer)) {
            throw module.createError("serializeRange(): range " + range.inspect() +
                " is not wholly contained within specified root node " + dom.inspectNode(rootNode));
        }
        var serialized = serializePosition(range.startContainer, range.startOffset, rootNode) + "," +
            serializePosition(range.endContainer, range.endOffset, rootNode);
        if (!omitChecksum) {
            serialized += "{" + getElementChecksum(rootNode) + "}";
        }
        return serialized;
    }

    function deserializeRange(serialized, rootNode, doc) {
        if (rootNode) {
            doc = doc || dom.getDocument(rootNode);
        } else {
            doc = doc || document;
            rootNode = doc.documentElement;
        }
        var result = /^([^,]+),([^,\{]+)(\{([^}]+)\})?$/.exec(serialized);
        var checksum = result[4], rootNodeChecksum = getElementChecksum(rootNode);
        if (checksum && checksum !== getElementChecksum(rootNode)) {
            throw module.createError("deserializeRange(): checksums of serialized range root node (" + checksum +
                    ") and target root node (" + rootNodeChecksum + ") do not match");
        }
        var start = deserializePosition(result[1], rootNode, doc), end = deserializePosition(result[2], rootNode, doc);
        var range = api.createRange(doc);
        range.setStartAndEnd(start.node, start.offset, end.node, end.offset);
        return range;
    }

    function canDeserializeRange(serialized, rootNode, doc) {
        if (!rootNode) {
            rootNode = (doc || document).documentElement;
        }
        var result = /^([^,]+),([^,]+)(\{([^}]+)\})?$/.exec(serialized);
        var checksum = result[3];
        return !checksum || checksum === getElementChecksum(rootNode);
    }

    function serializeSelection(selection, omitChecksum, rootNode) {
        selection = api.getSelection(selection);
        var ranges = selection.getAllRanges(), serializedRanges = [];
        for (var i = 0, len = ranges.length; i < len; ++i) {
            serializedRanges[i] = serializeRange(ranges[i], omitChecksum, rootNode);
        }
        return serializedRanges.join("|");
    }

    function deserializeSelection(serialized, rootNode, win) {
        if (rootNode) {
            win = win || dom.getWindow(rootNode);
        } else {
            win = win || window;
            rootNode = win.document.documentElement;
        }
        var serializedRanges = serialized.split("|");
        var sel = api.getSelection(win);
        var ranges = [];

        for (var i = 0, len = serializedRanges.length; i < len; ++i) {
            ranges[i] = deserializeRange(serializedRanges[i], rootNode, win.document);
        }
        sel.setRanges(ranges);

        return sel;
    }

    function canDeserializeSelection(serialized, rootNode, win) {
        var doc;
        if (rootNode) {
            doc = win ? win.document : dom.getDocument(rootNode);
        } else {
            win = win || window;
            rootNode = win.document.documentElement;
        }
        var serializedRanges = serialized.split("|");

        for (var i = 0, len = serializedRanges.length; i < len; ++i) {
            if (!canDeserializeRange(serializedRanges[i], rootNode, doc)) {
                return false;
            }
        }

        return true;
    }

    var cookieName = "rangySerializedSelection";

    function getSerializedSelectionFromCookie(cookie) {
        var parts = cookie.split(/[;,]/);
        for (var i = 0, len = parts.length, nameVal, val; i < len; ++i) {
            nameVal = parts[i].split("=");
            if (nameVal[0].replace(/^\s+/, "") == cookieName) {
                val = nameVal[1];
                if (val) {
                    return decodeURIComponent(val.replace(/\s+$/, ""));
                }
            }
        }
        return null;
    }

    function restoreSelectionFromCookie(win) {
        win = win || window;
        var serialized = getSerializedSelectionFromCookie(win.document.cookie);
        if (serialized) {
            deserializeSelection(serialized, win.doc);
        }
    }

    function saveSelectionCookie(win, props) {
        win = win || window;
        props = (typeof props == "object") ? props : {};
        var expires = props.expires ? ";expires=" + props.expires.toUTCString() : "";
        var path = props.path ? ";path=" + props.path : "";
        var domain = props.domain ? ";domain=" + props.domain : "";
        var secure = props.secure ? ";secure" : "";
        var serialized = serializeSelection(api.getSelection(win));
        win.document.cookie = encodeURIComponent(cookieName) + "=" + encodeURIComponent(serialized) + expires + path + domain + secure;
    }

    api.serializePosition = serializePosition;
    api.deserializePosition = deserializePosition;

    api.serializeRange = serializeRange;
    api.deserializeRange = deserializeRange;
    api.canDeserializeRange = canDeserializeRange;

    api.serializeSelection = serializeSelection;
    api.deserializeSelection = deserializeSelection;
    api.canDeserializeSelection = canDeserializeSelection;

    api.restoreSelectionFromCookie = restoreSelectionFromCookie;
    api.saveSelectionCookie = saveSelectionCookie;

    api.getElementChecksum = getElementChecksum;
    api.nodeToInfoString = nodeToInfoString;
});

                /* End of file: temp/default/src/dependencies/rangy/rangy-serializer.js */
            
                /* File: temp/default/src/dependencies/rangy/rangy-textrange.js */
                /**
 * Text range module for Rangy.
 * Text-based manipulation and searching of ranges and selections.
 *
 * Features
 *
 * - Ability to move range boundaries by character or word offsets
 * - Customizable word tokenizer
 * - Ignores text nodes inside <script> or <style> elements or those hidden by CSS display and visibility properties
 * - Range findText method to search for text or regex within the page or within a range. Flags for whole words and case
 *   sensitivity
 * - Selection and range save/restore as text offsets within a node
 * - Methods to return visible text within a range or selection
 * - innerText method for elements
 *
 * References
 *
 * https://www.w3.org/Bugs/Public/show_bug.cgi?id=13145
 * http://aryeh.name/spec/innertext/innertext.html
 * http://dvcs.w3.org/hg/editing/raw-file/tip/editing.html
 *
 * Part of Rangy, a cross-browser JavaScript range and selection library
 * http://code.google.com/p/rangy/
 *
 * Depends on Rangy core.
 *
 * Copyright 2013, Tim Down
 * Licensed under the MIT license.
 * Version: 1.3alpha.783
 * Build date: 28 June 2013
 */

/**
 * Problem: handling of trailing spaces before line breaks is handled inconsistently between browsers.
 *
 * First, a <br>: this is relatively simple. For the following HTML:
 *
 * 1 <br>2
 *
 * - IE and WebKit render the space, include it in the selection (i.e. when the content is selected and pasted into a
 *   textarea, the space is present) and allow the caret to be placed after it.
 * - Firefox does not acknowledge the space in the selection but it is possible to place the caret after it.
 * - Opera does not render the space but has two separate caret positions on either side of the space (left and right
 *   arrow keys show this) and includes the space in the selection.
 *
 * The other case is the line break or breaks implied by block elements. For the following HTML:
 *
 * <p>1 </p><p>2<p>
 *
 * - WebKit does not acknowledge the space in any way
 * - Firefox, IE and Opera as per <br>
 *
 * One more case is trailing spaces before line breaks in elements with white-space: pre-line. For the following HTML:
 *
 * <p style="white-space: pre-line">1
 * 2</p>
 *
 * - Firefox and WebKit include the space in caret positions
 * - IE does not support pre-line up to and including version 9
 * - Opera ignores the space
 * - Trailing space only renders if there is a non-collapsed character in the line
 *
 * Problem is whether Rangy should ever acknowledge the space and if so, when. Another problem is whether this can be
 * feature-tested
 */
rangy.createModule("TextRange", ["WrappedSelection"], function(api, module) {
    var UNDEF = "undefined";
    var CHARACTER = "character", WORD = "word";
    var dom = api.dom, util = api.util;
    var extend = util.extend;
    var getBody = dom.getBody;


    var spacesRegex = /^[ \t\f\r\n]+$/;
    var spacesMinusLineBreaksRegex = /^[ \t\f\r]+$/;
    var allWhiteSpaceRegex = /^[\t-\r \u0085\u00A0\u1680\u180E\u2000-\u200B\u2028\u2029\u202F\u205F\u3000]+$/;
    var nonLineBreakWhiteSpaceRegex = /^[\t \u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000]+$/;
    var lineBreakRegex = /^[\n-\r\u0085\u2028\u2029]$/;

    var defaultLanguage = "en";

    var isDirectionBackward = api.Selection.isDirectionBackward;

    // Properties representing whether trailing spaces inside blocks are completely collapsed (as they are in WebKit,
    // but not other browsers). Also test whether trailing spaces before <br> elements are collapsed.
    var trailingSpaceInBlockCollapses = false;
    var trailingSpaceBeforeBrCollapses = false;
    var trailingSpaceBeforeLineBreakInPreLineCollapses = true;

    (function() {
        var el = document.createElement("div");
        el.contentEditable = "true";
        el.innerHTML = "<p>1 </p><p></p>";
        var body = getBody(document);
        var p = el.firstChild;
        var sel = api.getSelection();

        body.appendChild(el);
        sel.collapse(p.lastChild, 2);
        sel.setStart(p.firstChild, 0);
        trailingSpaceInBlockCollapses = ("" + sel).length == 1;

        el.innerHTML = "1 <br>";
        sel.collapse(el, 2);
        sel.setStart(el.firstChild, 0);
        trailingSpaceBeforeBrCollapses = ("" + sel).length == 1;
        body.removeChild(el);

        sel.removeAllRanges();
    })();

    /*----------------------------------------------------------------------------------------------------------------*/

    // This function must create word and non-word tokens for the whole of the text supplied to it
    function defaultTokenizer(chars, wordOptions) {
        var word = chars.join(""), result, tokens = [];

        function createTokenFromRange(start, end, isWord) {
            var tokenChars = chars.slice(start, end);
            var token = {
                isWord: isWord,
                chars: tokenChars,
                toString: function() {
                    return tokenChars.join("");
                }
            };
            for (var i = 0, len = tokenChars.length; i < len; ++i) {
                tokenChars[i].token = token;
            }
            tokens.push(token);
        }

        // Match words and mark characters
        var lastWordEnd = 0, wordStart, wordEnd;
        while ( (result = wordOptions.wordRegex.exec(word)) ) {
            wordStart = result.index;
            wordEnd = wordStart + result[0].length;

            // Create token for non-word characters preceding this word
            if (wordStart > lastWordEnd) {
                createTokenFromRange(lastWordEnd, wordStart, false);
            }

            // Get trailing space characters for word
            if (wordOptions.includeTrailingSpace) {
                while (nonLineBreakWhiteSpaceRegex.test(chars[wordEnd])) {
                    ++wordEnd;
                }
            }
            createTokenFromRange(wordStart, wordEnd, true);
            lastWordEnd = wordEnd;
        }

        // Create token for trailing non-word characters, if any exist
        if (lastWordEnd < chars.length) {
            createTokenFromRange(lastWordEnd, chars.length, false);
        }

        return tokens;
    }

    var defaultCharacterOptions = {
        includeBlockContentTrailingSpace: true,
        includeSpaceBeforeBr: true,
        includePreLineTrailingSpace: true
    };

    var defaultCaretCharacterOptions = {
        includeBlockContentTrailingSpace: !trailingSpaceBeforeLineBreakInPreLineCollapses,
        includeSpaceBeforeBr: !trailingSpaceBeforeBrCollapses,
        includePreLineTrailingSpace: true
    };

    var defaultWordOptions = {
        "en": {
            wordRegex: /[a-z0-9]+('[a-z0-9]+)*/gi,
            includeTrailingSpace: false,
            tokenizer: defaultTokenizer
        }
    };

    function createOptions(optionsParam, defaults) {
        if (!optionsParam) {
            return defaults;
        } else {
            var options = {};
            extend(options, defaults);
            extend(options, optionsParam);
            return options;
        }
    }

    function createWordOptions(options) {
        var lang, defaults;
        if (!options) {
            return defaultWordOptions[defaultLanguage];
        } else {
            lang = options.language || defaultLanguage;
            defaults = {};
            extend(defaults, defaultWordOptions[lang] || defaultWordOptions[defaultLanguage]);
            extend(defaults, options);
            return defaults;
        }
    }

    function createCharacterOptions(options) {
        return createOptions(options, defaultCharacterOptions);
    }

    function createCaretCharacterOptions(options) {
        return createOptions(options, defaultCaretCharacterOptions);
    }

    var defaultFindOptions = {
        caseSensitive: false,
        withinRange: null,
        wholeWordsOnly: false,
        wrap: false,
        direction: "forward",
        wordOptions: null,
        characterOptions: null
    };

    var defaultMoveOptions = {
        wordOptions: null,
        characterOptions: null
    };

    var defaultExpandOptions = {
        wordOptions: null,
        characterOptions: null,
        trim: false,
        trimStart: true,
        trimEnd: true
    };

    var defaultWordIteratorOptions = {
        wordOptions: null,
        characterOptions: null,
        direction: "forward"
    };

    /*----------------------------------------------------------------------------------------------------------------*/

    /* DOM utility functions */
    var getComputedStyleProperty = dom.getComputedStyleProperty;

    // Create cachable versions of DOM functions

    // Test for old IE's incorrect display properties
    var tableCssDisplayBlock;
    (function() {
        var table = document.createElement("table");
        var body = getBody(document);
        body.appendChild(table);
        tableCssDisplayBlock = (getComputedStyleProperty(table, "display") == "block");
        body.removeChild(table);
    })();

    api.features.tableCssDisplayBlock = tableCssDisplayBlock;

    var defaultDisplayValueForTag = {
        table: "table",
        caption: "table-caption",
        colgroup: "table-column-group",
        col: "table-column",
        thead: "table-header-group",
        tbody: "table-row-group",
        tfoot: "table-footer-group",
        tr: "table-row",
        td: "table-cell",
        th: "table-cell"
    };

    // Corrects IE's "block" value for table-related elements
    function getComputedDisplay(el, win) {
        var display = getComputedStyleProperty(el, "display", win);
        var tagName = el.tagName.toLowerCase();
        return (display == "block"
            && tableCssDisplayBlock
            && defaultDisplayValueForTag.hasOwnProperty(tagName))
            ? defaultDisplayValueForTag[tagName] : display;
    }

    function isHidden(node) {
        var ancestors = getAncestorsAndSelf(node);
        for (var i = 0, len = ancestors.length; i < len; ++i) {
            if (ancestors[i].nodeType == 1 && getComputedDisplay(ancestors[i]) == "none") {
                return true;
            }
        }

        return false;
    }

    function isVisibilityHiddenTextNode(textNode) {
        var el;
        return textNode.nodeType == 3
            && (el = textNode.parentNode)
            && getComputedStyleProperty(el, "visibility") == "hidden";
    }

    /*----------------------------------------------------------------------------------------------------------------*/


    // "A block node is either an Element whose "display" property does not have
    // resolved value "inline" or "inline-block" or "inline-table" or "none", or a
    // Document, or a DocumentFragment."
    function isBlockNode(node) {
        return node
            && ((node.nodeType == 1 && !/^(inline(-block|-table)?|none)$/.test(getComputedDisplay(node)))
            || node.nodeType == 9 || node.nodeType == 11);
    }

    function getLastDescendantOrSelf(node) {
        var lastChild = node.lastChild;
        return lastChild ? getLastDescendantOrSelf(lastChild) : node;
    }

    function containsPositions(node) {
        return dom.isCharacterDataNode(node)
            || !/^(area|base|basefont|br|col|frame|hr|img|input|isindex|link|meta|param)$/i.test(node.nodeName);
    }

    function getAncestors(node) {
        var ancestors = [];
        while (node.parentNode) {
            ancestors.unshift(node.parentNode);
            node = node.parentNode;
        }
        return ancestors;
    }

    function getAncestorsAndSelf(node) {
        return getAncestors(node).concat([node]);
    }

    // Opera 11 puts HTML elements in the null namespace, it seems, and IE 7 has undefined namespaceURI
    function isHtmlNode(node) {
        var ns;
        return typeof (ns = node.namespaceURI) == UNDEF || (ns === null || ns == "http://www.w3.org/1999/xhtml");
    }

    function isHtmlElement(node, tagNames) {
        if (!node || node.nodeType != 1 || !isHtmlNode(node)) {
            return false;
        }
        switch (typeof tagNames) {
            case "string":
                return node.tagName.toLowerCase() == tagNames.toLowerCase();
            case "object":
                return new RegExp("^(" + tagNames.join("|S") + ")$", "i").test(node.tagName);
            default:
                return true;
        }
    }

    function nextNodeDescendants(node) {
        while (node && !node.nextSibling) {
            node = node.parentNode;
        }
        if (!node) {
            return null;
        }
        return node.nextSibling;
    }

    function nextNode(node, excludeChildren) {
        if (!excludeChildren && node.hasChildNodes()) {
            return node.firstChild;
        }
        return nextNodeDescendants(node);
    }

    function previousNode(node) {
        var previous = node.previousSibling;
        if (previous) {
            node = previous;
            while (node.hasChildNodes()) {
                node = node.lastChild;
            }
            return node;
        }
        var parent = node.parentNode;
        if (parent && parent.nodeType == 1) {
            return parent;
        }
        return null;
    }



    // Adpated from Aryeh's code.
    // "A whitespace node is either a Text node whose data is the empty string; or
    // a Text node whose data consists only of one or more tabs (0x0009), line
    // feeds (0x000A), carriage returns (0x000D), and/or spaces (0x0020), and whose
    // parent is an Element whose resolved value for "white-space" is "normal" or
    // "nowrap"; or a Text node whose data consists only of one or more tabs
    // (0x0009), carriage returns (0x000D), and/or spaces (0x0020), and whose
    // parent is an Element whose resolved value for "white-space" is "pre-line"."
    function isWhitespaceNode(node) {
        if (!node || node.nodeType != 3) {
            return false;
        }
        var text = node.data;
        if (text === "") {
            return true;
        }
        var parent = node.parentNode;
        if (!parent || parent.nodeType != 1) {
            return false;
        }
        var computedWhiteSpace = getComputedStyleProperty(node.parentNode, "whiteSpace");

        return (/^[\t\n\r ]+$/.test(text) && /^(normal|nowrap)$/.test(computedWhiteSpace))
            || (/^[\t\r ]+$/.test(text) && computedWhiteSpace == "pre-line");
    }

    // Adpated from Aryeh's code.
    // "node is a collapsed whitespace node if the following algorithm returns
    // true:"
    function isCollapsedWhitespaceNode(node) {
        // "If node's data is the empty string, return true."
        if (node.data === "") {
            return true;
        }

        // "If node is not a whitespace node, return false."
        if (!isWhitespaceNode(node)) {
            return false;
        }

        // "Let ancestor be node's parent."
        var ancestor = node.parentNode;

        // "If ancestor is null, return true."
        if (!ancestor) {
            return true;
        }

        // "If the "display" property of some ancestor of node has resolved value "none", return true."
        if (isHidden(node)) {
            return true;
        }

        return false;
    }

    function isCollapsedNode(node) {
        var type = node.nodeType;
        return type == 7 /* PROCESSING_INSTRUCTION */
            || type == 8 /* COMMENT */
            || isHidden(node)
            || /^(script|style)$/i.test(node.nodeName)
            || isVisibilityHiddenTextNode(node)
            || isCollapsedWhitespaceNode(node);
    }

    function isIgnoredNode(node, win) {
        var type = node.nodeType;
        return type == 7 /* PROCESSING_INSTRUCTION */
            || type == 8 /* COMMENT */
            || (type == 1 && getComputedDisplay(node, win) == "none");
    }

    /*----------------------------------------------------------------------------------------------------------------*/

    // Possibly overengineered caching system to prevent repeated DOM calls slowing everything down

    function Cache() {
        this.store = {};
    }

    Cache.prototype = {
        get: function(key) {
            return this.store.hasOwnProperty(key) ? this.store[key] : null;
        },

        set: function(key, value) {
            return this.store[key] = value;
        }
    };

    var cachedCount = 0, uncachedCount = 0;

    function createCachingGetter(methodName, func, objProperty) {
        return function(args) {
            var cache = this.cache;
            if (cache.hasOwnProperty(methodName)) {
                cachedCount++;
                return cache[methodName];
            } else {
                uncachedCount++;
                var value = func.call(this, objProperty ? this[objProperty] : this, args);
                cache[methodName] = value;
                return value;
            }
        };
    }

    api.report = function() {
        console.log("Cached: " + cachedCount + ", uncached: " + uncachedCount);
    };

    /*----------------------------------------------------------------------------------------------------------------*/

    function NodeWrapper(node, session) {
        this.node = node;
        this.session = session;
        this.cache = new Cache();
        this.positions = new Cache();
    }

    var nodeProto = {
        getPosition: function(offset) {
            var positions = this.positions;
            return positions.get(offset) || positions.set(offset, new Position(this, offset));
        },

        toString: function() {
            return "[NodeWrapper(" + dom.inspectNode(this.node) + ")]";
        }
    };

    NodeWrapper.prototype = nodeProto;

    var EMPTY = "EMPTY",
        NON_SPACE = "NON_SPACE",
        UNCOLLAPSIBLE_SPACE = "UNCOLLAPSIBLE_SPACE",
        COLLAPSIBLE_SPACE = "COLLAPSIBLE_SPACE",
        TRAILING_SPACE_IN_BLOCK = "TRAILING_SPACE_IN_BLOCK",
        TRAILING_SPACE_BEFORE_BR = "TRAILING_SPACE_BEFORE_BR",
        PRE_LINE_TRAILING_SPACE_BEFORE_LINE_BREAK = "PRE_LINE_TRAILING_SPACE_BEFORE_LINE_BREAK";


    extend(nodeProto, {
        isCharacterDataNode: createCachingGetter("isCharacterDataNode", dom.isCharacterDataNode, "node"),
        getNodeIndex: createCachingGetter("nodeIndex", dom.getNodeIndex, "node"),
        getLength: createCachingGetter("nodeLength", dom.getNodeLength, "node"),
        containsPositions: createCachingGetter("containsPositions", containsPositions, "node"),
        isWhitespace: createCachingGetter("isWhitespace", isWhitespaceNode, "node"),
        isCollapsedWhitespace: createCachingGetter("isCollapsedWhitespace", isCollapsedWhitespaceNode, "node"),
        getComputedDisplay: createCachingGetter("computedDisplay", getComputedDisplay, "node"),
        isCollapsed: createCachingGetter("collapsed", isCollapsedNode, "node"),
        isIgnored: createCachingGetter("ignored", isIgnoredNode, "node"),
        next: createCachingGetter("nextPos", nextNode, "node"),
        previous: createCachingGetter("previous", previousNode, "node"),

        getTextNodeInfo: createCachingGetter("textNodeInfo", function(textNode) {
            var spaceRegex = null, collapseSpaces = false;
            var cssWhitespace = getComputedStyleProperty(textNode.parentNode, "whiteSpace");
            var preLine = (cssWhitespace == "pre-line");
            if (preLine) {
                spaceRegex = spacesMinusLineBreaksRegex;
                collapseSpaces = true;
            } else if (cssWhitespace == "normal" || cssWhitespace == "nowrap") {
                spaceRegex = spacesRegex;
                collapseSpaces = true;
            }

            return {
                node: textNode,
                text: textNode.data,
                spaceRegex: spaceRegex,
                collapseSpaces: collapseSpaces,
                preLine: preLine
            };
        }, "node"),

        hasInnerText: createCachingGetter("hasInnerText", function(el, backward) {
            var session = this.session;
            var posAfterEl = session.getPosition(el.parentNode, this.getNodeIndex() + 1);
            var firstPosInEl = session.getPosition(el, 0);

            var pos = backward ? posAfterEl : firstPosInEl;
            var endPos = backward ? firstPosInEl : posAfterEl;

            /*
             <body><p>X  </p><p>Y</p></body>

             Positions:

             body:0:""
             p:0:""
             text:0:""
             text:1:"X"
             text:2:TRAILING_SPACE_IN_BLOCK
             text:3:COLLAPSED_SPACE
             p:1:""
             body:1:"\n"
             p:0:""
             text:0:""
             text:1:"Y"

             A character is a TRAILING_SPACE_IN_BLOCK iff:

             - There is no uncollapsed character after it within the visible containing block element

             A character is a TRAILING_SPACE_BEFORE_BR iff:

             - There is no uncollapsed character after it preceding a <br> element

             An element has inner text iff

             - It is not hidden
             - It contains an uncollapsed character

             All trailing spaces (pre-line, before <br>, end of block) require definite non-empty characters to render.
             */

            while (pos !== endPos) {
                pos.prepopulateChar();
                if (pos.isDefinitelyNonEmpty()) {
                    return true;
                }
                pos = backward ? pos.previousVisible() : pos.nextVisible();
            }

            return false;
        }, "node"),

        getTrailingSpace: createCachingGetter("trailingSpace", function(el) {
            if (el.tagName.toLowerCase() == "br") {
                return "";
            } else {
                switch (this.getComputedDisplay()) {
                    case "inline":
                        var child = el.lastChild;
                        while (child) {
                            if (!isIgnoredNode(child)) {
                                return (child.nodeType == 1) ? this.session.getNodeWrapper(child).getTrailingSpace() : "";
                            }
                            child = child.previousSibling;
                        }
                        break;
                    case "inline-block":
                    case "inline-table":
                    case "none":
                    case "table-column":
                    case "table-column-group":
                        break;
                    case "table-cell":
                        return "\t";
                    default:
                        return this.hasInnerText(true) ? "\n" : "";
                }
            }
            return "";
        }, "node"),

        getLeadingSpace: createCachingGetter("leadingSpace", function(el) {
            switch (this.getComputedDisplay()) {
                case "inline":
                case "inline-block":
                case "inline-table":
                case "none":
                case "table-column":
                case "table-column-group":
                case "table-cell":
                    break;
                default:
                    return this.hasInnerText(false) ? "\n" : "";
            }
            return "";
        }, "node")
    });

    /*----------------------------------------------------------------------------------------------------------------*/


    function Position(nodeWrapper, offset) {
        this.offset = offset;
        this.nodeWrapper = nodeWrapper;
        this.node = nodeWrapper.node;
        this.session = nodeWrapper.session;
        this.cache = new Cache();
    }

    function inspectPosition() {
        return "[Position(" + dom.inspectNode(this.node) + ":" + this.offset + ")]";
    }

    var positionProto = {
        character: "",
        characterType: EMPTY,
        isBr: false,

        /*
        This method:
        - Fully populates positions that have characters that can be determined independently of any other characters.
        - Populates most types of space positions with a provisional character. The character is finalized later.
         */
        prepopulateChar: function() {
            var pos = this;
            if (!pos.prepopulatedChar) {
                var node = pos.node, offset = pos.offset;
                var visibleChar = "", charType = EMPTY;
                var finalizedChar = false;
                if (offset > 0) {
                    if (node.nodeType == 3) {
                        var text = node.data;
                        var textChar = text.charAt(offset - 1);

                        var nodeInfo = pos.nodeWrapper.getTextNodeInfo();
                        var spaceRegex = nodeInfo.spaceRegex;
                        if (nodeInfo.collapseSpaces) {
                            if (spaceRegex.test(textChar)) {
                                // "If the character at position is from set, append a single space (U+0020) to newdata and advance
                                // position until the character at position is not from set."

                                // We also need to check for the case where we're in a pre-line and we have a space preceding a
                                // line break, because such spaces are collapsed in some browsers
                                if (offset > 1 && spaceRegex.test(text.charAt(offset - 2))) {
                                } else if (nodeInfo.preLine && text.charAt(offset) === "\n") {
                                    visibleChar = " ";
                                    charType = PRE_LINE_TRAILING_SPACE_BEFORE_LINE_BREAK;
                                } else {
                                    visibleChar = " ";
                                    //pos.checkForFollowingLineBreak = true;
                                    charType = COLLAPSIBLE_SPACE;
                                }
                            } else {
                                visibleChar = textChar;
                                charType = NON_SPACE;
                                finalizedChar = true;
                            }
                        } else {
                            visibleChar = textChar;
                            charType = UNCOLLAPSIBLE_SPACE;
                            finalizedChar = true;
                        }
                    } else {
                        var nodePassed = node.childNodes[offset - 1];
                        if (nodePassed && nodePassed.nodeType == 1 && !isCollapsedNode(nodePassed)) {
                            if (nodePassed.tagName.toLowerCase() == "br") {
                                visibleChar = "\n";
                                pos.isBr = true;
                                charType = COLLAPSIBLE_SPACE;
                                finalizedChar = false;
                            } else {
                                pos.checkForTrailingSpace = true;
                            }
                        }

                        // Check the leading space of the next node for the case when a block element follows an inline
                        // element or text node. In that case, there is an implied line break between the two nodes.
                        if (!visibleChar) {
                            var nextNode = node.childNodes[offset];
                            if (nextNode && nextNode.nodeType == 1 && !isCollapsedNode(nextNode)) {
                                pos.checkForLeadingSpace = true;
                            }
                        }
                    }
                }

                pos.prepopulatedChar = true;
                pos.character = visibleChar;
                pos.characterType = charType;
                pos.isCharInvariant = finalizedChar;
            }
        },

        isDefinitelyNonEmpty: function() {
            var charType = this.characterType;
            return charType == NON_SPACE || charType == UNCOLLAPSIBLE_SPACE;
        },

        // Resolve leading and trailing spaces, which may involve prepopulating other positions
        resolveLeadingAndTrailingSpaces: function() {
            if (!this.prepopulatedChar) {
                this.prepopulateChar();
            }
            if (this.checkForTrailingSpace) {
                var trailingSpace = this.session.getNodeWrapper(this.node.childNodes[this.offset - 1]).getTrailingSpace();
                if (trailingSpace) {
                    this.isTrailingSpace = true;
                    this.character = trailingSpace;
                    this.characterType = COLLAPSIBLE_SPACE;
                }
                this.checkForTrailingSpace = false;
            }
            if (this.checkForLeadingSpace) {
                var leadingSpace = this.session.getNodeWrapper(this.node.childNodes[this.offset]).getLeadingSpace();
                if (leadingSpace) {
                    this.isLeadingSpace = true;
                    this.character = leadingSpace;
                    this.characterType = COLLAPSIBLE_SPACE;
                }
                this.checkForLeadingSpace = false;
            }
        },

        getPrecedingUncollapsedPosition: function(characterOptions) {
            var pos = this, character;
            while ( (pos = pos.previousVisible()) ) {
                character = pos.getCharacter(characterOptions);
                if (character !== "") {
                    return pos;
                }
            }

            return null;
        },

        getCharacter: function(characterOptions) {
            this.resolveLeadingAndTrailingSpaces();

            // Check if this position's  character is invariant (i.e. not dependent on character options) and return it
            // if so
            if (this.isCharInvariant) {
                return this.character;
            }

            var cacheKey = ["character", characterOptions.includeSpaceBeforeBr, characterOptions.includeBlockContentTrailingSpace, characterOptions.includePreLineTrailingSpace].join("_");
            var cachedChar = this.cache.get(cacheKey);
            if (cachedChar !== null) {
                return cachedChar;
            }

            // We need to actually get the character
            var character = "";
            var collapsible = (this.characterType == COLLAPSIBLE_SPACE);

            var nextPos, previousPos/* = this.getPrecedingUncollapsedPosition(characterOptions)*/;
            var gotPreviousPos = false;
            var pos = this;

            function getPreviousPos() {
                if (!gotPreviousPos) {
                    previousPos = pos.getPrecedingUncollapsedPosition(characterOptions);
                    gotPreviousPos = true;
                }
                return previousPos;
            }

            // Disallow a collapsible space that is followed by a line break or is the last character
            if (collapsible) {
                // Disallow a collapsible space that follows a trailing space or line break, or is the first character
                if (this.character == " " &&
                        (!getPreviousPos() || previousPos.isTrailingSpace || previousPos.character == "\n")) {
                }
                // Allow a leading line break unless it follows a line break
                else if (this.character == "\n" && this.isLeadingSpace) {
                    if (getPreviousPos() && previousPos.character != "\n") {
                        character = "\n";
                    } else {
                    }
                } else {
                    nextPos = this.nextUncollapsed();
                    if (nextPos) {
                        if (nextPos.isBr) {
                            this.type = TRAILING_SPACE_BEFORE_BR;
                        } else if (nextPos.isTrailingSpace && nextPos.character == "\n") {
                            this.type = TRAILING_SPACE_IN_BLOCK;
                        }
                        if (nextPos.character === "\n") {
                            if (this.type == TRAILING_SPACE_BEFORE_BR && !characterOptions.includeSpaceBeforeBr) {
                            } else if (this.type == TRAILING_SPACE_IN_BLOCK && nextPos.isTrailingSpace && !characterOptions.includeBlockContentTrailingSpace) {
                            } else if (this.type == PRE_LINE_TRAILING_SPACE_BEFORE_LINE_BREAK && nextPos.type == NON_SPACE && !characterOptions.includePreLineTrailingSpace) {
                            } else if (this.character === "\n") {
                                if (nextPos.isTrailingSpace) {
                                    if (this.isTrailingSpace) {
                                    } else if (this.isBr) {
                                    }
                                } else {
                                    character = "\n";
                                }
                            } else if (this.character === " ") {
                                character = " ";
                            } else {
                            }
                        } else {
                            character = this.character;
                        }
                    } else {
                    }
                }
            }

            // Collapse a br element that is followed by a trailing space
            else if (this.character === "\n" &&
                    (!(nextPos = this.nextUncollapsed()) || nextPos.isTrailingSpace)) {
            }


            this.cache.set(cacheKey, character);

            return character;
        },

        equals: function(pos) {
            return !!pos && this.node === pos.node && this.offset === pos.offset;
        },

        inspect: inspectPosition,

        toString: function() {
            return this.character;
        }
    };

    Position.prototype = positionProto;

    extend(positionProto, {
        next: createCachingGetter("nextPos", function(pos) {
            var nodeWrapper = pos.nodeWrapper, node = pos.node, offset = pos.offset, session = nodeWrapper.session;
            if (!node) {
                return null;
            }
            var nextNode, nextOffset, child;
            if (offset == nodeWrapper.getLength()) {
                // Move onto the next node
                nextNode = node.parentNode;
                nextOffset = nextNode ? nodeWrapper.getNodeIndex() + 1 : 0;
            } else {
                if (nodeWrapper.isCharacterDataNode()) {
                    nextNode = node;
                    nextOffset = offset + 1;
                } else {
                    child = node.childNodes[offset];
                    // Go into the children next, if children there are
                    if (session.getNodeWrapper(child).containsPositions()) {
                        nextNode = child;
                        nextOffset = 0;
                    } else {
                        nextNode = node;
                        nextOffset = offset + 1;
                    }
                }
            }

            return nextNode ? session.getPosition(nextNode, nextOffset) : null;
        }),

        previous: createCachingGetter("previous", function(pos) {
            var nodeWrapper = pos.nodeWrapper, node = pos.node, offset = pos.offset, session = nodeWrapper.session;
            var previousNode, previousOffset, child;
            if (offset == 0) {
                previousNode = node.parentNode;
                previousOffset = previousNode ? nodeWrapper.getNodeIndex() : 0;
            } else {
                if (nodeWrapper.isCharacterDataNode()) {
                    previousNode = node;
                    previousOffset = offset - 1;
                } else {
                    child = node.childNodes[offset - 1];
                    // Go into the children next, if children there are
                    if (session.getNodeWrapper(child).containsPositions()) {
                        previousNode = child;
                        previousOffset = dom.getNodeLength(child);
                    } else {
                        previousNode = node;
                        previousOffset = offset - 1;
                    }
                }
            }
            return previousNode ? session.getPosition(previousNode, previousOffset) : null;
        }),

        /*
         Next and previous position moving functions that filter out

         - Hidden (CSS visibility/display) elements
         - Script and style elements
         */
        nextVisible: createCachingGetter("nextVisible", function(pos) {
            var next = pos.next();
            if (!next) {
                return null;
            }
            var nodeWrapper = next.nodeWrapper, node = next.node;
            var newPos = next;
            if (nodeWrapper.isCollapsed()) {
                // We're skipping this node and all its descendants
                newPos = nodeWrapper.session.getPosition(node.parentNode, nodeWrapper.getNodeIndex() + 1);
            }
            return newPos;
        }),

        nextUncollapsed: createCachingGetter("nextUncollapsed", function(pos) {
            var nextPos = pos;
            while ( (nextPos = nextPos.nextVisible()) ) {
                nextPos.resolveLeadingAndTrailingSpaces();
                if (nextPos.character !== "") {
                    return nextPos;
                }
            }
            return null;
        }),

        previousVisible: createCachingGetter("previousVisible", function(pos) {
            var previous = pos.previous();
            if (!previous) {
                return null;
            }
            var nodeWrapper = previous.nodeWrapper, node = previous.node;
            var newPos = previous;
            if (nodeWrapper.isCollapsed()) {
                // We're skipping this node and all its descendants
                newPos = nodeWrapper.session.getPosition(node.parentNode, nodeWrapper.getNodeIndex());
            }
            return newPos;
        })
    });

    /*----------------------------------------------------------------------------------------------------------------*/

    var currentSession = null;

    var Session = (function() {
        function createWrapperCache(nodeProperty) {
            var cache = new Cache();

            return {
                get: function(node) {
                    var wrappersByProperty = cache.get(node[nodeProperty]);
                    if (wrappersByProperty) {
                        for (var i = 0, wrapper; wrapper = wrappersByProperty[i++]; ) {
                            if (wrapper.node === node) {
                                return wrapper;
                            }
                        }
                    }
                    return null;
                },

                set: function(nodeWrapper) {
                    var property = nodeWrapper.node[nodeProperty];
                    var wrappersByProperty = cache.get(property) || cache.set(property, []);
                    wrappersByProperty.push(nodeWrapper);
                }
            };
        }

        var uniqueIDSupported = util.isHostProperty(document.documentElement, "uniqueID");

        function Session() {
            this.initCaches();
        }

        Session.prototype = {
            initCaches: function() {
                this.elementCache = uniqueIDSupported ? (function() {
                    var elementsCache = new Cache();

                    return {
                        get: function(el) {
                            return elementsCache.get(el.uniqueID);
                        },

                        set: function(elWrapper) {
                            elementsCache.set(elWrapper.node.uniqueID, elWrapper);
                        }
                    };
                })() : createWrapperCache("tagName");

                // Store text nodes keyed by data, although we may need to truncate this
                this.textNodeCache = createWrapperCache("data");
                this.otherNodeCache = createWrapperCache("nodeName");
            },

            getNodeWrapper: function(node) {
                var wrapperCache;
                switch (node.nodeType) {
                    case 1:
                        wrapperCache = this.elementCache;
                        break;
                    case 3:
                        wrapperCache = this.textNodeCache;
                        break;
                    default:
                        wrapperCache = this.otherNodeCache;
                        break;
                }

                var wrapper = wrapperCache.get(node);
                if (!wrapper) {
                    wrapper = new NodeWrapper(node, this);
                    wrapperCache.set(wrapper);
                }
                return wrapper;
            },

            getPosition: function(node, offset) {
                return this.getNodeWrapper(node).getPosition(offset);
            },

            getRangeBoundaryPosition: function(range, isStart) {
                var prefix = isStart ? "start" : "end";
                return this.getPosition(range[prefix + "Container"], range[prefix + "Offset"]);
            },

            detach: function() {
                this.elementCache = this.textNodeCache = this.otherNodeCache = null;
            }
        };

        return Session;
    })();

    /*----------------------------------------------------------------------------------------------------------------*/

    function startSession() {
        endSession();
        return (currentSession = new Session());
    }

    function getSession() {
        return currentSession || startSession();
    }

    function endSession() {
        if (currentSession) {
            currentSession.detach();
        }
        currentSession = null;
    }

    /*----------------------------------------------------------------------------------------------------------------*/

    // Extensions to the rangy.dom utility object

    extend(dom, {
        nextNode: nextNode,
        previousNode: previousNode
    });

    /*----------------------------------------------------------------------------------------------------------------*/

    function createCharacterIterator(startPos, backward, endPos, characterOptions) {

        // Adjust the end position to ensure that it is actually reached
        if (endPos) {
            if (backward) {
                if (isCollapsedNode(endPos.node)) {
                    endPos = startPos.previousVisible();
                }
            } else {
                if (isCollapsedNode(endPos.node)) {
                    endPos = endPos.nextVisible();
                }
            }
        }

        var pos = startPos, finished = false;

        function next() {
            var newPos = null, charPos = null;
            if (backward) {
                charPos = pos;
                if (!finished) {
                    pos = pos.previousVisible();
                    finished = !pos || (endPos && pos.equals(endPos));
                }
            } else {
                if (!finished) {
                    charPos = pos = pos.nextVisible();
                    finished = !pos || (endPos && pos.equals(endPos));
                }
            }
            if (finished) {
                pos = null;
            }
            return charPos;
        }

        var previousTextPos, returnPreviousTextPos = false;

        return {
            next: function() {
                if (returnPreviousTextPos) {
                    returnPreviousTextPos = false;
                    return previousTextPos;
                } else {
                    var pos, character;
                    while ( (pos = next()) ) {
                        character = pos.getCharacter(characterOptions);
                        if (character) {
                            previousTextPos = pos;
                            return pos;
                        }
                    }
                    return null;
                }
            },

            rewind: function() {
                if (previousTextPos) {
                    returnPreviousTextPos = true;
                } else {
                    throw module.createError("createCharacterIterator: cannot rewind. Only one position can be rewound.");
                }
            },

            dispose: function() {
                startPos = endPos = null;
            }
        };
    }

    var arrayIndexOf = Array.prototype.indexOf ?
        function(arr, val) {
            return arr.indexOf(val);
        } :
        function(arr, val) {
            for (var i = 0, len = arr.length; i < len; ++i) {
                if (arr[i] === val) {
                    return i;
                }
            }
            return -1;
        };

    // Provides a pair of iterators over text positions, tokenized. Transparently requests more text when next()
    // is called and there is no more tokenized text
    function createTokenizedTextProvider(pos, characterOptions, wordOptions) {
        var forwardIterator = createCharacterIterator(pos, false, null, characterOptions);
        var backwardIterator = createCharacterIterator(pos, true, null, characterOptions);
        var tokenizer = wordOptions.tokenizer;

        // Consumes a word and the whitespace beyond it
        function consumeWord(forward) {
            var pos, textChar;
            var newChars = [], it = forward ? forwardIterator : backwardIterator;

            var passedWordBoundary = false, insideWord = false;

            while ( (pos = it.next()) ) {
                textChar = pos.character;


                if (allWhiteSpaceRegex.test(textChar)) {
                    if (insideWord) {
                        insideWord = false;
                        passedWordBoundary = true;
                    }
                } else {
                    if (passedWordBoundary) {
                        it.rewind();
                        break;
                    } else {
                        insideWord = true;
                    }
                }
                newChars.push(pos);
            }


            return newChars;
        }

        // Get initial word surrounding initial position and tokenize it
        var forwardChars = consumeWord(true);
        var backwardChars = consumeWord(false).reverse();
        var tokens = tokenizer(backwardChars.concat(forwardChars), wordOptions);

        // Create initial token buffers
        var forwardTokensBuffer = forwardChars.length ?
            tokens.slice(arrayIndexOf(tokens, forwardChars[0].token)) : [];

        var backwardTokensBuffer = backwardChars.length ?
            tokens.slice(0, arrayIndexOf(tokens, backwardChars.pop().token) + 1) : [];

        function inspectBuffer(buffer) {
            var textPositions = ["[" + buffer.length + "]"];
            for (var i = 0; i < buffer.length; ++i) {
                textPositions.push("(word: " + buffer[i] + ", is word: " + buffer[i].isWord + ")");
            }
            return textPositions;
        }


        return {
            nextEndToken: function() {
                var lastToken, forwardChars;

                // If we're down to the last token, consume character chunks until we have a word or run out of
                // characters to consume
                while ( forwardTokensBuffer.length == 1 &&
                    !(lastToken = forwardTokensBuffer[0]).isWord &&
                    (forwardChars = consumeWord(true)).length > 0) {

                    // Merge trailing non-word into next word and tokenize
                    forwardTokensBuffer = tokenizer(lastToken.chars.concat(forwardChars), wordOptions);
                }

                return forwardTokensBuffer.shift();
            },

            previousStartToken: function() {
                var lastToken, backwardChars;

                // If we're down to the last token, consume character chunks until we have a word or run out of
                // characters to consume
                while ( backwardTokensBuffer.length == 1 &&
                    !(lastToken = backwardTokensBuffer[0]).isWord &&
                    (backwardChars = consumeWord(false)).length > 0) {

                    // Merge leading non-word into next word and tokenize
                    backwardTokensBuffer = tokenizer(backwardChars.reverse().concat(lastToken.chars), wordOptions);
                }

                return backwardTokensBuffer.pop();
            },

            dispose: function() {
                forwardIterator.dispose();
                backwardIterator.dispose();
                forwardTokensBuffer = backwardTokensBuffer = null;
            }
        };
    }

    function movePositionBy(pos, unit, count, characterOptions, wordOptions) {
        var unitsMoved = 0, currentPos, newPos = pos, charIterator, nextPos, absCount = Math.abs(count), token;
        if (count !== 0) {
            var backward = (count < 0);

            switch (unit) {
                case CHARACTER:
                    charIterator = createCharacterIterator(pos, backward, null, characterOptions);
                    while ( (currentPos = charIterator.next()) && unitsMoved < absCount ) {
                        ++unitsMoved;
                        newPos = currentPos;
                    }
                    nextPos = currentPos;
                    charIterator.dispose();
                    break;
                case WORD:
                    var tokenizedTextProvider = createTokenizedTextProvider(pos, characterOptions, wordOptions);
                    var next = backward ? tokenizedTextProvider.previousStartToken : tokenizedTextProvider.nextEndToken;

                    while ( (token = next()) && unitsMoved < absCount ) {
                        if (token.isWord) {
                            ++unitsMoved;
                            newPos = backward ? token.chars[0] : token.chars[token.chars.length - 1];
                        }
                    }
                    break;
                default:
                    throw new Error("movePositionBy: unit '" + unit + "' not implemented");
            }

            // Perform any necessary position tweaks
            if (backward) {
                newPos = newPos.previousVisible();
                unitsMoved = -unitsMoved;
            } else if (newPos && newPos.isLeadingSpace) {
                // Tweak the position for the case of a leading space. The problem is that an uncollapsed leading space
                // before a block element (for example, the line break between "1" and "2" in the following HTML:
                // "1<p>2</p>") is considered to be attached to the position immediately before the block element, which
                // corresponds with a different selection position in most browsers from the one we want (i.e. at the
                // start of the contents of the block element). We get round this by advancing the position returned to
                // the last possible equivalent visible position.
                if (unit == WORD) {
                    charIterator = createCharacterIterator(pos, false, null, characterOptions);
                    nextPos = charIterator.next();
                    charIterator.dispose();
                }
                if (nextPos) {
                    newPos = nextPos.previousVisible();
                }
            }
        }


        return {
            position: newPos,
            unitsMoved: unitsMoved
        };
    }

    function createRangeCharacterIterator(session, range, characterOptions, backward) {
        var rangeStart = session.getRangeBoundaryPosition(range, true);
        var rangeEnd = session.getRangeBoundaryPosition(range, false);
        var itStart = backward ? rangeEnd : rangeStart;
        var itEnd = backward ? rangeStart : rangeEnd;

        return createCharacterIterator(itStart, !!backward, itEnd, characterOptions);
    }

    function getRangeCharacters(session, range, characterOptions) {

        var chars = [], it = createRangeCharacterIterator(session, range, characterOptions), pos;
        while ( (pos = it.next()) ) {
            chars.push(pos);
        }

        it.dispose();
        return chars;
    }

    function isWholeWord(startPos, endPos, wordOptions) {
        var range = api.createRange(startPos.node);
        range.setStartAndEnd(startPos.node, startPos.offset, endPos.node, endPos.offset);
        var returnVal = !range.expand("word", wordOptions);
        range.detach();
        return returnVal;
    }

    function findTextFromPosition(initialPos, searchTerm, isRegex, searchScopeRange, findOptions) {
        var backward = isDirectionBackward(findOptions.direction);
        var it = createCharacterIterator(
            initialPos,
            backward,
            initialPos.session.getRangeBoundaryPosition(searchScopeRange, backward),
            findOptions
        );
        var text = "", chars = [], pos, currentChar, matchStartIndex, matchEndIndex;
        var result, insideRegexMatch;
        var returnValue = null;

        function handleMatch(startIndex, endIndex) {
            var startPos = chars[startIndex].previousVisible();
            var endPos = chars[endIndex - 1];
            var valid = (!findOptions.wholeWordsOnly || isWholeWord(startPos, endPos, findOptions.wordOptions));

            return {
                startPos: startPos,
                endPos: endPos,
                valid: valid
            };
        }

        while ( (pos = it.next()) ) {
            currentChar = pos.character;
            if (!isRegex && !findOptions.caseSensitive) {
                currentChar = currentChar.toLowerCase();
            }

            if (backward) {
                chars.unshift(pos);
                text = currentChar + text;
            } else {
                chars.push(pos);
                text += currentChar;
            }

            if (isRegex) {
                result = searchTerm.exec(text);
                if (result) {
                    if (insideRegexMatch) {
                        // Check whether the match is now over
                        matchStartIndex = result.index;
                        matchEndIndex = matchStartIndex + result[0].length;
                        if ((!backward && matchEndIndex < text.length) || (backward && matchStartIndex > 0)) {
                            returnValue = handleMatch(matchStartIndex, matchEndIndex);
                            break;
                        }
                    } else {
                        insideRegexMatch = true;
                    }
                }
            } else if ( (matchStartIndex = text.indexOf(searchTerm)) != -1 ) {
                returnValue = handleMatch(matchStartIndex, matchStartIndex + searchTerm.length);
                break;
            }
        }

        // Check whether regex match extends to the end of the range
        if (insideRegexMatch) {
            returnValue = handleMatch(matchStartIndex, matchEndIndex);
        }
        it.dispose();

        return returnValue;
    }

    function createEntryPointFunction(func) {
        return function() {
            var sessionRunning = !!currentSession;
            var session = getSession();
            var args = [session].concat( util.toArray(arguments) );
            var returnValue = func.apply(this, args);
            if (!sessionRunning) {
                endSession();
            }
            return returnValue;
        };
    }

    /*----------------------------------------------------------------------------------------------------------------*/

    // Extensions to the Rangy Range object

    function createRangeBoundaryMover(isStart, collapse) {
        /*
         Unit can be "character" or "word"
         Options:

         - includeTrailingSpace
         - wordRegex
         - tokenizer
         - collapseSpaceBeforeLineBreak
         */
        return createEntryPointFunction(
            function(session, unit, count, moveOptions) {
                if (typeof count == "undefined") {
                    count = unit;
                    unit = CHARACTER;
                }
                moveOptions = createOptions(moveOptions, defaultMoveOptions);
                var characterOptions = createCharacterOptions(moveOptions.characterOptions);
                var wordOptions = createWordOptions(moveOptions.wordOptions);

                var boundaryIsStart = isStart;
                if (collapse) {
                    boundaryIsStart = (count >= 0);
                    this.collapse(!boundaryIsStart);
                }
                var moveResult = movePositionBy(session.getRangeBoundaryPosition(this, boundaryIsStart), unit, count, characterOptions, wordOptions);
                var newPos = moveResult.position;
                this[boundaryIsStart ? "setStart" : "setEnd"](newPos.node, newPos.offset);
                return moveResult.unitsMoved;
            }
        );
    }

    function createRangeTrimmer(isStart) {
        return createEntryPointFunction(
            function(session, characterOptions) {
                characterOptions = createCharacterOptions(characterOptions);
                var pos;
                var it = createRangeCharacterIterator(session, this, characterOptions, !isStart);
                var trimCharCount = 0;
                while ( (pos = it.next()) && allWhiteSpaceRegex.test(pos.character) ) {
                    ++trimCharCount;
                }
                it.dispose();
                var trimmed = (trimCharCount > 0);
                if (trimmed) {
                    this[isStart ? "moveStart" : "moveEnd"](
                        "character",
                        isStart ? trimCharCount : -trimCharCount,
                        { characterOptions: characterOptions }
                    );
                }
                return trimmed;
            }
        );
    }

    extend(api.rangePrototype, {
        moveStart: createRangeBoundaryMover(true, false),

        moveEnd: createRangeBoundaryMover(false, false),

        move: createRangeBoundaryMover(true, true),

        trimStart: createRangeTrimmer(true),

        trimEnd: createRangeTrimmer(false),

        trim: createEntryPointFunction(
            function(session, characterOptions) {
                var startTrimmed = this.trimStart(characterOptions), endTrimmed = this.trimEnd(characterOptions);
                return startTrimmed || endTrimmed;
            }
        ),

        expand: createEntryPointFunction(
            function(session, unit, expandOptions) {
                var moved = false;
                expandOptions = createOptions(expandOptions, defaultExpandOptions);
                var characterOptions = createCharacterOptions(expandOptions.characterOptions);
                if (!unit) {
                    unit = CHARACTER;
                }
                if (unit == WORD) {
                    var wordOptions = createWordOptions(expandOptions.wordOptions);
                    var startPos = session.getRangeBoundaryPosition(this, true);
                    var endPos = session.getRangeBoundaryPosition(this, false);

                    var startTokenizedTextProvider = createTokenizedTextProvider(startPos, characterOptions, wordOptions);
                    var startToken = startTokenizedTextProvider.nextEndToken();
                    var newStartPos = startToken.chars[0].previousVisible();
                    var endToken, newEndPos;

                    if (this.collapsed) {
                        endToken = startToken;
                    } else {
                        var endTokenizedTextProvider = createTokenizedTextProvider(endPos, characterOptions, wordOptions);
                        endToken = endTokenizedTextProvider.previousStartToken();
                    }
                    newEndPos = endToken.chars[endToken.chars.length - 1];

                    if (!newStartPos.equals(startPos)) {
                        this.setStart(newStartPos.node, newStartPos.offset);
                        moved = true;
                    }
                    if (newEndPos && !newEndPos.equals(endPos)) {
                        this.setEnd(newEndPos.node, newEndPos.offset);
                        moved = true;
                    }

                    if (expandOptions.trim) {
                        if (expandOptions.trimStart) {
                            moved = this.trimStart(characterOptions) || moved;
                        }
                        if (expandOptions.trimEnd) {
                            moved = this.trimEnd(characterOptions) || moved;
                        }
                    }

                    return moved;
                } else {
                    return this.moveEnd(CHARACTER, 1, expandOptions);
                }
            }
        ),

        text: createEntryPointFunction(
            function(session, characterOptions) {
                return this.collapsed ?
                    "" : getRangeCharacters(session, this, createCharacterOptions(characterOptions)).join("");
            }
        ),

        selectCharacters: createEntryPointFunction(
            function(session, containerNode, startIndex, endIndex, characterOptions) {
                var moveOptions = { characterOptions: characterOptions };
                if (!containerNode) {
                    containerNode = getBody( this.getDocument() );
                }
                this.selectNodeContents(containerNode);
                this.collapse(true);
                this.moveStart("character", startIndex, moveOptions);
                this.collapse(true);
                this.moveEnd("character", endIndex - startIndex, moveOptions);
            }
        ),

        // Character indexes are relative to the start of node
        toCharacterRange: createEntryPointFunction(
            function(session, containerNode, characterOptions) {
                if (!containerNode) {
                    containerNode = getBody( this.getDocument() );
                }
                var parent = containerNode.parentNode, nodeIndex = dom.getNodeIndex(containerNode);
                var rangeStartsBeforeNode = (dom.comparePoints(this.startContainer, this.endContainer, parent, nodeIndex) == -1);
                var rangeBetween = this.cloneRange();
                var startIndex, endIndex;
                if (rangeStartsBeforeNode) {
                    rangeBetween.setStartAndEnd(this.startContainer, this.startOffset, parent, nodeIndex);
                    startIndex = -rangeBetween.text(characterOptions).length;
                } else {
                    rangeBetween.setStartAndEnd(parent, nodeIndex, this.startContainer, this.startOffset);
                    startIndex = rangeBetween.text(characterOptions).length;
                }
                endIndex = startIndex + this.text(characterOptions).length;

                return {
                    start: startIndex,
                    end: endIndex
                };
            }
        ),

        findText: createEntryPointFunction(
            function(session, searchTermParam, findOptions) {
                // Set up options
                findOptions = createOptions(findOptions, defaultFindOptions);

                // Create word options if we're matching whole words only
                if (findOptions.wholeWordsOnly) {
                    findOptions.wordOptions = createWordOptions(findOptions.wordOptions);

                    // We don't ever want trailing spaces for search results
                    findOptions.wordOptions.includeTrailingSpace = false;
                }

                var backward = isDirectionBackward(findOptions.direction);

                // Create a range representing the search scope if none was provided
                var searchScopeRange = findOptions.withinRange;
                if (!searchScopeRange) {
                    searchScopeRange = api.createRange();
                    searchScopeRange.selectNodeContents(this.getDocument());
                }

                // Examine and prepare the search term
                var searchTerm = searchTermParam, isRegex = false;
                if (typeof searchTerm == "string") {
                    if (!findOptions.caseSensitive) {
                        searchTerm = searchTerm.toLowerCase();
                    }
                } else {
                    isRegex = true;
                }

                var initialPos = session.getRangeBoundaryPosition(this, !backward);

                // Adjust initial position if it lies outside the search scope
                var comparison = searchScopeRange.comparePoint(initialPos.node, initialPos.offset);

                if (comparison === -1) {
                    initialPos = session.getRangeBoundaryPosition(searchScopeRange, true);
                } else if (comparison === 1) {
                    initialPos = session.getRangeBoundaryPosition(searchScopeRange, false);
                }

                var pos = initialPos;
                var wrappedAround = false;

                // Try to find a match and ignore invalid ones
                var findResult;
                while (true) {
                    findResult = findTextFromPosition(pos, searchTerm, isRegex, searchScopeRange, findOptions);

                    if (findResult) {
                        if (findResult.valid) {
                            this.setStartAndEnd(findResult.startPos.node, findResult.startPos.offset, findResult.endPos.node, findResult.endPos.offset);
                            return true;
                        } else {
                            // We've found a match that is not a whole word, so we carry on searching from the point immediately
                            // after the match
                            pos = backward ? findResult.startPos : findResult.endPos;
                        }
                    } else if (findOptions.wrap && !wrappedAround) {
                        // No result found but we're wrapping around and limiting the scope to the unsearched part of the range
                        searchScopeRange = searchScopeRange.cloneRange();
                        pos = session.getRangeBoundaryPosition(searchScopeRange, !backward);
                        searchScopeRange.setBoundary(initialPos.node, initialPos.offset, backward);
                        wrappedAround = true;
                    } else {
                        // Nothing found and we can't wrap around, so we're done
                        return false;
                    }
                }
            }
        ),

        pasteHtml: function(html) {
            this.deleteContents();
            if (html) {
                var frag = this.createContextualFragment(html);
                var lastChild = frag.lastChild;
                this.insertNode(frag);
                this.collapseAfter(lastChild);
            }
        }
    });

    /*----------------------------------------------------------------------------------------------------------------*/

    // Extensions to the Rangy Selection object

    function createSelectionTrimmer(methodName) {
        return createEntryPointFunction(
            function(session, characterOptions) {
                var trimmed = false;
                this.changeEachRange(function(range) {
                    trimmed = range[methodName](characterOptions) || trimmed;
                });
                return trimmed;
            }
        );
    }

    extend(api.selectionPrototype, {
        expand: createEntryPointFunction(
            function(session, unit, expandOptions) {
                this.changeEachRange(function(range) {
                    range.expand(unit, expandOptions);
                });
            }
        ),

        move: createEntryPointFunction(
            function(session, unit, count, options) {
                var unitsMoved = 0;
                if (this.focusNode) {
                    this.collapse(this.focusNode, this.focusOffset);
                    var range = this.getRangeAt(0);
                    if (!options) {
                        options = {};
                    }
                    options.characterOptions = createCaretCharacterOptions(options.characterOptions);
                    unitsMoved = range.move(unit, count, options);
                    this.setSingleRange(range);
                }
                return unitsMoved;
            }
        ),

        trimStart: createSelectionTrimmer("trimStart"),
        trimEnd: createSelectionTrimmer("trimEnd"),
        trim: createSelectionTrimmer("trim"),

        selectCharacters: createEntryPointFunction(
            function(session, containerNode, startIndex, endIndex, direction, characterOptions) {
                var range = api.createRange(containerNode);
                range.selectCharacters(containerNode, startIndex, endIndex, characterOptions);
                this.setSingleRange(range, direction);
            }
        ),

        saveCharacterRanges: createEntryPointFunction(
            function(session, containerNode, characterOptions) {
                var ranges = this.getAllRanges(), rangeCount = ranges.length;
                var rangeInfos = [];

                var backward = rangeCount == 1 && this.isBackward();

                for (var i = 0, len = ranges.length; i < len; ++i) {
                    rangeInfos[i] = {
                        characterRange: ranges[i].toCharacterRange(containerNode, characterOptions),
                        backward: backward,
                        characterOptions: characterOptions
                    };
                }

                return rangeInfos;
            }
        ),

        restoreCharacterRanges: createEntryPointFunction(
            function(session, containerNode, saved) {
                this.removeAllRanges();
                for (var i = 0, len = saved.length, range, rangeInfo, characterRange; i < len; ++i) {
                    rangeInfo = saved[i];
                    characterRange = rangeInfo.characterRange;
                    range = api.createRange(containerNode);
                    range.selectCharacters(containerNode, characterRange.start, characterRange.end, rangeInfo.characterOptions);
                    this.addRange(range, rangeInfo.backward);
                }
            }
        ),

        text: createEntryPointFunction(
            function(session, characterOptions) {
                var rangeTexts = [];
                for (var i = 0, len = this.rangeCount; i < len; ++i) {
                    rangeTexts[i] = this.getRangeAt(i).text(characterOptions);
                }
                return rangeTexts.join("");
            }
        )
    });

    /*----------------------------------------------------------------------------------------------------------------*/

    // Extensions to the core rangy object

    api.innerText = function(el, characterOptions) {
        var range = api.createRange(el);
        range.selectNodeContents(el);
        var text = range.text(characterOptions);
        range.detach();
        return text;
    };

    api.createWordIterator = function(startNode, startOffset, iteratorOptions) {
        var session = getSession();
        iteratorOptions = createOptions(iteratorOptions, defaultWordIteratorOptions);
        var characterOptions = createCharacterOptions(iteratorOptions.characterOptions);
        var wordOptions = createWordOptions(iteratorOptions.wordOptions);
        var startPos = session.getPosition(startNode, startOffset);
        var tokenizedTextProvider = createTokenizedTextProvider(startPos, characterOptions, wordOptions);
        var backward = isDirectionBackward(iteratorOptions.direction);

        return {
            next: function() {
                return backward ? tokenizedTextProvider.previousStartToken() : tokenizedTextProvider.nextEndToken();
            },

            dispose: function() {
                tokenizedTextProvider.dispose();
                this.next = function() {};
            }
        };
    };

    /*----------------------------------------------------------------------------------------------------------------*/

    api.noMutation = function(func) {
        var session = getSession();
        func(session);
        endSession();
    };

    api.noMutation.createEntryPointFunction = createEntryPointFunction;

    api.textRange = {
        isBlockNode: isBlockNode,
        isCollapsedWhitespaceNode: isCollapsedWhitespaceNode,

        createPosition: createEntryPointFunction(
            function(session, node, offset) {
                return session.getPosition(node, offset);
            }
        )
    };
});
                /* End of file: temp/default/src/dependencies/rangy/rangy-textrange.js */
            
                /* File: temp/default/src/dependencies/jquery-hotkeys.js */
                /*
 * jQuery Hotkeys Plugin
 * Copyright 2010, John Resig
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * @link https://github.com/jeresig/jquery.hotkeys
 *
 * Based upon the plugin by Tzury Bar Yochay:
 * http://github.com/tzuryby/hotkeys
 *
 * Original idea by:
 * Binny V A, http://www.openjs.com/scripts/events/keyboard_shortcuts/
*/

(function(jQuery){

    jQuery.hotkeys = {
        version: "0.8",

        specialKeys: {
            8: "backspace", 9: "tab", 13: "return", 16: "shift", 17: "ctrl", 18: "alt", 19: "pause",
            20: "capslock", 27: "esc", 32: "space", 33: "pageup", 34: "pagedown", 35: "end", 36: "home",
            37: "left", 38: "up", 39: "right", 40: "down", 45: "insert", 46: "del",
            96: "0", 97: "1", 98: "2", 99: "3", 100: "4", 101: "5", 102: "6", 103: "7",
            104: "8", 105: "9", 106: "*", 107: "+", 109: "-", 110: ".", 111 : "/",
            112: "f1", 113: "f2", 114: "f3", 115: "f4", 116: "f5", 117: "f6", 118: "f7", 119: "f8",
            120: "f9", 121: "f10", 122: "f11", 123: "f12", 144: "numlock", 145: "scroll", 191: "/", 224: "meta"
        },

        shiftNums: {
            "`": "~", "1": "!", "2": "@", "3": "#", "4": "$", "5": "%", "6": "^", "7": "&",
            "8": "*", "9": "(", "0": ")", "-": "_", "=": "+", ";": ": ", "'": "\"", ",": "<",
            ".": ">",  "/": "?",  "\\": "|"
        }
    };

    function keyHandler( handleObj ) {
        // Only care when a possible input has been specified
        if ( typeof handleObj.data !== "string" ) {
            return;
        }

        var origHandler = handleObj.handler,
            keys = handleObj.data.toLowerCase().split(" ");

        handleObj.handler = function( event ) {
            // Don't fire in text-accepting inputs that we didn't directly bind to
            if ( this !== event.target && (/textarea|select/i.test( event.target.nodeName ) ||
                 event.target.type === "text") ) {
                return;
            }

            // Keypress represents characters, not special keys
            var special = event.type !== "keypress" && jQuery.hotkeys.specialKeys[ event.which ],
                character = String.fromCharCode( event.which ).toLowerCase(),
                key, modif = "", possible = {};

            // check combinations (alt|ctrl|shift+anything)
            if ( event.altKey && special !== "alt" ) {
                modif += "alt+";
            }

            if ( event.ctrlKey && special !== "ctrl" ) {
                modif += "ctrl+";
            }

            // TODO: Need to make sure this works consistently across platforms
            if ( event.metaKey && !event.ctrlKey && special !== "meta" ) {
                modif += "meta+";
            }

            if ( event.shiftKey && special !== "shift" ) {
                modif += "shift+";
            }

            if ( special ) {
                possible[ modif + special ] = true;

            } else {
                possible[ modif + character ] = true;
                possible[ modif + jQuery.hotkeys.shiftNums[ character ] ] = true;

                // "$" can be triggered as "Shift+4" or "Shift+$" or just "$"
                if ( modif === "shift+" ) {
                    possible[ jQuery.hotkeys.shiftNums[ character ] ] = true;
                }
            }

            for ( var i = 0, l = keys.length; i < l; i++ ) {
                if ( possible[ keys[i] ] ) {
                    return origHandler.apply(this, arguments);
                }
            }
        };
    }

    jQuery.each([ "keydown", "keyup", "keypress" ], function() {
        jQuery.event.special[this] = { add: keyHandler };
    });

})( jQuery );

                /* End of file: temp/default/src/dependencies/jquery-hotkeys.js */
            
                    /* Wrapper. */
                    (function($) {
                
                /* File: temp/default/src/adapters/jquery-ui.js */
                /**
 * @fileOverview jQuery UI helper functions.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */

/**
 * Wrap the jQuery UI button function.
 *
 * @param {Element|Node|selector} element
 * @param {Object|null} options The options relating to the creation of the button.
 * @returns {Element} The modified element.
 */
function aButton(element, options) {
    // <strict/>

    return $(element).button(options);
}

/**
 * Wrap the jQuery UI button's set label function.
 *
 * @param {Element|Node|selector} element
 * @param {String} text The text for the label.
 * @returns {Element} The labelled button.
 */
function aButtonSetLabel(element, text) {
    // <strict/>

    $(element).button('option', 'text', true);
    return $(element).button('option', 'label', text);
}

/**
 * Wrap the jQuery UI button's set icon function.
 *
 * @param {Element|Node|selector} element
 * @param {String} icon The icon name to be added to the button, e.g. 'ui-fa fa-disk'
 * @returns {Element} The modified button.
 */
function aButtonSetIcon(element, icon) {
    // <strict/>

    return $(element).button('option', 'icons', {
        primary: icon
    });
}

/**
 * Wrap the jQuery UI button's enable function.
 *
 * @param {Element|Node|selector} element
 * @returns {Element} The enabled button.
 */
function aButtonEnable(element) {
    // <strict/>

    return $(element).button('option', 'disabled', false);
}

function aButtonIsEnabled(element) {
    return !$(element).is('.ui-state-disabled');
}

/**
 * Wrap the jQuery UI button's disable function.
 *
 * @param {Element|Node|selector} element
 * @returns {Element} The disabled button.
 */
function aButtonDisable(element) {
    // <strict/>

    return $(element).button('option', 'disabled', true);
}

/**
 * Wrap the jQuery UI button's add class function.
 *
 * @param {Element|Node|selector} element
 * @returns {Element} The highlighted button.
 */
function aButtonActive(element) {
    // <strict/>

    return $(element).addClass('ui-state-highlight');
}

/**
 * Wrap the jQuery UI button's remove class function.
 *
 * @param {Element|Node|selector} element
 * @returns {Element} The button back in its normal state.
 */
function aButtonInactive(element) {
    // <strict/>

    return $(element).removeClass('ui-state-highlight');
}

/**
 * Wrap the jQuery UI button's initialise menu function.
 *
 * @param {Element|Node|selector} element
 * @param {Object|null} options The set of options for menu creation.
 * @returns {Element} The menu.
 */
function aMenu(element, options) {
    // <strict/>

    return $(element).menu(options);
}

/**
 * Initialises a dialog with the given element.
 *
 * @param {Element|Node|selector} element
 * @param {Object|null} options The set of options for the menu.
 * @returns {Element} A dialog.
 */
function aDialog(element, options) {
    // <strict/>

    var dialog = $(element).dialog(options);
    // TODO: Remove this when jQuery UI 1.10 is released
    if (typeof options.buttons === 'undefined') {
        return dialog;
    }
    var buttons = dialog.parent().find('.ui-dialog-buttonpane');
    for (var i = 0, l = options.buttons.length; i < l; i++) {
        aButton(buttons.find('button:eq(' + i + ')'), {
            icons: {
                primary: options.buttons[i].icons.primary
            }
        });
    }
    return dialog;
}

/**
 * Wrap the jQuery UI open dialog function.
 *
 * @param {Element|Node|selector} element
 * @returns {Element}
 */
function aDialogOpen(element) {
    // <strict/>

    return $(element).dialog('open');
}

/**
 * Wrap the jQuery UI close dialog function.
 *
 * @param {Element|Node|selector} element
 * @returns {Element}
 */
function aDialogClose(element) {
    // <strict/>

    return $(element).dialog('close');
}

/**
 * Wrap the jQuery UI tabs function.
 *
 * @param  {Element|Node|selector} element
 * @param  {Object|null} options
 * @returns {Element}
 */
function aTabs(element, options) {
    // <strict/>

    return $(element).tabs(options);
}

                /* End of file: temp/default/src/adapters/jquery-ui.js */
            
                /* File: temp/default/src/i18n.js */
                /**
 * @fileOverview Editor internationalization (i18n) private functions and properties.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 */

/**
 * @type String|null
 */
var currentLocale = null;

/**
 * @type Object
 */
var locales = {};

/**
 * @type Object
 */
var localeNames = {};

/**
 *
 * @static
 * @param {String} name
 * @param {String} nativeName
 * @param {Object} strings
 */
function registerLocale(name, nativeName, strings) {
    // <strict/>

    locales[name] = strings;
    localeNames[name] = nativeName;
    if (!currentLocale) {
        currentLocale = name;
    }
}

/**
 * Extends an existing locale.
 *
 * @static
 * @param {String} name
 * @param {Object} strings
 */
function extendLocale(name, strings) {
    for (var key in strings) {
        locales[name][key] = strings[key];
    }
}

/**
 * @param {String} key
 */
function setLocale(key) {
    if (currentLocale !== key) {
        // <debug/>

        currentLocale = key;
        Raptor.eachInstance(function() {
            this.localeChange();
        });
    }
}

/**
 * Return the localised string for the current locale if present, else the
 * localised string for the first available locale, failing that return the
 * string.
 *
 * @param  {string} string
 * @param  {Boolean} allowMissing If true and the localized string is missing, false is returned.
 * @return {string|false}
 */
function getLocalizedString(string, allowMissing) {
    if (typeof locales[currentLocale] !== 'undefined' &&
            typeof locales[currentLocale][string] !== 'undefined') {
        return locales[currentLocale][string];
    }

    for (var localeName in localeNames) {
        if (typeof locales[localeName][string] !== 'undefined') {
            return locales[localeName][string];
        }
    }

    if (allowMissing) {
        return false;
    }

    // <debug/>
    return string;
}

/**
 * Internationalisation function. Translates a string with tagged variable
 * references to the current locale.
 *
 * <p>
 * Variable references should be surrounded with double curly braces {{ }}
 *      e.g. "This string has a variable: {{my.variable}} which will not be translated"
 * </p>
 *
 * @static
 * @param {String} string
 * @param {Object|false} variables If false, then no string is returned by default.
 */
function _(string, variables) {
    // Get the current locale translated string
    string = getLocalizedString(string, variables === false);
    if (string === false) {
        return false;
    }

    // Convert the variables
    if (!variables) {
        return string;
    } else {
        for (var key in variables) {
            string = string.replace('{{' + key + '}}', variables[key]);
        }
        return string;
    }
}

                /* End of file: temp/default/src/i18n.js */
            
                /* File: temp/default/src/locales/en.js */
                /**
 * @fileOverview English strings file.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 */
registerLocale('en', 'English', {
    alignCenterTitle: 'Align text center',
    alignJustifyTitle: 'Align text justify',
    alignLeftTitle: 'Align text left',
    alignRightTitle: 'Align text right',

    cancelDialogCancelButton: 'Continue Editing',
    cancelDialogContent: 'Are you sure you want to cancel editing? All changes will be lost!',
    cancelDialogOKButton: 'Cancel Editing',
    cancelDialogTitle: 'Cancel Editing',
    cancelTitle: 'Cancel editing',

    classMenuTitle: 'Style picker',
    clearFormattingTitle: 'Clear formatting',
    clickButtonToEditText: 'Edit',
    clickButtonToEditTitle: null,

    colorMenuBasicAutomatic: 'Automatic',
    colorMenuBasicBlack: 'Black',
    colorMenuBasicBlue: 'Blue',
    colorMenuBasicGreen: 'Green',
    colorMenuBasicGrey: 'Grey',
    colorMenuBasicOrange: 'Orange',
    colorMenuBasicPurple: 'Purple',
    colorMenuBasicRed: 'Red',
    colorMenuBasicTitle: 'Change text color',
    colorMenuBasicWhite: 'White',

    dockToElementTitle: 'Dock editor to element',
    dockToScreenTitle: 'Dock editor to screen',

    embedTitle: 'Embed object',
    embedDialogTitle: 'Embed Object',
    embedDialogTabCode: 'Embed Code',
    embedDialogTabCodeContent: 'Paste your embed code into the text area below:',
    embedDialogTabPreview: 'Preview',
    embedDialogTabPreviewContent: 'A preview of your embedded object is displayed below:',
    embedDialogOKButton: 'Embed Object',
    embedDialogCancelButton: 'Cancel',

    errorUINoName: 'UI "{{ui}}" is invalid (must have a name property)',
    errorUINotObject: 'UI "{{ui}}" is invalid (must be an object)',
    errorUIOverride: 'UI "{{name}}" has already been registered, and will be overwritten',

    floatLeftTitle: 'Align image to the left',
    floatNoneTitle: 'Remove image align',
    floatRightTitle: 'Align image to the right',

    guidesTitle: 'Show element guides',

    historyRedoTitle: 'Redo',
    historyUndoTitle: 'Undo',

    hrCreateTitle: 'Insert Horizontal Rule',

    imageResizeButtonText: 'Resize Image',
    imageResizeButtonDialogWidth: 'Image width',
    imageResizeButtonDialogHeight: 'Image height',
    imageResizeButtonDialogWidthPlaceHolder: 'Width',
    imageResizeButtonDialogHeightPlaceHolder: 'Height',
    imageResizeButtonDialogTitle: 'Resize Image',
    imageResizeButtonDialogOKButton: 'Resize',
    imageResizeButtonDialogCancelButton: 'Cancel',

    insertFileTitle: 'Insert file',
    insertFileDialogOKButton: 'Insert file',
    insertFileDialogCancelButton: 'Cancel',
    insertFileURLLabel: 'File URL',
    insertFileNameLabel: 'File Name',
    insertFileURLPlaceHolder: 'File URL...',
    insertFileNamePlaceHolder: 'File Name...',

    languageMenuTitle: 'Change Language',
    languageMenuEN: 'English',
    languageMenuDE: 'German',
    languageMenuES: 'Spanish',
    languageMenuFR: 'French',
    languageMenuNL: 'Dutch',
    languageMenuRU: 'Russian',
    languageMenuSV: 'Swedish',
    languageMenuZHCN: 'Simplified Chinese',

    listOrderedTitle: 'Ordered list',
    listUnorderedTitle: 'Unordered list',

    linkCreateTitle: 'Insert Link',
    linkRemoveTitle: 'Remove Link',

    linkCreateDialogTitle: 'Insert Link',
    linkCreateDialogOKButton: 'Insert Link',
    linkCreateDialogCancelButton: 'Cancel',
    linkCreateDialogMenuHeader: 'Choose a link type',

    linkTypeEmailLabel: 'Email address',
    linkTypeEmailHeader: 'Link to an email address',
    linkTypeEmailToLabel: 'Email:',
    linkTypeEmailToPlaceHolder: 'Enter email address',
    linkTypeEmailSubjectLabel: 'Subject (optional):',
    linkTypeEmailSubjectPlaceHolder: 'Enter subject',

    linkTypeExternalLabel: 'Page on another website',
    linkTypeExternalHeader: 'Link to a page on another website',
    linkTypeExternalLocationLabel: 'Location:',
    linkTypeExternalLocationPlaceHolder: 'Enter a URL',
    linkTypeExternalNewWindowHeader: 'New window',
    linkTypeExternalNewWindowLabel: 'Check this box to have the link open in a new browser window/tab.',
    linkTypeExternalInfo:
        '<h2>Not sure what to put in the box above?</h2>' +
        '<ol>' +
        '    <li>Find the page on the web you want to link to.</li>' +
        '    <li>Copy the web address from your browser\'s address bar and paste it into the box above.</li>' +
        '</ol>',

    linkTypeDocumentLabel: 'Document or other file',
    linkTypeDocumentHeader: 'Link to a document or other file',
    linkTypeDocumentLocationLabel: 'Location:',
    linkTypeDocumentLocationPlaceHolder: 'Enter a URL',
    linkTypeDocumentNewWindowHeader: 'New window',
    linkTypeDocumentNewWindowLabel: 'Check this box to have the file open in a new browser window/tab.',
    linkTypeDocumentInfo:
        '<h2>Not sure what to put in the box above?</h2>' +
        '<ol>' +
        '    <li>Ensure the file has been uploaded to your website.</li>' +
        '    <li>Open the uploaded file in your browser.</li>' +
        '    <li>Copy the file\'s URL from your browser\'s address bar and paste it into the box above.</li>' +
        '</ol>',

    linkTypeInternalLabel: 'Page on this website',
    linkTypeInternalHeader: 'Link to a page on this website',
    linkTypeInternalLocationLabel: '',
    linkTypeInternalLocationPlaceHolder: 'Enter a URI',
    linkTypeInternalNewWindowHeader: 'New window',
    linkTypeInternalNewWindowLabel: 'Check this box to have the link open in a new browser window/tab.',
    linkTypeInternalInfo:
        '<h2>Not sure what to put in the box above?</h2>' +
        '<ol>' +
        '    <li>Find the page on this site link to.</li>' +
        '    <li>Copy the web address from your browser\'s address bar, excluding "{{domain}}" and paste it into the box above.</li>' +
        '</ol>',

    logoTitle: 'Learn More About the Raptor WYSIWYG Editor',

    navigateAway: '\nThere are unsaved changes on this page. \nIf you navigate away from this page you will lose your unsaved changes',

    pasteDialogTitle: 'Paste',
    pasteDialogOKButton: 'Insert',
    pasteDialogCancelButton: 'Cancel',
    pasteDialogPlain: 'Plain Text',
    pasteDialogFormattedCleaned: 'Formatted &amp; Cleaned',
    pasteDialogFormattedUnclean: 'Formatted Unclean',
    pasteDialogSource: 'Source Code',

    placeholderPluginDefaultContent: '&nbsp;',

    saveTitle: 'Save content',
    saveJsonFail: 'Failed to save {{failed}} content block(s)',
    saveJsonSaved: 'Successfully saved {{saved}} content block(s).',
    saveRestFail: 'Failed to save {{failed}} content block(s).',
    saveRestPartial: 'Saved {{saved}} out of {{failed}} content blocks.',
    saveRestSaved: 'Successfully saved {{saved}} content block(s).',

    snippetMenuTitle: 'Snippets',

    specialCharactersDialogOKButton: 'OK',
    specialCharactersDialogTitle: 'Insert Special Characters',
    specialCharactersHelp: 'Click a special character to add it. Click "OK" when done to close this dialog',
    specialCharactersTitle: 'Insert a special character',

    statisticsButtonCharacterOverLimit: '{{charactersRemaining}} characters over limit',
    statisticsButtonCharacterRemaining: '{{charactersRemaining}} characters remaining',
    statisticsButtonCharacters: '{{characters}} characters',
    statisticsDialogCharactersOverLimit: '{{characters}} characters, {{charactersRemaining}} over the recommended limit',
    statisticsDialogCharactersRemaining: '{{characters}} characters, {{charactersRemaining}} remaining',
    statisticsDialogNotTruncated: 'Content will not be truncated',
    statisticsDialogOKButton: 'Ok',
    statisticsDialogSentence: '{{sentences}} sentence',
    statisticsDialogSentences: '{{sentences}} sentences',
    statisticsDialogTitle: 'Content Statistics',
    statisticsDialogTruncated: 'Content contains more than {{limit}} characters and may be truncated',
    statisticsDialogWord: '{{words}} word',
    statisticsDialogWords: '{{words}} words',
    statisticsTitle: 'Click to view statistics',

    tableCreateTitle: 'Create table',
    tableDeleteColumnTitle: 'Delete table column',
    tableDeleteRowTitle: 'Delete table row',
    tableInsertColumnTitle: 'Insert table column',
    tableInsertRowTitle: 'Insert table row',
    tableMergeCellsTitle: 'Merge table cells',
    tableSplitCellsTitle: 'Split table cells',

    tagMenuTagH1: 'Heading&nbsp;1',
    tagMenuTagH2: 'Heading&nbsp;2',
    tagMenuTagH3: 'Heading&nbsp;3',
    tagMenuTagH4: 'Heading&nbsp;4',
    tagMenuTagNA: 'N/A',
    tagMenuTagP: 'Paragraph',
    tagMenuTagDiv: 'Div',
    tagMenuTagPre: 'Pre-formatted',
    tagMenuTagAddress: 'Address',
    tagMenuTitle: 'Change element style',

    tagTreeElementLink: 'Select {{element}} element',
    tagTreeElementTitle: 'Click to select the contents of the "{{element}}" element',
    tagTreeRoot: 'root',
    tagTreeRootLink: 'Select all editable content',
    tagTreeRootTitle: 'Click to select all editable content',

    textBlockQuoteTitle: 'Block quote',
    textBoldTitle: 'Bold',
    textItalicTitle: 'Italic',
    textStrikeTitle: 'Strike through',
    textSubTitle: 'Sub-script',
    textSuperTitle: 'Super-script',
    textUnderlineTitle: 'Underline',
    textSizeDecreaseTitle: 'Decrease text size',
    textSizeIncreaseTitle: 'Increase text size',

    unsavedEditWarningText: 'There are unsaved changes on this page',

    revisionsText: 'Revisions',
    revisionsTextEmpty: 'No Revisions',
    revisionsTitle: null,
    revisionsApplyButtonTitle: 'Rollback',
    revisionsAJAXFailed: 'Failed to retrieve revisions',
    revisionsApplyButtonDialogCancelButton: 'Cancel',
    revisionsApplyButtonDialogOKButton: 'Rollback',
    revisionsApplyButtonDialogTitle: 'Rollback Confirmation',
    revisionsApplyDialogContent: 'This will replace the current content with the selected revision.<br/>The current content will be added as a revision, and will be visible in the revisions list for this block.',
    revisionsDialogCancelButton: 'Cancel',
    revisionsDialogTitle: 'View content revisions',
    revisionsButtonCurrent: 'Current',
    revisionsButtonViewDiffText: 'Differences',
    revisionsButtonViewDiffTitle: null,
    revisionsDiffButtonDialogCancelButton: 'Close',
    revisionsDiffButtonDialogTitle: 'View differences',
    revisionsDiffButtonTitle: 'View differences',
    revisionsLoading: 'Loading revisions...',
    revisionsNone: 'No revisions for this element',
    revisionsPreviewButtonTitle: 'Preview',

    viewSourceDialogCancelButton: 'Close',
    viewSourceDialogOKButton: 'Apply source code',
    viewSourceDialogTitle: 'Content source code',
    viewSourceTitle: 'View/edit source code'

});

                /* End of file: temp/default/src/locales/en.js */
            
                /* File: temp/default/src/init.js */
                // <debug/>


// <strict/>


$(function() {
    // Initialise rangy
    if (!rangy.initialized) {
        rangy.init();
    }

    // Add helper method to rangy
    if (!$.isFunction(rangy.rangePrototype.insertNodeAtEnd)) {
        rangy.rangePrototype.insertNodeAtEnd = function(node) {
            var range = this.cloneRange();
            range.collapse(false);
            range.insertNode(node);
            range.detach();
            this.setEndAfter(node);
        };
    }
});

// Select menu close event (triggered when clicked off)
$('html').click(function(event) {
    $('.ui-editor-selectmenu-visible')
        .removeClass('ui-editor-selectmenu-visible');
});

                /* End of file: temp/default/src/init.js */
            
                /* File: temp/default/src/support.js */
                var supported, ios, hotkeys, firefox, ie;

function isSupported() {
    if (supported === undefined) {
        supported = true;

        // <ios>
        ios = /(iPhone|iPod|iPad).*AppleWebKit/i.test(navigator.userAgent);
        if (ios) {
            $('html').addClass('raptor-ios');

            // Fixed position hack
            if (ios) {
                $(document).bind('scroll', function(){
                    setInterval(function() {
                        $('body').css('height', '+=1').css('height', '-=1');
                    }, 0);
                });
            }
        }
        // </ios>

        firefox = /Firefox/i.test(navigator.userAgent);
        if (firefox) {
            $('html').addClass('raptor-ff');
        }

        // <ie>
        /**
         * Returns the version of Internet Explorer or a -1 (indicating the use of another browser).
         * http://obvcode.blogspot.co.nz/2007/11/easiest-way-to-check-ie-version-with.html
         */
        var ieVersion = (function() {
            var version = -1;
            if (navigator.appVersion.indexOf("MSIE") != -1) {
                version = parseFloat(navigator.appVersion.split("MSIE")[1]);
            }
            return version;
        })();

        ie = ieVersion !== -1;
        if (ie && ieVersion < 9) {
            supported = false;

            // Create message modal
            $(function() {
                var message = $('<div/>')
                    .addClass('raptor-unsupported')
                    .html(
                        '<div class="raptor-unsupported-overlay"></div>' +
                        '<div class="raptor-unsupported-content">' +
                        '    It has been detected that you a using a browser that is not supported by Raptor, please' +
                        '    use one of the following browsers:' +
                        '    <ul>' +
                        '        <li><a href="http://www.google.com/chrome">Google Chrome</a></li>' +
                        '        <li><a href="http://www.firefox.com">Mozilla Firefox</a></li>' +
                        '        <li><a href="http://www.google.com/chromeframe">Internet Explorer with Chrome Frame</a></li>' +
                        '    </ul>' +
                        '    <div class="raptor-unsupported-input">' +
                        '        <button class="raptor-unsupported-close">Close</button>' +
                        '        <input name="raptor-unsupported-show" type="checkbox" />' +
                        '        <label>Don\'t show this message again</label>' +
                        '    </div>' +
                        '<div>'
                    )
                    .appendTo('body');

                /**
                 * Sets the z-index CSS property on an element to 1 above all its sibling elements.
                 *
                 * @param {jQuery} element The jQuery element to have it's z index increased.
                 */
                var elementBringToTop = function(element) {
                    var zIndex = 1;
                    element.siblings().each(function() {
                        var z = $(this).css('z-index');
                        if (!isNaN(z) && z > zIndex) {
                            zIndex = z + 1;
                        }
                    });
                    element.css('z-index', zIndex);
                }
                elementBringToTop(message);

                // Close event
                message.find('.raptor-unsupported-close').click(function() {
                    message.remove();
                });
            });
        }
        // </ie>

        hotkeys = jQuery.hotkeys !== undefined;
    }
    return supported;
}

// <ie>

/**
 * Object.create polyfill
 * https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object/create
 */
if (!Object.create) {
    Object.create = function (o) {
        if (arguments.length > 1) {
            throw new Error('Object.create implementation only accepts the first parameter.');
        }
        function F() {}
        F.prototype = o;
        return new F();
    };
}

/**
 * Node.TEXT_NODE polyfill
 */
if (typeof Node === 'undefined') {
    Node = {
        TEXT_NODE: 3
    };
}

/**
 * String.trim polyfill
 * https://gist.github.com/eliperelman/1035982
 */
''.trim || (String.prototype.trim = // Use the native method if available, otherwise define a polyfill:
    function () { // trim returns a new string (which replace supports)
        return this.replace(/^[\s\uFEFF]+|[\s\uFEFF]+$/g,'') // trim the left and right sides of the string
    })

// </ie>

// <strict/>
                /* End of file: temp/default/src/support.js */
            
                /* File: temp/default/src/tools/action.js */
                /**
 * @fileOverview Action helper functions.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */

/**
 * Previews an action on an element.
 * @todo check descriptions for accuracy
 * @param {Object} previewState The saved state of the target.
 * @param {jQuery} target Element to have the preview applied to it.
 * @param {function} action The action to be previewed.
 * @returns {Object} ??
 */
function actionPreview(previewState, target, action) {
    // <strict/>

    actionPreviewRestore(previewState, target);

    previewState = stateSave(target);
    action();
    rangy.getSelection().removeAllRanges();
    return previewState;
}

/**
 * Changes an element back to its saved state and returns that element.
 * @todo check descriptions please.
 * @param {Object} previewState The previously saved state of the target.
 * @param {jQuery} target The element to have it's state restored.
 * @returns {jQuery} The restored target.
 */
function actionPreviewRestore(previewState, target) {
    if (previewState) {
        var state = stateRestore(target, previewState);
        if (state.ranges) {
            rangy.getSelection().setRanges(state.ranges);
        }
        return state.element;
    }
    return target;
}

/**
 * Applies an action.
 * @todo types for params
 * @param {type} action The action to apply.
 * @param {type} history
 */
function actionApply(action, history) {
    action();
}

/**
 * Undoes an action.
 *
 * @returns {undefined}
 */
function actionUndo() {

}

/**
 * Redoes an action.
 *
 * @returns {undefined}
 */
function actionRedo() {

}

                /* End of file: temp/default/src/tools/action.js */
            
                /* File: temp/default/src/tools/clean.js */
                /**
 * @fileOverview Cleaning helper functions.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen - david@panmedia.co.nz
 * @author Michael Robinson - michael@panmedia.co.nz
 */

/**
 * Replaces elements in another elements. E.g.
 *
 * @example
 * cleanReplaceElements('.content', {
 *     'b': '<strong/>',
 *     'i': '<em/>',
 * });
 *
 * @param  {jQuery|Element|Selector} selector The element to be find and replace in.
 * @param  {Object} replacements A map of selectors to replacements. The replacement
 *   can be a jQuery object, an element, or a selector.
 */
function cleanReplaceElements(selector, replacements) {
    for (var find in replacements) {
        var replacement = replacements[find];
        var i = 0;
        var found = false;
        do {
            found = $(selector).find(find);
            if (found.length) {
                found = $(found.get(0));
                var clone = $(replacement).clone();
                clone.html(found.html());
                clone.attr(elementGetAttributes(found));
                found.replaceWith(clone);
            }
        } while(found.length);
    }
}

/**
 * Unwrap function. Currently just wraps jQuery.unwrap() but may be extended in future.
 *
 * @param  {jQuery|Element|Selector} selector The element to unwrap.
 */
function cleanUnwrapElements(selector) {
    $(selector).unwrap();
}

/**
 * Takes a supplied element and removes all of the empty attributes from it.
 *
 * @param {jQuery} element This is the element to remove all the empty attributes from.
 * @param {array} attributes This is an array of the elements attributes.
 */
function cleanEmptyAttributes(element, attributes) {
    // <strict/>

    for (i = 0; i < attributes.length; i++) {
        if (!$.trim(element.attr(attributes[i]))) {
            element.removeAttr(attributes[i]);
        }
        element
            .find('[' + attributes[i] + ']')
            .filter(function() {
                return $.trim($(this).attr(attributes[i])) === '';
            }).removeAttr(attributes[i]);
    }
}


/**
 * Remove comments from element.
 *
 * @param  {jQuery} parent The jQuery element to have comments removed from.
 * @return {jQuery} The modified parent.
 */
function cleanRemoveComments(parent) {
    // <strict/>

    parent.contents().each(function() {
        if (this.nodeType == Node.COMMENT_NODE) {
            $(this).remove();
        }
    });
    parent.children().each(function() {
        cleanRemoveComments($(this));
    });
    return parent;
}


/**
 * Removed empty elements whose tag name matches the list of supplied tags.
 *
 * @param  {jQuery} parent The jQuery element to have empty element removed from.
 * @param  {String[]} tags The list of tags to clean.
 * @return {jQuery} The modified parent.
 */
function cleanEmptyElements(parent, tags) {
    // <strict/>
    var found;
    // Need to loop incase removing an empty element, leaves another one.
    do {
        found = false;
        parent.find(tags.join(',')).each(function() {
            if ($.trim($(this).html()) === '') {
                $(this).remove();
                found = true;
            }
        });
    } while (found);
    return parent;
}

/**
 * Wraps any text nodes in the node with the supplied tag. This does not scan child elements.
 *
 * @param  {Node} node
 * @param  {String} tag The tag to use from wrapping the text nodes.
 */
function cleanWrapTextNodes(node, tag) {
    // <strict/>

    var textNodes = nodeFindTextNodes(node);
    for (var i = 0, l = textNodes.length; i < l; i++) {
        var clone = textNodes[i].cloneNode(),
            wrapper = document.createElement(tag);
        wrapper.appendChild(clone);
        node.insertBefore(wrapper, textNodes[i]);
        node.removeChild(textNodes[i]);
    }
}

function cleanUnnestElement(element, selector) {
    var found;
    do {
        found = false;
        $(element).find(selector).each(function() {
            if ($(this).parent().is(selector)) {
                $(this).unwrap();
                found = true;
            }
        });
    } while (found);

}

/**
 * Generic clean function to remove misc elements.
 *
 * @param  {jQuery} element
 */
function clean(element) {
    $(element).find('.rangySelectionBoundary').remove();
}

                /* End of file: temp/default/src/tools/clean.js */
            
                /* File: temp/default/src/tools/dock.js */
                /**
 * @fileOverview Docking to screen and element helper functions.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */

/**
 * Docks a specified element to the screen.
 *
 * @param {jQuery} element The element to dock.
 * @param {string} options Any options to further specify the docking state.
 * @returns {Object} An object containing the docked element, a spacer div and the style state.
 */
function dockToScreen(element, options) {
    var position,
        spacer = $('<div>')
            .addClass('spacer');
    if (options.position === 'top') {
        position = {
            position: 'fixed',
            top: options.under ? $(options.under).outerHeight() : 0,
            left: 0,
            right: 0
        };
        if (options.spacer) {
            if (options.under) {
                spacer.insertAfter(options.under);
            } else {
                spacer.prependTo('body');
            }
        }
    } else if (options.position === 'topLeft') {
        position = {
            position: 'fixed',
            top: options.under ? $(options.under).outerHeight() : 0,
            left: 0
        };
        if (options.spacer) {
            if (options.under) {
                spacer.insertAfter(options.under);
            } else {
                spacer.prependTo('body');
            }
        }
    } else if (options.position === 'topRight') {
        position = {
            position: 'fixed',
            top: options.under ? $(options.under).outerHeight() : 0,
            right: 0
        };
        if (options.spacer) {
            if (options.under) {
                spacer.insertAfter(options.under);
            } else {
                spacer.prependTo('body');
            }
        }
    } else if (options.position === 'bottom') {
        position = {
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0
        };
        if (options.spacer) {
            spacer.appendTo('body');
        }
    } else if (options.position === 'bottomLeft') {
        position = {
            position: 'fixed',
            bottom: 0,
            left: 0
        };
        if (options.spacer) {
            spacer.appendTo('body');
        }
    } else if (options.position === 'bottomRight') {
        position = {
            position: 'fixed',
            bottom: 0,
            right: 0
        };
        if (options.spacer) {
            spacer.appendTo('body');
        }
    }
    var styleState = styleSwapState(element, position);
    spacer.css('height', element.outerHeight());
    return {
        dockedElement: element,
        spacer: spacer,
        styleState: styleState
    };
}

/**
 * Undocks a docked element from the screen.
 * @todo not sure of description for dockState
 * @param {jQuery} dockState
 * @returns {unresolved}
 */
function undockFromScreen(dockState) {
    styleRestoreState(dockState.dockedElement, dockState.styleState);
    dockState.spacer.remove();
    return dockState.dockedElement.detach();
}

/**
 * Docks an element to a another element.
 *
 * @param {jQuery} elementToDock This is the element to be docked.
 * @param {jQuery} dockTo This is the element to which the elementToDock will be docked to.
 * @param {string} options These are any options to refine the docking position.
 * @returns {Object} An object containing the docked element, what it has been docked to, and their style states.
 */
function dockToElement(elementToDock, dockTo, options) {
    var wrapper = dockTo
            .wrap('<div>')
            .parent(),
        innerStyleState = styleSwapWithWrapper(wrapper, dockTo, {
            'float': 'none',
            display: 'block',
            clear: 'none',
            position: 'static',

            /* Margin */
            margin: 0,
            marginLeft: 0,
            marginRight: 0,
            marginTop: 0,
            marginBottom: 0,

            /* Padding */
            padding: 0,
            paddingLeft: 0,
            paddingRight: 0,
            paddingTop: 0,
            paddingBottom: 0,

            outline: 0,
            width: 'auto',
            border: 'none'
        }),
        dockedElementStyleState = styleSwapState(elementToDock, {
            position: 'static'
        });
    wrapper
        .prepend(elementToDock)
        .addClass(options.wrapperClass ? options.wrapperClass : '');
    return {
        dockedElement: elementToDock,
        dockedTo: dockTo,
        innerStyleState: innerStyleState,
        dockedElementStyleState: dockedElementStyleState
    };
}

/**
 * Undocks an element from the screen.
 *@todo not sure of description for dockState
 * @param {jQuery} dockState
 * @returns {Object} The undocked element.
 */
function undockFromElement(dockState) {
    styleRestoreState(dockState.dockedTo, dockState.innerStyleState);
    styleRestoreState(dockState.dockedElement, dockState.dockedElementStyleState);
    var dockedElement = dockState.dockedElement.detach();
    dockState.dockedTo.unwrap();
    return dockedElement;
}

                /* End of file: temp/default/src/tools/dock.js */
            
                /* File: temp/default/src/tools/element.js */
                /**
 * @fileOverview Element manipulation helper functions.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */

/**
 * Remove all but the allowed attributes from the parent.
 *
 * @param {jQuery} parent The jQuery element to cleanse of attributes.
 * @param {String[]|null} allowedAttributes An array of allowed attributes.
 * @return {jQuery} The modified parent.
 */
function elementRemoveAttributes(parent, allowedAttributes) {
    parent.children().each(function() {
        var stripAttributes = $.map(this.attributes, function(item) {
            if ($.inArray(item.name, allowedAttributes) === -1) {
                return item.name;
            }
        });
        var child = $(this);
        $.each(stripAttributes, function(i, attributeName) {
            child.removeAttr(attributeName);
        });
        element.removeAttributes($(this), allowedAttributes);
    });
    return parent;
}

/**
 * Sets the z-index CSS property on an element to 1 above all its sibling elements.
 *
 * @param {jQuery} element The jQuery element to have it's z index increased.
 */
function elementBringToTop(element) {
    var zIndex = 1;
    element.siblings().each(function() {
        var z = $(this).css('z-index');
        if (!isNaN(z) && z > zIndex) {
            zIndex = z + 1;
        }
    });
    element.css('z-index', zIndex);
}

/**
 * Retrieve outer html from an element.
 *
 * @param  {jQuery} element The jQuery element to retrieve the outer HTML from.
 * @return {String} The outer HTML.
 */
function elementOuterHtml(element) {
    return element.clone().wrap('<div/>').parent().html();
}

/**
 * Retrieve outer text from an element.
 *
 * @param  {jQuery} element The jQuery element to retrieve the outer text from.
 * @return {String} The outer text.
 */
function elementOuterText(element) {
    return element.clone().wrap('<div/>').parent().text();
}

/**
 * Determine whether element is block.
 *
 * @param  {Element} element The element to test.
 * @return {Boolean} True if the element is a block element
 */
function elementIsBlock(element) {
    return elementDefaultDisplay(element.tagName) === 'block';
}

/**
 * Determine whether element contains a block element.
 *
 * @param  {Element} element
 * @return {Boolean} True if the element contains a block element, false otherwise.
 */
function elementContainsBlockElement(element) {
    var containsBlock = false;
    element.contents().each(function() {
        if (!typeIsTextNode(this) && elementIsBlock(this)) {
            containsBlock = true;
            return;
        }
    });
    return containsBlock;
}

/**
 * Determine whether element is inline or block.
 *
 * @see http://stackoverflow.com/a/2881008/187954
 * @param  {string} tag Lower case tag name, e.g. 'a'.
 * @return {string} Default display style for tag.
 */
function elementDefaultDisplay(tag) {
    var cStyle,
        t = document.createElement(tag),
        gcs = "getComputedStyle" in window;

    document.body.appendChild(t);
    cStyle = (gcs ? window.getComputedStyle(t, "") : t.currentStyle).display;
    document.body.removeChild(t);

    return cStyle;
}

/**
 * Check that the given element is one of the the given tags.
 *
 * @param  {jQuery|Element} element The element to be tested.
 * @param  {Array}  validTags An array of valid tag names.
 * @return {Boolean} True if the given element is one of the give valid tags.
 */
function elementIsValid(element, validTags) {
    return -1 !== $.inArray($(element)[0].tagName.toLowerCase(), validTags);
}

/**
 * According to the given array of valid tags, find and return the first invalid
 * element of a valid parent. Recursively search parents until the wrapper is
 * encountered.
 *
 * @param  {Node} element
 * @param  {string[]} validTags
 * @param  {Element} wrapper
 * @return {Node}           [description]
 */
function elementFirstInvalidElementOfValidParent(element, validTags, wrapper) {
    // <strict/>
    var parent = element.parentNode;
    if (parent[0] === wrapper[0]) {
        // <strict/>
        return element;
    }
    if (elementIsValid(parent, validTags)) {
        return element;
    }
    return elementFirstInvalidElementOfValidParent(parent, validTags, wrapper);
}

/**
 * Calculate and return the visible rectangle for the element.
 *
 * @param  {jQuery|Element} element The element to calculate the visible rectangle for.
 * @return {Object} Visible rectangle for the element.
 */
function elementVisibleRect(element) {

    element = $(element);

    var rect = {
        top: Math.round(element.offset().top),
        left: Math.round(element.offset().left),
        width: Math.round(element.outerWidth()),
        height: Math.round(element.outerHeight())
    };


    var scrollTop = $(window).scrollTop();
    var windowHeight = $(window).height();
    var scrollBottom = scrollTop + windowHeight;
    var elementBottom = Math.round(rect.height + rect.top);

    // If top & bottom of element are within the viewport, do nothing.
    if (scrollTop < rect.top && scrollBottom > elementBottom) {
        return rect;
    }

    // Top of element is outside the viewport
    if (scrollTop > rect.top) {
        rect.top = scrollTop;
    }

    // Bottom of element is outside the viewport
    if (scrollBottom < elementBottom) {
        rect.height = scrollBottom - rect.top;
    } else {
        // Bottom of element inside viewport
        rect.height = windowHeight - (scrollBottom - elementBottom);
    }

    return rect;
}

/**
 * Returns a map of an elements attributes and values. The result of this function
 * can be passed directly to $('...').attr(result);
 *
 * @param  {jQuery|Element|Selector} element The element to get the attributes from.
 * @return {Object} A map of attribute names mapped to their values.
 */
function elementGetAttributes(element) {
    var attributes = $(element).get(0).attributes,
        result = {};
    for (var i = 0, l = attributes.length; i < l; i++) {
        result[attributes[i].name] = attributes[i].value;
    }
    return result;
}

/**
 * Gets the styles of an element.
 * @todo the type for result.
 * FIXME: this function needs reviewing.
 * @param {jQuerySelector|jQuery|Element} element This is the element to get the style from.
 * @returns {unresolved} The style(s) of the element.
 */
function elementGetStyles(element) {
    var result = {};
    var style = window.getComputedStyle(element[0], null);
    for (var i = 0; i < style.length; i++) {
        result[style.item(i)] = style.getPropertyValue(style.item(i));
    }
    return result;
}

/**
 * Wraps the inner content of an element with a tag.
 *
 * @param {jQuerySelector|jQuery|Element} element The element(s) to wrap.
 * @param {String} tag The wrapper tag name
 * @returns {jQuery} The wrapped element.
 */
function elementWrapInner(element, tag) {
    var result = new jQuery();
    selectionSave();
    for (var i = 0, l = element.length; i < l; i++) {
        var wrapper = $('<' + tag + '/>').html($(element[i]).html());
        element.html(wrapper);
        result.push(wrapper[0]);
    }
    selectionRestore();
    return result;
}

/**
 * Toggles the styles of an element.
 *
 * FIXME: this function needs reviewing
 * @public @static
 * @param {jQuerySelector|jQuery|Element} element The jQuery element to have it's style changed.
 * @param {type} styles The styles to add or remove from the element.
 * @returns {undefined}
 */
function elementToggleStyle(element, styles) {
    $.each(styles, function(property, value) {
        if ($(element).css(property) === value) {
            $(element).css(property, '');
        } else {
            $(element).css(property, value);
        }
    });
}

/**
 * Swaps the styles of two elements.
 *
 * @param {jQuery|Element} element1 The element for element 2 to get its styles from.
 * @param {jQuery|Element} element2 The element for element 1 to get its styles from.
 * @param {Object} style The style to be swapped between the two elements.
 */
function elementSwapStyles(element1, element2, style) {
    for (var name in style) {
        element1.css(name, element2.css(name));
        element2.css(name, style[name]);
    }
}

/**
 * Checks if an element is empty.
 *
 * @param {Element} element The element to be checked.
 * @returns {Boolean} Returns true if element is empty.
 */
function elementIsEmpty(element) {
    // <strict/>
    
    // Images and elements containing images are not empty
    if (element.is('img') || element.find('img').length) {
        return false;
    }
    if ((/&nbsp;/).test(element.html())) {
        return false;
    }
    return element.text() === '';
}

/**
 * Positions an element underneath another element.
 *
 * @param {jQuery} element Element to position.
 * @param {jQuery} under Element to position under.
 */
function elementPositionUnder(element, under) {
    var pos = $(under).offset(),
        height = $(under).outerHeight();
    $(element).css({
        top: (pos.top + height - $(window).scrollTop()) + 'px',
        left: pos.left + 'px'
    });
}

/**
 * Removes the element from the DOM to manipulate it using a function passed to the method, then replaces it back to it's origional position.
 *
 * @todo desc and type for manip
 * @param {jQuery|Element} element The element to be manipulated.
 * @param {type} manip A function used to manipulate the element i think.
 */
function elementDetachedManip(element, manip) {
    var parent = $(element).parent();
    $(element).detach();
    manip(element);
    parent.append(element);
}

/**
 * Finds the closest parent, up to a limit element, to the supplied element that is not an display inline or null.
 * If the parent element is the same as the limit element then it returns null.
 *
 * @param {jQuery} element The element to find the closest parent of.
 * @param {jQuery} limitElement The element to stop looking for the closest parent at.
 * @returns {jQuery} Closest element that is not display inline or null, or null if the parent element is the same as the limit element.
 */
function elementClosestBlock(element, limitElement) {
    // <strict/>
    while (element.length > 0 &&
        element[0] !== limitElement[0] &&
        (element[0].nodeType === Node.TEXT_NODE || element.css('display') === 'inline')) {
        element = element.parent();
    }
    if (element[0] === limitElement[0]) {
        return null;
    }
    return element;
}

/**
 * Generates a unique id.
 *
 * @returns {String} The unique id.
 */
function elementUniqueId() {
    var id = 'ruid-' + new Date().getTime() + '-' + Math.floor(Math.random() * 100000);
    while ($('#' + id).length) {
        id = 'ruid-' + new Date().getTime() + '-' + Math.floor(Math.random() * 100000);
    }
    return id;
}

/**
 * Changes the tags on a given element.
 *
 * @todo not sure of details of return
 * @param {jQuerySelector|jQuery|Element} element The element(s) to have it's tags changed
 * @param {Element} newTag The new tag for the element(s)
 * @returns {Element}
 */
function elementChangeTag(element, newTag) {
    // <strict/>
    var tags = [];
    for (var i = element.length - 1; 0 <= i ; i--) {
        var node = document.createElement(newTag);
        node.innerHTML = element[i].innerHTML;
        $.each(element[i].attributes, function() {
            $(node).attr(this.name, this.value);
        });
        $(element[i]).after(node).remove();
        tags[i] = node;
    }
    return $(tags);
}

                /* End of file: temp/default/src/tools/element.js */
            
                /* File: temp/default/src/tools/fragment.js */
                /**
 * @fileOverview DOM fragment manipulation helper functions
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */

/**
 * Convert a DOMFragment to an HTML string. Optionally wraps the string in a tag.
 * @todo type for domFragment and tag.
 * @param {type} domFragment The fragment to be converted to a HTML string.
 * @param {type} tag The tag that the string may be wrapped in.
 * @returns {String} The DOMFragment as a string, optionally wrapped in a tag.
 */
function fragmentToHtml(domFragment, tag) {
    var html = '';
    // Get all nodes in the extracted content
    for (var j = 0, l = domFragment.childNodes.length; j < l; j++) {
        var node = domFragment.childNodes.item(j);
        var content = node.nodeType === Node.TEXT_NODE ? node.nodeValue : elementOuterHtml($(node));
        if (content) {
            html += content;
        }
    }
    if (tag) {
        html = $('<' + tag + '>' + html + '</' + tag + '>');
        html.find('p').wrapInner('<' + tag + '/>');
        html.find('p > *').unwrap();
        html = $('<div/>').html(html).html();
    }
    return html;
}

/**
 * Insert a DOMFragment before an element and wraps them both in a tag.
 *
 * @public @static
 * @param {DOMFragment} domFragment This is the DOMFragment to be inserted.
 * @param {jQuerySelector|jQuery|Element} beforeElement This is the element the DOMFragment is to be inserted before.
 * @param {String} wrapperTag This is the tag to wrap the domFragment and the beforeElement in.
 */
function fragmentInsertBefore(domFragment, beforeElement, wrapperTag) {
    // Get all nodes in the extracted content
    for (var j = 0, l = domFragment.childNodes.length; j < l; j++) {
        var node = domFragment.childNodes.item(j);
        // Prepend the node before the current node
        var content = node.nodeType === Node.TEXT_NODE ? node.nodeValue : $(node).html();
        if (content) {
            $('<' + wrapperTag + '/>')
                .html($.trim(content))
                .insertBefore(beforeElement);
        }
    }
}

                /* End of file: temp/default/src/tools/fragment.js */
            
                /* File: temp/default/src/tools/list.js */
                /**
 * @fileOverview List manipulation helper functions.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */

/**
 * Determines the appropriate list toggling action then performs it.
 *
 * @param {String} listType This is the type of list to check the selection against.
 * @param {Object} listItem This is the list item to use as the selection.
 * @param {Element} wrapper Element containing the entire action, may not be modified.
 */
function listToggle(listType, listItem, wrapper) {
    if (wrapper.html().trim() === '') {
        return;
    }
    if (!selectionExists()) {
        return;
    }
    if (listShouldConvertType(listType, listItem, wrapper)) {
        return listConvertListType(listType, listItem, wrapper);
    }
    if (listShouldUnwrap(listType, listItem)) {
        return listUnwrapSelection(listType, listItem, wrapper);
    }
    if (listShouldWrap(listType, listItem, wrapper)) {
       return listWrapSelection(listType, listItem, wrapper);
    }
}

/**
 * @param  {String} listType
 * @param  {String} listItem
 * @return {Boolean}
 */
function listShouldUnwrap(listType, listItem) {
    var selectedElements = $(selectionGetElements());
    if (selectedElements.is(listType)) {
        return true;
    }
    if (listType === 'blockquote' && !selectedElements.parent().is(listType)) {
        return false;
    }
    if (selectedElements.is(listItem) && selectedElements.parent().is(listType)) {
        return true;
    }
    if (selectedElements.parentsUntil(listType, listItem).length) {
        return true;
    }
    return false;
}

/**
 * @param  {String} listType
 * @param  {String} listItem
 * @return {Boolean}
 */
function listShouldConvertType(listType, listItem, wrapper) {
    var range = selectionRange();
    var commonAncestor = $(rangeGetCommonAncestor(range));
    if (rangeIsEmpty(range)) {
        var closestListItem = commonAncestor.closest(listItem, wrapper);
        if (closestListItem.length) {
            rangeExpandTo(range, [closestListItem]);
        } else {
            rangeExpandToParent(range);
        }
    }
    commonAncestor = $(rangeGetCommonAncestor(range));

    // Do not convert blockquotes that have partial selections
    if (listType === 'blockquote' &&
        !rangeContainsNode(range, commonAncestor.get(0))) {
        return false;
    }

    if ($(commonAncestor).is(listItem) &&
        !$(commonAncestor).parent().is(listType)) {
        return true;
    }
    return false;
}

function listShouldWrap(listType, listItem, wrapper) {
    if (listType === 'blockquote') {
        return elementIsValid(wrapper, listValidBlockQuoteParents);
    }
    return elementIsValid(wrapper, listValidUlOlParents);
}

/**
 * @type {String[]} Tags allowed within an li.
 */
var listValidLiChildren = [
    'a', 'abbr','acronym', 'applet', 'b', 'basefont', 'bdo', 'big', 'br', 'button',
    'cite', 'code', 'dfn', 'em', 'font', 'i', 'iframe', 'img', 'input', 'kbd',
    'label', 'map', 'object', 'p', 'q', 's',  'samp', 'select', 'small', 'span',
    'strike', 'strong', 'sub', 'sup', 'textarea', 'tt', 'u', 'var',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
];

/**
 * @type {String][]} Tags ol & ul are allowed within.
 */
var listValidUlOlParents =  [
    'article', 'nav', 'section', 'footer', 'blockquote', 'body', 'button',
    'center', 'dd', 'div', 'fieldset', 'form', 'iframe', 'li', 'noframes',
    'noscript', 'object', 'td', 'th'
];

/**
 * @type {String][]} Tags blockquote is allowed within.
 */
var listValidBlockQuoteParents = [
    'body', 'center', 'dd', 'div', 'dt', 'fieldset', 'form', 'iframe', 'li', 'td', 'th'
];

 var listValidPChildren = [
    'a', 'abbr', 'acronym', 'applet', 'b', 'basefont', 'bdo', 'big', 'br',
    'button', 'cite', 'code', 'dfn', 'em', 'font', 'i', 'iframe', 'img',
    'input', 'kbd', 'label', 'map', 'object', 'q', 's', 'samp', 'script',
    'select', 'small', 'span', 'strike', 'strong', 'sub', 'sup', 'textarea',
    'u'
];

var listValidPParents = [
    'address', 'blockquote', 'body', 'button', 'center', 'dd', 'div', 'fieldset',
    'form', 'iframe', 'li', 'noframes', 'noscript', 'object', 'td', 'th'
];

/**
 * Convert tags invalid within the context of listItem.
 *
 * @param  {Element} list
 * @param  {String} listItem
 * @param  {String[]} validChildren
 */
function listEnforceValidChildren(list, listItem, validChildren, removeEmpty) {
    removeEmpty = typeof removeEmpty === 'undefined' ? true : removeEmpty;
    // <strict/>
    var removeEmptyElements = function(node) {
        if ($(node).is('img') || $(node).find('img').length) {
            return;
        }
        if (!$(node).text().trim()) {
            $(node).remove();
            return true;
        }
    };

    list.find('> ' + listItem).each(function() {
        if (removeEmpty && removeEmptyElements(this)) {
            return true;
        }
        $(this).contents().each(function() {
            if (removeEmpty && removeEmptyElements(this)) {
                return true;
            }
            if (listItem === 'p') {
                if (!typeIsTextNode(this) &&
                    !elementIsValid(this, validChildren)) {
                    $(this).contents().unwrap();
                    return true;
                }
            } else {
                // Do nothing for bare text nodes
                if (typeIsTextNode(this)) {
                    return true;
                }
                // Unwrap the invalid element and remove it if empty
                if (!elementIsValid(this, validChildren)) {
                    $(this).contents().unwrap();
                    removeEmptyElements(this);
                    return true;
                }
            }
        });
    });
}

/**
 * Wraps the selected element(s) in list tags.
 *
 * @param {String} listType The type of list that the selection is to be transformed into.
 * @param {String} listItem The list item to be used in creating the list.
 * @param {Element} wrapper Element containing the entire action, may not be modified.
 */
function listWrapSelection(listType, listItem, wrapper) {
    var range = selectionRange();
    var commonAncestor = rangeGetCommonAncestor(range);

    /**
     * <wrapper>{}<p>Some content</p></wrapper>
     */
    if (rangeIsEmpty(range) && commonAncestor === wrapper.get(0)) {
        return;
    }

    // Having a <td> fully selected is a special case: without intervention
    // the surrounding <table> would be split, with a <listType> inserted between
    // the two <tables>.
    if ($(commonAncestor).is('td,th') || commonAncestor === wrapper.get(0)) {
        rangeSelectElementContent(range, commonAncestor);

    // Other cases require checking if the range contains the full text of the
    // common ancestor. In these cases the commonAncestor should be selected
    } else if (rangeContainsNodeText(range, commonAncestor)) {
        rangeSelectElement(range, $(commonAncestor));
    }

    if (rangeIsEmpty(range)) {
        range.selectNode(elementClosestBlock($(commonAncestor), wrapper).get(0));
    }

    var contents = listConvertItemsForList(fragmentToHtml(range.extractContents()), listItem);
    var validParents = listType === 'blockquote' ? listValidBlockQuoteParents : listValidUlOlParents;
    var uniqueId = elementUniqueId();
    var replacementHtml = '<' + listType + ' id="' + uniqueId + '">' + $('<div/>').html(contents).html() + '</' + listType + '>';

    rangeReplaceWithinValidTags(range, replacementHtml, wrapper, validParents);

    var replacement = $('#' + uniqueId).removeAttr('id');
    var validChildren = listType === 'blockquote' ? listValidPChildren : listValidLiChildren;
    listEnforceValidChildren(replacement, listItem, validChildren);
    if (replacement.is(listType)) {
        var child = replacement.find(' > ' + listItem);
        if (child.length === 0) {
            replacement = $(document.createElement('li')).appendTo(replacement);
        }
    }
    selectionSelectInner(replacement.get(0));
}

/**
 * Wrap non block elements in <p> tags, then in <li>'s.
 *
 * @param  {String} items HTML to be prepared.
 * @param  {String} listItem
 * @return {String} Prepared HTML.
 */
function listConvertItemsForList(items, listItem) {
    items = $('<div/>').html(items);

    if (!elementContainsBlockElement(items)) {
        // Do not double wrap p's
        if (listItem === 'p') {
            return '<' + listItem + '>' + items.html() + '</' + listItem + '>';
        }
        return '<' + listItem + '><p>' + items.html() + '</p></' + listItem + '>';
    }

    items.contents().each(function() {
        if ($(this).is('img')) {
            return true;
        }
        if (elementIsEmpty($(this))) {
            return $(this).remove();
        }
        $(this).wrap('<' + listItem + '/>');
        if (!elementIsBlock(this)) {
            $(this).wrap('<p>');
        }
    });

    return items.html();
}

/**
 * Convert the given list item to the given tag. If the listItem has children,
 * convert them and unwrap the containing list item.
 *
 * @param  {Element} listItem
 * @param  {string} listType
 * @param  {string} tag
 * @param  {string[]} validTagChildren Array of valid child tag names.
 * @return {Element|null} Result of the final conversion.
 */
function listConvertListItem(listItem, listType, tag) {
     // <strict/>
    var listItemChildren = listItem.contents();
    if (listItemChildren.length) {
        listItemChildren.each(function() {
            if ($(this).text().trim() === '') {
                return $(this).remove();
            }
            if (typeIsTextNode(this) || !elementIsBlock(this)) {
                return $(this).wrap('<' + tag + '>');
            }
        });
        return listItem.contents().unwrap();
    } else {
        return elementChangeTag(listItem, tag);
    }
}

/**
 * Convert listItems to paragraphs and unwrap the containing listType.
 *
 * @param  {Element} list
 * @param  {string} listItem
 * @param  {string} listType
 */
function listUnwrap(list, listItem, listType) {
    // <strict/>
    var convertedItem = null;
    list.find(listItem).each(function() {
        listConvertListItem($(this), listType, 'p');
    });
    return list.contents().unwrap();
}

/**
 * Tidy lists that have been modified, including removing empty listItems and
 * removing the list if it is completely empty.
 *
 * @param  {Element} list
 * @param  {string} listType
 * @param  {string} listItem
 */
function listTidyModified(list, listType, listItem) {
    // <strict/>
    listRemoveEmptyItems(list, listType, listItem);
    listRemoveEmpty(list, listType, listItem);
}

/**
 * Remove empty listItems from within the list.
 *
 * @param  {Element} list
 * @param  {string} listType
 * @param  {string} listItem
 */
function listRemoveEmptyItems(list, listType, listItem) {
    // <strict/>
    if (!list.is(listType)) {
        return;
    }
    list.find(listItem).each(function() {
        if ($(this).text().trim() === '') {
            $(this).remove();
        }
    });
}

/**
 * Remove list if it is of listType and empty.
 *
 * @param  {Element} list
 * @param  {string} listType
 * @param  {string} listItem
 */
function listRemoveEmpty(list, listType, listItem) {
    // <strict/>
    if (!list.is(listType)) {
        return;
    }
    if (list.text().trim() === '') {
        list.remove();
    }
}

/**
 * Unwrap the list items between the range's startElement & endElement.
 *
 * @param  {RangyRange} range
 * @param  {string} listType
 * @param  {string} listItem
 * @param  {Element} wrapper
 */
function listUnwrapSelectedListItems(range, listType, listItem, wrapper) {
    var startElement = rangeGetStartElement(range);
    var endElement = rangeGetEndElement(range);
    var replacementPlaceholderId = elementUniqueId();

    rangeExpandToParent(range);
    var breakOutValidityList = listType === 'blockquote' ? listValidBlockQuoteParents : listValidPParents;
    breakOutValidityList = $.grep(breakOutValidityList, function(item) {
        return item !== 'li';
    });
    rangeReplaceWithinValidTags(range, $('<p/>').attr('id', replacementPlaceholderId), wrapper, breakOutValidityList);

    var replacementPlaceholder = $('#' + replacementPlaceholderId);

    listTidyModified(replacementPlaceholder.prev(), listType, listItem);
    listTidyModified(replacementPlaceholder.next(), listType, listItem);

    var toUnwrap = [startElement];
    if (startElement !== endElement) {
        $(startElement).nextUntil(endElement).each(function() {
            if (this === endElement) {
                return;
            }
            toUnwrap.push(this);
        });
        toUnwrap.push(endElement);
    }

    toUnwrap.reverse();

    $(toUnwrap).each(function() {
        replacementPlaceholder.after(this);
        listConvertListItem($(this), listType, 'p');
    });

    replacementPlaceholder.remove();

    return listEnforceValidChildren($(rangeGetCommonAncestor(range)), listItem, listValidLiChildren);
}

/**
 * Unwraps the selected list item(s) and puts it into <p> tags.
 *
 * @param {Object} listItem
 */
function listUnwrapSelection(listType, listItem, wrapper) {
    var range = selectionRange();
    if (rangeIsEmpty(range)) {
        rangeExpandTo(range, [listItem]);
    }

    var commonAncestor = $(rangeGetCommonAncestor(range));

    /**
     * Selection contains more than one <listItem>, or the whole <listType>
     */
    if (commonAncestor.is(listType)) {
        var startElement = rangeGetStartElement(range);
        var endElement = rangeGetEndElement(range);

        /**
         * {<listType>
         *     <listItem>list content</listItem>
         * </listType>}
         */
        if ($(endElement).is(listType) && $(startElement).is(listType)) {
            return listUnwrap(commonAncestor, listItem, listType);
        }

        /**
         * <listType>
         *     <listItem>{list content</listItem>
         *     <listItem>list content}</listItem>
         *     <listItem>list content</listItem>
         * </listType>
         */
         return listUnwrapSelectedListItems(range, listType, listItem, wrapper);
    }

    if (!commonAncestor.is(listItem)) {
        commonAncestor = commonAncestor.closest(listItem);
    }
    /**
     * <listType>
     *     <li>{list content}</li>
     * </listType>
     */
    if (!commonAncestor.prev().length && !commonAncestor.next().length) {
        return listUnwrap(commonAncestor.closest(listType), listItem, listType);
    }

    /**
     * <listType>
     *     <listItem>list content</listItem>
     *     <listItem>{list content}</listItem>
     *     <listItem>list content</listItem>
     * </listType>
     */
    if (commonAncestor.next().length && commonAncestor.prev().length) {
        return listUnwrapSelectedListItems(range, listType, listItem, wrapper);
    }

    /**
     * <listType>
     *     <listItem>{list content}</listItem>
     *     <listItem>list content</listItem>
     * </listType>
     */
    if (commonAncestor.next().length && !commonAncestor.prev().length) {
        commonAncestor.parent().before(listConvertListItem(commonAncestor, listType, 'p'));
        commonAncestor.remove();
        return;
    }

    /**
     * <listType>
     *     <listItem>list content</listItem>
     *     <listItem>{list content}</listItem>
     * </listType>
     */
    if (!commonAncestor.next().length && commonAncestor.prev().length) {
        commonAncestor.parent().after(listConvertListItem(commonAncestor, 'p', listType));
        commonAncestor.remove();
        return;
    }
}

function listConvertListType(listType, listItem, wrapper) {
    var range = selectionRange();
    if (rangeIsEmpty(range)) {
        rangeExpandTo(range, [listItem]);
    }

    var startElement = rangeGetStartElement(range);
    var endElement = rangeGetEndElement(range);
    var replacementPlaceholderId = elementUniqueId();

    rangeExpandToParent(range);
    var breakOutValidityList = $.grep(listValidPParents, function(item) {
        return item !== listItem;
    });
    rangeReplaceWithinValidTags(range, $('<p/>').attr('id', replacementPlaceholderId), wrapper, breakOutValidityList);

    var replacementPlaceholder = $('#' + replacementPlaceholderId);

    listTidyModified(replacementPlaceholder.prev(), listType, listItem);
    listTidyModified(replacementPlaceholder.next(), listType, listItem);

    var toUnwrap = [startElement];
    if (startElement !== endElement) {
        $(startElement).nextUntil(endElement).each(function() {
            if (this === endElement) {
                return;
            }
            toUnwrap.push(this);
        });
        toUnwrap.push(endElement);
    }

    toUnwrap.reverse();

    $(toUnwrap).each(function() {
        replacementPlaceholder.after(this);
    });
    replacementPlaceholder.remove();
    var convertedList = $(toUnwrap).wrap('<' + listType + '>').parent();

    return listEnforceValidChildren(convertedList, listItem, listValidLiChildren);
}

/**
 * Break the currently selected list, replacing the selection.
 *
 * @param  {String} listType
 * @param  {String} listItem
 * @param  {Element} wrapper
 * @param  {String|Element} replacement
 * @return {Element|Boolean} The replaced element, or false if replacement did not
 *                               occur.
 */
function listBreakByReplacingSelection(listType, listItem, wrapper, replacement) {
    var selectedElement = selectionGetElement();
    if (!selectedElement.closest(listItem).length) {
        return false;
    }

    var parentList = selectedElement.closest(listType);
    if (!parentList.length || wrapper.get(0) === parentList.get(0)) {
        return false;
    }

    selectionSelectToEndOfElement(selectedElement);
    selectionDelete();

    var top = $('<' + listType + '/>'),
        bottom = $('<' + listType + '/>'),
        middlePassed = false;
    parentList.children().each(function() {
        if (selectedElement.closest(listItem).get(0) === this) {
            middlePassed = true;
            top.append(this);
            return;
        }
        if (!middlePassed) {
            top.append(this);
        } else {
            bottom.append(this);
        }
    });
    parentList.replaceWith(top);
    replacement = $(replacement).appendTo($('body'));
    top.after(replacement, bottom);

    return replacement;
}

/**
 * Add a new list item below the selection. New list item contains content of original
 * list item from selection end to end of element.
 *
 * @param  {String} listType
 * @param  {String} listItem
 * @param  {Element} wrapper
 * @param  {String|Element} replacement
 * @return {Element|Boolean}
 */
function listBreakAtSelection(listType, listItem, wrapper) {
    var selectedElement = selectionGetElement();
    if (!selectedElement.closest(listItem).length) {
        return false;
    }

    selectionDelete();
    selectionSelectToEndOfElement(selectedElement);
    var html = selectionGetHtml();
    if (html.trim() === '') {
        html = '&nbsp;';
    }
    selectionDelete();

    if (selectedElement.text().trim() === '') {
        selectedElement.html('&nbsp;');
    }
    var newListItem = $('<' + listItem + '>').html(html);
    selectedElement.closest(listItem).after(newListItem);

    listEnforceValidChildren(selectedElement.closest(listType), listItem, listValidLiChildren, false);

    return newListItem;
}

                /* End of file: temp/default/src/tools/list.js */
            
                /* File: temp/default/src/tools/node.js */
                /**
 * @fileOverview Find node parent helper function.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */


/**
 * Find the first parent of a node that is not a text node.
 *
 * @param {Node} node
 * @returns {Node}
 */
function nodeFindParent(node) {
    while (node.nodeType === Node.TEXT_NODE) {
        node = node.parentNode;
    }
    return node;
}

function nodeFindTextNodes(node) {
    var textNodes = [], whitespace = /^\s*$/;
    for (var i = 0, l = node.childNodes.length; i < l; i++) {
        if (node.childNodes[i].nodeType == Node.TEXT_NODE) {
            if (!whitespace.test(node.childNodes[i].nodeValue)) {
                textNodes.push(node.childNodes[i]);
            }
        }
    }
    return textNodes;
}

function nodeIsChildOf(child, parent) {
     var node = child.parentNode;
     while (node != null) {
         if (node == parent) {
             return true;
         }
         node = node.parentNode;
     }
     return false;
}

                /* End of file: temp/default/src/tools/node.js */
            
                /* File: temp/default/src/tools/persist.js */
                /**
 * @fileOverview Storage helper functions.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */

/**
 * Stores key-value data.
 * If local storage is already configured, retrieve what is stored and convert it to an array, otherwise create a blank array.
 * The value is then set in the array based on the key and the array is saved into local storage.
 * @todo desc and type for returns
 * @param {type} key The key for the data to be stored at
 * @param {type} value The data to be stored at the key.
 * @returns {persistSet} ??
 */
function persistSet(key, value) {
    if (localStorage) {
        var storage;
        if (localStorage.raptor) {
            storage = JSON.parse(localStorage.raptor);
        } else {
            storage = {};
        }
        storage[key] = value;
        localStorage.raptor = JSON.stringify(storage);
    }
}

/**
 * Gets the data stored at the supplied key.
 *
 * @param {type} key The key to get the stored data from.
 * @returns {Object} The data stored at the key.
 */
function persistGet(key) {
    if (localStorage) {
        var storage;
        if (localStorage.raptor) {
            storage = JSON.parse(localStorage.raptor);
        } else {
            storage = {};
        }
        return storage[key];
    }
}

                /* End of file: temp/default/src/tools/persist.js */
            
                /* File: temp/default/src/tools/range.js */
                /**
 * @fileOverview Range manipulation helper functions.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */

/**
 * Expands a range to to surround all of the content from its start container
 * to its end container.
 *
 * @param {RangyRange} range The range to expand.
 */
function rangeExpandToParent(range) {
    // <strict/>
    range.setStartBefore(range.startContainer);
    range.setEndAfter(range.endContainer);
}

/**
 * Ensure range selects entire element.
 *
 * @param  {RangyRange} range
 * @param  {Element} element
 */
function rangeSelectElement(range, element) {
    // <strict/>
    range.selectNode($(element)[0]);
}

function rangeSelectElementContent(range, element) {
    // <strict/>
    range.selectNodeContents($(element).get(0));
}

/**
 * Expand range to contain given elements.
 *
 * @param {RangyRange} range The range to expand.
 * @param {array} elements An array of elements to check the current range against.
 */
function rangeExpandTo(range, elements) {
    // <strict/>
    do {
        rangeExpandToParent(range);
        for (var i = 0, l = elements.length; i < l; i++) {
            if ($(range.commonAncestorContainer).is(elements[i])) {
                return;
            }
        }
    } while (range.commonAncestorContainer);
}

/**
 * Replaces the content of range with the given html.
 *
 * @param  {RangyRange} range The range to replace.
 * @param  {jQuery|String} html The html to use when replacing range.
 * @return {Node[]} Array of new nodes inserted.
 */
function rangeReplace(range, html) {
    // <strict/>

    var result = [],
        nodes = $('<div/>').append(html)[0].childNodes;
    range.deleteContents();
    if (nodes.length === undefined || nodes.length === 1) {
        range.insertNode(nodes[0].cloneNode(true));
    } else {
        $.each(nodes, function(i, node) {
            result.unshift(node.cloneNode(true));
            range.insertNodeAtEnd(result[0]);
        });
    }
    return result;
}

/**
 * Empties a supplied range of all the html tags.
 *
 * @param {RangyRange} range This is the range to remove tags from.
 * @returns {boolean} True if the range is empty.
 */
function rangeEmptyTag(range) {
    var html = rangeToHtml(range);
    if (typeof html === 'string') {
        html = html.replace(/([ #;&,.+*~\':"!^$[\]()=>|\/@])/g,'\\$1');
    }
    return stringHtmlStringIsEmpty(html);
}

/**
 * @param  {RangyRange} range
 * @return {Node} The range's start element.
 */
function rangeGetStartElement(range) {
    // <strict/>
    return nodeFindParent(range.startContainer);
}

/**
 * @param  {RangyRange} range
 * @return {Node} The range's end element.
 */
function rangeGetEndElement(range) {
    // <strict/>
    return nodeFindParent(range.endContainer);
}

/**
 * Returns a single selected range's common ancestor.
 * Works for single ranges only.
 *
 * @param {RangyRange} range
 * @return {Element} The range's common ancestor.
 */
function rangeGetCommonAncestor(range) {
    // <strict/>
    return nodeFindParent(range.commonAncestorContainer);
}

/**
 * Returns true if the supplied range is empty (has a length of 0)
 *
 * @public @static
 * @param {RangyRange} range The range to check if it is empty
 */
function rangeIsEmpty(range) {
    // <strict/>
    return range.startOffset === range.endOffset &&
           range.startContainer === range.endContainer;
}

/**
 * @param  {RangyRange} range
 * @param  {Node} node
 * @return {boolean} True if the range is entirely contained by the given node.
 */
function rangeIsContainedBy(range, node) {
    // <strict/>
    var nodeRange = range.cloneRange();
    nodeRange.selectNodeContents(node);
    return nodeRange.containsRange(range);
}

/**
 * @param  {RangyRange} range
 * @param  {Node} node
 * @return {Boolean} True if node is contained within the range, false otherwise.
 */
function rangeContainsNode(range, node) {
    // <strict/>
    return range.containsNode(node);
}

/**
 * Tests whether the range contains all of the text (within text nodes) contained
 * within node. This is to provide an intuitive means of checking whether a range
 * "contains" a node if you consider the range as just in terms of the text it
 * contains without having to worry about niggly details about range boundaries.
 *
 * @param  {RangyRange} range
 * @param  {Node} node
 * @return {Boolean}
 */
function rangeContainsNodeText(range, node) {
    // <strict/>
    return range.containsNodeText(node);
}

/**
 * Removes the white space at the start and the end of the range.
 *
 * @param {RangyRange} range This is the range of selected text.
 */
function rangeTrim(range) {
    // <strict/>
    if (range.startContainer.nodeType === Node.TEXT_NODE) {
        while (/\s/.test(range.startContainer.data.substr(range.startOffset, 1))) {
            range.setStart(range.startContainer, range.startOffset + 1);
        }
    }

    if (range.endContainer.nodeType === Node.TEXT_NODE) {
        while (range.endOffset > 0 && /\s/.test(range.endContainer.data.substr(range.endOffset - 1, 1))) {
            range.setEnd(range.endContainer, range.endOffset - 1);
        }
    }
}

/**
 * Serializes supplied ranges.
 *
 * @param {RangyRange} ranges This is the set of ranges to be serialized.
 * @param {Node} rootNode
 * @returns {String} A string of the serialized ranges separated by '|'.
 */
function rangeSerialize(range, rootNode) {
    // <strict/>
    return rangy.serializeRange(range, true, rootNode);
}

/**
 * Deseralizes supplied ranges.
 *
 * @param {string} serialized This is the already serailized range to be deserialized.
 * @param {Node} rootNode
 * @returns {Array} An array of deserialized ranges.
 */
function rangeDeserialize(serialized, rootNode) {
    // <strict/>
    var serializedRanges = serialized.split("|"),
        ranges = [];
    for (var i = 0, l = serializedRanges.length; i < l; i++) {
        ranges[i] = rangy.deserializeRange(serializedRanges[i], rootNode);
    }
    return ranges;
}

/**
 * Split the selection container and insert the given html between the two elements created.
 *
 * @param  {RangyRange}
 * @param  {jQuery|Element|string} html The html to replace selection with.
 */
function rangeReplaceSplitInvalidTags(range, html, wrapper, validTagNames) {
    // <strict/>
    var commonAncestor = rangeGetCommonAncestor(range);

    if (!elementIsValid(commonAncestor, validTagNames)) {
        commonAncestor = elementFirstInvalidElementOfValidParent(commonAncestor, validTagNames, wrapper);
    }

    // Select from start of selected element to start of selection
    var startRange = rangy.createRange();
    startRange.setStartBefore(commonAncestor);
    startRange.setEnd(range.startContainer, range.startOffset);
    var startFragment = startRange.cloneContents();

    // Select from end of selected element to end of selection
    var endRange = rangy.createRange();
    endRange.setStart(range.endContainer, range.endOffset);
    endRange.setEndAfter(commonAncestor);
    var endFragment = endRange.cloneContents();

    // Replace the start element's html with the content that was not selected, append html & end element's html
    var replacement = elementOuterHtml($(fragmentToHtml(startFragment)));
    replacement += elementOuterHtml($(html).attr('data-replacement', true));
    replacement += elementOuterHtml($(fragmentToHtml(endFragment)));

    replacement = $(replacement);

    $(commonAncestor).replaceWith(replacement);
    replacement = replacement.parent().find('[data-replacement]').removeAttr('data-replacement');

    // Remove empty surrounding tags only if they're of the same type as the split element
    if (replacement.prev().is(commonAncestor.tagName.toLowerCase()) &&
        !replacement.prev().html().trim()) {
        replacement.prev().remove();
    }
    if (replacement.next().is(commonAncestor.tagName.toLowerCase()) &&
        !replacement.next().html().trim()) {
        replacement.next().remove();
    }
    return replacement;
}

/**
 * Replace the given range, splitting the parent elements such that the given html
 * is contained only by valid tags.
 *
 * @param  {RangyRange} range
 * @param  {string} html
 * @param  {Element} wrapper
 * @param  {string[]} validTagNames
 * @return {Element}
 */
function rangeReplaceWithinValidTags(range, html, wrapper, validTagNames) {
    var startElement = nodeFindParent(range.startContainer);
    var endElement = nodeFindParent(range.endContainer);
    var selectedElement = rangeGetCommonAncestor(range);

    var selectedElementValid = elementIsValid(selectedElement, validTagNames);
    var startElementValid = elementIsValid(startElement, validTagNames);
    var endElementValid = elementIsValid(endElement, validTagNames);

    // The html may be inserted within the selected element & selection start / end.
    if (selectedElementValid && startElementValid && endElementValid) {
        return rangeReplace(range, html);
    }

    // Context is invalid. Split containing element and insert list in between.
    return rangeReplaceSplitInvalidTags(range, html, wrapper, validTagNames);
}

function rangeToHtml(range) {
    return fragmentToHtml(range.cloneContents());
}

function rangeGet() {
    var selection = rangy.getSelection();
    if (selection.rangeCount > 0) {
        return selection.getRangeAt(0);
    }
    return null;
}

                /* End of file: temp/default/src/tools/range.js */
            
                /* File: temp/default/src/tools/selection.js */
                /**
 * @fileOverview Selection manipulation helper functions.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */

/**
 * @type {Boolean|Object} current saved selection.
 */
var savedSelection = false;

/**
 * Save selection wrapper, preventing plugins / UI from accessing rangy directly.
 * @todo check desc and type for overwrite.
 * @param {Boolean} overwrite True if selection is able to be overwritten.
 */
function selectionSave(overwrite) {
    if (savedSelection && !overwrite) return;
    savedSelection = rangy.saveSelection();
}

/**
 * Restore selection wrapper, preventing plugins / UI from accessing rangy directly.
 */
function selectionRestore() {
    if (savedSelection) {
        rangy.restoreSelection(savedSelection);
        savedSelection = false;
    }
}

/**
 * Reset saved selection.
 */
function selectionDestroy() {
    if (savedSelection) {
        rangy.removeMarkers(savedSelection);
    }
    savedSelection = false;
}

/**
 * Returns whether the selection is saved.
 *
 * @returns {Boolean} True if there is a saved selection.
 */
function selectionSaved() {
    return savedSelection !== false;
}

/**
 * Iterates over all ranges in a selection and calls the callback for each
 * range. The selection/range offsets is updated in every iteration in in the
 * case that a range was changed or removed by a previous iteration.
 *
 * @public @static
 * @param {function} callback The function to call for each range. The first and only parameter will be the current range.
 * @param {RangySelection} [selection] A RangySelection, or by default, the current selection.
 * @param {object} [context] The context in which to call the callback.
 */
function selectionEachRange(callback, selection, context) {
    selection = selection || rangy.getSelection();
    var range, i = 0;
    // Create a new range set every time to update range offsets
    while (range = selection.getAllRanges()[i++]) {
        callback.call(context, range);
    }
}

/**
 * Replaces the current selection with the specified range.
 *
 * @param {RangySelection} mixed The specified range to replace the current range.
 */
function selectionSet(mixed) {
    rangy.getSelection().setSingleRange(mixed);
}

/**
 * Replaces the given selection (or the current selection if selection is not
 * supplied) with the given html.
 * @todo type for result
 * @public @static
 * @param  {jQuery|String} html The html to use when replacing.
 * @param  {RangySelection|null} selection The selection to replace, or null to replace the current selection.
 * @returns {type} The replaced selection.
 */
function selectionReplace(html, selection) {
    var result = [];
    selectionEachRange(function(range) {
        result = result.concat(rangeReplace(range, html));
    }, selection, this);
    return result;
}

/**
 * Selects all the contents of the supplied element, excluding the element itself.
 *
 * @public @static
 * @param {jQuerySelector|jQuery|Element} element
 * @param {RangySelection} [selection] A RangySelection, or by default, the current selection.
 */
 /*
function selectionSelectInner(element, selection) {
    selection = selection || rangy.getSelection();
    selection.removeAllRanges();
    $(element).focus().contents().each(function() {
        var range = rangy.createRange();
        range.selectNodeContents(this);
        selection.addRange(range);
    });
}
*/
/**
 * Selects all the contents of the supplied node, excluding the node itself.
 *
 * @public @static
 * @param {Node} node
 * @param {RangySelection} [selection] A RangySelection, or by default, the current selection.
 */
function selectionSelectInner(node, selection) {
    // <strict/>
    selection = selection || rangy.getSelection();
    var range = rangy.createRange();
    range.selectNodeContents(node);
    selection.setSingleRange(range);
}

/**
 * Selects all the contents of the supplied node, including the node itself.
 *
 * @public @static
 * @param {Node} node
 * @param {RangySelection} [selection] A RangySelection, or null to use the current selection.
 */
function selectionSelectOuter(node, selection) {
    // <strict/>
    var range = rangy.createRange();
    range.selectNode(node);
    rangy.getSelection().setSingleRange(range);
}

/**
 * Move selection to the start or end of element.
 *
 * @param  {jQuerySelector|jQuery|Element} element The subject element.
 * @param  {RangySelection|null} selection A RangySelection, or null to use the current selection.
 * @param {Boolean} start True to select the start of the element.
 */
function selectionSelectEdge(element, selection, start) {
    selection = selection || rangy.getSelection();
    selection.removeAllRanges();

    $(element).each(function() {
        var range = rangy.createRange();
        range.selectNodeContents(this);
        range.collapse(start);
        selection.addRange(range);
    });
}

/**
 * Move selection to the end of element.
 *
 * @param  {jQuerySelector|jQuery|Element} element The subject element.
 * @param  {RangySelection|null} selection A RangySelection, or null to use the current selection.
 */
function selectionSelectEnd(element, selection) {
    selectionSelectEdge(element, selection, false);
}

/**
 * Move selection to the start of element.
 *
 * @param  {jQuerySelector|jQuery|Element} element The subject element.
 * @param  {RangySelection|null} selection A RangySelection, or null to use the current selection.
 */
function selectionSelectStart(element, selection) {
    selectionSelectEdge(element, selection, true);
}

/**
 * Extend selection to the end of element.
 *
 * @param  {Element} element
 * @param  {RangySelection|null} selection
 */
function selectionSelectToEndOfElement(element, selection) {
    // <strict/>
    selection = selection || rangy.getSelection();
    var range = selectionRange();
    selection.removeAllRanges();
    range.setEndAfter(element.get(0));
    selection.addRange(range);
}

/**
 * Gets the HTML from a selection. If no selection is supplied then current selection will be used.
 *
 * @param  {RangySelection|null} selection Selection to get html from or null to use current selection.
 * @return {string} The html content of the selection.
 */
function selectionGetHtml(selection) {
    selection = selection || rangy.getSelection();
    return selection.toHtml();
}

/**
 * Gets the closest common ancestor container to the given or current selection that isn't a text node.
 * @todo check please
 *
 * @param {RangySelection} range The selection to get the element from.
 * @returns {jQuery} The common ancestor container that isn't a text node.
 */
function selectionGetElement(range, selection) {
    selection = selection || rangy.getSelection();
    if (!selectionExists()) {
        return null;
    }
    var range = selectionRange(),
        commonAncestor;
    // Check if the common ancestor container is a text node
    if (range.commonAncestorContainer.nodeType === Node.TEXT_NODE) {
        // Use the parent instead
        commonAncestor = range.commonAncestorContainer.parentNode;
    } else {
        commonAncestor = range.commonAncestorContainer;
    }
    return $(commonAncestor);
}

/**
 * Gets all elements within and including the selection's common ancestor that contain a selection (excluding text nodes) and
 * returns them as a jQuery array.
 *
 * @public @static
 * @param {RangySelection|null} A RangySelection, or by default, the current selection.
 */
function selectionGetElements(selection) {
    var result = new jQuery();
    selectionEachRange(function(range) {
        result.push(selectionGetElement(range)[0]);
    }, selection, this);
    return result;
}

/**
 * Gets the start element of a selection.
 * @todo check the type of the return...i guessed and i have a feeling i might be wrong.
 * @returns {jQuery|Object} If the anchor node is a text node then the parent of the anchor node is returned, otherwise the anchor node is returned.
 */
function selectionGetStartElement() {
    var selection = rangy.getSelection();
    if (selection.anchorNode === null) {
        return null;
    }
    if (selection.isBackwards()) {
        return selection.focusNode.nodeType === Node.TEXT_NODE ? $(selection.focusNode.parentElement) : $(selection.focusNode);
    }
    if (!selection.anchorNode) console.trace();
    return selection.anchorNode.nodeType === Node.TEXT_NODE ? $(selection.anchorNode.parentElement) : $(selection.anchorNode);
}

/**
 * Gets the end element of the selection.
 * @returns {jQuery|Object} If the focus node is a text node then the parent of the focus node is returned, otherwise the focus node is returned.
 */
function selectionGetEndElement() {
    var selection = rangy.getSelection();
    if (selection.anchorNode === null) {
        return null;
    }
    if (selection.isBackwards()) {
        return selection.anchorNode.nodeType === Node.TEXT_NODE ? $(selection.anchorNode.parentElement) : $(selection.anchorNode);
    }
    return selection.focusNode.nodeType === Node.TEXT_NODE ? $(selection.focusNode.parentElement) : $(selection.focusNode);
}

/**
 * Checks to see if the selection is at the end of the element.
 *
 * @returns {Boolean} True if the node immediately after the selection ends does not exist or is empty,
 *                      false if the whole nodes' text is not selected or it doesn't fit the criteria for the true clause.
 */
function selectionAtEndOfElement() {
    var selection = rangy.getSelection();
    var focusNode = selection.isBackwards() ? selection.anchorNode : selection.focusNode;
    var focusOffset = selection.isBackwards() ? selection.focusOffset : selection.anchorOffset;
    if (focusOffset !== focusNode.textContent.length) {
        return false;
    }
    var previous = focusNode.nextSibling;
    if (!previous || $(previous).html() === '') {
        return true;
    } else {
        return false;
    }
}

/**
 * Checks to see if the selection is at the start of the element.
 *
 * @returns {Boolean} True if the node immediately before the selection starts does not exist or is empty,
 *                      false if the whole nodes' text is not selected or it doesn't fit the criteria for the true clause.
 */
function selectionAtStartOfElement() {
    var selection = rangy.getSelection();
    var anchorNode = selection.isBackwards() ? selection.focusNode : selection.anchorNode;
    if (selection.isBackwards() ? selection.focusOffset : selection.anchorOffset !== 0) {
        return false;
    }
    var previous = anchorNode.previousSibling;
    if (!previous || $(previous).html() === '') {
        return true;
    } else {
        return false;
    }
}

/**
 * Checks to see if the selection is empty.
 * @returns {Boolean} Returns true if the selection is empty.
 */
function selectionIsEmpty() {
    return rangy.getSelection().toHtml() === '';
}

/**
 * FIXME: this function needs reviewing.
 *
 * This should toggle an inline style, and normalise any overlapping tags, or adjacent (ignoring white space) tags.
 * @todo apparently this needs fixing and i'm not sure what it returns.
 * @public @static
 *
 * @param {String} tag This is the tag to be toggled.
 * @param {Array} options These are any additional properties to add to the element.
 * @returns {selectionToggleWrapper}
 */
function selectionToggleWrapper(tag, options) {
    options = options || {};
    var applier = rangy.createCssClassApplier(options.classes || '', {
        normalize: true,
        elementTagName: tag,
        elementProperties: options.attributes || {}
    });
    selectionEachRange(function(range) {
        if (rangeEmptyTag(range)) {
            var element = $('<' + tag + '/>')
                .addClass(options.classes)
                .attr(options.attributes || {})
                .append(fragmentToHtml(range.cloneContents()));
            rangeReplace(range, element);
        } else {
            applier.toggleRange(range);
        }
    }, null, this);
}

/**
 * @todo method description and check types
 *
 * @param {String} tag The tag for the selection to be wrapped in.
 * @param {String} attributes The attributes to be added to the selection.
 * @param {String} classes The classes to be added to the selection
 */
function selectionWrapTagWithAttribute(tag, attributes, classes) {
    selectionEachRange(function(range) {
        var element = selectionGetElement(range);
        if (element.is(tag)) {
            element.attr(attributes);
        } else {
            selectionToggleWrapper(tag, {
                classes: classes,
                attributes: attributes
            });
        }
    }, null, this);
}

/**
 * Check if there is a current selection.
 *
 * @public @static
 * @returns {Boolean} Returns true if there is at least one range selected.
 */
function selectionExists() {
    return rangy.getSelection().rangeCount !== 0;
}

/**
 * Gets the first range in the current selection. In strict mode if no selection
 * exists an error occurs.
 *
 * @public @static
 * @returns {RangyRange} Returns true if there is at least one range selected.
 */
function selectionRange() {
    // <strict/>
    return rangy.getSelection().getRangeAt(0);
}

/**
 * Split the selection container and insert the given html between the two elements created.
 * @param  {jQuery|Element|string} html The html to replace selection with.
 * @param  {RangySelection|null} selection The selection to replace, or null for the current selection.
 * @returns {Object} The selection container with it's new content added.
 */
function selectionReplaceSplittingSelectedElement(html, selection) {
    selection = selection || rangy.getSelection();

    var selectionRange = selectionRange();
    var selectedElement = selectionGetElements()[0];

    // Select from start of selected element to start of selection
    var startRange = rangy.createRange();
    startRange.setStartBefore(selectedElement);
    startRange.setEnd(selectionRange.startContainer, selectionRange.startOffset);
    var startFragment = startRange.cloneContents();

    // Select from end of selected element to end of selection
    var endRange = rangy.createRange();
    endRange.setStart(selectionRange.endContainer, selectionRange.endOffset);
    endRange.setEndAfter(selectedElement);
    var endFragment = endRange.cloneContents();

    // Replace the start element's html with the content that was not selected, append html & end element's html
    var replacement = elementOuterHtml($(fragmentToHtml(startFragment)));
    replacement += elementOuterHtml($(html).attr('data-replacement', true));
    replacement += elementOuterHtml($(fragmentToHtml(endFragment)));

    replacement = $(replacement);

    $(selectedElement).replaceWith(replacement);
    return replacement.parent().find('[data-replacement]').removeAttr('data-replacement');
}

/**
 * Replace current selection with given html, ensuring that selection container is split at
 * the start & end of the selection in cases where the selection starts / ends within an invalid element.
 *
 * @param  {jQuery|Element|string} html The html to replace current selection with.
 * @param  {Array} validTagNames An array of tag names for tags that the given html may be inserted into without having the selection container split.
 * @param  {RangySeleciton|null} selection The selection to replace, or null for the current selection.
 * @returns {Object} The replaced selection if everything is valid or the selection container with it's new content added.
 */
function selectionReplaceWithinValidTags(html, validTagNames, selection) {
    selection = selection || rangy.getSelection();

    if (!selectionExists()) {
        return;
    }

    var startElement = selectionGetStartElement()[0];
    var endElement = selectionGetEndElement()[0];
    var selectedElement = selectionGetElements()[0];

    var selectedElementValid = elementIsValid(selectedElement, validTagNames);
    var startElementValid = elementIsValid(startElement, validTagNames);
    var endElementValid = elementIsValid(endElement, validTagNames);

    // The html may be inserted within the selected element & selection start / end.
    if (selectedElementValid && startElementValid && endElementValid) {
        return selectionReplace(html);
    }

    // Context is invalid. Split containing element and insert list in between.
    return selectionReplaceSplittingSelectedElement(html, selection);
}

/**
 * Toggles style(s) on the first block level parent element of each range in a selection
 *
 * @public @static
 * @param {Object} styles styles to apply
 * @param {jQuerySelector|jQuery|Element} limit The parent limit element.
 * If there is no block level elements before the limit, then the limit content
 * element will be wrapped with a "div"
 */
function selectionToggleBlockStyle(styles, limit) {
    selectionEachRange(function(range) {
        var parent = $(range.commonAncestorContainer);
        while (parent.length && parent[0] !== limit[0] && (
                parent[0].nodeType === Node.TEXT_NODE || parent.css('display') === 'inline')) {
            parent = parent.parent();
        }
        if (parent[0] === limit[0]) {
            // Only apply block style if the limit element is a block
            if (limit.css('display') !== 'inline') {
                // Wrap the HTML inside the limit element
                elementWrapInner(limit, 'div');
                // Set the parent to the wrapper
                parent = limit.children().first();
            }
        }
        // Apply the style to the parent
        elementToggleStyle(parent, styles);
    }, null, this);
}

/**
 * Iterates throught each block in the selection and calls the callback function.
 *
 * @todo revise blockContainer parameter!
 * @param {function} callback The function to be called on each block in the selection.
 * @param {jQuery} limitElement The element to stop searching for block elements at.
 * @param {undefined|Sring} blockContainer Thia parameter is unused for some reason.
 */
function selectionEachBlock(callback, limitElement, blockContainer) {
    // <strict/>
    selectionEachRange(function(range) {
        // Loop range parents until a block element is found, or the limit element is reached
        var startBlock = elementClosestBlock($(range.startContainer), limitElement),
            endBlock = elementClosestBlock($(range.endContainer), limitElement),
            blocks;
        if (!startBlock || !endBlock) {
            // Wrap the HTML inside the limit element
            callback(elementWrapInner(limitElement, blockContainer).get(0));
        } else {
            if (startBlock.is(endBlock)) {
                blocks = startBlock;
            } else if (startBlock && endBlock) {
                blocks = startBlock.nextUntil(endBlock).andSelf().add(endBlock);
            }
            for (var i = 0, l = blocks.length; i < l; i++) {
                callback(blocks[i]);
            }
        }
    });
}

/**
 * Add or removes a set of classes to the closest block elements in a selection.
 * If the `limitElement` is closer than a block element, then a new
 * `blockContainer` element wrapped around the selection.
 *
 * If any block in the selected text has not got the class applied to it, then
 * the class will be applied to all blocks.
 *
 * @todo revise blockContainer parameter!
 * @param {string[]} addClasses This is a set of classes to be added.
 * @param {string[]} removeClasses This is a set of classes to be removed.
 * @param {jQuery} limitElement The element to stop searching for block elements at.
 * @param {undefined|String} blockContainer Thia parameter is unused for some reason.
 */
function selectionToggleBlockClasses(addClasses, removeClasses, limitElement, blockContainer) {
    // <strict/>

    var apply = false,
        blocks = new jQuery();

    selectionEachBlock(function(block) {
        blocks.push(block);
        if (!apply) {
            for (var i = 0, l = addClasses.length; i < l; i++) {
                if (!$(block).hasClass(addClasses[i])) {
                    apply = true;
                }
            }
        }
    }, limitElement, blockContainer);

    $(blocks).removeClass(removeClasses.join(' '));
    if (apply) {
        $(blocks).addClass(addClasses.join(' '));
    } else {
        $(blocks).removeClass(addClasses.join(' '));
    }
}

/**
 * Removes all ranges from a selection that are not contained within the
 * supplied element.
 *
 * @public @static
 * @param {jQuerySelector|jQuery|Element} element The element to exclude the removal of ranges.
 * @param {RangySelection} [selection] The selection from which to remove the ranges.
 */
function selectionConstrain(node, selection) {
    // <strict/>
    selection = selection || rangy.getSelection();
    var ranges = selection.getAllRanges(),
        newRanges = [];
    for (var i = 0, l = ranges.length; i < l; i++) {
        var newRange = ranges[i].cloneRange();
        if (ranges[i].startContainer !== node &&
                !nodeIsChildOf(ranges[i].startContainer, node)) {
            newRange.setStart(node, 0);
        }
        if (ranges[i].endContainer !== node &&
                !nodeIsChildOf(ranges[i].endContainer, node)) {
            newRange.setEnd(node, node.childNodes.length);
        }
        newRanges.push(newRange);
    }
    selection.setRanges(newRanges);
}

/**
 * Clears the formatting on a supplied selection.
 *
 * @param {Node} limitNode The containing element.
 * @param {RangySelection} [selection] The selection to have it's formatting cleared.
 */
function selectionClearFormatting(limitNode, selection) {
    // <strict/>

    limitNode = limitNode || document.body;
    selection = selection || rangy.getSelection();
    if (selectionExists()) {
        // Create a copy of the selection range to work with
        var range = selectionRange().cloneRange();

        // Get the selected content
        var content = range.extractContents();

        // Expand the range to the parent if there is no selected content
        // and the range's ancestor is not the limitNode
        if (fragmentToHtml(content) === '') {
            rangeSelectElementContent(range, range.commonAncestorContainer);
            selection.setSingleRange(range);
            content = range.extractContents();
        }

        content = $('<div/>').append(fragmentToHtml(content)).html().replace(/(<\/?.*?>)/gi, function(match) {
            if (match.match(/^<(img|object|param|embed|iframe)/) !== null) {
                return match;
            }
            return '';
        });

        // Get the containing element
        var parent = range.commonAncestorContainer;
        while (parent && parent.parentNode !== limitNode) {
            parent = parent.parentNode;
        }

        if (parent) {
            // Place the end of the range after the paragraph
            range.setEndAfter(parent);

            // Extract the contents of the paragraph after the caret into a fragment
            var contentAfterRangeStart = range.extractContents();

            // Collapse the range immediately after the paragraph
            range.collapseAfter(parent);

            // Insert the content
            range.insertNode(contentAfterRangeStart);

            // Move the caret to the insertion point
            range.collapseAfter(parent);
        }
        content = $.parseHTML(content);
        if (content !== null) {
            $(content.reverse()).each(function() {
                if ($(this).is('img')) {
                    range.insertNode($(this).removeAttr('width height class style').get(0));
                    return;
                }
                range.insertNode(this);
            });
        }
    }
}

/**
 * Replaces specified tags and classes on a selection.
 *
 * @todo check descriptions and types please
 * @param {String} tag1 This is the tag to appear on the selection at the end of the method.
 * @param {jQuery} class1 This is the class to appear on the selection at the end of the method.
 * @param {String} tag2 This is the current tag on the selection, which is to be replaced.
 * @param {jQuery} class2 This is the current class on the selection, which is to be replaced.
 */
function selectionInverseWrapWithTagClass(tag1, class1, tag2, class2) {
    selectionSave();
    // Assign a temporary tag name (to fool rangy)
    var id = 'domTools' + Math.ceil(Math.random() * 10000000);

    selectionEachRange(function(range) {
        var applier2 = rangy.createCssClassApplier(class2, {
            elementTagName: tag2
        });

        // Check if tag 2 is applied to range
        if (applier2.isAppliedToRange(range)) {
            // Remove tag 2 to range
            applier2.toggleSelection();
        } else {
            // Apply tag 1 to range
            rangy.createCssClassApplier(class1, {
                elementTagName: id
            }).toggleSelection();
        }
    }, null, this);

    // Replace the temporary tag with the correct tag
    $(id).each(function() {
        $(this).replaceWith($('<' + tag1 + '/>').addClass(class1).html($(this).html()));
    });

    selectionRestore();
}

/**
 * Expands the user selection to encase a whole word.
 */
function selectionExpandToWord() {
    var ranges = rangy.getSelection().getAllRanges();
    if (ranges.length === 1) {
        if (rangeToHtml(ranges[0]) === '') {
            rangy.getSelection().expand('word');
        }
    }
}

/**
 * Expands the user selection to contain the supplied selector, stopping at the specified limit element.
 *
 * @param {jQuerySelector} selector The selector to expand the selection to.
 * @param {jQuerySelector} limit The element to stop at.
 * @param {boolean} outer If true, then the outer most matched element (by the
 *   selector) is wrapped. Otherwise the first matched element is wrapped.
 */
function selectionExpandTo(selector, limit, outer) {
    var ranges = rangy.getSelection().getAllRanges();
    for (var i = 0, l = ranges.length; i < l; i++) {
        // Start container
        var element = $(nodeFindParent(ranges[i].startContainer));
        if (outer || (!element.is(selector) && !element.is(limit))) {
            element = element.parentsUntil(limit, selector);
        }
        if (outer) {
            element = element.last();
        } else {
            element = element.first();
        }
        if (element.length === 1 && !element.is(limit)) {
            ranges[i].setStart(element[0], 0);
        }

        // End container
        element = $(nodeFindParent(ranges[i].endContainer));
        if (outer || (!element.is(selector) && !element.is(limit))) {
            element = element.parentsUntil(limit, selector);
        }
        if (outer) {
            element = element.last();
        } else {
            element = element.first();
        }
        if (element.length === 1 && !element.is(limit)) {
            ranges[i].setEnd(element[0], element[0].childNodes.length);
        }
    }
    rangy.getSelection().setRanges(ranges);
}

/**
 * Trims an entire selection as per rangeTrim.
 *
 * @see rangeTrim
 */
function selectionTrim() {
    if (selectionExists()) {
        var range = selectionRange();
        rangeTrim(range);
        selectionSet(range);
    }
}

/**
 * Finds the inner elements and the wrapping tags for a selector.
 *
 * @param {string} selector A jQuery selector to match the wrapping/inner element against.
 * @param {jQuery} limitElement The element to stop searching at.
 * @returns {jQuery}
 */
function selectionFindWrappingAndInnerElements(selector, limitElement) {
    var result = new jQuery();
    selectionEachRange(function(range) {
        var startNode = range.startContainer;
        while (startNode.nodeType === Node.TEXT_NODE) {
            startNode = startNode.parentNode;
        }

        var endNode = range.endContainer;
        while (endNode.nodeType === Node.TEXT_NODE) {
            endNode = endNode.parentNode;
        }

        var filter = function() {
            if (!limitElement.is(this)) {
                result.push(this);
            }
        };

        do {
            $(startNode).filter(selector).each(filter);

            if (!limitElement.is(startNode) && result.length === 0) {
                $(startNode).parentsUntil(limitElement, selector).each(filter);
            }

            $(startNode).find(selector).each(filter);

            if ($(endNode).is(startNode)) {
                break;
            }

            startNode = $(startNode).next();
        } while (startNode.length > 0 && $(startNode).prevAll().has(endNode).length === 0);
    });
    return result;
}

/**
 * Changes the tags on a selection.
 *
 * @param {String} changeTo The tag to be changed to.
 * @param {String} changeFrom The tag to be changed from.
 * @param {jQuery} limitElement The element to stop changing the tags at.
 */
function selectionChangeTags(changeTo, changeFrom, limitElement) {
    var elements = selectionFindWrappingAndInnerElements(changeFrom.join(','), limitElement);
    if (elements.length) {
        selectionSave();
        elementChangeTag(elements, changeTo);
        selectionRestore();
    } else {
        var limitNode = limitElement.get(0);
        if (limitNode.innerHTML.trim()) {
            selectionSave();
            limitNode.innerHTML = '<' + changeTo + '>' + limitNode.innerHTML + '</' + changeTo + '>';
            selectionRestore();
        } else {
            limitNode.innerHTML = '<' + changeTo + '>&nbsp;</' + changeTo + '>';
            selectionSelectInner(limitNode.childNodes[0]);
        }
    }
}

/**
 * Checks that the selecton only contains valid children.
 *
 * @param {String} selector A string containing a selector expression to match the current set of elements against.
 * @param {jQuery} limit The element to stop changing the tags at.
 * @returns {Boolean} True if the selection contains valid children.
 */
function selectionContains(selector, limit) {
    var result = true;
    selectionEachRange(function(range) {
        // Check if selection only contains valid children
        var children = $(range.commonAncestorContainer).find('*');
        if ($(range.commonAncestorContainer).parentsUntil(limit, selector).length === 0 &&
                (children.length === 0 || children.length !== children.filter(selector).length)) {
            result = false;
        }
    });
    return result;
}

function selectionDelete(selection) {
    selection = selection || rangy.getSelection();
    selection.deleteFromDocument();
}

                /* End of file: temp/default/src/tools/selection.js */
            
                /* File: temp/default/src/tools/state.js */
                /**
 * @fileOverview Save state helper functions.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */

/**
 * Saves the state of an element.
 * @param {jQuery} element The element to have its current state saved.
 * @returns {Object} The saved state of the element.
 */
function stateSave(element) {
    // <strict/>

    var range = rangeGet();
    return {
        element: element.clone(true),
        ranges: range ? rangeSerialize(range, element.get(0)) : null
    };
}

/**
 * Restores an element from its saved state.
 *
 * @param {jQuery} element The element to have its state restored.
 * @param {jQuery} state The state to restore the element to.
 * @returns {Object} The restored element.
 */
function stateRestore(element, state) {
    // <strict/>

    element.replaceWith(state.element);
    var ranges = null;
    try {
        if (state.ranges) {
            ranges = rangeDeserialize(state.ranges, state.element.get(0));
        }
    } catch (exception) {
        // <debug/>
    }
    return {
        element: state.element,
        ranges: ranges
    };
}

                /* End of file: temp/default/src/tools/state.js */
            
                /* File: temp/default/src/tools/string.js */
                /**
 * @fileOverview String helper functions.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */

/**
 * Modification of strip_tags from PHP JS - http://phpjs.org/functions/strip_tags:535.
 * @param  {string} content HTML containing tags to be stripped
 * @param {Array} allowedTags Array of tags that should not be stripped
 * @return {string} HTML with all tags not present allowedTags array.
 */
function stringStripTags(content, allowedTags) {
    // making sure the allowed arg is a string containing only tags in lowercase (<a><b><c>)
    allowed = [];
    for (var allowedTagsIndex = 0; allowedTagsIndex < allowedTags.length; allowedTagsIndex++) {
        if (allowedTags[allowedTagsIndex].match(/[a-z][a-z0-9]{0,}/g)) {
            allowed.push(allowedTags[allowedTagsIndex]);
        }
    }
    // making sure the allowed arg is a string containing only tags in lowercase (<a><b><c>)
    var tags = /<\/?([a-z][a-z0-9]*)\b[^>]*\/?>/gi,
        commentsAndPhpTags = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi;

    return content.replace(commentsAndPhpTags, '').replace(tags, function ($0, $1) {
        return allowed.indexOf($1.toLowerCase()) > -1 ? $0 : '';
    });
}

/**
 * Converts a string in camelcase to lower case words separated with a dash or other supplied delimiter.
 * @param {String} string The string to be converted from camelcase.
 * @param {String} delimiter The character to separate the words, '-' if null.
 * @returns {String} A lowercase string separated by dashes.
 */
function stringCamelCaseConvert(string, delimiter) {
    return string.replace(/([A-Z])/g, function(match) {
        return (delimiter || '-') + match.toLowerCase();
    });
}

/**
 * Checks if an html string is empty.
 *
 * @param {Element} element The element to be checked.
 * @returns {Element}
 */
function stringHtmlStringIsEmpty(html) {
    // <strict/>
    return $($.parseHTML(html)).is(':empty');
}

                /* End of file: temp/default/src/tools/string.js */
            
                /* File: temp/default/src/tools/style.js */
                /**
 * @fileOverview Style helper functions.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */

/**
 * @todo desc all
 * @param {jQuerySelector|jQuery|Element} element This is the element to have its styles swapped.
 * @param {array} newState The new state to be applied to the element.
 * @returns {array}
 */
function styleSwapState(element, newState) {
    var node = element.get(0),
        previousState = {};
    // Double loop because jQuery will automatically assign other style properties like 'margin-left' when setting 'margin'
    for (var key in newState) {
        previousState[key] = node.style[key];
    }
    for (key in newState) {
        element.css(key, newState[key]);
    }
    return previousState;
}

/**
 * @todo type for wrapper and inner and descriptions
 * @param {type} wrapper
 * @param {type} inner
 * @param {array} newState
 * @returns {unresolved}
 */
function styleSwapWithWrapper(wrapper, inner, newState) {
    var innerNode = inner.get(0),
        previousState = {};
    // Double loop because jQuery will automatically assign other style properties like 'margin-left' when setting 'margin'
    for (var key in newState) {
        previousState[key] = innerNode.style[key];
    }
    for (key in newState) {
        wrapper.css(key, inner.css(key));
        inner.css(key, newState[key]);
    }
    return previousState;
}

/**
 * @todo all
 * @param {jQuery} element
 * @param {array} state
 * @returns {undefined}
 */
function styleRestoreState(element, state) {
    for (var key in state) {
        element.css(key, state[key] || '');
    }
}

                /* End of file: temp/default/src/tools/style.js */
            
                /* File: temp/default/src/tools/table.js */
                /**
 * @fileOverview Table helper functions.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen - david@panmedia.co.nz
 */

/**
 * Create and return a new table element with the supplied number of rows/columns.
 *
 * @public @static
 * @param {int} columns The number of columns to add to the table.
 * @param {int} rows The number of rows to add to the table.
 * @param [options] Extra options to apply.
 * @param [options.placeHolder=""] Place holder HTML to insert into each created cell.
 * @returns {HTMLTableElement}
 */
function tableCreate(columns, rows, options) {
    options = options || {};
    var table = document.createElement('table');
    while (rows--) {
        var row = table.insertRow(0);
        for (var i = 0; i < columns; i++) {
            var cell = row.insertCell(0);
            if (options.placeHolder) {
                cell.innerHTML = options.placeHolder;
            }
        }
    }
    return table;
}

/**
 * Adds a column to a table.
 *
 * @param {HTMLTableElement} table
 * @param {int[]} index Position to insert the column at, starting at 0.
 * @param [options] Extra options to apply.
 * @param [options.placeHolder=""] Place holder HTML to insert into each created cell.
 * @returns {HTMLTableCellElement[]} An array of cells added to the table.
 */
function tableInsertColumn(table, index, options) {
    return resizeTable(table, 0, 0, 1, index, options || {});
}
/**
 * Removes a column from a table.
 *
 * @param {HTMLTableElement} table
 * @param {int} index Position to remove the column at, starting at 0.
 */
function tableDeleteColumn(table, index) {
    resizeTable(table, 0, 0, -1, index);
}

/**
 * Adds a row to a table, and append as many cells as the longest row in the table.
 *
 * @param {HTMLTableElement} table
 * @param {int[]} index Position to insert the row at, starting at 0.
 * @param [options] Extra options to apply.
 * @param [options.placeHolder=""] Place holder HTML to insert into each created cell.
 * @returns {HTMLTableCellElement[]} An array of cells added to the table.
 */
function tableInsertRow(table, index, options) {
    var googTable = new GoogTable(table);
    return googTable.insertRow(index, options);
}

/**
 * Removes a row from a table.
 *
 * @param {HTMLTableElement} table The table to remove the row from.
 * @param {int} index Position to remove the row at, starting at 0.
 */
function tableDeleteRow(table, index) {
    resizeTable(table, -1, index, 0, 0);
}

/**
 * Return the x/y position of a table cell, taking into consideration the column/row span.
 *
 * @param {HTMLTableCellElement} cell The table cell to get the index for.
 * @returns {tableGetCellIndex.Anonym$0}
 */
function tableGetCellIndex(cell) {
    var x, y, tx, ty,
        matrix = [],
        rows = cell.parentNode.parentNode.parentNode.tBodies[0].rows;
    for (var r = 0; r < rows.length; r++) {
        y = rows[r].sectionRowIndex;
        y = r;
        for (var c = 0; c < rows[r].cells.length; c++) {
            x = c;
            while (matrix[y] && matrix[y][x]) {
                // Skip already occupied cells in current row
                x++;
            }
            for (tx = x; tx < x + (rows[r].cells[c].colSpan || 1); ++tx) {
                // Mark matrix elements occupied by current cell with true
                for (ty = y; ty < y + (rows[r].cells[c].rowSpan || 1); ++ty) {
                    if (!matrix[ty]) {
                        // Fill missing rows
                        matrix[ty] = [];
                    }
                    matrix[ty][tx] = true;
                }
            }
            if (cell === rows[r].cells[c]) {
                return {
                    x: x,
                    y: y
                };
            }
        }
    }
}

/**
 * Gets a table cell by a given index.
 *
 * @param {HTMLTableElement} table This is the table to get the cell from.
 * @param {int} index This is the index to find the cell.
 * @returns {HTMLTableCellElement|null} The cell at the specified index.
 */
function tableGetCellByIndex(table, index) {
    var rows = table.tBodies[0].rows;
    for (var r = 0; r < rows.length; r++) {
        for (var c = 0; c < rows[r].cells.length; c++) {
            var currentIndex = tableGetCellIndex(rows[r].cells[c]);
            if (currentIndex.x === index.x &&
                    currentIndex.y === index.y) {
                return rows[r].cells[c];
            }
        }
    }
    return null;
}

/**
 * Returns an array of cells found within the supplied indexes.
 *
 * @param {HTMLTableElement} table
 * @param {int} startIndex This is the index to start searching at.
 * @param {int} endIndex This is the index to stop searching at.
 * @returns {Array} An array of the cells in the range supplied.
 */
function tableCellsInRange(table, startIndex, endIndex) {
    var startX = Math.min(startIndex.x, endIndex.x),
        x = startX,
        y = Math.min(startIndex.y, endIndex.y),
        endX = Math.max(startIndex.x, endIndex.x),
        endY = Math.max(startIndex.y, endIndex.y),
        cells = [];
    while (y <= endY) {
        while (x <= endX) {
            var cell = tableGetCellByIndex(table, {
                x: x,
                y: y
            });
            if (cell !== null) {
                cells.push(cell);
            }
            x++;
        }
        x = startX;
        y++;
    }
    return cells;
}

/**
 * Checks if the cells selected can be merged.
 *
 * @param {HTMLTableElement} table The table to check the selection with.
 * @param {int} startX Selection's start x position.
 * @param {int} startY Selection's start y position.
 * @param {int} endX Selection's end x position.
 * @param {int} endY Selection's end y position.
 */
function tableCanMergeCells(table, startX, startY, endX, endY) {
}

/**
 * Merges the selected cells of a table.
 *
 * @param {HTMLTableElement} table This is the table that is going to have cells merged.
 * @param {int} startX This is the X coordinate to start merging the cells at.
 * @param {int} startY This is the Y coordinate to start merging the cells at.
 * @param {int} endX This is the X coordinate to stop merging the cells at.
 * @param {int} endY This is the Y coordinate to stop merging the cells at.
 */
function tableMergeCells(table, startX, startY, endX, endY) {
    var googTable = new GoogTable(table);
    googTable.mergeCells(startX, startY, endX, endY);
}

/**
 * Checks if the cell at the given index can be split.
 *
 * @param {HTMLTableElement} table Table to check the seleciton with.
 * @param {int} x The X coordinate of the cell to be checked.
 * @param {int} y Ths Y coordinate of the cell to be checked.
 */
function tableCanSplitCells(table, x, y) {
}

/**
 * Splits the selected cell of a table.
 *
 * @param {HTMLTableElement} table The table to find the cell to be split on.
 * @param {int} x The X coordinate of the cell to be split.
 * @param {int} y The Y coordinate of the cell to be split.
 */
function tableSplitCells(table, x, y) {
    var googTable = new GoogTable(table);
    googTable.splitCell(x, y);
}


function tableIsEmpty(table) {
    for (var i = 0, l = table.rows.length; i < l; i++) {
        if (table.rows[i].cells.length > 0) {
            return false;
        }
    }
    return true;
}
                /* End of file: temp/default/src/tools/table.js */
            
                /* File: temp/default/src/tools/template.js */
                /**
 * @fileOverview Template helper functions.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */

/**
 *
 * @type type
 */
var templateCache = { 'message': "<div class=\"{{baseClass}}-wrapper {{baseClass}}-type {{baseClass}}-{{type}}\">\n    <div class=\"ui-icon ui-fa fa-{{type}}\" \/>\n    <div class=\"{{baseClass}}-message\">{{message}}<\/div>\n    <div class=\"{{baseClass}}-close ui-icon ui-fa fa-circle-close\"><\/div>\n<\/div>\n",
'messages': "<div class=\"{{baseClass}}\" \/>\n",
'unsupported': "<div class=\"{{baseClass}}-unsupported-overlay\"><\/div>\n<div class=\"{{baseClass}}-unsupported-content\">\n    It has been detected that you a using a browser that is not supported by Raptor, please\n    use one of the following browsers:\n\n    <ul>\n        <li><a href=\"http:\/\/www.google.com\/chrome\">Google Chrome<\/a><\/li>\n        <li><a href=\"http:\/\/www.firefox.com\">Mozilla Firefox<\/a><\/li>\n        <li><a href=\"http:\/\/www.google.com\/chromeframe\">Internet Explorer with Chrome Frame<\/a><\/li>\n    <\/ul>\n\n    <div class=\"{{baseClass}}-unsupported-input\">\n        <button class=\"{{baseClass}}-unsupported-close\">Close<\/button>\n        <input name=\"{{baseClass}}-unsupported-show\" type=\"checkbox\" \/>\n        <label>Don't show this message again<\/label>\n    <\/div>\n<div>",
'class-menu.item': "<li><a data-value=\"{{value}}\">{{label}}<\/a><\/li>\n",
'click-button-to-edit.button': "<button class=\"{{baseClass}}-button\">_('clickButtonToEditPluginButton')<\/button>\n",
'color-menu-basic.menu': "<li><a data-color=\"automatic\"><div class=\"{{baseClass}}-swatch\" style=\"display: none\"><\/div> <span>_('colorMenuBasicAutomatic')<\/span><\/a><\/li>\n<li><a data-color=\"white\"><div class=\"{{baseClass}}-swatch\" style=\"background-color: #ffffff\"><\/div> <span>_('colorMenuBasicWhite')<\/span><\/a><\/li>\n<li><a data-color=\"black\"><div class=\"{{baseClass}}-swatch\" style=\"background-color: #000000\"><\/div> <span>_('colorMenuBasicBlack')<\/span><\/a><\/li>\n<li><a data-color=\"grey\"><div class=\"{{baseClass}}-swatch\" style=\"background-color: #999\"><\/div> <span>_('colorMenuBasicGrey')<\/span><\/a><\/li>\n<li><a data-color=\"blue\"><div class=\"{{baseClass}}-swatch\" style=\"background-color: #4f81bd\"><\/div> <span>_('colorMenuBasicBlue')<\/span><\/a><\/li>\n<li><a data-color=\"red\"><div class=\"{{baseClass}}-swatch\" style=\"background-color: #c0504d\"><\/div> <span>_('colorMenuBasicRed')<\/span><\/a><\/li>\n<li><a data-color=\"green\"><div class=\"{{baseClass}}-swatch\" style=\"background-color: #9bbb59\"><\/div> <span>_('colorMenuBasicGreen')<\/span><\/a><\/li>\n<li><a data-color=\"purple\"><div class=\"{{baseClass}}-swatch\" style=\"background-color: #8064a2\"><\/div> <span>_('colorMenuBasicPurple')<\/span><\/a><\/li>\n<li><a data-color=\"orange\"><div class=\"{{baseClass}}-swatch\" style=\"background-color: #f79646\"><\/div> <span>_('colorMenuBasicOrange')<\/span><\/a><\/li>\n",
'embed.dialog': "<div class=\"{{baseClass}}-panel-tabs ui-tabs ui-widget ui-widget-content ui-corner-all\">\n    <ul class=\"ui-tabs-nav ui-helper-reset ui-helper-clearfix ui-widget-header ui-corner-all\">\n        <li class=\"ui-state-default ui-corner-top ui-tabs-selected ui-state-active\"><a>_('embedDialogTabCode')<\/a><\/li>\n        <li class=\"ui-state-default ui-corner-top\"><a>_('embedDialogTabPreview')<\/a><\/li>\n    <\/ul>\n    <div class=\"{{baseClass}}-code-tab\">\n        <p>_('embedDialogTabCodeContent')<\/p>\n        <textarea><\/textarea>\n    <\/div>\n    <div class=\"{{baseClass}}-preview-tab\" style=\"display: none\">\n        <p>_('embedDialogTabPreviewContent')<\/p>\n        <div class=\"{{baseClass}}-preview\"><\/div>\n    <\/div>\n<\/div>\n",
'image-resize-button.button': "<div class=\"{{baseClass}}-button\">\n    _('imageResizeButtonText')\n<\/div>\n",
'image-resize-button.dialog': "<div class=\"raptor-resize-image\">\n    <div>\n        <label for=\"{{baseClass}}-width\">_('imageResizeButtonDialogWidth')<\/label>\n        <input class=\"form-text\" id=\"{{baseClass}}-width\" name=\"width\" type=\"text\" placeholder=\"_('imageResizeButtonDialogWidthPlaceHolder')\"\/>\n    <\/div>\n    <div>\n        <label for=\"{{baseClass}}-height\">_('imageResizeButtonDialogHeight')<\/label>\n        <input class=\"form-text\" id=\"{{baseClass}}-height\" name=\"height\" type=\"text\" placeholder=\"_('imageResizeButtonDialogHeightPlaceHolder')\"\/>\n    <\/div>\n    <div class=\"{{baseClass}}-lock-proportions-container\">\n        <span class=\"{{baseClass}}-lock-proportions\">\n            <span class=\"ui-button-text\">Constrain proportions<\/span>\n            <span class=\"ui-icon ui-fa fa-locked\"><\/span>\n        <\/span>\n    <\/div>\n<\/div>\n",
'insert-file.dialog': "<div>\n    <label>_('insertFileURLLabel')<\/label>\n    <input type=\"text\" name=\"location\" placeholder=\"_('insertFileURLPlaceHolder')\"\/>\n    <label>_('insertFileNameLabel')<\/label>\n    <input type=\"text\" name=\"name\" placeholder=\"_('insertFileNamePlaceHolder')\"\/>\n<\/div>\n",
'link.dialog': "<div style=\"display:none\" class=\"{{baseClass}}-panel\">\n    <div class=\"{{baseClass}}-menu\">\n        <p>_('linkCreateDialogMenuHeader')<\/p>\n        <fieldset data-menu=\"\"><\/fieldset>\n    <\/div>\n    <div class=\"{{baseClass}}-wrap\">\n        <div class=\"{{baseClass}}-content\" data-content=\"\"><\/div>\n    <\/div>\n<\/div>\n",
'link.document': "<h2>_('linkTypeDocumentHeader')<\/h2>\n<fieldset>\n    <label for=\"{{baseClass}}-document-href\">_('linkTypeDocumentLocationLabel')<\/label>\n    <input id=\"{{baseClass}}-document-href\" value=\"http:\/\/\" name=\"location\" class=\"{{baseClass}}-document-href\" type=\"text\" placeholder=\"_('linkTypeDocumentLocationPlaceHolder')\" \/>\n<\/fieldset>\n<h2>_('linkTypeDocumentNewWindowHeader')<\/h2>\n<fieldset>\n    <label for=\"{{baseClass}}-document-target\">\n        <input id=\"{{baseClass}}-document-target\" name=\"blank\" type=\"checkbox\" \/>\n        <span>_('linkTypeDocumentNewWindowLabel')<\/span>\n    <\/label>\n<\/fieldset>\n_('linkTypeDocumentInfo')\n",
'link.email': "<h2>_('linkTypeEmailHeader')<\/h2>\n<fieldset class=\"{{baseClass}}-email\">\n    <label for=\"{{baseClass}}-email\">_('linkTypeEmailToLabel')<\/label>\n    <input id=\"{{baseClass}}-email\" name=\"email\" type=\"text\" placeholder=\"_('linkTypeEmailToPlaceHolder')\"\/>\n<\/fieldset>\n<fieldset class=\"{{baseClass}}-email\">\n    <label for=\"{{baseClass}}-email-subject\">_('linkTypeEmailSubjectLabel')<\/label>\n    <input id=\"{{baseClass}}-email-subject\" name=\"subject\" type=\"text\" placeholder=\"_('linkTypeEmailSubjectPlaceHolder')\"\/>\n<\/fieldset>\n",
'link.error': "<div style=\"display:none\" class=\"ui-widget {{baseClass}}-error-message {{messageClass}}\">\n    <div class=\"ui-state-error ui-corner-all\"> \n        <p>\n            <span class=\"ui-icon ui-fa fa-alert\"><\/span> \n            {{message}}\n        <\/p>\n    <\/div>\n<\/div>",
'link.external': "<h2>_('linkTypeExternalHeader')<\/h2>\n<fieldset>\n    <label for=\"{{baseClass}}-external-href\">_('linkTypeExternalLocationLabel')<\/label>\n    <input id=\"{{baseClass}}-external-href\" value=\"http:\/\/\" name=\"location\" class=\"{{baseClass}}-external-href\" type=\"text\" placeholder=\"_('linkTypeExternalLocationPlaceHolder')\" \/>\n<\/fieldset>\n<h2>_('linkTypeExternalNewWindowHeader')<\/h2>\n<fieldset>\n    <label for=\"{{baseClass}}-external-target\">\n        <input id=\"{{baseClass}}-external-target\" name=\"blank\" type=\"checkbox\" \/>\n        <span>_('linkTypeExternalNewWindowLabel')<\/span>\n    <\/label>\n<\/fieldset>\n_('linkTypeExternalInfo')\n",
'link.file-url': "<h2>_('Link to a document or other file')<\/h2>\n<fieldset>\n    <label for=\"{{baseClass}}-external-href\">_('Location')<\/label>\n    <input id=\"{{baseClass}}-external-href\" value=\"http:\/\/\" name=\"location\" class=\"{{baseClass}}-external-href\" type=\"text\" placeholder=\"_('Enter your URL')\" \/>\n<\/fieldset>\n<h2>_('New window')<\/h2>\n<fieldset>\n    <label for=\"{{baseClass}}-external-target\">\n        <input id=\"{{baseClass}}-external-target\" name=\"blank\" type=\"checkbox\" \/>\n        <span>_('Check this box to have the file open in a new browser window')<\/span>\n    <\/label>\n<\/fieldset>\n<h2>_('Not sure what to put in the box above?')<\/h2>\n<ol>\n    <li>_('Ensure the file has been uploaded to your website')<\/li>\n    <li>_('Open the uploaded file in your browser')<\/li>\n    <li>_(\"Copy the file's URL from your browser's address bar and paste it into the box above\")<\/li>\n<\/ol>\n",
'link.internal': "<h2>_('linkTypeInternalHeader')<\/h2>\n<fieldset>\n    <label for=\"{{baseClass}}-internal-href\">_('linkTypeInternalLocationLabel') {{domain}}<\/label>\n    <input id=\"{{baseClass}}-internal-href\" value=\"\" name=\"location\" class=\"{{baseClass}}-internal-href\" type=\"text\" placeholder=\"_('linkTypeInternalLocationPlaceHolder')\" \/>\n<\/fieldset>\n<h2>_('linkTypeInternalNewWindowHeader')<\/h2>\n<fieldset>\n    <label for=\"{{baseClass}}-internal-target\">\n        <input id=\"{{baseClass}}-internal-target\" name=\"blank\" type=\"checkbox\" \/>\n        <span>_('linkTypeInternalNewWindowLabel')<\/span>\n    <\/label>\n<\/fieldset>\n_('linkTypeInternalInfo')\n",
'link.label': "<label>\n    <input type=\"radio\" name=\"link-type\" autocomplete=\"off\"\/>\n    <span>{{label}}<\/span>\n<\/label>\n",
'paste.dialog': "<div class=\"{{baseClass}}-panel ui-dialog-content ui-widget-content\">\n    <div class=\"{{baseClass}}-panel-tabs ui-tabs ui-widget ui-widget-content ui-corner-all\">\n        <ul class=\"ui-tabs-nav ui-helper-reset ui-helper-clearfix ui-widget-header ui-corner-all\">\n            <li class=\"{{baseClass}}-tab-plain-text ui-state-default ui-corner-top\" style=\"display: none\"><a>_('pasteDialogPlain')<\/a><\/li>\n            <li class=\"{{baseClass}}-tab-formatted-clean ui-state-default ui-corner-top\" style=\"display: none\"><a>_('pasteDialogFormattedCleaned')<\/a><\/li>\n            <li class=\"{{baseClass}}-tab-formatted-unclean ui-state-default ui-corner-top\" style=\"display: none\"><a>_('pasteDialogFormattedUnclean')<\/a><\/li>\n            <li class=\"{{baseClass}}-tab-source ui-state-default ui-corner-top\" style=\"display: none\"><a>_('pasteDialogSource')<\/a><\/li>\n        <\/ul>\n        <div class=\"{{baseClass}}-content-plain-text\" style=\"display: none\">\n            <textarea class=\"{{baseClass}}-area {{baseClass}}-plain\"><\/textarea>\n        <\/div>\n        <div class=\"{{baseClass}}-content-formatted-clean\" style=\"display: none\">\n            <div contenteditable=\"true\" class=\"{{baseClass}}-area {{baseClass}}-markup\"><\/div>\n        <\/div>\n        <div class=\"{{baseClass}}-content-formatted-unclean\" style=\"display: none\">\n            <div contenteditable=\"true\" class=\"{{baseClass}}-area {{baseClass}}-rich\"><\/div>\n        <\/div>\n        <div class=\"{{baseClass}}-content-source\" style=\"display: none\">\n            <textarea class=\"{{baseClass}}-area {{baseClass}}-source\"><\/textarea>\n        <\/div>\n    <\/div>\n<\/div>\n",
'snippet-menu.item': "<li><a data-name=\"{{name}}\">{{name}}<\/a><\/li>",
'statistics.dialog': "<div>\n    <ul>\n        <li data-name=\"characters\"><\/li>\n        <li data-name=\"words\"><\/li>\n        <li data-name=\"sentences\"><\/li>\n        <li data-name=\"truncation\"><\/li>\n    <\/ul>\n<\/div>\n",
'table.create-menu': "<table class=\"{{baseClass}}-menu\">\n    <tr>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n    <\/tr>\n    <tr>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n    <\/tr>\n    <tr>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n    <\/tr>\n    <tr>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n    <\/tr>\n    <tr>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n    <\/tr>\n    <tr>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n    <\/tr>\n    <tr>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n    <\/tr>\n    <tr>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n        <td><\/td>\n    <\/tr>\n<\/table>\n",
'tag-menu.menu': "<li><a data-value=\"na\">_('tagMenuTagNA')<\/a><\/li>\n<li><a data-value=\"p\">_('tagMenuTagP')<\/a><\/li>\n<li><a data-value=\"h1\">_('tagMenuTagH1')<\/a><\/li>\n<li><a data-value=\"h2\">_('tagMenuTagH2')<\/a><\/li>\n<li><a data-value=\"h3\">_('tagMenuTagH3')<\/a><\/li>\n<li><a data-value=\"h4\">_('tagMenuTagH4')<\/a><\/li>\n<li><a data-value=\"div\">_('tagMenuTagDiv')<\/a><\/li>\n<li><a data-value=\"pre\">_('tagMenuTagPre')<\/a><\/li>\n<li><a data-value=\"address\">_('tagMenuTagAddress')<\/a><\/li>\n",
'unsaved-edit-warning.warning': "<div class=\"{{baseClass}} ui-corner-tl\">\n    <span class=\"ui-icon ui-fa fa-alert\"><\/span>\n    <span>_('unsavedEditWarningText')<\/span>\n<\/div>\n",
'view-source.dialog': "<div class=\"{{baseClass}}-inner-wrapper\">\n    <textarea><\/textarea>\n<\/div>\n",
'special-characters.dialog': "<div>\n    _('specialCharactersHelp')\n    <br\/>\n    <ul><\/ul>\n<\/div>\n",
'special-characters.tab-li': "<li><a href=\"#{{baseClass}}-{{key}}\">{{name}}<\/a><\/li>\n",
'special-characters.tab-content': "<div id=\"{{baseClass}}-{{key}}\"><\/div>\n",
'special-characters.tab-button': "<button data-setKey=\"{{setKey}}\" data-charactersIndex=\"{{charactersIndex}}\" title=\"{{description}}\">{{htmlEntity}}<\/button>\n" };

/**
 *
 * @param {type} name
 * @param {type} urlPrefix
 * @returns {templateGet.name}
 */
function templateGet(name, urlPrefix) {
    if (templateCache[name]) {
        return templateCache[name];
    }

    // Parse the URL
    var url = urlPrefix;
    var split = name.split('.');
    if (split.length === 1) {
        // URL is for an editor core template
        url += 'templates/' + split[0] + '.html';
    } else {
        // URL is for a plugin template
        url += 'plugins/' + split[0] + '/templates/' + split.splice(1).join('/') + '.html';
    }

    // Request the template
    var template;
    $.ajax({
        url: url,
        type: 'GET',
        async: false,
        // <debug/>
        // 15 seconds
        timeout: 15000,
        error: function() {
            template = null;
        },
        success: function(data) {
            template = data;
        }
    });

    // Cache the template
    templateCache[name] = template;

    return template;
};

/**
 *
 * @param {type} template
 * @param {type} variables
 * @returns {unresolved}
 */
function templateConvertTokens(template, variables) {
    // Translate template
    template = template.replace(/_\(['"]{1}(.*?)['"]{1}\)/g, function(match, key) {
        key = key.replace(/\\(.?)/g, function (s, slash) {
            switch (slash) {
                case '\\': {
                    return '\\';
                }
                case '0': {
                    return '\u0000';
                }
                case '': {
                    return '';
                }
                default: {
                    return slash;
                }
            }
        });
        return _(key);
    });

    // Replace variables
    variables = $.extend({}, this.options, variables || {});
    variables = templateGetVariables(variables);
    template = template.replace(/\{\{(.*?)\}\}/g, function(match, variable) {
        // <debug/>
        return variables[variable];
    });

    return template;
};

/**
 *
 * @param {type} variables
 * @param {type} prefix
 * @param {type} depth
 * @returns {unresolved}
 */
function templateGetVariables(variables, prefix, depth) {
    prefix = prefix ? prefix + '.' : '';
    var maxDepth = 5;
    if (!depth) depth = 1;
    var result = {};
    for (var name in variables) {
        if (typeof variables[name] === 'object' && depth < maxDepth) {
            var inner = templateGetVariables(variables[name], prefix + name, ++depth);
            for (var innerName in inner) {
                result[innerName] = inner[innerName];
            }
        } else {
            result[prefix + name] = variables[name];
        }
    }
    return result;
};

                /* End of file: temp/default/src/tools/template.js */
            
                /* File: temp/default/src/tools/types.js */
                /**
 * @fileOverview Type checking functions.
 * @license http://www.raptor-editor.com/license
 *
 * @author Michael Robinson michael@panmedia.co.nz
 * @author David Neilsen david@panmedia.co.nz
 */

/**
 * Determine whether object is a number
 * {@link http://stackoverflow.com/a/1421988/187954}.
 *
 * @param  {mixed} object The object to be tested
 * @return {Boolean} True if the object is a number.
 */
function typeIsNumber(object) {
    return !isNaN(object - 0) && object !== null;
}

/**
 * Determines whether object is a node.
 *
 * @param {mixed} object The object to be tested.
 * @returns {Boolean} True if the object is a node.
 */
function typeIsNode(object) {
    return object instanceof Node;
}

/**
 * @param  {mixed} object
 * @return {boolean} True if object is a text node.
 */
function typeIsTextNode(object) {
    if (typeIsNode(object)) {
        return object.nodeType === Node.TEXT_NODE;
    }

    if (typeIsElement(object)) {
        return typeIsNode(object[0]);
    }

    return false;
}

/**
 * Determines whether object is an element.
 *
 * @param {mixed} object The object to be tested.
 * @returns {Boolean} True if the object is an element.
 */
function typeIsElement(object) {
    return object instanceof jQuery;
}

/**
 * Determines whether object is a range.
 *
 * @param {mixed} object The object to be tested.
 * @returns {Boolean} True if the object is a range.
 */
function typeIsRange(object) {
    return object instanceof rangy.WrappedRange;
}

/**
 * Determines whether object is a selection.
 *
 * @param {mixed} object The object to be tested.
 * @returns {Boolean} True if the object is a selection.
 */
function typeIsSelection(object) {
    return object instanceof rangy.WrappedSelection;
}

/**
 * Determines whether object is a string.
 *
 * @param {mixed} object The object to be tested.
 * @returns {Boolean} True if the object is a string.
 */
function typeIsString(object) {
    return typeof object === 'string';
}

/**
 * @param  {mixed} object
 * @return {boolean} True if object is an Array.
 */
function typeIsArray(object) {
    return object instanceof Array;
}

                /* End of file: temp/default/src/tools/types.js */
            
                /* File: temp/default/src/raptor.js */
                /**
 * @class
 */
var Raptor =  {

    globalDefaults: {},
    defaults: {},
            
    /** @type {Boolean} True to enable hotkeys */
    enableHotkeys: true,

    /** @type {Object} Custom hotkeys */
    hotkeys: {},

    /**
     * Events added via Raptor.bind
     * @property {Object} events
     */
    events: {},

    /**
     * Plugins added via Raptor.registerPlugin
     * @property {Object} plugins
     */
    plugins: {},

    /**
     * UI added via Raptor.registerUi
     * @property {Object} ui
     */
    ui: {},

    /**
     * Layouts added via Raptor.registerLayout
     * @property {Object} layouts
     */
    layouts: {},

    /**
     * Presets added via Raptor.registerPreset
     * @property {Object} presets
     */
    presets: {},

    hoverPanels: {},

    /**
     * @property {Raptor[]} instances
     */
    instances: [],

    /**
     * @returns {Raptor[]}
     */
    getInstances: function() {
        return this.instances;
    },

    eachInstance: function(callback) {
        for (var i = 0; i < this.instances.length; i++) {
            callback.call(this.instances[i], this.instances[i]);
        }
    },

    /*========================================================================*\
     * Templates
    \*========================================================================*/
    /**
     * @property {String} urlPrefix
     */
    urlPrefix: '/raptor/',

    /**
     * @param {String} name
     * @returns {String}
     */
    getTemplate: function(name, urlPrefix) {
        var template;
        if (!this.templates[name]) {
            // Parse the URL
            var url = urlPrefix || this.urlPrefix;
            var split = name.split('.');
            if (split.length === 1) {
                // URL is for and editor core template
                url += 'templates/' + split[0] + '.html';
            } else {
                // URL is for a plugin template
                url += 'plugins/' + split[0] + '/templates/' + split.splice(1).join('/') + '.html';
            }

            // Request the template
            $.ajax({
                url: url,
                type: 'GET',
                async: false,
                // <debug/>
                // 15 seconds
                timeout: 15000,
                error: function() {
                    template = null;
                },
                success: function(data) {
                    template = data;
                }
            });
            // Cache the template
            this.templates[name] = template;
        } else {
            template = this.templates[name];
        }
        return template;
    },

    /*========================================================================*\
     * Helpers
    \*========================================================================*/

    /**
     * @returns {boolean}
     */
    isDirty: function() {
        var instances = this.getInstances();
        for (var i = 0; i < instances.length; i++) {
            if (instances[i].isDirty()) return true;
        }
        return false;
    },

    /**
     *
     */
    unloadWarning: function() {
        var instances = this.getInstances();
        for (var i = 0; i < instances.length; i++) {
            if (instances[i].isDirty() &&
                    instances[i].isEditing() &&
                    instances[i].options.unloadWarning) {
                return _('navigateAway');
            }
        }
    },

    /*========================================================================*\
     * Plugins as UI
    \*========================================================================*/

    /**
     * Registers a new UI component, overriding any previous UI components registered with the same name.
     *
     * @param {String} name
     * @param {Object} ui
     */
    registerUi: function(ui) {
        // <strict/>
        this.ui[ui.name] = ui;
    },

    /**
     * Registers a new layout, overriding any previous layout registered with the same name.
     *
     * @param {String} name
     * @param {Object} layout
     */
    registerLayout: function(layout) {
        // <strict/>

        this.layouts[layout.name] = layout;
    },

    registerPlugin: function(plugin) {
        // <strict/>

        this.plugins[plugin.name] = plugin;
    },
            
    registerPreset: function(preset, setDefault) {
        // <strict/>

        this.presets[preset.name] = preset;
        if (setDefault) {
            this.defaults = preset;
        }
    },

    /*========================================================================*\
     * Events
    \*========================================================================*/

    /**
     * @param {String} name
     * @param {function} callback
     */
    bind: function(name, callback) {
        if (!this.events[name]) this.events[name] = [];
        this.events[name].push(callback);
    },

    /**
     * @param {function} callback
     */
    unbind: function(callback) {
        $.each(this.events, function(name) {
            for (var i = 0; i < this.length; i++) {
                if (this[i] === callback) {
                    this.events[name].splice(i,1);
                }
            }
        });
    },

    /**
     * @param {String} name
     */
    fire: function(name) {
        // <debug/>
        if (!this.events[name]) {
            return;
        }
        for (var i = 0, l = this.events[name].length; i < l; i++) {
            this.events[name][i].call(this);
        }
    },

    /*========================================================================*\
     * Persistance
    \*========================================================================*/
    /**
     * @param {String} key
     * @param {mixed} value
     * @param {String} namespace
     */
    persist: function(key, value, namespace) {
        key = namespace ? namespace + '.' + key : key;
        if (localStorage) {
            var storage;
            if (localStorage.uiWidgetEditor) {
                storage = JSON.parse(localStorage.uiWidgetEditor);
            } else {
                storage = {};
            }
            if (value === undefined) return storage[key];
            storage[key] = value;
            localStorage.uiWidgetEditor = JSON.stringify(storage);
        }

        return value;
    }

};

                /* End of file: temp/default/src/raptor.js */
            
                /* File: temp/default/src/raptor-widget.js */
                /**
 *
 * @author David Neilsen - david@panmedia.co.nz
 * @author Michael Robinson - michael@panmedia.co.nz
 * @version 0.1
 * @requires jQuery
 * @requires jQuery UI
 * @requires Rangy
 */

/**
 * Set to true when raptor is reloading the page after it has disabled editing.
 *
 * @type Boolean
 */
var disabledReloading = false;

/**
 * @class
 */
var RaptorWidget = {

    /**
     * @constructs RaptorWidget
     */
    _init: function() {
        // Prevent double initialisation
        if (this.element.attr('data-raptor-initialised')) {
            // <debug/>
            return;
        }
        this.element.attr('data-raptor-initialised', true);

        // Add the editor instance to the global list of instances
        if ($.inArray(this, Raptor.instances) === -1) {
            Raptor.instances.push(this);
        }

        var currentInstance = this;

        // <strict/>

        // Set the initial locale
        var locale = this.persist('locale') || this.options.initialLocale;
        if (locale) {
            currentLocale = locale;
        }

        if (this.options.preset) {
            this.options = $.extend({}, Raptor.globalDefaults, Raptor.presets[this.options.preset], this.options);
        } else {
            this.options = $.extend({}, Raptor.globalDefaults, Raptor.defaults, this.options);
        }

        // Give the element a unique ID
        if (!this.element.attr('id')) {
            this.element.attr('id', elementUniqueId());
        }

        // Initialise properties
        this.ready = false;
        this.events = {};
        this.plugins = {};
        this.layouts = {};
        this.templates = $.extend({}, Raptor.templates);
        this.target = this.element;
        this.layout = null;
        this.previewState = null;
        this.pausedState = null;
        this.pausedScrollX = null;
        this.pausedScrollY = null;

        // True if editing is enabled
        this.enabled = false;

        // True if editing is enabled at least once
        this.initialised = false;

        // List of UI objects bound to the editor
        this.uiObjects = {};

        // List of hotkeys bound to the editor
        this.hotkeys = {};
        this.hotkeysSuspended = false;

        // If hotkeys are enabled, register any custom hotkeys provided by the user
        if (this.options.enableHotkeys) {
            this.registerHotkey(this.hotkeys);
        }

        // Bind default events
        for (var name in this.options.bind) {
            this.bind(name, this.options.bind[name]);
        }

        // Undo stack, redo pointer
        this.history = [];
        this.present = 0;
        this.historyEnabled = true;

        // Check for browser support
        if (!isSupported()) {
            // @todo If element isn't a textarea, replace it with one
            return;
        }

        // Store the original HTML
        this.setOriginalHtml(this.element.is(':input') ? this.element.val() : this.element.html());
        this.historyPush(this.getOriginalHtml());

        // Replace textareas/inputs with a div
        if (this.element.is(':input')) {
            this.replaceOriginal();
        }

        // Load plugins
        this.loadPlugins();

        // Stores if the current state of the content is clean
        this.dirty = false;

        // Stores the previous state of the content
        this.previousContent = null;

        // Stores the previous selection
        this.previousSelection = null;

        this.getElement().addClass('raptor-editable-block');

        this.loadLayouts();

        // Fire the ready event
        this.ready = true;
        this.fire('ready');

        // Automatically enable the editor if autoEnable is true
        if (this.options.autoEnable) {
            $(function() {
                currentInstance.enableEditing();
            });
        }
    },

    /*========================================================================*\
     * Core functions
    \*========================================================================*/

    /**
     * Attaches the editor's internal events.
     *
     * @fires RaptorWidget#resize
     */
    attach: function() {
        this.bind('change', this.historyPush);

        this.getElement().on('click.' + this.widgetName, 'img', function(event) {
            selectionSelectOuter(event.target);
            this.checkSelectionChange();
        }.bind(this));
        this.getElement().bind('focus', this.showLayout.bind(this));
        this.target.bind('mouseup.' + this.widgetName, this.checkSelectionChange.bind(this));
        this.target.bind('keyup.' + this.widgetName, this.checkChange.bind(this));

        // Unload warning
        $(window).bind('beforeunload', Raptor.unloadWarning.bind(Raptor));

        // Trigger editor resize when window is resized
        var editor = this;
        $(window).resize(function(event) {
            editor.fire('resize');
        });
    },

    /**
     * Detaches the editor's internal events.
     */
    detach: function() {
        this.unbind('change');
        this.getElement().off('click.' + this.widgetName, 'img');
        this.getElement().unbind('focus');
        this.getElement().blur();

        this.target.unbind('mouseup.' + this.widgetName);
        this.target.unbind('keyup.' + this.widgetName);
    },

    /**
     * Reinitialises the editor, unbinding all events, destroys all UI and plugins
     * then recreates them.
     */
    localeChange: function() {
        if (!this.ready) {
            // If the edit is still initialising, wait until its ready
            var localeChange;
            localeChange = function() {
                // Prevent reinit getting called twice
                this.unbind('ready', localeChange);
                this.localeChange();
            };
            this.bind('ready', localeChange);
            return;
        }

        this.actionPreviewRestore();
        var visibleLayouts = [];
        for (var name in this.layouts) {
            if (this.layouts[name].isVisible()) {
                visibleLayouts.push(name);
            }
        }
        this.layoutsDestruct();
        this.events = {};
        this.plugins = {};
        this.uiObjects = {};
        this.hotkeys = {};
        this.loadPlugins();
        this.loadLayouts();
        for (var i = 0; i < visibleLayouts.length; i++) {
            this.layouts[visibleLayouts[i]].show();
        }
        this.checkSelectionChange();
    },

    /**
     * Restore focus to the element being edited.
     */
    restoreFocus: function() {
        this.getElement().focus();
    },

    /**
     * Returns the current content editable element, which will be either the
     * orignal element, or the div the orignal element was replaced with.
     * @returns {jQuery} The current content editable element
     */
    getElement: function() {
        return this.target;
    },

    getNode: function() {
        return this.target[0];
    },

    /**
     *
     */
    getOriginalElement: function() {
        return this.element;
    },

    /**
     * Replaces the original element with a content editable div. Typically used
     * to replace a textarea.
     */
    replaceOriginal: function() {
        if (!this.target.is(':input')) return;

        // Create the replacement div
        var target = $('<div/>')
            // Set the HTML of the div to the HTML of the original element, or if the original element was an input, use its value instead
            .html(this.element.val())
            // Insert the div before the original element
            .insertBefore(this.element)
            // Give the div a unique ID
            .attr('id', elementUniqueId())
            // Copy the original elements class(es) to the replacement div
            .addClass(this.element.attr('class'))
            // Add custom classes
            .addClass(this.options.classes);

        var style = elementGetStyles(this.element);
        for (var i = 0; i < this.options.replaceStyle.length; i++) {
            target.css(this.options.replaceStyle[i], style[this.options.replaceStyle[i]]);
        }

        this.element.hide();
        this.bind('change', function() {
            if (this.getOriginalElement().is(':input')) {
                this.getOriginalElement().val(this.getHtml());
            } else {
                this.getOriginalElement().html(this.getHtml());
            }
        });

        this.target = target;
    },

    checkSelectionChange: function() {
        // Check if the caret has changed position
        var currentSelection = rangy.serializeSelection(null, false);
        if (this.previousSelection !== currentSelection) {
            this.fire('selectionChange');
        }
        this.previousSelection = currentSelection;
    },

    /**
     * Determine whether the editing element's content has been changed.
     */
    checkChange: function() {
        // Get the current content
        var currentHtml = this.getHtml();

        // Check if the dirty state has changed
        var wasDirty = this.dirty;

        // Check if the current content is different from the original content
        this.dirty = this.originalHtml !== currentHtml;

        // If the current content has changed since the last check, fire the change event
        if (this.previousHtml !== currentHtml) {
            this.previousHtml = currentHtml;
            this.fire('change');

            // If the content was changed to its original state, fire the cleaned event
            if (wasDirty !== this.dirty) {
                if (this.dirty) {
                    this.fire('dirty');
                } else {
                    this.fire('cleaned');
                }
            }

            this.checkSelectionChange();
        }
    },

    change: function() {
        this.fire('change');
    },

    /*========================================================================*\
     * Destructor
    \*========================================================================*/

    /**
     * Hides the toolbar, disables editing, and fires the destroy event, and unbinds any events.
     * @public
     */
    destruct: function(reinitialising) {
        this.disableEditing();

        // Trigger destroy event, for plugins to remove them selves
        this.fire('destroy', false);

        // Remove all event bindings
        this.events = {};

        // Unbind all events
        this.getElement().unbind('.' + this.widgetName);

        if (this.getOriginalElement().is(':input')) {
            this.target.remove();
            this.target = null;
            this.element.show();
        }

        this.layoutsDestruct();
    },

    /**
     * Runs destruct, then calls the UI widget destroy function.
     * @see $.
     */
//    destroy: function() {
//        this.destruct();
//        $.Widget.prototype.destroy.call(this);
//    },

    /*========================================================================*\
     * Preview functions
    \*========================================================================*/

    actionPreview: function(action) {
        this.actionPreviewRestore();
        try {
            var ranges = this.fire('selectionCustomise');
            if (ranges.length > 0) {
                this.previewState = actionPreview(this.previewState, this.target, function() {
                    for (var i = 0, l = ranges.length; i < l; i++) {
                        rangy.getSelection().setSingleRange(ranges[i]);
                        this.selectionConstrain();
                        action();
                    }
                }.bind(this));
            } else {
                this.selectionConstrain();
                this.previewState = actionPreview(this.previewState, this.target, action);
            }
        } catch (exception) {
            // <strict/>
        }
    },

    actionPreviewRestore: function() {
        if (this.previewState) {
            this.target = actionPreviewRestore(this.previewState, this.target);
            this.previewState = null;
        }
    },

    actionApply: function(action) {
        this.actionPreviewRestore();
        var state = this.stateSave();
        try {
            var ranges = this.fire('selectionCustomise');
            if (ranges.length > 0) {
                actionApply(function() {
                    for (var i = 0, l = ranges.length; i < l; i++) {
                        rangy.getSelection().setSingleRange(ranges[i]);
                        this.selectionConstrain();
                        actionApply(action, this.history);
                    }
                }.bind(this), this.history);
            } else {
                this.selectionConstrain();
                actionApply(action, this.history);
            }
            this.checkChange();
        } catch (exception) {
            this.stateRestore(state);
            // <strict/>
        }
    },

    actionUndo: function() { },

    actionRedo: function() { },

    stateSave: function() {
        this.selectionConstrain();
        return stateSave(this.target);
    },

    stateRestore: function(state) {
        // if (!this.isEditing()) {
        //     return;
        // }
        var restoredState = stateRestore(this.target, state),
            selection = rangy.getSelection();
        this.target = restoredState.element;
        if (restoredState.ranges !== null) {
            selection.setRanges(restoredState.ranges);
            selection.refresh();
        }
    },

    selectionConstrain: function() {
        selectionConstrain(this.target[0]);
    },

    pause: function() {
        if (!this.pausedState) {
            this.pausedState = this.stateSave()
            this.suspendHotkeys();
            // <jquery-ui>
            // Hack to fix when a dialog is closed, the editable element is focused, and the scroll jumps to the top
            this.pausedScrollX = window.scrollX;
            this.pausedScrollY = window.scrollY;
            // </jquery-ui>
        }
    },

    resume: function() {
        if (this.pausedState) {
            this.stateRestore(this.pausedState);
            this.pausedState = null;
            this.resumeHotkeys();
            this.restoreFocus();
            // <jquery-ui>
            window.scrollTo(this.pausedScrollX, this.pausedScrollY);
            // </jquery-ui>
        }
    },

    /*========================================================================*\
     * Persistance Functions
    \*========================================================================*/

    /**
     * @param {String} key
     * @param {mixed} [value]
     * @returns {mixed}
     */
    persist: function(key, value) {
        if (!this.options.persistence) return null;
        return Raptor.persist(key, value, this.options.namespace);
    },

    /*========================================================================*\
     * Other Functions
    \*========================================================================*/

    /**
     *
     */
    enableEditing: function() {
        if (!this.enabled) {
            this.fire('enabling');

            // Attach core events
            this.attach();

            this.enabled = true;

            this.getElement()
                .addClass(this.options.baseClass + '-editing')
                .addClass(this.options.classes);

            if (this.options.partialEdit) {
                this.getElement().find(this.options.partialEdit).prop('contenteditable', true);
            } else {
                this.getElement().prop('contenteditable', true);
            }

            if (!this.initialised) {
                this.initialised = true;
                try {
                    document.execCommand('enableInlineTableEditing', false, false);
                    document.execCommand('styleWithCSS', true, true);
                } catch (error) {
                    // <strict/>
                }

                for (var name in this.plugins) {
                    this.plugins[name].enable();
                }

                this.bindHotkeys();

                this.getElement().closest('form').bind('submit.' + this.widgetName, function() {
                    clean(this.getElement());
                    this.fire('change');
                }.bind(this));
            }

            clean(this.getElement());
            this.fire('enabled');
            this.showLayout();
        }
    },

    /**
     *
     */
    disableEditing: function() {
        if (this.enabled) {
            this.detach();
            this.enabled = false;
            this.getElement()
                .prop('contenteditable', false)
                .removeClass(this.options.baseClass + '-editing')
                .removeClass(this.options.classes);
            rangy.getSelection().removeAllRanges();
            this.fire('disabled');
            if (this.options.reloadOnDisable && !disabledReloading) {
                disabledReloading = true;
                window.location.reload();
            }
        }
    },

    cancelEditing: function() {
        this.unify(function(raptor) {
            raptor.stopEditing();
        });
    },

    stopEditing: function() {
        this.fire('cancel');
        if (!this.options.reloadOnDisable) {
            this.resetHtml();
        }
        this.disableEditing();
        this.dirty = false;
        selectionDestroy();
    },

    /**
     *
     * @returns {boolean}
     */
    isEditing: function() {
        return this.enabled;
    },

    /**
     * @param {jQuerySelector|jQuery|Element} element
     * @returns {boolean}
     */
    isRoot: function(element) {
        return this.getElement()[0] === $(element)[0];
    },

    /**
     * @param {function} callback
     * @param {boolean} [callSelf]
     */
    unify: function(callback, callSelf) {
        if (callSelf !== false) {
            callback(this);
        }
        if (this.options.unify) {
            var currentInstance = this;
            Raptor.eachInstance(function(instance) {
                if (instance === currentInstance) {
                    return;
                }
                if (instance.options.unify) {
                    callback(instance);
                }
            });
        }
    },

    /*========================================================================*\
     * Layout
    \*========================================================================*/
    getLayout: function(type) {
        // <strict/>
        return this.layouts[type];
    },

    loadLayouts: function() {
        for (var name in this.options.layouts) {
            // <strict/>
            this.layouts[name] = this.prepareComponent(Raptor.layouts[name], this.options.layouts[name], 'layout').instance;

            if (this.layouts[name].hotkeys) {
                this.registerHotkey(this.layouts[name].hotkeys, null, this.layouts[name]);
            }
        }
    },

    layoutsDestruct: function() {
        for (var name in this.layouts) {
            this.layouts[name].destruct();
        }
    },

    prepareComponent: function(component, componentOptions, prefix) {
        var instance = $.extend({}, component);

        var baseClass = component.name.replace(/([A-Z])/g, function(match) {
            return '-' + match.toLowerCase();
        });

        var options = $.extend({}, this.options, {
            baseClass: this.options.baseClass + '-' + prefix + '-' + baseClass
        }, instance.options, componentOptions);

        instance.raptor = this;
        instance.options = options;
        // <strict/>
        var init = instance.init();

        return {
            init: init,
            instance: instance
        };
    },

    /**
     * Show the layout for the current element.
     */
    showLayout: function() {
        // <debug/>

        // If unify option is set, hide all other layouts first
        this.unify(function(raptor) {
            raptor.fire('layoutHide');
        }, false);

        this.fire('layoutShow');

        this.fire('resize');
        if (typeof this.getElement().attr('tabindex') === 'undefined') {
            this.getElement().attr('tabindex', -1);
        }
    },

    /*========================================================================*\
     * Template functions
    \*========================================================================*/

    /**
     * @param {String} name
     * @param {Object} variables
     */
    getTemplate: function(name, variables) {
        if (!this.templates[name]) {
            this.templates[name] = templateGet(name, this.options.urlPrefix);
        }
        // <strict/>
        return templateConvertTokens(this.templates[name], variables);
    },

    /*========================================================================*\
     * History functions
    \*========================================================================*/

    /**
     *
     */
    historyPush: function() {
        if (!this.historyEnabled) return;
        var html = this.getHtml();
        if (html !== this.historyPeek()) {
            // Reset the future on change
            if (this.present !== this.history.length - 1) {
                this.history = this.history.splice(0, this.present + 1);
            }

            // Add new HTML to the history
            this.history.push(this.getHtml());

            // Mark the persent as the end of the history
            this.present = this.history.length - 1;

            this.fire('historyChange');
        }
    },

    /**
     * @returns {String|null}
     */
    historyPeek: function() {
        if (!this.history.length) return null;
        return this.history[this.present];
    },

    /**
     *
     */
    historyBack: function() {
        if (this.present > 0) {
            this.present--;
            this.setHtml(this.history[this.present]);
            this.historyEnabled = false;
            this.change();
            this.historyEnabled = true;
            this.fire('historyChange');
        }
    },

    /**
     *
     */
    historyForward: function() {
        if (this.present < this.history.length - 1) {
            this.present++;
            this.setHtml(this.history[this.present]);
            this.historyEnabled = false;
            this.change();
            this.historyEnabled = true;
            this.fire('historyChange');
        }
    },

    /*========================================================================*\
     * Hotkeys
    \*========================================================================*/

    /**
     * @param {Array|String} mixed The hotkey name or an array of hotkeys
     * @param {Object} The hotkey object or null
     */
    registerHotkey: function(mixed, action) {
        // <strict/>

        this.hotkeys[mixed] = action;
    },

    bindHotkeys: function() {
        for (var keyCombination in this.hotkeys) {
            this.getElement().bind('keydown.' + this.widgetName, keyCombination, function(event) {
                if (this.isEditing() && !this.hotkeysSuspended) {
                    var result = this.hotkeys[event.data]();
                    if (result !== false) {
                        event.preventDefault();
                    }
                }
            }.bind(this));
        }
    },

    /**
     * Suspend hotkey functionality.
     */
    suspendHotkeys: function() {
        // <debug/>
        this.hotkeysSuspended = true;
    },

    /**
     * Resume hotkey functionality.
     */
    resumeHotkeys: function() {
        // <debug/>
        this.hotkeysSuspended = false;
    },

    /*========================================================================*\
     * Buttons
    \*========================================================================*/

    isUiEnabled: function(ui) {
        // Check if we are not automatically enabling UI, and if not, check if the UI was manually enabled
        if (this.options.enableUi === false &&
                typeof this.options.plugins[ui] === 'undefined' ||
                this.options.plugins[ui] === false) {
            // <debug/>
            return false;
        }

        // Check if we have explicitly disabled UI
        if ($.inArray(ui, this.options.disabledUi) !== -1) {
            return false;
        }

        return true;
    },

    /**
     * @param  {String} ui Name of the UI object to be returned.
     * @return {Object|null} UI object referenced by the given name.
     */
    getUi: function(ui) {
        return this.uiObjects[ui];
    },

    /*========================================================================*\
     * Plugins
    \*========================================================================*/
    /**
     * @param {String} name
     * @return {Object|undefined} plugin
     */
    getPlugin: function(name) {
        return this.plugins[name];
    },

    /**
     *
     */
    loadPlugins: function() {
        var editor = this;

        if (!this.options.plugins) {
            this.options.plugins = {};
        }

        for (var name in Raptor.plugins) {
            // Check if we are not automaticly enabling plugins, and if not, check if the plugin was manually enabled
            if (this.options.enablePlugins === false &&
                    typeof this.options.plugins[name] === 'undefined' ||
                    this.options.plugins[name] === false) {
                // <debug/>
                continue;
            }

            // Check if we have explicitly disabled the plugin
            if ($.inArray(name, this.options.disabledPlugins) !== -1) {
                continue;
            }

            editor.plugins[name] = this.prepareComponent(Raptor.plugins[name], editor.options.plugins[name], 'plugin').instance;
        }
    },

    /*========================================================================*\
     * Content accessors
    \*========================================================================*/

    /**
     * @returns {boolean}
     */
    isDirty: function() {
        return this.dirty;
    },

    /**
     * @returns {String}
     */
    getHtml: function() {
        return this.getElement().html();
    },

    clean: function() {
        this.actionApply(function() {
            clean(this.getElement());
        }.bind(this));
    },

    /**
     * @param {String} html
     */
    setHtml: function(html) {
        this.getElement().html(html);
        this.fire('html');
        this.checkChange();
    },

    /**
     *
     */
    resetHtml: function() {
        this.setHtml(this.getOriginalHtml());
        this.fire('cleaned');
    },

    /**
     * @returns {String}
     */
    getOriginalHtml: function() {
        return this.originalHtml;
    },

    /**
     *
     */
    saved: function() {
        this.setOriginalHtml(this.getHtml());
        this.dirty = false;
        this.fire('saved');
        this.fire('cleaned');
    },

    /**
     * @param {String} html
     */
    setOriginalHtml: function(html) {
        this.originalHtml = html;
    },

    /*========================================================================*\
     * Event handling
    \*========================================================================*/
    /**
     * @param {String} name
     * @param {function} callback
     * @param {Object} [context]
     */
    bind: function(name, callback, context) {
        if (typeof callback === 'undefined' ||
            !$.isFunction(callback)) {
            // <strict/>
            return;
        }
        var names = name.split(/,\s*/);
        for (var i = 0, l = names.length; i < l; i++) {
            if (!this.events[names[i]]) {
                this.events[names[i]] = [];
            }
            this.events[names[i]].push({
                context: context,
                callback: callback
            });
        }
    },

    /**
     * @param {String} name
     * @param {function} callback
     * @param {Object} [context]
     */
    unbind: function(name, callback, context) {
        for (var i = 0, l = this.events[name].length; i < l; i++) {
            if (this.events[name][i] &&
                this.events[name][i].callback === callback &&
                this.events[name][i].context === context) {
                this.events[name].splice(i, 1);
            }
        }
    },

    /**
     * @param {String} name
     * @param {boolean} [global]
     * @param {boolean} [sub]
     */
    fire: function(name, global, sub) {
        var result = [];

        // Fire before sub-event
        if (!sub) {
            result = result.concat(this.fire('before:' + name, global, true));
        }

        // <debug/>

        if (this.events[name]) {
            for (var i = 0, l = this.events[name].length; i < l; i++) {
                var event = this.events[name][i];
                if (typeof event !== 'undefined' &&
                        typeof event.callback !== 'undefined') {
                    var currentResult = event.callback.call(event.context || this);
                    if (typeof currentResult !== 'undefined') {
                        result = result.concat(currentResult);
                    }
                }
            }
        }

        // Also trigger the global editor event, unless specified not to
        if (global !== false) {
            Raptor.fire(name);
        }

        // Fire after sub-event
        if (!sub) {
            result = result.concat(this.fire('after:' + name, global, true));
        }

        return result;
    }
};

$.widget('ui.raptor', RaptorWidget);

                /* End of file: temp/default/src/raptor-widget.js */
            
                /* File: temp/default/src/components/layout.js */
                function RaptorLayout(name) {
    this.name = name;
}

RaptorLayout.prototype.init = function() {
};

RaptorLayout.prototype.destruct = function() {
};

RaptorLayout.prototype.isVisible = function() {
    return false;
};

RaptorLayout.prototype.show = function() {
};

RaptorLayout.prototype.hide = function() {
};

                /* End of file: temp/default/src/components/layout.js */
            
                /* File: temp/default/src/components/plugin.js */
                /**
 * @fileOverview Contains the raptor plugin class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * @class The raptor plugin class.
 *
 * @todo type and desc for name.
 * @param {type} name
 * @param {Object} overrides Options hash.
 * @returns {RaptorPlugin}
 */
function RaptorPlugin(name, overrides) {
    this.name = name;
    for (var key in overrides) {
        this[key] = overrides[key];
    }
}

/**
 * Initialize the raptor plugin.
 */
RaptorPlugin.prototype.init = function() {};

/**
 * Enable the raptor plugin.
 */
RaptorPlugin.prototype.enable = function() {};

                /* End of file: temp/default/src/components/plugin.js */
            
                /* File: temp/default/src/components/layout/ui-group.js */
                function UiGroup(raptor, uiOrder) {
    this.raptor = raptor;
    this.uiOrder = uiOrder;
};

UiGroup.prototype.appendTo = function(panel) {
    // Loop the UI component order option
    for (var i = 0, l = this.uiOrder.length; i < l; i++) {
        var uiGroupContainer = $('<div/>')
            .addClass(this.raptor.options.baseClass + '-layout-toolbar-group');

        // Loop each UI in the group
        var uiGroup = this.uiOrder[i];
        for (var ii = 0, ll = uiGroup.length; ii < ll; ii++) {
            // Check if the UI component has been explicitly disabled
            if (!this.raptor.isUiEnabled(uiGroup[ii])) {
                continue;
            }

            // Check the UI has been registered
            if (Raptor.ui[uiGroup[ii]]) {
                var uiOptions = this.raptor.options.plugins[uiGroup[ii]];
                if (uiOptions === false) {
                    continue;
                }

                var component = this.raptor.prepareComponent(Raptor.ui[uiGroup[ii]], uiOptions, 'ui');

                this.raptor.uiObjects[uiGroup[ii]] = component.instance;

                if (typeIsElement(component.init)) {
                    // Fix corner classes
                    component.init.removeClass('ui-corner-all');

                    // Append the UI object to the group
                    uiGroupContainer.append(component.init);
                }
            }
            // <strict/>
        }

        // Append the UI group to the editor toolbar
        if (uiGroupContainer.children().length > 0) {
            uiGroupContainer.appendTo(panel);
        }
    }

    // Fix corner classes
    panel.find('.ui-button:first-child').addClass('ui-corner-left');
    panel.find('.ui-button:last-child').addClass('ui-corner-right');
};

                /* End of file: temp/default/src/components/layout/ui-group.js */
            
                /* File: temp/default/src/components/layout/toolbar.js */
                /**
 * @fileOverview Toolbar layout.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */

function ToolbarLayout() {
    RaptorLayout.call(this, 'toolbar');
    this.wrapper = null;
}

ToolbarLayout.prototype = Object.create(RaptorLayout.prototype);

ToolbarLayout.prototype.init = function() {
    this.raptor.bind('enabled', this.show.bind(this));
    this.raptor.bind('disabled', this.hide.bind(this));
    this.raptor.bind('layoutShow', this.show.bind(this));
    this.raptor.bind('layoutHide', this.hide.bind(this));
    $(window).resize(this.constrainPosition.bind(this));
};

ToolbarLayout.prototype.destruct = function() {
    if (this.wrapper) {
        this.wrapper.remove();
        this.wrapper = null;
    }
    this.raptor.fire('toolbarDestroy');
};

/**
 * Show the toolbar.
 *
 * @fires RaptorWidget#toolbarShow
 */
ToolbarLayout.prototype.show = function() {
    if (!this.isVisible()) {
        this.getElement().css('display', '');
        this.constrainPosition();
        this.raptor.fire('toolbarShow');
    }
};

/**
 * Hide the toolbar.
 *
 * @fires RaptorWidget#toolbarHide
 */
ToolbarLayout.prototype.hide = function() {
    if (this.isReady()) {
        this.getElement().css('display', 'none');
        this.raptor.fire('toolbarHide');
    }
};

ToolbarLayout.prototype.initDragging = function() {
    if ($.fn.draggable &&
            this.options.draggable &&
            !this.getElement().data('ui-draggable')) {
        // <debug/>
        this.getElement().draggable({
            cancel: 'a, button',
            cursor: 'move',
            stop: this.constrainPosition.bind(this)
        });
        // Remove the relative position
        this.getElement().css('position', 'fixed');

        // Set the persistent position
        var pos = this.raptor.persist('position') || this.options.dialogPosition;

        if (!pos) {
            pos = [10, 10];
        }

        // <debug/>

        if (parseInt(pos[0], 10) + this.getElement().outerHeight() > $(window).height()) {
            pos[0] = $(window).height() - this.getElement().outerHeight();
        }
        if (parseInt(pos[1], 10) + this.getElement().outerWidth() > $(window).width()) {
            pos[1] = $(window).width() - this.getElement().outerWidth();
        }

        this.getElement().css({
            top: Math.abs(parseInt(pos[0], 10)),
            left: Math.abs(parseInt(pos[1], 10))
        });
    }
};

ToolbarLayout.prototype.enableDragging = function() {
    if ($.fn.draggable &&
            this.options.draggable &&
            this.getElement().data('ui-draggable')) {
        this.getElement().draggable('enable');
    }
};

ToolbarLayout.prototype.disableDragging = function() {
    if ($.fn.draggable &&
            this.options.draggable &&
            this.getElement().is('.ui-draggable')) {
        this.getElement().draggable('disable').removeClass('ui-state-disabled');
    }
};

ToolbarLayout.prototype.isReady = function() {
    return this.wrapper !== null;
};

ToolbarLayout.prototype.isVisible = function() {
    return this.isReady() && this.getElement().is(':visible');
};

ToolbarLayout.prototype.constrainPosition = function() {
    if (this.isVisible()) {
        var x = parseInt(this.wrapper.css('left')) || -999,
            y = parseInt(this.wrapper.css('top')) || -999,
            width = this.wrapper.outerWidth(),
            height = this.wrapper.outerHeight(),
            windowWidth = $(window).width(),
            windowHeight = $(window).height(),
            newX = Math.max(0, Math.min(x, windowWidth - width)),
            newY = Math.max(0, Math.min(y, windowHeight - height));

        if (newX !== x || newY !== y) {
            this.wrapper.css({
                left: newX,
                top: newY
            });
        }

        // Save the persistent position
        this.raptor.persist('position', [
            this.wrapper.css('top'),
            this.wrapper.css('left')
        ]);
    }
};

ToolbarLayout.prototype.getElement = function() {
    if (this.wrapper === null) {
        // Load all UI components if not supplied
        if (!this.options.uiOrder) {
            this.options.uiOrder = [[]];
            for (var name in Raptor.ui) {
                this.options.uiOrder[0].push(name);
            }
        }

        // <debug/>

        var toolbar = this.toolbar = $('<div/>')
            .addClass(this.options.baseClass + '-toolbar');
        var innerWrapper = this.toolbarWrapper = $('<div/>')
            .addClass(this.options.baseClass + '-inner')
            .addClass('ui-widget-content')
            .mousedown(function(event) {
                event.preventDefault();
            })
            .append(toolbar);
        var path = this.path = $('<div/>')
            .addClass(this.options.baseClass + '-path')
            .addClass('ui-widget-header');
        var wrapper = this.wrapper = $('<div/>')
            .addClass(this.options.baseClass + '-outer ' + this.raptor.options.baseClass + '-layout')
            .css('display', 'none')
            .append(path)
            .append(innerWrapper);

        var uiGroup = new UiGroup(this.raptor, this.options.uiOrder);
        uiGroup.appendTo(this.toolbar);
        $('<div/>').css('clear', 'both').appendTo(this.toolbar);

        var layout = this;
        $(function() {
            wrapper.appendTo('body');
            this.initDragging();
            this.constrainPosition(true);
            layout.raptor.fire('toolbarReady');
        }.bind(this));
    }
    return this.wrapper;
};

Raptor.registerLayout(new ToolbarLayout());

                /* End of file: temp/default/src/components/layout/toolbar.js */
            
                /* File: temp/default/src/components/layout/hover-panel.js */
                /**
 * @fileOverview Hover panel layout.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */

function HoverPanelLayout() {
    RaptorLayout.call(this, 'hoverPanel');
    this.hoverPanel = null;
    this.visible = false;
}

HoverPanelLayout.prototype = Object.create(RaptorLayout.prototype);

HoverPanelLayout.prototype.init = function() {
    this.raptor.bind('ready', this.ready.bind(this));
    this.raptor.bind('enabled', this.enabled.bind(this));
};

HoverPanelLayout.prototype.ready = function() {
    this.raptor.getElement()
        .mouseenter(this.show.bind(this))
        .mouseleave(this.hide.bind(this));
};

HoverPanelLayout.prototype.enabled = function() {
    this.getHoverPanel().hide();
};

HoverPanelLayout.prototype.getHoverPanel = function() {
    if (this.hoverPanel === null) {
        this.hoverPanel = $('<div/>')
            .addClass(this.options.baseClass)
            .mouseleave(this.hide.bind(this));

        var uiGroup = new UiGroup(this.raptor, this.options.uiOrder);
        uiGroup.appendTo(this.hoverPanel);

        $(window).bind('scroll', this.position.bind(this));

        this.hoverPanel
            .appendTo('body');
    }
    return this.hoverPanel;
};

HoverPanelLayout.prototype.show = function(event) {
    if (!this.raptor.isEditing()) {
        this.visible = true;
        this.getHoverPanel().show();
        this.position();
        this.raptor.getElement().addClass(this.raptor.options.baseClass + '-editable-block-hover');
    }
};

HoverPanelLayout.prototype.hide = function(event) {
    if (!this.visible) {
        return;
    }
    if (!event) {
        return;
    }
    if ($.contains(this.getHoverPanel().get(0), event.relatedTarget)) {
        return;
    }
    if (event.relatedTarget === this.getHoverPanel().get(0)) {
        return;
    }
    if (this.getHoverPanel().get(0) === $(event.relatedTarget).parent().get(0)) {
        return;
    }
    if ($.contains(this.raptor.getElement().get(0), event.relatedTarget)) {
        return;
    }
    if (event.relatedTarget === this.raptor.getElement().get(0)) {
        return;
    }
    this.visible = false;
    this.getHoverPanel().hide();
    this.raptor.getElement().removeClass(this.raptor.options.baseClass + '-editable-block-hover');
};

HoverPanelLayout.prototype.position = function() {
    if (this.visible) {
        var visibleRect = elementVisibleRect(this.raptor.getElement());
        this.getHoverPanel().css({
            // Calculate offset center for the hoverPanel
            top:  visibleRect.top  + ((visibleRect.height / 2) - (this.getHoverPanel().outerHeight() / 2)),
            left: visibleRect.left + ((visibleRect.width / 2)  - (this.getHoverPanel().outerWidth()  / 2))
        });
    }
};

Raptor.registerLayout(new HoverPanelLayout());

                /* End of file: temp/default/src/components/layout/hover-panel.js */
            
                /* File: temp/default/src/components/layout/messages.js */
                /**
 * @fileOverview Message layout.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen david@panmedia.co.nz
 */

function MessagesLayout() {
    RaptorLayout.call(this, 'messages');
    this.panel = null;
    this.options = {
        delay: 5000
    };
}

MessagesLayout.prototype = Object.create(RaptorLayout.prototype);

MessagesLayout.prototype.getElement = function() {
    if (this.panel === null) {
        this.panel = $(this.raptor.getTemplate('messages', this.options)).appendTo('body');
    }
    return this.panel;
};

/**
 * @param {String} type
 * @param {String[]} messages
 */
MessagesLayout.prototype.showMessage = function(type, message, options) {
    options = $.extend({}, this.options, options);

    var messageObject;
    messageObject = {
        timer: null,
        editor: this,
        show: function() {
            this.element.slideDown();
            this.timer = window.setTimeout(function() {
                this.timer = null;
                messageObject.hide();
            }, options.delay, this);
        },
        hide: function() {
            if (this.timer) {
                window.clearTimeout(this.timer);
                this.timer = null;
            }
            this.element.stop().slideUp(function() {
                if ($.isFunction(options.hide)) {
                    options.hide.call(this);
                }
                this.element.remove();
            }.bind(this));
        }
    };

    messageObject.element =
        $(this.raptor.getTemplate('message', $.extend(this.options, {
            type: type,
            message: message
        })))
        .hide()
        .appendTo(this.getElement())
        .find('.' + options.baseClass + '-close')
            .click(function() {
                messageObject.hide();
            })
        .end();

    messageObject.show();

    return messageObject;
};

Raptor.registerLayout(new MessagesLayout());

                /* End of file: temp/default/src/components/layout/messages.js */
            
                /* File: temp/default/src/components/ui/button.js */
                /**
 * @fileOverview Contains the core button class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * @class The core button class.
 *
 * @param {Object} overrides Options hash.
 */
function Button(overrides) {
    this.text = false;
    this.label = null;
    this.icon = null;
    this.hotkey = null;
    for (var key in overrides) {
        this[key] = overrides[key];
    }
}

/**
 * Initialize the button.
 *
 * @return {Element}
 */
Button.prototype.init = function() {
    // Bind hotkeys
    if (typeof this.hotkey === 'string') {
        this.raptor.registerHotkey(this.hotkey, this.action.bind(this));
    } else if (typeIsArray(this.hotkey)) {
        for (var i = 0, l = this.hotkey.length; i < l; i++) {
            this.raptor.registerHotkey(this.hotkey[i], this.action.bind(this));
        }
    }

    // Return the button
    return this.getButton();
};

/**
 * Prepare and return the button Element to be used in the Raptor UI.
 *
 * @return {Element}
 */
Button.prototype.getButton = function() {
    if (!this.button) {
        var text = this.text || _(this.name + 'Text', false);
        this.button = $('<div>')
            .html(text)
            .addClass(this.options.baseClass)
            .attr('title', this.getTitle())
            .click(this.click.bind(this));
        aButton(this.button, {
            icons: {
                primary: this.getIcon()
            },
            text: text,
            label: this.label
        });
    }
    return this.button;
};

/**
 * @return {String} The button's title property value, or if not present then the
 *   localized value for the button's name + Title.
 */
Button.prototype.getTitle = function() {
    return this.title || _(this.name + 'Title');
};

/**
 * @return {String} The button's icon property value, or the ui-fa fa- prefix
 *   with the button's camel cased name appended.
 */
Button.prototype.getIcon = function() {
    if (this.icon === null) {
        return 'ui-fa fa-' + stringCamelCaseConvert(this.name);
    }
    return this.icon;
};

/**
 * Perform the button's action.
 *
 * @todo this probably should not nest actions
 */
Button.prototype.click = function() {
    if (aButtonIsEnabled(this.button)) {
        this.raptor.actionApply(this.action.bind(this));
    }
};

                /* End of file: temp/default/src/components/ui/button.js */
            
                /* File: temp/default/src/components/ui/preview-button.js */
                /**
 * @fileOverview Contains the preview button class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * @class the preview button class.
 *
 * @constructor
 * @augments Button
 *
 * @param {Object} options
 */
function PreviewButton(options) {
    this.preview = true;
    this.previewing = false;
    Button.call(this, options);
}

PreviewButton.prototype = Object.create(Button.prototype);

/**
 * Initialize the toggle preview button.
 *
 * @returns {Element}
 */
PreviewButton.prototype.init = function() {
    this.preview = typeof this.options.preview === 'undefined' ? true : false;
    return Button.prototype.init.apply(this, arguments);
};

/**
 * Prepare and return the preview button Element to be used in the Raptor UI.
 *
 * @returns {Element}
 */
PreviewButton.prototype.getButton = function() {
    if (!this.button) {
        this.button = Button.prototype.getButton.call(this)
            .mouseenter(this.mouseEnter.bind(this))
            .mouseleave(this.mouseLeave.bind(this));
    }
    return this.button;
};

/**
 * Sets the mouse enter function to enable the preview.
 */
PreviewButton.prototype.mouseEnter = function() {
    if (this.canPreview()) {
        this.previewing = true;
        this.raptor.actionPreview(this.action.bind(this));
    }
};

/**
 * Sets the mouse leave function to disable the preview.
 */
PreviewButton.prototype.mouseLeave = function() {
    this.raptor.actionPreviewRestore();
    this.previewing = false;
};

/**
 * Sets the click function to disable the preview and apply the style.
 *
 * @returns {Element}
 */
PreviewButton.prototype.click = function() {
    this.previewing = false;
    return Button.prototype.click.apply(this, arguments);
};

/**
 * Checks if the Element is able to generate a preview.
 *
 * @todo check as i guessed this.
 * @returns {Boolean} True if preview available.
 */
PreviewButton.prototype.canPreview = function() {
    return this.preview;
};
/**
 * Checks if the Element is in it's preview state.
 *
 * @todo check as i guessed this.
 * @returns {Boolean} True if in previewing state.
 */
PreviewButton.prototype.isPreviewing = function() {
    return this.previewing;
};

                /* End of file: temp/default/src/components/ui/preview-button.js */
            
                /* File: temp/default/src/components/ui/toggle-button.js */
                /**
 * @fileOverview Contains the core button class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * The toggle button class.
 *
 * @constructor
 * @augments Button
 *
 * @param {Object} options
 */
function ToggleButton(options) {
    this.disable = false;
    Button.call(this, options);
}

ToggleButton.prototype = Object.create(Button.prototype);

/**
 * Initialize the toggle button.
 *
 * @returns {Element}
 */
ToggleButton.prototype.init = function() {
    this.raptor.bind('selectionChange', this.selectionChange.bind(this));
    return Button.prototype.init.apply(this, arguments);
};

/**
 * Changes the state of the button depending on whether it is active or not.
 */
ToggleButton.prototype.selectionChange = function() {
    if (this.selectionToggle()) {
        aButtonActive(this.button);
        if (this.disable) {
            aButtonEnable(this.button);
        }
    } else {
        aButtonInactive(this.button);
        if (this.disable) {
            aButtonDisable(this.button);
        }
    }
};

                /* End of file: temp/default/src/components/ui/toggle-button.js */
            
                /* File: temp/default/src/components/ui/preview-toggle-button.js */
                /**
 * @fileOverview Contains the preview toggle button class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * @class the preview toggle button class.
 *
 * @constructor
 * @augments PreviewButton
 *
 * @param {Object} options
 */
function PreviewToggleButton(options) {
    PreviewButton.call(this, options);
}

PreviewToggleButton.prototype = Object.create(PreviewButton.prototype);

/**
 * Initialize the toggle preview button.
 *
 * @returns {Element}
 */
PreviewToggleButton.prototype.init = function() {
    this.raptor.bind('selectionChange', this.selectionChange.bind(this));
    return PreviewButton.prototype.init.apply(this, arguments);
};

/**
 * Sets the state of the button to active when preview is enabled.
 */
PreviewToggleButton.prototype.selectionChange = function() {
    if (this.selectionToggle()) {
        if (!this.isPreviewing()) {
            aButtonActive(this.button);
        }
    } else {
        aButtonInactive(this.button);
    }
};

                /* End of file: temp/default/src/components/ui/preview-toggle-button.js */
            
                /* File: temp/default/src/components/ui/filtered-preview-button.js */
                /**
 * @fileOverview Contains the filtered preview button class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * @class the filtered preview button class.
 *
 * @constructor
 * @augments PreviewButton
 *
 * @param {Object} options
 */
function FilteredPreviewButton(options) {
    Button.call(this, options);
}

FilteredPreviewButton.prototype = Object.create(PreviewButton.prototype);

/**
 * Initialize the filtered preview button.
 *
 * @returns {Element} result
 */
FilteredPreviewButton.prototype.init = function() {
    var result = PreviewButton.prototype.init.apply(this, arguments);
    this.raptor.bind('selectionChange', this.selectionChange.bind(this));
    return result;
};

/**
 * Toggles the button's disabled state.
 */
FilteredPreviewButton.prototype.selectionChange = function() {
    if (this.isEnabled()) {
        aButtonEnable(this.button);
    } else {
        aButtonDisable(this.button);
    }
};

// <strict/>


/**
 * @returns {Boolean} True if preview available and if the button is enabled, false otherwise.
 */
FilteredPreviewButton.prototype.canPreview = function() {
    return PreviewButton.prototype.canPreview.call(this) && this.isEnabled();
};

/**
 * @returns {Boolean} True if button is enabled, false otherwise.
 */
FilteredPreviewButton.prototype.isEnabled = function() {
    var result = false;
    selectionEachRange(function(range) {
        if (this.getElement(range)) {
            result = true;
        }
    }.bind(this));
    return result;
};

/**
 * Perform the button's action.
 */
FilteredPreviewButton.prototype.action = function() {
    selectionEachRange(function(range) {
        var element = this.getElement(range);
        if (element) {
            this.applyToElement(element);
        }
    }.bind(this));
};

                /* End of file: temp/default/src/components/ui/filtered-preview-button.js */
            
                /* File: temp/default/src/components/ui/css-class-applier-button.js */
                /**
 * @fileOverview Contains the CSS class applier button class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * @class The CSS class applier button.
 *
 * @constructor
 * @augments PreviewToggleButton
 * @param {Object} options
 */
function CSSClassApplierButton(options) {
    PreviewToggleButton.call(this, options);
}

CSSClassApplierButton.prototype = Object.create(PreviewToggleButton.prototype);

/**
 * Applies the class from the button to a selection.
 */
CSSClassApplierButton.prototype.action = function() {
    selectionExpandToWord();
    this.raptor.selectionConstrain();
    for (var i = 0, l = this.classes.length; i < l; i++) {
        var applier = rangy.createCssClassApplier(this.options.cssPrefix + this.classes[i], {
            elementTagName: this.tag || 'span'
        });
        applier.toggleSelection();
    }
};

/**
 * Checks whether a class has been applied to a selection.
 *
 * @returns {Boolean} True if the css has been applied to the selection, false otherwise.
 */
CSSClassApplierButton.prototype.selectionToggle = function() {
    for (var i = 0, l = this.classes.length; i < l; i++) {
        var applier = rangy.createCssClassApplier(this.options.cssPrefix + this.classes[i], {
            elementTagName: this.tag || 'span'
        });
        if (!applier.isAppliedToSelection()) {
            return false;
        }
    }
    return true;
};

                /* End of file: temp/default/src/components/ui/css-class-applier-button.js */
            
                /* File: temp/default/src/components/ui/dialog-button.js */
                /**
 * @fileOverview Contains the dialog button class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * @type {Object} Container for Raptor dialogs.
 */
var dialogs = {};

/**
 * @class
 *
 * @constructor
 * @augments Button
 * @param {Object} options
 * @returns {DialogButton}
 */
function DialogButton(options) {
    this.state = null;
    Button.call(this, options);
}

DialogButton.prototype = Object.create(Button.prototype);

/**
 * A dialog button's action is to open a dialog, no content is modified at this
 * stage.
 */
DialogButton.prototype.action = function() {
    var dialog = this.getDialog(this);
    this.openDialog();
};

// <strict/>

/**
 * Checks the validility of a dialog.
 *
 * @param {type} dialog
 * @returns {Boolean} True if dialog is valid, false otherwise.
 */
DialogButton.prototype.validateDialog = function(dialog) {
    return true;
};

/**
 * Opens a dialog.
 *
 * @param {Object} dialog The dialog to open.
 */
DialogButton.prototype.openDialog = function() {
    this.raptor.pause();
    aDialogOpen(this.getDialog());
};

DialogButton.prototype.closeDialog = function() {
    dialogs[this.name].instance.raptor.resume();
};

DialogButton.prototype.okButtonClick = function(event) {
    var valid = dialogs[this.name].instance.validateDialog();
    if (valid === true) {
        aDialogClose(dialogs[this.name].dialog);
        dialogs[this.name].instance.applyAction.call(dialogs[this.name].instance, dialogs[this.name].dialog);
    }
};

DialogButton.prototype.cancelButtonClick = function(event) {
    aDialogClose(dialogs[this.name].dialog);
};

/**
 * Prepare and return the dialog's OK button's initialisation object.
 *
 * @param {String} name
 * @returns {Object} The initiialisation object for this dialog's OK button.
 */
DialogButton.prototype.getOkButton = function(name) {
    return {
        text: _(name + 'DialogOKButton'),
        click: this.okButtonClick.bind(this),
        icons: {
            primary: 'ui-fa fa-circle-check'
        }
    };
};

/**
 * Prepare and return the dialog's cancel button's initialisation object.
 *
 * @param {String} name
 * @returns {Object} The initiialisation object for this dialog's cancel button.
 */
DialogButton.prototype.getCancelButton = function(name) {
    return {
        text: _(name + 'DialogCancelButton'),
        click: this.cancelButtonClick.bind(this),
        icons: {
            primary: 'ui-fa fa-circle-close'
        }
    };
};

/**
 * Prepare and return the dialogs default options to be used in the Raptor UI.
 *
 * @param {String} name The name of the dialog to have the default options applied to it.
 * @returns {Object} the default options for the dialog.
 */
DialogButton.prototype.getDefaultDialogOptions = function(name) {
    var options = {
        modal: true,
        resizable: true,
        autoOpen: false,
        title: _(name + 'DialogTitle'),
        dialogClass: this.options.baseClass + '-dialog ' + this.options.dialogClass,
        close: this.closeDialog.bind(this),
        buttons: []
    };
    var okButton = this.getOkButton(name),
        cancelButton = this.getCancelButton(name);
    if (typeof okButton !== 'undefined' && okButton !== false) {
        options.buttons.push(okButton);
    }
    if (typeof cancelButton !== 'undefined') {
        options.buttons.push(cancelButton);
    }
    return options;
};

/**
 * Prepare and return the dialog to be used in the Raptor UI.
 *
 * @returns {Element} The dialog.
 */
DialogButton.prototype.getDialog = function() {
    if (typeof dialogs[this.name] === 'undefined') {
        dialogs[this.name] = {
            dialog: $(this.getDialogTemplate())
        };
        aDialog(dialogs[this.name].dialog, $.extend(this.getDefaultDialogOptions(this.name), this.dialogOptions));
    }
    dialogs[this.name].instance = this;
    return dialogs[this.name].dialog;
};

                /* End of file: temp/default/src/components/ui/dialog-button.js */
            
                /* File: temp/default/src/components/ui/dialog-toggle-button.js */
                /**
 * @fileOverview Contains the dialog toggle button class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * @class
 *
 * @constructor
 * @augments DialogButton
 * @augments ToggleButton
 *
 * @param {type} options
 */
function DialogToggleButton(options) {
    DialogButton.call(this, options);
    ToggleButton.call(this, options);
}

DialogToggleButton.prototype = Object.create(DialogButton.prototype);

DialogToggleButton.prototype.init = ToggleButton.prototype.init;

DialogToggleButton.prototype.selectionChange = ToggleButton.prototype.selectionChange;

                /* End of file: temp/default/src/components/ui/dialog-toggle-button.js */
            
                /* File: temp/default/src/components/ui/menu-button.js */
                /**
 * @fileOverview Contains the menu button class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * @constructor
 * @augments Button
 *
 * @param {Menu} menu The menu to create the menu button for.
 * @param {Object} options
 */
function MenuButton(menu, options) {
    this.menu = menu;
    this.name = menu.name;
    this.raptor = menu.raptor;
    this.options = menu.options;
    Button.call(this, options);
}

MenuButton.prototype = Object.create(Button.prototype);

/**
 * Shows the menu when button is clicked.
 *
 * @param {Event} event The click event.
 */
MenuButton.prototype.click = function(event) {
    if (this.menu.getMenu().is(':visible')) {
        $('.raptor-menu').hide();
    } else {
        this.menu.show();
    }
    event.preventDefault();
};

                /* End of file: temp/default/src/components/ui/menu-button.js */
            
                /* File: temp/default/src/components/ui/menu.js */
                /**
 * @fileOverview Contains the menu class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * @class
 * @constructor
 *
 * @param {Object} options
 * @returns {Menu}
 */
function Menu(options) {
    this.menu = null;
    this.menuContent = '';
    this.button = null;
    for (var key in options) {
        this[key] = options[key];
    }
}

/**
 * Initialize the menu.
 *
 * @returns {MenuButton}
 */
Menu.prototype.init = function() {
    this.setOptions();
    var button = this.getButton().init();
    button.addClass('raptor-menu-button');
    return button;
};

/**
 * Prepare and return the menu's button Element to be used in the Raptor UI.
 *
 * @returns {MenuButton}
 */
Menu.prototype.getButton = function() {
    if (!this.button) {
        this.button = new MenuButton(this);
    }
    return this.button;
};

/**
 * Applies options to the menu.
 */
Menu.prototype.setOptions = function() {
    this.options.title = _(this.name + 'Title');
    this.options.icon = 'ui-fa fa-' + this.name;
};

/**
 * Prepare and return the menu Element to be used in the Raptor UI.
 *
 * @returns {Element}
 */
Menu.prototype.getMenu = function() {
    if (!this.menu) {
        this.menu = $('<div>')
            .addClass('ui-menu ui-widget ui-widget-content ui-corner-all ' + this.options.baseClass + '-menu ' + this.raptor.options.baseClass + '-menu')
            .html(this.menuContent)
            .css('position', 'fixed')
            .hide()
            .mousedown(function(event) {
                // Prevent losing the selection on the editor target
                event.preventDefault();
            })
            .children()
            .appendTo('body');
    }
    return this.menu;
};

/**
 * Display menu.
 */
Menu.prototype.show = function() {
    $('.raptor-menu').hide();
    elementPositionUnder(this.getMenu().toggle(), this.getButton().getButton());
};

/**
 * Click off close event.
 *
 * @param {Event} event The click event.
 */
$('html').click(function(event) {
    if (!$(event.target).hasClass('raptor-menu-button') &&
            $(event.target).closest('.raptor-menu-button').length === 0) {
        $('.raptor-menu').hide();
    }
});

                /* End of file: temp/default/src/components/ui/menu.js */
            
                /* File: temp/default/src/components/ui/custom-menu.js */
                /**
 * @fileOverview Contains the custom menu class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * @class The custom menu class.
 *
 * @constructor
 * @augments Menu
 *
 * Prepares and returns the custom menu Element to be used in the Raptor UI.
 *
 * @returns {Element}
 */
Menu.prototype.getMenu = function() {
    if (!this.menu) {
        this.menu = $('<div>')
            .addClass('ui-menu ui-widget ui-widget-content ui-corner-all ' + this.options.baseClass + '-menu ' + this.raptor.options.baseClass + '-menu')
            .html(this.menuContent)
            .css('position', 'fixed')
            .hide()
            .appendTo('body')
            .mousedown(function(event) {
                // Prevent losing the selection on the editor target
                event.preventDefault();
            });
    }
    return this.menu;
};


                /* End of file: temp/default/src/components/ui/custom-menu.js */
            
                /* File: temp/default/src/components/ui/select-menu.js */
                /**
 * @fileOverview Contains the select menu class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * @class The select menu class.
 *
 * @constructor
 * @augments Menu
 *
 * @param {Object} options
 */
function SelectMenu(options) {
    Menu.call(this, options);
}

SelectMenu.prototype = Object.create(Menu.prototype);

SelectMenu.prototype.menuItemMouseDown = function(event) {
    // Prevent losing the selection on the editor target
    event.preventDefault();
};

SelectMenu.prototype.menuItemClick = function(event) {
    aButtonSetLabel(this.button.button, $(event.target).html());
    $(this.menu).closest('ul').hide();
    // Prevent jQuery UI focusing the menu
    return false;
};

SelectMenu.prototype.menuItemMouseEnter = function(event) {
};

SelectMenu.prototype.menuItemMouseLeave = function(event) {
};

/**
 * Prepare and return the select menu Element to be used in the Raptor UI.
 *
 * @returns {Element} The select menu.
 */
SelectMenu.prototype.getMenu = function() {
    if (!this.menu) {
        this.menu = $('<ul>')
            .addClass(this.options.baseClass + '-menu ' + this.raptor.options.baseClass + '-menu')
            .html(this.getMenuItems())
            .css('position', 'fixed')
            .hide()
            .find('a')
            .mousedown(this.menuItemMouseDown.bind(this))
            .mouseenter(this.menuItemMouseEnter.bind(this))
            .mouseleave(this.menuItemMouseLeave.bind(this))
            .click(this.menuItemClick.bind(this))
            .end()
            .appendTo('body');
        aMenu(this.menu);
    }
    return this.menu;
};

                /* End of file: temp/default/src/components/ui/select-menu.js */
            
                /* File: temp/default/src/presets/base.js */
                /**
 * @fileOverview Default options for Raptor.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * @namespace Default options for Raptor.
 */
Raptor.globalDefaults = {
    /**
     * @type Object Default layouts to use.
     */
    layout: {},

    /**
     * Plugins option overrides.
     *
     * @type Object
     */
    plugins: {},

    /**
     * UI option overrides.
     *
     * @type Object
     */
    ui: {},

    /**
     * Default events to bind.
     *
     * @type Object
     */
    bind: {},

    /**
     * Namespace used for persistence to prevent conflicting with other stored
     * values.
     *
     * @type String
     */
    namespace: null,

    /**
     * Switch to indicated that some events should be automatically applied to
     * all editors that are 'unified'
     *
     * @type boolean
     */
    unify: true,

    /**
     * Switch to indicate whether or not to stored persistent values, if set to
     * false the persist function will always return null
     *
     * @type boolean
     */
    persistence: true,

    /**
     * The name to store persistent values under
     * @type String
     */
    persistenceName: 'uiEditor',

    /**
     * Switch to indicate whether or not to a warning should pop up when the
     * user navigates aways from the page and there are unsaved changes
     *
     * @type boolean
     */
    unloadWarning: true,

    /**
     * Switch to automatically enabled editing on the element
     *
     * @type boolean
     */
    autoEnable: false,

    /**
     * Only enable editing on certian parts of the element
     *
     * @type {jQuerySelector}
     */
    partialEdit: false,

    /**
     * Switch to specify if the editor should automatically enable all plugins,
     * if set to false, only the plugins specified in the 'plugins' option
     * object will be enabled
     *
     * @type boolean
     */
    enablePlugins: true,

    /**
     * An array of explicitly disabled plugins.
     *
     * @type String[]
     */
    disabledPlugins: [],

    /**
     * Switch to specify if the editor should automatically enable all UI, if
     * set to false, only the UI specified in the {@link Raptor.defaults.ui}
     * option object will be enabled
     *
     * @type boolean
     */
    enableUi: true,

    /**
     * An array of explicitly disabled UI elements.
     *
     * @type String[]
     */
    disabledUi: [],

    /**
     * Switch to indicate that the element the editor is being applied to should
     * be replaced with a div (useful for textareas), the value/html of the
     * replaced element will be automatically updated when the editor element is
     * changed
     *
     * @type boolean
     */
    replace: false,

    /**
     * A list of styles that will be copied from the replaced element and
     * applied to the editor replacement element
     *
     * @type String[]
     */
    replaceStyle: [
        'display', 'position', 'float', 'width',
        'padding-left', 'padding-right', 'padding-top', 'padding-bottom',
        'margin-left', 'margin-right', 'margin-top', 'margin-bottom'
    ],

    /**
     *
     * @type String
     */
    baseClass: 'raptor',

    /**
     * CSS class prefix that is prepended to inserted elements classes.
     * E.g. "cms-bold"
     *
     * @type String
     */
    cssPrefix: 'cms-',

    draggable: true
};

                /* End of file: temp/default/src/presets/base.js */
            
                /* File: temp/default/src/presets/full.js */
                /**
 * @fileOverview Contains the full options preset.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * @namespace Full options for Raptor.
 */
Raptor.registerPreset({
    name: 'full',
    layouts: {
        toolbar: {
            uiOrder: [
                ['logo'],
                ['save', 'cancel'],
                ['dockToScreen', 'dockToElement', 'guides'],
                ['viewSource'],
                ['historyUndo', 'historyRedo'],
                ['alignLeft', 'alignCenter', 'alignJustify', 'alignRight'],
                ['textBold', 'textItalic', 'textUnderline', 'textStrike'],
                ['textSuper', 'textSub'],
                ['listUnordered', 'listOrdered'],
                ['hrCreate', 'textBlockQuote'],
                ['textSizeDecrease', 'textSizeIncrease'],
                ['clearFormatting'],
                ['linkCreate', 'linkRemove'],
                ['embed', 'insertFile'],
                ['floatLeft', 'floatNone', 'floatRight'],
                ['colorMenuBasic'],
                ['tagMenu'],
                ['classMenu'],
                ['snippetMenu', 'specialCharacters'],
                ['tableCreate', 'tableInsertRow', 'tableDeleteRow', 'tableInsertColumn', 'tableDeleteColumn'],
                ['languageMenu'],
                ['statistics']
            ]
        },
        hoverPanel: {
            uiOrder: [
                ['clickButtonToEdit']
            ]
        },
        messages: {
        }
    }
}, true);

                /* End of file: temp/default/src/presets/full.js */
            
                /* File: temp/default/src/plugins/cancel/cancel.js */
                /**
 * @fileOverview Contains the cancel editing dialog code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of a cancel dialog.
 *
 * @todo needs checking and not sure what to put in for the param stuff.
 * @param {type} param
 */
Raptor.registerUi(new DialogButton({
    name: 'cancel',
    hotkey: 'esc',
    dialogOptions: {
        width: 500
    },

    action: function() {
        if (this.raptor.isDirty()) {
            DialogButton.prototype.action.call(this);
        } else {
            this.applyAction();
        }
    },

    applyAction: function() {
        this.raptor.cancelEditing();
    },

    getDialogTemplate: function() {
        return $('<div>').html(_('cancelDialogContent'));
    }
}));

                /* End of file: temp/default/src/plugins/cancel/cancel.js */
            
                /* File: temp/default/src/plugins/class-menu/class-menu.js */
                /**
 * @fileOverview Contains the class menu class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * The select menu class.
 *
 * @constructor
 * @augments SelectMenu
 *
 * @param {Object} options
 */
function ClassMenu(options) {
    SelectMenu.call(this, {
        name: 'classMenu'
    });
}

ClassMenu.prototype = Object.create(SelectMenu.prototype);

/**
 * Initialises the class menu.
 *
 * @todo type and desc for result
 * @returns {unresolved} result
 */
ClassMenu.prototype.init = function() {
    var result = SelectMenu.prototype.init.call(this);
    if (typeof this.options.classes === 'object' &&
            Object.keys(this.options.classes).length > 0) {
        this.raptor.bind('selectionChange', this.updateButton.bind(this));
        return result;
    }
};

/**
 * Toggles a given set of classes on a selection.
 *
 * @param {Object} classes
 */
ClassMenu.prototype.changeClass = function(classes) {
    selectionToggleBlockClasses(classes, [], this.raptor.getElement());
};

/**
 * Applies the class on click.
 *
 * @param event
 */
ClassMenu.prototype.menuItemClick = function(event) {
    SelectMenu.prototype.menuItemClick.apply(this, arguments);
    this.raptor.actionApply(function() {
        this.changeClass([$(event.currentTarget).data('value')]);
    }.bind(this));
};

/**
 * Puts the selection into preview mode for the chosen class.
 *
 * @param event The mouse event which triggered the preview.
 */
ClassMenu.prototype.menuItemMouseEnter = function(event) {
    this.raptor.actionPreview(function() {
        this.changeClass([$(event.currentTarget).data('value')]);
    }.bind(this));
};

/**
 * Restores the selection from preview mode.
 *
 * @param event
 */
ClassMenu.prototype.menuItemMouseLeave = function(event) {
    this.raptor.actionPreviewRestore();
};
 /**
  * Updates the class menu button.
  */
ClassMenu.prototype.updateButton = function() {
};

//ClassMenu.prototype.getButton = function() {
//    if (!this.button) {
//        this.button = new Button({
//            name: this.name,
//            action: this.show.bind(this),
//            preview: false,
//            options: this.options,
//            icon: false,
//            text: 'Class Selector',
//            raptor: this.raptor
//        });
//    }
//    return this.button;
//};

/**
 * Prepare and return the menu items to be used in the Raptor UI.
 * @returns {Object} The menu items.
 */
ClassMenu.prototype.getMenuItems = function() {
    var items = '';
    for (var label in this.options.classes) {
        items += this.raptor.getTemplate('class-menu.item', {
            label: label,
            value: this.options.classes[label]
        });
    }
    return items;
};

Raptor.registerUi(new ClassMenu());

                /* End of file: temp/default/src/plugins/class-menu/class-menu.js */
            
                /* File: temp/default/src/plugins/clear-formatting/clear-formatting.js */
                /**
 * @fileOverview Contains the clear formatting button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of the preview button that clears the
 * formatting on a selection.
 */
Raptor.registerUi(new PreviewButton({
    name: 'clearFormatting',
    action: function() {
        selectionClearFormatting(this.raptor.getElement().get(0));
        cleanEmptyElements(this.raptor.getElement(), [
            'a', 'b', 'i', 'sub', 'sup', 'strong', 'em', 'big', 'small', 'p'
        ]);
        cleanWrapTextNodes(this.raptor.getElement()[0], 'p');
    }
}));

                /* End of file: temp/default/src/plugins/clear-formatting/clear-formatting.js */
            
                /* File: temp/default/src/plugins/click-button-to-edit/click-button-to-edit.js */
                /**
 * @fileOverview Contains the click button to edit code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */
Raptor.registerUi(new Button({
    name: 'clickButtonToEdit',
    action: function() {
        this.raptor.enableEditing();
    }
}));

                /* End of file: temp/default/src/plugins/click-button-to-edit/click-button-to-edit.js */
            
                /* File: temp/default/src/plugins/color-menu-basic/color-menu-basic.js */
                /**
 * @fileOverview Contains the basic colour menu class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author  David Neilsen <david@panmedia.co.nz>
 * @author  Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * The basic colour menu class.
 *
 * @constructor
 * @augments SelectMenu
 *
 * @param {Object} options
 */
function ColorMenuBasic(options) {
    this.colors = [
        'white',
        'black',
        'grey',
        'blue',
        'red',
        'green',
        'purple',
        'orange'
    ];
    /**
     * Cache the current color so it can be reapplied to the button if the user
     * clicks the button to open the menu, hovers some colors then clicks off to
     * close it.
     *
     * @type {String}
     */
    this.currentColor = 'automatic';
    SelectMenu.call(this, {
        name: 'colorMenuBasic'
    });
}

ColorMenuBasic.prototype = Object.create(SelectMenu.prototype);

/**
 * Initialize the basic colour menu.
 *
 * @returns {Element}
 */
ColorMenuBasic.prototype.init = function() {
    this.raptor.bind('selectionChange', this.updateButton.bind(this));
    this.updateButton();
    return SelectMenu.prototype.init.apply(this, arguments);
};

/**
 * Updates the basic colour menu with the current colour.
 */
ColorMenuBasic.prototype.updateButton = function() {
    var tag = selectionGetElements()[0],
        button = this.getButton().getButton(),
        color = null,
        closest = null;

    // TODO: set automatic icon color to the color of the text
    aButtonSetLabel(button, _('colorMenuBasicAutomatic'));
    aButtonSetIcon(button, false);
    if (!tag) {
        return;
    }
    tag = $(tag);
    for (var colorsIndex = 0; colorsIndex < this.colors.length; colorsIndex++) {
        closest = $(tag).closest('.' + this.options.cssPrefix + this.colors[colorsIndex]);
        if (closest.length) {
            color = this.colors[colorsIndex];
            break;
        }
    }
    if (color) {
        aButtonSetLabel(button, _('colorMenuBasic' + (color.charAt(0).toUpperCase() + color.slice(1))));
        aButtonSetIcon(button, 'ui-fa fa-swatch');
        // FIXME: set color in an adapter friendly way
        button.find('.ui-icon').css('background-color', closest.css('color'));
        return;
    }
};

/**
 * Changes the colour of the selection.
 *
 * @param {type} color The current colour.
 */
ColorMenuBasic.prototype.changeColor = function(color, permanent) {
    if (permanent) {
        this.currentColor = color;
    }
    this.raptor.actionApply(function() {
        selectionExpandToWord();
        if (color === 'automatic') {
            selectionGetElements().parents('.' + this.options.cssPrefix + 'color').addBack().each(function() {
                var classes = $(this).attr('class');
                if (classes === null || typeof classes === 'undefined') {
                    return;
                }
                classes = classes.match(/(cms-(.*?))( |$)/ig);
                if (classes === null || typeof classes === 'undefined') {
                    return;
                }
                for (var i = 0, l = classes.length; i < l; i++) {
                    $(this).removeClass($.trim(classes[i]));
                }
            });
        } else {
            var uniqueId = elementUniqueId();
            selectionToggleWrapper('span', {
                classes: this.options.classes || this.options.cssPrefix + 'color ' + this.options.cssPrefix + color,
                attributes: {
                    id: uniqueId
                }
            });
            var element = $('#' + uniqueId);
            if (element.length) {
                selectionSelectInner(element.removeAttr('id').get(0));
                var splitNode;
                do {
                    splitNode = $('#' + uniqueId);
                    splitNode.removeAttr('id');
                } while (splitNode.length);
            }
        }
    }.bind(this));
};

/**
 * The preview state for the basic colour menu.
 *
 * @param event The mouse event which triggered the preview.
 */
ColorMenuBasic.prototype.menuItemMouseEnter = function(event) {
    this.raptor.actionPreview(function() {
        this.changeColor($(event.currentTarget).data('color'));
    }.bind(this));
};

/**
 * Restores the selection from the preview.
 *
 * @param event
 */
ColorMenuBasic.prototype.menuItemMouseLeave = function(event) {
    this.raptor.actionPreviewRestore();
    this.changeColor(this.currentColor);
};

/**
 * Applies the colour change to the selection.
 *
 * @param event The mouse event to trigger the application of the colour.
 */
ColorMenuBasic.prototype.menuItemClick = function(event) {
    SelectMenu.prototype.menuItemClick.apply(this, arguments);
    this.raptor.actionApply(function() {
        this.changeColor($(event.currentTarget).data('color'), true);
    }.bind(this));
};

/**
 * Prepare and return the menu items to be used in the Raptor UI.
 * @returns {Element} The menu items.
 */
ColorMenuBasic.prototype.getMenuItems = function() {
    return this.raptor.getTemplate('color-menu-basic.menu', this.options);
};

Raptor.registerUi(new ColorMenuBasic());

                /* End of file: temp/default/src/plugins/color-menu-basic/color-menu-basic.js */
            
                /* File: temp/default/src/plugins/dock/dock-plugin.js */
                /**
 * @fileOverview Contains the dock plugin class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * The dock plugin class.
 *
 * @constructor
 * @augments RaptorPlugin
 *
 * @param {String} name
 * @param {Object} overrides
 */
function DockPlugin(name, overrides) {
    this.options = {
        dockToElement: false,
        docked: false,
        position: 'top',
        spacer: true,
        persist: true
    };
    this.dockState = false;
    this.marker = false;

    RaptorPlugin.call(this, name || 'dock', overrides);
}

DockPlugin.prototype = Object.create(RaptorPlugin.prototype);

/**
 * Initialize the dock plugin.
 */
DockPlugin.prototype.init = function() {
    var docked;
    if (this.options.persist) {
        docked = this.raptor.persist('docked');
    }
    if (typeof docked === 'undefined') {
        docked = this.options.docked;
    }
    if (typeof docked === 'undefined') {
        docked = false;
    }
    if (docked) {
        this.raptor.bind('toolbarReady', function() {
            if (docked) {
                this.toggleState();
            }
        }.bind(this));
        this.raptor.bind('toolbarHide', function() {
            if (this.dockState && this.dockState.spacer) {
                this.dockState.spacer.addClass(this.options.baseClass + '-hidden');
                this.dockState.spacer.removeClass(this.options.baseClass + '-visible');
            }
        }.bind(this));
        this.raptor.bind('toolbarShow', function() {
            if (this.dockState && this.dockState.spacer) {
                this.dockState.spacer.removeClass(this.options.baseClass + '-hidden');
                this.dockState.spacer.addClass(this.options.baseClass + '-visible');
            }
        }.bind(this));
        this.raptor.bind('toolbarDestroy', function() {
            if (this.dockState && this.dockState.spacer) {
                this.dockState.spacer.remove();
            }
        }.bind(this));
    }
};

/**
 * Switch between docked / undocked, depending on options.
 *
 * @return {Object} Resulting dock state
 */
DockPlugin.prototype.toggleState = function() {
    if (this.options.dockToElement) {
        return this.toggleDockToElement();
    }
    return this.toggleDockToScreen();
};

/**
 * Gets the dock state on toggle dock to element.
 *
 * @return {Object} Resulting dock state
 */
DockPlugin.prototype.toggleDockToElement = function() {
    if (this.dockState) {
        if (typeof this.dockState.dockedTo !== 'undefined') {
            this.undockFromElement();
        } else {
            this.undockFromScreen();
            this.dockToElement();
        }
    } else {
        this.dockToElement();
    }
};

/**
 * Gets the dock state on dock to element.
 *
 * @return {Object} Resulting dock state
 */
DockPlugin.prototype.dockToElement = function() {
    var element = this.raptor.getElement(),
        layoutElement = this.raptor.getLayout('toolbar').getElement();
    this.marker = $('<marker>').addClass(this.options.baseClass + '-marker').insertAfter(layoutElement);
    this.raptor.getLayout('toolbar').getElement().addClass(this.options.baseClass + '-docked-to-element');
    this.dockState = dockToElement(this.raptor.getLayout('toolbar').getElement(), element, {
        position: this.options.position,
        spacer: false,
        wrapperClass: this.options.baseClass + '-inline-wrapper'
    });
    this.activateButton(this.raptor.getUi('dockToElement'));
};

/**
 * Gets the dock state on undocking from an element.
 *
 * @return {Object} Resulting dock state
 */
DockPlugin.prototype.undockFromElement = function() {
    this.marker.replaceWith(undockFromElement(this.dockState));
    this.dockState = null;
    this.raptor.getLayout('toolbar').getElement().removeClass(this.options.baseClass + '-docked-to-element');
    this.deactivateButton(this.raptor.getUi('dockToElement'));
};

/**
 * Gets the dock state on toggle dock to screen.
 *
 * @return {Object} Resulting dock state
 */
DockPlugin.prototype.toggleDockToScreen = function() {
    if (this.dockState) {
        if (typeof this.dockState.dockedTo !== 'undefined') {
            this.undockFromElement();
            this.dockToScreen();
        } else {
            this.undockFromScreen();
        }
    } else {
        this.dockToScreen();
    }
};

/**
 * Gets the dock state on dock to screen.
 *
 * @return {Object} Resulting dock state
 */
DockPlugin.prototype.dockToScreen = function() {
    this.raptor.unify(function(raptor) {
        var dock = raptor.getPlugin('dock');
        if (!dock.dockState) {
            var layout = dock.raptor.getLayout('toolbar');
            if (layout.isReady()) {
                raptor.persist('docked', true);
                var layoutElement = layout.getElement();
                dock.marker = $('<marker>').addClass(dock.options.baseClass + '-marker')
                                    .insertAfter(layoutElement);
                layoutElement.addClass(dock.options.baseClass + '-docked');
                layout.disableDragging();
                dock.dockState = dockToScreen(layoutElement, {
                    position: dock.options.position,
                    spacer: true,
                    under: dock.options.under
                });
                if (!layout.isVisible()) {
                    dock.dockState.spacer.removeClass(dock.options.baseClass + '-hidden');
                    dock.dockState.spacer.addClass(dock.options.baseClass + '-visible');
                }
                dock.activateButton(dock.raptor.getUi('dockToScreen'));
            }
        }
    });
};

/**
 * Gets the dock state on undocking from the screen.
 *
 * @return {Object} Resulting dock state
 */
DockPlugin.prototype.undockFromScreen = function() {
    this.raptor.unify(function(raptor) {
        var dock = raptor.getPlugin('dock');
        if (dock.dockState) {
            raptor.persist('docked', false);
            var layout = dock.raptor.getLayout('toolbar'),
                layoutElement = undockFromScreen(dock.dockState);
            dock.marker.replaceWith(layoutElement);
            layout.enableDragging();
            layout.constrainPosition();
            dock.dockState = null;
            layoutElement.removeClass(dock.options.baseClass + '-docked');
            dock.deactivateButton(dock.raptor.getUi('dockToScreen'));
        }
    });
};

DockPlugin.prototype.deactivateButton = function(ui) {
    if (typeof ui !== 'undefined' &&
            typeof ui.button !== 'undefined') {
        aButtonInactive(ui.button);
    }
};

DockPlugin.prototype.activateButton = function(ui) {
    if (typeof ui !== 'undefined' &&
            typeof ui.button !== 'undefined') {
        aButtonActive(ui.button);
    }
};

Raptor.registerPlugin(new DockPlugin());

                /* End of file: temp/default/src/plugins/dock/dock-plugin.js */
            
                /* File: temp/default/src/plugins/dock/dock-to-element.js */
                /**
 * @fileOverview Contains the dock to element button code.
 * @author  David Neilsen <david@panmedia.co.nz>
 * @author  Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of the dock to element button for use in the raptor UI.
 *
 * @todo not sure how to document this one.
 * @param {type} param
 */
Raptor.registerUi(new Button({
    name: 'dockToElement',
    action: function() {
        this.raptor.plugins.dock.toggleDockToElement();
    }
}));

                /* End of file: temp/default/src/plugins/dock/dock-to-element.js */
            
                /* File: temp/default/src/plugins/dock/dock-to-screen.js */
                /**
 * @fileOverview Contains the dock to screen button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of the dock to screen button for use in the Raptor UI.
 *
 * @todo des and type for the param.
 * @param {type} param
 */
Raptor.registerUi(new Button({
    name: 'dockToScreen',
    action: function() {
        this.raptor.plugins.dock.toggleDockToScreen();
    }
}));

                /* End of file: temp/default/src/plugins/dock/dock-to-screen.js */
            
                /* File: temp/default/src/plugins/embed/embed.js */
                /**
 * @fileOverview Contains the embed dialog button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an intance of the embed dialog for use in the Raptor UI.
 *
 * @todo des and type for the param.
 * @param {type} param
 */
Raptor.registerUi(new DialogButton({
    name: 'embed',
    state: null,
    dialogOptions: {
        width: 600,
        height: 400
    },

    /**
     * Replace selection with embed textarea content.
     *
     * @param  {Element} dialog
     */
    applyAction: function(dialog) {
        this.raptor.actionApply(function() {
            selectionReplace(dialog.find('textarea').val());
        });
    },

    /**
     * Create and prepare the embed dialog template.
     *
     * @return {Element}
     */
    getDialogTemplate: function() {
        var template = $('<div>').html(this.raptor.getTemplate('embed.dialog', this.options));

        template.find('textarea').change(function(event) {
            template.find('.' + this.options.baseClass + '-preview').html($(event.target).val());
        }.bind(this));

        // Create fake jQuery UI tabs (to prevent hash changes)
        var tabs = template.find('.' + this.options.baseClass + '-panel-tabs');
        tabs.find('li')
            .click(function() {
                tabs.find('ul li').removeClass('ui-state-active').removeClass('ui-tabs-selected');
                $(this).addClass('ui-state-active').addClass('ui-tabs-selected');
                tabs.children('div').hide().eq($(this).index()).show();
            });
        return template;
    }
}));

                /* End of file: temp/default/src/plugins/embed/embed.js */
            
                /* File: temp/default/src/plugins/float/float-left.js */
                /**
 * @fileOverview Contains the float left button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of a filtered preview button to float an image left.
 *
 * @todo des and type for the param.
 * @param {type} param
 */
Raptor.registerUi(new FilteredPreviewButton({
    name: 'floatLeft',
    applyToElement: function(element) {
        element.removeClass(this.options.cssPrefix + 'float-right');
        element.toggleClass(this.options.cssPrefix + 'float-left');
        cleanEmptyAttributes(element, ['class']);
    },
    getElement: function(range) {
        var images = $(range.commonAncestorContainer).find('img');
        return images.length ? images : null;
    }
}));

                /* End of file: temp/default/src/plugins/float/float-left.js */
            
                /* File: temp/default/src/plugins/float/float-none.js */
                /**
 * @fileOverview Contains the float none button class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of a filtered preview button to remove the float an image.
 *
 * @todo des and type for the param.
 * @param {type} param
 */
Raptor.registerUi(new FilteredPreviewButton({
    name: 'floatNone',
    applyToElement: function(element) {
        element.removeClass(this.options.cssPrefix + 'float-right');
        element.removeClass(this.options.cssPrefix + 'float-left');
        cleanEmptyAttributes(element, ['class']);
    },
    getElement: function(range) {
        var images = $(range.commonAncestorContainer).find('img');
        return images.length ? images : null;
    }
}));

                /* End of file: temp/default/src/plugins/float/float-none.js */
            
                /* File: temp/default/src/plugins/float/float-right.js */
                /**
 * @fileOverview Contains the float right button class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of a filtered preview button to float an image right.
 *
 * @todo des and type for the param.
 * @param {type} param
 */
Raptor.registerUi(new FilteredPreviewButton({
    name: 'floatRight',
    applyToElement: function(element) {
        element.removeClass(this.options.cssPrefix + 'float-left');
        element.toggleClass(this.options.cssPrefix + 'float-right');
        cleanEmptyAttributes(element, ['class']);
    },
    getElement: function(range) {
        var images = $(range.commonAncestorContainer).find('img');
        return images.length ? images : null;
    }
}));

                /* End of file: temp/default/src/plugins/float/float-right.js */
            
                /* File: temp/default/src/plugins/guides/guides.js */
                /**
 * @fileOverview Contains the guides button class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of a preview button to show the guides of the elements.
 *
 * @todo des and type for the param.
 * @param {type} param
 */
Raptor.registerUi(new PreviewButton({
    name: 'guides',

    action: function() {
        this.raptor.getElement().toggleClass(this.getClassName());
        this.updateButtonState();
    },

    updateButtonState: function() {
        if (this.raptor.getElement().hasClass(this.getClassName())) {
            aButtonActive(this.button);
        } else {
            aButtonInactive(this.button);
        }
    },

    init: function() {
        this.raptor.bind('cancel', this.removeClass.bind(this));
        this.raptor.bind('saved', this.removeClass.bind(this));
        return PreviewButton.prototype.init.call(this);
    },

    removeClass: function() {
        this.raptor.getElement().removeClass(this.getClassName());
    },

    getClassName: function() {
        return this.options.baseClass + '-visible';
    },

    mouseEnter: function() {
        PreviewButton.prototype.mouseEnter.call(this);
        this.updateButtonState();
    },

    mouseLeave: function() {
        PreviewButton.prototype.mouseLeave.call(this);
        this.updateButtonState();
    }
}));

                /* End of file: temp/default/src/plugins/guides/guides.js */
            
                /* File: temp/default/src/plugins/history/history-redo.js */
                /**
 * @fileOverview Contains the history redo code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of the button class to redo an action.
 *
 * @todo param details?
 * @param {type} param
 */
Raptor.registerUi(new Button({
    name: 'historyRedo',
    hotkey: ['ctrl+y', 'ctrl+shift+z'],

    action: function() {
        this.raptor.historyForward();
    },

    init: function () {
        this.raptor.bind('historyChange', this.historyChange.bind(this));
        Button.prototype.init.apply(this, arguments);
        aButtonDisable(this.button);
        return this.button;
    },

    historyChange: function() {
        if (this.raptor.present < this.raptor.history.length - 1) {
            aButtonEnable(this.button);
        } else {
            aButtonDisable(this.button);
        }
    }
}));

                /* End of file: temp/default/src/plugins/history/history-redo.js */
            
                /* File: temp/default/src/plugins/history/history-undo.js */
                /**
 * @fileOverview Contains the history undo code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of the button class to undo an action.
 *
 * @todo param details?
 * @param {type} param
 */
Raptor.registerUi(new Button({
    name: 'historyUndo',
    hotkey: 'ctrl+z',

    action: function() {
        this.raptor.historyBack();
    },

    init: function () {
        this.raptor.bind('historyChange', this.historyChange.bind(this));
        Button.prototype.init.apply(this, arguments);
        aButtonDisable(this.button);
        return this.button;
    },

    historyChange: function() {
        if (this.raptor.present === 0) {
            aButtonDisable(this.button);
        } else {
            aButtonEnable(this.button);
        }
    }
}));

                /* End of file: temp/default/src/plugins/history/history-undo.js */
            
                /* File: temp/default/src/plugins/hr/hr-create.js */
                /**
 * @fileOverview Contains the hr button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of the preview button to insert a hr at the selection.
 *
 * @todo param details?
 * @param {type} param
 */
Raptor.registerUi(new PreviewButton({
    name: 'hrCreate',
    action: function() {
        selectionReplace('<hr/>');
    }
}));

                /* End of file: temp/default/src/plugins/hr/hr-create.js */
            
                /* File: temp/default/src/plugins/image-resize-button/image-resize-button.js */
                /**
 * @fileOverview Contains the image resize button plugin class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * @type {Element} The shared image resize button.
 */
var imageResizeButton = false,

    /**
     * @type {Element} The shared image resize dialog.
     */
    imageResizeButtonDialog = false,

    /**
     * @type {Element} The image currently being resized.
     */
    imageResizeButtonImage = null,

    imageOriginalSize = {
        width: null,
        height: null
    };

/**
 * The image resize button plugin class.
 *
 * @constructor
 * @augments RaptorPlugin
 *
 * @param {String} name
 * @param {Object} overrides Options hash.
 */
function ImageResizeButtonPlugin(name, overrides) {
    RaptorPlugin.call(this, name || 'imageResizeButton', overrides);
}

ImageResizeButtonPlugin.prototype = Object.create(RaptorPlugin.prototype);

/**
 * Initialize the image resize button plugin button.
 */
ImageResizeButtonPlugin.prototype.init = function() {
    this.proportional = true;
    this.raptor.getElement()
        .on('mouseenter', 'img', this.show.bind(this))
        .on('mouseleave', 'img', this.hide.bind(this));
};

/**
 * Prepare and return the image resize button Element to be used in the Raptor UI.
 *
 * @returns {Element}
 */
ImageResizeButtonPlugin.prototype.getButton = function() {
    if (imageResizeButton === false) {
        imageResizeButton = $(this.raptor.getTemplate('image-resize-button.button', this.options))
            .click(this.openDialog.bind(this));
        aButton(imageResizeButton, {
            icons: {
                primary: 'ui-fa fa-resize-image'
            }
        });
        imageResizeButton.appendTo('body');
    }
    return imageResizeButton;
};

/**
 * Gets the image resize button plugin dialog.
 *
 * @returns {Element}
 */
ImageResizeButtonPlugin.prototype.getDialog = function() {
    if (imageResizeButtonDialog === false) {
        imageResizeButtonDialog = $(this.raptor.getTemplate('image-resize-button.dialog', this.options));

        var widthInput = imageResizeButtonDialog.find('[name=width]');
            heightInput = imageResizeButtonDialog.find('[name=height]');

        var inputHeight = function() {
            var height = parseInt(heightInput.val(), 10);
            if (isNaN(height)) {
                return 0;
            }
            return height;
        };

        var inputWidth = function() {
            var width = parseInt(widthInput.val(), 10);
            if (isNaN(width)) {
                return 0;
            }
            return width;
        };

        var plugin = this;
        widthInput.bind('keyup', function() {
            var width = inputWidth();
            if (plugin.proportional) {
                heightInput.val(Math.round(Math.abs(imageOriginalSize.height / imageOriginalSize.width * width)));
            }
            this.resizeImage(width, inputHeight());
        }.bind(this));

        heightInput.bind('keyup', function() {
            var height = inputHeight();
            if (plugin.proportional) {
                widthInput.val(Math.round(Math.abs(imageOriginalSize.width / imageOriginalSize.height * height)));
            }
            this.resizeImage(inputWidth(), height);
        }.bind(this));

        aDialog(imageResizeButtonDialog, {
            width: 500,
            title: _('imageResizeButtonDialogTitle'),
            buttons: [
                {
                    text: _('imageResizeButtonDialogOKButton'),
                    click: function() {
                        this.resizeImage(inputWidth(), inputHeight());
                        this.raptor.checkChange();
                        this.resized = true;
                        aDialogClose(imageResizeButtonDialog);
                    }.bind(this),
                    icons: {
                        primary: 'ui-fa fa-circle-check'
                    }
                },
                {
                    text: _('imageResizeButtonDialogCancelButton'),
                    click: function() {
                        aDialogClose(imageResizeButtonDialog);
                    }.bind(this),
                    icons: {
                        primary: 'ui-fa fa-circle-close'
                    }
                }
            ],
            close: function() {
                if (!this.resized) {
                    this.resizeImage(imageOriginalSize.width, imageOriginalSize.height);
                }
                this.resized = false;
            }.bind(this)
        });
    }
    return imageResizeButtonDialog;
};

/**
 * Perform the actual image resizing.
 *
 * @param  {Integer} width
 * @param  {Integer} height
 */
ImageResizeButtonPlugin.prototype.resizeImage = function(width, height) {
    // <strict/>
    $(imageResizeButtonImage)
        .css({
            width: width,
            height: height
        })
        .attr('width', width)
        .attr('height', height);
};

/**
 * Opens the image resize button plugin dialog.
 */
ImageResizeButtonPlugin.prototype.openDialog = function() {
    aDialogOpen(this.getDialog());

    imageResizeButtonDialog.find('[name=width]').val(imageOriginalSize.width),
    imageResizeButtonDialog.find('[name=height]').val(imageOriginalSize.height);

    var plugin = this;
    imageResizeButtonDialog.find('.' + this.options.baseClass + '-lock-proportions')
        .hover(function() {
            $(this).addClass('ui-state-hover');
        }, function() {
            $(this).removeClass('ui-state-hover');
        })
        .click(function() {
            plugin.proportional = !plugin.proportional;
            $(this).find('.ui-icon').toggleClass('ui-fa fa-locked', plugin.proportional)
                .toggleClass('ui-fa fa-unlocked', !plugin.proportional);
        });
};

/**
 * Displays the image resize tool.
 *
 * @param {Event} event Click event to trigger the appearance of the image resize tool.
 */
ImageResizeButtonPlugin.prototype.show = function(event) {
    if (!this.raptor.isEditing()) {
        return;
    }
    imageResizeButtonImage = event.target;

    imageOriginalSize.width = imageResizeButtonImage.width;
    imageOriginalSize.height = imageResizeButtonImage.height;

    var visibleRect = elementVisibleRect(imageResizeButtonImage),
        button = this.getButton();
    button.show().css({
        position: 'absolute',
        top:  visibleRect.top  + ((visibleRect.height / 2) - (button.outerHeight() / 2)),
        left: visibleRect.left + ((visibleRect.width / 2)  - (button.outerWidth() / 2))
    });
    elementBringToTop(button);
};

/**
 * Hides the image resize tool
 *
 * @param {Event} event Click event to hide the image resize tool.
 */
ImageResizeButtonPlugin.prototype.hide = function(event) {
    var button = this.getButton();
    if((event &&
            (event.relatedTarget === button.get(0) ||
             button.get(0) === $(event.relatedTarget).parent().get(0)))) {
        return;
    }
    button.hide();
};

Raptor.registerPlugin(new ImageResizeButtonPlugin());

                /* End of file: temp/default/src/plugins/image-resize-button/image-resize-button.js */
            
                /* File: temp/default/src/plugins/insert-file/insert-file.js */
                /**
 * @fileOverview Contains the insert file button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of the button class to allow the insertation of files.
 *
 * @todo param details?
 * @param {type} param
 */
Raptor.registerUi(new Button({
    name: 'insertFile',
    state: false,
    /** @type {string[]} Image extensions*/
    imageTypes: [
        'jpeg',
        'jpg',
        'png',
        'gif'
    ],
    options: {

        /**
         * Save the current state, show the insert file dialog or file manager.
         *
         * @type {null|Function} Specify a function to use instead of the default
         *                       file insertion dialog.
         * @return {Boolean} False to indicate that custom action failed and the
         *                         default dialog should be used.
         */
        customAction: false
    },

    /**
     * Open the insert file dialog or file manager.
     */
    action: function() {
        this.raptor.pause();

        // If a customAction has been specified, use it instead of the default dialog.
        if (!this.options.customAction) {
            return this.showDialog();
        }

        if (this.options.customAction.call(this) === false) {
            return this.showDialog();
        }
    },

    /**
     * Show the insert files dialog.
     */
    showDialog: function() {
        var dialogElement = $('.file-manager-missing');
        if (!dialogElement.length) {
            dialogElement = $(this.raptor.getTemplate('insert-file.dialog'));
        }
        var self = this;
        aDialog(dialogElement, {
            title: 'No File Manager',
            modal: true,
            close: function() {
                self.raptor.resume();
            },
            buttons: [
                {
                    text: _('insertFileDialogOKButton'),
                    click: function() {
                        aDialogClose(dialogElement);
                        self.insertFiles([{
                            location: dialogElement.find('input[name="location"]').val(),
                            name: dialogElement.find('input[name="name"]').val()
                        }]);
                    },
                    icons: {
                        primary: 'ui-fa fa-circle-check'
                    }
                },
                {
                    text: _('insertFileDialogCancelButton'),
                    click: function() {
                        aDialogClose(dialogElement);
                    },
                    icons: {
                        primary: 'ui-fa fa-circle-close'
                    }
                }
            ]
        });
        aDialogOpen(dialogElement);
    },

    /**
     * Attempt to determine the file type from either the file's explicitly set
     * extension property, or the file extension of the file's location property.
     *
     * @param  {Object} file
     * @return {string}
     */
    getFileType: function(file) {
        if (typeof file.extension !== 'undefined') {
            return file.extension.toLowerCase();
        }
        var extension = file.location.split('.');
        if (extension.length > 0) {
            return extension.pop().toLowerCase();
        }
        return 'unknown';
    },

    /**
     * @param  {Object} file
     * @return {Boolean} True if the file is an image.
     */
    isImage: function(file) {
        return $.inArray(this.getFileType(file), this.imageTypes) !== -1;
    },

    /**
     * Insert the given files. If files contains only one item, it is inserted
     * with selectionReplaceWithinValidTags using an appropriate valid tag array
     * for the file's type. If files contains more than one item, the items are
     * processed into an array of HTML strings, joined then inserted using
     * selectionReplaceWithinValidTags with a valid tag array of tags that may
     * contain both image and anchor tags.
     *
     * [
     *     {
     *         location: location of the file, e.g. http://www.raptor-editor.com/images/html5.png
     *         name: a name for the file, e.g. HTML5 Logo
     *         extension: explicitly defined extension for the file, e.g. png
     *     }
     * ]
     *
     * @param  {Object[]} files Array of files to be inserted.
     */
    insertFiles: function(files) {
        this.raptor.resume();
        if (!files.length) {
            return;
        }
        this.raptor.actionApply(function() {
            if (files.length === 1 && !selectionIsEmpty()) {
                selectionExpandTo('a', this.raptor.getElement());
                selectionTrim();
                var applier = rangy.createApplier({
                    tag: 'a',
                    attributes: {
                        href: files[0].location,
                        title: files[0].name,
                        'class': this.options.cssPrefix + 'file ' + this.options.cssPrefix + this.getFileType(files[0])
                    }
                });
                applier.applyToSelection();
            } else {
                var elements = [];
                for (var fileIndex = 0; fileIndex < files.length; fileIndex++) {
                    elements.push(this.prepareElement(files[fileIndex]));
                }
                selectionReplace(elements.join(', '));
            }
        }.bind(this));
    },

    /**
     * Prepare the HTML for either an image or an anchor tag, depending on the file's type.
     *
     * @param {Object} file
     * @param {string|null} text The text to use as the tag's title and an anchor
     *                           tag's HTML. If null, the file's name is used.
     * @return {string} The tag's HTML.
     */
    prepareElement: function(file, text) {
        if (this.isImage(file)) {
            return this.prepareImage(file, this.options.cssPrefix + this.getFileType(file), text);
        } else {
            return this.prepareAnchor(file, this.options.cssPrefix + 'file ' + this.options.cssPrefix + this.getFileType(file), text);
        }
    },

    /**
     * Prepare HTML for an image tag.
     *
     * @param  {Object} file
     * @param  {string} classNames Classnames to apply to the image tag.
     * @param  {string|null} text Text to use as the image tag's title. If null,
     *                            the file's name is used.
     * @return {string} Image tag's HTML.
     */
    prepareImage: function(file, classNames, text) {
        return $('<div/>').html($('<img/>').attr({
            src: file.location,
            title: text || file.name,
            'class': classNames
        })).html();
    },

    /**
     * Prepare HTML for an anchor tag.
     *
     * @param  {Object} file
     * @param  {string} classNames Classnames to apply to the anchor tag.
     * @param  {string|null} text Text to use as the anchor tag's title & content. If null,
     *                            the file's name is used.
     * @return {string} Anchor tag's HTML.
     */
    prepareAnchor: function(file, classNames, text) {
        return $('<div/>').html($('<a/>').attr({
            href: file.location,
            title: file.name,
            'class': classNames
        }).html(text || file.name)).html();
    }
}));

                /* End of file: temp/default/src/plugins/insert-file/insert-file.js */
            
                /* File: temp/default/src/plugins/link/link-create.js */
                /**
 * @fileOverview Contains the create link button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

var linkMenu,
    linkTypes,
    linkContent,
    linkAttributes;

/**
 * Creates an instance of the dialog toggle button to create links.
 *
 * @todo param stuff?
 * @param {type} param
 */
Raptor.registerUi(new DialogToggleButton({
    name: 'linkCreate',

    dialogOptions: {
        width: 850
    },

    applyAction: function() {
        this.raptor.actionApply(function() {
            selectionExpandToWord();
            selectionExpandTo('a', this.raptor.getElement());
            selectionTrim();
            var applier = rangy.createApplier({
                tag: 'a',
                attributes: linkAttributes
            });
            if (linkAttributes !== false && $.trim(linkAttributes.href) !== '') {
                applier.applyToSelection();
                cleanEmptyElements(this.raptor.getElement(), ['a']);
            }
        }.bind(this));
    },

    openDialog: function() {
        var element = selectionGetElement();
        if (element.is('a')) {
            for (var i = 0, l = linkTypes.length; i < l; i++) {
                var result = linkTypes[i].updateInputs(element, linkContent.children('div:eq(' + i + ')'));
                if (result) {
                    linkMenu.find(':radio:eq(' + i + ')').trigger('click');
                }
            }
        }
        DialogToggleButton.prototype.openDialog.call(this);
    },

    validateDialog: function() {
        var i = linkMenu.find(':radio:checked').val();
        linkAttributes = linkTypes[i].getAttributes(linkContent.children('div:eq(' + i + ')'));
        return linkAttributes !== false;
    },

    selectionToggle: function() {
        var applier = rangy.createApplier({
            tag: 'a'
        });
        return applier.isAppliedToSelection();
    },

    getDialogTemplate: function() {
        var template = $(this.raptor.getTemplate('link.dialog', this.options));

        linkMenu = template.find('[data-menu]');
        linkContent = template.find('[data-content]');
        linkTypes = [
            new LinkTypeInternal(this.raptor),
            new LinkTypeExternal(this.raptor),
            new LinkTypeDocument(this.raptor),
            new LinkTypeEmail(this.raptor)
        ];

        for (var i = 0, l = linkTypes.length; i < l; i++) {
            $(this.raptor.getTemplate('link.label', linkTypes[i]))
                .click(function() {
                    linkContent.children('div').hide();
                    linkContent.children('div:eq(' + $(this).index() + ')').show();
                })
                .find(':radio')
                    .val(i)
                .end()
                .appendTo(linkMenu);
            $('<div>')
                .append(linkTypes[i].getContent())
                .hide()
                .appendTo(linkContent);
        }
        linkMenu.find(':radio:first').prop('checked', true);
        linkContent.children('div:first').show();

        return template;
    }
}));

                /* End of file: temp/default/src/plugins/link/link-create.js */
            
                /* File: temp/default/src/plugins/link/link-remove.js */
                /**
 * @fileOverview Contains the remove link class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of teh toggle button to remove links.
 *
 * @todo param details?
 * @param {type} param
 */
Raptor.registerUi(new PreviewButton({
    name: 'linkRemove',
    disable: true,

    action: function() {
        this.raptor.actionApply(function() {
            var applier = rangy.createApplier({
                tag: 'a'
            });
            selectionExpandToWord();
            this.raptor.selectionConstrain();
            applier.undoToSelection();
            cleanEmptyElements(this.raptor.getElement(), ['a']);
        }.bind(this));
    }
}));

                /* End of file: temp/default/src/plugins/link/link-remove.js */
            
                /* File: temp/default/src/plugins/link/link-type-document.js */
                /**
 * @fileOverview Contains the document link class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * @class The internal link class.
 *
 * @constructor
 * @param {Raptor} raptor
 */
function LinkTypeDocument(raptor) {
    this.raptor = raptor;
    this.label = _('linkTypeDocumentLabel');
}

LinkTypeDocument.prototype = Object.create(LinkTypeExternal.prototype);

/**
 * @return {String} The document link panel content.
 */
LinkTypeDocument.prototype.getContent = function() {
    return this.raptor.getTemplate('link.document', this.raptor.options);
};

                /* End of file: temp/default/src/plugins/link/link-type-document.js */
            
                /* File: temp/default/src/plugins/link/link-type-email.js */
                /**
 * @fileOverview Contains the internal link class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * @class Email link class.
 * @constructor
 *
 * @todo param details and des for return.
 * @param {type} raptor
 * @returns {LinkTypeEmail}
 */
function LinkTypeEmail(raptor) {
    this.raptor = raptor;
    this.label = _('linkTypeEmailLabel');
}

/**
 * Gets the content of the email link.
 *
 * @returns {Element}
 */
LinkTypeEmail.prototype.getContent = function() {
    return this.raptor.getTemplate('link.email', this.raptor.options);
};

/**
 * Gets the attributes of the email link.
 *
 * @todo panel and return details
 * @param {type} panel
 * @returns {LinkTypeEmail.prototype.getAttributes.Anonym$0|Boolean}
 */
LinkTypeEmail.prototype.getAttributes = function(panel) {
    var address = panel.find('[name=email]').val(),
        subject = panel.find('[name=subject]').val();
    if ($.trim(subject)) {
        subject = '?Subject=' + encodeURIComponent(subject);
    }
    if ($.trim(address) === '') {
        return false;
    }
    return {
        href: 'mailto:' + address + subject
    };
};

/**
 * Updates the users inputs.
 *
 * @todo type and des for panel and des for return.
 * @param {String} link The email link.
 * @param {type} panel
 * @returns {Boolean}
 */
LinkTypeEmail.prototype.updateInputs = function(link, panel) {
    var result = false;
        email = '',
        subject = '',
        href = link.attr('href');
    if (href.indexOf('mailto:') === 0) {
        var subjectPosition = href.indexOf('?Subject=');
        if (subjectPosition > 0) {
            email = href.substring(7, subjectPosition);
            subject = href.substring(subjectPosition + 9);
        } else {
            email = href.substring(7);
            subject = '';
        }
        result = true;
    }
    panel.find('[name=email]').val(email);
    panel.find('[name=subject]').val(subject);
    return result;
};

                /* End of file: temp/default/src/plugins/link/link-type-email.js */
            
                /* File: temp/default/src/plugins/link/link-type-external.js */
                /**
 * @fileOverview Contains the external link class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * @class The external link class.
 * @constructor
 *
 * @todo check please
 * @param {Object} raptor
 * @returns {Element}
 */
function LinkTypeExternal(raptor) {
    this.raptor = raptor;
    this.label = _('linkTypeExternalLabel');
}

/**
 * Gets the content of the external link.
 *
 * @returns {Element}
 */
LinkTypeExternal.prototype.getContent = function() {
    return this.raptor.getTemplate('link.external', this.raptor.options);
};

/**
 * Gets the attributes of the external link.
 *
 * @todo type and des for panel
 * @param {type} panel
 * @returns {LinkTypeExternal.prototype.getAttributes.result|Boolean}
 */
LinkTypeExternal.prototype.getAttributes = function(panel) {
    var address = panel.find('[name=location]').val(),
        target = panel.find('[name=blank]').is(':checked'),
        result = {
            href: address
        };

    if (target) {
        result.target = '_blank';
    }

    if ($.trim(result.href) === 'http://') {
        return false;
    }

    return result;
};

/**
 * Updates the users inputs.
 *
 * @todo type and desc for panel and return.
 * @param {String} link The external link.
 * @param {type} panel
 * @returns {Boolean}
 */
LinkTypeExternal.prototype.updateInputs = function(link, panel) {
    var result = false,
        href = link.attr('href');
    if (href.indexOf('http://') === 0) {
        panel.find('[name=location]').val(href);
        result = true;
    } else {
        panel.find('[name=location]').val('http://');
    }
    if (link.attr('target') === '_blank') {
        panel.find('[name=blank]').prop('checked', true);
    } else {
        panel.find('[name=blank]').prop('checked', false);
    }
    return result;
};

                /* End of file: temp/default/src/plugins/link/link-type-external.js */
            
                /* File: temp/default/src/plugins/link/link-type-internal.js */
                /**
 * @fileOverview Contains the internal link class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * @class The internal link class.
 * @constructor
 *
 * @todo check please
 * @param {Object} raptor
 * @returns {Element}
 */
function LinkTypeInternal(raptor) {
    this.raptor = raptor;
    this.label = _('linkTypeInternalLabel');
}

/**
 * Gets the content of the internal link.
 *
 * @returns {Element}
 */
LinkTypeInternal.prototype.getContent = function() {
    return this.raptor.getTemplate('link.internal', {
        baseClass: this.raptor.options.baseClass,
        domain: window.location.protocol + '//' + window.location.host
    });
};

/**
 * Gets the attributes of the internal link.
 *
 * @todo type and des for panel and return
 * @param {type} panel
 * @returns {LinkTypeInternal.prototype.getAttributes.result}
 */
LinkTypeInternal.prototype.getAttributes = function(panel) {
    var address = panel.find('[name=location]').val(),
        target = panel.find('[name=blank]').is(':checked'),
        result = {
            href: address
        };

    if (target) {
        result.target = '_blank';
    }

    return result;
};

/**
 * Updates the users inputs.
 *
 * @todo type and des for panel and des for return.
 * @param {String} link The internal lnk.
 * @param {type} panel
 * @returns {Boolean}
 */
LinkTypeInternal.prototype.updateInputs = function(link, panel) {
    var href = link.attr('href');
    if (href.indexOf('http://') === -1 &&
            href.indexOf('mailto:') === -1) {
        panel.find('[name=location]').val(href);
    } else {
        panel.find('[name=location]').val('');
    }
    if (link.attr('target') === '_blank') {
        panel.find('[name=blank]').prop('checked', true);
    } else {
        panel.find('[name=blank]').prop('checked', false);
    }
    return false;
};

                /* End of file: temp/default/src/plugins/link/link-type-internal.js */
            
                /* File: temp/default/src/plugins/list/list-ordered.js */
                /**
 * @fileOverview Contains the ordered list button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates a new instance of the preview toggle button to create ordered lists.
 */
Raptor.registerUi(new PreviewToggleButton({
    name: 'listOrdered',
    init: function() {
        var result = PreviewToggleButton.prototype.init.apply(this, arguments);
        if (elementIsValid(this.raptor.getElement(), listValidUlOlParents)) {
            return result;
        }
        return;
    },
    action: function() {
        listToggle('ol', 'li', this.raptor.getElement());
    },
    selectionToggle: function() {
        var selection = rangy.getSelection();
        return selection.getAllRanges().length > 0 &&
            selectionGetElements(selection).closest('ol').length;
    }
}));

                /* End of file: temp/default/src/plugins/list/list-ordered.js */
            
                /* File: temp/default/src/plugins/list/list-unordered.js */
                /**
 * @fileOverview Contains the unordered list button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates a new instance of the preview toggle button to create unordered lists.
 *
 * @todo param details?
 * @param {type} param
 */
Raptor.registerUi(new PreviewToggleButton({
    name: 'listUnordered',
    init: function() {
        var result = PreviewToggleButton.prototype.init.apply(this, arguments);
        if (elementIsValid(this.raptor.getElement(), listValidUlOlParents)) {
            return result;
        }
        return;
    },
    action: function() {
        listToggle('ul', 'li', this.raptor.getElement());
    },
    selectionToggle: function() {
        var selection = rangy.getSelection();
        return selection.getAllRanges().length > 0 &&
            selectionGetElements(selection).closest('ul').length;
    }
}));

                /* End of file: temp/default/src/plugins/list/list-unordered.js */
            
                /* File: temp/default/src/plugins/paste/paste.js */
                /**
 * @fileOverview Contains the paste plugin class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

var pasteInProgress = false,
    pasteDialog = null,
    pasteInstance = null,
    selection = null;

/**
 * The paste plugin class.
 *
 * @constructor
 * @augments RaptorPlugin
 *
 * @param {String} name
 * @param {Object} overrides Options hash.
 */
function PastePlugin(name, overrides) {
    /**
     * Default options.
     *
     * @type {Object}
     */
    this.options = {
        /**
         * Tags that will not be stripped from pasted content.
         * @type {Array}
         */
        allowedTags: [
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'ul', 'ol', 'li', 'blockquote',
            'p', 'a', 'span', 'hr', 'br', 'strong', 'em'
        ],

        allowedAttributes: [
            'href', 'title'
        ],

        allowedEmptyTags: [
            'hr', 'br'
        ],
        
        panels: [
            'plain-text',
            'formatted-clean',
            'formatted-unclean',
            'source'
        ]
    };

    RaptorPlugin.call(this, name || 'paste', overrides);
}

PastePlugin.prototype = Object.create(RaptorPlugin.prototype);

/**
 * Enables pasting.
 */
PastePlugin.prototype.enable = function() {
    this.raptor.getElement().bind('paste.' + this.raptor.widgetName, this.capturePaste.bind(this));
};

/**
 * Captures the html to be pasted.
 *
 * @returns {Boolean} True if paste capture is successful.
 */
PastePlugin.prototype.capturePaste = function() {
    if (pasteInProgress) {
        return false;
    }
    selectionSave();

    pasteInProgress = true;

    // Make a contentEditable div to capture pasted text
    $('.raptorPasteBin').remove();
    $('<div class="raptorPasteBin" contenteditable="true" style="width: 1px; height: 1px; overflow: hidden; position: fixed; top: -1px;" />').appendTo('body');
    $('.raptorPasteBin').focus();

    window.setTimeout(this.showPasteDialog.bind(this), 0);

    return true;
};

/**
 * Opens the paste dialog.
 */
PastePlugin.prototype.showPasteDialog = function() {
    aDialogOpen(this.getDialog(this));
};

/**
 * Inserts the pasted content into the selection.
 *
 * @param {HTML} html The html to be pasted into the selection.
 */
PastePlugin.prototype.pasteContent = function(html) {
    this.raptor.actionApply(function() {
        var uniqueId = elementUniqueId();
        selectionRestore();
        html = this.filterAttributes(html);
        html = this.filterChars(html);
        selectionReplace($('<placeholder id="' + uniqueId + '">' + html + '</placeholder>'));
        $('.raptorPasteBin').remove();
        var placeholder = $('#' + uniqueId);
        selectionSelectInner(placeholder.get(0));
        selectionSave();
        placeholder.contents().unwrap();
        selectionRestore();
    }.bind(this));
};

/**
 * Gets the paste dialog.
 *
 * @todo type for instance
 * @param {type} instance The paste instance
 * @returns {Object} The paste dialog.
 */
PastePlugin.prototype.getDialog = function(instance) {
    pasteInstance = instance;
    if (!pasteDialog) {
        pasteDialog = $('<div>').html(this.raptor.getTemplate('paste.dialog', this.options));
        for (var i = 0, l = this.options.panels.length; i < l; i++) {
            pasteDialog.find('.' + this.options.baseClass + '-tab-' + this.options.panels[i]).css('display', '');
            if (i === 0) {
                pasteDialog.find('.' + this.options.baseClass + '-content-' + this.options.panels[i]).css('display', '');
            }
        }
        pasteDialog.find('.' + this.options.baseClass + '-panel-tabs > div:visible:not(:first)').hide();
        aDialog(pasteDialog, {
            modal: true,
            resizable: true,
            autoOpen: false,
            width: 800,
            height: 500,
            title: _('pasteDialogTitle'),
            dialogClass: this.options.baseClass + '-dialog',
            close: function() {
                pasteInProgress = false;
            },
            buttons: [
                {
                    text: _('pasteDialogOKButton'),
                    click: function() {
                        var html = null,
                            element = pasteDialog.find('.' + this.options.baseClass + '-area:visible');

                        if (element.hasClass(this.options.baseClass + '-plain') || element.hasClass(this.options.baseClass + '-source')) {
                            html = element.val();
                        } else {
                            html = element.html();
                        }
                        aDialogClose(pasteDialog);
                        pasteInstance.pasteContent(html);
                    }.bind(this),
                    icons: {
                        primary: 'ui-fa fa-circle-check'
                    }
                },
                {
                    text: _('pasteDialogCancelButton'),
                    click: function() {
                        selectionDestroy();
                        $('.raptorPasteBin').remove();
                        aDialogClose(pasteDialog);
                    },
                    icons: {
                        primary: 'ui-fa fa-circle-close'
                    }
                }
            ]
        });

        // Create fake jQuery UI tabs (to prevent hash changes)
        var tabs = pasteDialog.find('.' + this.options.baseClass + '-panel-tabs');
        tabs.find('li')
            .click(function() {
                tabs.find('ul li').removeClass('ui-state-active').removeClass('ui-tabs-selected');
                $(this).addClass('ui-state-active').addClass('ui-tabs-selected');
                tabs.children('div').hide().eq($(this).index()).show();
            });
    }
    this.updateAreas();
    return pasteDialog;
};

/**
 * Attempts to filter rubbish from content using regular expressions.
 *
 * @param  {String} content Dirty text
 * @return {String} The filtered content
 */
PastePlugin.prototype.filterAttributes = function(content) {
    // The filters variable is an array of of regular expression & handler pairs.
    //
    // The regular expressions attempt to strip out a lot of style data that
    // MS Word likes to insert when pasting into a contentEditable.
    // Almost all of it is junk and not good html.
    //
    // The hander is a place to put a function for match handling.
    // In most cases, it just handles it as empty string.  But the option is there
    // for more complex handling.
    var filters = [
        // Meta tags, link tags, and prefixed tags
        {regexp: /(<meta\s*[^>]*\s*>)|(<\s*link\s* href="file:[^>]*\s*>)|(<\/?\s*\w+:[^>]*\s*>)/gi, handler: ''},
        // MS class tags and comment tags.
        {regexp: /(class="Mso[^"]*")|(<!--(.|\s){1,}?-->)/gi, handler: ''},
        // Apple class tags
        {regexp: /(class="Apple-(style|converted)-[a-z]+\s?[^"]+")/, handle: ''},
        // Google doc attributes
        {regexp: /id="internal-source-marker_[^"]+"|dir="[rtl]{3}"/, handle: ''},
        // blank p tags
        {regexp: /(<p[^>]*>\s*(\&nbsp;|\u00A0)*\s*<\/p[^>]*>)|(<p[^>]*>\s*<font[^>]*>\s*(\&nbsp;|\u00A0)*\s*<\/\s*font\s*>\s<\/p[^>]*>)/ig, handler: ''},
        // Strip out styles containing mso defs and margins, as likely added in IE and are not good to have as it mangles presentation.
        {regexp: /(style="[^"]*mso-[^;][^"]*")|(style="margin:\s*[^;"]*;")/gi, handler: ''},
        // Style tags
        {regexp: /(?:<style([^>]*)>([\s\S]*?)<\/style>|<link\s+(?=[^>]*rel=['"]?stylesheet)([^>]*?href=(['"])([^>]*?)\4[^>\/]*)\/?>)/gi, handler: ''},
        // Scripts (if any)
        {regexp: /(<\s*script[^>]*>((.|\s)*?)<\\?\/\s*script\s*>)|(<\s*script\b([^<>]|\s)*>?)|(<[^>]*=(\s|)*[("|')]javascript:[^$1][(\s|.)]*[$1][^>]*>)/ig, handler: ''}
    ];

    $.each(filters, function(i, filter) {
        content = content.replace(filter.regexp, filter.handler);
    });

    return content;
};

/**
 * Replaces commonly-used Windows 1252 encoded chars that do not exist in ASCII or ISO-8859-1 with ISO-8859-1 cognates.
 * @param  {[type]} content [description]
 * @return {[type]}
 */
PastePlugin.prototype.filterChars = function(content) {
    var s = content;

    // smart single quotes and apostrophe
    s = s.replace(/[\u2018|\u2019|\u201A]/g, '\'');

    // smart double quotes
    s = s.replace(/[\u201C|\u201D|\u201E]/g, '\"');

    // ellipsis
    s = s.replace(/\u2026/g, '...');

    // dashes
    s = s.replace(/[\u2013|\u2014]/g, '-');

    // circumflex
    s = s.replace(/\u02C6/g, '^');

    // open angle bracket
    s = s.replace(/\u2039/g, '<');

    // close angle bracket
    s = s.replace(/\u203A/g, '>');

    // spaces
    s = s.replace(/[\u02DC|\u00A0]/g, ' ');

    return s;
};

/**
 * Strip all attributes from content (if it's an element), and every element contained within
 * Strip loop taken from <a href="http://stackoverflow.com/a/1870487/187954">Remove all attributes</a>
 * @param  {String|Element} content The string / element to be cleaned
 * @return {String} The cleaned string
 */
PastePlugin.prototype.stripAttributes = function(content) {
    content = $('<div/>').html(content);
    var allowedAttributes = this.options.allowedAttributes;

    $(content.find('*')).each(function() {
        // First copy the attributes to remove if we don't do this it causes problems iterating over the array
        // we're removing elements from
        var attributes = [];
        $.each(this.attributes, function(index, attribute) {
            // Do not remove allowed attributes
            if (-1 !== $.inArray(attribute.nodeName, allowedAttributes)) {
                return;
            }
            attributes.push(attribute.nodeName);
        });

        // now remove the attributes
        for (var attributeIndex = 0; attributeIndex < attributes.length; attributeIndex++) {
            $(this).attr(attributes[attributeIndex], null);
        }
    });
    return content.html();
};

/**
 * Remove empty tags.
 *
 * @param {String} content The HTML containing empty elements to be removed
 * @return {String} The cleaned HTML
 */
PastePlugin.prototype.stripEmpty = function(content) {
    var wrapper = $('<div/>').html(content);
    var allowedEmptyTags = this.options.allowedEmptyTags;
    wrapper.find('*').filter(function() {
        // Do not strip elements in allowedEmptyTags
        if (-1 !== $.inArray(this.tagName.toLowerCase(), allowedEmptyTags)) {
            return false;
        }
        // If the element has at least one child element that exists in allowedEmptyTags, do not strip it
        if ($(this).find(allowedEmptyTags.join(',')).length) {
            return false;
        }
        return $.trim($(this).text()) === '';
    }).remove();
    return wrapper.html();
};

/**
 * Remove spans that have no attributes.
 *
 * @param {String} content
 * @return {String} The cleaned HTML
 */
PastePlugin.prototype.stripSpans = function(content) {
    var wrapper = $('<div/>').html(content);
    wrapper.find('span').each(function() {
        if (!this.attributes.length) {
            $(this).replaceWith($(this).html());
        }
    });
    return wrapper.html();
};

/**
 * Update text input content.
 */
PastePlugin.prototype.updateAreas = function() {
    var markup = $('.raptorPasteBin').html();
    markup = this.filterAttributes(markup);
    markup = this.filterChars(markup);
    markup = this.stripEmpty(markup);
    markup = this.stripAttributes(markup);
    markup = this.stripSpans(markup);
    markup = stringStripTags(markup, this.options.allowedTags);

    var plain = $('<div/>').html($('.raptorPasteBin').html()).text();
    var html = $('.raptorPasteBin').html();

    pasteDialog.find('.' + this.options.baseClass + '-plain').val($('<div/>').html(plain).text());
    pasteDialog.find('.' + this.options.baseClass + '-rich').html(markup);
    pasteDialog.find('.' + this.options.baseClass + '-source').html(html);
    pasteDialog.find('.' + this.options.baseClass + '-markup').html(markup);
};

Raptor.registerPlugin(new PastePlugin());

                /* End of file: temp/default/src/plugins/paste/paste.js */
            
                /* File: temp/default/src/plugins/save/save.js */
                /**
 * @fileOverview Contains the save class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of the button class to save any changes.
 */
Raptor.registerUi(new Button({
    name: 'save',

    action: function() {
        this.getPlugin().save();
    },

    init: function() {
        if (this.options.plugin === null) {
            return;
        }

        var result = Button.prototype.init.apply(this, arguments);

        // <strict/>

        this.raptor.bind('dirty', this.dirty.bind(this));
        this.raptor.bind('cleaned', this.clean.bind(this));
        this.clean();
        return result;
    },

    getPlugin: function() {
        return this.raptor.getPlugin(this.options.plugin);
    },

    dirty: function() {
        aButtonEnable(this.button);
    },

    clean: function() {
        aButtonDisable(this.button);
    }
}));

                /* End of file: temp/default/src/plugins/save/save.js */
            
                /* File: temp/default/src/plugins/save/save-json.js */
                /**
 * @fileOverview Contains the save JSON plugin code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * The save JSON class.
 *
 * @constructor
 * @param {String} name
 * @param {Object} overrides
 */
function SaveJsonPlugin(name, overrides) {
    RaptorPlugin.call(this, name || 'saveJson', overrides);
    this.size = null;
}

SaveJsonPlugin.prototype = Object.create(RaptorPlugin.prototype);

Raptor.registerPlugin(new SaveJsonPlugin());

// <strict/>

/**
 * Save Raptor content.
 */
SaveJsonPlugin.prototype.save = function() {
    var data = {};
    this.raptor.unify(function(raptor) {
        if (raptor.isDirty()) {
            this.raptor.clean();
            var plugin = raptor.getPlugin('saveJson');
            var id = plugin.options.id.call(this);
            var html = this.raptor.getHtml();
            data[id] = html;
        }
    }.bind(this));
    var post = {};
    this.size = Object.keys(data).length;
    post[this.options.postName] = JSON.stringify(data);
    $.ajax({
            type: this.options.type || 'post',
            dataType: this.options.dataType || 'json',
            url: this.options.url,
            data: post
        })
        .done(this.done.bind(this))
        .fail(this.fail.bind(this));
};

/**
 * Done handler.
 *
 * @param {Object} data
 * @param {Integer} status
 * @param {Object} xhr
 */
SaveJsonPlugin.prototype.done = function(data, status, xhr) {
    this.raptor.saved();
    var message = _('saveJsonSaved', {
        saved: this.size
    });
    if ($.isFunction(this.options.formatResponse)) {
        message = this.options.formatResponse(data);
    }
    this.raptor.getLayout('messages').showMessage('confirm', message, {
        delay: 1000,
        hide: function() {
            this.raptor.unify(function(raptor) {
                raptor.disableEditing();
            });
        }.bind(this)
    });
};

/**
 * Fail handler.
 *
 * @param {Object} xhr
 */
SaveJsonPlugin.prototype.fail = function(xhr) {
    this.raptor.getLayout('messages').showMessage('error', _('saveJsonFail', {
        failed: this.size
    }));
};

                /* End of file: temp/default/src/plugins/save/save-json.js */
            
                /* File: temp/default/src/plugins/save/save-rest.js */
                /**
 * @fileOverview Contains the save rest class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * The save rest class.
 *
 * @constructor
 * @augments RaptorPlugin
 *
 * @param {String} name
 * @param {Object} overrides Options hash
 */
function SaveRestPlugin(name, overrides) {
    this.method = 'put';
    RaptorPlugin.call(this, name || 'saveRest', overrides);
}

SaveRestPlugin.prototype = Object.create(RaptorPlugin.prototype);

/**
 * Initializes the save rest plugin.
 *
 * @returns {Element}
 */
// <strict/>

/**
 * Saves the selection.
 */
SaveRestPlugin.prototype.save = function() {
    this.requests = 0;
    this.errors = [];
    this.messages = [];
    this.raptor.unify(function(raptor) {
        if (raptor.isDirty()) {
            this.requests++;
            var xhr = raptor.getPlugin('saveRest').sendRequest();
            xhr.raptor = raptor;
            xhr
                .done(this.done.bind(this))
                .fail(this.fail.bind(this))
                .always(this.always.bind(this));
        }
    }.bind(this));
};

/**
 * @param {type} data
 * @param {type} status
 * @param {type} xhr
 */
SaveRestPlugin.prototype.done = function(data, status, xhr) {
    xhr.raptor.saved();
    this.messages.push(data);
};

/**
 * @param {type} xhr
 */
SaveRestPlugin.prototype.fail = function(xhr) {
    this.errors.push(xhr.responseText);
};

/**
 * Action always peformed on AJAX request
 */
SaveRestPlugin.prototype.always = function() {
    this.requests--;
    if (this.requests === 0) {
        if (this.errors.length > 0 && this.messages.length === 0) {
            this.raptor.getLayout('messages').showMessage('error', _('saveRestFail', {
                failed: this.errors.length
            }));
        } else if (this.errors.length > 0) {
            this.raptor.getLayout('messages').showMessage('error', _('saveRestPartial', {
                saved: this.messages.length,
                failed: this.errors.length
            }));
        } else {
            this.raptor.getLayout('messages').showMessage('confirm', _('saveRestSaved', {
                saved: this.messages.length
            }), {
                delay: 1000,
                hide: function() {
                    this.raptor.unify(function(raptor) {
                        raptor.disableEditing();
                    });
                }.bind(this)
            });
        }
    }
};

/**
 * @returns {Object} AJAX promise object
 */
SaveRestPlugin.prototype.sendRequest = function() {
    var headers = this.raptor.getPlugin('saveRest').getHeaders(),
        data = this.raptor.getPlugin('saveRest').getData(),
        url = this.raptor.getPlugin('saveRest').getURL();
    return $.ajax({
        type: this.options.type || 'post',
        dataType: this.options.dataType || 'json',
        headers: headers,
        data: data,
        url: url
    });
};

/**
 * @returns {SaveRestPlugin.prototype.getHeaders}
 */
SaveRestPlugin.prototype.getHeaders = function() {
    if (this.options.headers) {
        return this.options.headers.call(this);
    }
    return {};
};

/**
 * @returns {SaveRestPlugin.prototype.getData.data}
 */
SaveRestPlugin.prototype.getData = function() {
    // Get the data to send to the server
    this.raptor.clean();
    var content = this.raptor.getHtml(),
        data = this.options.data.call(this, content);
    data._method = this.method;
    return data;
};

/**
 * @returns {String} The URL to use for REST calls
 */
SaveRestPlugin.prototype.getURL = function() {
    if (typeof this.options.url === 'string') {
        return this.options.url;
    }
    return this.options.url.call(this);
};

Raptor.registerPlugin(new SaveRestPlugin());

                /* End of file: temp/default/src/plugins/save/save-rest.js */
            
                /* File: temp/default/src/plugins/snippet-menu/snippet-menu.js */
                /**
 * @fileOverview Contains the snippet menu class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * The snippet menu class.
 *
 * @constructor
 * @augments SelectMenu
 *
 * @param {Object} options
 */
function SnippetMenu(options) {
    SelectMenu.call(this, {
        name: 'snippetMenu'
    });
}

SnippetMenu.prototype = Object.create(SelectMenu.prototype);

/**
 * Initialize the snippet menu.
 *
 * @returns {Element}
 */
SnippetMenu.prototype.init = function() {
    var result = SelectMenu.prototype.init.call(this);
    if (typeof this.options.snippets !== 'undefined' &&
            Object.keys(this.options.snippets).length > 0) {
        return result;
    }
};

/**
 * Inserts the snippet into the selected text.
 *
 * @todo type for name
 * @param {type} name The name of the snippet.
 */
SnippetMenu.prototype.insertSnippet = function(name) {
    selectionReplace(this.options.snippets[name]);
};

/**
 * Applies the insertion of the snippet.
 *
 * @param {type} event The click event that applies the snippet.
 */
SnippetMenu.prototype.menuItemMouseDown = function(event) {
    this.raptor.actionApply(function() {
        this.insertSnippet($(event.currentTarget).data('name'));
    }.bind(this));
};

/**
 * Previews the insertion of a snippet.
 *
 * @param {type} event The mouse event that triggers the preview.
 */
SnippetMenu.prototype.menuItemMouseEnter = function(event) {
    this.raptor.actionPreview(function() {
        this.insertSnippet($(event.currentTarget).data('name'));
    }.bind(this));
};

/**
 * Removes the preview state.
 */
SnippetMenu.prototype.menuItemMouseLeave = function() {
    this.raptor.actionPreviewRestore();
};

/**
 * Gets the menu items for the snippet menu.
 *
 * @todo check type for return
 * @returns {Element} The menu items.
 */
SnippetMenu.prototype.getMenuItems = function() {
    var items = '';
    for (var name in this.options.snippets) {
        items += this.raptor.getTemplate('snippet-menu.item', {
            name: name
        });
    }
    return items;
};

Raptor.registerUi(new SnippetMenu());

                /* End of file: temp/default/src/plugins/snippet-menu/snippet-menu.js */
            
                /* File: temp/default/src/plugins/statistics/statistics.js */
                /**
 * @fileOverview Contains the statistics code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

var statisticsDialog = null;

/**
 * Creates an instance of a dialog button to display the pages statistics.
 */
Raptor.registerUi(new DialogButton({
    name: 'statistics',
    options: {
        maximum: 100,
        showCountInButton: true
    },
    dialogOptions: {
        width: 350
    },

    init: function() {
        if (this.options.showCountInButton) {
            this.raptor.bind('change', this.updateButton.bind(this));
        }
        return DialogButton.prototype.init.apply(this, arguments);
    },

    applyAction: function() {
    },

    getCancelButton: function() {
    },

    getCharacterCount: function() {
        return $('<div>').html(this.raptor.getHtml()).text().trim().length;
    },

    getContent: function() {
        return $('<div>').html(this.raptor.getHtml()).text().trim();
    },

    updateButton: function() {
        var charactersRemaining = null,
            label = null,
            characterCount = this.getCharacterCount();

        // Cases where maximum has been provided
        if (this.options.maximum) {
            charactersRemaining = this.options.maximum - characterCount;
            if (charactersRemaining >= 0) {
                label = _('statisticsButtonCharacterRemaining', {
                    charactersRemaining: charactersRemaining
                });
            } else {
                label = _('statisticsButtonCharacterOverLimit', {
                    charactersRemaining: charactersRemaining * -1
                });
            }
        } else {
            label = _('statisticsButtonCharacters', {
                characters: characterCount
            });
        }

        aButtonSetLabel(this.button, label);

        if (!this.options.maximum) {
            return;
        }

        // Add the error state to the button's text element if appropriate
        if (charactersRemaining < 0) {
            this.button.addClass('ui-state-error').removeClass('ui-state-default');
        } else{
            // Add the highlight class if the remaining characters are in the "sweet zone"
            if (charactersRemaining >= 0 && charactersRemaining <= 15) {
                this.button.addClass('ui-state-highlight').removeClass('ui-state-error ui-state-default');
            } else {
                this.button.removeClass('ui-state-highlight ui-state-error').addClass('ui-state-default');
            }
        }
    },

    getButton: function() {
        if (!this.button) {
            Button.prototype.getButton.call(this);
            aButton(this.button, {
                text: true
            });
            if (this.options.showCountInButton) {
                this.updateButton();
            }
        }
        return this.button;
    },

    getDialogTemplate: function() {
        return $(this.raptor.getTemplate('statistics.dialog', this.options));
    },

    /**
     * Process and return the statistics dialog template.
     *
     * @return {jQuery} The processed statistics dialog template
     */
    openDialog: function() {
        var dialog = this.getDialog(),
            content = this.getContent();

        // If maximum has not been set, use infinity
        var charactersRemaining = this.options.maximum ? this.options.maximum - content.length : '&infin;';
        if (typeIsNumber(charactersRemaining) && charactersRemaining < 0) {
            dialog.find('[data-name=truncation]').html(_('statisticsDialogTruncated', {
                'limit': this.options.maximum
            }));
        } else {
            dialog.find('[data-name=truncation]').html(_('statisticsDialogNotTruncated'));
        }

        var totalWords = content.split(' ').length;
        if (totalWords === 1) {
            dialog.find('[data-name=words]').html(_('statisticsDialogWord', {
                words: totalWords
            }));
        } else {
            dialog.find('[data-name=words]').html(_('statisticsDialogWords', {
                words: totalWords
            }));
        }

        var totalSentences = content.split('. ').length;
        if (totalSentences === 1) {
            dialog.find('[data-name=sentences]').html(_('statisticsDialogSentence', {
                sentences: totalSentences
            }));
        } else {
            dialog.find('[data-name=sentences]').html(_('statisticsDialogSentences', {
                sentences: totalSentences
            }));
        }

        var characters = null;
        if (charactersRemaining >= 0 || !typeIsNumber(charactersRemaining)) {
            dialog.find('[data-name=characters]').html(_('statisticsDialogCharactersRemaining', {
                characters: content.length,
                charactersRemaining: charactersRemaining
            }));
        } else {
            dialog.find('[data-name=characters]').html(_('statisticsDialogCharactersOverLimit', {
                characters: content.length,
                charactersRemaining: charactersRemaining * -1
            }));
        }
        DialogButton.prototype.openDialog.call(this);
    }
}));

                /* End of file: temp/default/src/plugins/statistics/statistics.js */
            
                /* File: temp/default/src/dependencies/goog-table.js */
                // Copyright 2008 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// https://code.google.com/p/closure-library/source/browse/closure/goog/editor/table.js
//
// Modified by David Neilsen <david@panmedia.co.nz>

/**
 * Class providing high level table editing functions.
 * @param {Element} node Element that is a table or descendant of a table.
 * @constructor
 */
GoogTable = function(node) {
    this.element = node;
    this.refresh();
};


/**
 * Walks the dom structure of this object's table element and populates
 * this.rows with GoogTableRow objects. This is done initially
 * to populate the internal data structures, and also after each time the
 * DOM structure is modified. Currently this means that the all existing
 * information is discarded and re-read from the DOM.
 */
// TODO(user): support partial refresh to save cost of full update
// every time there is a change to the DOM.
GoogTable.prototype.refresh = function() {
    var rows = this.rows = [];
    var tbody = this.element.tBodies[0];
    if (!tbody) {
        return;
    }
    var trs = [];
    for (var child = tbody.firstChild; child; child = child.nextSibling) {
        if (child.tagName === 'TR') {
            trs.push(child);
        }
    }

    for (var rowNum = 0, tr; tr = trs[rowNum]; rowNum++) {
        var existingRow = rows[rowNum];
        var tds = GoogTable.getChildCellElements(tr);
        var columnNum = 0;
        // A note on cellNum vs. columnNum: A cell is a td/th element. Cells may
        // use colspan/rowspan to extend over multiple rows/columns. cellNum
        // is the dom element number, columnNum is the logical column number.
        for (var cellNum = 0, td; td = tds[cellNum]; cellNum++) {
            // If there's already a cell extending into this column
            // (due to that cell's colspan/rowspan), increment the column counter.
            while (existingRow && existingRow.columns[columnNum]) {
                columnNum++;
            }
            var cell = new GoogTableCell(td, rowNum, columnNum);
            // Place this cell in every row and column into which it extends.
            for (var i = 0; i < cell.rowSpan; i++) {
                var cellRowNum = rowNum + i;
                // Create TableRow objects in this.rows as needed.
                var cellRow = rows[cellRowNum];
                if (!cellRow) {
                    // TODO(user): try to avoid second trs[] lookup.
                    rows.push(
                            cellRow = new GoogTableRow(trs[cellRowNum], cellRowNum));
                }
                // Extend length of column array to make room for this cell.
                var minimumColumnLength = columnNum + cell.colSpan;
                if (cellRow.columns.length < minimumColumnLength) {
                    cellRow.columns.length = minimumColumnLength;
                }
                for (var j = 0; j < cell.colSpan; j++) {
                    var cellColumnNum = columnNum + j;
                    cellRow.columns[cellColumnNum] = cell;
                }
            }
            columnNum += cell.colSpan;
        }
    }
};


/**
 * Returns all child elements of a TR element that are of type TD or TH.
 * @param {Element} tr TR element in which to find children.
 * @return {Array.<Element>} array of child cell elements.
 */
GoogTable.getChildCellElements = function(tr) {
    var cells = [];
    for (var i = 0, cell; cell = tr.childNodes[i]; i++) {
        if (cell.tagName === 'TD' ||
                cell.tagName === 'TH') {
            cells.push(cell);
        }
    }
    return cells;
};


/**
 * Inserts a new row in the table. The row will be populated with new
 * cells, and existing rowspanned cells that overlap the new row will
 * be extended.
 * @param {number=} rowIndex Index at which to insert the row. If
 *     this is omitted the row will be appended to the end of the table.
 * @return {Element} The new row.
 */
GoogTable.prototype.insertRow = function(rowIndex, options) {
    var rowIndex = rowIndex || this.rows.length;
    var refRow;
    var insertAfter;
    if (rowIndex == 0) {
        refRow = this.rows[0];
        insertAfter = false;
    } else {
        refRow = this.rows[rowIndex - 1];
        insertAfter = true;
    }
    var newTr = document.createElement('tr');
    for (var i = 0, cell; cell = refRow.columns[i]; i += 1) {
        // Check whether the existing cell will span this new row.
        // If so, instead of creating a new cell, extend
        // the rowspan of the existing cell.
        if ((insertAfter && cell.endRow > rowIndex) ||
            (!insertAfter && cell.startRow < rowIndex)) {
            cell.setRowSpan(cell.rowSpan + 1);
            if (cell.colSpan > 1) {
                i += cell.colSpan - 1;
            }
        } else {
            var newTd = document.createElement('td');
            newTd.innerHTML = options.placeHolder;
            newTr.appendChild(newTd);
        }
        if (insertAfter) {
            refRow.element.parentNode.insertBefore(newTr, refRow.element.nextSibling);
        } else {
            refRow.element.insertBefore(newTr);
        }
    }
    this.refresh();
    return newTr;
};


/**
 * Inserts a new column in the table. The column will be created by
 * inserting new TD elements in each row, or extending the colspan
 * of existing TD elements.
 * @param {number=} colIndex Index at which to insert the column. If
 *     this is omitted the column will be appended to the right side of
 *     the table.
 * @return {Array.<Element>} Array of new cell elements that were created
 *     to populate the new column.
 */
//GoogTable.prototype.insertColumn = function(colIndex, options) {
//    // TODO(user): set column widths in a way that makes sense.
//    var colIndex = colIndex || ((this.rows[0] && this.rows[0].columns.length) || 0);
//    var newTds = [];
//    for (var rowNum = 0, row; row = this.rows[rowNum]; rowNum++) {
//        var existingCell = row.columns[colIndex];
//        if (existingCell && existingCell.endCol >= colIndex &&
//            existingCell.startCol < colIndex) {
//            existingCell.setColSpan(existingCell.colSpan + 1);
//            rowNum += existingCell.rowSpan - 1;
//        } else {
//            var newTd = document.createElement('td');
//            newTd.innerHTML = options.placeHolder;
//            this.insertCellElement(newTd, rowNum, colIndex);
//            newTds.push(newTd);
//        }
//    }
//    this.refresh();
//    return newTds;
//};

/**
 * Merges multiple cells into a single cell, and sets the rowSpan and colSpan
 * attributes of the cell to take up the same space as the original cells.
 * @param {number} startRowIndex Top coordinate of the cells to merge.
 * @param {number} startColIndex Left coordinate of the cells to merge.
 * @param {number} endRowIndex Bottom coordinate of the cells to merge.
 * @param {number} endColIndex Right coordinate of the cells to merge.
 * @return {boolean} Whether or not the merge was possible. If the cells
 *     in the supplied coordinates can't be merged this will return false.
 */
GoogTable.prototype.mergeCells = function(
        startRowIndex, startColIndex, endRowIndex, endColIndex) {
    // TODO(user): take a single goog.math.Rect parameter instead?
    var cells = [];
    var cell;
    if (startRowIndex == endRowIndex && startColIndex == endColIndex) {
        // <strict/>
        return false;
    }
    // Gather cells and do sanity check.
    for (var i = startRowIndex; i <= endRowIndex; i++) {
        for (var j = startColIndex; j <= endColIndex; j++) {
            cell = this.rows[i].columns[j];
            if (cell.startRow < startRowIndex ||
                    cell.endRow > endRowIndex ||
                    cell.startCol < startColIndex ||
                    cell.endCol > endColIndex) {
                // <strict/>
                return false;
            }
            // TODO(user): this is somewhat inefficient, as we will add
            // a reference for a cell for each position, even if it's a single
            // cell with row/colspan.
            cells.push(cell);
        }
    }
    var targetCell = cells[0];
    var targetTd = targetCell.element;
    var doc = document;

    // Merge cell contents and discard other cells.
    for (var i = 1; cell = cells[i]; i++) {
        var td = cell.element;
        if (!td.parentNode || td == targetTd) {
            // We've already handled this cell at one of its previous positions.
            continue;
        }
        // Add a space if needed, to keep merged content from getting squished
        // together.
        if (targetTd.lastChild &&
                targetTd.lastChild.nodeType === Node.TEXT_NODE) {
            targetTd.appendChild(doc.createElement('br'));
        }
        var childNode;
        while ((childNode = td.firstChild)) {
            targetTd.appendChild(childNode);
        }
        td.parentNode.removeChild(td);
    }
    targetCell.setColSpan((endColIndex - startColIndex) + 1);
    targetCell.setRowSpan((endRowIndex - startRowIndex) + 1);
    this.refresh();

    return true;
};


/**
 * Splits a cell with colspans or rowspans into multiple descrete cells.
 * @param {number} rowIndex y coordinate of the cell to split.
 * @param {number} colIndex x coordinate of the cell to split.
 * @return {Array.<Element>} Array of new cell elements created by splitting
 *     the cell.
 */
// TODO(user): support splitting only horizontally or vertically,
// support splitting cells that aren't already row/colspanned.
GoogTable.prototype.splitCell = function(rowIndex, colIndex) {
    var row = this.rows[rowIndex];
    var cell = row.columns[colIndex];
    var newTds = [];
    var html = cell.element.innerHTML;
    for (var i = 0; i < cell.rowSpan; i++) {
        for (var j = 0; j < cell.colSpan; j++) {
            if (i > 0 || j > 0) {
                var newTd = document.createElement('td');
                this.insertCellElement(newTd, rowIndex + i, colIndex + j);
                newTds.push(newTd);
            }
        }
    }
    cell.setColSpan(1);
    cell.setRowSpan(1);
    // Set first cell HTML
    newTds[0].innerHTML = html;
    cell.element.innerHTML = '';
    this.refresh();
    return newTds;
};


/**
 * Inserts a cell element at the given position. The colIndex is the logical
 * column index, not the position in the dom. This takes into consideration
 * that cells in a given logical  row may actually be children of a previous
 * DOM row that have used rowSpan to extend into the row.
 * @param {Element} td The new cell element to insert.
 * @param {number} rowIndex Row in which to insert the element.
 * @param {number} colIndex Column in which to insert the element.
 */
GoogTable.prototype.insertCellElement = function(
        td, rowIndex, colIndex) {
    var row = this.rows[rowIndex];
    var nextSiblingElement = null;
    for (var i = colIndex, cell; cell = row.columns[i]; i += cell.colSpan) {
        if (cell.startRow == rowIndex) {
            nextSiblingElement = cell.element;
            break;
        }
    }
    row.element.insertBefore(td, nextSiblingElement);
};


/**
 * Class representing a logical table row: a tr element and any cells
 * that appear in that row.
 * @param {Element} trElement This rows's underlying TR element.
 * @param {number} rowIndex This row's index in its parent table.
 * @constructor
 */
GoogTableRow = function(trElement, rowIndex) {
    this.index = rowIndex;
    this.element = trElement;
    this.columns = [];
};



/**
 * Class representing a table cell, which may span across multiple
 * rows and columns
 * @param {Element} td This cell's underlying TD or TH element.
 * @param {number} startRow Index of the row where this cell begins.
 * @param {number} startCol Index of the column where this cell begins.
 * @constructor
 */
GoogTableCell = function(td, startRow, startCol) {
    this.element = td;
    this.colSpan = parseInt(td.colSpan, 10) || 1;
    this.rowSpan = parseInt(td.rowSpan, 10) || 1;
    this.startRow = startRow;
    this.startCol = startCol;
    this.updateCoordinates_();
};


/**
 * Calculates this cell's endRow/endCol coordinates based on rowSpan/colSpan
 * @private
 */
GoogTableCell.prototype.updateCoordinates_ = function() {
    this.endCol = this.startCol + this.colSpan - 1;
    this.endRow = this.startRow + this.rowSpan - 1;
};


/**
 * Set this cell's colSpan, updating both its colSpan property and the
 * underlying element's colSpan attribute.
 * @param {number} colSpan The new colSpan.
 */
GoogTableCell.prototype.setColSpan = function(colSpan) {
    if (colSpan != this.colSpan) {
        if (colSpan > 1) {
            this.element.colSpan = colSpan;
        } else {
            this.element.colSpan = 1,
                    this.element.removeAttribute('colSpan');
        }
        this.colSpan = colSpan;
        this.updateCoordinates_();
    }
};


/**
 * Set this cell's rowSpan, updating both its rowSpan property and the
 * underlying element's rowSpan attribute.
 * @param {number} rowSpan The new rowSpan.
 */
GoogTableCell.prototype.setRowSpan = function(rowSpan) {
    if (rowSpan != this.rowSpan) {
        if (rowSpan > 1) {
            this.element.rowSpan = rowSpan.toString();
        } else {
            this.element.rowSpan = '1';
            this.element.removeAttribute('rowSpan');
        }
        this.rowSpan = rowSpan;
        this.updateCoordinates_();
    }
};

                /* End of file: temp/default/src/dependencies/goog-table.js */
            
                /* File: temp/default/src/dependencies/resizetable.js */
                function countColumns(tableElement) {
    // calculate current number of columns of a table,
    // taking into account rowspans and colspans

    var tr, td, i, j, k, cs, rs;
    var rowspanLeft = new Array();
    var tableCols = 0;
    var tableRows = tableElement.rows.length;
    i = 0;
    while (i < tableRows) {
        var tr = tableElement.rows[i];
        var j = 0;
        var k = 0;
        // Trace and adjust the cells of this row
        while (j < tr.cells.length || k < rowspanLeft.length) {
            if (rowspanLeft[k]) {
                rowspanLeft[k++]--;
            } else if (j >= tr.cells.length) {
                k++;
            } else {
                td = tr.cells[j++];
                rs = Math.max(1, parseInt(td.rowSpan));
                for (cs = Math.max(1, parseInt(td.colSpan)); cs > 0; cs--) {
                    if (rowspanLeft[k])
                        break; // Overlapping colspan and rowspan cells
                    rowspanLeft[k++] = rs - 1;
                }
            }
        }
        tableCols = Math.max(k, tableCols);
        i++;
    }
    return tableCols;
}

function resizeTable(tableElement, rCount, rStart, cCount, cStart, options) {
    // Insert or remove rows and columns in the table, taking into account
    // rowspans and colspans
    // Parameters:
    //   tableElement: DOM element representing existing table to be modified
    //   rCount:       number of rows to add (if >0) or delete (if <0)
    //   rStart:       number of row where rows should be added/deleted
    //   cCount:       number of columns to add (if >0) or delete (if <0)
    //   cStart:       number of column where columns should be added/deleted
    //   cCount
    //   cStart
    var tr, td, i, j, k, l, cs, rs;
    var rowspanLeft = [];
    var rowspanCell = [];
    var tableRows0 = tableElement.rows.length;
    var tableCols0 = countColumns(tableElement);
    var cells = [];

    if (rCount > 0) { // Prep insertion of rows
        for (i = rStart; i < rStart + rCount; i++) {
            tableElement.insertRow(i);
        }
    }
    i = 0;
    while (i < tableRows0) {
        var tr = tableElement.rows[i];
        var j = 0;
        var k = 0;
        // Trace and adjust the cells of this row
        while (k < tableCols0) {
            if (cCount > 0 && k === cStart) { // Insert columns by inserting cells
                for (l = 0; l < cCount; l++) {  // between/before existing cells
                    cells.push(insertEmptyCell(tr, j++, options.placeHolder));
                }
            }
            if (rowspanLeft[k]) {
                if (rCount < 0
                        && i === rStart - rCount && rowspanCell[k]
                        && rowspanCell[k].rowSpan == 1) {
                    // This is the first row after a series of to-be-deleted rows.
                    // Any rowspan-cells covering this row which started in the
                    // to-be-deleted rows have to be moved into this row, with
                    // rowspan adjusted. All such cells are marked td.rowSpan==1.
                    td = rowspanCell[k];
                    if (j >= tr.cells.length) {
                        tr.appendChild(td);
                    } else {
                        tr.insertBefore(td, tr.cells[j]);
                    }
                    j++;
                    rs = td.rowSpan = rowspanLeft[k];
                    for (cs = Math.max(1, parseInt(td.colSpan)); cs > 0; --cs) {
                        rowspanLeft[k++] = rs - 1;
                    }
                } else {
                    if (--rowspanLeft[k++] === 0)
                        rowspanCell[k] = null;
                    while (rowspanLeft[k] && !rowspanCell[k]) {
                        // This is a cell of a block with both rowspan and colspan>1
                        // Handle all remaining cells in this row of the block, so as to
                        // avoid inserting cells which are already covered by the block
                        --rowspanLeft[k++];
                    }
                }
            } else {
                if (j >= tr.cells.length) {
                    cells.push(insertEmptyCell(tr, j, options.placeHolder)); // append missing cell
                }
                td = tr.cells[j++];
                rs = Math.max(1, parseInt(td.rowSpan));
                if (rs > 1) {
                    rowspanCell[k] = td;
                    if (rCount < 0 && i >= rStart && i < rStart - rCount) {//row is to-be-deleted
                        td.rowSpan = 1; // Mark cell as to-be-moved-down-later
                    }
                }
                var k0 = k;
                for (cs = Math.max(1, parseInt(td.colSpan)); cs > 0; --cs) {
                    if (rowspanLeft[k]) { // Overlapping colspan and rowspan cells
                        td.colSpan -= cs; // Set adjustment into table
                        break;
                    }
                    rowspanLeft[k++] = rs - 1;
                }
                if (rCount < 0 && i >= rStart && i < rStart - rCount) {
                    // This row is to be deleted: do not insert/remove columns,
                    // but preserve row as-is so we can move cells down later on
                } else if (cCount > 0 && k > cStart && k0 < cStart) {
                    td.colSpan += cCount; // Insert columns by widening cell
                } else if (cCount < 0 && k0 < cStart - cCount && k > cStart) {
                    // Delete columns in overlap of [k0,k> and [cStart,cStart-cCount>
                    var newColSpan = Math.max(0, cStart - k0) + Math.max(0, k - (cStart - cCount));
                    if (newColSpan) {
                        // .. by reducing width of cell containing to-be-deleted columns
                        td.colSpan = newColSpan;
                    } else {
                        // .. by removing fully-encompassed cell
                        tr.deleteCell(--j);
                    }
                }
            }
        }
        if (cCount > 0 && k === cStart) { // Insert columns by appending cells to row
            for (l = 0; l < cCount; l++) {
                cells.push(insertEmptyCell(tr, j++, options.placeHolder));
            }
        }
        i++;
        if (rCount > 0 && i === rStart) {
            // Adjust rowspans present at start of inserted rows
            for (l = 0; l < tableCols0; l++) {
                if (rowspanLeft[l])
                    rowspanLeft[l] += rCount;
                if (rowspanCell[l])
                    rowspanCell[l].rowSpan += rCount;
            }
        } else if (rCount < 0 && i === rStart) {
            // Adjust rowspans present at start of to-be-deleted rows
            for (l = 0; l < rowspanCell.length; l++) {
                if (rowspanCell[l]) {
                    rowspanCell[l].rowSpan -= Math.min(-rCount, rowspanLeft[l]);
                }
            }
        }
    }
    if (rCount < 0) {
        for (i = rStart; i < rStart - rCount; i++) {
            tableElement.deleteRow(i);
        }
    }
    return cells;
}

function insertEmptyCell(row, index, placeHolder) {
    var sibling, cell;
    // Check the cell's sibling to detect header cells
    if (index > 0) {
        sibling = row.cells[index - 1];
    } else if (index < row.cells.length) {
        sibling = row.cells[index + 1];
    }

    // Header cell
    cell = row.insertCell(index);
    if (sibling && sibling.tagName === 'TH') {
        var header = document.createElement('th');
        if (placeHolder) {
            header.innerHTML = placeHolder;
        }
        $(cell).replaceWith(header)
    } else if (placeHolder) {
        cell.innerHTML = placeHolder;
    }
    return cell;
}

                /* End of file: temp/default/src/dependencies/resizetable.js */
            
                /* File: temp/default/src/plugins/table/table-cell-button.js */
                /**
 * @fileOverview Contains the table cell button class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * The table cell button class.
 *
 * @constructor
 * @augments FilteredPreviewButton
 *
 * @param {Object} options Options hash.
 */
function TableCellButton(options) {
    FilteredPreviewButton.call(this, options);
}

TableCellButton.prototype = Object.create(FilteredPreviewButton.prototype);

/**
 * @todo
 *
 * @param {RangySelection} range The selection to get the cell from.
 * @returns {Element|null}
 */
TableCellButton.prototype.getElement = function(range) {
    var cell = $(range.commonAncestorContainer.parentNode).closest('td, th');
    if (cell.length) {
        return cell[0];
    }
    return null;
};

                /* End of file: temp/default/src/plugins/table/table-cell-button.js */
            
                /* File: temp/default/src/plugins/table/table-create.js */
                /**
 * @fileOverview Contains the table menu class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * The table menu class.
 *
 * @constructor
 * @augments Menu
 *
 * @param {Object} options Options hash.
 */
function TableMenu(options) {
    Menu.call(this, {
        name: 'tableCreate'
    });
}

TableMenu.prototype = Object.create(Menu.prototype);

/**
 * Creates the menu table.
 *
 * @param event The mouse event to create the table.
 */
TableMenu.prototype.createTable = function(event) {
    this.raptor.actionApply(function() {
        selectionReplace(elementOuterHtml($(tableCreate(event.target.cellIndex + 1, event.target.parentNode.rowIndex + 1, {
            placeHolder: '&nbsp;'
        }))));
    });
};

/**
 * Highlights the cells inside the table menu.
 *
 * @param event The mouse event to trigger the function.
 */
TableMenu.prototype.highlight = function(event) {
    var cells = tableCellsInRange(this.menuTable.get(0), {
            x: 0,
            y: 0
        }, {
            x: event.target.cellIndex,
            y: event.target.parentNode.rowIndex
        });

    // highlight cells in menu
    this.highlightRemove(event);
    $(cells).addClass(this.options.baseClass + '-menu-hover');

    // Preview create
    this.raptor.actionPreview(function() {
        selectionReplace(elementOuterHtml($(tableCreate(event.target.cellIndex + 1, event.target.parentNode.rowIndex + 1, {
            placeHolder: '&nbsp;'
        }))));
    });
};

/**
 * Removes the highlight from the table menu.
 *
 * @param event The mouse event to trigger the function.
 */
TableMenu.prototype.highlightRemove = function(event) {
    this.menuTable
        .find('.' + this.options.baseClass + '-menu-hover')
        .removeClass(this.options.baseClass + '-menu-hover');
    this.raptor.actionPreviewRestore();
};

/**
 * Prepares and returns the menu for use in the Raptor UI.
 * @returns {Element}
 */
TableMenu.prototype.getMenu = function() {
    if (!this.menu) {
        this.menuContent = this.raptor.getTemplate('table.create-menu', this.options);
        Menu.prototype.getMenu.call(this)
            .on('click', 'td', this.createTable.bind(this))
            .on('mouseenter', 'td', this.highlight.bind(this))
            .mouseleave(this.highlightRemove.bind(this));
        this.menuTable = this.menu.find('table:eq(0)');
    }
    return this.menu;
};

Raptor.registerUi(new TableMenu());

                /* End of file: temp/default/src/plugins/table/table-create.js */
            
                /* File: temp/default/src/plugins/table/table-delete-column.js */
                /**
 * @fileOverview Contains the delete column button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates a table cell button to delete a column from a table.
 */
Raptor.registerUi(new TableCellButton({
    name: 'tableDeleteColumn',
    applyToElement: function(cell) {
        var position = tableGetCellIndex(cell),
            table = cell.parentNode.parentNode.parentNode,
            nextCell;
        tableDeleteColumn(cell.parentNode.parentNode.parentNode, position.x);
        if (tableIsEmpty(table)) {
            table.parentNode.removeChild(table);
            return;
        }
        nextCell = tableGetCellByIndex(table, position);
        if (!nextCell && position.x > 0) {
            nextCell = tableGetCellByIndex(table, {
                x: position.x - 1,
                y: position.y
            });
        }
        selectionSelectInner(nextCell);
    }
}));

                /* End of file: temp/default/src/plugins/table/table-delete-column.js */
            
                /* File: temp/default/src/plugins/table/table-delete-row.js */
                /**
 * @fileOverview Contains the delete column button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates a table cell button to delete a row from a table.
 */
Raptor.registerUi(new TableCellButton({
    name: 'tableDeleteRow',
    applyToElement: function(cell) {
        var position = tableGetCellIndex(cell),
            table = cell.parentNode.parentNode.parentNode,
            nextCell;
        tableDeleteRow(cell.parentNode.parentNode.parentNode, position.y);
        if (tableIsEmpty(table)) {
            table.parentNode.removeChild(table);
            return;
        }
        nextCell = tableGetCellByIndex(table, position);
        if (!nextCell && position.y > 0) {
            nextCell = tableGetCellByIndex(table, {
                x: position.x,
                y: position.y - 1
            });
        }
        selectionSelectInner(nextCell);
    }
}));

                /* End of file: temp/default/src/plugins/table/table-delete-row.js */
            
                /* File: temp/default/src/plugins/table/table-insert-column.js */
                /**
 * @fileOverview Contains the insert column button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates a table cell button to insert a column into a table.
 */
Raptor.registerUi(new TableCellButton({
    name: 'tableInsertColumn',
    applyToElement: function(cell) {
        tableInsertColumn(cell.parentNode.parentNode.parentNode, tableGetCellIndex(cell).x + 1, {
            placeHolder: '&nbsp;'
        });
    }
}));

                /* End of file: temp/default/src/plugins/table/table-insert-column.js */
            
                /* File: temp/default/src/plugins/table/table-insert-row.js */
                /**
 * @fileOverview Contains the insert row button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates a table cell button to insert a row into a table.
 */
Raptor.registerUi(new TableCellButton({
    name: 'tableInsertRow',
    applyToElement: function(cell) {
        tableInsertRow(cell.parentNode.parentNode.parentNode, tableGetCellIndex(cell).y + 1, {
            placeHolder: '&nbsp;'
        });
    }
}));

                /* End of file: temp/default/src/plugins/table/table-insert-row.js */
            
                /* File: temp/default/src/plugins/table/table-support.js */
                /**
 * @fileOverview Contains the table helper functions.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

var tableSupportDragging = false,
    tableSupportStartCell = null;

/**
 * The supporting table class.
 *
 * @constructor
 *
 * @augments RaptorPlugin
 *
 * @param {String} name
 * @param {Object} overrides Options hash.
 */
function TableSupport(name, overrides) {
    RaptorPlugin.call(this, name || 'tableSupport', overrides);
}

TableSupport.prototype = Object.create(RaptorPlugin.prototype);

/**
 * Initialize the table support class.
 */
TableSupport.prototype.init = function() {
    this.raptor.bind('selectionCustomise', this.selectionCustomise.bind(this));
    this.raptor.registerHotkey('tab', this.tabToNextCell.bind(this));
    this.raptor.registerHotkey('shift+tab', this.tabToPrevCell.bind(this));
    this.raptor.getElement()
        .on('mousedown', 'tbody td', this.cellMouseDown.bind(this))
        .on('mouseover', 'tbody td', this.cellMouseOver.bind(this))
        .mouseup(this.cellMouseUp.bind(this));
};

/**
 * @todo i think this has something to do with the cell selection but i'm not sure
 * @returns {Array}
 */
TableSupport.prototype.selectionCustomise = function() {
    var ranges = [],
        range;
    $('.' + this.options.baseClass + '-cell-selected').each(function() {
        range = rangy.createRange();
        range.selectNodeContents(this);
        ranges.push(range);
    });
    return ranges;
};

/**
 * Event handler for mouse down.
 *
 * @param event The mouse event to trigger the function.
 */
TableSupport.prototype.cellMouseDown = function(event) {
    if (this.raptor.isEditing()) {
        tableSupportStartCell = tableGetCellIndex(event.target);
        if (tableSupportStartCell !== null) {
            tableSupportDragging = true;
            $(event.target).closest('table').addClass(this.options.baseClass + '-selected');
        }
    }
};

/**
 * Event handler for mouse up.
 *
 * @param event The mouse event to trigger the function.
 */
TableSupport.prototype.cellMouseUp = function(event) {
    tableSupportDragging = false;
    var cell = $(event.target).closest('td'),
        deselect = false;
    if (cell.length > 0 && tableSupportStartCell !== null) {
        var index = tableGetCellIndex(cell.get(0));
        if (index === null ||
                (index.x == tableSupportStartCell.x &&
                index.y == tableSupportStartCell.y)) {
            deselect = true;
        }
    } else {
        deselect = true;
    }
    if (deselect) {
        $('.' + this.options.baseClass + '-selected').removeClass(this.options.baseClass + '-selected');
        $('.' + this.options.baseClass + '-cell-selected').removeClass(this.options.baseClass + '-cell-selected');
    }
};

/**
 * Event handler for mouse hover.
 *
 * @param event The mouse event to trigger the function.
 */
TableSupport.prototype.cellMouseOver = function(event) {
    if (tableSupportDragging) {
        var cells = tableCellsInRange($(event.target).closest('table').get(0), tableSupportStartCell, tableGetCellIndex(event.target));
        $('.' + this.options.baseClass + '-cell-selected').removeClass(this.options.baseClass + '-cell-selected');
        $(cells).addClass(this.options.baseClass + '-cell-selected');
        rangy.getSelection().removeAllRanges();
    }
};

/**
 * Handles tabbing to the next table cell.
 */
TableSupport.prototype.tabToNextCell = function() {
    var range = rangy.getSelection().getRangeAt(0),
        parent = rangeGetCommonAncestor(range),
        cell = $(parent).closest('td');
    if (cell.length === 0) {
        return false;
    }
    var next = cell.next('td');
    if (next.length === 0) {
        next = cell.closest('tr').next('tr').find('td:first');
        if (next.length === 0) {
            next = cell.closest('tbody').find('td:first');
        }
    }
    rangeSelectElementContent(range, next);
    rangy.getSelection().setSingleRange(range);
};

/**
 * Handles tabbing to the next table cell.
 */
TableSupport.prototype.tabToPrevCell = function() {
    var range = rangy.getSelection().getRangeAt(0),
        parent = rangeGetCommonAncestor(range),
        cell = $(parent).closest('td');
    if (cell.length === 0) {
        return false;
    }
    var prev = cell.prev('td');
    if (prev.length === 0) {
        prev = cell.closest('tr').prev('tr').find('td:last');
        if (prev.length === 0) {
            prev = cell.closest('tbody').find('td:last');
        }
    }
    rangeSelectElementContent(range, prev);
    rangy.getSelection().setSingleRange(range);
};

Raptor.registerPlugin(new TableSupport());

                /* End of file: temp/default/src/plugins/table/table-support.js */
            
                /* File: temp/default/src/plugins/tag-menu/tag-menu.js */
                /**
 * @fileOverview Contains the left align button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * The tag menu class.
 *
 * @constructor
 * @augments SelectMenu
 *
 * @param {Object} options Options hash.
 */
function TagMenu(options) {
    SelectMenu.call(this, {
        name: 'tagMenu'
    });
}

TagMenu.prototype = Object.create(SelectMenu.prototype);

/**
 * Initializes the tag menu.
 */
TagMenu.prototype.init = function() {
    this.raptor.bind('selectionChange', this.updateButton.bind(this));
    return SelectMenu.prototype.init.apply(this, arguments);
};

/**
 * Changes the tags on the selected element(s).
 *
 * @param {HTML} tag The new tag.
 */
TagMenu.prototype.changeTag = function(tag) {
    // Prevent injection of illegal tags
    if (typeof tag === 'undefined' || tag === 'na') {
        return;
    }

    var selectedElement = selectionGetElement(),
        limitElement = this.raptor.getElement();
    if (selectedElement && !selectedElement.is(limitElement)) {
        var cell = selectedElement.closest('td, li, #' + limitElement.attr('id'));
        if (cell.length !== 0) {
            limitElement = cell;
        }
    }
    
    selectionChangeTags(tag, [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'div', 'pre', 'address'
    ], limitElement);
};

/**
 * Applies the tag change.
 *
 * @param event The mouse event to trigger the function.
 */
TagMenu.prototype.menuItemClick = function(event) {
    SelectMenu.prototype.menuItemClick.apply(this, arguments);
    this.raptor.actionApply(function() {
        this.changeTag($(event.currentTarget).data('value'));
    }.bind(this));
};

/**
 * Generates a preview state for a change of tag.
 *
 * @param event The mouse event to trigger the preview.
 */
TagMenu.prototype.menuItemMouseEnter = function(event) {
    this.raptor.actionPreview(function() {
        this.changeTag($(event.currentTarget).data('value'));
    }.bind(this));
};

/**
 * Restores the tag menu from it's preview state.
 *
 * @param event The mouse event to trigger the restoration of the tag menu.
 */
TagMenu.prototype.menuItemMouseLeave = function(event) {
    this.raptor.actionPreviewRestore();
};

/**
 * Updates the display of the tag menu button.
 */
TagMenu.prototype.updateButton = function() {
    var tag = selectionGetElements()[0],
        button = this.getButton().getButton();
    if (!tag) {
        return;
    }
    var tagName = tag.tagName.toLowerCase(),
        option = this.getMenu().find('[data-value=' + tagName + ']');
    if (option.length) {
        aButtonSetLabel(button, option.html());
    } else {
        aButtonSetLabel(button, _('tagMenuTagNA'));
    }
//    if (this.raptor.getElement()[0] === tag) {
//        aButtonDisable(button);
//    } else {
//        aButtonEnable(button);
//    }
};

/**
 * Prepares and returns the menu items for use in the raptor UI.
 * @returns {Element}
 */
TagMenu.prototype.getMenuItems = function() {
    return this.raptor.getTemplate('tag-menu.menu', this.options);
};

Raptor.registerUi(new TagMenu());

                /* End of file: temp/default/src/plugins/tag-menu/tag-menu.js */
            
                /* File: temp/default/src/plugins/text-align/text-align-button.js */
                /**
 * @fileOverview Contains the text align button class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * The text align button class.
 *
 * @constructor
 * @augments PreviewToggleButton
 *
 * @param {Object} options Options hash.
 */
function TextAlignButton(options) {
    PreviewToggleButton.call(this, $.extend({
        action: function() {
            selectionToggleBlockClasses([
                this.getClass()
            ], [
                this.options.cssPrefix + 'center',
                this.options.cssPrefix + 'left',
                this.options.cssPrefix + 'right',
                this.options.cssPrefix + 'justify'
            ], this.raptor.getElement());
            this.selectionChange();
        },
        selectionToggle: function() {
            return rangy.getSelection().getAllRanges().length > 0 &&
                selectionContains('.' + this.getClass(), this.raptor.getElement());
        }
    }, options));
}

TextAlignButton.prototype = Object.create(PreviewToggleButton.prototype);

                /* End of file: temp/default/src/plugins/text-align/text-align-button.js */
            
                /* File: temp/default/src/plugins/text-align/center.js */
                /**
 * @fileOverview Contains the center align button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates a text align button to align text center.
 */
Raptor.registerUi(new TextAlignButton({
    name: 'alignCenter',
    getClass: function() {
        return this.options.cssPrefix + 'center';
    }
}));

                /* End of file: temp/default/src/plugins/text-align/center.js */
            
                /* File: temp/default/src/plugins/text-align/justify.js */
                /**
 * @fileOverview Contains the justify text button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates a text align button to justify text.
 */
Raptor.registerUi(new TextAlignButton({
    name: 'alignJustify',
    getClass: function() {
        return this.options.cssPrefix + 'justify';
    }
}));

                /* End of file: temp/default/src/plugins/text-align/justify.js */
            
                /* File: temp/default/src/plugins/text-align/left.js */
                /**
 * @fileOverview Contains the left align button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates a text align button to align text left.
 */
Raptor.registerUi(new TextAlignButton({
    name: 'alignLeft',
    getClass: function() {
        return this.options.cssPrefix + 'left';
    }
}));

                /* End of file: temp/default/src/plugins/text-align/left.js */
            
                /* File: temp/default/src/plugins/text-align/right.js */
                /**
 * @fileOverview Contains the right align button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates a text align button to align text right.
 */
Raptor.registerUi(new TextAlignButton({
    name: 'alignRight',
    getClass: function() {
        return this.options.cssPrefix + 'right';
    }
}));

                /* End of file: temp/default/src/plugins/text-align/right.js */
            
                /* File: temp/default/src/plugins/text-style/block-quote.js */
                /**
 * @fileOverview Contains the block quote button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of the preview toggle button to insert a block quote.
 */
Raptor.registerUi(new PreviewToggleButton({
    name: 'textBlockQuote',
    init: function() {
        var result = PreviewToggleButton.prototype.init.apply(this, arguments);
        if (elementIsValid(this.raptor.getElement(), listValidBlockQuoteParents)) {
            return result;
        }
        return;
    },
    action: function() {
        listToggle('blockquote', 'p', this.raptor.getElement());
    },
    selectionToggle: function() {
        return rangy.getSelection().getAllRanges().length > 0 &&
            selectionContains('blockquote', this.raptor.getElement());
    }
}));

                /* End of file: temp/default/src/plugins/text-style/block-quote.js */
            
                /* File: temp/default/src/plugins/text-style/bold.js */
                /**
 * @fileOverview Contains the bold button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of the CSS applier button to apply the bold class to a selection.
 */
Raptor.registerUi(new CSSClassApplierButton({
    name: 'textBold',
    hotkey: 'ctrl+b',
    tag: 'strong',
    classes: ['bold']
}));

                /* End of file: temp/default/src/plugins/text-style/bold.js */
            
                /* File: temp/default/src/plugins/text-style/italic.js */
                /**
 * @fileOverview Contains the italic button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of the CSS applier button to apply the italic class to a
 * selection.
 */
Raptor.registerUi(new CSSClassApplierButton({
    name: 'textItalic',
    hotkey: 'ctrl+i',
    tag: 'em',
    classes: ['italic']
}));

                /* End of file: temp/default/src/plugins/text-style/italic.js */
            
                /* File: temp/default/src/plugins/text-style/underline.js */
                /**
 * @fileOverview Contains the underline button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of the CSS applier button to apply the underline class to a selection.
 */
Raptor.registerUi(new CSSClassApplierButton({
    name: 'textUnderline',
    hotkey: 'ctrl+u',
    tag: 'u',
    classes: ['underline']
}));

                /* End of file: temp/default/src/plugins/text-style/underline.js */
            
                /* File: temp/default/src/plugins/text-style/strike.js */
                /**
 * @fileOverview Contains the strike button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of the CSS applier button to apply the strike class to a
 * selection.
 */
Raptor.registerUi(new CSSClassApplierButton({
    name: 'textStrike',
    tag: 'del',
    classes: ['strike']
}));

                /* End of file: temp/default/src/plugins/text-style/strike.js */
            
                /* File: temp/default/src/plugins/text-style/size-decrease.js */
                /**
 * @fileOverview Contains the text size decrease button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of the preview button to apply the text size decrease
 * class to a selection.
 */
Raptor.registerUi(new PreviewButton({
    name: 'textSizeDecrease',
    action: function() {
        selectionExpandToWord();
        this.raptor.selectionConstrain();
        selectionInverseWrapWithTagClass('small', this.options.cssPrefix + 'small', 'big', this.options.cssPrefix + 'big');
        this.raptor.getElement().find('small.' + this.options.cssPrefix + 'small:empty, big.' + this.options.cssPrefix + 'big:empty').remove();
    }
}));

                /* End of file: temp/default/src/plugins/text-style/size-decrease.js */
            
                /* File: temp/default/src/plugins/text-style/size-increase.js */
                /**
 * @fileOverview Contains the text size increase button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of the preview button to apply the text size increase
 * class to a selection.
 */
Raptor.registerUi(new PreviewButton({
    name: 'textSizeIncrease',
    action: function() {
        selectionExpandToWord();
        this.raptor.selectionConstrain();
        selectionInverseWrapWithTagClass('big', this.options.cssPrefix + 'big', 'small', this.options.cssPrefix + 'small');
        this.raptor.getElement().find('small.' + this.options.cssPrefix + 'small:empty, big.' + this.options.cssPrefix + 'big:empty').remove();
    }
}));

                /* End of file: temp/default/src/plugins/text-style/size-increase.js */
            
                /* File: temp/default/src/plugins/text-style/sub.js */
                /**
 * @fileOverview Contains the subscript button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of the CSS applier button to apply the subscript class to
 * a selection.
 */
Raptor.registerUi(new CSSClassApplierButton({
    name: 'textSub',
    tag: 'sub',
    classes: ['sub']
}));

                /* End of file: temp/default/src/plugins/text-style/sub.js */
            
                /* File: temp/default/src/plugins/text-style/super.js */
                /**
 * @fileOverview Contains the superscript button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of the CSS applier button to apply the superscript class
 * to a selection.
 */
Raptor.registerUi(new CSSClassApplierButton({
    name: 'textSuper',
    tag: 'sup',
    classes: ['sup']
}));

                /* End of file: temp/default/src/plugins/text-style/super.js */
            
                /* File: temp/default/src/plugins/tool-tip/tool-tip.js */
                function ToolTipPlugin(name, overrides) {
    RaptorPlugin.call(this, name || 'toolTip', overrides);
}

ToolTipPlugin.prototype = Object.create(RaptorPlugin.prototype);

ToolTipPlugin.prototype.init = function() {
    this.raptor.bind('toolbarReady', function() {
        this.raptor.getLayout('toolbar').getElement()
            .on('mouseover', '[title]', function(event) {
                $(this).attr('data-title', $(this).attr('title'));
                $(this).removeAttr('title');
            });
    }.bind(this));
};

Raptor.registerPlugin(new ToolTipPlugin());

                /* End of file: temp/default/src/plugins/tool-tip/tool-tip.js */
            
                /* File: temp/default/src/plugins/unsaved-edit-warning/unsaved-edit-warning.js */
                /**
 * @fileOverview Contains the unsaved edit warning plugin class code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

var unsavedEditWarningDirty = 0,
    unsavedEditWarningElement = null;

/**
 * The unsaved edit warning plugin.
 *
 * @constructor
 * @augments RaptorPlugin
 *
 * @param {String} name
 * @param {Object} overrides Options hash.
 */
function UnsavedEditWarningPlugin(name, overrides) {
    RaptorPlugin.call(this, name || 'unsavedEditWarning', overrides);
}

UnsavedEditWarningPlugin.prototype = Object.create(RaptorPlugin.prototype);

/**
 * Enables the unsaved edit warning plugin.
 *
 * @todo raptor details
 * @param {type} raptor
 */
UnsavedEditWarningPlugin.prototype.enable = function(raptor) {
    this.raptor.bind('dirty', this.show.bind(this));
    this.raptor.bind('cleaned', this.hide.bind(this));
};

/**
 * Shows the unsaved edit warning.
 */
UnsavedEditWarningPlugin.prototype.show = function() {
    unsavedEditWarningDirty++;
    if (unsavedEditWarningDirty > 0) {
        elementBringToTop(this.getElement());
        this.getElement().addClass(this.options.baseClass + '-visible');
    }
};

/**
 * Hides the unsaved edit warning.
 *
 * @param event The mouse event that triggers the function.
 */
UnsavedEditWarningPlugin.prototype.hide = function(event) {
    unsavedEditWarningDirty--;
    if (unsavedEditWarningDirty === 0) {
        this.getElement().removeClass(this.options.baseClass + '-visible');
    }
};

/**
 * Prepares and returns the unsaved edit warning element for use in the Raptor UI.
 *
 * @todo instance details
 * @param {type} instance
 * @returns {Element}
 */
UnsavedEditWarningPlugin.prototype.getElement = function() {
    if (!unsavedEditWarningElement) {
        unsavedEditWarningElement = $(this.raptor.getTemplate('unsaved-edit-warning.warning', this.options))
            .mouseenter(function() {
                Raptor.eachInstance(function(editor) {
                    if (editor.isDirty()) {
                        editor.getElement().addClass(this.options.baseClass + '-dirty');
                    }
                });
            })
            .mouseleave(function() {
                $('.' + this.options.baseClass + '-dirty').removeClass(this.options.baseClass + '-dirty');
            }.bind(this))
            .appendTo('body');
    }
    return unsavedEditWarningElement;
};

Raptor.registerPlugin(new UnsavedEditWarningPlugin());

                /* End of file: temp/default/src/plugins/unsaved-edit-warning/unsaved-edit-warning.js */
            
                /* File: temp/default/src/plugins/view-source/view-source.js */
                /**
 * @fileOverview Contains the view source dialog code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates an instance of the dialog button to open the view source dialog.
 */
Raptor.registerUi(new DialogButton({
    name: 'viewSource',
    dialogOptions: {
        width: 600,
        height: 400
    },

    /**
     * Replace the editing element's content with the HTML from the dialog's textarea
     *
     * @param  {Element} dialog
     */
    applyAction: function(dialog) {
        var html = dialog.find('textarea').val();
        this.raptor.actionApply(function() {
            this.raptor.setHtml(html);
        }.bind(this));
    },

    /**
     * Update the dialog's text area with the current HTML.
     */
    openDialog: function() {
        var textarea = this.getDialog().find('textarea');
        textarea.val(this.raptor.getHtml());
        DialogButton.prototype.openDialog.call(this);
        textarea.select();
    },

    /**
     * @return {Element}
     */
    getDialogTemplate: function() {
        return $('<div>').html(this.raptor.getTemplate('view-source.dialog', this.options));
    }
}));

                /* End of file: temp/default/src/plugins/view-source/view-source.js */
            
                /* File: temp/default/src/plugins/special-characters/special-characters.js */
                /**
 * @fileOverview Contains the special characters button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

var insertCharacter = false;

/**
 * Creates an instance of the button class to insert special characters.
 */
Raptor.registerUi(new DialogButton({
    name: 'specialCharacters',
    dialogOptions: {
        width: 645
    },
    options: {
        setOrder: [
            'symbols',
            'mathematics',
            'arrows',
            'greekAlphabet'
        ],
        /**
         * Character sets available for display. From {@link http://turner.faculty.swau.edu/webstuff/htmlsymbols.html}
         */
        characterSets: {
            symbols: {
                name: 'Symbols',
                characters: [
                    ['<', '&lt;', 'less than'],
                    ['>', '&gt;', 'greater than'],
                    ['&', '&amp;', 'ampersand'],
                    ['"', '&quot;', 'quotation mark'],
                    ['&nbsp;', 'non-breaking space: \' \''],
                    ['&emsp;', 'em space: \'  \''],
                    ['&ensp;', 'en space: \' \''],
                    ['&thinsp;', 'thin space: \'\''],
                    ['&mdash;', 'em dash'],
                    ['&ndash;', 'en dash'],
                    ['&minus;', 'minus'],
                    ['-', 'hyphen'],
                    ['&oline;', 'overbar space'],
                    ['&cent;', 'cent'],
                    ['&pound;', 'pound'],
                    ['&euro;', 'euro'],
                    ['&sect;', 'section'],
                    ['&dagger;', 'dagger'],
                    ['&Dagger;', 'double dagger'],
                    ['&lsquo;', 'left single quotes'],
                    ['&rsquo;', 'right single quotes'],
                    ['\'', 'single quotes'],
                    ['&#x263a;', 'smiley face'],
                    ['&#x2605;', 'black star'],
                    ['&#x2606;', 'white star'],
                    ['&#x2610;', 'check box'],
                    ['&middot;', 'middle dot'],
                    ['&bull;', 'bullet'],
                    ['&copy;', 'copyright'],
                    ['&reg;', 'registered'],
                    ['&trade;', 'trade'],
                    ['&iquest;', 'inverted question mark'],
                    ['&iexcl;', 'inverted exclamation mark'],
                    ['&Aring;', 'Angström'],
                    ['&hellip;', 'ellipsis'],
                    ['&#x2295;', 'earth'],
                    ['&#x2299;', 'sun'],
                    ['&#x2640;', 'female'],
                    ['&#x2642;', 'male'],
                    ['&clubs;', 'clubs or shamrock'],
                    ['&spades;', 'spades'],
                    ['&hearts;', 'hearts or valentine'],
                    ['&diams;', 'diamonds'],
                    ['&loz;', 'diamond']
                ]
            },
            mathematics: {
                name: 'Mathematics',
                characters: [
                    ['&lt;', 'less than'],
                    ['&le;', 'less than or equal to'],
                    ['&gt;', 'greater than'],
                    ['&ge;', 'greater than or equal to'],
                    ['&ne;', 'not equal'],
                    ['&asymp;', 'approximately equal to'],
                    ['&equiv;', 'identically equal to'],
                    ['&cong;', 'congruent to'],
                    ['&prop;', 'proportional'],
                    ['&there4;', 'therefore'],
                    ['&sum;', 'summation'],
                    ['&prod;', 'product'],
                    ['&prime;', 'prime or minutes'],
                    ['&Prime;', 'double prime or seconds'],
                    ['&Delta;', 'delta'],
                    ['&nabla;', 'del'],
                    ['&part;', 'partial'],
                    ['&int;', 'integral'],
                    ['&middot;', 'middle dot'],
                    ['&sdot;', 'dot operator'],
                    ['&bull;', 'bullet'],
                    ['&minus;', 'minus sign'],
                    ['&times;', 'multipllcation sign'],
                    ['&divide;', 'division sign'],
                    ['&frasl;', 'fraction slash, (ordinary / \\)'],
                    ['&plusmn;', 'plus or minus'],
                    ['&deg;', 'degree sign'],
                    ['&lfloor;', 'floor function'],
                    ['&rfloor;', 'floor function'],
                    ['&lceil;', 'ceiling function'],
                    ['&rceil;', 'ceiling function'],
                    ['&lowast;', 'asterisk operator, (ordinary *)'],
                    ['&oplus;', 'circled plus'],
                    ['&otimes;', 'circled times'],
                    ['&ordm;', 'masculine ordinal'],
                    ['&lang;', 'bra'],
                    ['&rang;', 'ket'],
                    ['&infin;', 'infinity'],
                    ['&pi;', 'pi'],
                    ['&frac12;', 'half'],
                    ['&alefsym;', 'aleph'],
                    ['&radic;', 'radical'],
                    ['&ang;', 'angle'],
                    ['&perp;', 'perpendicular'],
                    ['&real;', 'real'],
                    ['&isin;', 'is an element of'],
                    ['&notin;', 'not an element of'],
                    ['&empty;', 'null set'],
                    ['&sub;', 'subset of'],
                    ['&sube;', 'subset or or equal to'],
                    ['&nsub;', 'not a subset'],
                    ['&cap;', 'intersection'],
                    ['&cup;', 'union'],
                    ['&sim;', 'tilde operator (ordinary ~)'],
                    ['&Oslash;', 'slash O'],
                    ['&and;', 'logical and'],
                    ['&Lambda;', 'lambda (and)'],
                    ['&or;', 'logical or'],
                    ['&not;', 'not sign'],
                    ['&sim;', 'tilde operator (ordinary ~)'],
                    ['&rarr;', 'right arrow'],
                    ['&rArr;', 'double right arrow'],
                    ['&larr;', 'left arrow'],
                    ['&lArr;', 'left double arrow'],
                    ['&harr;', 'left right arrow'],
                    ['&hArr;', 'left right double arrow']
                ]
            },
            arrows: {
                name: 'Arrows',
                characters: [
                    ['&darr;', 'down arrow'],
                    ['&dArr;', 'down double arrow'],
                    ['&uarr;', 'up arrow'],
                    ['&uArr;', 'up double arrow'],
                    ['&crarr;', 'arriage return arrow'],
                    ['&rarr;', 'right arrow'],
                    ['&rArr;', 'double right arrow'],
                    ['&larr;', 'left arrow'],
                    ['&lArr;', 'left double arrow'],
                    ['&harr;', 'left right arrow'],
                    ['&hArr;', 'left right double arrow']
                ]
            },
            greekAlphabet: {
                name: 'Greek Alphabet',
                characters: [
                    ['&alpha;', 'alpha'],
                    ['&beta;', 'beta'],
                    ['&gamma;', 'gamma'],
                    ['&delta;', 'delta'],
                    ['&epsilon;', 'epsilon'],
                    ['&zeta;', 'zeta'],
                    ['&eta;', 'eta'],
                    ['&theta;', 'theta'],
                    ['&iota;', 'iota'],
                    ['&kappa;', 'kappa'],
                    ['&lambda;', 'lambda'],
                    ['&mu;', 'mu'],
                    ['&nu;', 'nu'],
                    ['&xi;', 'xi'],
                    ['&omicron;', 'omicron'],
                    ['&pi;', 'pi'],
                    ['&rho;', 'rho'],
                    ['&sigma;', 'sigma'],
                    ['&tau;', 'tau'],
                    ['&upsilon;', 'upsilon'],
                    ['&phi;', 'phi'],
                    ['&chi;', 'chi'],
                    ['&psi;', 'psi'],
                    ['&omega;', 'omega'],
                    ['&Alpha;', 'alpha'],
                    ['&Beta;', 'beta'],
                    ['&Gamma;', 'gamma'],
                    ['&Delta;', 'delta'],
                    ['&Epsilon;', 'epsilon'],
                    ['&Zeta;', 'zeta'],
                    ['&Eta;', 'eta'],
                    ['&Theta;', 'theta'],
                    ['&Iota;', 'iota'],
                    ['&Kappa;', 'kappa'],
                    ['&Lambda;', 'lambda'],
                    ['&Mu;', 'mu'],
                    ['&Nu;', 'nu'],
                    ['&Xi;', 'xi'],
                    ['&Omicron;', 'omicron'],
                    ['&Pi;', 'pi'],
                    ['&Rho;', 'rho'],
                    ['&Sigma;', 'sigma'],
                    ['&Tau;', 'tau'],
                    ['&Upsilon;', 'upsilon'],
                    ['&Phi;', 'phi'],
                    ['&Chi;', 'chi'],
                    ['&Psi;', 'psi'],
                    ['&Omega;', 'omega']
                ]
            }
        }
    },

    applyAction: function(dialog) {
        this.raptor.actionApply(function() {
            if (insertCharacter) {
                selectionReplace(insertCharacter);
            }
            insertCharacter = false;
        });
    },

    /**
     * Prepare tabs and add buttons to tab content.
     *
     * @return {Element}
     */
    getDialogTemplate: function() {
        var html = $(this.raptor.getTemplate('special-characters.dialog')).appendTo('body').hide();
        var setKey, tabContent, character, characterButton;
        for (var setOrderIndex = 0; setOrderIndex < this.options.setOrder.length; setOrderIndex++) {
            setKey = this.options.setOrder[setOrderIndex];

            html.find('ul').append(this.raptor.getTemplate('special-characters.tab-li', {
                baseClass: this.options.baseClass,
                name: this.options.characterSets[setKey].name,
                key: setKey
            }));

            tabContent = $(this.raptor.getTemplate('special-characters.tab-content', {
                baseClass: this.options.baseClass,
                key: setKey
            }));
            var tabCharacters = [];
            for (var charactersIndex = 0; charactersIndex < this.options.characterSets[setKey].characters.length; charactersIndex++) {
                character = this.options.characterSets[setKey].characters[charactersIndex];
                characterButton = this.raptor.getTemplate('special-characters.tab-button', {
                    htmlEntity: character[0],
                    description: character[1],
                    setKey: setKey,
                    charactersIndex: charactersIndex
                });
                tabCharacters.push(characterButton);
            }
            tabContent.append(tabCharacters.join(''));
            html.find('ul').after(tabContent);
        }
        html.show();

        var _this = this;
        html.find('button').each(function() {
            aButton($(this));
        }).click(function() {
            var setKey = $(this).attr('data-setKey');
            var charactersIndex = $(this).attr('data-charactersIndex');
            insertCharacter = _this.options.characterSets[setKey].characters[charactersIndex][0];
            _this.getOkButton(_this.name).click.call(this);
        });
        aTabs(html);
        return html;
    },

    getCancelButton: function() {
        return;
    }
}));

                /* End of file: temp/default/src/plugins/special-characters/special-characters.js */
            
                /* File: temp/default/src/plugins/logo/logo.js */
                /**
 * @fileOverview Contains the logo button code.
 * @license http://www.raptor-editor.com/license
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 * @author Melissa Richards <melissa@panmedia.co.nz>
 */

/**
 * Creates a new instance of the button class to display the raptor logo and
 * link to the raptor version page.
 */
Raptor.registerUi(new Button({
    name: 'logo',
    // <usage-statistics>
    init: function() {
        var button = Button.prototype.init.apply(this, arguments);
        button.find('.ui-button-fa fa-primary').css({
            'background-image': 'url(//www.raptor-editor.com/logo/1.0.3?json=' +
                encodeURIComponent(JSON.stringify(this.raptor.options)) + ')'
        });
        return button;
    },
    // </usage-statistics>
    action: function() {
        window.open('http://www.raptor-editor.com/about/1.0.3', '_blank');
    }
}));

                /* End of file: temp/default/src/plugins/logo/logo.js */
            
                    })(jQuery);
                    /* End of wrapper. */
                document.write('<style type="text/css">\n\
                /* File: temp/default/src/dependencies/themes/mammoth/theme.css */\n\
                .ui-button {\n\
  display: -moz-inline-box;\n\
  -moz-box-orient: vertical;\n\
  display: inline-block;\n\
  vertical-align: baseline;\n\
  zoom: 1;\n\
  *display: inline;\n\
  *vertical-align: auto;\n\
}\n\
\n\
.ui-button-fa fa-only .ui-icon {\n\
  height: 0;\n\
  overflow: hidden;\n\
  display: block;\n\
}\n\
\n\
.ui-notification ul, .ui-sortable {\n\
  list-style: none;\n\
  padding-left: 0;\n\
}\n\
.ui-notification ul > li, .ui-sortable > li {\n\
  list-style: none;\n\
  padding-left: 0;\n\
}\n\
\n\
.ui-buttonset > .ui-button,\n\
.ui-buttonset .ui-selectmenu-button, .ui-tabs, .ui-tabs .ui-tabs-nav, .ui-tabs .ui-tabs-nav li, .form-text-button-table .form-text-button-button {\n\
  -webkit-border-radius: 0;\n\
  -moz-border-radius: 0;\n\
  -ms-border-radius: 0;\n\
  -o-border-radius: 0;\n\
  border-radius: 0;\n\
}\n\
\n\
.ui-accordion .ui-accordion-header, .ui-accordion .ui-accordion-header .ui-icon, .ui-accordion .ui-accordion-content, .ui-menu .ui-menu-item a.ui-state-hover, .ui-menu .ui-menu-item a.ui-state-active, .ui-notification .ui-corner-all, .ui-slider .ui-slider-range, .ui-slider-horizontal .ui-slider-handle, .ui-slider-vertical .ui-slider-handle, .ui-tabs .ui-tabs-panel, .form-text:not(.form-text-button), .form-text,\n\
.form-error, .form-global-error {\n\
  -webkit-border-radius: 4px;\n\
  -moz-border-radius: 4px;\n\
  -ms-border-radius: 4px;\n\
  -o-border-radius: 4px;\n\
  border-radius: 4px;\n\
}\n\
\n\
.ui-button-text-only .ui-button-text, .form-text {\n\
  padding: 10px 16px 10px 16px;\n\
}\n\
\n\
.ui-state-default,\n\
.ui-widget-content .ui-state-default,\n\
.ui-widget-header .ui-state-default,\n\
.ui-widget-header, .ui-accordion .ui-accordion-header,\n\
.ui-accordion .ui-accordion-header.ui-state-active,\n\
.ui-accordion .ui-accordion-header.ui-state-hover,\n\
.ui-accordion .ui-accordion-header.ui-state-focus, .ui-autocomplete.ui-menu.ui-widget.ui-widget-content, .ui-button, .ui-datepicker, .ui-datepicker .ui-datepicker-prev,\n\
.ui-datepicker .ui-datepicker-next, .ui-datepicker table .ui-state-default,\n\
.ui-datepicker table .ui-widget-content .ui-state-default,\n\
.ui-datepicker table .ui-widget-header .ui-state-default, .ui-dialog .ui-dialog-titlebar-close, .ui-notification .ui-state-default .ui-button, .ui-progressbar, .ui-slider, .ui-slider .ui-slider-handle, .ui-tabs .ui-tabs-panel, .ui-menu, .ui-menu.ui-widget-content, .ui-notification .ui-state-default .ui-button:hover, .ui-slider .ui-slider-handle:hover, .ui-tabs .ui-tabs-nav li.ui-state-active, .ui-sortable .ui-state-default:hover, .ui-slider .ui-slider-handle:active, .ui-slider .ui-slider-handle:focus {\n\
  color: #333333;\n\
  border: 1px solid #c1c1c1;\n\
  text-shadow: rgba(255, 255, 255, 0.85) 0 1px 0px;\n\
  -webkit-box-shadow: 0 0 0px 1px white inset;\n\
  -moz-box-shadow: 0 0 0px 1px white inset;\n\
  box-shadow: 0 0 0px 1px white inset;\n\
}\n\
\n\
.ui-state-default,\n\
.ui-widget-content .ui-state-default,\n\
.ui-widget-header .ui-state-default,\n\
.ui-widget-header, .ui-accordion .ui-accordion-header,\n\
.ui-accordion .ui-accordion-header.ui-state-active,\n\
.ui-accordion .ui-accordion-header.ui-state-hover,\n\
.ui-accordion .ui-accordion-header.ui-state-focus, .ui-autocomplete.ui-menu.ui-widget.ui-widget-content, .ui-button, .ui-datepicker, .ui-datepicker .ui-datepicker-prev,\n\
.ui-datepicker .ui-datepicker-next, .ui-datepicker table .ui-state-default,\n\
.ui-datepicker table .ui-widget-content .ui-state-default,\n\
.ui-datepicker table .ui-widget-header .ui-state-default, .ui-dialog .ui-dialog-titlebar-close, .ui-notification .ui-state-default .ui-button, .ui-progressbar, .ui-slider, .ui-slider .ui-slider-handle, .ui-tabs .ui-tabs-panel {\n\
  background-color: #f4f4f4;\n\
  background: #f4f4f4 -webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(0%, #ffffff), color-stop(100%, #eaeaea));\n\
  background: #f4f4f4 -webkit-linear-gradient(top, #ffffff, #eaeaea);\n\
  background: #f4f4f4 -moz-linear-gradient(top, #ffffff, #eaeaea);\n\
  background: #f4f4f4 -o-linear-gradient(top, #ffffff, #eaeaea);\n\
  background: #f4f4f4 linear-gradient(top, #ffffff, #eaeaea);\n\
}\n\
\n\
.ui-accordion .ui-accordion-header.ui-state-hover, .ui-menu, .ui-menu.ui-widget-content, .ui-notification .ui-state-default .ui-button:hover, .ui-slider .ui-slider-handle:hover, .ui-tabs .ui-tabs-nav li.ui-state-active, .ui-sortable .ui-state-default:hover {\n\
  background-color: #f4f4f4;\n\
  background: #f4f4f4 -webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(0%, #eaeaea), color-stop(100%, #ffffff));\n\
  background: #f4f4f4 -webkit-linear-gradient(top, #eaeaea, #ffffff);\n\
  background: #f4f4f4 -moz-linear-gradient(top, #eaeaea, #ffffff);\n\
  background: #f4f4f4 -o-linear-gradient(top, #eaeaea, #ffffff);\n\
  background: #f4f4f4 linear-gradient(top, #eaeaea, #ffffff);\n\
}\n\
\n\
.ui-slider .ui-slider-handle:active, .ui-slider .ui-slider-handle:focus {\n\
  background-color: #e2e2e2;\n\
  background: #e2e2e2 -webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(0%, #ededed), color-stop(100%, #d8d8d8));\n\
  background: #e2e2e2 -webkit-linear-gradient(top, #ededed, #d8d8d8);\n\
  background: #e2e2e2 -moz-linear-gradient(top, #ededed, #d8d8d8);\n\
  background: #e2e2e2 -o-linear-gradient(top, #ededed, #d8d8d8);\n\
  background: #e2e2e2 linear-gradient(top, #ededed, #d8d8d8);\n\
}\n\
\n\
.ui-state-active,\n\
.ui-widget-content .ui-state-active,\n\
.ui-widget-header .ui-state-active, .ui-accordion .ui-accordion-header.ui-state-active, .ui-datepicker .ui-datepicker-prev:active,\n\
.ui-datepicker .ui-datepicker-next:active, .ui-datepicker table .ui-state-active,\n\
.ui-datepicker table .ui-widget-content .ui-state-active,\n\
.ui-datepicker table .ui-widget-header .ui-state-active, .ui-dialog .ui-dialog-titlebar .ui-dialog-titlebar-close.ui-state-active, .ui-notification .ui-state-active .ui-button, .ui-state-default.ui-sortable-helper, .ui-state-default.ui-sortable-placeholder, .ui-notification .ui-state-active .ui-button:hover {\n\
  color: #333333;\n\
  border: 1px solid #afafaf;\n\
  text-shadow: white 0 1px 0px;\n\
  -webkit-box-shadow: 0 0 0px 1px #f2f2f2 inset;\n\
  -moz-box-shadow: 0 0 0px 1px #f2f2f2 inset;\n\
  box-shadow: 0 0 0px 1px #f2f2f2 inset;\n\
}\n\
\n\
.ui-state-active,\n\
.ui-widget-content .ui-state-active,\n\
.ui-widget-header .ui-state-active, .ui-accordion .ui-accordion-header.ui-state-active, .ui-datepicker .ui-datepicker-prev:active,\n\
.ui-datepicker .ui-datepicker-next:active, .ui-datepicker table .ui-state-active,\n\
.ui-datepicker table .ui-widget-content .ui-state-active,\n\
.ui-datepicker table .ui-widget-header .ui-state-active, .ui-dialog .ui-dialog-titlebar .ui-dialog-titlebar-close.ui-state-active, .ui-notification .ui-state-active .ui-button, .ui-state-default.ui-sortable-helper, .ui-state-default.ui-sortable-placeholder {\n\
  background-color: #e5e5e5;\n\
  background: #e5e5e5 -webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(0%, #f2f2f2), color-stop(100%, #d8d8d8));\n\
  background: #e5e5e5 -webkit-linear-gradient(top, #f2f2f2, #d8d8d8);\n\
  background: #e5e5e5 -moz-linear-gradient(top, #f2f2f2, #d8d8d8);\n\
  background: #e5e5e5 -o-linear-gradient(top, #f2f2f2, #d8d8d8);\n\
  background: #e5e5e5 linear-gradient(top, #f2f2f2, #d8d8d8);\n\
}\n\
\n\
.ui-notification .ui-state-active .ui-button:hover {\n\
  background-color: #e5e5e5;\n\
  background: #e5e5e5 -webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(0%, #d8d8d8), color-stop(100%, #f2f2f2));\n\
  background: #e5e5e5 -webkit-linear-gradient(top, #d8d8d8, #f2f2f2);\n\
  background: #e5e5e5 -moz-linear-gradient(top, #d8d8d8, #f2f2f2);\n\
  background: #e5e5e5 -o-linear-gradient(top, #d8d8d8, #f2f2f2);\n\
  background: #e5e5e5 linear-gradient(top, #d8d8d8, #f2f2f2);\n\
}\n\
\n\
.ui-state-focus,\n\
.ui-widget-content .ui-state-focus,\n\
.ui-widget-header .ui-state-focus, .ui-datepicker table .ui-state-focus,\n\
.ui-datepicker table .ui-widget-content .ui-state-focus,\n\
.ui-datepicker table .ui-widget-header .ui-state-focus, .ui-notification .ui-state-focus .ui-button, .ui-notification .ui-state-focus .ui-button:hover {\n\
  color: #333333;\n\
  border: 1px solid #c9c9c9;\n\
  text-shadow: rgba(255, 255, 255, 0.85) 0 1px 0px;\n\
  -webkit-box-shadow: 0 0 0px 1px white inset;\n\
  -moz-box-shadow: 0 0 0px 1px white inset;\n\
  box-shadow: 0 0 0px 1px white inset;\n\
}\n\
\n\
.ui-state-focus,\n\
.ui-widget-content .ui-state-focus,\n\
.ui-widget-header .ui-state-focus, .ui-datepicker table .ui-state-focus,\n\
.ui-datepicker table .ui-widget-content .ui-state-focus,\n\
.ui-datepicker table .ui-widget-header .ui-state-focus, .ui-notification .ui-state-focus .ui-button {\n\
  background-color: #f8f8f8;\n\
  background: #f8f8f8 -webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(0%, #ffffff), color-stop(100%, #f2f2f2));\n\
  background: #f8f8f8 -webkit-linear-gradient(top, #ffffff, #f2f2f2);\n\
  background: #f8f8f8 -moz-linear-gradient(top, #ffffff, #f2f2f2);\n\
  background: #f8f8f8 -o-linear-gradient(top, #ffffff, #f2f2f2);\n\
  background: #f8f8f8 linear-gradient(top, #ffffff, #f2f2f2);\n\
}\n\
\n\
.ui-notification .ui-state-focus .ui-button:hover {\n\
  background-color: #f8f8f8;\n\
  background: #f8f8f8 -webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(0%, #f2f2f2), color-stop(100%, #ffffff));\n\
  background: #f8f8f8 -webkit-linear-gradient(top, #f2f2f2, #ffffff);\n\
  background: #f8f8f8 -moz-linear-gradient(top, #f2f2f2, #ffffff);\n\
  background: #f8f8f8 -o-linear-gradient(top, #f2f2f2, #ffffff);\n\
  background: #f8f8f8 linear-gradient(top, #f2f2f2, #ffffff);\n\
}\n\
\n\
.ui-state-hover,\n\
.ui-widget-content .ui-state-hover,\n\
.ui-widget-header .ui-state-hover, .ui-button:hover, .ui-state-hover.ui-button, .ui-menu .ui-state-focus, .ui-datepicker .ui-datepicker-prev:hover,\n\
.ui-datepicker .ui-datepicker-next:hover, .ui-datepicker .ui-datepicker-prev-hover,\n\
.ui-datepicker .ui-datepicker-next-hover, .ui-datepicker table .ui-state-hover,\n\
.ui-datepicker table .ui-widget-content .ui-state-hover,\n\
.ui-datepicker table .ui-widget-header .ui-state-hover, .ui-dialog .ui-dialog-titlebar .ui-dialog-titlebar-close.ui-state-hover, .ui-notification .ui-state-hover .ui-button, .ui-progressbar .ui-widget-header, .ui-tabs .ui-tabs-nav li.ui-state-hover, .ui-notification .ui-state-hover .ui-button:hover {\n\
  color: white;\n\
  border: 1px solid #bc6500;\n\
  text-shadow: rgba(0, 0, 0, 0.25) 0 1px 0px;\n\
  -webkit-box-shadow: 0 0 0px 1px #ffa843 inset;\n\
  -moz-box-shadow: 0 0 0px 1px #ffa843 inset;\n\
  box-shadow: 0 0 0px 1px #ffa843 inset;\n\
}\n\
\n\
.ui-state-hover,\n\
.ui-widget-content .ui-state-hover,\n\
.ui-widget-header .ui-state-hover, .ui-button:hover, .ui-state-hover.ui-button, .ui-menu .ui-state-focus, .ui-datepicker .ui-datepicker-prev:hover,\n\
.ui-datepicker .ui-datepicker-next:hover, .ui-datepicker .ui-datepicker-prev-hover,\n\
.ui-datepicker .ui-datepicker-next-hover, .ui-datepicker table .ui-state-hover,\n\
.ui-datepicker table .ui-widget-content .ui-state-hover,\n\
.ui-datepicker table .ui-widget-header .ui-state-hover, .ui-dialog .ui-dialog-titlebar .ui-dialog-titlebar-close.ui-state-hover, .ui-notification .ui-state-hover .ui-button, .ui-progressbar .ui-widget-header, .ui-tabs .ui-tabs-nav li.ui-state-hover {\n\
  background-color: #ff9c28;\n\
  background: #ff9c28 -webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(0%, #ffa843), color-stop(100%, #ff900d));\n\
  background: #ff9c28 -webkit-linear-gradient(top, #ffa843, #ff900d);\n\
  background: #ff9c28 -moz-linear-gradient(top, #ffa843, #ff900d);\n\
  background: #ff9c28 -o-linear-gradient(top, #ffa843, #ff900d);\n\
  background: #ff9c28 linear-gradient(top, #ffa843, #ff900d);\n\
}\n\
\n\
.ui-notification .ui-state-hover .ui-button:hover {\n\
  background-color: #ff9c28;\n\
  background: #ff9c28 -webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(0%, #ff900d), color-stop(100%, #ffa843));\n\
  background: #ff9c28 -webkit-linear-gradient(top, #ff900d, #ffa843);\n\
  background: #ff9c28 -moz-linear-gradient(top, #ff900d, #ffa843);\n\
  background: #ff9c28 -o-linear-gradient(top, #ff900d, #ffa843);\n\
  background: #ff9c28 linear-gradient(top, #ff900d, #ffa843);\n\
}\n\
\n\
.ui-datepicker .ui-datepicker-header, .ui-dialog .ui-dialog-titlebar, .ui-notification .ui-state-title .ui-button, .ui-notification .ui-state-title .ui-button:hover {\n\
  color: #333333;\n\
  border: 1px solid #afafaf;\n\
  text-shadow: white 0 1px 0px;\n\
  -webkit-box-shadow: 0 0 0px 1px #f2f2f2 inset;\n\
  -moz-box-shadow: 0 0 0px 1px #f2f2f2 inset;\n\
  box-shadow: 0 0 0px 1px #f2f2f2 inset;\n\
}\n\
\n\
.ui-datepicker .ui-datepicker-header, .ui-dialog .ui-dialog-titlebar, .ui-notification .ui-state-title .ui-button {\n\
  background-color: #e5e5e5;\n\
  background: #e5e5e5 -webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(0%, #f2f2f2), color-stop(100%, #d8d8d8));\n\
  background: #e5e5e5 -webkit-linear-gradient(top, #f2f2f2, #d8d8d8);\n\
  background: #e5e5e5 -moz-linear-gradient(top, #f2f2f2, #d8d8d8);\n\
  background: #e5e5e5 -o-linear-gradient(top, #f2f2f2, #d8d8d8);\n\
  background: #e5e5e5 linear-gradient(top, #f2f2f2, #d8d8d8);\n\
}\n\
\n\
.ui-notification .ui-state-title .ui-button:hover {\n\
  background-color: #e5e5e5;\n\
  background: #e5e5e5 -webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(0%, #d8d8d8), color-stop(100%, #f2f2f2));\n\
  background: #e5e5e5 -webkit-linear-gradient(top, #d8d8d8, #f2f2f2);\n\
  background: #e5e5e5 -moz-linear-gradient(top, #d8d8d8, #f2f2f2);\n\
  background: #e5e5e5 -o-linear-gradient(top, #d8d8d8, #f2f2f2);\n\
  background: #e5e5e5 linear-gradient(top, #d8d8d8, #f2f2f2);\n\
}\n\
\n\
.ui-state-active.ui-button, .ui-notification .ui-state-contrast .ui-button, .ui-buttonset > .ui-button.ui-state-active:hover,\n\
.ui-buttonset .ui-selectmenu-button.ui-state-active:hover, .ui-notification .ui-state-contrast .ui-button:hover {\n\
  color: white;\n\
  border: 1px solid #040405;\n\
  text-shadow: #323334 0 1px 0px;\n\
  -webkit-box-shadow: 0 0 0px 1px #43474b inset;\n\
  -moz-box-shadow: 0 0 0px 1px #43474b inset;\n\
  box-shadow: 0 0 0px 1px #43474b inset;\n\
}\n\
\n\
.ui-state-active.ui-button, .ui-notification .ui-state-contrast .ui-button {\n\
  background-color: #363a3d;\n\
  background: #363a3d -webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(0%, #43474b), color-stop(100%, #2a2d2f));\n\
  background: #363a3d -webkit-linear-gradient(top, #43474b, #2a2d2f);\n\
  background: #363a3d -moz-linear-gradient(top, #43474b, #2a2d2f);\n\
  background: #363a3d -o-linear-gradient(top, #43474b, #2a2d2f);\n\
  background: #363a3d linear-gradient(top, #43474b, #2a2d2f);\n\
}\n\
\n\
.ui-buttonset > .ui-button.ui-state-active:hover,\n\
.ui-buttonset .ui-selectmenu-button.ui-state-active:hover, .ui-notification .ui-state-contrast .ui-button:hover {\n\
  background-color: #363a3d;\n\
  background: #363a3d -webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(0%, #2a2d2f), color-stop(100%, #43474b));\n\
  background: #363a3d -webkit-linear-gradient(top, #2a2d2f, #43474b);\n\
  background: #363a3d -moz-linear-gradient(top, #2a2d2f, #43474b);\n\
  background: #363a3d -o-linear-gradient(top, #2a2d2f, #43474b);\n\
  background: #363a3d linear-gradient(top, #2a2d2f, #43474b);\n\
}\n\
\n\
.form-text, .ui-autocomplete-input, .ui-datepicker .ui-datepicker-title select {\n\
  color: #555555;\n\
  border-width: 1px;\n\
  border-style: solid;\n\
  border-color: #b3b3b3 #a6a6a6 #999999;\n\
  background-color: #f3f3f3;\n\
  background: #f3f3f3 -webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(0%, #ffffff), color-stop(100%, #e8e8e8));\n\
  background: #f3f3f3 -webkit-linear-gradient(top, #ffffff, #e8e8e8);\n\
  background: #f3f3f3 -moz-linear-gradient(top, #ffffff, #e8e8e8);\n\
  background: #f3f3f3 -o-linear-gradient(top, #ffffff, #e8e8e8);\n\
  background: #f3f3f3 linear-gradient(top, #ffffff, #e8e8e8);\n\
  text-shadow: white 0 1px 0px;\n\
  -webkit-box-shadow: 0 0 0px 1px white inset;\n\
  -moz-box-shadow: 0 0 0px 1px white inset;\n\
  box-shadow: 0 0 0px 1px white inset;\n\
}\n\
\n\
.form-text:hover {\n\
  color: #ffa843;\n\
  border-color: #ff9a23;\n\
  background-color: #f3f3f3;\n\
  background: #f3f3f3 -webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(0%, #e8e8e8), color-stop(100%, #ffffff));\n\
  background: #f3f3f3 -webkit-linear-gradient(top, #e8e8e8, #ffffff);\n\
  background: #f3f3f3 -moz-linear-gradient(top, #e8e8e8, #ffffff);\n\
  background: #f3f3f3 -o-linear-gradient(top, #e8e8e8, #ffffff);\n\
  background: #f3f3f3 linear-gradient(top, #e8e8e8, #ffffff);\n\
  text-shadow: white 0 1px 0px;\n\
}\n\
\n\
.form-text:focus {\n\
  color: black;\n\
  border-color: #8c8c8c #999999 #8c8c8c;\n\
  background-color: #fafafa;\n\
  background: #fafafa -webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(0%, #ffffff), color-stop(100%, #f5f5f5));\n\
  background: #fafafa -webkit-linear-gradient(top, #ffffff, #f5f5f5);\n\
  background: #fafafa -moz-linear-gradient(top, #ffffff, #f5f5f5);\n\
  background: #fafafa -o-linear-gradient(top, #ffffff, #f5f5f5);\n\
  background: #fafafa linear-gradient(top, #ffffff, #f5f5f5);\n\
  text-shadow: white 0 1px 0px;\n\
  outline: 0 none;\n\
}\n\
\n\
.ui-state-confirmation,\n\
.ui-widget-content .ui-state-confirmation,\n\
.ui-widget-header .ui-state-confirmation, .ui-notification .ui-state-confirmation .ui-button, .ui-notification .ui-state-confirmation .ui-button:hover {\n\
  color: white;\n\
  border: 1px solid #4c631a;\n\
  text-shadow: #547213 0 1px 0px;\n\
  -webkit-box-shadow: 0 0 0px 1px #9ecf34 inset;\n\
  -moz-box-shadow: 0 0 0px 1px #9ecf34 inset;\n\
  box-shadow: 0 0 0px 1px #9ecf34 inset;\n\
}\n\
\n\
.ui-state-confirmation,\n\
.ui-widget-content .ui-state-confirmation,\n\
.ui-widget-header .ui-state-confirmation, .ui-notification .ui-state-confirmation .ui-button {\n\
  background-color: #8ebb2d;\n\
  background: #8ebb2d -webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(0%, #9ecf34), color-stop(100%, #7ea727));\n\
  background: #8ebb2d -webkit-linear-gradient(top, #9ecf34, #7ea727);\n\
  background: #8ebb2d -moz-linear-gradient(top, #9ecf34, #7ea727);\n\
  background: #8ebb2d -o-linear-gradient(top, #9ecf34, #7ea727);\n\
  background: #8ebb2d linear-gradient(top, #9ecf34, #7ea727);\n\
}\n\
\n\
.ui-notification .ui-state-confirmation .ui-button:hover {\n\
  background-color: #8ebb2d;\n\
  background: #8ebb2d -webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(0%, #7ea727), color-stop(100%, #9ecf34));\n\
  background: #8ebb2d -webkit-linear-gradient(top, #7ea727, #9ecf34);\n\
  background: #8ebb2d -moz-linear-gradient(top, #7ea727, #9ecf34);\n\
  background: #8ebb2d -o-linear-gradient(top, #7ea727, #9ecf34);\n\
  background: #8ebb2d linear-gradient(top, #7ea727, #9ecf34);\n\
}\n\
\n\
.ui-state-information,\n\
.ui-widget-content .ui-state-information,\n\
.ui-widget-header .ui-state-information, .ui-notification .ui-state-information .ui-button, .ui-notification .ui-state-information .ui-button:hover {\n\
  color: white;\n\
  border: 1px solid #276a89;\n\
  text-shadow: #216381 0 1px 0px;\n\
  -webkit-box-shadow: 0 0 0px 1px #5fb1d7 inset;\n\
  -moz-box-shadow: 0 0 0px 1px #5fb1d7 inset;\n\
  box-shadow: 0 0 0px 1px #5fb1d7 inset;\n\
}\n\
\n\
.ui-state-information,\n\
.ui-widget-content .ui-state-information,\n\
.ui-widget-header .ui-state-information, .ui-notification .ui-state-information .ui-button {\n\
  background-color: #49a6d1;\n\
  background: #49a6d1 -webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(0%, #5fb1d7), color-stop(100%, #349ccc));\n\
  background: #49a6d1 -webkit-linear-gradient(top, #5fb1d7, #349ccc);\n\
  background: #49a6d1 -moz-linear-gradient(top, #5fb1d7, #349ccc);\n\
  background: #49a6d1 -o-linear-gradient(top, #5fb1d7, #349ccc);\n\
  background: #49a6d1 linear-gradient(top, #5fb1d7, #349ccc);\n\
}\n\
\n\
.ui-notification .ui-state-information .ui-button:hover {\n\
  background-color: #49a6d1;\n\
  background: #49a6d1 -webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(0%, #349ccc), color-stop(100%, #5fb1d7));\n\
  background: #49a6d1 -webkit-linear-gradient(top, #349ccc, #5fb1d7);\n\
  background: #49a6d1 -moz-linear-gradient(top, #349ccc, #5fb1d7);\n\
  background: #49a6d1 -o-linear-gradient(top, #349ccc, #5fb1d7);\n\
  background: #49a6d1 linear-gradient(top, #349ccc, #5fb1d7);\n\
}\n\
\n\
.ui-state-warning,\n\
.ui-widget-content .ui-state-warning,\n\
.ui-widget-header .ui-state-warning, .ui-notification .ui-state-warning .ui-button, .ui-notification .ui-state-warning .ui-button:hover {\n\
  color: white;\n\
  border: 1px solid #ba7b16;\n\
  text-shadow: #a9721b 0 1px 0px;\n\
  -webkit-box-shadow: 0 0 0px 1px #f0bb66 inset;\n\
  -moz-box-shadow: 0 0 0px 1px #f0bb66 inset;\n\
  box-shadow: 0 0 0px 1px #f0bb66 inset;\n\
}\n\
\n\
.ui-state-warning,\n\
.ui-widget-content .ui-state-warning,\n\
.ui-widget-header .ui-state-warning, .ui-notification .ui-state-warning .ui-button {\n\
  background-color: #eeb04d;\n\
  background: #eeb04d -webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(0%, #f0bb66), color-stop(100%, #eca535));\n\
  background: #eeb04d -webkit-linear-gradient(top, #f0bb66, #eca535);\n\
  background: #eeb04d -moz-linear-gradient(top, #f0bb66, #eca535);\n\
  background: #eeb04d -o-linear-gradient(top, #f0bb66, #eca535);\n\
  background: #eeb04d linear-gradient(top, #f0bb66, #eca535);\n\
}\n\
\n\
.ui-notification .ui-state-warning .ui-button:hover {\n\
  background-color: #eeb04d;\n\
  background: #eeb04d -webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(0%, #eca535), color-stop(100%, #f0bb66));\n\
  background: #eeb04d -webkit-linear-gradient(top, #eca535, #f0bb66);\n\
  background: #eeb04d -moz-linear-gradient(top, #eca535, #f0bb66);\n\
  background: #eeb04d -o-linear-gradient(top, #eca535, #f0bb66);\n\
  background: #eeb04d linear-gradient(top, #eca535, #f0bb66);\n\
}\n\
\n\
.ui-state-error,\n\
.ui-widget-content .ui-state-error,\n\
.ui-widget-header .ui-state-error, .ui-notification .ui-state-error .ui-button, .form-error, .ui-notification .ui-state-error .ui-button:hover {\n\
  color: white;\n\
  border: 1px solid #9b1b1b;\n\
  text-shadow: #8a1f1f 0 1px 0px;\n\
  -webkit-box-shadow: 0 0 0px 1px #e65656 inset;\n\
  -moz-box-shadow: 0 0 0px 1px #e65656 inset;\n\
  box-shadow: 0 0 0px 1px #e65656 inset;\n\
}\n\
\n\
.ui-state-error,\n\
.ui-widget-content .ui-state-error,\n\
.ui-widget-header .ui-state-error, .ui-notification .ui-state-error .ui-button, .form-error {\n\
  background-color: #e23e3e;\n\
  background: #e23e3e -webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(0%, #e65656), color-stop(100%, #df2727));\n\
  background: #e23e3e -webkit-linear-gradient(top, #e65656, #df2727);\n\
  background: #e23e3e -moz-linear-gradient(top, #e65656, #df2727);\n\
  background: #e23e3e -o-linear-gradient(top, #e65656, #df2727);\n\
  background: #e23e3e linear-gradient(top, #e65656, #df2727);\n\
}\n\
\n\
.ui-notification .ui-state-error .ui-button:hover {\n\
  background-color: #e23e3e;\n\
  background: #e23e3e -webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(0%, #df2727), color-stop(100%, #e65656));\n\
  background: #e23e3e -webkit-linear-gradient(top, #df2727, #e65656);\n\
  background: #e23e3e -moz-linear-gradient(top, #df2727, #e65656);\n\
  background: #e23e3e -o-linear-gradient(top, #df2727, #e65656);\n\
  background: #e23e3e linear-gradient(top, #df2727, #e65656);\n\
}\n\
\n\
.ui-state-highlight, .ui-widget-content .ui-state-highlight, .ui-widget-header .ui-state-highlight, .ui-datepicker table .ui-state-highlight,\n\
.ui-datepicker table .ui-widget-content .ui-state-highlight,\n\
.ui-datepicker table .ui-widget-header .ui-state-highlight, .ui-notification .ui-state-highlight .ui-button, .ui-notification .ui-state-highlight .ui-button:hover, .ui-sortable .ui-state-highlight:hover {\n\
  color: #333333;\n\
  border: 1px solid #5eb5f0;\n\
  text-shadow: #eef8fe 0 1px 0px;\n\
  -webkit-box-shadow: 0 0 0px 1px #d8edfc inset;\n\
  -moz-box-shadow: 0 0 0px 1px #d8edfc inset;\n\
  box-shadow: 0 0 0px 1px #d8edfc inset;\n\
}\n\
\n\
.ui-state-highlight, .ui-widget-content .ui-state-highlight, .ui-widget-header .ui-state-highlight, .ui-datepicker table .ui-state-highlight,\n\
.ui-datepicker table .ui-widget-content .ui-state-highlight,\n\
.ui-datepicker table .ui-widget-header .ui-state-highlight, .ui-notification .ui-state-highlight .ui-button {\n\
  background-color: #bfe2fa;\n\
  background: #bfe2fa -webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(0%, #d8edfc), color-stop(100%, #a6d7f9));\n\
  background: #bfe2fa -webkit-linear-gradient(top, #d8edfc, #a6d7f9);\n\
  background: #bfe2fa -moz-linear-gradient(top, #d8edfc, #a6d7f9);\n\
  background: #bfe2fa -o-linear-gradient(top, #d8edfc, #a6d7f9);\n\
  background: #bfe2fa linear-gradient(top, #d8edfc, #a6d7f9);\n\
}\n\
\n\
.ui-notification .ui-state-highlight .ui-button:hover, .ui-sortable .ui-state-highlight:hover {\n\
  background-color: #bfe2fa;\n\
  background: #bfe2fa -webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(0%, #a6d7f9), color-stop(100%, #d8edfc));\n\
  background: #bfe2fa -webkit-linear-gradient(top, #a6d7f9, #d8edfc);\n\
  background: #bfe2fa -moz-linear-gradient(top, #a6d7f9, #d8edfc);\n\
  background: #bfe2fa -o-linear-gradient(top, #a6d7f9, #d8edfc);\n\
  background: #bfe2fa linear-gradient(top, #a6d7f9, #d8edfc);\n\
}\n\
\n\
/*\n\
 * jQuery UI CSS Framework @1.0.3\n\
 *\n\
 * Copyright 2010, AUTHORS.txt (http://jqueryui.com/about)\n\
 * Dual licensed under the MIT or GPL Version 2 licenses.\n\
 * http://jquery.org/license\n\
 *\n\
 * http://docs.jquery.com/UI/Theming/API\n\
 */\n\
/* Layout helpers\n\
----------------------------------*/\n\
.ui-helper-hidden {\n\
  display: none;\n\
}\n\
\n\
.ui-helper-hidden-accessible {\n\
  position: absolute;\n\
  left: -9999px;\n\
}\n\
\n\
.ui-helper-reset {\n\
  margin: 0;\n\
  padding: 0;\n\
  border: 0;\n\
  outline: 0;\n\
  line-height: 1.3;\n\
  text-decoration: none;\n\
  font-size: 100%;\n\
  list-style: none;\n\
}\n\
\n\
.ui-helper-clearfix:after {\n\
  content: ".";\n\
  display: block;\n\
  height: 0;\n\
  clear: both;\n\
  visibility: hidden;\n\
}\n\
\n\
.ui-helper-clearfix {\n\
  display: inline-block;\n\
}\n\
\n\
/* required comment for clearfix to work in Opera \*/\n\
* html .ui-helper-clearfix {\n\
  height: 1%;\n\
}\n\
\n\
.ui-helper-clearfix {\n\
  display: block;\n\
}\n\
\n\
/* end clearfix */\n\
.ui-helper-zfix {\n\
  width: 100%;\n\
  height: 100%;\n\
  top: 0;\n\
  left: 0;\n\
  position: absolute;\n\
  opacity: 0;\n\
  filter: Alpha(Opacity=0);\n\
}\n\
\n\
/* Interaction Cues\n\
----------------------------------*/\n\
.ui-state-disabled {\n\
  cursor: default !important;\n\
}\n\
\n\
/* Overlays */\n\
.ui-widget-overlay {\n\
  position: fixed;\n\
  top: 0;\n\
  left: 0;\n\
  width: 100%;\n\
  height: 100%;\n\
}\n\
\n\
.ui-overlay .ui-widget-overlay {\n\
  position: absolute;\n\
}\n\
\n\
/* ====================\n\
Base Style\n\
====================*/\n\
/* Component containers */\n\
.ui-widget {\n\
  font-family: "Adelle", Verdana, sans-serif;\n\
  font-size: 13.2px;\n\
}\n\
.ui-widget a {\n\
  color: inherit;\n\
}\n\
.ui-widget.ui-button, .ui-widget .ui-widget {\n\
  font-size: 12px;\n\
}\n\
.ui-widget input,\n\
.ui-widget select,\n\
.ui-widget textarea,\n\
.ui-widget button {\n\
  font-family: inherit;\n\
  font-size: 12px;\n\
}\n\
\n\
.ui-widget-content {\n\
  border-color: 1px solid #c1c1c1;\n\
  background: #f7f7f7;\n\
  text-shadow: rgba(255, 255, 255, 0.85) 0 1px 0px;\n\
}\n\
\n\
.ui-widget-header {\n\
  display: block;\n\
  border-style: solid;\n\
  border-width: 1px;\n\
}\n\
\n\
/* Interaction states */\n\
.ui-state-default, .ui-widget-content .ui-state-default, .ui-widget-header .ui-state-default,\n\
.ui-state-hover, .ui-widget-content .ui-state-hover, .ui-widget-header .ui-state-hover,\n\
.ui-state-focus, .ui-widget-content .ui-state-focus, .ui-widget-header .ui-state-focus,\n\
.ui-state-active, .ui-widget-content .ui-state-active, .ui-widget-header .ui-state-active {\n\
  border-style: solid;\n\
  border-width: 1px;\n\
}\n\
\n\
.ui-state-default a, .ui-state-hover a, .ui-state-active a {\n\
  color: inherit;\n\
  text-decoration: none;\n\
}\n\
\n\
.ui-widget:active {\n\
  outline: none;\n\
}\n\
\n\
/* Interaction cues */\n\
.ui-state-highlight a,\n\
.ui-widget-content .ui-state-highlight a,\n\
.ui-widget-header .ui-state-highlight a {\n\
  color: inherit;\n\
}\n\
\n\
.ui-state-error a,\n\
.ui-widget-content .ui-state-error a,\n\
.ui-widget-header .ui-state-error a {\n\
  color: inherit;\n\
}\n\
\n\
.ui-state-error-text,\n\
.ui-widget-content .ui-state-error-text,\n\
.ui-widget-header .ui-state-error-text {\n\
  color: inherit;\n\
}\n\
\n\
.ui-state-disabled,\n\
.ui-widget-content .ui-state-disabled,\n\
.ui-widget-header .ui-state-disabled {\n\
  background-image: none;\n\
  opacity: 0.4;\n\
  filter: Alpha(Opacity=40);\n\
}\n\
\n\
/* Corner radius */\n\
.ui-corner-all,\n\
.ui-corner-top,\n\
.ui-corner-left,\n\
.ui-corner-tl {\n\
  -moz-border-radius-topleft: 4px;\n\
  -webkit-border-top-left-radius: 4px;\n\
  border-top-left-radius: 4px;\n\
}\n\
\n\
.ui-corner-all,\n\
.ui-corner-top,\n\
.ui-corner-right,\n\
.ui-corner-tr {\n\
  -moz-border-radius-topright: 4px;\n\
  -webkit-border-top-right-radius: 4px;\n\
  border-top-right-radius: 4px;\n\
}\n\
\n\
.ui-corner-all,\n\
.ui-corner-bottom,\n\
.ui-corner-left,\n\
.ui-corner-bl {\n\
  -moz-border-radius-bottomleft: 4px;\n\
  -webkit-border-bottom-left-radius: 4px;\n\
  border-bottom-left-radius: 4px;\n\
}\n\
\n\
.ui-corner-all,\n\
.ui-corner-bottom,\n\
.ui-corner-right,\n\
.ui-corner-br {\n\
  -moz-border-radius-bottomright: 4px;\n\
  -webkit-border-bottom-right-radius: 4px;\n\
  border-bottom-right-radius: 4px;\n\
}\n\
\n\
/* Overlays */\n\
.ui-widget-overlay {\n\
  z-index: 3000;\n\
  background: #222;\n\
  opacity: 0.5;\n\
  filter: Alpha(Opacity=50);\n\
}\n\
\n\
.ui-widget-shadow {\n\
  -webkit-box-shadow: 0 3px 7px rgba(0, 0, 0, 0.5);\n\
  -moz-box-shadow: 0 3px 7px rgba(0, 0, 0, 0.5);\n\
  box-shadow: 0 3px 7px rgba(0, 0, 0, 0.5);\n\
}\n\
\n\
.ui-overlay-active > *:not(.ui-dialog),\n\
.ui-overlay-effects,\n\
body > *:not(.ui-dialog)! ~ .ui-widget-overlay {\n\
  -webkit-filter: blur(2px);\n\
  -moz-filter: blur(2px);\n\
  filter: blur(2px);\n\
}\n\
\n\
/* ====================\n\
Accordian Layout\n\
====================*/\n\
.ui-accordion {\n\
  width: 100%;\n\
}\n\
.ui-accordion .ui-accordion-header {\n\
  position: relative;\n\
  zoom: 1;\n\
  font-size: 12px;\n\
  text-transform: none;\n\
}\n\
.ui-accordion .ui-accordion-header a {\n\
  display: block;\n\
}\n\
.ui-accordion .ui-accordion-header .ui-icon {\n\
  position: absolute;\n\
  top: 50%;\n\
}\n\
.ui-accordion .ui-accordion-content {\n\
  position: relative;\n\
  overflow: hidden;\n\
  display: none;\n\
  zoom: 1;\n\
}\n\
.ui-accordion .ui-accordion-li-fix {\n\
  display: inline;\n\
}\n\
.ui-accordion .ui-accordion-content-active {\n\
  display: block;\n\
}\n\
\n\
/* ====================\n\
Accordian Style\n\
====================*/\n\
.ui-accordion .ui-accordion-header {\n\
  cursor: pointer;\n\
  border: 1px solid #c1c1c1;\n\
  line-height: 16px;\n\
  margin-top: 5px;\n\
}\n\
.ui-accordion .ui-accordion-header:first-child {\n\
  margin-top: 0;\n\
}\n\
.ui-accordion .ui-accordion-header:last-child {\n\
  margin-bottom: 16px;\n\
}\n\
.ui-accordion .ui-accordion-header a {\n\
  padding: 8px 8px 8px 34px;\n\
  color: inherit;\n\
  height: 16px;\n\
  text-shadow: rgba(255, 255, 255, 0.85) 0 1px 0px;\n\
}\n\
.ui-accordion .ui-accordion-header .ui-icon {\n\
  left: 7px;\n\
  margin-top: -9px;\n\
  width: 16px;\n\
  height: 16px;\n\
  border: 1px solid #c1c1c1;\n\
  -webkit-box-shadow: 0 0 0px 1px rgba(255, 255, 255, 0.85) inset;\n\
  -moz-box-shadow: 0 0 0px 1px rgba(255, 255, 255, 0.85) inset;\n\
  box-shadow: 0 0 0px 1px rgba(255, 255, 255, 0.85) inset;\n\
}\n\
.ui-accordion .ui-accordion-content {\n\
  border-width: 0;\n\
  background: none;\n\
  padding: 16px 35.2px;\n\
  border-top: 0;\n\
  margin-top: 0;\n\
  top: 1px;\n\
  margin-bottom: 0;\n\
}\n\
.ui-accordion .ui-accordion-header-active {\n\
  border-width: 0;\n\
}\n\
.ui-accordion .ui-accordion-header,\n\
.ui-accordion .ui-accordion-header.ui-state-active,\n\
.ui-accordion .ui-accordion-header.ui-state-hover,\n\
.ui-accordion .ui-accordion-header.ui-state-focus {\n\
  font-size: 13.2px;\n\
}\n\
.ui-accordion .ui-accordion-header.ui-state-hover .ui-icon {\n\
  -webkit-box-shadow: 0 0 0px 1px rgba(255, 255, 255, 0.85) inset;\n\
  -moz-box-shadow: 0 0 0px 1px rgba(255, 255, 255, 0.85) inset;\n\
  box-shadow: 0 0 0px 1px rgba(255, 255, 255, 0.85) inset;\n\
  border-color: #a8a8a8;\n\
}\n\
.ui-accordion .ui-accordion-header.ui-state-active .ui-icon {\n\
  -webkit-box-shadow: 0 0 0px 1px rgba(255, 255, 255, 0.85) inset;\n\
  -moz-box-shadow: 0 0 0px 1px rgba(255, 255, 255, 0.85) inset;\n\
  box-shadow: 0 0 0px 1px rgba(255, 255, 255, 0.85) inset;\n\
}\n\
\n\
.ui-accordion-icons .ui-accordion-header a {\n\
  padding-left: 34px;\n\
}\n\
\n\
/* ====================\n\
Autocomplete Layout\n\
====================*/\n\
.ui-autocomplete {\n\
  position: absolute;\n\
}\n\
\n\
/* workarounds */\n\
* html .ui-autocomplete {\n\
  width: 1px;\n\
}\n\
\n\
/* without this, the menu expands to 100% in IE6 */\n\
.ui-menu {\n\
  display: block;\n\
  float: left;\n\
}\n\
.ui-menu .ui-menu-item {\n\
  zoom: 1;\n\
  float: left;\n\
  clear: left;\n\
  width: 100%;\n\
  margin: 0;\n\
  padding: 0;\n\
}\n\
.ui-menu .ui-menu-item a {\n\
  display: block;\n\
  zoom: 1;\n\
}\n\
\n\
/* ====================\n\
Autocomplete Style\n\
====================*/\n\
.ui-autocomplete {\n\
  cursor: default;\n\
}\n\
\n\
.ui-menu {\n\
  list-style: none;\n\
  padding: 8px;\n\
  margin: 0;\n\
  -webkit-box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);\n\
  -moz-box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);\n\
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);\n\
}\n\
.ui-menu .ui-menu {\n\
  margin-top: -3px;\n\
}\n\
.ui-menu .ui-menu-item a {\n\
  text-decoration: none;\n\
  padding: 9.6px 19.2px;\n\
  line-height: 1.7;\n\
  -webkit-box-sizing: border-box;\n\
  -moz-box-sizing: border-box;\n\
  box-sizing: border-box;\n\
}\n\
.ui-menu .ui-menu-item a.ui-state-hover, .ui-menu .ui-menu-item a.ui-state-active {\n\
  padding: 9.6px 19.2px;\n\
  font-weight: normal;\n\
  margin: -1px;\n\
  cursor: pointer;\n\
  text-shadow: rgba(0, 0, 0, 0.25) 0 1px 0px;\n\
}\n\
\n\
.ui-autocomplete-input {\n\
  padding: 8px 9.6px;\n\
}\n\
\n\
.ui-button {\n\
  margin-right: 0.8px;\n\
  text-decoration: none !important;\n\
  cursor: pointer;\n\
  text-align: center;\n\
  line-height: 1.2;\n\
  text-transform: none;\n\
}\n\
.ui-button .ui-button-text {\n\
  color: inherit;\n\
  text-shadow: inherit;\n\
}\n\
\n\
.ui-button {\n\
  position: relative;\n\
  padding: 0;\n\
  zoom: 1;\n\
  overflow: visible;\n\
  /* the overflow property removes extra width in IE */\n\
}\n\
\n\
.ui-button-fa fa-only {\n\
  width: 37px;\n\
  height: 37px;\n\
}\n\
\n\
/* to make room for the icon, a width needs to be set here */\n\
/*button text element */\n\
.ui-button-text-fa fa-primary .ui-button-text,\n\
.ui-button-text-icons .ui-button-text {\n\
  padding: 10px 16px 10px 33.6px;\n\
}\n\
\n\
.ui-button-text-fa fa-secondary .ui-button-text,\n\
.ui-button-text-icons .ui-button-text {\n\
  padding: 10px 33.6px 10px 16px;\n\
}\n\
\n\
.ui-button-text-icons .ui-button-text {\n\
  padding-left: 33.6px;\n\
  padding-right: 33.6px;\n\
}\n\
\n\
/* no icon support for input elements, provide padding by default */\n\
input.ui-button {\n\
  padding: 6.4px 11.2px;\n\
  cursor: pointer;\n\
}\n\
\n\
/*button icon element(s) */\n\
.ui-button-text-fa fa-primary .ui-button-fa fa-primary,\n\
.ui-button-text-icons .ui-button-fa fa-primary,\n\
.ui-button-icons-only .ui-button-fa fa-primary {\n\
  left: 8px;\n\
}\n\
\n\
.ui-button-text-fa fa-secondary .ui-button-fa fa-secondary,\n\
.ui-button-text-icons .ui-button-fa fa-secondary,\n\
.ui-button-icons-only .ui-button-fa fa-secondary {\n\
  right: 8px;\n\
}\n\
\n\
.ui-button-text-icons .ui-button-fa fa-secondary,\n\
.ui-button-icons-only .ui-button-fa fa-secondary {\n\
  right: 8px;\n\
}\n\
\n\
.ui-button-fa fa-only {\n\
  padding: 8px;\n\
  position: relative;\n\
}\n\
.ui-button-fa fa-only .ui-icon {\n\
  width: 16px;\n\
  padding-top: 16px;\n\
}\n\
\n\
/* ====================\n\
Button Layout\n\
====================*/\n\
/*button sets*/\n\
.ui-buttonset {\n\
  margin-right: 8px;\n\
  position: relative;\n\
  vertical-align: top;\n\
  margin-right: 7px;\n\
  display: inline-block;\n\
}\n\
.ui-buttonset > .ui-button,\n\
.ui-buttonset .ui-selectmenu-button {\n\
  margin: 0 -1px 0 0;\n\
  vertical-align: top;\n\
  display: block;\n\
  float: left;\n\
}\n\
.ui-buttonset > .ui-button:first-child,\n\
.ui-buttonset .ui-selectmenu-button:first-child {\n\
  -moz-border-radius-topleft: 4px;\n\
  -webkit-border-top-left-radius: 4px;\n\
  border-top-left-radius: 4px;\n\
  -moz-border-radius-bottomleft: 4px;\n\
  -webkit-border-bottom-left-radius: 4px;\n\
  border-bottom-left-radius: 4px;\n\
}\n\
.ui-buttonset > .ui-button:last-child,\n\
.ui-buttonset .ui-selectmenu-button:last-child {\n\
  -moz-border-radius-topright: 4px;\n\
  -webkit-border-top-right-radius: 4px;\n\
  border-top-right-radius: 4px;\n\
  -moz-border-radius-bottomright: 4px;\n\
  -webkit-border-bottom-right-radius: 4px;\n\
  border-bottom-right-radius: 4px;\n\
}\n\
\n\
.ui-draggable {\n\
  position: relative;\n\
}\n\
\n\
.ui-menu {\n\
  margin-right: -100%;\n\
  z-index: 100;\n\
}\n\
.ui-menu a {\n\
  margin: 1px;\n\
}\n\
.ui-menu .ui-state-focus {\n\
  margin: 0;\n\
}\n\
\n\
/*button text element */\n\
.ui-button .ui-button-text {\n\
  display: block;\n\
}\n\
\n\
.ui-button-fa fa-only .ui-button-text {\n\
  display: none;\n\
}\n\
\n\
/*button icon element(s) */\n\
.ui-button-fa fa-only .ui-icon, .ui-button-text-fa fa-primary .ui-icon,\n\
.ui-button-text-fa fa-secondary .ui-icon, .ui-button-text-icons .ui-icon, .ui-button-icons-only .ui-icon {\n\
  position: absolute;\n\
  top: 50%;\n\
  margin-top: -8px;\n\
}\n\
\n\
.ui-button-fa fa-only .ui-icon {\n\
  left: 50%;\n\
  margin-left: -8px;\n\
}\n\
\n\
/* workarounds */\n\
button.ui-button::-moz-focus-inner {\n\
  border: 0;\n\
  padding: 0;\n\
}\n\
\n\
/* reset extra padding in Firefox */\n\
/* ====================\n\
Datepicker Layout\n\
====================*/\n\
.ui-datepicker {\n\
  padding: 0;\n\
  display: none;\n\
}\n\
.ui-datepicker .ui-datepicker-header {\n\
  position: relative;\n\
}\n\
.ui-datepicker .ui-datepicker-prev,\n\
.ui-datepicker .ui-datepicker-next {\n\
  position: absolute;\n\
  display: block;\n\
  overflow: hidden;\n\
  height: 0;\n\
  top: 50%;\n\
  margin-top: -13px;\n\
  left: 4px;\n\
}\n\
.ui-datepicker .ui-datepicker-prev .ui-icon,\n\
.ui-datepicker .ui-datepicker-next .ui-icon {\n\
  overflow: hidden;\n\
}\n\
.ui-datepicker .ui-datepicker-prev span,\n\
.ui-datepicker .ui-datepicker-next span {\n\
  margin-left: -8px;\n\
  margin-top: -8px;\n\
  display: block;\n\
  position: absolute;\n\
  left: 50%;\n\
  top: 50%;\n\
}\n\
.ui-datepicker .ui-datepicker-next {\n\
  left: auto;\n\
  right: 4px;\n\
}\n\
.ui-datepicker .ui-datepicker-title select {\n\
  margin: 1px 0;\n\
}\n\
.ui-datepicker select.ui-datepicker-month-year {\n\
  width: 100%;\n\
}\n\
.ui-datepicker select.ui-datepicker-year {\n\
  width: 49%;\n\
}\n\
.ui-datepicker table {\n\
  width: 240px;\n\
}\n\
.ui-datepicker td {\n\
  padding: 0;\n\
}\n\
.ui-datepicker td span, .ui-datepicker .ui-datepicker td a {\n\
  display: block;\n\
}\n\
.ui-datepicker .ui-datepicker-buttonpane button {\n\
  float: right;\n\
  width: auto;\n\
  overflow: visible;\n\
}\n\
.ui-datepicker .ui-datepicker-buttonpane button.ui-datepicker-current {\n\
  float: left;\n\
}\n\
.ui-datepicker.ui-datepicker-multi {\n\
  width: auto;\n\
}\n\
.ui-datepicker.ui-datepicker-multi.ui-datepicker-multi-2 {\n\
  width: 512px;\n\
}\n\
.ui-datepicker.ui-datepicker-multi.ui-datepicker-multi-3 {\n\
  width: 768px;\n\
}\n\
.ui-datepicker.ui-datepicker-multi.ui-datepicker-multi-4 {\n\
  width: 1024px;\n\
}\n\
\n\
/* with multiple calendars */\n\
.ui-datepicker-multi .ui-datepicker-group {\n\
  float: left;\n\
}\n\
.ui-datepicker-multi .ui-datepicker-group table {\n\
  width: 240px;\n\
}\n\
.ui-datepicker-multi .ui-datepicker-buttonpane {\n\
  clear: left;\n\
}\n\
\n\
.ui-datepicker-multi-2 .ui-datepicker-group {\n\
  width: 50%;\n\
}\n\
\n\
.ui-datepicker-multi-3 .ui-datepicker-group {\n\
  width: 33.33%;\n\
}\n\
\n\
.ui-datepicker-multi-4 .ui-datepicker-group {\n\
  width: 25%;\n\
}\n\
\n\
.ui-datepicker-row-break {\n\
  clear: both;\n\
  width: 100%;\n\
}\n\
\n\
/* RTL support */\n\
.ui-datepicker-rtl {\n\
  direction: rtl;\n\
}\n\
.ui-datepicker-rtl .ui-datepicker-prev {\n\
  right: 2.4px;\n\
  left: auto;\n\
}\n\
.ui-datepicker-rtl .ui-datepicker-prev:hover {\n\
  right: 2.4px;\n\
  left: auto;\n\
}\n\
.ui-datepicker-rtl .ui-datepicker-next {\n\
  left: 2.4px;\n\
  right: auto;\n\
}\n\
.ui-datepicker-rtl .ui-datepicker-next:hover {\n\
  left: 2.4px;\n\
  right: auto;\n\
}\n\
.ui-datepicker-rtl .ui-datepicker-buttonpane {\n\
  clear: right;\n\
}\n\
.ui-datepicker-rtl .ui-datepicker-buttonpane button {\n\
  float: left;\n\
}\n\
.ui-datepicker-rtl .ui-datepicker-buttonpane button.ui-datepicker-current {\n\
  float: right;\n\
}\n\
.ui-datepicker-rtl .ui-datepicker-group {\n\
  float: right;\n\
}\n\
\n\
/* IE6 IFRAME FIX (taken from datepicker 1.5.3 */\n\
.ui-datepicker-cover {\n\
  position: absolute;\n\
  /*must have*/\n\
  z-index: -1;\n\
  /*must have*/\n\
  filter: mask();\n\
  /*must have*/\n\
  top: -4px;\n\
  /*must have*/\n\
  left: -4px;\n\
  /*must have*/\n\
  width: 200px;\n\
  /*must have*/\n\
  height: 200px;\n\
  /*must have*/\n\
}\n\
\n\
/* ====================\n\
Datepicker Style\n\
====================*/\n\
.ui-datepicker {\n\
  width: auto;\n\
  padding: 0;\n\
  -webkit-box-shadow: 0 0 0px 1px white inset, 0 3px 7px rgba(0, 0, 0, 0.5);\n\
  -moz-box-shadow: 0 0 0px 1px white inset, 0 3px 7px rgba(0, 0, 0, 0.5);\n\
  box-shadow: 0 0 0px 1px white inset, 0 3px 7px rgba(0, 0, 0, 0.5);\n\
}\n\
.ui-datepicker .ui-datepicker-header {\n\
  padding: 8px 3.2px;\n\
  -moz-border-radius-bottomleft: 0px;\n\
  -webkit-border-bottom-left-radius: 0px;\n\
  border-bottom-left-radius: 0px;\n\
  -moz-border-radius-bottomright: 0px;\n\
  -webkit-border-bottom-right-radius: 0px;\n\
  border-bottom-right-radius: 0px;\n\
  border: 0 none;\n\
  border-bottom: 1px solid #b3b3b3;\n\
}\n\
.ui-datepicker .ui-datepicker-prev,\n\
.ui-datepicker .ui-datepicker-next {\n\
  width: 24px;\n\
  padding: 24px 0 0;\n\
  cursor: pointer;\n\
}\n\
.ui-datepicker .ui-datepicker-prev .ui-icon,\n\
.ui-datepicker .ui-datepicker-next .ui-icon {\n\
  height: 0;\n\
  padding-top: 16px;\n\
  overflow: hidden;\n\
}\n\
.ui-datepicker table {\n\
  border-spacing: 4px;\n\
  font-size: 12px;\n\
  border-collapse: separate;\n\
  margin: 0 8px 8px;\n\
}\n\
.ui-datepicker th {\n\
  padding: 6.4px 4.8px;\n\
  text-align: center;\n\
  font-weight: bold;\n\
  border: 0;\n\
}\n\
.ui-datepicker td {\n\
  border: 0;\n\
}\n\
.ui-datepicker td span, .ui-datepicker td a {\n\
  padding: 4.8px 7.2px;\n\
  text-align: center;\n\
  text-decoration: none;\n\
}\n\
.ui-datepicker .ui-datepicker-buttonpane {\n\
  margin: 0;\n\
  padding: 0 4px;\n\
  border-left: 0;\n\
  border-right: 0;\n\
  border-bottom: 0;\n\
}\n\
.ui-datepicker .ui-datepicker-buttonpane button {\n\
  margin: 8px;\n\
  cursor: pointer;\n\
  font-size: 12px;\n\
  padding: 6.4px 9.6px 6.4px 9.6px;\n\
}\n\
.ui-datepicker .ui-datepicker-title {\n\
  margin: 0 36.8px;\n\
  line-height: 1.8;\n\
  text-align: center;\n\
  font-weight: normal;\n\
  color: #333333;\n\
  text-shadow: white 0 1px 0px;\n\
}\n\
.ui-datepicker .ui-datepicker-title select {\n\
  font-size: 12px;\n\
}\n\
\n\
.ui-datepicker-calendar a {\n\
  display: block;\n\
}\n\
\n\
/* with multiple calendars */\n\
.ui-datepicker-multi .ui-datepicker-group-last .ui-datepicker-header, .ui-datepicker-multi .ui-datepicker-group-middle .ui-datepicker-header {\n\
  border-left-width: 0;\n\
}\n\
\n\
/* RTL support */\n\
.ui-datepicker-rtl .ui-datepicker-group-last .ui-datepicker-header, .ui-datepicker-rtl .ui-datepicker-group-middle .ui-datepicker-header {\n\
  border-right-width: 0;\n\
  border-left-width: 1px;\n\
}\n\
\n\
/* ====================\n\
Dialog Layout\n\
====================*/\n\
.ui-dialog {\n\
  position: absolute;\n\
  padding: 0;\n\
  overflow: hidden;\n\
  z-index: 4000;\n\
}\n\
.ui-dialog .ui-dialog-title {\n\
  float: left;\n\
  position: relative;\n\
}\n\
.ui-dialog .ui-dialog-titlebar-close {\n\
  display: block;\n\
  overflow: hidden;\n\
  position: relative;\n\
  top: auto;\n\
  right: auto;\n\
  float: right;\n\
}\n\
.ui-dialog .ui-dialog-titlebar-close .ui-icon {\n\
  display: block;\n\
}\n\
.ui-dialog .ui-widget-content {\n\
  position: relative;\n\
  overflow: auto;\n\
  zoom: 1;\n\
  -moz-border-radius-bottomleft: 4px;\n\
  -webkit-border-bottom-left-radius: 4px;\n\
  border-bottom-left-radius: 4px;\n\
  -moz-border-radius-bottomright: 4px;\n\
  -webkit-border-bottom-right-radius: 4px;\n\
  border-bottom-right-radius: 4px;\n\
}\n\
.ui-dialog .ui-dialog-buttonpane {\n\
  overflow: hidden;\n\
}\n\
.ui-dialog .ui-dialog-buttonpane .ui-dialog-buttonset {\n\
  float: right;\n\
}\n\
.ui-dialog .ui-dialog-titlebar {\n\
  position: relative;\n\
}\n\
.ui-dialog .ui-resizable-se {\n\
  width: 16px;\n\
  height: 16px;\n\
  display: none;\n\
}\n\
.ui-dialog .ui-fa fa-grip-diagonal-se {\n\
  display: none;\n\
}\n\
\n\
/* ====================\n\
Dialog Style\n\
====================*/\n\
.ui-dialog {\n\
  min-width: 300px;\n\
  outline: 10px solid rgba(0, 0, 0, 0.2) !important;\n\
  border: 1px solid rgba(255, 255, 255, 0.85);\n\
}\n\
.ui-dialog .ui-dialog-titlebar-close {\n\
  margin: -4px -6px;\n\
  padding: 4px;\n\
  width: 37px;\n\
  height: 37px;\n\
}\n\
.ui-dialog .ui-dialog-content {\n\
  border-width: 0;\n\
  padding: 16px;\n\
}\n\
.ui-dialog .ui-dialog-content .ui-tabs {\n\
  border: 0;\n\
}\n\
.ui-dialog .ui-dialog-content hr {\n\
  margin: 16px -16px 16px -16px;\n\
  border: 0;\n\
  border-top: 1px solid #c1c1c1 !important;\n\
}\n\
.ui-dialog .ui-dialog-buttonpane {\n\
  text-align: left;\n\
  border-width: 1px 0 0 0;\n\
  margin: 8px 0 0 0;\n\
  padding: 7.2px;\n\
  background: #f7f7f8;\n\
}\n\
.ui-dialog .ui-dialog-buttonpane button {\n\
  margin: 8.8px 8.8px 7.2px 0;\n\
  cursor: pointer;\n\
  font-weight: normal;\n\
}\n\
.ui-dialog .ui-dialog-titlebar {\n\
  padding: 10px 13px;\n\
  -moz-border-radius-bottomleft: 0;\n\
  -webkit-border-bottom-left-radius: 0;\n\
  border-bottom-left-radius: 0;\n\
  -moz-border-radius-bottomright: 0;\n\
  -webkit-border-bottom-right-radius: 0;\n\
  border-bottom-right-radius: 0;\n\
  border: 0;\n\
  font-weight: normal;\n\
  border-bottom: 1px solid #d9d9d9;\n\
  margin-left: -1px;\n\
  margin-right: -1px;\n\
}\n\
.ui-dialog .ui-dialog-titlebar .ui-dialog-title {\n\
  font-size: 16.0px;\n\
}\n\
.ui-dialog .ui-dialog-titlebar .ui-dialog-titlebar-close .ui-fa fa-closethick {\n\
  height: 0;\n\
  overflow: hidden;\n\
  padding-top: 16px;\n\
}\n\
.ui-dialog .ui-resizable-se {\n\
  right: 1px;\n\
  bottom: 1px;\n\
}\n\
\n\
.ui-draggable .ui-dialog-titlebar {\n\
  cursor: move;\n\
}\n\
\n\
.ui-overlay {\n\
  z-index: 0;\n\
}\n\
.ui-overlay div {\n\
  z-index: 10;\n\
}\n\
.ui-overlay .ui-widget-overlay {\n\
  z-index: 0;\n\
}\n\
\n\
/* ====================\n\
Notification Layout\n\
====================*/\n\
.ui-notification {\n\
  position: relative;\n\
  margin-bottom: 16px;\n\
}\n\
.ui-notification .ui-state-confirmation, .ui-notification .ui-state-information, .ui-notification .ui-state-error, .ui-notification .ui-state-warning {\n\
  padding-right: 32px;\n\
}\n\
.ui-notification .ui-state-confirmation p, .ui-notification .ui-state-information p, .ui-notification .ui-state-error p, .ui-notification .ui-state-warning p {\n\
  margin: 0 !important;\n\
  text-shadow: inherit;\n\
}\n\
.ui-notification .ui-state-confirmation .ui-icon, .ui-notification .ui-state-information .ui-icon, .ui-notification .ui-state-error .ui-icon, .ui-notification .ui-state-warning .ui-icon {\n\
  position: absolute;\n\
  top: 50%;\n\
  margin-top: -8px;\n\
  left: 8px;\n\
}\n\
.ui-notification .ui-button {\n\
  width: 24px;\n\
  height: 24px;\n\
  position: absolute;\n\
  right: 6px;\n\
  top: 6px;\n\
}\n\
\n\
/* ====================\n\
Notification Style\n\
====================*/\n\
.ui-notification li {\n\
  padding-left: 0;\n\
  font-size: inherit;\n\
}\n\
.ui-notification ul {\n\
  padding-left: 30px;\n\
}\n\
.ui-notification p, .ui-notification ul {\n\
  padding: 8px;\n\
  font-size: 13.2px !important;\n\
  padding-left: 32px;\n\
  margin-bottom: 0;\n\
  text-transform: none;\n\
}\n\
\n\
/* ====================\n\
Progressbar Layout\n\
====================*/\n\
.ui-progressbar .ui-progressbar-value {\n\
  margin: -1px;\n\
  height: 100%;\n\
}\n\
\n\
/* ====================\n\
Progressbar Style\n\
====================*/\n\
.ui-progressbar {\n\
  height: 20.8px;\n\
  margin: 5px 0;\n\
}\n\
.ui-progressbar .ui-widget-header {\n\
  font-weight: bold;\n\
  text-align: center;\n\
}\n\
\n\
/* ====================\n\
Resizable Layout\n\
====================*/\n\
.ui-resizable {\n\
  position: relative;\n\
}\n\
\n\
.ui-resizable-handle {\n\
  position: absolute;\n\
  z-index: 99999;\n\
  display: block;\n\
}\n\
\n\
.ui-resizable-disabled .ui-resizable-handle, .ui-resizable-autohide .ui-resizable-handle {\n\
  display: none;\n\
}\n\
\n\
.ui-resizable-n {\n\
  height: 7px;\n\
  width: 100%;\n\
  top: -5px;\n\
  left: 0;\n\
}\n\
\n\
.ui-resizable-s {\n\
  height: 7px;\n\
  width: 100%;\n\
  bottom: -5px;\n\
  left: 0;\n\
}\n\
\n\
.ui-resizable-e {\n\
  width: 7px;\n\
  right: -5px;\n\
  top: 0;\n\
  height: 100%;\n\
}\n\
\n\
.ui-resizable-w {\n\
  width: 7px;\n\
  left: -5px;\n\
  top: 0;\n\
  height: 100%;\n\
}\n\
\n\
.ui-resizable-se {\n\
  width: 12px;\n\
  height: 12px;\n\
  right: 1px;\n\
  bottom: 1px;\n\
}\n\
\n\
.ui-resizable-sw {\n\
  width: 9px;\n\
  height: 9px;\n\
  left: -5px;\n\
  bottom: -5px;\n\
}\n\
\n\
.ui-resizable-nw {\n\
  width: 9px;\n\
  height: 9px;\n\
  left: -5px;\n\
  top: -5px;\n\
}\n\
\n\
.ui-resizable-ne {\n\
  width: 9px;\n\
  height: 9px;\n\
  right: -5px;\n\
  top: -5px;\n\
}\n\
\n\
/* ====================\n\
Resizable Style\n\
====================*/\n\
.ui-resizable-handle {\n\
  font-size: 0.1px;\n\
}\n\
\n\
.ui-resizable-n {\n\
  cursor: n-resize;\n\
}\n\
\n\
.ui-resizable-s {\n\
  cursor: s-resize;\n\
}\n\
\n\
.ui-resizable-e {\n\
  cursor: e-resize;\n\
}\n\
\n\
.ui-resizable-w {\n\
  cursor: w-resize;\n\
}\n\
\n\
.ui-resizable-se {\n\
  cursor: se-resize;\n\
}\n\
\n\
.ui-resizable-sw {\n\
  cursor: sw-resize;\n\
}\n\
\n\
.ui-resizable-nw {\n\
  cursor: nw-resize;\n\
}\n\
\n\
.ui-resizable-ne {\n\
  cursor: ne-resize;\n\
}\n\
\n\
/* ====================\n\
Selectable Layout\n\
====================*/\n\
.ui-selectable-helper {\n\
  position: absolute;\n\
  z-index: 100;\n\
}\n\
\n\
/* ====================\n\
Selectable Style\n\
====================*/\n\
.ui-selectable-helper {\n\
  border: 1px dotted black;\n\
}\n\
\n\
/* ====================\n\
Slider Layout\n\
====================*/\n\
.ui-slider {\n\
  position: relative;\n\
}\n\
.ui-slider .ui-slider-handle {\n\
  position: absolute;\n\
  z-index: 2;\n\
}\n\
.ui-slider .ui-slider-range {\n\
  position: absolute;\n\
  z-index: 1;\n\
  display: block;\n\
}\n\
.ui-slider .ui-widget-header {\n\
  margin: -1px;\n\
}\n\
\n\
.ui-slider-horizontal {\n\
  height: 9.6px;\n\
}\n\
.ui-slider-horizontal .ui-slider-range {\n\
  top: 0;\n\
  height: 100%;\n\
}\n\
.ui-slider-horizontal .ui-slider-range-min {\n\
  left: 0;\n\
}\n\
.ui-slider-horizontal .ui-slider-range-max {\n\
  right: 0;\n\
}\n\
\n\
.ui-slider-vertical .ui-slider-range {\n\
  left: 0;\n\
  width: 100%;\n\
}\n\
.ui-slider-vertical .ui-slider-range-min {\n\
  bottom: 0;\n\
}\n\
.ui-slider-vertical .ui-slider-range-max {\n\
  top: 0;\n\
}\n\
\n\
/* ====================\n\
Slider Style\n\
====================*/\n\
.ui-slider {\n\
  text-align: left;\n\
}\n\
.ui-slider .ui-slider-handle {\n\
  width: 19.2px;\n\
  height: 19.2px;\n\
  cursor: pointer;\n\
}\n\
.ui-slider .ui-slider-range {\n\
  font-size: 11.2px;\n\
  border: 0;\n\
  background-position: 0 0;\n\
}\n\
.ui-slider .ui-widget-header {\n\
  color: white;\n\
  border: 1px solid #bc6500;\n\
  -webkit-box-shadow: 0 0 0px 1px #ffa843 inset;\n\
  -moz-box-shadow: 0 0 0px 1px #ffa843 inset;\n\
  box-shadow: 0 0 0px 1px #ffa843 inset;\n\
  background-color: #ff9c28;\n\
  background: #ff9c28 -webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(0%, #ffa843), color-stop(100%, #ff900d));\n\
  background: #ff9c28 -webkit-linear-gradient(top, #ffa843, #ff900d);\n\
  background: #ff9c28 -moz-linear-gradient(top, #ffa843, #ff900d);\n\
  background: #ff9c28 -o-linear-gradient(top, #ffa843, #ff900d);\n\
  background: #ff9c28 linear-gradient(top, #ffa843, #ff900d);\n\
}\n\
\n\
.ui-slider-horizontal {\n\
  height: 9.6px;\n\
}\n\
.ui-slider-horizontal .ui-slider-handle {\n\
  top: 50%;\n\
  margin-left: -11.1px;\n\
  margin-top: -10.6px;\n\
  outline: none;\n\
  cursor: pointer;\n\
}\n\
.ui-slider-horizontal .ui-slider-handle + .ui-slider-handle {\n\
  margin-left: -10.1px;\n\
}\n\
.ui-slider-horizontal .ui-widget-header {\n\
  font-weight: bold;\n\
}\n\
\n\
.ui-slider-vertical {\n\
  width: 9.6px;\n\
  height: 100px;\n\
  background: -webkit-gradient(linear, 0% 50%, 100% 50%, color-stop(0%, #ffffff), color-stop(100%, #eaeaea));\n\
  background: -webkit-linear-gradient(left, #ffffff, #eaeaea);\n\
  background: -moz-linear-gradient(left, #ffffff, #eaeaea);\n\
  background: -o-linear-gradient(left, #ffffff, #eaeaea);\n\
  background: linear-gradient(left, #ffffff, #eaeaea);\n\
}\n\
.ui-slider-vertical .ui-slider-handle {\n\
  left: 50%;\n\
  margin-left: -10.6px;\n\
  margin-bottom: -11.1px;\n\
}\n\
.ui-slider-vertical .ui-widget-header {\n\
  background: -webkit-gradient(linear, 0% 50%, 100% 50%, color-stop(0%, #ffa843), color-stop(100%, #ff900d));\n\
  background: -webkit-linear-gradient(left, #ffa843, #ff900d);\n\
  background: -moz-linear-gradient(left, #ffa843, #ff900d);\n\
  background: -o-linear-gradient(left, #ffa843, #ff900d);\n\
  background: linear-gradient(left, #ffa843, #ff900d);\n\
}\n\
.ui-slider-vertical .ui-widget-header {\n\
  font-weight: bold;\n\
}\n\
\n\
/* ====================\n\
Tabs Layout\n\
====================*/\n\
.ui-tabs {\n\
  position: relative;\n\
  padding: 0;\n\
  zoom: 1;\n\
}\n\
.ui-tabs .ui-tabs-nav {\n\
  margin: 0;\n\
  padding: 0;\n\
}\n\
.ui-tabs .ui-tabs-nav li {\n\
  float: left;\n\
  position: relative;\n\
  top: 0;\n\
  margin: 0 -1px 0 0;\n\
  padding: 0;\n\
  white-space: nowrap;\n\
  z-index: 0;\n\
  position: relative;\n\
}\n\
.ui-tabs .ui-tabs-nav li a {\n\
  float: left;\n\
}\n\
.ui-tabs .ui-tabs-nav li.ui-tabs-selected {\n\
  z-index: 50;\n\
  margin-bottom: -1px !important;\n\
  padding-bottom: 1px;\n\
}\n\
.ui-tabs .ui-tabs-nav li.ui-state-hover {\n\
  z-index: 55;\n\
}\n\
.ui-tabs .ui-tabs-panel {\n\
  display: block;\n\
  z-index: 0;\n\
  position: relative;\n\
}\n\
.ui-tabs .ui-tabs-hide {\n\
  display: none;\n\
}\n\
\n\
/* ====================\n\
Tabs Style\n\
====================*/\n\
.ui-tabs {\n\
  background: none;\n\
  border: none;\n\
}\n\
.ui-tabs .ui-tabs-nav {\n\
  background: none;\n\
  border: 0 none transparent;\n\
  border-bottom: 1px solid #c1c1c1;\n\
  -webkit-box-shadow: none;\n\
  -moz-box-shadow: none;\n\
  box-shadow: none;\n\
}\n\
.ui-tabs .ui-tabs-nav li {\n\
  list-style: none;\n\
  font-size: 13.2px;\n\
  -moz-border-radius-topleft: 4px;\n\
  -webkit-border-top-left-radius: 4px;\n\
  border-top-left-radius: 4px;\n\
  -moz-border-radius-topright: 4px;\n\
  -webkit-border-top-right-radius: 4px;\n\
  border-top-right-radius: 4px;\n\
  outline: none;\n\
}\n\
.ui-tabs .ui-tabs-nav li a {\n\
  padding: 6.4px 16px 4.8px;\n\
  text-decoration: none;\n\
  color: inherit;\n\
  outline: none;\n\
  text-transform: none;\n\
  font-size: inherit;\n\
}\n\
.ui-tabs .ui-tabs-nav li.ui-tabs-selected a, .ui-tabs .ui-tabs-nav li.ui-state-disabled a, .ui-tabs .ui-tabs-nav li.ui-state-processing a {\n\
  cursor: text;\n\
}\n\
.ui-tabs .ui-tabs-nav li.ui-state-active {\n\
  border-bottom: 1px solid white!important;\n\
  margin-bottom: -1px;\n\
}\n\
.ui-tabs .ui-tabs-nav li, .ui-tabs .ui-tabs-nav li.ui-state-hover {\n\
  border-bottom: 0 none;\n\
}\n\
.ui-tabs .ui-tabs-panel {\n\
  border: 1px solid #c1c1c1;\n\
  border-top: 0 none;\n\
  padding: 16px 19.2px;\n\
  -moz-border-radius-topleft: 0;\n\
  -webkit-border-top-left-radius: 0;\n\
  border-top-left-radius: 0;\n\
  font-size: 12px;\n\
}\n\
.ui-tabs .ui-widget-header {\n\
  color: #333333;\n\
}\n\
\n\
.ui-tabs .ui-tabs-nav li a,\n\
.ui-tabs.ui-tabs-collapsible .ui-tabs-nav li.ui-tabs-selected a {\n\
  cursor: pointer;\n\
}\n\
\n\
/* ====================\n\
Sortable Layout\n\
====================*/\n\
.ui-sortable li {\n\
  padding: 10px 16px 10px 8px;\n\
  cursor: pointer;\n\
  margin-bottom: -1px;\n\
}\n\
.ui-sortable li .ui-icon {\n\
  margin: 4px 2px -4px -2px;\n\
}\n\
.ui-sortable li:first-child {\n\
  -moz-border-radius-topleft: 4px;\n\
  -webkit-border-top-left-radius: 4px;\n\
  border-top-left-radius: 4px;\n\
  -moz-border-radius-topright: 4px;\n\
  -webkit-border-top-right-radius: 4px;\n\
  border-top-right-radius: 4px;\n\
}\n\
.ui-sortable li:last-child {\n\
  -moz-border-radius-bottomleft: 4px;\n\
  -webkit-border-bottom-left-radius: 4px;\n\
  border-bottom-left-radius: 4px;\n\
  -moz-border-radius-bottomright: 4px;\n\
  -webkit-border-bottom-right-radius: 4px;\n\
  border-bottom-right-radius: 4px;\n\
}\n\
\n\
.standard-sortable .ui-state-highlight {\n\
  height: 23px;\n\
}\n\
\n\
/* ====================\n\
Sortable Style\n\
=====================*/\n\
/* ====================\n\
Form Style\n\
====================*/\n\
.form-text {\n\
  margin: 0;\n\
}\n\
\n\
.form-label {\n\
  font-size: 12px;\n\
  padding: 8px 0 0;\n\
}\n\
\n\
.form-label-text, .form-label-textarea {\n\
  display: block;\n\
}\n\
\n\
.form-button {\n\
  font-size: 12px;\n\
  font-weight: normal;\n\
}\n\
\n\
.form-textfield,\n\
.form-text-button {\n\
  height: auto;\n\
}\n\
\n\
.form-text-button {\n\
  -moz-border-radius-topleft: 4px;\n\
  -webkit-border-top-left-radius: 4px;\n\
  border-top-left-radius: 4px;\n\
  -moz-border-radius-bottomleft: 4px;\n\
  -webkit-border-bottom-left-radius: 4px;\n\
  border-bottom-left-radius: 4px;\n\
}\n\
\n\
.form-field {\n\
  margin-bottom: 16px;\n\
}\n\
\n\
.form-text,\n\
.form-error {\n\
  width: 100%;\n\
  font-size: 12px;\n\
  font-family: "Adelle", Verdana, sans-serif;\n\
  font-weight: normal;\n\
  -webkit-box-sizing: border-box;\n\
  -moz-box-sizing: border-box;\n\
  box-sizing: border-box;\n\
  -webkit-box-shadow: 0 0 0 transparent;\n\
  -moz-box-shadow: 0 0 0 transparent;\n\
  box-shadow: 0 0 0 transparent;\n\
}\n\
\n\
.form-error {\n\
  padding: 8px 9.6px;\n\
}\n\
\n\
.form-field-error .form-text {\n\
  -webkit-border-radius: 4px 4px 0 0;\n\
  -moz-border-radius: 4px 4px 0 0;\n\
  -ms-border-radius: 4px 4px 0 0;\n\
  -o-border-radius: 4px 4px 0 0;\n\
  border-radius: 4px 4px 0 0;\n\
}\n\
\n\
.form-global-error {\n\
  margin-bottom: 16px;\n\
}\n\
\n\
.form-check {\n\
  float: left;\n\
  margin: 3px 3px 0 0;\n\
}\n\
\n\
.form-text-button-table,\n\
.form-text-button-table td,\n\
.form-text-button-table tr {\n\
  width: 100%;\n\
  padding: 0;\n\
  margin: 0;\n\
  vertical-align: top;\n\
}\n\
\n\
.form-text-button-table .form-button {\n\
  margin-right: -1px;\n\
}\n\
\n\
.form-field-error .form-text {\n\
  border: 1px solid #9b1b1b;\n\
  color: #9b1b1b;\n\
}\n\
\n\
.form-textarea {\n\
  display: block;\n\
}\n\
\n\
.contact .form-field-text,\n\
.contact .form-field-textarea {\n\
  max-width: 400px;\n\
}\n\
\n\
.form-field-select-menu label {\n\
  display: block;\n\
}\n\
\n\
.form-text-button-table td:last-child .form-text-button-button {\n\
  -moz-border-radius-topright: 4px;\n\
  -webkit-border-top-right-radius: 4px;\n\
  border-top-right-radius: 4px;\n\
  -moz-border-radius-bottomright: 4px;\n\
  -webkit-border-bottom-right-radius: 4px;\n\
  border-bottom-right-radius: 4px;\n\
}\n\
\n\
.ui-icon {\n\
  width: 16px;\n\
  height: 16px;\n\
  display: block;\n\
  background-image: url(data:image/png;base64,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);\n\
}\n\
\n\
.ui-state-hover .ui-icon {\n\
  background-image: url(data:image/png;base64,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);\n\
}\n\
\n\
                /* End of file: temp/default/src/dependencies/themes/mammoth/theme.css */\n\
            \n\
                /* File: temp/default/src/dependencies/themes/mammoth/theme-icons.css */\n\
                \n\
\n\
.ui-fa fa-add {\n\
  background-position: 0 -5376px;\n\
}\n\
\n\
.ui-fa fa-alert {\n\
  background-position: 0 -2320px;\n\
}\n\
\n\
.ui-fa fa-align-c {\n\
  background-position: 0 -5328px;\n\
}\n\
\n\
.ui-fa fa-align-center {\n\
  background-position: 0 -5344px;\n\
}\n\
\n\
.ui-fa fa-align-j {\n\
  background-position: 0 -5568px;\n\
}\n\
\n\
.ui-fa fa-align-justify {\n\
  background-position: 0 -5584px;\n\
}\n\
\n\
.ui-fa fa-align-l {\n\
  background-position: 0 -5264px;\n\
}\n\
\n\
.ui-fa fa-align-left {\n\
  background-position: 0 -5280px;\n\
}\n\
\n\
.ui-fa fa-align-r {\n\
  background-position: 0 -5472px;\n\
}\n\
\n\
.ui-fa fa-align-right {\n\
  background-position: 0 -5488px;\n\
}\n\
\n\
.ui-fa fa-app-window-black {\n\
  background-position: 0 -4944px;\n\
}\n\
\n\
.ui-fa fa-app-window-browser {\n\
  background-position: 0 -2512px;\n\
}\n\
\n\
.ui-fa fa-app-window-cross {\n\
  background-position: 0 -2064px;\n\
}\n\
\n\
.ui-fa fa-app-window-shell {\n\
  background-position: 0 -3696px;\n\
}\n\
\n\
.ui-fa fa-app-window {\n\
  background-position: 0 -5216px;\n\
}\n\
\n\
.ui-fa fa-arrow-1-e {\n\
  background-position: 0 -4688px;\n\
}\n\
\n\
.ui-fa fa-arrow-1-n {\n\
  background-position: 0 -4544px;\n\
}\n\
\n\
.ui-fa fa-arrow-1-ne {\n\
  background-position: 0 -3184px;\n\
}\n\
\n\
.ui-fa fa-arrow-1-nw {\n\
  background-position: 0 -3648px;\n\
}\n\
\n\
.ui-fa fa-arrow-1-s {\n\
  background-position: 0 -4592px;\n\
}\n\
\n\
.ui-fa fa-arrow-1-se {\n\
  background-position: 0 -3280px;\n\
}\n\
\n\
.ui-fa fa-arrow-1-sw {\n\
  background-position: 0 -3232px;\n\
}\n\
\n\
.ui-fa fa-arrow-1-w {\n\
  background-position: 0 -4784px;\n\
}\n\
\n\
.ui-fa fa-arrow-2-e-w {\n\
  background-position: 0 -4976px;\n\
}\n\
\n\
.ui-fa fa-arrow-2-n-s {\n\
  background-position: 0 -4400px;\n\
}\n\
\n\
.ui-fa fa-arrow-2-ne-sw {\n\
  background-position: 0 -3200px;\n\
}\n\
\n\
.ui-fa fa-arrow-2-se-nw {\n\
  background-position: 0 -3216px;\n\
}\n\
\n\
.ui-fa fa-arrow-4-diag {\n\
  background-position: 0 -2048px;\n\
}\n\
\n\
.ui-fa fa-arrow-4 {\n\
  background-position: 0 -1136px;\n\
}\n\
\n\
.ui-fa fa-arrowrefresh-1-e {\n\
  background-position: 0 -704px;\n\
}\n\
\n\
.ui-fa fa-arrowrefresh-1-n {\n\
  background-position: 0 -720px;\n\
}\n\
\n\
.ui-fa fa-arrowrefresh-1-s {\n\
  background-position: 0 -736px;\n\
}\n\
\n\
.ui-fa fa-arrowrefresh-1-w {\n\
  background-position: 0 -752px;\n\
}\n\
\n\
.ui-fa fa-arrowreturn-1-e {\n\
  background-position: 0 -4704px;\n\
}\n\
\n\
.ui-fa fa-arrowreturn-1-n {\n\
  background-position: 0 -4560px;\n\
}\n\
\n\
.ui-fa fa-arrowreturn-1-s {\n\
  background-position: 0 -4608px;\n\
}\n\
\n\
.ui-fa fa-arrowreturn-1-w {\n\
  background-position: 0 -4800px;\n\
}\n\
\n\
.ui-fa fa-arrowreturnthick-1-e {\n\
  background-position: 0 -3920px;\n\
}\n\
\n\
.ui-fa fa-arrowreturnthick-1-n {\n\
  background-position: 0 -3728px;\n\
}\n\
\n\
.ui-fa fa-arrowreturnthick-1-s {\n\
  background-position: 0 -3824px;\n\
}\n\
\n\
.ui-fa fa-arrowreturnthick-1-w {\n\
  background-position: 0 -3840px;\n\
}\n\
\n\
.ui-fa fa-arrowstop-1-e {\n\
  background-position: 0 -4848px;\n\
}\n\
\n\
.ui-fa fa-arrowstop-1-n {\n\
  background-position: 0 -4720px;\n\
}\n\
\n\
.ui-fa fa-arrowstop-1-s {\n\
  background-position: 0 -4656px;\n\
}\n\
\n\
.ui-fa fa-arrowstop-1-w {\n\
  background-position: 0 -4752px;\n\
}\n\
\n\
.ui-fa fa-arrowthick-1-e {\n\
  background-position: 0 -3936px;\n\
}\n\
\n\
.ui-fa fa-arrowthick-1-n {\n\
  background-position: 0 -3744px;\n\
}\n\
\n\
.ui-fa fa-arrowthick-1-ne {\n\
  background-position: 0 -3456px;\n\
}\n\
\n\
.ui-fa fa-arrowthick-1-nw {\n\
  background-position: 0 -3504px;\n\
}\n\
\n\
.ui-fa fa-arrowthick-1-s {\n\
  background-position: 0 -3856px;\n\
}\n\
\n\
.ui-fa fa-arrowthick-1-se {\n\
  background-position: 0 -3360px;\n\
}\n\
\n\
.ui-fa fa-arrowthick-1-sw {\n\
  background-position: 0 -3152px;\n\
}\n\
\n\
.ui-fa fa-arrowthick-1-w {\n\
  background-position: 0 -3872px;\n\
}\n\
\n\
.ui-fa fa-arrowthick-2-e-w {\n\
  background-position: 0 -3408px;\n\
}\n\
\n\
.ui-fa fa-arrowthick-2-n-s {\n\
  background-position: 0 -2736px;\n\
}\n\
\n\
.ui-fa fa-arrowthick-2-ne-sw {\n\
  background-position: 0 -3520px;\n\
}\n\
\n\
.ui-fa fa-arrowthick-2-se-nw {\n\
  background-position: 0 -3552px;\n\
}\n\
\n\
.ui-fa fa-arrowthickstop-1-e {\n\
  background-position: 0 -3712px;\n\
}\n\
\n\
.ui-fa fa-arrowthickstop-1-n {\n\
  background-position: 0 -3472px;\n\
}\n\
\n\
.ui-fa fa-arrowthickstop-1-s {\n\
  background-position: 0 -3312px;\n\
}\n\
\n\
.ui-fa fa-arrowthickstop-1-w {\n\
  background-position: 0 -3664px;\n\
}\n\
\n\
.ui-fa fa-attach {\n\
  background-position: 0 -2432px;\n\
}\n\
\n\
.ui-fa fa-award {\n\
  background-position: 0 -1248px;\n\
}\n\
\n\
.ui-fa fa-battery-0 {\n\
  background-position: 0 -5360px;\n\
}\n\
\n\
.ui-fa fa-battery-1 {\n\
  background-position: 0 -5104px;\n\
}\n\
\n\
.ui-fa fa-battery-2 {\n\
  background-position: 0 -5040px;\n\
}\n\
\n\
.ui-fa fa-battery-3 {\n\
  background-position: 0 -4960px;\n\
}\n\
\n\
.ui-fa fa-battery-4 {\n\
  background-position: 0 -5072px;\n\
}\n\
\n\
.ui-fa fa-bell {\n\
  background-position: 0 -1872px;\n\
}\n\
\n\
.ui-fa fa-bold {\n\
  background-position: 0 -2656px;\n\
}\n\
\n\
.ui-fa fa-book {\n\
  background-position: 0 -4912px;\n\
}\n\
\n\
.ui-fa fa-bookmark {\n\
  background-position: 0 -3968px;\n\
}\n\
\n\
.ui-fa fa-box {\n\
  background-position: 0 -1584px;\n\
}\n\
\n\
.ui-fa fa-bug {\n\
  background-position: 0 -464px;\n\
}\n\
\n\
.ui-fa fa-bullet {\n\
  background-position: 0 -5088px;\n\
}\n\
\n\
.ui-fa fa-calculator {\n\
  background-position: 0 -4064px;\n\
}\n\
\n\
.ui-fa fa-calendar {\n\
  background-position: 0 -3008px;\n\
}\n\
\n\
.ui-fa fa-camera {\n\
  background-position: 0 -3568px;\n\
}\n\
\n\
.ui-fa fa-cancel {\n\
  background-position: 0 -112px;\n\
}\n\
\n\
.ui-fa fa-carat-1-e {\n\
  background-position: 0 -2192px;\n\
}\n\
\n\
.ui-fa fa-carat-1-n {\n\
  background-position: 0 -2608px;\n\
}\n\
\n\
.ui-fa fa-carat-1-ne {\n\
  background-position: 0 -5504px;\n\
}\n\
\n\
.ui-fa fa-carat-1-nw {\n\
  background-position: 0 -5616px;\n\
}\n\
\n\
.ui-fa fa-carat-1-s {\n\
  background-position: 0 -2528px;\n\
}\n\
\n\
.ui-fa fa-carat-1-se {\n\
  background-position: 0 -5552px;\n\
}\n\
\n\
.ui-fa fa-carat-1-sw {\n\
  background-position: 0 -5664px;\n\
}\n\
\n\
.ui-fa fa-carat-1-w {\n\
  background-position: 0 -2144px;\n\
}\n\
\n\
.ui-fa fa-carat-2-e-w {\n\
  background-position: 0 -896px;\n\
}\n\
\n\
.ui-fa fa-carat-2-n-s {\n\
  background-position: 0 -976px;\n\
}\n\
\n\
.ui-fa fa-cart {\n\
  background-position: 0 -2240px;\n\
}\n\
\n\
.ui-fa fa-chart-bar {\n\
  background-position: 0 -4208px;\n\
}\n\
\n\
.ui-fa fa-chart-line-1 {\n\
  background-position: 0 -1760px;\n\
}\n\
\n\
.ui-fa fa-chart-line-2 {\n\
  background-position: 0 -1168px;\n\
}\n\
\n\
.ui-fa fa-chart-up {\n\
  background-position: 0 -1184px;\n\
}\n\
\n\
.ui-fa fa-check-all {\n\
  background-position: 0 -944px;\n\
}\n\
\n\
.ui-fa fa-check-box {\n\
  background-position: 0 -4224px;\n\
}\n\
\n\
.ui-fa fa-check-none {\n\
  background-position: 0 -960px;\n\
}\n\
\n\
.ui-fa fa-check {\n\
  background-position: 0 -2368px;\n\
}\n\
\n\
.ui-fa fa-circle-arrow-e {\n\
  background-position: 0 -1536px;\n\
}\n\
\n\
.ui-fa fa-circle-arrow-n {\n\
  background-position: 0 -1696px;\n\
}\n\
\n\
.ui-fa fa-circle-arrow-s {\n\
  background-position: 0 -1792px;\n\
}\n\
\n\
.ui-fa fa-circle-arrow-w {\n\
  background-position: 0 -1616px;\n\
}\n\
\n\
.ui-fa fa-circle-check {\n\
  background-position: 0 -1200px;\n\
}\n\
\n\
.ui-fa fa-circle-close {\n\
  background-position: 0 -768px;\n\
}\n\
\n\
.ui-fa fa-circle-minus {\n\
  background-position: 0 -2768px;\n\
}\n\
\n\
.ui-fa fa-circle-plus {\n\
  background-position: 0 -1904px;\n\
}\n\
\n\
.ui-fa fa-circle-triangle-e {\n\
  background-position: 0 -1264px;\n\
}\n\
\n\
.ui-fa fa-circle-triangle-n {\n\
  background-position: 0 -1552px;\n\
}\n\
\n\
.ui-fa fa-circle-triangle-s {\n\
  background-position: 0 -1648px;\n\
}\n\
\n\
.ui-fa fa-circle-triangle-w {\n\
  background-position: 0 -1296px;\n\
}\n\
\n\
.ui-fa fa-circle-zoomin {\n\
  background-position: 0 -96px;\n\
}\n\
\n\
.ui-fa fa-circle-zoomout {\n\
  background-position: 0 -192px;\n\
}\n\
\n\
.ui-fa fa-circlesmall-close {\n\
  background-position: 0 -3424px;\n\
}\n\
\n\
.ui-fa fa-circlesmall-minus {\n\
  background-position: 0 -3808px;\n\
}\n\
\n\
.ui-fa fa-circlesmall-plus {\n\
  background-position: 0 -3616px;\n\
}\n\
\n\
.ui-fa fa-clean {\n\
  background-position: 0 -576px;\n\
}\n\
\n\
.ui-fa fa-clipboard {\n\
  background-position: 0 -3024px;\n\
}\n\
\n\
.ui-fa fa-clock {\n\
  background-position: 0 -1824px;\n\
}\n\
\n\
.ui-fa fa-close {\n\
  background-position: 0 -4160px;\n\
}\n\
\n\
.ui-fa fa-closethick {\n\
  background-position: 0 -1008px;\n\
}\n\
\n\
.ui-fa fa-cloud-rain {\n\
  background-position: 0 -1488px;\n\
}\n\
\n\
.ui-fa fa-cloud {\n\
  background-position: 0 -4272px;\n\
}\n\
\n\
.ui-fa fa-cms {\n\
  background-position: 0 -272px;\n\
}\n\
\n\
.ui-fa fa-coffee {\n\
  background-position: 0 -3248px;\n\
}\n\
\n\
.ui-fa fa-comment {\n\
  background-position: 0 -3760px;\n\
}\n\
\n\
.ui-fa fa-compass {\n\
  background-position: 0 -1472px;\n\
}\n\
\n\
.ui-fa fa-computer {\n\
  background-position: 0 -5120px;\n\
}\n\
\n\
.ui-fa fa-confirm {\n\
  background-position: 0 -2384px;\n\
}\n\
\n\
.ui-fa fa-confirmation {\n\
  background-position: 0 -1216px;\n\
}\n\
\n\
.ui-fa fa-contact {\n\
  background-position: 0 -3168px;\n\
}\n\
\n\
.ui-fa fa-copy {\n\
  background-position: 0 -3632px;\n\
}\n\
\n\
.ui-fa fa-csv {\n\
  background-position: 0 -1808px;\n\
}\n\
\n\
.ui-fa fa-currency-dollar {\n\
  background-position: 0 -1440px;\n\
}\n\
\n\
.ui-fa fa-currency-euro {\n\
  background-position: 0 -1936px;\n\
}\n\
\n\
.ui-fa fa-currency-pound {\n\
  background-position: 0 -2864px;\n\
}\n\
\n\
.ui-fa fa-currency-yen {\n\
  background-position: 0 -2256px;\n\
}\n\
\n\
.ui-fa fa-dashboard {\n\
  background-position: 0 -512px;\n\
}\n\
\n\
.ui-fa fa-db {\n\
  background-position: 0 -1152px;\n\
}\n\
\n\
.ui-fa fa-delete {\n\
  background-position: 0 -4176px;\n\
}\n\
\n\
.ui-fa fa-disk {\n\
  background-position: 0 -4464px;\n\
}\n\
\n\
.ui-fa fa-dislike {\n\
  background-position: 0 -3136px;\n\
}\n\
\n\
.ui-fa fa-document-add {\n\
  background-position: 0 -4736px;\n\
}\n\
\n\
.ui-fa fa-document-b {\n\
  background-position: 0 -4432px;\n\
}\n\
\n\
.ui-fa fa-document-delete {\n\
  background-position: 0 -2160px;\n\
}\n\
\n\
.ui-fa fa-document-edit {\n\
  background-position: 0 -288px;\n\
}\n\
\n\
.ui-fa fa-document-export {\n\
  background-position: 0 -2032px;\n\
}\n\
\n\
.ui-fa fa-document-import {\n\
  background-position: 0 -2016px;\n\
}\n\
\n\
.ui-fa fa-document-minus {\n\
  background-position: 0 -5168px;\n\
}\n\
\n\
.ui-fa fa-document-text {\n\
  background-position: 0 -3584px;\n\
}\n\
\n\
.ui-fa fa-document {\n\
  background-position: 0 -4672px;\n\
}\n\
\n\
.ui-fa fa-download {\n\
  background-position: 0 -2336px;\n\
}\n\
\n\
.ui-fa fa-eject {\n\
  background-position: 0 -3600px;\n\
}\n\
\n\
.ui-fa fa-email {\n\
  background-position: 0 -2208px;\n\
}\n\
\n\
.ui-fa fa-emote-happy {\n\
  background-position: 0 -128px;\n\
}\n\
\n\
.ui-fa fa-emote-sad {\n\
  background-position: 0 -160px;\n\
}\n\
\n\
.ui-fa fa-error {\n\
  background-position: 0 -1024px;\n\
}\n\
\n\
.ui-fa fa-expand {\n\
  background-position: 0 -2960px;\n\
}\n\
\n\
.ui-fa fa-export {\n\
  background-position: 0 -2080px;\n\
}\n\
\n\
.ui-fa fa-extlink {\n\
  background-position: 0 -1680px;\n\
}\n\
\n\
.ui-fa fa-eye-closed {\n\
  background-position: 0 -368px;\n\
}\n\
\n\
.ui-fa fa-eye-open {\n\
  background-position: 0 -528px;\n\
}\n\
\n\
.ui-fa fa-facebook {\n\
  background-position: 0 -4384px;\n\
}\n\
\n\
.ui-fa fa-fill {\n\
  background-position: 0 -240px;\n\
}\n\
\n\
.ui-fa fa-filter {\n\
  background-position: 0 -2896px;\n\
}\n\
\n\
.ui-fa fa-fire {\n\
  background-position: 0 -912px;\n\
}\n\
\n\
.ui-fa fa-flag {\n\
  background-position: 0 -1504px;\n\
}\n\
\n\
.ui-fa fa-float-left {\n\
  background-position: 0 -4864px;\n\
}\n\
\n\
.ui-fa fa-float-none {\n\
  background-position: 0 -5536px;\n\
}\n\
\n\
.ui-fa fa-float-right {\n\
  background-position: 0 -4768px;\n\
}\n\
\n\
.ui-fa fa-folder-add {\n\
  background-position: 0 -4416px;\n\
}\n\
\n\
.ui-fa fa-folder-arrow {\n\
  background-position: 0 -3952px;\n\
}\n\
\n\
.ui-fa fa-folder-collapsed {\n\
  background-position: 0 -5152px;\n\
}\n\
\n\
.ui-fa fa-folder-contacts {\n\
  background-position: 0 -3488px;\n\
}\n\
\n\
.ui-fa fa-folder-delete {\n\
  background-position: 0 -2704px;\n\
}\n\
\n\
.ui-fa fa-folder-minus {\n\
  background-position: 0 -4880px;\n\
}\n\
\n\
.ui-fa fa-folder-open {\n\
  background-position: 0 -3680px;\n\
}\n\
\n\
.ui-fa fa-font-size-dec {\n\
  background-position: 0 -1104px;\n\
}\n\
\n\
.ui-fa fa-font-size-inc {\n\
  background-position: 0 -672px;\n\
}\n\
\n\
.ui-fa fa-font-size {\n\
  background-position: 0 -416px;\n\
}\n\
\n\
.ui-fa fa-font-strikethrough {\n\
  background-position: 0 -1968px;\n\
}\n\
\n\
.ui-fa fa-font-underline {\n\
  background-position: 0 -3328px;\n\
}\n\
\n\
.ui-fa fa-freight {\n\
  background-position: 0 -3376px;\n\
}\n\
\n\
.ui-fa fa-fullscreen {\n\
  background-position: 0 -2976px;\n\
}\n\
\n\
.ui-fa fa-game-pad {\n\
  background-position: 0 -1952px;\n\
}\n\
\n\
.ui-fa fa-gear {\n\
  background-position: 0 -48px;\n\
}\n\
\n\
.ui-fa fa-glasses {\n\
  background-position: 0 -2400px;\n\
}\n\
\n\
.ui-fa fa-globe-1 {\n\
  background-position: 0 -16px;\n\
}\n\
\n\
.ui-fa fa-globe-2 {\n\
  background-position: 0 -32px;\n\
}\n\
\n\
.ui-fa fa-google {\n\
  background-position: 0 -1056px;\n\
}\n\
\n\
.ui-fa fa-grab-on {\n\
  background-position: 0 -1456px;\n\
}\n\
\n\
.ui-fa fa-grab {\n\
  background-position: 0 -832px;\n\
}\n\
\n\
.ui-fa fa-grid-large {\n\
  background-position: 0 -3984px;\n\
}\n\
\n\
.ui-fa fa-grid-small-2 {\n\
  background-position: 0 -4624px;\n\
}\n\
\n\
.ui-fa fa-grid-small {\n\
  background-position: 0 -4816px;\n\
}\n\
\n\
.ui-fa fa-grip-diagonal-se {\n\
  background-position: 0 -800px;\n\
}\n\
\n\
.ui-fa fa-grip-dotted-horizontal {\n\
  background-position: 0 -4016px;\n\
}\n\
\n\
.ui-fa fa-grip-dotted-vertical {\n\
  background-position: 0 -4080px;\n\
}\n\
\n\
.ui-fa fa-grip-solid-horizontal {\n\
  background-position: 0 -4032px;\n\
}\n\
\n\
.ui-fa fa-grip-solid-vertical {\n\
  background-position: 0 -4096px;\n\
}\n\
\n\
.ui-fa fa-gripsmall-diagonal-se {\n\
  background-position: 0 -816px;\n\
}\n\
\n\
.ui-fa fa-hand-point {\n\
  background-position: 0 -3056px;\n\
}\n\
\n\
.ui-fa fa-hand {\n\
  background-position: 0 -2928px;\n\
}\n\
\n\
.ui-fa fa-hanger {\n\
  background-position: 0 -2560px;\n\
}\n\
\n\
.ui-fa fa-headphones {\n\
  background-position: 0 -1920px;\n\
}\n\
\n\
.ui-fa fa-heart-empty {\n\
  background-position: 0 -208px;\n\
}\n\
\n\
.ui-fa fa-heart {\n\
  background-position: 0 -2576px;\n\
}\n\
\n\
.ui-fa fa-help {\n\
  background-position: 0 -2880px;\n\
}\n\
\n\
.ui-fa fa-home {\n\
  background-position: 0 -4512px;\n\
}\n\
\n\
.ui-fa fa-hourglass {\n\
  background-position: 0 -1712px;\n\
}\n\
\n\
.ui-fa fa-hr {\n\
  background-position: 0 -5520px;\n\
}\n\
\n\
.ui-fa fa-image {\n\
  background-position: 0 -2944px;\n\
}\n\
\n\
.ui-fa fa-indent-decrease {\n\
  background-position: 0 -4448px;\n\
}\n\
\n\
.ui-fa fa-indent-increase {\n\
  background-position: 0 -4352px;\n\
}\n\
\n\
.ui-fa fa-info {\n\
  background-position: 0 -2624px;\n\
}\n\
\n\
.ui-fa fa-information {\n\
  background-position: 0 -2640px;\n\
}\n\
\n\
.ui-fa fa-iphone {\n\
  background-position: 0 -5456px;\n\
}\n\
\n\
.ui-fa fa-italic {\n\
  background-position: 0 -4320px;\n\
}\n\
\n\
.ui-fa fa-key {\n\
  background-position: 0 -1424px;\n\
}\n\
\n\
.ui-fa fa-layers {\n\
  background-position: 0 -992px;\n\
}\n\
\n\
.ui-fa fa-lightbulb {\n\
  background-position: 0 -480px;\n\
}\n\
\n\
.ui-fa fa-lightning {\n\
  background-position: 0 -2752px;\n\
}\n\
\n\
.ui-fa fa-like {\n\
  background-position: 0 -3536px;\n\
}\n\
\n\
.ui-fa fa-link-broken {\n\
  background-position: 0 -1072px;\n\
}\n\
\n\
.ui-fa fa-link {\n\
  background-position: 0 -304px;\n\
}\n\
\n\
.ui-fa fa-list-ordered {\n\
  background-position: 0 -3776px;\n\
}\n\
\n\
.ui-fa fa-list-unordered {\n\
  background-position: 0 -4992px;\n\
}\n\
\n\
.ui-fa fa-locked {\n\
  background-position: 0 -3088px;\n\
}\n\
\n\
.ui-fa fa-login {\n\
  background-position: 0 -3104px;\n\
}\n\
\n\
.ui-fa fa-magic-wand-2 {\n\
  background-position: 0 -1888px;\n\
}\n\
\n\
.ui-fa fa-magic-wand {\n\
  background-position: 0 -256px;\n\
}\n\
\n\
.ui-fa fa-mail-closed {\n\
  background-position: 0 -2224px;\n\
}\n\
\n\
.ui-fa fa-mail-open {\n\
  background-position: 0 -3264px;\n\
}\n\
\n\
.ui-fa fa-map-marker {\n\
  background-position: 0 -1568px;\n\
}\n\
\n\
.ui-fa fa-math {\n\
  background-position: 0 -4112px;\n\
}\n\
\n\
.ui-fa fa-mic {\n\
  background-position: 0 -2448px;\n\
}\n\
\n\
.ui-fa fa-microphone {\n\
  background-position: 0 -2592px;\n\
}\n\
\n\
.ui-fa fa-minus {\n\
  background-position: 0 -5680px;\n\
}\n\
\n\
.ui-fa fa-minusthick {\n\
  background-position: 0 -5648px;\n\
}\n\
\n\
.ui-fa fa-money {\n\
  background-position: 0 -544px;\n\
}\n\
\n\
.ui-fa fa-music {\n\
  background-position: 0 -2544px;\n\
}\n\
\n\
.ui-fa fa-new {\n\
  background-position: 0 -2912px;\n\
}\n\
\n\
.ui-fa fa-newspaper-double {\n\
  background-position: 0 -4000px;\n\
}\n\
\n\
.ui-fa fa-newwin {\n\
  background-position: 0 -3888px;\n\
}\n\
\n\
.ui-fa fa-note {\n\
  background-position: 0 -4304px;\n\
}\n\
\n\
.ui-fa fa-notice {\n\
  background-position: 0 -4832px;\n\
}\n\
\n\
.ui-fa fa-ordered-list {\n\
  background-position: 0 -3792px;\n\
}\n\
\n\
.ui-fa fa-paintbrush {\n\
  background-position: 0 -592px;\n\
}\n\
\n\
.ui-fa fa-paper-plane {\n\
  background-position: 0 -1744px;\n\
}\n\
\n\
.ui-fa fa-pause {\n\
  background-position: 0 -5600px;\n\
}\n\
\n\
.ui-fa fa-pdf {\n\
  background-position: 0 -2688px;\n\
}\n\
\n\
.ui-fa fa-pencil {\n\
  background-position: 0 -1328px;\n\
}\n\
\n\
.ui-fa fa-person {\n\
  background-position: 0 -2096px;\n\
}\n\
\n\
.ui-fa fa-phone-e {\n\
  background-position: 0 -2496px;\n\
}\n\
\n\
.ui-fa fa-phone-keypad {\n\
  background-position: 0 -4240px;\n\
}\n\
\n\
.ui-fa fa-phone-n {\n\
  background-position: 0 -2464px;\n\
}\n\
\n\
.ui-fa fa-phone-touch {\n\
  background-position: 0 -3296px;\n\
}\n\
\n\
.ui-fa fa-pie-chart {\n\
  background-position: 0 0;\n\
}\n\
\n\
.ui-fa fa-pin-s {\n\
  background-position: 0 -1520px;\n\
}\n\
\n\
.ui-fa fa-pin-w {\n\
  background-position: 0 -1392px;\n\
}\n\
\n\
.ui-fa fa-play {\n\
  background-position: 0 -4192px;\n\
}\n\
\n\
.ui-fa fa-plus {\n\
  background-position: 0 -5392px;\n\
}\n\
\n\
.ui-fa fa-plusthick {\n\
  background-position: 0 -4256px;\n\
}\n\
\n\
.ui-fa fa-power {\n\
  background-position: 0 -624px;\n\
}\n\
\n\
.ui-fa fa-presentation {\n\
  background-position: 0 -4576px;\n\
}\n\
\n\
.ui-fa fa-print {\n\
  background-position: 0 -4368px;\n\
}\n\
\n\
.ui-fa fa-quote-block {\n\
  background-position: 0 -4640px;\n\
}\n\
\n\
.ui-fa fa-radio-off {\n\
  background-position: 0 -3120px;\n\
}\n\
\n\
.ui-fa fa-radio-on {\n\
  background-position: 0 -1856px;\n\
}\n\
\n\
.ui-fa fa-raptor {\n\
  background-position: 0 -320px;\n\
}\n\
\n\
.ui-fa fa-raptorize {\n\
  background-position: 0 -336px;\n\
}\n\
\n\
.ui-fa fa-redo {\n\
  background-position: 0 -2416px;\n\
}\n\
\n\
.ui-fa fa-refresh {\n\
  background-position: 0 -784px;\n\
}\n\
\n\
.ui-fa fa-relationship {\n\
  background-position: 0 -1312px;\n\
}\n\
\n\
.ui-fa fa-rss-folder {\n\
  background-position: 0 -2112px;\n\
}\n\
\n\
.ui-fa fa-rss {\n\
  background-position: 0 -224px;\n\
}\n\
\n\
.ui-fa fa-save {\n\
  background-position: 0 -4480px;\n\
}\n\
\n\
.ui-fa fa-scales {\n\
  background-position: 0 -1232px;\n\
}\n\
\n\
.ui-fa fa-scissors {\n\
  background-position: 0 -144px;\n\
}\n\
\n\
.ui-fa fa-screen {\n\
  background-position: 0 -5200px;\n\
}\n\
\n\
.ui-fa fa-script {\n\
  background-position: 0 -2800px;\n\
}\n\
\n\
.ui-fa fa-search {\n\
  background-position: 0 -848px;\n\
}\n\
\n\
.ui-fa fa-seek-end {\n\
  background-position: 0 -2720px;\n\
}\n\
\n\
.ui-fa fa-seek-first {\n\
  background-position: 0 -2816px;\n\
}\n\
\n\
.ui-fa fa-seek-next {\n\
  background-position: 0 -4128px;\n\
}\n\
\n\
.ui-fa fa-seek-prev {\n\
  background-position: 0 -4144px;\n\
}\n\
\n\
.ui-fa fa-seek-start {\n\
  background-position: 0 -2832px;\n\
}\n\
\n\
.ui-fa fa-server-error {\n\
  background-position: 0 -1728px;\n\
}\n\
\n\
.ui-fa fa-server {\n\
  background-position: 0 -5136px;\n\
}\n\
\n\
.ui-fa fa-share {\n\
  background-position: 0 -2176px;\n\
}\n\
\n\
.ui-fa fa-shield-2 {\n\
  background-position: 0 -1360px;\n\
}\n\
\n\
.ui-fa fa-shield {\n\
  background-position: 0 -176px;\n\
}\n\
\n\
.ui-fa fa-shopping-bag-dollar {\n\
  background-position: 0 -608px;\n\
}\n\
\n\
.ui-fa fa-shopping-bag {\n\
  background-position: 0 -3040px;\n\
}\n\
\n\
.ui-fa fa-signal-diag {\n\
  background-position: 0 -4048px;\n\
}\n\
\n\
.ui-fa fa-signal {\n\
  background-position: 0 -1600px;\n\
}\n\
\n\
.ui-fa fa-speechbubble-2 {\n\
  background-position: 0 -1344px;\n\
}\n\
\n\
.ui-fa fa-speechbubble {\n\
  background-position: 0 -3072px;\n\
}\n\
\n\
.ui-fa fa-squaresmall-close {\n\
  background-position: 0 -3440px;\n\
}\n\
\n\
.ui-fa fa-squaresmall-minus {\n\
  background-position: 0 -5408px;\n\
}\n\
\n\
.ui-fa fa-squaresmall-plus {\n\
  background-position: 0 -4928px;\n\
}\n\
\n\
.ui-fa fa-star-empty {\n\
  background-position: 0 -352px;\n\
}\n\
\n\
.ui-fa fa-star {\n\
  background-position: 0 -1776px;\n\
}\n\
\n\
.ui-fa fa-stop {\n\
  background-position: 0 -5632px;\n\
}\n\
\n\
.ui-fa fa-stopwatch {\n\
  background-position: 0 -496px;\n\
}\n\
\n\
.ui-fa fa-suitcase {\n\
  background-position: 0 -3904px;\n\
}\n\
\n\
.ui-fa fa-sun {\n\
  background-position: 0 -1120px;\n\
}\n\
\n\
.ui-fa fa-swap {\n\
  background-position: 0 -2304px;\n\
}\n\
\n\
.ui-fa fa-tag {\n\
  background-position: 0 -2848px;\n\
}\n\
\n\
.ui-fa fa-target {\n\
  background-position: 0 -1408px;\n\
}\n\
\n\
.ui-fa fa-text-bold {\n\
  background-position: 0 -2672px;\n\
}\n\
\n\
.ui-fa fa-text-cursor {\n\
  background-position: 0 -5024px;\n\
}\n\
\n\
.ui-fa fa-text-italic {\n\
  background-position: 0 -4336px;\n\
}\n\
\n\
.ui-fa fa-text-size {\n\
  background-position: 0 -432px;\n\
}\n\
\n\
.ui-fa fa-text-strike {\n\
  background-position: 0 -1984px;\n\
}\n\
\n\
.ui-fa fa-text-strikethrough {\n\
  background-position: 0 -2000px;\n\
}\n\
\n\
.ui-fa fa-text-sub {\n\
  background-position: 0 -864px;\n\
}\n\
\n\
.ui-fa fa-text-super {\n\
  background-position: 0 -688px;\n\
}\n\
\n\
.ui-fa fa-text-underline {\n\
  background-position: 0 -3344px;\n\
}\n\
\n\
.ui-fa fa-tools-crossed {\n\
  background-position: 0 -384px;\n\
}\n\
\n\
.ui-fa fa-tools {\n\
  background-position: 0 -2992px;\n\
}\n\
\n\
.ui-fa fa-trash {\n\
  background-position: 0 -4896px;\n\
}\n\
\n\
.ui-fa fa-triangle-1-e {\n\
  background-position: 0 -5296px;\n\
}\n\
\n\
.ui-fa fa-triangle-1-n {\n\
  background-position: 0 -5424px;\n\
}\n\
\n\
.ui-fa fa-triangle-1-ne {\n\
  background-position: 0 -5056px;\n\
}\n\
\n\
.ui-fa fa-triangle-1-nw {\n\
  background-position: 0 -5248px;\n\
}\n\
\n\
.ui-fa fa-triangle-1-s {\n\
  background-position: 0 -5184px;\n\
}\n\
\n\
.ui-fa fa-triangle-1-se {\n\
  background-position: 0 -5440px;\n\
}\n\
\n\
.ui-fa fa-triangle-1-sw {\n\
  background-position: 0 -5232px;\n\
}\n\
\n\
.ui-fa fa-triangle-1-w {\n\
  background-position: 0 -5312px;\n\
}\n\
\n\
.ui-fa fa-triangle-2-e-w {\n\
  background-position: 0 -4528px;\n\
}\n\
\n\
.ui-fa fa-triangle-2-n-s {\n\
  background-position: 0 -4496px;\n\
}\n\
\n\
.ui-fa fa-twitter-2 {\n\
  background-position: 0 -2272px;\n\
}\n\
\n\
.ui-fa fa-twitter {\n\
  background-position: 0 -4288px;\n\
}\n\
\n\
.ui-fa fa-undo {\n\
  background-position: 0 -2288px;\n\
}\n\
\n\
.ui-fa fa-unlink {\n\
  background-position: 0 -1088px;\n\
}\n\
\n\
.ui-fa fa-unlocked {\n\
  background-position: 0 -2480px;\n\
}\n\
\n\
.ui-fa fa-unordered-list {\n\
  background-position: 0 -5008px;\n\
}\n\
\n\
.ui-fa fa-update {\n\
  background-position: 0 -400px;\n\
}\n\
\n\
.ui-fa fa-user-suit {\n\
  background-position: 0 -640px;\n\
}\n\
\n\
.ui-fa fa-user-unknown {\n\
  background-position: 0 -1376px;\n\
}\n\
\n\
.ui-fa fa-user-woman {\n\
  background-position: 0 -656px;\n\
}\n\
\n\
.ui-fa fa-user {\n\
  background-position: 0 -2784px;\n\
}\n\
\n\
.ui-fa fa-video {\n\
  background-position: 0 -80px;\n\
}\n\
\n\
.ui-fa fa-view-source {\n\
  background-position: 0 -928px;\n\
}\n\
\n\
.ui-fa fa-view {\n\
  background-position: 0 -880px;\n\
}\n\
\n\
.ui-fa fa-volume-off {\n\
  background-position: 0 -1664px;\n\
}\n\
\n\
.ui-fa fa-volume-on {\n\
  background-position: 0 -1040px;\n\
}\n\
\n\
.ui-fa fa-wallet {\n\
  background-position: 0 -1840px;\n\
}\n\
\n\
.ui-fa fa-warning {\n\
  background-position: 0 -2352px;\n\
}\n\
\n\
.ui-fa fa-wifi-router {\n\
  background-position: 0 -3392px;\n\
}\n\
\n\
.ui-fa fa-world-web {\n\
  background-position: 0 -64px;\n\
}\n\
\n\
.ui-fa fa-wrench {\n\
  background-position: 0 -1632px;\n\
}\n\
\n\
.ui-fa fa-xls {\n\
  background-position: 0 -2128px;\n\
}\n\
\n\
.ui-fa fa-youtube {\n\
  background-position: 0 -1280px;\n\
}\n\
\n\
.ui-fa fa-zoomin {\n\
  background-position: 0 -560px;\n\
}\n\
\n\
.ui-fa fa-zoomout {\n\
  background-position: 0 -448px;\n\
}\n\
\n\
                /* End of file: temp/default/src/dependencies/themes/mammoth/theme-icons.css */\n\
            \n\
                /* File: temp/default/src/style/raptor.css */\n\
                /* Non styles */\n\
/**\n\
 * Style global variables\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
/**\n\
 * Z index variables\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
/* line 9, mixins.scss */\n\
.raptor-ui-cancel .ui-icon, .raptor-ui-class-menu .ui-icon, .raptor-ui-clear-formatting .ui-icon, .raptor-ui-click-button-to-edit .ui-icon, .raptor-ui-dock-to-element .ui-icon, .raptor-ui-dock-to-screen .ui-icon, .raptor-ui-embed .ui-icon, .raptor-ui-float-left .ui-icon, .raptor-ui-float-none .ui-icon, .raptor-ui-float-right .ui-icon, .raptor-ui-guides .ui-icon, .raptor-ui-history-undo .ui-icon, .raptor-ui-history-redo .ui-icon, .raptor-ui-hr-create .ui-icon, .raptor-plugin-image-resize-button-button .ui-icon, .raptor-ui-insert-file .ui-icon, .raptor-ui-link-create .ui-icon, .raptor-ui-link-remove .ui-icon, .raptor-ui-list-unordered .ui-icon, .raptor-ui-list-ordered .ui-icon, .raptor-ui-save .ui-icon, .raptor-ui-snippet-menu .ui-icon, .raptor-ui-statistics .ui-icon, .raptor-ui-table-create .ui-icon, .raptor-ui-table-insert-row .ui-icon, .raptor-ui-table-insert-column .ui-icon, .raptor-ui-table-delete-row .ui-icon, .raptor-ui-table-delete-column .ui-icon, .raptor-ui-table-merge-cells .ui-icon, .raptor-ui-table-split-cells .ui-icon, .raptor-ui-tag-menu .ui-icon, .raptor-ui-align-left .ui-icon, .raptor-ui-align-right .ui-icon, .raptor-ui-align-center .ui-icon, .raptor-ui-align-justify .ui-icon, .raptor-ui-text-block-quote .ui-icon, .raptor-ui-text-bold .ui-icon, .raptor-ui-text-italic .ui-icon, .raptor-ui-text-underline .ui-icon, .raptor-ui-text-strike .ui-icon, .raptor-ui-text-size-increase .ui-icon, .raptor-ui-text-size-decrease .ui-icon, .raptor-ui-text-sub .ui-icon, .raptor-ui-text-super .ui-icon, .raptor-ui-view-source .ui-icon, .raptor-ui-special-characters .ui-icon {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=85);\n\
  opacity: 0.85;\n\
}\n\
\n\
/* line 13, mixins.scss */\n\
.raptor-ui-cancel:hover .ui-icon, .raptor-ui-class-menu:hover .ui-icon, .raptor-ui-clear-formatting:hover .ui-icon, .raptor-ui-click-button-to-edit:hover .ui-icon, .raptor-ui-dock-to-element:hover .ui-icon, .raptor-ui-dock-to-screen:hover .ui-icon, .raptor-ui-embed:hover .ui-icon, .raptor-ui-float-left:hover .ui-icon, .raptor-ui-float-none:hover .ui-icon, .raptor-ui-float-right:hover .ui-icon, .raptor-ui-guides:hover .ui-icon, .raptor-ui-history-undo:hover .ui-icon, .raptor-ui-history-redo:hover .ui-icon, .raptor-ui-hr-create:hover .ui-icon, .raptor-plugin-image-resize-button-button:hover .ui-icon, .raptor-ui-insert-file:hover .ui-icon, .raptor-ui-link-create:hover .ui-icon, .raptor-ui-link-remove:hover .ui-icon, .raptor-ui-list-unordered:hover .ui-icon, .raptor-ui-list-ordered:hover .ui-icon, .raptor-ui-save:hover .ui-icon, .raptor-ui-snippet-menu:hover .ui-icon, .raptor-ui-statistics:hover .ui-icon, .raptor-ui-table-create:hover .ui-icon, .raptor-ui-table-insert-row:hover .ui-icon, .raptor-ui-table-insert-column:hover .ui-icon, .raptor-ui-table-delete-row:hover .ui-icon, .raptor-ui-table-delete-column:hover .ui-icon, .raptor-ui-table-merge-cells:hover .ui-icon, .raptor-ui-table-split-cells:hover .ui-icon, .raptor-ui-tag-menu:hover .ui-icon, .raptor-ui-align-left:hover .ui-icon, .raptor-ui-align-right:hover .ui-icon, .raptor-ui-align-center:hover .ui-icon, .raptor-ui-align-justify:hover .ui-icon, .raptor-ui-text-block-quote:hover .ui-icon, .raptor-ui-text-bold:hover .ui-icon, .raptor-ui-text-italic:hover .ui-icon, .raptor-ui-text-underline:hover .ui-icon, .raptor-ui-text-strike:hover .ui-icon, .raptor-ui-text-size-increase:hover .ui-icon, .raptor-ui-text-size-decrease:hover .ui-icon, .raptor-ui-text-sub:hover .ui-icon, .raptor-ui-text-super:hover .ui-icon, .raptor-ui-view-source:hover .ui-icon, .raptor-ui-special-characters:hover .ui-icon {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=100);\n\
  opacity: 1;\n\
}\n\
\n\
/* Base style */\n\
/**\n\
 * Main editor styles\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 * @author Michael Robinson <michael@panmedia.co.nz>\n\
 */\n\
/* line 7, style.scss */\n\
.raptor-editing {\n\
  outline: none;\n\
}\n\
\n\
/* line 12, style.scss */\n\
.raptor-editable-block-hover:not(.raptor-editing),\n\
.raptor-editable-block:hover:not(.raptor-editing) {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoAQMAAAC2MCouAAAABlBMVEUAAACfn5/FQV4CAAAAAnRSTlMAG/z2BNQAAABPSURBVHhexc2xEYAgEAXRdQwILYFSKA1LsxRKIDRwOG8LMDb9++aO8tAvjps4qXMLaGNf5JglxyyEhWVBXpAfyCvyhrwjD74OySfy8dffFyMcWadc9txXAAAAAElFTkSuQmCC\') 0 0;\n\
}\n\
\n\
/* line 16, style.scss */\n\
.raptor-editing-inline {\n\
  width: 600px;\n\
  min-height: 150px;\n\
  padding: 5px !important;\n\
  background-color: #fff;\n\
  border: 1px solid #c1c1c1 !important;\n\
  border-top: none !important;\n\
  color: #000;\n\
  font-size: 1em;\n\
}\n\
\n\
/**\n\
 * Unsupported warning styles\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
/* line 8, support.scss */\n\
.raptor-unsupported {\n\
  position: relative;\n\
}\n\
\n\
/* line 12, support.scss */\n\
.raptor-unsupported-overlay {\n\
  position: fixed;\n\
  top: 0;\n\
  left: 0;\n\
  bottom: 0;\n\
  right: 0;\n\
  background-color: black;\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=50);\n\
  opacity: 0.5;\n\
}\n\
\n\
/* line 22, support.scss */\n\
.raptor-unsupported-content {\n\
  position: fixed;\n\
  top: 50%;\n\
  left: 50%;\n\
  margin: -200px 0 0 -300px;\n\
  width: 600px;\n\
  height: 400px;\n\
}\n\
\n\
/* line 31, support.scss */\n\
.raptor-unsupported-input {\n\
  position: absolute;\n\
  bottom: 10px;\n\
}\n\
\n\
/* line 36, support.scss */\n\
.raptor-unsupported-content {\n\
  padding: 10px;\n\
  background-color: white;\n\
  border: 1px solid #777;\n\
}\n\
\n\
/**\n\
 * Toolbar layout.\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
/* line 9, ../components/layout/toolbar.scss */\n\
.raptor-layout-toolbar-outer {\n\
  overflow: visible;\n\
  position: fixed;\n\
  font-size: 12px;\n\
  z-index: 1300;\n\
  -webkit-user-select: none;\n\
  -moz-user-select: none;\n\
  user-select: none;\n\
}\n\
/* line 16, ../components/layout/toolbar.scss */\n\
.raptor-layout-toolbar-outer * {\n\
  -webkit-user-select: none;\n\
  -moz-user-select: none;\n\
  user-select: none;\n\
}\n\
\n\
/* line 21, ../components/layout/toolbar.scss */\n\
.raptor-layout-toolbar-inner {\n\
  border: 1px solid #c1c1c1;\n\
  border-top: none;\n\
}\n\
\n\
/* line 26, ../components/layout/toolbar.scss */\n\
.raptor-layout-toolbar-toolbar {\n\
  padding: 6px 0 0 5px;\n\
  overflow: visible;\n\
}\n\
\n\
/* line 31, ../components/layout/toolbar.scss */\n\
.raptor-layout-toolbar-path {\n\
  padding: 5px;\n\
}\n\
\n\
/* line 35, ../components/layout/toolbar.scss */\n\
.raptor-layout-toolbar-group {\n\
  float: left;\n\
  margin-right: 5px;\n\
}\n\
\n\
/* line 40, ../components/layout/toolbar.scss */\n\
.raptor-layout-toolbar-group .ui-button {\n\
  padding: 0;\n\
  margin-top: 0;\n\
  margin-left: -1px;\n\
  margin-bottom: 5px;\n\
  margin-right: 0;\n\
  height: 32px;\n\
  float: left;\n\
  -webkit-box-sizing: border-box;\n\
  -moz-box-sizing: border-box;\n\
  box-sizing: border-box;\n\
}\n\
\n\
/* line 51, ../components/layout/toolbar.scss */\n\
.raptor-layout-toolbar-group .ui-button:hover {\n\
  z-index: 1;\n\
}\n\
\n\
/* line 55, ../components/layout/toolbar.scss */\n\
.raptor-layout-toolbar-group .ui-button-fa fa-only {\n\
  width: 32px;\n\
}\n\
\n\
/* line 59, ../components/layout/toolbar.scss */\n\
.raptor-layout-toolbar-group .ui-button-text-only .ui-button-text {\n\
  padding: 8px 16px 10px 16px;\n\
}\n\
\n\
/* line 62, ../components/layout/toolbar.scss */\n\
.raptor-layout-toolbar-group .ui-button-text-fa fa-primary .ui-button-text {\n\
  padding: 8px 16px 10px 32px;\n\
}\n\
\n\
/**\n\
 * Hover panel layout.\n\
 *\n\
 * @author Michael Robinson <michael@panmedia.co.nz>\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
/* line 7, ../components/layout/hover-panel.scss */\n\
.raptor-layout-hover-panel {\n\
  z-index: 1100;\n\
  position: absolute;\n\
}\n\
\n\
/**\n\
 * Message widget styles\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
/* line 10, ../components/layout/messages.scss */\n\
.raptor-layout-messages {\n\
  margin: 0;\n\
  position: fixed;\n\
  top: 0;\n\
  left: 0;\n\
  right: 0;\n\
  z-index: 2500;\n\
  /* Information */\n\
  /* Error */\n\
  /* Confirm */\n\
  /* Warning */\n\
  /* Loading */\n\
}\n\
/* line 18, ../components/layout/messages.scss */\n\
.raptor-layout-messages .raptor-layout-messages-close {\n\
  cursor: pointer;\n\
  float: right;\n\
}\n\
/* line 23, ../components/layout/messages.scss */\n\
.raptor-layout-messages .ui-icon {\n\
  margin: 5px;\n\
}\n\
/* line 28, ../components/layout/messages.scss */\n\
.raptor-layout-messages .ui-icon,\n\
.raptor-layout-messages .raptor-layout-messages-message {\n\
  display: inline-block;\n\
  vertical-align: top;\n\
}\n\
/* line 32, ../components/layout/messages.scss */\n\
.raptor-layout-messages .raptor-layout-messages-message {\n\
  padding: 5px 0;\n\
}\n\
/* line 36, ../components/layout/messages.scss */\n\
.raptor-layout-messages .raptor-layout-messages-wrapper {\n\
  padding: 3px 3px 3px 1px;\n\
  line-height: 18px;\n\
  -webkit-box-shadow: inset 0 -1px 1px rgba(0, 0, 0, 0.35), inset 0 1px 2px rgba(255, 255, 255, 0.5);\n\
  -moz-box-shadow: inset 0 -1px 1px rgba(0, 0, 0, 0.35), inset 0 1px 2px rgba(255, 255, 255, 0.5);\n\
  box-shadow: inset 0 -1px 1px rgba(0, 0, 0, 0.35), inset 0 1px 2px rgba(255, 255, 255, 0.5);\n\
}\n\
/* line 47, ../components/layout/messages.scss */\n\
.raptor-layout-messages .raptor-layout-messages-type,\n\
.raptor-layout-messages .raptor-layout-messages-info {\n\
  /* Blue */\n\
  background: url(\'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4gPHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJncmFkIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgeDE9IjUwJSIgeTE9IjAlIiB4Mj0iNTAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2E5ZTRmNyIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzBmYjRlNyIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHg9IjAiIHk9IjAiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JhZCkiIC8+PC9zdmc+IA==\');\n\
  background: -webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(0%, #a9e4f7), color-stop(100%, #0fb4e7));\n\
  background: -webkit-linear-gradient(top, #a9e4f7, #0fb4e7);\n\
  background: -moz-linear-gradient(top, #a9e4f7, #0fb4e7);\n\
  background: -o-linear-gradient(top, #a9e4f7, #0fb4e7);\n\
  background: linear-gradient(top, #a9e4f7, #0fb4e7);\n\
}\n\
/* line 53, ../components/layout/messages.scss */\n\
.raptor-layout-messages .raptor-layout-messages-error {\n\
  /* Red */\n\
  background: url(\'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4gPHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJncmFkIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgeDE9IjUwJSIgeTE9IjAlIiB4Mj0iNTAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2ZmNWQ0YiIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2ZhMWMxYyIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHg9IjAiIHk9IjAiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JhZCkiIC8+PC9zdmc+IA==\');\n\
  background: -webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(0%, #ff5d4b), color-stop(100%, #fa1c1c));\n\
  background: -webkit-linear-gradient(top, #ff5d4b, #fa1c1c);\n\
  background: -moz-linear-gradient(top, #ff5d4b, #fa1c1c);\n\
  background: -o-linear-gradient(top, #ff5d4b, #fa1c1c);\n\
  background: linear-gradient(top, #ff5d4b, #fa1c1c);\n\
}\n\
/* line 59, ../components/layout/messages.scss */\n\
.raptor-layout-messages .raptor-layout-messages-confirm {\n\
  /* Green */\n\
  background: url(\'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4gPHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJncmFkIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgeDE9IjUwJSIgeTE9IjAlIiB4Mj0iNTAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2NkZWI4ZSIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2E1Yzk1NiIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHg9IjAiIHk9IjAiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JhZCkiIC8+PC9zdmc+IA==\');\n\
  background: -webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(0%, #cdeb8e), color-stop(100%, #a5c956));\n\
  background: -webkit-linear-gradient(top, #cdeb8e, #a5c956);\n\
  background: -moz-linear-gradient(top, #cdeb8e, #a5c956);\n\
  background: -o-linear-gradient(top, #cdeb8e, #a5c956);\n\
  background: linear-gradient(top, #cdeb8e, #a5c956);\n\
}\n\
/* line 65, ../components/layout/messages.scss */\n\
.raptor-layout-messages .raptor-layout-messages-warning {\n\
  /* Yellow */\n\
  background: url(\'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4gPHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJncmFkIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgeDE9IjUwJSIgeTE9IjAlIiB4Mj0iNTAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2ZmZDY1ZSIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2ZlYmYwNCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHg9IjAiIHk9IjAiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JhZCkiIC8+PC9zdmc+IA==\');\n\
  background: -webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(0%, #ffd65e), color-stop(100%, #febf04));\n\
  background: -webkit-linear-gradient(top, #ffd65e, #febf04);\n\
  background: -moz-linear-gradient(top, #ffd65e, #febf04);\n\
  background: -o-linear-gradient(top, #ffd65e, #febf04);\n\
  background: linear-gradient(top, #ffd65e, #febf04);\n\
}\n\
/* line 71, ../components/layout/messages.scss */\n\
.raptor-layout-messages .raptor-layout-messages-load {\n\
  /* Purple */\n\
  background: url(\'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4gPHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJncmFkIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgeDE9IjUwJSIgeTE9IjAlIiB4Mj0iNTAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2ZiODNmYSIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2U5M2NlYyIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHg9IjAiIHk9IjAiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JhZCkiIC8+PC9zdmc+IA==\');\n\
  background: -webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(0%, #fb83fa), color-stop(100%, #e93cec));\n\
  background: -webkit-linear-gradient(top, #fb83fa, #e93cec);\n\
  background: -moz-linear-gradient(top, #fb83fa, #e93cec);\n\
  background: -o-linear-gradient(top, #fb83fa, #e93cec);\n\
  background: linear-gradient(top, #fb83fa, #e93cec);\n\
}\n\
\n\
/**\n\
 * Select menu UI widget styles\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
/* line 6, ../components/ui/menu.scss */\n\
.raptor-menu {\n\
  z-index: 1600;\n\
  padding: 6px;\n\
}\n\
\n\
/* line 11, ../components/ui/menu.scss */\n\
.raptor-menu .ui-menu-item:before {\n\
  display: none;\n\
}\n\
\n\
/* line 16, ../components/ui/menu.scss */\n\
.raptor-menu .ui-menu-item a,\n\
.raptor-menu .ui-menu-item a:hover {\n\
  white-space: pre;\n\
  padding: 3px 10px;\n\
}\n\
\n\
/**\n\
 * Select menu UI widget styles\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
/* line 6, ../components/ui/select-menu.scss */\n\
.raptor-selectmenu {\n\
  overflow: visible;\n\
  position: relative;\n\
}\n\
\n\
/* line 11, ../components/ui/select-menu.scss */\n\
.raptor-selectmenu-button {\n\
  text-align: left;\n\
  padding: 3px 18px 5px 5px !important;\n\
  float: none !important;\n\
}\n\
/* line 18, ../components/ui/select-menu.scss */\n\
.raptor-selectmenu-button .ui-icon {\n\
  position: absolute;\n\
  right: 1px;\n\
  top: 8px;\n\
}\n\
/* line 23, ../components/ui/select-menu.scss */\n\
.raptor-selectmenu-button .raptor-selectmenu-text {\n\
  font-size: 13px;\n\
}\n\
\n\
/* line 28, ../components/ui/select-menu.scss */\n\
.raptor-selectmenu-wrapper {\n\
  position: relative;\n\
}\n\
\n\
/* line 32, ../components/ui/select-menu.scss */\n\
.raptor-selectmenu-button .ui-button-text {\n\
  padding: 0 25px 0 5px;\n\
}\n\
\n\
/* line 35, ../components/ui/select-menu.scss */\n\
.raptor-selectmenu-button .ui-icon {\n\
  background-repeat: no-repeat;\n\
}\n\
\n\
/* line 39, ../components/ui/select-menu.scss */\n\
.raptor-selectmenu-menu {\n\
  position: absolute;\n\
  top: 100%;\n\
  left: 0;\n\
  right: auto;\n\
  display: none;\n\
  margin-top: -1px !important;\n\
}\n\
\n\
/* line 48, ../components/ui/select-menu.scss */\n\
.raptor-selectmenu-visible .raptor-selectmenu-menu {\n\
  display: block;\n\
  z-index: 1;\n\
}\n\
\n\
/* line 53, ../components/ui/select-menu.scss */\n\
.raptor-selectmenu-menu-item {\n\
  padding: 5px;\n\
  margin: 3px;\n\
  z-index: 1;\n\
  text-align: left;\n\
  font-size: 13px;\n\
  font-weight: normal !important;\n\
  border: 1px solid transparent;\n\
  cursor: pointer;\n\
  background-color: inherit;\n\
}\n\
\n\
/* line 65, ../components/ui/select-menu.scss */\n\
.raptor-selectmenu-button {\n\
  background: #f5f5f5;\n\
  border: 1px solid #ccc;\n\
}\n\
\n\
/**\n\
 * Cancel plugin.\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
/* line 20, mixins.scss */\n\
.raptor-ui-cancel .ui-icon, .raptor-ui-cancel.ui-state-hover .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAtFBMVEX///+nAABhAACnAACjAACCAACgAACHAACjAAByAAB1AAByAACDAACnAACCAACHAACgAACNAACbAACXAACMAACSAABfAACYAACRAACjAACbAAChAACqAACNAACcAACHAACqAADEERGsERHQERG+NjaiERHUTEzYERG4ERGlFBSfFRX/d3f6cnK0JSWoHh7qYmLkXFyvFRXmXl7vZ2fNRUX4cHDXT0/+dnbbU1O3Li7GPT26MTG2f8oMAAAAIXRSTlMASEjMzADMzAAASMxIAMwAAMzMzEjMzEhISABIzABISEg/DPocAAAAj0lEQVR4Xo3PVw6DMBBF0RgXTO+hBYhtILX3sv99RRpvgPcxVzp/M5syb7lYepxDABDeYcQ5wg+MAMhr3JOyJKfxTABqduuvjD37O6sBwjZ+f76/7TFuQw1VnhyGYZPklYagKbKLlDIrmkBDGq1hUaqhM4UQJpwOwFdK+a4LAbCdlWNTCgGwjLlhUQqZ8uofSk8NKY1Fm8EAAAAASUVORK5CYII=\') 0 0;\n\
}\n\
\n\
/**\n\
 * Snippet menu plugin.\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
/* line 20, mixins.scss */\n\
.raptor-ui-class-menu .ui-icon, .raptor-ui-class-menu.ui-state-hover .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyNJREFUeNpskn9MG2UYx7/3o7TlSgNLi1jciiA71jkt6UgAnQpdTMYMTkayLCQzWbIY3faHiQR1TP/TLJkxLsaYmDidM1kTBQqZEp1hKyMgGRMhYXTgoCBFFhmchZZe797X9zpK0O25e3Nv7r6f7/O8z3Ncz1ERRnDpG86t8d2tUuKRkwv8RO+Kn4hCSUFVfHy2TRuOfEooHdQIVglNI5BXnwF/fwsbW4cFi61ZjWadtMkylDD2xPOlKlmuwKKEhtyiXScI+OPr2nSEpT4Y6bdR8EccZZWVzidrqucxglAggLzaHeASJly+fAku607MeF97pa+0rCF3qs1tWxo1jJD9bQBc9xHxVKm/6YDFWeLT1BSXcTdlZUE0m6Elk0ipKt6f3QePx4NQKARd1zk5FIA7dAnirEJ3el2yx5Rl4YhV1/RUih2L428ND0RG+q/dfarq+fwd3kr3buF3fPfDNOTFrt8K1dtwhIaQZIlEZQ0DF8+edrC9YGQuLJHz6l49Uf7Hzd7JQnfRXva88nRVjbuxVEFx+ONf7iqTY+p1ihRwiABvGT04ZyzeGAMHV/TO+HnBZML+Y80VqeTa30TX0k0f6DzfE52aDAv99EN9kb6rCkJjQtcvpGdowCY+PZtTFXWNj68pCsxmqz1bsoOy68evzvX+eWfipnQDX+r36Ht8Ts6elVjsZ5UlFiXTBsykyMvfVmwTLGYtlUyqC3MzsaGrP81EB28P2qa5LtyjXzjcblc4EhlkcCtDiMhxFNr6j6ETBNo/O6OoOraywnVW+1/mJXQ4h0GToB+9UF/v+76zs4/BbzL5qsGI2BQ6RTBFEDROTViH5i1lsK/Bb8f4mXV4KAG0sE/RDPMfg0w85spBR6wWlNLty9Kc/6Xq6gzcyuC+zVoxz2HbXAEcTul+P/6h2+Px+L6LPT3v1Hk8nzwHdDO4+//JmIH0sCL8u6TIwWMffP66z+c7HdO04LPA6MOE4lj28Qde5sZ/PXvoRbu35ejL38RifJAQsgFveZTDlgJuk4H1jQcMFLXJ2/7123OJ5cQFQqyjGfCJcn4DXh8c/hVgAAYpUQUdUKm5AAAAAElFTkSuQmCC\') 0 0;\n\
}\n\
\n\
/**\n\
 * Clear formatting style plugin.\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
/* line 20, mixins.scss */\n\
.raptor-ui-clear-formatting .ui-icon, .raptor-ui-clear-formatting.ui-state-hover .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAAZiS0dEAP8A/wD/oL2nkwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9wGGxcPH7KJ9wUAAAEKSURBVDjL3ZG9SgNBFIW/I76D1RIEazEIFitWNguxUPANUkUIKG4jYiEBC7WwUFJZiNssFvoOFipMFx/AoIVVEAvxB7w2MyBhV5Iq4IHLPecy9zBzBv4nJLUltQc5O1awXAE+gAnPhzMAFoE7YNzzoQ0WgBvg1vPBDSRNAl9m9gC4ebPpc+jkkADkkOTggi4KryFpV9KMpHgfXr/T1DJwGWxn4IIuM7iQdB1qDu73oPder9spuNDPYLZoeUrSZd9saQUej6DzUqvZCbhj2Pjr+pu/ZzuwnMLbc7Vqh+BCPyjIIAaefMVhuA69bhTZGnyuwlULXDeKrFWWQT+akDTAbfk3B90s+4WR4Acs5VZuyM1J1wAAAABJRU5ErkJggg==\') 0 0;\n\
}\n\
\n\
/**\n\
 * Click to edit plugin\n\
 *\n\
 * @author Michael Robinson <michael@panmedia.co.nz>\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
/* line 20, mixins.scss */\n\
.raptor-ui-click-button-to-edit .ui-icon, .raptor-ui-click-button-to-edit.ui-state-hover .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAABSlBMVEWymwFVVVWymgEKCgqtlQG2AQEDAwOvmQOokQKlfACgiQLTAQHiAQGFbwEICAgcHBwQEBDkAQF8ZwEGBgZbTwJ1YACIdwNbRwhhTA5VBQVACAhQUFDSAQFvBgbgAQEXFxcxCQlgBgaVgxW0AQHFAQEMDAxVVVWoAACkjQKpkgK8FRWbhQKhigKgAACwmgPkAQGJcwGPeQFVVVWlfACojQGAawGGcAG8cwOmfQCOeAGbdQCXcgDx5MB5YwF9aAGDBgaXgQKSfAKYggKOawG7pWLdzqBvWQF2YAB/cyyMegh7XgGlkVVnTgFnTgGslQNnYkFoTgFnTgFnTgFnTgGrlALy5sL29vbd3d3k02D/7oji0V3v3nH4aGjMzMzh0Fv864P4537r2mkAAAD/iIj043jj0l3m1WO7qjPk01/yXFzMu0Tfzljgz1rezVaqP1K6AAAAVXRSTlMAAEAAtwAAAAAAAAAAAAAAAAAAAAAAAAAAAABpPwCdgykAo0O5LySxwkSdw0UyQyvHRR8npshGAAAABmzvyke1AMVFOcD1w0cAsIXRljzAAJZJCQAA2U4xywAAALVJREFUeF41yNOaA0EUAOHTmUxo27axto1RzPW+/21y+uvUXf1gtVmcmk0uIKQaCfEUcAFIo7BIJSngAmSC4vA7Cz6vB2iqhDiSjsqg77FXK59SNOZHYD/5v0lzHAX607/HCscAf7nK5bUM8AdysaRjgD+TT04NW9j8x1etfryFZkvpj9udHYRAOA67e/s/vweHZoSuycjD2blwcXnlQLi2I9wKd/cPboQnQmH+/PL6hvBOKKwBNYghCPFyErUAAAAASUVORK5CYII=\') 0 0;\n\
}\n\
\n\
/**\n\
 * Basic color menu plugin.\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
/* line 6, ../plugins/color-menu-basic/color-menu-basic.scss */\n\
.raptor-ui-color-menu-basic-menu > div {\n\
  min-width: 100px;\n\
}\n\
\n\
/* line 10, ../plugins/color-menu-basic/color-menu-basic.scss */\n\
.raptor-ui-color-menu-basic-menu span {\n\
  padding-left: 2px;\n\
}\n\
\n\
/* line 14, ../plugins/color-menu-basic/color-menu-basic.scss */\n\
.raptor-ui-color-menu-basic-swatch {\n\
  width: 16px;\n\
  height: 16px;\n\
  float: left;\n\
  margin-top: 2px;\n\
  border: 1px solid rgba(0, 0, 0, 0.2);\n\
}\n\
\n\
/* line 22, ../plugins/color-menu-basic/color-menu-basic.scss */\n\
.raptor-ui-color-menu-basic .ui-fa fa-swatch {\n\
  background-image: none;\n\
  border: 1px solid rgba(0, 0, 0, 0.35);\n\
}\n\
\n\
/**\n\
 * Dock plugin.\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
/* line 8, ../plugins/dock/dock.scss */\n\
.raptor-plugin-dock-docked-to-element .raptor-layout-toolbar-path, .raptor-plugin-dock-docked .raptor-layout-toolbar-path {\n\
  display: none;\n\
}\n\
\n\
/* line 13, ../plugins/dock/dock.scss */\n\
.raptor-plugin-dock-docked {\n\
  line-height: 0;\n\
}\n\
\n\
/* line 17, ../plugins/dock/dock.scss */\n\
.raptor-plugin-dock-docked .raptor-messages {\n\
  position: fixed;\n\
  left: 50%;\n\
  margin: 0 -400px 10px;\n\
  padding: 0;\n\
  text-align: left;\n\
}\n\
/* line 24, ../plugins/dock/dock.scss */\n\
.raptor-plugin-dock-docked .raptor-messages .raptor-message-wrapper {\n\
  width: 800px;\n\
}\n\
\n\
/* line 29, ../plugins/dock/dock.scss */\n\
.raptor-plugin-dock-visible {\n\
  display: block;\n\
}\n\
\n\
/* line 33, ../plugins/dock/dock.scss */\n\
.raptor-plugin-dock-hidden {\n\
  display: none;\n\
}\n\
\n\
/**\n\
 * Dock to element plugin.\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
/* line 20, mixins.scss */\n\
.raptor-ui-dock-to-element .ui-icon, .raptor-ui-dock-to-element.ui-state-hover .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAsVBMVEX///9VVVUNDQ1VVVVVVVUvLy9TU1MfHx+4uMTGxsZBY+hAYuYREREPDw9BY+kiRK0lR7Wwvue9y/O5x/C+zPVcfuO4xe5CZMjBz/iywOgzVc81V7q0weoqTLAjRasrTcE7Xd1Qcte2xO3Azfa7yfHQ0M7Ly8rFxcbFxcy1wuvHx9HKyta/zPXp6enBzve2w+zY2Njb29vh4eHU1NPr6+tlh+3Hx8a5xu/FxcjCz/jn5+fv4craAAAADnRSTlMAZoZZInhaftPTwIBCZLWComUAAACBSURBVHheZcRVcgJRFADRJiNYMu5uuBPP/heWx9eF4lR1o2sjoelgTi/n98Xya/Wz3u4mJnw+gvD3XghtchRJC3G/F30MeeCJIIfSG4RXQjV8i6EC2++Eb4MTFSJyoO7StBaQbVw3uyqG6mBAcyqK5k8Zqz7GMLMsa/6ivN72xpN/8isdAjArQVYAAAAASUVORK5CYII=\') 0 0;\n\
}\n\
\n\
/* line 16, ../plugins/dock/dock-to-element.scss */\n\
.raptor-plugin-dock-inline-wrapper {\n\
  width: 100% !important;\n\
  padding: 0 !important;\n\
  margin: 0 !important;\n\
}\n\
\n\
/**\n\
 * Dialog docked to element\n\
 */\n\
/* line 25, ../plugins/dock/dock-to-element.scss */\n\
.raptor-plugin-dock-docked-to-element-wrapper {\n\
  font-size: inherit;\n\
  color: inherit;\n\
  font-family: inherit;\n\
}\n\
\n\
/* line 30, ../plugins/dock/dock-to-element.scss */\n\
.raptor-plugin-dock-docked-to-element-wrapper .raptor-layout-toolbar-outer {\n\
  /* Removed fixed position from the editor */\n\
  position: relative !important;\n\
  top: auto !important;\n\
  left: auto !important;\n\
  border: 0 none !important;\n\
  padding: 0 !important;\n\
  margin: 0 !important;\n\
  z-index: auto !important;\n\
  width: 100% !important;\n\
  font-size: inherit !important;\n\
  color: inherit !important;\n\
  font-family: inherit !important;\n\
  float: none !important;\n\
  width: auto !important;\n\
  display: -webkit-box;\n\
  display: -moz-box;\n\
  display: -ms-box;\n\
  display: box;\n\
  -webkit-box-orient: vertical;\n\
  -moz-box-orient: vertical;\n\
  -ms-box-orient: vertical;\n\
  box-orient: vertical;\n\
}\n\
/* line 50, ../plugins/dock/dock-to-element.scss */\n\
.raptor-plugin-dock-docked-to-element-wrapper .raptor-layout-toolbar-outer .raptor-layout-toolbar-toolbar {\n\
  margin: 0;\n\
  z-index: 2;\n\
  -webkit-box-ordinal-group: 1;\n\
  -moz-box-ordinal-group: 1;\n\
  -ms-box-ordinal-group: 1;\n\
  box-ordinal-group: 1;\n\
}\n\
/* line 57, ../plugins/dock/dock-to-element.scss */\n\
.raptor-plugin-dock-docked-to-element-wrapper .raptor-layout-toolbar-outer .raptor-layout-toolbar-toolbar .ui-widget-header {\n\
  border-top: 0;\n\
  border-left: 0;\n\
  border-right: 0;\n\
}\n\
/* line 63, ../plugins/dock/dock-to-element.scss */\n\
.raptor-plugin-dock-docked-to-element-wrapper .raptor-layout-toolbar-outer .raptor-messages {\n\
  margin: 0;\n\
}\n\
\n\
/* line 68, ../plugins/dock/dock-to-element.scss */\n\
.raptor-plugin-dock-docked-element {\n\
  /* Override margin so toolbars sit flush next to element */\n\
  margin: 0 !important;\n\
  display: block;\n\
  z-index: 1;\n\
  position: relative !important;\n\
  top: auto !important;\n\
  left: auto !important;\n\
  border: 0 none;\n\
  padding: 0;\n\
  margin: 0;\n\
  z-index: auto;\n\
  width: 100%;\n\
  font-size: inherit;\n\
  color: inherit;\n\
  font-family: inherit;\n\
  float: none;\n\
  width: auto;\n\
  -webkit-box-ordinal-group: 2;\n\
  -moz-box-ordinal-group: 2;\n\
  -ms-box-ordinal-group: 2;\n\
  box-ordinal-group: 2;\n\
}\n\
\n\
/* line 93, ../plugins/dock/dock-to-element.scss */\n\
.raptor-plugin-dock-docked-to-element .raptor-layout-toolbar-inner {\n\
  border-top: 1px solid #c1c1c1;\n\
}\n\
\n\
/**\n\
 * Dock to screen plugin.\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
/* line 20, mixins.scss */\n\
.raptor-ui-dock-to-screen .ui-icon, .raptor-ui-dock-to-screen.ui-state-hover .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAwFBMVEX///8NDQ1VVVVVVVVTU1M5OTlLS0tHR0dVVVVDQ0MfHx8vLy8+Pj40NDQPDw/Gxsa4uMTr6+vz8/O2xO0tT8Tv7++uut0lR7PBz/hcdcwiRKvp6emqt9s+XtbQ1ehHac1thuX5+fmptdzk5OT29vbh4eFXed/n5+fu7u7x8fGfrecoSq739/fCz/jFxcjLy8q4xu3KytbDzevb29vY2NjU1NPQ0M7P1eY1V7vBzvdkhuzHx8bFxcbg4ujFxczHx9F6WxVSAAAAEXRSTlMAhmZZWnNrbSJvfnhxdWTT046to6oAAACXSURBVHheZco1FsMwAATRTcxhkZnCzMz3v1WkyvbLb6YZ2Fq9oNmA3j2ezpft87X5fPc9HXhUAZN12QTI/HvBz4BbFWD2V5K7dFX6JmCNKKVxyMJYdmQBDhVi4DHGvIEQ1AFac0ICzhnnASHzFmDMplKyS1RmBtAmQyk/5CqkDTSjsbS4LlSiJtAg6k3fqQppAJ1aWQd/fntuHFvCkQDlAAAAAElFTkSuQmCC\') 0 0;\n\
}\n\
\n\
/* line 13, ../plugins/dock/dock-to-screen.scss */\n\
.raptor-plugin-dock-docked .raptor-layout-toolbar-inner {\n\
  display: -webkit-box;\n\
  display: -moz-box;\n\
  display: -ms-box;\n\
  display: box;\n\
  -webkit-box-pack: center;\n\
  -moz-box-pack: center;\n\
  -ms-box-pack: center;\n\
  box-pack: center;\n\
  -webkit-box-align: center;\n\
  -moz-box-align: center;\n\
  -ms-box-align: center;\n\
  box-align: center;\n\
  width: 100%;\n\
}\n\
/* line 21, ../plugins/dock/dock-to-screen.scss */\n\
.raptor-plugin-dock-docked .raptor-layout-toolbar-toolbar {\n\
  text-align: center;\n\
}\n\
\n\
/**\n\
 * Embed plugin\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
/* line 20, mixins.scss */\n\
.raptor-ui-embed .ui-icon, .raptor-ui-embed.ui-state-hover .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAxlBMVEX////////fNzfaMTHVLCzKISHFGxvvR0flPDzpSEjdMTH4Y2PaKyvtTk7PJibXIyOnLi7lQECkKyvSHR3mPj6eJCSUGhqRFxfqQkL0XFziOTmOFBSBBwehKCiHDQ3PFRWaISGXHR3wVlaECgqqMTGLEBDGHR365eW1ICDaXFz139/LDg7NLi6tNDTSKSnMNzd9AwP1TEy/Fhbwxsbqv7+7EhKzFBS6EBDonZ3akJDkhISxBwf8a2vLIiLPcHD88fH67+/fYGAnLmvBAAAAAXRSTlMAQObYZgAAAJtJREFUeF5Vx0WShFAUBMB631F3afdxd7v/pQaiN5C7BK4mgM3nxAahczfihIgrrfVTqs+qGN2qLMvHwy4tB6sOmWeMIXp7/jI9L8PCYowR0e/3xzVj1gLLiHNOg9OR82iJvBZC0GD/J0Sdo7B93+/78+737AKNK6Uker2UA7fBNlBKPdyos2CLWXI/ksywnr+MzNdoLyZa4HYC/3EAHWTN0A0YAAAAAElFTkSuQmCC\') 0 0;\n\
}\n\
\n\
/* line 13, ../plugins/embed/embed.scss */\n\
.raptor-ui-embed-panel-tabs {\n\
  height: 100%;\n\
  width: 100%;\n\
  display: -webkit-box;\n\
  display: -moz-box;\n\
  display: -ms-box;\n\
  display: box;\n\
  -webkit-box-orient: vertical;\n\
  -moz-box-orient: vertical;\n\
  -ms-box-orient: vertical;\n\
  box-orient: vertical;\n\
  -webkit-box-flex: 1;\n\
  -moz-box-flex: 1;\n\
  -ms-box-flex: 1;\n\
  box-flex: 1;\n\
}\n\
/* line 22, ../plugins/embed/embed.scss */\n\
.raptor-ui-embed-panel-tabs .raptor-ui-embed-code-tab,\n\
.raptor-ui-embed-panel-tabs .raptor-ui-embed-preview-tab {\n\
  display: -webkit-box;\n\
  display: -moz-box;\n\
  display: -ms-box;\n\
  display: box;\n\
  -webkit-box-orient: vertical;\n\
  -moz-box-orient: vertical;\n\
  -ms-box-orient: vertical;\n\
  box-orient: vertical;\n\
  -webkit-box-flex: 1;\n\
  -moz-box-flex: 1;\n\
  -ms-box-flex: 1;\n\
  box-flex: 1;\n\
  -webkit-box-sizing: border-box;\n\
  -moz-box-sizing: border-box;\n\
  box-sizing: border-box;\n\
}\n\
/* line 28, ../plugins/embed/embed.scss */\n\
.raptor-ui-embed-panel-tabs .raptor-ui-embed-code-tab p,\n\
.raptor-ui-embed-panel-tabs .raptor-ui-embed-preview-tab p {\n\
  padding-top: 10px;\n\
}\n\
/* line 32, ../plugins/embed/embed.scss */\n\
.raptor-ui-embed-panel-tabs .raptor-ui-embed-code-tab textarea,\n\
.raptor-ui-embed-panel-tabs .raptor-ui-embed-preview-tab textarea {\n\
  display: -webkit-box;\n\
  display: -moz-box;\n\
  display: -ms-box;\n\
  display: box;\n\
  -webkit-box-flex: 4;\n\
  -moz-box-flex: 4;\n\
  -ms-box-flex: 4;\n\
  box-flex: 4;\n\
}\n\
\n\
/* line 39, ../plugins/embed/embed.scss */\n\
.raptor-ui-embed-dialog .ui-dialog-content {\n\
  display: -webkit-box !important;\n\
  display: -moz-box !important;\n\
  display: box !important;\n\
  width: 100% !important;\n\
  overflow: hidden;\n\
  -webkit-box-sizing: border-box;\n\
  -moz-box-sizing: border-box;\n\
  box-sizing: border-box;\n\
}\n\
\n\
/**\n\
 * Float block plugin\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
/* line 20, mixins.scss */\n\
.raptor-ui-float-left .ui-icon, .raptor-ui-float-left.ui-state-hover .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAS5JREFUeNpi/P//PwMlgImBQsACY1zaIH4A6Bp7dAUzV31jnLHy22YgkxFqIQhf/vfvXymKAQ8eidtra35lYAQqY+FgZWBmZ2X49fk7AxvbX6DsN1+CLlgwn5khMECAwcLiL4OogiIDj6QEw9uLZ4AGfAVJ70BzAQg7ohigrnaP4cEDLoY3bzkYzL6/ZVA34ma4ev07w/sPv0HSHgRdoKICUvgR6IWPDK8evWb49+8iw/1bfxhevwYbsBfNdhC2BkkwwqLRxRhuFgM3HyMDrwAjw8vH/xj2nvuH1WZgIDKgGMDExLQNiz9xYWagASboBpAU/zAXsCCJ7SbCZjaghexAmgOIFUh2AXKyh7GRXTARiI2w2MoKVMwBtRVkOysQHwNiPxQXDFhmotgAgAADAKYzbYynfqX2AAAAAElFTkSuQmCC\') 0 0;\n\
}\n\
\n\
/* line 20, mixins.scss */\n\
.raptor-ui-float-none .ui-icon, .raptor-ui-float-none.ui-state-hover .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAkFBMVEUAAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEAAAABAQEAAADRrxbRsBYBAQEBAQEBAQEBAQEBAQEBAQEBAQEAAAAAAAAAAACcegnCrQ6ffgqukQv+/GixkS3duyLhwyfkyizevSNRMDCigDLauC/y41DcuiLrzTTQrhWCYBiObSDErz3r4VvApCt4Vg6dewnDaH3NAAAAGHRSTlMAycfDxcu9v8HYu+DAwIm3uZnRkdDn7LIyy/h+AAAAWklEQVR4Xp2KRwqFMBQAYzfGXmPtvfx//9spgvAWQcRZzgx6gz6dGEDkQ1FWNRBN2/XZCMRvXtZtB4LSfxon6AHTsjVZUQWR5xz2cWfJxYR9eFf2MQnCCH3hAIfwBUXJe8YuAAAAAElFTkSuQmCC\') 0 0;\n\
}\n\
\n\
/* line 20, mixins.scss */\n\
.raptor-ui-float-right .ui-icon, .raptor-ui-float-right.ui-state-hover .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAS1JREFUeNpi/P//PwMlgImBQsACN4mJqRFIaQExIxQzZYRzBaaHcWE4kZGJ8aCe/0sHFAOAoB5d4avXfAwPH4swaGt+ZWAEGsnCwcrAzM7K8Ovzd3sMFwDBWpjNMPrK5b++C94yMwQGCDBYWPxlEFVQZOCRlGB4e/EMAzYDgtFdICr6kUFd7QfDgwdcDG/ecjCYfX/LoG7EzXD1+ncGeyNMAzYiuQDsCmHhf54qKr+BzI9AL3xkePXoNcO/fxcZ7t/6wwDzAyMsGoGBiDWUnQwR4tx8jAy8AowMLx//Y9h95g+GAdvQXIAPM//798+EKBfgAkADMMJgNxE2swEtZAfSHECsQLILkJM9jI3sgolAbITFVlagYg6orSDbWYH4GBD7obhgwDITxQYABBgAdBpg+9sXURwAAAAASUVORK5CYII=\') 0 0;\n\
}\n\
\n\
/**\n\
 * Show guides plugin\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
/* line 20, mixins.scss */\n\
.raptor-ui-guides .ui-icon, .raptor-ui-guides.ui-state-hover .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAHZJREFUeNpi/P//PwNFAGQAIyMjDK9BYqNgXHqZ0MSYcFmEyxBGsClMTGS5+t+/fxg2biLGAGTXoBvATGoYkuUFGMDmhd2kGjL4vHCUUi9cIjcpnwPi2UAsBaXPQZPwOXxscD5Cy0xLSbUc3YDnJLue0uwMEGAA2O1APJOrHFQAAAAASUVORK5CYII=\') 0 0;\n\
}\n\
\n\
/* line 10, ../plugins/guides/guides.scss */\n\
.raptor-ui-guides-visible * {\n\
  outline: 1px dashed rgba(0, 0, 0, 0.5);\n\
}\n\
\n\
/**\n\
 * History plugin\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
/* line 20, mixins.scss */\n\
.raptor-ui-history-undo .ui-icon, .raptor-ui-history-undo.ui-state-hover .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAe1JREFUeNrEUzFrFEEU/mazu7d3x8U9g0ROwkHEwrSrNmksJBxok1RRwUIEz0awFStZoqQw5B9ok1jYiRDBwl4PSaFJVLCMMfHWS7zb3ZndGd9ssgdXiVzhwGNnH+/75n3vm2FKKQyzDAy5zKmHLRSKRdiOA6tQgGlZDcrPUme3dcFBEPSLlZQQcZyFTFN8WZiGOUCnVCMRws9/4zD8BwkEFpz7N66c8vQJUbeLNEn+LuEQqxo8jv0716e8/f0UPIp0+n1OTbFLsUF1z+n7boAgA0eRf/em521tdeE4BuYunfa0OYehEMUJ3wt6Fza+7s4EkVwh3DJFLyPgYejfa0576+u/MsZe70g/tX8QRujSHDgXtpTpmOvarkjYrZ97Qg/xUTYDOv3B46U3rcnJMqRUUKaBtsXwzWDYJmfax1y0x07gx/FxfLbckd+1Wj0dYddI8vlcwhp1gcUnr/z55mXvbcfA99WXrVwjMwzGHNs0yiWbVSpFXqtVMTFxkrU+zOt55ENc04N7tvTCP9O86mn76D6cIzDSODYRhhUEnXFguy4/bs6gWr1IubN9F3KShHN8Wn6a3QNtZaFU0lvtZXAUm1LK13Jn5z7Vzw0Q9EmE0NvZDNnpoDw6OuC7voFUs0C19Uzif39MQxP8EWAA91//GdkHdYEAAAAASUVORK5CYII=\') 0 0;\n\
}\n\
\n\
/* line 20, mixins.scss */\n\
.raptor-ui-history-redo .ui-icon, .raptor-ui-history-redo.ui-state-hover .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAd9JREFUeNrEU89LG0EUfjP7KyvEGsRorRhoySGCuSyht0IPgicFQZCcvXsvHoP/Q8FDKZRCpQityKIHvZT2YI6t6MUfCJqQKpt1d7Ozu7N9O9vWhIIUcvDBt/OY4X3z3vfNkjiOoZ+g0GfIyaf46gtQSQJF0wQIvePN5nJiJYS8xmUzDAIz8H1gnQ74npcS3BeubYOm60lqCKQjm/89QhSG0HEcSG6tzo4bAWM1JJntGaE7UNQKcL6EaQkxknQfcS6Imk0GizOTxrvPx7Xf4pvdBAOc85VBnVTLU6OPhx8NZBVZUjmPIYpStNsMGo0I5l8+NT5sfxckggCFAYrFzyaHlo1yoYDdSs2WD9e2A/atC4wFooMkJBT79EqBF88Lxu7eYU0QMN+v5Eey1enSRKF1y6ULFoKFAFUDntMgwpsiDuAEMbgBhydDKmxtH9TRmdWUwPOWSsXi2Fmr7RyfNG6sa9vzbI+FHT+MI3730hbmjIwEcLTxSRSrup5qgH6Wvn39cd76ae9TSndw6wzRQNiSooQxiohjHij4Pqy379PiTMb86wJalL+6ZB+pLK9RSv+x0XddkQfrb9K2VdXssRHZk4M1mRDc6XXWsaw/aT15ibKimN3n5MF/pr4JfgkwANDA599q/NhJAAAAAElFTkSuQmCC\') 0 0;\n\
}\n\
\n\
/**\n\
 * Horizontal rule plugin\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
/* line 20, mixins.scss */\n\
.raptor-ui-hr-create .ui-icon, .raptor-ui-hr-create.ui-state-hover .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAXhJREFUeNpi/P//PwMTExMDEmgEYi0gZsSCrwJxNUzhv3//GBixGEA0ABnAgkV8LZqtTFDaF6aAX8KCwdBrA4QDckFq+1sGSUVrBkZGRqKwvEEhg2PyS7BeuAv07AsZXjw4BmJuQLIV5gImJLYrv7g53LlwA8TkLRgCi28wXDzQF/Dr10+G379/M/z58wfoz/9gfUxMrAzMzGwMsnr5DBwcvBgGHABiexBDyTiV4cuXTwxfv35j+PHjB9CQ/0BnszCwsHAysLHxIofVQSB2gBlgnxogAqREiI6B+ikf7ZFdcHD2hjf2X79+Zfj8+TNeF7Cz84K9wMrKdRDZAAcQ8fbJaYYndw4zYAsDHlFjBjZxKwyXwAPx1cMTDIdWxoKY+5BCHo7f31tp8VM9iUFQ0oaBQ9YBYQIoLo1dygmmA2QgIGHJoGhUCtaLLSkfweICVqA6diDNAcQKyJYTlRdAanCJY8sL04HYFM3WM0Acgs0QRlymEwsAAgwAwwCYinucCRoAAAAASUVORK5CYII=\') 0 0;\n\
}\n\
\n\
/**\n\
 * Image resize button plugin\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
/* line 20, mixins.scss */\n\
.raptor-plugin-image-resize-button-button .ui-icon, .raptor-plugin-image-resize-button-button.ui-state-hover .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAABAlBMVEX///9TddoqTLAjRasiRK1ihOlOcNVYet9miO5QctdWeN05W9k4WthCZMgyVM0zVc9BY8ddf+VSdNk0VtE+YOM8Xt8rTcFCZOssTsBCZOolR7U1V7o1V9Nlh+1CZMj5/Pz9/v5BY+kiRK3y9/f///9cfuP2+vojRasrTcHu9fUqTLD1+vo1V7o7Xd0zVc8lR7VTmv9sqf9coP/v9v/I3uvV5/fb6v1BfIS33Opxp7BZkpv+///s9PRQctdVnP9CdahShbhlmMri7v+Qw/Ci1fuPvv+71/+JvcZJlf8pZW2Cs8yw0fx7rt692f+rz//A2v/c6/+01P8cV2A2aZwxdFNuoZMUoDQrAAAAHXRSTlMAAAAAAADAAMAAAAAAAMAAAMDAwADAAAAAwAAAACp/YQ8AAACvSURBVHhehcc1csNQAAXA98WMljFiNjMFmRnuf5VM4lGVwtst/nFdgeXJL54VXBdITYlUJDMFLMIdVzhiAaLqJYc7iaeKgNHpB3cn4+nk+ibodwyAorr+w+P788vrm9+lKICm897X93yxvJj1cpoGGCaKP+5X283tOo4YBmi2R+Xn6dn50+VVOWo3Ab1eZEc7WVHXAVvRhhVNsYGBUzuo1JwBEIathvxXudEKQ+z3A1iJGpAw1RqcAAAAAElFTkSuQmCC\') 0 0;\n\
}\n\
\n\
/* line 26, ../plugins/image-resize-button/image-resize-button.scss */\n\
.raptor-resize-image {\n\
  position: relative;\n\
  min-width: 300px;\n\
}\n\
/* line 29, ../plugins/image-resize-button/image-resize-button.scss */\n\
.raptor-resize-image .form-text {\n\
  width: 40%;\n\
}\n\
/* line 32, ../plugins/image-resize-button/image-resize-button.scss */\n\
.raptor-resize-image label {\n\
  width: 35%;\n\
  display: inline-block;\n\
}\n\
/* line 36, ../plugins/image-resize-button/image-resize-button.scss */\n\
.raptor-resize-image .form-text, .raptor-resize-image label {\n\
  -webkit-box-sizing: border-box;\n\
  -moz-box-sizing: border-box;\n\
  box-sizing: border-box;\n\
}\n\
/* line 39, ../plugins/image-resize-button/image-resize-button.scss */\n\
.raptor-resize-image div {\n\
  margin-bottom: 1.25em;\n\
  z-index: 10;\n\
  position: relative;\n\
}\n\
/* line 44, ../plugins/image-resize-button/image-resize-button.scss */\n\
.raptor-resize-image .raptor-plugin-image-resize-button-lock-proportions-container {\n\
  position: absolute;\n\
  z-index: 0;\n\
}\n\
\n\
/* line 50, ../plugins/image-resize-button/image-resize-button.scss */\n\
.raptor-plugin-image-resize-button-lock-proportions-container {\n\
  right: 16%;\n\
  top: 34px;\n\
  height: 54px;\n\
  width: 40%;\n\
  border-color: #ccc;\n\
  border-width: 1px 1px 1px 0;\n\
  border-style: solid solid solid none;\n\
}\n\
\n\
/* line 62, ../plugins/image-resize-button/image-resize-button.scss */\n\
.raptor-plugin-image-resize-button-lock-proportions {\n\
  position: absolute;\n\
  right: -21px;\n\
  top: 50%;\n\
  margin-top: -21px;\n\
  height: 26px;\n\
  width: 26px;\n\
  border: 8px solid #ddd;\n\
  -webkit-border-radius: 39px;\n\
  -moz-border-radius: 39px;\n\
  -ms-border-radius: 39px;\n\
  -o-border-radius: 39px;\n\
  border-radius: 39px;\n\
  -webkit-box-shadow: 0 0 0 1px white inset;\n\
  -moz-box-shadow: 0 0 0 1px white inset;\n\
  box-shadow: 0 0 0 1px white inset;\n\
  background: url(\'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4gPHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJncmFkIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgeDE9IjUwJSIgeTE9IjAlIiB4Mj0iNTAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2VhZWFlYSIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2ZmZmZmZiIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHg9IjAiIHk9IjAiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JhZCkiIC8+PC9zdmc+IA==\');\n\
  background: -webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(0%, #eaeaea), color-stop(100%, #ffffff));\n\
  background: -webkit-linear-gradient(#eaeaea, #ffffff);\n\
  background: -moz-linear-gradient(#eaeaea, #ffffff);\n\
  background: -o-linear-gradient(#eaeaea, #ffffff);\n\
  background: linear-gradient(#eaeaea, #ffffff);\n\
}\n\
/* line 76, ../plugins/image-resize-button/image-resize-button.scss */\n\
.raptor-plugin-image-resize-button-lock-proportions .ui-button-text {\n\
  display: none;\n\
}\n\
/* line 80, ../plugins/image-resize-button/image-resize-button.scss */\n\
.raptor-plugin-image-resize-button-lock-proportions .ui-icon {\n\
  margin-left: -8px;\n\
  margin-top: -8px;\n\
  left: 50%;\n\
  top: 50%;\n\
  position: absolute;\n\
  background-repeat: no-repeat;\n\
}\n\
/* line 89, ../plugins/image-resize-button/image-resize-button.scss */\n\
.raptor-plugin-image-resize-button-lock-proportions.ui-state-hover {\n\
  cursor: pointer;\n\
  border-width: 8px;\n\
}\n\
\n\
/**\n\
 * Insert file plugin\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
/* line 20, mixins.scss */\n\
.raptor-ui-insert-file .ui-icon, .raptor-ui-insert-file.ui-state-hover .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAcVJREFUeNrEkz1rFFEUhp+587nzmY2JYXeNki1isWKihZ0gaGFjIULA3sYfEQikFVsrwTaF+gdsY2ljF4KdYuNmY9yM2bkz47kzECxlU3jgMncu87znPS9zrbquuUgpLljO1s7OI3n25+S/OWVZDt7u7r6ah36yvf3cKbW2Ksnh7ksLZYFriy1ZMw0mnrQjK5AzGXa4BKMe6Aq2btcY1tFaq1K+3Lhi4TmQCbAUwfef0HHbdxPz5BRuyKAbAzidgWEM6+iiaAT60T7rvTW6Ub/pfH0FVpJWKBdgeKl1cqZb0UZA2EZAVxUfPr3mYxDy8NZj7o3uN5aNI2M7L2AxhKJsz0LXjFG1AoURELWDwwMWsgX2Tt5wfPKV1eWr9BZXuZx26XjS2gpb2GtH+13VFI3AbKZKUTs7HvDjl8N07PFu8plOcEgURsRRTBzHJHFClqQi3GdtecCdaz6GPXcw7D3A8zx83ycMQ5IkJssSut1UlsBZRCohRJGL8hW6zs8d2JU4+LvqJuGSXNJTKpe9YjqtOToqCYKgaXJzVBkHtjMZjz3bdXn/4uk//j6mWY7tehjWyjY3n4mD4VwXSakv1n+/jX8EGAAI68BpoWbP4wAAAABJRU5ErkJggg==\') 0 0;\n\
}\n\
\n\
/**\n\
 * Link plugin\n\
 *\n\
 * @author Michael Robinson <michael@panmedia.co.nz>\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
/* line 20, mixins.scss */\n\
.raptor-ui-link-create .ui-icon, .raptor-ui-link-create.ui-state-hover .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAilBMVEX///8EBARUVFRUVFQEBARTU1MqKiwfHx5MTEzGxsZNTU1FRUWAgH8SEhJnZ2fd3d06Ojrg4ODIyMgODg4DAwMSEhLCwsGcnKXExNEvLy+ysrh+foMQEBBBQUEEBATJydeenqcDAwPT09OIiIjj4+OZmZl3d3fU1OPCwsHW1tXq6urr6+va2trGxsaRnmwcAAAAI3RSTlMAimdfRTOWgDXbAGXFj339cv3dAHtC3OP8bt+2cnuA/OMA+Akct2IAAABoSURBVHhetcVZFoIgGAbQ7wcVwyEKtBi01OZh/9urw2EJdV8ufkHmnDHG85RE2a7Wp812GGJtiaqvG1rOXws1dV9BzWKi2/3xfL1pErOCdT6YS2SCdxZdsdtfD8ci1UFnIxGNWUrjHz6V6QhqNdQf6wAAAABJRU5ErkJggg==\') 0 0;\n\
}\n\
\n\
/* line 20, mixins.scss */\n\
.raptor-ui-link-remove .ui-icon, .raptor-ui-link-remove.ui-state-hover .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAA2FBMVEX///8WFhYvLy9LS0sEBAQODg4EBARNTU0DAwNVVVVUVFQtLS1nZ2cfHx46OjoSEhLGxsZTU1OAgH/T09NUVFQEBAQ6OjpMTEwvLy+4uMDCwsEQEBCvr7sSEhIEBAR+foMqKixFRUUEBARDQ0MBAQEBAQG5ucQiIiICAgIODg7Z2dlAQEBMTEwsLCxGRkYAAABPT0/e3t4mJiYqKiopKSlUVFQiIiJJSUkjIyNFRUU5OTkBAQEoKCi/v8zCws+qgFWFZkY7MSbc3Nzj4+Pm5ubOztzU1OTQ0N6IE/7FAAAAQ3RSTlMAAAAAigAAAAAAZwB9gACP2zPF+F9ocjVu39xy40KAtpZlRQBrUPx9AIb8AE8AAAAA/AAAAAAAAAAAAAAA/PwAAAD8PWHlxQAAALtJREFUeF5dzsVWxEAQheHqpGPEPeMWGXfcmQHe/42oC+ewmH95F1UfGWFyhZLQUBHlTvBxOp92gZP/DaN25Esp/ag9ukeUxa5p6qbpxpmHqGgNOtWm6gxahaIokwX1ht16ps3q7rAn9utrg7RxX6Z6KvtjbWJZGHTuuLLtw8P2f/CAWd4uGYNBqCpj5s1NM2cMPd3xc2D4EDDkIWCmj1NgSEHAlGUJDAnEmOfPr+8XxtDr27sQwHDA0GU/2RcVwEV78WkAAAAASUVORK5CYII=\') 0 0;\n\
}\n\
\n\
/* Dialog */\n\
/* line 18, ../plugins/link/link.scss */\n\
.raptor-ui-link-create-panel .raptor-ui-link-create-menu {\n\
  height: 100%;\n\
  width: 200px;\n\
  float: left;\n\
  border-right: 1px dashed #D4D4D4;\n\
  display: -webkit-box;\n\
  display: -moz-box;\n\
  display: -ms-box;\n\
  display: box;\n\
  -webkit-box-orient: vertical;\n\
  -moz-box-orient: vertical;\n\
  -ms-box-orient: vertical;\n\
  box-orient: vertical;\n\
}\n\
/* line 27, ../plugins/link/link.scss */\n\
.raptor-ui-link-create-panel .raptor-ui-link-create-menu p {\n\
  font-weight: bold;\n\
  margin: 12px 0 8px;\n\
}\n\
/* line 31, ../plugins/link/link.scss */\n\
.raptor-ui-link-create-panel .raptor-ui-link-create-menu fieldset {\n\
  -webkit-box-flex: 2;\n\
  -moz-box-flex: 2;\n\
  -ms-box-flex: 2;\n\
  box-flex: 2;\n\
  margin: 2px 4px;\n\
  padding: 7px 4px;\n\
  font-size: 13px;\n\
}\n\
/* line 36, ../plugins/link/link.scss */\n\
.raptor-ui-link-create-panel .raptor-ui-link-create-menu fieldset label {\n\
  display: block;\n\
  margin-bottom: 10px;\n\
}\n\
/* line 39, ../plugins/link/link.scss */\n\
.raptor-ui-link-create-panel .raptor-ui-link-create-menu fieldset label span {\n\
  display: inline-block;\n\
  width: 150px;\n\
  font-size: 13px;\n\
  vertical-align: top;\n\
}\n\
\n\
/* line 50, ../plugins/link/link.scss */\n\
.raptor-ui-link-create-panel .raptor-ui-link-create-menu fieldset,\n\
.raptor-ui-link-create-panel .raptor-ui-link-create-wrap fieldset {\n\
  border: none;\n\
}\n\
\n\
/* line 54, ../plugins/link/link.scss */\n\
.raptor-ui-link-create-panel .raptor-ui-link-create-wrap {\n\
  margin-left: 200px;\n\
  padding-left: 20px;\n\
  min-height: 200px;\n\
  position: relative;\n\
}\n\
/* line 60, ../plugins/link/link.scss */\n\
.raptor-ui-link-create-panel .raptor-ui-link-create-wrap.raptor-ui-link-create-loading:after {\n\
  content: \'Loading...\';\n\
  position: absolute;\n\
  top: 60px;\n\
  left: 200px;\n\
  padding-left: 20px;\n\
}\n\
/* line 68, ../plugins/link/link.scss */\n\
.raptor-ui-link-create-panel .raptor-ui-link-create-wrap h2 {\n\
  margin: 10px 0 0;\n\
}\n\
/* line 71, ../plugins/link/link.scss */\n\
.raptor-ui-link-create-panel .raptor-ui-link-create-wrap fieldset {\n\
  margin: 2px 4px;\n\
  padding: 7px 4px;\n\
  font-size: 13px;\n\
}\n\
/* line 75, ../plugins/link/link.scss */\n\
.raptor-ui-link-create-panel .raptor-ui-link-create-wrap fieldset input[type=text] {\n\
  width: 300px;\n\
  padding: 5px;\n\
}\n\
/* line 80, ../plugins/link/link.scss */\n\
.raptor-ui-link-create-panel .raptor-ui-link-create-wrap fieldset input[type=text].raptor-external-href,\n\
.raptor-ui-link-create-panel .raptor-ui-link-create-wrap fieldset input[type=text].raptor-document-href {\n\
  width: 400px;\n\
}\n\
/* line 83, ../plugins/link/link.scss */\n\
.raptor-ui-link-create-panel .raptor-ui-link-create-wrap fieldset.raptor-email label {\n\
  display: inline-block;\n\
  width: 140px;\n\
}\n\
/* line 87, ../plugins/link/link.scss */\n\
.raptor-ui-link-create-panel .raptor-ui-link-create-wrap fieldset.raptor-email input {\n\
  width: 340px;\n\
}\n\
/* line 92, ../plugins/link/link.scss */\n\
.raptor-ui-link-create-panel .raptor-ui-link-create-wrap ol li {\n\
  list-style: decimal inside;\n\
}\n\
\n\
/* line 99, ../plugins/link/link.scss */\n\
.raptor-ui-link-create-panel .raptor-ui-link-create-wrap\n\
.raptor-ui-link-create-panel .raptor-ui-link-create-wrap fieldset #raptor-ui-link-create-external-target {\n\
  vertical-align: middle;\n\
}\n\
\n\
/* line 104, ../plugins/link/link.scss */\n\
.raptor-ui-link-create-error-message div {\n\
  padding: 0 .7em;\n\
}\n\
/* line 106, ../plugins/link/link.scss */\n\
.raptor-ui-link-create-error-message div p {\n\
  margin: 0;\n\
}\n\
/* line 108, ../plugins/link/link.scss */\n\
.raptor-ui-link-create-error-message div p .ui-icon {\n\
  margin-top: 2px;\n\
  float: left;\n\
  margin-right: 2px;\n\
}\n\
\n\
/**\n\
 * List plugin\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
/* line 20, mixins.scss */\n\
.raptor-ui-list-unordered .ui-icon, .raptor-ui-list-unordered.ui-state-hover .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAMlJREFUeNpi/P//PwNFAGQAIyNjGBCvgdIMxGKQXhaoORFlZWWBXV1dTED2KqjYGiBmRMJMaOwrQFwOc0EEEG+A0iS5gBFEMDExkeX9f//+MTAxUAhgBsQC8U4oTRKABWJ8Rkae84wZk5iB7MVQsW1IAYYLW8MCMRGID0Bp+gYiC46EhTPR4QrEdCA+A6VJT8pAcDMsLB3EuAniQP14BIiPAfEJID4FxGehqe8OED8B4vVgvVADioH4GZTGGWhYvUtpbqQ4JQIEGABjeFYu055ToAAAAABJRU5ErkJggg==\') 0 0;\n\
}\n\
\n\
/* line 20, mixins.scss */\n\
.raptor-ui-list-ordered .ui-icon, .raptor-ui-list-ordered.ui-state-hover .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAM1JREFUeNpi/P//PwNFAGQAIyNjIxCvAWJBIGYgFoP0skDNqQfidUDMiGT2GigfhpnQ2FeAuJwFSQMTmuNCiPEBTFMblF1CahAwgvzBxMREVvj9+/cP7oIuIN4Bpcl2gRMQJwFxDFRuG1KAYcVAF1jDojEBiGcAsQSp0QjzgiEQawLxSiibNoGInmqRE9J0IJaEYnNSXAAzYC4QNwJxIJLcEbRAYwZidiDmgOLTYPVIzgJpPgD2F45Aw+olqAFrgfg5EBeTagAjpdkZIMAAg/ZGwsH5qkAAAAAASUVORK5CYII=\') 0 0;\n\
}\n\
\n\
/**\n\
 * Paste plugin\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 * @author Michael Robinson <michael@panmedia.co.nz>\n\
 */\n\
/* line 10, ../plugins/paste/paste.scss */\n\
.raptor-plugin-paste-panel-tabs {\n\
  height: auto;\n\
  width: 100%;\n\
  display: -webkit-box;\n\
  display: -moz-box;\n\
  display: -ms-box;\n\
  display: box;\n\
  -webkit-box-orient: vertical;\n\
  -moz-box-orient: vertical;\n\
  -ms-box-orient: vertical;\n\
  box-orient: vertical;\n\
  -webkit-box-flex: 1;\n\
  -moz-box-flex: 1;\n\
  -ms-box-flex: 1;\n\
  box-flex: 1;\n\
}\n\
\n\
/* line 19, ../plugins/paste/paste.scss */\n\
.raptor-plugin-paste .ui-tabs a {\n\
  outline: none;\n\
}\n\
\n\
/* line 23, ../plugins/paste/paste.scss */\n\
.raptor-plugin-paste-panel-tabs > div {\n\
  overflow: auto;\n\
  display: -webkit-box;\n\
  display: -moz-box;\n\
  display: -ms-box;\n\
  display: box;\n\
  -webkit-box-flex: 1;\n\
  -moz-box-flex: 1;\n\
  -ms-box-flex: 1;\n\
  box-flex: 1;\n\
  -webkit-box-orient: vertical;\n\
  -moz-box-orient: vertical;\n\
  -ms-box-orient: vertical;\n\
  box-orient: vertical;\n\
  -webkit-box-sizing: border-box;\n\
  -moz-box-sizing: border-box;\n\
  box-sizing: border-box;\n\
  border: 1px solid #C2C2C2;\n\
  border-top: none;\n\
}\n\
\n\
/* line 35, ../plugins/paste/paste.scss */\n\
.raptor-plugin-paste-panel-tabs > div > textarea.raptor-plugin-paste-area {\n\
  -webkit-box-flex: 1;\n\
  -moz-box-flex: 1;\n\
  -ms-box-flex: 1;\n\
  box-flex: 1;\n\
  display: -webkit-box;\n\
  display: -moz-box;\n\
  display: -ms-box;\n\
  display: box;\n\
}\n\
\n\
/* line 41, ../plugins/paste/paste.scss */\n\
.raptor-plugin-paste-panel-tabs > div > textarea,\n\
.raptor-plugin-paste-panel-tabs > div > .raptor-plugin-paste-area {\n\
  border: none;\n\
  padding: 2px;\n\
}\n\
\n\
/* line 46, ../plugins/paste/paste.scss */\n\
.raptor-plugin-paste-dialog .ui-dialog-content {\n\
  display: -webkit-box !important;\n\
  display: -moz-box !important;\n\
  display: box !important;\n\
  width: 100% !important;\n\
  overflow: hidden;\n\
  -webkit-box-sizing: border-box;\n\
  -moz-box-sizing: border-box;\n\
  box-sizing: border-box;\n\
}\n\
\n\
/**\n\
 * Save plugin.\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
/* line 20, mixins.scss */\n\
.raptor-ui-save .ui-icon, .raptor-ui-save.ui-state-hover .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAVNJREFUeNqkU71ugzAQPowtwdAdqRLK3odg6161a+cukZonoGrElgWWDqhb16oP0AfoytStirows0QRMj/unQsohAQi5aTD5vju4/Pd2VBKwTnG6cEYe8bl6s73P09Jel8ur3H5ruv6CUiBYRgfQRAosnrCyQhLOZTLG1ImpYQSA1VVjf7dNE0gLOV0R6AXlAMSk4uiGCUQ6ITdJzDpz0SQTxAoxlqVZo+gLEuQyDxFwIQAwg4IiPV3vYbL2WyUgDBHFbxG0Um9t237sIIkSeDYYGHbur3neQMCTgqoRWEYDToh8NyLxSO4rgtpmrY14D0CUsA5h80mh/n8QQdXq7CTTN/ILMtqa9AjEDjOGrTdSnAcRwdpr1unzB5BMweiGwY8tx/H8U+WZbmUSoPJlfr3NrZLgDkXujbNXaD9DfoLAt8OFRHPfb8X+sLcW+Pc6/wnwABHMdnKf4KT4gAAAABJRU5ErkJggg==\') 0 0;\n\
}\n\
\n\
/**\n\
 * Snippet menu plugin.\n\
 *\n\
 * @author Melissa Richards <melissa@panmedia.co.nz>\n\
 */\n\
/* line 20, mixins.scss */\n\
.raptor-ui-snippet-menu .ui-icon, .raptor-ui-snippet-menu.ui-state-hover .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAUVBMVEX///8XODhUfn5PeXkwVVVUfn5JcXE5X19BaWkbPT2/0ND+///5/f3r9/fr+vry+vq2x8f+/v66y8vs9PTU5eXl9PT2+vrCcW7i7u6uv78zqiKT+FVrAAAACnRSTlMAgmdpd01sc29httCJoAAAAEhJREFUeF61yEcOgDAMBdFAup1GL/c/KOLLygngzW7UN+zYWQzNk2CN4dK9z+tbchihLqIGDJ+P8yJqRNljmLKJYjDi0EX1jwctjAPf3g65IAAAAABJRU5ErkJggg==\') 0 0;\n\
}\n\
\n\
/**\n\
 * Statistics plugin\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 * @author Micharl Robinson <michael@panmedia.co.nz>\n\
 */\n\
/* line 20, mixins.scss */\n\
.raptor-ui-statistics .ui-icon, .raptor-ui-statistics.ui-state-hover .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAhFJREFUeNrEk7tv01AUxr/4kcRO7Fh1HghFgSAeYglDlIfUbGEBhaWoUxFiQWJGMDDyhzB2ZmANYmAoIvQPaIHIkVJjKyWkcdzYSR1zbhSGQhFDB47007333PN9V/cVCcMQ5wkO54wIxe+5q8Rt4gaRW+VsYo9oE1/+ZpAktjKZzL1arXatWCzmFEVhOYzH40m327U7nc7nwWDwhlLbxITN8SsDVvisXq9vtVqtuqZp2XK5HDcMg5vNZlylUon7vq+XSqXLi8WiYJqmTvWfiNkvg8e06gMqLDmOI5AIvV4P8/l8CeuzHMHn8/kcmeiWZQWk6zCD67quP280GuXNdlv4qKrwTk6WwpXoFNVqNTKdTtf6/X7C87wPzOAhrX4nCIK195KEp4aBtxyHKRm4roujozGdwQSO49LYx/7+VzIPeVEUOcsyh+wab9Ge0+SKGW3nhSzj5WiEoWlhMvHolKOIRmVIkgpZVhGPKxAEGdlsIc20zOASz/NSs9lkl4IwJuOJH+CVksDi2APPx0iYIgNlCTNYXy8hmdQkpmUGCfag2u134DgJipKGdqGAR6NjbKdVOAMbQRAiRsaCEKMaHru7XdYutRw95R+Hh0NXVTNIpXQy0KDrOVy8chOb34Z4XcjCMvZoO86p12bbBy7Tsv5dYoc4OAtFFM3BxkZ4xtzOSvvPuE98X7V//oX//ht/CjAAagzmsnB4V5cAAAAASUVORK5CYII=\') 0 0;\n\
}\n\
\n\
/**\n\
 * Table plugin.\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
/* line 8, ../plugins/table/style/table-support.scss */\n\
.raptor-plugin-table-support-selected ::selection,\n\
.raptor-plugin-table-support-selected ::-moz-selection {\n\
  background: transparent;\n\
}\n\
\n\
/* line 12, ../plugins/table/style/table-support.scss */\n\
.raptor-plugin-table-support-cell-selected {\n\
  background-color: Highlight;\n\
}\n\
\n\
/**\n\
 * Table plugin.\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
/* line 6, ../plugins/table/style/table.scss */\n\
.raptor-ui-table-create-menu td {\n\
  width: 14px;\n\
  height: 14px;\n\
  border: 1px solid #000;\n\
}\n\
\n\
/* line 12, ../plugins/table/style/table.scss */\n\
.raptor-ui-table-create-menu .raptor-ui-table-create-menu-hover {\n\
  border: 1px solid #f00;\n\
}\n\
\n\
/* line 20, mixins.scss */\n\
.raptor-ui-table-create .ui-icon, .raptor-ui-table-create.ui-state-hover .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAA81BMVEX///9Vf38LKytAZ2cpTU0wVVU0WlpLc3NVf39TfX04Xl4YOjoNLS08Y2NRenpEa2tOd3dHb2/C09NEzP+8zc31+fn6/Pzx9/fu9fXA0dHF1tbD1NRDy/73/Pzp9vbk9PSG0uz+//+I7v/p+fk0vO/5/f38/v7u+Pg9xfj0+/tCyv3r9/fm9fXx+fm+z8/H2Ng4wPOF6/w6wvU2vvE1vfCE6vvM2tpkzvU/x/rO3d29zs7J2tr///88w/Z/5fZ94/R64PF43u/K2dni8/PM3NxByfzQ3t6D0OmBzueAzOV+y+R8yeJ6x+B5xt94xd7I2NiF0utdtcIgAAAAEnRSTlMAZodwend1a01nc4Flcmhuam1CIHuOAAAAuElEQVR4Xl3KRZbCQBQAwM9EcGuXOO5u4+52/9PQLytCrQsKuYwCFK8zilCLsTd82fdvlvPVuh3XoNHFyXCx6d/eze8f2t0G5DvY2/2/vX98fn3//Hby0PRxEjGmGJOMEb8J9QH2oqvZq0bb6SUZ1MGamEGpolRSSiYWVHvpOGj0aEavCqWRGZwrziXnZFQCN0jHs0Z/ZgQuOGMzhFBCSCHI2AE7TIfSSJoR2lBuPZ1olaFykVGBc0fWbx5/ckww/gAAAABJRU5ErkJggg==\') 0 0;\n\
}\n\
\n\
/* line 20, mixins.scss */\n\
.raptor-ui-table-insert-row .ui-icon, .raptor-ui-table-insert-row.ui-state-hover .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAeZJREFUeNqcU0FrE0EU/mYyIaRoaNOQJlGSbjy0FuxR8VIoUcGDN4X+gUJ/QA899dBf0V76CwTBS6EVIsVLBQ8hLdbiRgrRCKE2JmmTNtmZvre7WVBEGx+83fd23vfN997MiuerqxBCPAOQxvBWU8YYkGderq2tD4umzZeUdhyOhaHHkw+ATwitdeB/yt8XRkFYoRyPQGrDFAKP7whsfzbuW2tyWt62gYLFJJ6/qQBcT1ipnH7fVeD4BDu2QV51Yb6dwfBu5I+iBPyuIbTnnDsmBsIK1fcIfAXwdq52sDwTD3rdOzzEg+npIN8tlUhBFoSV6ufDL7j5LvuVFbxI9ICmgTWmcFyvB/Ow0mlUarUgTycS4HpXweVY25zet+cdkrbx6em1T6CY2vIUnLdaxxhpFZmRYtydu/dP8MfdsqvAJWienORudJPz9KFIMfZevb2WApeg1xNK1qMidmAt6EWDlcI+qEvkQx1YqhP0/LuzaV+BTJRmOMgx4+tGFJ34CMotIBOP49b4OG7TwJrtNrLJJHITE5hMpfCj0RgokOqi22XC0OAY+R4UIsBRtRrcPLaybf+Scz1hQ+qU+iaLhMNhbE61/Q6JAZm/zoDrCRsRsdlZ7muRmPPD/kxSyooYDOV/7UqAAQBguExUpw0RrAAAAABJRU5ErkJggg==\') 0 0;\n\
}\n\
\n\
/* line 20, mixins.scss */\n\
.raptor-ui-table-insert-column .ui-icon, .raptor-ui-table-insert-column.ui-state-hover .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAABFFBMVEX///8LKytVf39TfX08Y2NVf393rpBLc3NHb29Reno4Xl5Od3c0WlopTU1AZ2dEa2swVVUYOjoNLS0wt0BEzP+8zc3x9/fu9fUrsDmG0uxDy/4xuEHp9vYcnSbI6cu9zs71+fn6/PwgoisHgQozu0QorDXr9/cwt0Dp+fnu+Pg0vO8WlB38/v7+//8kpzD5/f3k9PTx+fmI7v/3/PxCyv0utD3m9fX0+/vi8/P///943u/I2dl4xd6w5/u/8/tAyPu67vau5fpS6mNf0PpayvS95PEr4zy54O2F6/zX5OTb5+cg4DHP3t7X4+PT4uJkzvVd7W4W3idG6Fdl7nbQ4OB5xt/M3Nzg9f055UrT4OA1vfCE0eoavkAQAAAAFHRSTlMAh2Znck0aa21oc2p1enBud4Fl4L/CnmUAAADNSURBVHheZcpFUgRBAAXRDy3jSkm7y7gL7u6u978HXWwggtzk5kFZFanpWqpmVwBp4ycncMQkoNAnxmzvaOft4Piz0y8ApR6ZzM53oyja3+z0SkBuSIy7rxPzyTx72R7mgPyUTHTfn9/PfZ9O80BtSQx961I71G5cuqwB1XEmPC9+jD2PjquA3BbiYvA++HBpWwaKSSYYC04DxmhSBMqWELf2lX3tUqsM1BeZ4Lz70OWcLupAZSTEcxiGry4dVYBGa/23VgNorvytiX99A3lfH44tztyBAAAAAElFTkSuQmCC\') 0 0;\n\
}\n\
\n\
/* line 20, mixins.scss */\n\
.raptor-ui-table-delete-row .ui-icon, .raptor-ui-table-delete-row.ui-state-hover .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAfhJREFUeNqcU0FrE0EU/mbdEHpQJA1tk0hs4iGttIgUKhVvsaIWL2L/QMHizYvnFvoLehEKgtScPemt5lTQkkICxVaKNAElJEKJhhib1N2Z8b3Z7EJFAvHBx74H833zvfdmxeLq6gMAMQweda31W1spFX+9trYxKPvRysoT/tpKSqEpuVMESNGARAP8q97NXgTzjICU0lKaJQTmrwhsHWnzVYogga0ykE2xiId8BeDzzPMEXFfInsC7skba7kLXfkHzbYTbQ0T8piCUB66lvgDmGQHXdXsO4N1c7eDZ1UjQa+HwEDcmJoJ6e2+PHCTBvDMOFqMODuoWUuEwvhwfB/NIxWKo1OtBHYtGweev7+zsKt+BJGvjD+cwv76Or5kZVO4t9N1AlXCtVHpOvoueACn+PDlBaXkZNwsFfKB8YXa2/x6npmZe5XLkwHFMC41WC3ObmzhoC5Pn8vn+r6hWK9q+Ax7i6fYRNjo20q0O7pILv+e/wZGgudxfWnqa2d9/b5ED08Kb5hCSiRB+Ow7ikQgSw8O4RANrtdtIjozg8ugoxsfG8L3ZNEOkd3Dr0+Qk7NNu95y/Rn4H2TDwuVoNXh7Hx3L5TG0cE8+s8UejEQ6FQniZafe6IwXE+/bP55nHuTg/Pf2YlNOD/kyWZVWEEC+EP5j/jT8CDADTO03xCBe9dwAAAABJRU5ErkJggg==\') 0 0;\n\
}\n\
\n\
/* line 20, mixins.scss */\n\
.raptor-ui-table-delete-column .ui-icon, .raptor-ui-table-delete-column.ui-state-hover .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAABJlBMVEX///9Vf38LKytEFBRRenowVVVEa2sYOjp6AABHb28pTU00WlpTfX0LKyuKAABVf39AZ2dOd3cIKCg8Y2NLc3MNLS04Xl5jVlZDYGBzAABEzP+8zc29zs76/Pz1+flDy/7u9fXx9/e3MDC7MzP+///M3NyI7v/8/v7x+fm4MTH0+/uqJiblxsahHx/u+PiG0uyyLCylIyPk9PS1Ly/3/Pz5/f00vO9Cyv2uKSnp+fnp9vacHBye4vzm9fXr9/fT4OD6Z2fI7PmF6/zX5OSiICDX4+PH6/j8bW2a5/RAyPua3vhkzvX4YGCE0er+c3PQ4OD2+vrzUlKJ0ut5xt94xd543u/xTEw1vfD1WVn///+O1/HvR0fI2dmh7vvb5+fH19f/d3fi8/OZ9EmDAAAAGnRSTlMAZocAaHdugZltenVnAMxNcGoAcmtlc0REzGDVx0oAAADWSURBVHheTcrDYgRBAIThSgZrZZnuMde2FdvW+79Eum/7H6ouHxJ7uyWA6NtuUUB0iD44m1qWdf7Sd0Qg5RNvsP6qbqunT30/BWR6RL+4el/dHt8/PPYyQKhLvIaq2ratqrQbAuQy0Ruf36Xf0pFCyzKQLDKhaZ3rjqbRYhJI17nYNE+aC4XW00BuzoRpDpdD06TzHBAZc+FWLis/Ch1HAGnGhGG0XluGQWcSEG5zcVO7q7kKbYeBwOiPN3mesB0FgOw+Lx//iBfYZ4HYAU8IHgYF9jH8A8JjJyK0AUFIAAAAAElFTkSuQmCC\') 0 0;\n\
}\n\
\n\
/* line 20, mixins.scss */\n\
.raptor-ui-table-merge-cells .ui-icon, .raptor-ui-table-merge-cells.ui-state-hover .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAA81BMVEX///9Vf38LKytOd3c8Y2NLc3MwVVUpTU0YOjoNLS1Vf39TfX04Xl5RenpEa2tAZ2c0WlpHb29EzP/6/Pzu9fXA0dH5/f3r9/eG0uzk9PTp+fk0vO/1+fnx9/e8zc3u+PhDy/7F1tb0+/tCyv3C09M4wPP8/v7i8/O+z8/m9fXx+flhg+n+//8nSbg5W9o9xfi9zs73/PyI7v8mSK3D1NRCZMjJ2trp9vbH2Ng1vfA2vvE/x/qF6/w8w/Y6wvV94/R64PF43u+E6vt/5fZByfyF0uuD0OmBzuf///+AzOV+y+R8yeJ6x+B5xt94xd5kzvXK2dmu5BAUAAAAEnRSTlMAZodqcmt3eoFlTWdzaG5wdW1C/rgCAAAAtklEQVR4Xl3Kw7rDUBRA4d0b1TgIjdq2dYn3f5qeL5k0/QdrtCCbSshC7j0hB4UOcoPLur/dVVdLo1MAroZGwebUP++rh6NR40CQkft3vd0/Pr++f35lASpDNFIx9jCmGNvDChR95KqzRTvmF6HUYodpTk2TsrZKwDvRMZ6E/43B2OEhr7DDsrqWRVmVPJTn0dGLzcsgNtlBiEcIJcRuiiBp0eFNQtoY2JoEab3+RE9D5i0hA68e7McfFiRaMwIAAAAASUVORK5CYII=\') 0 0;\n\
}\n\
\n\
/* line 20, mixins.scss */\n\
.raptor-ui-table-split-cells .ui-icon, .raptor-ui-table-split-cells.ui-state-hover .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAA8FBMVEX///9Vf38LKys8Y2MwVVU0WlpVf39TfX0YOjoNLS1Od3dAZ2dRenpEa2s4Xl5Lc3MpTU1Hb29EzP/6/Pzu9fXm9fW8zc35/f3k9PTp+fnu+Pjx9/f8/v7A0dH0+/tDy/7+///F1tY4wPOG0uz3/Pw9xfjp9vZCyv1CZMjx+fn1+fk0vO8mSK3r9/eI7v8nSbjJ2tqF0uuD0Ok1vfA2vvGAzOWBzuc/x/qF6/w8w/Y6wvV94/R64PF43u+E6vt/5fZByfzD1NTC09O+z8+9zs7///9hg+nH2Nji8/M5W9p+y+R8yeJ6x+B5xt94xd5kzvVtEZTHAAAAEnRSTlMAZodyd3VNZ4FlanBobnNrem0aKGmPAAAArUlEQVR4Xl3KRZLDMBQA0Z8xU0CSmR1mZoZhuv9t4rI2cV71soEv5PAgvOYIoEYobJ6W9fUmmU27kQqyhwbN1aF+3Ca7fdeToWSi8H88Wcy/vn9+/8wSVGpoUMU4xtjH2KhVQAtQWB29v1GBBko7PTqdFq2tAONkR49yGCj208N1h7R+EbhGdnxSDQ5YPT0IiQnxCTF0FspWdsTni3+9GVYZRPvjgS2C9JIjwbM7cpQh7ppJ8UgAAAAASUVORK5CYII=\') 0 0;\n\
}\n\
\n\
/**\n\
 * Tag menu plugin\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
/* line 20, mixins.scss */\n\
.raptor-ui-tag-menu .ui-icon, .raptor-ui-tag-menu.ui-state-hover .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAU5JREFUeNpi/P//PwMlgAVEMDExNQIpbRL1Xv337189C5Sj29zcHPjnzx+4LMhlQAVg/PfvXzgNwuzs7AxdXV1McBcAAfPv378Zbt68+XblypVHYYYUFxf7gTRMmDBhE0zM0tLSWl1dXRikB+x6ZK8ANZ8EUv5QzPLp0yeGz58/w+TB4sePHz/JxsYG1wNzwbWmpiYQex5y+Pz8+ZMBGsgsSOLzZs2aBeJfQ5YoxRbA379/B/sZzYC1UMyALoEOWH/+/AUMPLALWPFGIy4DQEHEyMhAvgGMjCxAAxiJMwBLimRjZgaFNiNIjg1dEmowJBqxaDYHYg6QARBDGDigYgzoFjJhcdUKUJLQ1TUVg6QVZgY9PTMxkBhUDtUlIJNgzoGCZ9HRWZIg8b9/QbbAXMcITGgzngMZUsiuwGbABiC2whFmx4A4AMMASgBAgAEAx96Jw4UbHlsAAAAASUVORK5CYII=\') 0 0;\n\
}\n\
\n\
/**\n\
 * Text alignment plugin\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
/* line 20, mixins.scss */\n\
.raptor-ui-align-left .ui-icon, .raptor-ui-align-left.ui-state-hover .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAItJREFUeNpi/P//PwMlgImBQsACN4mJqRFIaQExIxQzYWEzQfHlf//+lYL0McK8ADSAJJuBBqC6AAjWYrEN2VYPbAZR1QUb0WxEZmPD1lR3wTYCttpSJQxg6mE0sgt2E/AzCLMBMTsQcwCxAskuQE722FwwEYiNsNjKClR8EUjH4w2DActMFBsAEGAAnS84DrgEl1wAAAAASUVORK5CYII=\') 0 0;\n\
}\n\
\n\
/* line 20, mixins.scss */\n\
.raptor-ui-align-right .ui-icon, .raptor-ui-align-right.ui-state-hover .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAIxJREFUeNpi/P//PwMlgImBQsACN4mJqRFIaQExIxQzYWEzQfHlf//+lYL0McK8ADSAJJuBBqC6AAvYjGYrMhuEHanugo0EbETH1jQPg714bGcGYhOqu2A3AT+DMBvQQnYgzQHECiS7ADnZw9j4wmA61J+sQMUcUFtBtrMC8TEg9kNxwYBlJooNAAgwAJo0OAu5XKT8AAAAAElFTkSuQmCC\') 0 0;\n\
}\n\
\n\
/* line 20, mixins.scss */\n\
.raptor-ui-align-center .ui-icon, .raptor-ui-align-center.ui-state-hover .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAI1JREFUeNpi/P//PwMlgImBQsACN4mJqRFIaQExIxQzYWEzQfHlf//+lYL0McK8ADSAJJuBBqC6AAlswGErjO2KrJiqLtiIw0Zc2JpmYbCTgM2WFIUBTD2MRnbBbgI2gzAbELMDMQcQK5DsAuRkj80FMDAFiI2RbGUFKuaA2noGiEOwhsGAZSaKDQAIMAB/BzgOq8akNwAAAABJRU5ErkJggg==\') 0 0;\n\
}\n\
\n\
/* line 20, mixins.scss */\n\
.raptor-ui-align-justify .ui-icon, .raptor-ui-align-justify.ui-state-hover .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAJFJREFUeNpi/P//PwMlgImBQsACN4mJqRFIaQExIxQzYWEzQfHlf//+lYL0McK8ADSAJJuBBqC6AAjWYrEN2VZkNgg7Ut0FGwnYiI6tqe6CbUTYCsPMQGxCdRfsJsJmNqCF7ECaA4gVSHYBcrKHsZFdMBGIjbDYygpUzAG1FWQ7KxAfA2I/FBcMWGai2ACAAAMAvPA4C7ttvJ4AAAAASUVORK5CYII=\') 0 0;\n\
}\n\
\n\
/**\n\
 * Block quote plugin.\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
/* line 20, mixins.scss */\n\
.raptor-ui-text-block-quote .ui-icon, .raptor-ui-text-block-quote.ui-state-hover .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAGVJREFUeNpi/P//PwMlgImBQjAcDWBhYZEA4r1AHA/EKHxiXQBS+BKIF+LgEzTAG4h3I0UvOh+/AUCFbECcDmROA2lC5mMzgAWLGDuUtsTBJ+iFeUDMC6Wx8VEA42hSptwAgAADAO3wKLgntfGkAAAAAElFTkSuQmCC\') 0 0;\n\
}\n\
\n\
/**\n\
 * Bold text style plugin.\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
/* line 20, mixins.scss */\n\
.raptor-ui-text-bold .ui-icon, .raptor-ui-text-bold.ui-state-hover .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAKRJREFUeNpi/P//PwMlgImBQjDwBrCgmMbEpA2kGnGofQ3E9UD86t+/fzhdcBWIpwExMxQ3AHEIEK8BYgkgdsLrAih4A8SsaBYwQcWYiDGAEcmAbiwuJBiIIAPYoLgfiMuBeBmUXwHEXIQMYEIy4BUQXwDiy1C+HBBrEPKCDBCzwwwDpVRGRkZksU8ozkVOykCFVkBqOZ5oB3lpAoqe0bzAABBgANfuIyxmXKp/AAAAAElFTkSuQmCC\') 0 0;\n\
}\n\
\n\
/**\n\
 * Italic text style plugin.\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
/* line 20, mixins.scss */\n\
.raptor-ui-text-italic .ui-icon, .raptor-ui-text-italic.ui-state-hover .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAH1JREFUeNpi/P//PwMlgImBQjDwBrBgmMgEN1MbiBvRpOv//ft3FUUEFIjImJGRERnrAPF6IO6BiaGrZyLCi6xAvJDcMLAA4j9AfJlcA/yBeCe5sWAExAJAfIKkWIAFJBAUATE7kM+M143ooQoEVkD8EA1b4Yy10bzAABBgAC7mS5rTXrDAAAAAAElFTkSuQmCC\') 0 0;\n\
}\n\
\n\
/**\n\
 * Underline text style plugin.\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
/* line 20, mixins.scss */\n\
.raptor-ui-text-underline .ui-icon, .raptor-ui-text-underline.ui-state-hover .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAKZJREFUeNpi/P//PwMlgImBQkCxASwopjExhQGpMCSheijdiCz279+/q3AeKAxgmJGREYSdgHgdlIaJ6SCLIevB5oXXUJe9RhK7gkUMZxgwAjEzlEYG2MRwGsCKRTErKQawYFHMQqwBn6G2qSCJGULFPmPYhpwSgdEIY6YCcTKa2rlAPBvEAEYjdgNAUYRMowOYWmQ9LFjUPSGQP2RwemFoZiaAAAMAlEI7bVBRJkoAAAAASUVORK5CYII=\') 0 0;\n\
}\n\
\n\
/**\n\
 * strike text style plugin.\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
/* line 20, mixins.scss */\n\
.raptor-ui-text-strike .ui-icon, .raptor-ui-text-strike.ui-state-hover .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAL5JREFUeNpi/P//PwMlgImBQkCxASwopjHBzbMB4nQg5oTyrwKxNhAXAfGjf//+EXRBFhC/BOI0KAapYwZpxusCJPASquEdlD8FiHWwKWREjgUkL4gDcQ0QfwfiXqiBcIDsBXQD9hATcEADXOAckAEwzMjIiI4lgHgiEM8GYkmYOLIeXAZ4I2sA4vlQjGEArkBsAeJzQAUVYH8yMnIAKTmC6QAaHhpALALEPCBDoOJfgFQ5wVgYmnmBYgMAAgwAEGZWNyZpBykAAAAASUVORK5CYII=\') 0 0;\n\
}\n\
\n\
/**\n\
 * Font size plugin\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
/* line 20, mixins.scss */\n\
.raptor-ui-text-size-increase .ui-icon, .raptor-ui-text-size-increase.ui-state-hover .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAOhJREFUeNpi/P//PwMlgImBQkCxASxgU5gwzJkOpTORBZ2ilzO8+MjFwMIixnBhnTlOF8gD8U8gFoey4UBSyZooLzgD8Umo65xhgsYu5USHgS0QHwfiE1A2TtuxGaAIxL+B+AEQnwFiaagYg6Qi2AAHIP4PpbEa4AHEz4HYAIi/QL3hgSS/H4gfQmlELCAHNBBLQGlksenP7x9l4Bc3YMTnBRWogbZIuBOIZUFyW2b5EQwDVyA+giYPcionSA6U5Jc0yTK8vrUcVQU0L1gB8RMotkKSXoMkXgQT5BM3A+sDYcahn5kAAgwArro7Z1GYijsAAAAASUVORK5CYII=\') 0 0;\n\
}\n\
\n\
/* line 20, mixins.scss */\n\
.raptor-ui-text-size-decrease .ui-icon, .raptor-ui-text-size-decrease.ui-state-hover .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAKxJREFUeNpi/P//PwMlgImBQjAMDGBBMY0Jbp4JEFcAcQcQnwEJpLa/Zfj27SvD+fPnGVhYxBgurDPH6wI9IP4DpRmMXcpJ9oIZELcBcRiaOCjOH0BpnAYoAbE6EE8EYnYgtjq7pxMm5wjE8lAapwFOQLwFiIuB+AQ0PBi2zvYHUQeAmBFKYxoATJWWQOwLxJJAfA6I5YE4FyT+9O5hBiSXwAHjaFKm3ACAAAMA85o8WKYZErQAAAAASUVORK5CYII=\') 0 0;\n\
}\n\
\n\
/**\n\
 * Sub script text style plugin.\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
/* line 20, mixins.scss */\n\
.raptor-ui-text-sub .ui-icon, .raptor-ui-text-sub.ui-state-hover .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAKZJREFUeNpi/P//PwMlgImBQjDwBrDATWJCMWs6lM7Ep/nfv39YXSAPxL+AWALKJtkLLkB8EohZoWySDbAH4uNQQ+xJNUAJiH8DMT8QPwZiWagYDEwA4v1QGgJACQmEGRkZQTgXiI+i4VyoHAy7AfEaEBucCNEM2AzEKkiKu6BiYMuAdAYQLwZiKQwDgGAVED+E0iBgBeUjiy1HErMCWzyaFxgAAgwA5Gw9vTeiCqoAAAAASUVORK5CYII=\') 0 0;\n\
}\n\
\n\
/**\n\
 * Super script text style plugin.\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
/* line 20, mixins.scss */\n\
.raptor-ui-text-super .ui-icon, .raptor-ui-text-super.ui-state-hover .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAALdJREFUeNpi/P//PwMlgImBQjDwBrCgmMaEYt50KJ0JpRuBWBuIrwJx/b9///C6QB6IfwGxBJQNAvVAPAkqRtALLkB8EohZoWwQiAbiICCuI8YAeyA+DjXEHiqmD8SaQLwIysYMAyhQAuLfQMwPxI+B2AkqVkZsLHgDsQYQTwXiVCBmg4phB6CUCMOMjIwgvBmIVaBsEO6CijEgY5geFAOAYBUQP4TSIGAF5SOLoVjMOJoXGAACDACTRz3jjn6PnwAAAABJRU5ErkJggg==\') 0 0;\n\
}\n\
\n\
/**\n\
 * Basic text style plugin\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
/* line 9, ../plugins/tool-tip/tool-tip.scss */\n\
.raptor-layout [data-title]:after {\n\
  opacity: 0;\n\
  content: attr(data-title);\n\
  display: block;\n\
  position: absolute;\n\
  top: 100%;\n\
  font-size: 12px;\n\
  font-weight: normal;\n\
  color: white;\n\
  padding: 11px 16px 7px;\n\
  white-space: nowrap;\n\
  text-shadow: none;\n\
  overflow: visible;\n\
  -webkit-pointer-events: none;\n\
  -moz-pointer-events: none;\n\
  pointer-events: none;\n\
  -webkit-transition: opacity 0.23s;\n\
  -webkit-transition-delay: 0s;\n\
  -moz-transition: opacity 0.23s 0s;\n\
  -o-transition: opacity 0.23s 0s;\n\
  transition: opacity 0.23s 0s;\n\
  background: url(\'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4gPHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJncmFkIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgeDE9IjUwJSIgeTE9IjAlIiB4Mj0iNTAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSI1cHgiIHN0b3AtY29sb3I9InJnYmEoNDAsIDQwLCA0MCwgMCkiLz48c3RvcCBvZmZzZXQ9IjZweCIgc3RvcC1jb2xvcj0iIzI4MjgyOCIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzI4MjgyOCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHg9IjAiIHk9IjAiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JhZCkiIC8+PC9zdmc+IA==\'), url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAGAgMAAACKgJcSAAAADFBMVEUAAAAoKCgoKCgoKCj7f2xyAAAAA3RSTlMATLP00ibhAAAAJklEQVR4XgXAMRUAEBQF0GtSwK6KYrKpIIz5P4eBTcvSc808J/UBPj4IdoCAGiAAAAAASUVORK5CYII=\') no-repeat 10px 0;\n\
  background: -webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(5px, rgba(40, 40, 40, 0)), color-stop(6px, #282828), color-stop(100%, #282828)), url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAGAgMAAACKgJcSAAAADFBMVEUAAAAoKCgoKCgoKCj7f2xyAAAAA3RSTlMATLP00ibhAAAAJklEQVR4XgXAMRUAEBQF0GtSwK6KYrKpIIz5P4eBTcvSc808J/UBPj4IdoCAGiAAAAAASUVORK5CYII=\') no-repeat 10px 0;\n\
  background: -webkit-linear-gradient(rgba(40, 40, 40, 0) 5px, #282828 6px, #282828), url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAGAgMAAACKgJcSAAAADFBMVEUAAAAoKCgoKCgoKCj7f2xyAAAAA3RSTlMATLP00ibhAAAAJklEQVR4XgXAMRUAEBQF0GtSwK6KYrKpIIz5P4eBTcvSc808J/UBPj4IdoCAGiAAAAAASUVORK5CYII=\') no-repeat 10px 0;\n\
  background: -moz-linear-gradient(rgba(40, 40, 40, 0) 5px, #282828 6px, #282828), url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAGAgMAAACKgJcSAAAADFBMVEUAAAAoKCgoKCgoKCj7f2xyAAAAA3RSTlMATLP00ibhAAAAJklEQVR4XgXAMRUAEBQF0GtSwK6KYrKpIIz5P4eBTcvSc808J/UBPj4IdoCAGiAAAAAASUVORK5CYII=\') no-repeat 10px 0;\n\
  background: -o-linear-gradient(rgba(40, 40, 40, 0) 5px, #282828 6px, #282828), url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAGAgMAAACKgJcSAAAADFBMVEUAAAAoKCgoKCgoKCj7f2xyAAAAA3RSTlMATLP00ibhAAAAJklEQVR4XgXAMRUAEBQF0GtSwK6KYrKpIIz5P4eBTcvSc808J/UBPj4IdoCAGiAAAAAASUVORK5CYII=\') no-repeat 10px 0;\n\
  background: linear-gradient(rgba(40, 40, 40, 0) 5px, #282828 6px, #282828), url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAGAgMAAACKgJcSAAAADFBMVEUAAAAoKCgoKCgoKCj7f2xyAAAAA3RSTlMATLP00ibhAAAAJklEQVR4XgXAMRUAEBQF0GtSwK6KYrKpIIz5P4eBTcvSc808J/UBPj4IdoCAGiAAAAAASUVORK5CYII=\') no-repeat 10px 0;\n\
}\n\
\n\
/* line 30, ../plugins/tool-tip/tool-tip.scss */\n\
.raptor-layout [data-title]:hover:after {\n\
  opacity: 1;\n\
}\n\
\n\
/* line 34, ../plugins/tool-tip/tool-tip.scss */\n\
.raptor-layout .raptor-select-element {\n\
  position: relative;\n\
}\n\
\n\
/* line 38, ../plugins/tool-tip/tool-tip.scss */\n\
.raptor-layout .raptor-select-element:after {\n\
  background: url(\'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4gPHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJncmFkIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgeDE9IjUwJSIgeTE9IjAlIiB4Mj0iNTAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSI1cHgiIHN0b3AtY29sb3I9InJnYmEoNDAsIDQwLCA0MCwgMCkiLz48c3RvcCBvZmZzZXQ9IjZweCIgc3RvcC1jb2xvcj0iIzI4MjgyOCIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzI4MjgyOCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHg9IjAiIHk9IjAiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JhZCkiIC8+PC9zdmc+IA==\'), url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAGAgMAAACKgJcSAAAADFBMVEUAAAAoKCgoKCgoKCj7f2xyAAAAA3RSTlMATLP00ibhAAAAJklEQVR4XgXAMRUAEBQF0GtSwK6KYrKpIIz5P4eBTcvSc808J/UBPj4IdoCAGiAAAAAASUVORK5CYII=\') no-repeat 3px 0;\n\
  background: -webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(5px, rgba(40, 40, 40, 0)), color-stop(6px, #282828), color-stop(100%, #282828)), url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAGAgMAAACKgJcSAAAADFBMVEUAAAAoKCgoKCgoKCj7f2xyAAAAA3RSTlMATLP00ibhAAAAJklEQVR4XgXAMRUAEBQF0GtSwK6KYrKpIIz5P4eBTcvSc808J/UBPj4IdoCAGiAAAAAASUVORK5CYII=\') no-repeat 3px 0;\n\
  background: -webkit-linear-gradient(rgba(40, 40, 40, 0) 5px, #282828 6px, #282828), url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAGAgMAAACKgJcSAAAADFBMVEUAAAAoKCgoKCgoKCj7f2xyAAAAA3RSTlMATLP00ibhAAAAJklEQVR4XgXAMRUAEBQF0GtSwK6KYrKpIIz5P4eBTcvSc808J/UBPj4IdoCAGiAAAAAASUVORK5CYII=\') no-repeat 3px 0;\n\
  background: -moz-linear-gradient(rgba(40, 40, 40, 0) 5px, #282828 6px, #282828), url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAGAgMAAACKgJcSAAAADFBMVEUAAAAoKCgoKCgoKCj7f2xyAAAAA3RSTlMATLP00ibhAAAAJklEQVR4XgXAMRUAEBQF0GtSwK6KYrKpIIz5P4eBTcvSc808J/UBPj4IdoCAGiAAAAAASUVORK5CYII=\') no-repeat 3px 0;\n\
  background: -o-linear-gradient(rgba(40, 40, 40, 0) 5px, #282828 6px, #282828), url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAGAgMAAACKgJcSAAAADFBMVEUAAAAoKCgoKCgoKCj7f2xyAAAAA3RSTlMATLP00ibhAAAAJklEQVR4XgXAMRUAEBQF0GtSwK6KYrKpIIz5P4eBTcvSc808J/UBPj4IdoCAGiAAAAAASUVORK5CYII=\') no-repeat 3px 0;\n\
  background: linear-gradient(rgba(40, 40, 40, 0) 5px, #282828 6px, #282828), url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAGAgMAAACKgJcSAAAADFBMVEUAAAAoKCgoKCgoKCj7f2xyAAAAA3RSTlMATLP00ibhAAAAJklEQVR4XgXAMRUAEBQF0GtSwK6KYrKpIIz5P4eBTcvSc808J/UBPj4IdoCAGiAAAAAASUVORK5CYII=\') no-repeat 3px 0;\n\
}\n\
\n\
/**\n\
 * Unsaved edit warning plugin\n\
 *\n\
 * @author Michael Robinson <michael@panmedia.co.nz>\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
/* line 11, ../plugins/unsaved-edit-warning/unsaved-edit-warning.scss */\n\
.raptor-plugin-unsaved-edit-warning {\n\
  position: fixed;\n\
  bottom: 0;\n\
  right: 0;\n\
  height: 30px;\n\
  line-height: 30px;\n\
  border: 1px solid #D4D4D4;\n\
  padding-right: 7px;\n\
  background: url(\'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4gPHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJncmFkIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgeDE9IjUwJSIgeTE9IjAlIiB4Mj0iNTAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2ZmZmZmMiIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2VkZWNiZCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHg9IjAiIHk9IjAiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JhZCkiIC8+PC9zdmc+IA==\');\n\
  background: -webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(0%, #fffff2), color-stop(100%, #edecbd));\n\
  background: -webkit-linear-gradient(top, #fffff2, #edecbd);\n\
  background: -moz-linear-gradient(top, #fffff2, #edecbd);\n\
  background: -o-linear-gradient(top, #fffff2, #edecbd);\n\
  background: linear-gradient(top, #fffff2, #edecbd);\n\
  -webkit-transition: opacity 0.5s;\n\
  -moz-transition: opacity 0.5s;\n\
  -o-transition: opacity 0.5s;\n\
  transition: opacity 0.5s;\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=0);\n\
  opacity: 0;\n\
}\n\
/* line 23, ../plugins/unsaved-edit-warning/unsaved-edit-warning.scss */\n\
.raptor-plugin-unsaved-edit-warning .ui-icon {\n\
  display: inline-block;\n\
  float: left;\n\
  margin: 8px 5px 0 5px;\n\
}\n\
\n\
/* line 30, ../plugins/unsaved-edit-warning/unsaved-edit-warning.scss */\n\
.raptor-plugin-unsaved-edit-warning-visible {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=100);\n\
  opacity: 1;\n\
}\n\
\n\
/* line 34, ../plugins/unsaved-edit-warning/unsaved-edit-warning.scss */\n\
.raptor-plugin-unsaved-edit-warning-dirty {\n\
  outline: 1px dotted #aaa;\n\
  background-image: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoAQMAAAC2MCouAAAABlBMVEUAAACfn5/FQV4CAAAAAnRSTlMAG/z2BNQAAABPSURBVHhexc2xEYAgEAXRdQwILYFSKA1LsxRKIDRwOG8LMDb9++aO8tAvjps4qXMLaGNf5JglxyyEhWVBXpAfyCvyhrwjD74OySfy8dffFyMcWadc9txXAAAAAElFTkSuQmCC\') !important;\n\
}\n\
\n\
/**\n\
 * View source plugin\n\
 *\n\
 * @author Michael Robinson <michael@panmedia.co.nz>\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
/* line 20, mixins.scss */\n\
.raptor-ui-view-source .ui-icon, .raptor-ui-view-source.ui-state-hover .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAKtJREFUeNpi/P//PwMlgImBQkCxAQwgLzAyMqLjMCCehsSfBhVDUQf2PhYDIoB4JhCLIYmJQcUiCBkQBcRzgFgci6vEoXJRuAyIAeIFODQjG7IAqhbFAAMg3gOlGQhguFp0FyQC8UoglgTx0QFUjSRUTSKuMEgG4nUghVgMkITKJROKhXQg3gbUI42kXxokBpUjGI0gDYVAfBzJABC7EFs6YBz6eYFiAwACDAADJlDtLE22CAAAAABJRU5ErkJggg==\') 0 0;\n\
}\n\
\n\
/* line 14, ../plugins/view-source/view-source.scss */\n\
.raptor-ui-view-source-dialog .ui-dialog-content {\n\
  overflow: visible;\n\
}\n\
\n\
/* line 18, ../plugins/view-source/view-source.scss */\n\
.raptor-ui-view-source-inner-wrapper {\n\
  width: 100%;\n\
  height: 100%;\n\
  display: -webkit-box;\n\
  display: -moz-box;\n\
  display: -ms-box;\n\
  display: box;\n\
  -webkit-box-orient: vertical;\n\
  -moz-box-orient: vertical;\n\
  -ms-box-orient: vertical;\n\
  box-orient: vertical;\n\
}\n\
\n\
/* line 25, ../plugins/view-source/view-source.scss */\n\
.raptor-ui-view-source-dialog textarea {\n\
  width: 100%;\n\
  height: 100%;\n\
  -webkit-box-flex: 1;\n\
  -moz-box-flex: 1;\n\
  -ms-box-flex: 1;\n\
  box-flex: 1;\n\
}\n\
\n\
/**\n\
 * Special Characters plugin\n\
 *\n\
 * @author Michael Robinson <michael@panmedia.co.nz>\n\
 */\n\
/* line 20, mixins.scss */\n\
.raptor-ui-special-characters .ui-icon, .raptor-ui-special-characters.ui-state-hover .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAANRJREFUeNrUkz0KAjEQhZNFUAtxt9B7WC1Y2e45rDyAp1ms9yZrKXgD27VYsRELs76BF0nY+AOpHPhg5k3mEYZEd12nYiJRkRFtMPDcEs9vDGbMz+BmG8aYsAEjBWuwoIni8AHswMU7LUu0aK2FLSjBnLViXrLnzYR2kIMjaBytoZb/ssQryAJ6xt5XgwosQeFoBbWqdzqwA2EFaqeuqamPO6C4QdqCkdOSvJVe7+W6bogp2IMTmRBbSy/1bu064npiMHzzPiQe4I6Z11vQ//+ZngIMAFDvbrCjwfedAAAAAElFTkSuQmCC\') 0 0;\n\
}\n\
\n\
/**\n\
 * Logo plugin\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
/* line 8, ../plugins/logo/logo.scss */\n\
.raptor-ui-logo {\n\
  border: none !important;\n\
  background: transparent !important;\n\
  -webkit-box-shadow: none !important;\n\
  -moz-box-shadow: none !important;\n\
  box-shadow: none !important;\n\
}\n\
\n\
/* line 14, ../plugins/logo/logo.scss */\n\
.raptor-ui-logo .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACMAAAAjCAYAAAAe2bNZAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyRpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoTWFjaW50b3NoKSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDoyNjE5MjlDMjdFRkUxMUUyOUY4RjkzODc5OEQ0RTRCQyIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDoyNjE5MjlDMzdFRkUxMUUyOUY4RjkzODc5OEQ0RTRCQyI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOkIyNDkzQTBGN0RDQjExRTI5RjhGOTM4Nzk4RDRFNEJDIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOkIyNDkzQTEwN0RDQjExRTI5RjhGOTM4Nzk4RDRFNEJDIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+fRcgAAAABzFJREFUeNrsVwtQ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\') 0 0;\n\
  background-repeat: no-repeat;\n\
  width: 35px !important;\n\
  height: 35px !important;\n\
  left: 0 !important;\n\
  top: 0 !important;\n\
  margin: 0 !important;\n\
  padding: 0 !important;\n\
}\n\
\n\
                /* End of file: temp/default/src/style/raptor.css */\n\
            </style>');
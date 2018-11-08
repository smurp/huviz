
var jsoutline = {
  squelch: false,
  verbose: true,
  showClassName: true,
  showObjectClass: true,
  collapsed: false,
  nativeCodeEx: /\[native code\]/,
  tracing: [],
  classes: {},
  traceMe: function(func, methodName, className) {
    var traceOn = function() {
      if (jsoutline.squelch) {
        return func.apply(this, arguments);
      } else {
	if (!jsoutline.showObjectClass && className == 'Object') {
	  className = '';
        }
        var label = ""
        if (jsoutline.showClassName && className) {
	  label = className + ".";
	}
        label += methodName;
        var startTime = new Date();
        var groupName = label ; //+ '(' + Array.prototype.slice.call(arguments).join(', ') + ')';
        var groupMeth = jsoutline.collapsed ? console.groupCollapsed : console.group;
        var groupArgs = [groupName+"("];
        if (arguments.length) {
          groupArgs[1] = arguments;
          groupArgs[2] = ")";
        } else {
          groupArgs[0]+=")";
        }
        groupMeth.apply(console, groupArgs);  // call console.group() or .groupCollapse()
        var result = func.apply(this, arguments);
        console.log(result, "(" + (new Date() - startTime) + " ms)");
        console.groupEnd()
        return result;
      }
    }
    traceOn.traceOff = func;
    for (var prop in func) {
      traceOn[prop] = func[prop];
    }
    //this.verbose && console.info("tracing", methodName);
    return traceOn;
  },
 
  traceAll: function(root, recurse, skipList, defaultName) {
    if ((root == window) || 
        (root == null) ||
        (root.traceOff) ||
        (root.name == 'ctor') ||
        (typeof root == undefined) ||
        !((typeof root == 'object') || (typeof root == 'function'))) {
	//console.error("AVOIDING",root);
      return;
    }
    if (typeof skipList == 'undefined') {
      skipList = [];
    }
    var rootName;
    if (root) {
      if (root.name) {
        rootName = root.name;
      } else if (root.constructor && root.constructor.name) {
        rootName = root.constructor.name;
        rootConstructorName = rootName;
      }
    }
    if (!rootName) {
	rootName = defaultName;
    }
    if (defaultName == 'Function') {
	return;
    }
    this.verbose && console.group("traceAll(" + rootName + ")", arguments); //typeof root, root);
    var tracingMethods = new Array();
    var skippingMethods = new Array();
    var self = this;
    var theRoot = root;

    for (var key in theRoot) {
        if (skipList.indexOf(key) > -1) { 
          skippingMethods.push(key);
          continue;
        }
        if (["ctor","traceAll","traceOff","traceOn","untraceAll"].indexOf(key) > -1) {
            console.log("SKIPPING",key);
            continue;
        }
        if ((theRoot.hasOwnProperty(key)) && 
            (theRoot[key] != theRoot)) {
          var thisObj = theRoot[key];
          if (!thisObj) {
	      continue;
	  }
          if (typeof thisObj == 'function') {
            if ((self != theRoot) && 
                !thisObj.traceOff && 
                !self.nativeCodeEx.test(thisObj)) {
              tracingMethods.push(key);
              theRoot[key] = self.traceMe(theRoot[key], key, rootName);
              self.tracing.push({obj:theRoot,methodName:key,rootName: rootName});
              if (key == 'constructor') {
		self.traceAll(thisObj, true, skipList); //, rootName);
	      }
            }
	  } else {
            if (!thisObj.traceOff) {
	      recurse && self.traceAll(thisObj, true, skipList); //, rootName);
	    }
          }
        }
    }

    if (theRoot && theRoot.prototype && !theRoot.traceOff) {
      self.traceAll(theRoot.prototype, true, skipList, rootName);
    }

    if (rootName) {
      if (!this.classes[rootName]) {
	  this.classes[rootName] = {tracing: {}, skipping: {}};
      }
      for (i in tracingMethods) {
	  this.classes[rootName]['tracing'][tracingMethods[i]] = true;
      }
      for (i in skippingMethods) {
	  this.classes[rootName]['skipping'][skippingMethods[i]] = true;
      }
    }

    if (tracingMethods.length > 0){
	this.verbose && console.log("tracing", tracingMethods);
    } 
    if (skippingMethods.length > 0){
	this.verbose && console.log("skipping", skippingMethods);
    } 
    this.verbose && console.groupEnd();
    return;
  },
  
  untraceAll: function() {
    for (var i=0; i<this.tracing.length; ++i) {
      var thisTracing = this.tracing[i];
      thisTracing.obj[thisTracing.methodName] =
          thisTracing.obj[thisTracing.methodName].traceOff;
    }
    console.info("tracing disabled");
    this.tracing = [];
  },
  
  traces: function(className) {
	if (this.classes[className]) {
            retval = Object.keys(this.classes[className].tracing);
	    retval.sort();
	    return retval;
	} else {
	    return [];
	}
  },

  asExpected: function(expected, classes, verbose) {
      var arraysEqual = function(a, b) {
        if (a === b) return true;
        if (a == null || b == null) return false;
        if (a.length != b.length) return false;
        for (var i = 0; i < a.length; ++i) {
          if (a[i] !== b[i]) return false;
        }
        return true;
      }

      for (var className_i in classes) {
	  var className = classes[className_i];
	  if (!expected.hasOwnProperty(className)) {
	      continue;
	  }
	  var expectedMethods = expected[className];
	  var actual = this.traces(className);
	  if (!arraysEqual(actual, expectedMethods)) {
	      console.error(className, actual, "<>", expectedMethods)
		  console.log(this.classes);
	      return false;
	  } else {
	      if (verbose) console.log(className,actual,"==",expectedMethods);
	  }
      }
      return true;
  }

}

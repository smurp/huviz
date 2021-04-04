(function() {
  /*
    This is currently NOT IN USE.

    It is a start on a proper parser for the command language for HuViz.

    Select every Thing except Penguin .
    Activate Person .
    Wander and Label NationalHeritage .
    Select GeographicHeritage .
    Draw Selected regarding relocatesTo .
    Walk Ethnicity .
   */

  var InputStream = function(input) {
    // copied from http://lisperator.net/pltut/parser/input-stream
    // usage:
    //     var stream = InputStream(string)
    var pos = 0, line = 1, col = 0;
    return {
      next  : next,
      peek  : peek,
      eof   : eof,
      croak : croak,
    };
    function next() {
      var ch = input.charAt(pos++);
      if (ch == "\n") line++, col = 0; else col++;
      return ch;
    }
    function peek() {
      return input.charAt(pos);
    }
    function eof() {
      return peek() == "";
    }
    function croak(msg) {
      throw new Error(msg + " (" + line + ":" + col + ")");
    }
  };

  var TokenStream = function(input) {
    // based on http://lisperator.net/pltut/parser/token-stream
    var current = null;
    //window.current = null
    var reserved = "with let ";
    // TODO Probably want to pass the builtins in as an argument
    var verbs = " " +
        "Choose Unchoose " +
        "Activate Deactivate " +
        "Select Unselect " +
        "Label Unlabel " +
        "Shelve Hide " +
        "Discard Retrieve " +
        "Pin Unpin " +
        "Wander Walk " +
        "Draw ";
    var connectors = " every except regarding and ";
    var sets = " Activated Chosen Graphed Hidden Labelled Nameless Pinned Selected Shelved ";
    var keywords = verbs + connectors + sets;
    //var keywords = " true false t f "; // + reserved + builtins;
    return {
      next  : next,
      peek  : peek,
      eof   : eof,
      croak : input.croak
    };

    function is_keyword(x) {
      return keywords.indexOf(" " + x + " ") >= 0;
    }
    function is_set(x) {
      return sets.indexOf(" " + x + " ") >= 0 && 'set';
    }
    function is_verb(x) {
      return verbs.indexOf(" " + x + " ") >= 0 && 'verb';
    }
    function is_connector(x) {
      return connectors.indexOf(" " + x + " ") >= 0 && 'connector';
    }
    /*
    function is_noun(x) {
      return is_set(x) || is_
    }
    */
    function is_digit(ch) {
      return /[0-9]/i.test(ch);
    }
    function is_id_start(ch) {
      return /[a-zA-Z]/i.test(ch);
    }
    function is_id(ch) {
      // Verbs, Sets, connectors and CURIEs may contain _
      return is_id_start(ch) || "_".indexOf(ch) >= 0;
    }
    function is_punc(ch) {
      // What about ; ?  Isn't ; what is being used to delimit commands in the URL?
      return ",.;".indexOf(ch) >= 0;
    }
    function is_whitespace(ch) {
      // How is the + sign in the URL version being handled? Gasp, outside of this parser?!!!?
      return " \t\n".indexOf(ch) >= 0;
    }
    function read_while(predicate) {
      var str = "";
      while (!input.eof() && predicate(input.peek()))
	str += input.next();
      return str;
    }
    function read_number() {
      /*
        At this point the GVCL does not seem to need numbers!
      */
      var has_dot = false;
      var number = read_while(function(ch){
	if (ch == ".") {
	  if (has_dot) return false;
	  has_dot = true;
	  return true;
	}
	return is_digit(ch);
      });
      // TODO test for negative number support
      return { type: "num", value: parseFloat(number) };
    }
    function read_ident() {
      var id = read_while(is_id);
      console.log('id:',id)
      return {
	// FormURLa needs builtins (above, beside, graph, table)
	// and (maybe!) keyword parameters, but not "var"
	// unless and until something like "with" or "let" are
	// implemented.
	type  : is_verb(id) || is_connector(id) || is_set(id) || "var",
	value : id
      };
    }
    function read_escaped(end) {
      var escaped = false, str = "";
      input.next();
      while (!input.eof()) {
	var ch = input.next();
	if (escaped) {
	  str += ch;
	  escaped = false;
	} else if (ch == "\\") {
	  escaped = true;
	} else if (ch == end) {
	  break;
	} else {
	  str += ch;
	}
      }
      return str;
    }
    function read_string() {
      return { type: "str", value: read_escaped('"') };
    }
    function skip_comment() {
      // Use Guillemet or "Latin quotation marks" for comments.
      //    https://en.wikipedia.org/wiki/Guillemet
      //        «comments␠go␠here»
      //
      // Consider the use of ␠ ie U+2420 "SYMBOL FOR SPACE" as
      // a space character in comments because it reads fairly well
      // as a space and does not get translated into %20 as all the
      // invisible Unicode space characters seem to:
      //    https://www.cs.tut.fi/~jkorpela/chars/spaces.html
      // Here is an example of a FormURLa with such a comment:
      //   print("hello, world"«this␠comment␠has␠some␠(weird!)␠spaces␠in␠it»)
      read_while(function(ch){ return ch != "»" });
      input.next();
    }
    function read_next() {
      read_while(is_whitespace);
      if (input.eof()) return null;
      var ch = input.peek();
      if (ch == "«") {  // left pointing double angle quotation mark
	skip_comment();
	return read_next();
      }
      if (ch == '"') return read_string();
      if (is_id_start(ch)) return read_ident();
      if (is_punc(ch)) return {
	type  : "punc",
	value : input.next()
      };
      input.croak("Can't handle character: «"+ch+"»");
    }
    function peek() {
      return current || (current = read_next());
    }
    function next() {
      var tok = current;
      current = null;
      return tok || read_next();
    }
    function eof() {
      return peek() == null;
    }
  };

  var FALSE = { type: "bool", value: false };
  function parse(input) {
    // based on http://lisperator.net/pltut/parser/the-parser
    var PRECEDENCE = {
      // NONE OF THIS IS IN USE in GVCL
      "=": 1,
      "||": 2,
      "&&": 3,
      "<": 7, ">": 7, "<=": 7, ">=": 7, "==": 7, "!=": 7,
      "+": 10, "-": 10,
      "*": 20, "/": 20, "%": 20,
    };
    return parse_toplevel();
    function is_punc(ch) {
      var tok = input.peek();
      return tok && tok.type == "punc" && (!ch || tok.value == ch) && tok;
    }
    function is_kw(kw) {
      var tok = input.peek();
      return tok && tok.type == "kw" && (!kw || tok.value == kw) && tok;
    }
    function is_op(op) {
      var tok = input.peek();
      return tok && tok.type == "op" && (!op || tok.value == op) && tok;
    }
    function skip_punc(ch) {
      if (is_punc(ch)) input.next();
      else input.croak("Expecting punctuation: \"" + ch + "\"");
    }
    function skip_kw(kw) {
      if (is_kw(kw)) input.next();
      else input.croak("Expecting keyword: \"" + kw + "\"");
    }
    function skip_op(op) {
      if (is_op(op)) input.next();
      else input.croak("Expecting operator: \"" + op + "\"");
    }
    function unexpected() {
      input.croak("Unexpected token: " + JSON.stringify(input.peek()));
    }
    function maybe_binary(left, my_prec) {
      var tok = is_op();
      if (tok) {
	var his_prec = PRECEDENCE[tok.value];
	if (his_prec > my_prec) {
	  input.next();
	  return maybe_binary({
	    type     : tok.value == "=" ? "assign" : "binary",
	    operator : tok.value,
	    left     : left,
	    right    : maybe_binary(parse_atom(), his_prec)
	  }, my_prec);
	}
      }
      return left;
    }
    function delimited(start, stop, separator, parser) {
      var a = [], first = true;
      while (!input.eof()) {
	if (is_punc(stop)) break;
	if (first) first = false; else skip_punc(separator);
	if (is_punc(stop)) break;
	a.push(parser());
      }
      return a;
    }
    function is_part_of_speech_or_and(x, pos) {
      console.log('x:', x)
      return (x.type == pos || x.value == 'and' || false);
    }
    function parse_anglicised(member_parser, pos) {
      /*
        Consume 'anglicised' lists like:
          * "one"
          * "one and two"
          * "one, two and three"
       */
      var a = [], first = true;
      var next_input = input.peek();
      while (!input.eof() && (is_part_of_speech_or_and(next_input, pos))) {
	if (is_punc(input.peek())) skip_punc(',');
	if (first) first = false; else skip_punc(',');
	a.push(member_parser());
        next_input = input.peek();
      }
      return a;
    }
    function parse_verb_phrase() {
      return {
        type: 'verb_phrase',
        args: parse_anglicised(parse_verb, 'verb')
      }
    }
    function parse_noun_phrase() {
      return {
        type: 'noun_phrase',
        args: parse_anglicised(parse_noun, 'noun')
      }
    }
    function parse_call(func) {
      return {
	type: "call",
	func: func,
	args: delimited("(", ")", ",", parse_expression),
      };
    }
    function parse_verb() {
      var name = input.next();
      console.log('parse_verb:', name)
      if (name.type != "verb") input.croak("Expecting verb name");
      return name.value;
    }
    function parse_noun() {
      var name = input.next();
      console.log('parse_noun:', name)
      if (name.type != "noun") input.croak("Expecting noun name, got " + JSON.stringify(name));
      return name.value;
    }
    function parse_varname() {
      var name = input.next();
      if (name.type != "var") input.croak("Expecting variable name");
      return name.value;
    }
    function maybe_command(expr) {
      expr = expr();
      return parse_call(expr);
    }
    function parse_atom() {
      return maybe_command(function(){
	if (is_punc("(")) {
	  input.next();
	  var exp = parse_expression();
	  skip_punc(")");
	  return exp;
	}
	/*
	  if (is_punc("{")) return parse_prog();
	  input.next();
	  }
	*/
	var tok = input.next();
	if (tok.type == "var" || tok.type == "num" || tok.type == "str") {
	  return tok;
        }
	unexpected();
      });
    }
    function parse_toplevel() {
      var prog = [];
      while (!input.eof()) {
	prog.push(parse_command());
	// console.log("latest:",prog[prog.length-1]);
      }
      return { type: "prog", prog: prog };
    }
    function parse_prog() {
      var prog = delimited("{", "}", ";", parse_expression);
      if (prog.length == 0) return FALSE;
      if (prog.length == 1) return prog[0];
      return { type: "prog", prog: prog };
    }
    function parse_command() {
      var cmd = {};
      cmd.verb_phrase = parse_verb_phrase();
      cmd.noun_phrase = parse_noun_phrase();
      console.log(JSON.stringify(cmd));
      skip_punc(".");
      return cmd;
    }
  }

  var GVCL = (function() {
    function GVCL(aScript) {
      this.aScript = aScript;
      this.ast = parse(TokenStream(InputStream(aScript)))
    }
    return GVCL;

  })();

  var EXPORTS_OR_THIS = (
    typeof exports !== "undefined" && exports !== null ? exports : this);
  EXPORTS_OR_THIS.GVCL = GVCL;
}).call(this);

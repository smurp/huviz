// http://techslides.com/html5-web-workers-for-ajax-requests/
function load(url, callback) {
	var xhr;

	if(typeof XMLHttpRequest !== 'undefined') xhr = new XMLHttpRequest();
	else {
		var versions = ["MSXML2.XmlHttp.5.0",
			 	"MSXML2.XmlHttp.4.0",
			 	"MSXML2.XmlHttp.3.0",
			 	"MSXML2.XmlHttp.2.0",
			 	"Microsoft.XmlHttp"]

		for(var i = 0, len = versions.length; i < len; i++) {
		try {
			xhr = new ActiveXObject(versions[i]);
			break;
		}
			catch(e){}
		} // end for
	}

	xhr.onreadystatechange = ensureReadiness;

	function ensureReadiness() {
		if(xhr.readyState < 4) {
			return;
		}

		if(xhr.status !== 200) {
			return;
		}

		// all is well
		if(xhr.readyState === 4) {
			callback(xhr);
		}
	}

	xhr.open('GET', url, true);
	xhr.send('');
}

function linearize(streamoid) {
    if (streamoid.idx == 0) {
	self.postMessage({event:'start',numLines:numLines});
    }
    //console.log('--------- '+streamoid.idx+" "+streamoid.data.length);
    if (streamoid.idx == streamoid.data.length - 1){
	self.postMessage({event:'finish'});
    } else {
	var i = streamoid.idx + 1;
	l = 0;
	while (streamoid.data[i] != '\n'){
	    l++;
	    i++;
	}
	var line = streamoid.data.substr(streamoid.idx,l+1).trim(); // beware ObiWan l+1
	self.postMessage({event:'line',line:line});
	streamoid.idx = i;
	setTimeout(function(){linearize(streamoid)},0);
    }
}

function lineCount( text ) {
		var nLines = 0;
		for( var i = 0, n = text.length;  i < n;  ++i ) {
		    if( text[i] === '\n' ) {
		        ++nLines;
		    }
		 }
		return nLines;
}

self.addEventListener('message',function(e){
   //console.log("e.data.uri: "+e.data.uri);
   load(e.data.uri, function(xhr) {
	   //console.log("raw",xhr.responseText.length);
		 numLines = lineCount(xhr.responseText);
	   linearize({data:xhr.responseText,idx:0,numLines:numLines});
       });
    },false);

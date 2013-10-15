var mock_data = [
    {
        "ID": "yongch", 
        "dateOfBirth": [
            "1823-08-11"
        ], 
        "dateOfdeath": [
            "1901-03-24"
        ], 
        "standardName": [
            "Yonge, Charlotte"
        ]
    }, 
    {
        "ID": "youneh", 
        "dateOfBirth": [
            "1880-03-21"
        ], 
        "dateOfdeath": [
            "1949-08-08"
        ], 
        "standardName": [
            "Young, E. H."
        ]
    }
];


var eventSource = new Timeline.DefaultEventSource();
var onLoad = function() {
    console.log(Timeline);

    var start_date = "Jun 28 1900 00:00:00 GMT";
    var bandInfos = [
	/*
	Timeline.createBandInfo({
	    eventSource: eventSource,
	    date: start_date,
	    width: '50%',
	    intervalUnit: Timeline.DateTime.YEAR,
	    intervalPixels: 100}),
	    */
	Timeline.createBandInfo({
	    eventSource: eventSource,
	    date: start_date,
	    width: '70%',
	    intervalUnit: Timeline.DateTime.DECADE,
	    intervalPixels: 100})

	,Timeline.createBandInfo({
	    eventSource: eventSource,
	    date: start_date,
	    width:'30%',
	    intervalUnit: Timeline.DateTime.CENTURY,
	    intervalPixels: 200})
	/*
	,Timeline.createBandInfo({
	    eventSource: eventSource,
	    date: start_date,
	    width: '20%',
	    intervalUnit: Timeline.DateTime.MILLENNIUM,
	    intervalPixels: 100}),
	    */
    ];

    // http://simile-widgets.org/wiki/Timeline_GettingStarted#Step_4._Keep_the_bands_in_sync
    bandInfos[1].syncWith = 0;
    bandInfos[1].highlight = true;
    bandInfos[0].highlight = true;
    //bandInfos[2].syncWith = 1;
    //bandInfos[1].highlight = true;

    var theline = document.getElementById('thetimeline');
    tl = Timeline.create(theline, bandInfos);
    var json_fname = "orlando_dateOf_chunked.json";
    //var data = mock_data;
    var data = $.getJSON(json_fname,function(data){
	//console.log("data",data);
	for (var i = 0; i < data.length; i++){
	    console.log(i);
	    addTimelineEventFromOrlandoEntity(data[i],eventSource);
	}
	eventSource._fire("onAddMany",[]);
    });
    //Timeline.loadJSON(json_fname,function(jsn, url){ eventSource.loadJSON(jsn,url)});
    //var data = mock_data;

}

var dtPrs = function(orlDt) {
    var parts = orlDt.split('-');
    var d = new Date(parts[0],
		     parts[1]?parts[1]:0,
		     parts[2]?parts[2]:0,
		     0,0,0,0);
    //console.log(d,"<==",orlDt);
    return d;
};

var addTimelineEventFromOrlandoEntity = function(orlEnt,evtSrc){
    // Timeline Event attributes:
    //    http://simile-widgets.org/wiki/Timeline_EventSources
    var args = {
	id:    orlEnt.ID,
	title: 'test string', //orlEnt.standardName[0],
	durationEvent: false,
	caption: orlEnt.standardName[0],
	description: orlEnt.standardName[0]+" ("+orlEnt.ID+")"
    };
    if (orlEnt.dateOfBirth && orlEnt.dateOfdeath) args.durationEvent = true;
    if (orlEnt.dateOfBirth) args.start = dtPrs(orlEnt.dateOfBirth[0]);
    if (orlEnt.dateOfdeath) args.end = dtPrs(orlEnt.dateOfdeath[0]);
    simEvt = new Timeline.DefaultEventSource.Event(args);
    console.log(args);
    evtSrc.add(simEvt);
    return args;
}


var resizeTimeID = null;
onResize = function() {
    if (resizeTimerID == null) {
        resizeTimerID = window.setTimeout(function() {
            resizeTimerID = null;
            tl.layout();
        }, 500);
    }    
}

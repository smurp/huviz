var busybee = {
    buzz: function(times) {
	if (times > 1) {
	    return this.buzz(times - 1);
	} else {
            return "BZZZ! ";
	}
    },
    boink: function(times) {
	for (i=1; i < times + 1; i++) {
	    console.log("boink");
	}
        return times;
    },
    square: function(i) {
        return i * i;
    }
};

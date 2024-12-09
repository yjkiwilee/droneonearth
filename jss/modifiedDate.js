// ---- define some additional functions related to sidereal time in Date ----
Date.prototype.getLocalSiderealTimestep = function(longitude) { // used internally.
    var J2000 = new Date('January 1, 2000 11:58:56 UTC'); // the approximate J2000 epoch.
    J2000.setFullYear(this.getFullYear()); // set the year to be identical in order to minimize error.

    var timeDiff = this - J2000; // get the timestep difference. (in solar time system)
    timeDiff *= 365.24 / 366.24; // convert the solar time difference to a sidereal time difference.

    var timezone = longitude / 180 * 12; // calculate the float-point timezone.
    timeDiff -= timezone * 60 * 60 * 1000; // convert 'timezone' into millis and add it to 'timeDiff'.

    return timeDiff;
}

// get the 'approximate' sidereal hours as the J2000 epoch as the reference point.
Date.prototype.getLocalSiderealHours = function(longitude) { 
    var timeDiff = this.getLocalSiderealTimestep(longitude);

    var hours = Math.floor(timeDiff / 1000 / 60 / 60) % 24;

    return hours;
}

Date.prototype.getLocalSiderealMinutes = function(longitude) {
    var timeDiff = this.getLocalSiderealTimestep(longitude);

    var minutes = Math.floor(timeDiff / 1000 / 60) % 60;

    return minutes;
}

Date.prototype.getLocalSiderealSeconds = function(longitude) {
    var timeDiff = this.getLocalSiderealTimestep(longitude);

    var seconds = (timeDiff / 1000) % 60; // notice how the value is not floored.

    return seconds;
}

Date.prototype.getLocalSiderealTime = function(longitude) { // returns the local sidereal time object.
    var timeDiff = this.getLocalSiderealTimestep(longitude);

    var time = {
        hours : Math.floor(timeDiff / 1000 / 60 / 60) % 24,
        minutes : Math.floor(timeDiff / 1000 / 60) % 60,
        seconds : (timeDiff / 1000) % 60
    }

    return time;
}
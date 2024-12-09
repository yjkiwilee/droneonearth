// ---- define some functions for later use ----
Math.degrees = function(radian) {
    return radian / (2*Math.PI) * 360;
}

Math.radians = function(degrees) {
    return degrees / 360 * (2*Math.PI);
}

// ---- for sidereal time calculations ----
Math.siderealTimeToDegrees = function(stime) { // receives a sidereal time object and converts it into an angle value
    var angle = 0;

    angle += stime.hours * (360 / 24);
    angle += stime.minutes * (360 / 24 / 60);
    angle += stime.seconds * (360 / 24 / 60 / 60);

    return angle;
}

Math.siderealTimeToRadians = function(stime) { // "
    var angle = 0;
    const TWO_PI = Math.PI * 2;

    angle += stime.hours * (TWO_PI / 24);
    angle += stime.minutes * (TWO_PI / 24 / 60);
    angle += stime.seconds * (TWO_PI / 24 / 60 / 60);

    return angle;
}

Math.addSiderealTime = function(a, b) {
    var hours = a.hours + b.hours;
    var minutes = a.minutes + b.minutes;
    var seconds = a.seconds + b.seconds;

    minutes += Math.floor(seconds / 60);
    seconds %= 60;

    hours += Math.floor(minutes / 60);
    minutes %= 60;

    hours %= 24;

    return {
        hours : hours,
        minutes : minutes,
        seconds : seconds
    };
}

Math.subtractSiderealTime = function(a, b) {
    var hours = a.hours - b.hours;
    var minutes = a.minutes - b.minutes;
    var seconds = a.seconds - b.seconds;

    minutes += Math.floor(seconds / 60);
    seconds = (seconds + 60) % 60;

    hours += Math.floor(minutes / 60);
    minutes = (minutes + 60) % 60;

    hours = (hours + 24) % 24;

    return {
        hours : hours,
        minutes : minutes,
        seconds : seconds
    }
}

// http://star-www.st-and.ac.uk/~fv/webnotes/chapter7.htm
// needed functions

Math.equatorialToHorizontalCoord = function(ra, dec, time, lat, long) {
    var LST = time.getLocalSiderealTime(long);
    var H = Math.siderealTimeToRadians(Math.subtractSiderealTime(LST, ra));
    
    var raddec = Math.radians(dec);
    var radlat = Math.radians(lat);

    var sinAlt = Math.sin(raddec) * Math.sin(radlat) + Math.cos(raddec) * Math.cos(radlat) * Math.cos(H);
    var altitude = Math.asin(sinAlt);

    var sinAzm = -1 * Math.sin(H) * Math.cos(raddec) / Math.cos(altitude);
    var azimuth_s = Math.asin(sinAzm);

    var cosAzm = (Math.sin(raddec) - Math.sin(radlat) * Math.sin(altitude)) / (Math.cos(radlat) * Math.cos(altitude));

    var azimuth = azimuth_s;
    
    if(cosAzm < 0) {
        azimuth = sinAzm > 0 ? Math.PI - azimuth : -Math.PI - azimuth;
    }

    return {
        altitude : altitude,
        azimuth : azimuth
    };
}

Math.horizontalToVector3 = function(alt, azm, r) { // alt, azm in radians
    var pos = new THREE.Vector3(r * Math.cos(alt) * Math.sin(azm), r * Math.cos(alt) * Math.cos(azm), r * Math.sin(alt));

    return pos;
}
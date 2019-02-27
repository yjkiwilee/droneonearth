// ---- define some functions for later use ----
Math.degrees = function(radian) {
    return radian / (2*Math.PI) * 360;
}

Math.radians = function(degrees) {
    return degrees / 360 * (2*Math.PI);
}
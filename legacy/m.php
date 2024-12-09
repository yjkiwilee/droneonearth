<!doctype html>

<html>
    <head>
        <!-- Worldwide elevation data from http://www.viewfinderpanoramas.org/dem3.html#hgt -->
        <meta charset="utf-8">
        <script src="https://code.jquery.com/jquery-3.3.1.min.js" integrity="sha256-FgpCb/KJQlLNfOu91ta32o/NMZxltwRo8QtmkMRdAu8=" crossorigin="anonymous"></script>
    </head>
    <body>
        <style>
            html, body {
                padding : 0;
            }

            canvas {
                position : absolute;
                left : 0px;
                top : 0px;
            }

            #compass {
                width : 10px;
                height : 60px;
                background-color : red;
                position : fixed;
                z-index : 99;
                left : 120px;
                top : 65px;
                transform-origin : bottom center;
            }

            #compassFrame {
                width : 140px;
                height : 140px;
                background-color : none;
                position : fixed;
                z-index : 98;
                left : 47px;
                top : 47px;
                border-radius : 50%;
                border-width : 8px;
                border-color : grey;
                border-style : solid;
            }

            #loading {
                font-family : "Courier New", Courier, monospace;
                position : fixed;
                top : 50%;
                left : 50%;
                transform : translate(-50%, -50%);
                -webkit-transform: translate(-50%, -50%);
                z-index : 100;
                color: white;
            }
        </style>
        
        <div id="compass"></div>
        <div id="compassFrame"></div>

        <h1 id="loading">Loading...</h1>

        <script src="libs/three.min.js"></script>
        <script src="jss/constants.js"></script>
        <script src="jss/modifiedDate.js"></script>
        <script src="jss/modifiedMath.js"></script>
        <script src="jss/starParticle.js"></script>
        <script src="jss/starData.js"></script>
        <script src="jss/groundGeometry.js"></script>
        <script src="jss/roverCamera.js"></script>

        <script>
            // process get query data

            var latQuery = parseFloat("<?php echo $_GET['lat']; ?>");
            var longQuery = parseFloat("<?php echo $_GET['long']; ?>");

            if(isNaN(latQuery) || isNaN(longQuery)) {
                throw "One of or both lat, long queries are not valid!";
            }

            // 1 : 1 metre

            var camera, scene, renderer;
            var light;
            var geometry, material, ground;

            var stars;

            var lighthelper;

            var theta = 0;

            var face = 0;
            var lookup = 0;

            var paused = true;
            var loaded = false;

            init();

            // variables for realistic speed
            var prevTime;

            var droneMperS = 1000; // the m/s speed at which the drone will be moving
            var droneMpermS = droneMperS / 1000;

            var dist = 0; // distance to advance in a frame, in metres

            var starTime;

            animate();

            function init() {
                scene = new THREE.Scene();
                //scene.fog = new THREE.Fog(0xffffff, 1, 10000000);

                /*hemiLight = new THREE.HemisphereLight( 0xffffff, 0xfff9a5, 0.3 );
				hemiLight.position.set( 0, 0, 50 );
				scene.add( hemiLight );*/

                light = new THREE.DirectionalLight(0xffffff, 2);
                light.position.set(-10, 0, 3);
                light.castShadow = true;
                scene.add(light);
                light.shadow.mapSize.width = 128;
                light.shadow.mapSize.height = 128;
                light.shadow.camera.near = 0.5;
                light.shadow.camera.far = 10;

                camera = new RoverCamera(70, window.innerWidth / window.innerHeight, 0.01, 10000000,
                    latQuery, longQuery);

                renderer = new THREE.WebGLRenderer();
                renderer.setSize(window.innerWidth, window.innerHeight);
                renderer.shadowMap.enabled = true;
                document.body.appendChild(renderer.domElement);

                //geometry = new GroundGeometry(37, 127, camera);
                geometry = new GroundGeometry(camera.lat, camera.long, camera);

                //material = new THREE.MeshToonMaterial({color: 0xa5a293, shininess: 0});
                //material = new THREE.MeshPhongMaterial({color: 0xfff9a5, shininess: 0});
                material = new THREE.MeshPhongMaterial({color: 0xffffff, shininess: 0});
                //material = new THREE.MeshDepthMaterial();
                //material = new THREE.MeshBasicMaterial({color: 0xffffff});
                ground = new THREE.Mesh(geometry, material);
                ground.castShadow = true;
                ground.receiveShadow = true;
                //ground.visible = false;
                scene.add(ground);

                /*var skysphere = new THREE.SphereGeometry(10000000, 50, 50);
                var skymaterial = new THREE.ShaderMaterial({
                    vertexShader : $('#vertexShader').text(),
                    fragmentShader : $('#fragmentShader').text(),
                    side : THREE.BackSide
                });
                var skymesh = new THREE.Mesh(skysphere, skymaterial);
                scene.add(skymesh);*/

                var helpergeometry = new THREE.SphereGeometry(200000, 10, 10);
                var helpermaterial = new THREE.MeshBasicMaterial({color: 0xffffff});
                lighthelper = new THREE.Mesh(helpergeometry, helpermaterial);
                var helperposition = new THREE.Vector3(light.position.x, light.position.y, light.position.z);
                helperposition.normalize();
                helperposition.multiplyScalar(10000000);
                lighthelper.position.set(helperposition.x, helperposition.y, helperposition.z);
                scene.add(lighthelper);

                starTime = new Date();
                stars = new StarParticle(camera.lat, camera.long, starTime);
                scene.add(stars.mesh);

                renderer.render(scene, camera);
            }


            function animate() {
                requestAnimationFrame(animate);

                if(!camera.ground) { // if the ground is not loaded yet
                    return;
                }

                if(!loaded) { // if this is the first frame after load
                    $('#loading').css('display', 'none');
                    loaded = true;
                    prevTime = new Date().getTime();
                    return; // need to skip this frame to set prevTime.
                }
                
                var curTime = new Date().getTime();
                var diff = curTime - prevTime;
                var tpf = diff / 1;
                dist = droneMpermS * tpf;
                prevTime = curTime;

                //console.log(new Date().getTime());

                camera.face(face); // in deg

                $("#compass").css({transform : "rotate(" + (-face).toString() + "deg)"});

                camera.lookUp(lookup); // in deg

                if(!paused) {
                    camera.updateAngle();
                    camera.forward(dist);
                }

                //starTime.setTime(starTime.getTime() + 10000);
                stars.updateTime(starTime);

                renderer.render(scene, camera);
            }

            /* https://w3c.github.io/deviceorientation/#worked-example */

            var degtorad = Math.PI / 180; // Degree-to-Radian conversion

            function getAngles( alpha, beta, gamma ) {

                var _x = beta  ? beta  * degtorad : 0; // beta value
                var _y = gamma ? gamma * degtorad : 0; // gamma value
                var _z = alpha ? alpha * degtorad : 0; // alpha value

                var cX = Math.cos( _x );
                var cY = Math.cos( _y );
                var cZ = Math.cos( _z );
                var sX = Math.sin( _x );
                var sY = Math.sin( _y );
                var sZ = Math.sin( _z );

                // Calculate Vx and Vy components
                var Vx = - cZ * sY - sZ * sX * cY;
                var Vy = - sZ * sY + cZ * sX * cY;
                var Vz = - cX * cY;

                var Pl = Math.sqrt( Vx*Vx + Vy*Vy );

                // Calculate compass heading
                var compassHeading = Math.atan( Vx / Vy );

                // Convert compass heading to use whole unit circle
                if( Vy < 0 ) {
                    compassHeading += Math.PI;
                } else if( Vx < 0 ) {
                    compassHeading += 2 * Math.PI;
                }

                var lookUp = Math.atan( Vz / Pl );

                return {
                    compassHeading: compassHeading * ( 180 / Math.PI ), // Compass Heading (in degrees)
                    lookUp: lookUp * ( 180 / Math.PI ),
                }
            }

            function handleOrientation(e) {
                var angles = getAngles(e.alpha, e.beta, e.gamma);
                face = angles.compassHeading;
                lookup = angles.lookUp;
            }

            function handleTap(e) {
                paused = !paused;
            }

            window.addEventListener("deviceorientation", handleOrientation, true);
            var cvs = document.getElementsByTagName("canvas")[0];
            cvs.addEventListener("touchstart", handleTap, false);

        </script>
    </body>
</html>
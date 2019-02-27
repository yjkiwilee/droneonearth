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
            }
        </style>
        
        <div id="compass"></div>
        <div id="compassFrame"></div>

        <h1 id="loading">Loading...</h1>

        <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/101/three.min.js"></script>
        <script src="constants.js"></script>
        <script src="modifiedMath.js"></script>
        <script src="groundGeometry.js"></script>
        <script src="roverCamera.js"></script>

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

            var theta = 0;

            var mouseX, mouseY = 0;

            var paused = false;
            var loaded = false;

            init();

            // variables for realistic speed
            var prevTime;

            var droneMperS = 1000; // the m/s speed at which the drone will be moving
            var droneMpermS = droneMperS / 1000;

            var dist = 0; // distance to advance in a frame, in metres

            animate();

            function init() {
                scene = new THREE.Scene();
                //scene.fog = new THREE.Fog(0xffffff, 1, 10000000);

                hemiLight = new THREE.HemisphereLight( 0x9dbdf2, 0xfff9a5, 0.3 );
				hemiLight.position.set( 0, 0, 50 );
				scene.add( hemiLight );

                light = new THREE.DirectionalLight(0xffffff, 1);
                light.position.set(-10, 0, 10)
                light.castShadow = true;
                scene.add(light);
                light.shadow.mapSize.width = 2048;
                light.shadow.mapSize.height = 2048;
                light.shadow.camera.near = 0.5;
                light.shadow.camera.far = 10;

                camera = new RoverCamera(70, window.innerWidth / window.innerHeight, 0.01, 10000000
                    , latQuery, longQuery);

                renderer = new THREE.WebGLRenderer();
                renderer.setSize(window.innerWidth, window.innerHeight);
                renderer.shadowMap.enabled = true;
                document.body.appendChild(renderer.domElement);

                renderer.domElement.requestPointerLock();

                //geometry = new GroundGeometry(37, 127, camera);
                geometry = new GroundGeometry(latQuery, longQuery, camera);

                material = new THREE.MeshPhongMaterial({color: 0xfff9a5, shininess: 0});
                //material = new THREE.MeshDepthMaterial();
                ground = new THREE.Mesh(geometry, material);
                ground.castShadow = true;
                ground.receiveShadow = true;
                scene.add(ground);

                var skysphere = new THREE.SphereGeometry(10000000, 50, 50);
                var skymaterial = new THREE.MeshBasicMaterial({color: 0x9dbdf2, side: THREE.DoubleSide});
                var skymesh = new THREE.Mesh(skysphere, skymaterial);
                scene.add(skymesh);

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

                var ang = ((mouseX / window.innerWidth) - 1) * 360;
                camera.face(ang); // in deg

                $("#compass").css({transform : "rotate(" + (-ang).toString() + "deg)"});

                ang = (1/2 - (mouseY / window.innerHeight)) * 90;
                camera.lookUp(ang); // in deg

                if(!paused) {
                    camera.updateAngle();
                    camera.forward(dist);
                }

                renderer.render(scene, camera);
            }

            document.onmousemove = function(e) {
                mouseX = e.pageX;
                mouseY = e.pageY;
            }

            document.onkeydown = function(e) {
                var key = e.which || e.keyCode;
                if(key == 32) {
                    paused = !paused;
                }
            }
        </script>
    </body>
</html>
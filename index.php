<!doctype html>
<!-- https://stackoverflow.com/questions/4117555/simplest-way-to-detect-a-mobile-device -->
<?php

$useragent=$_SERVER['HTTP_USER_AGENT'];

if(preg_match('/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i',$useragent)||preg_match('/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i',substr($useragent,0,4)))

header('Location: /m.php?lat=' . $_GET['lat'] . '&long=' . $_GET['long']);

?>

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

            var mouseX, mouseY = 0;

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

                var ang = ((mouseX / window.innerWidth) - 1) * 360;
                camera.face(ang); // in deg

                $("#compass").css({transform : "rotate(" + (-ang).toString() + "deg)"});

                ang = (1/2 - (mouseY / window.innerHeight)) * 90;
                camera.lookUp(ang); // in deg

                if(!paused) {
                    camera.updateAngle();
                    camera.forward(dist);
                }

                //starTime.setTime(starTime.getTime() + 10000);
                stars.updateTime(new Date());

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

            window.addEventListener('resize', function() {
				camera.aspect = window.innerWidth / window.innerHeight;
				camera.updateProjectionMatrix();
				renderer.setSize( window.innerWidth, window.innerHeight );
            }, false);
        </script>
    </body>
</html>
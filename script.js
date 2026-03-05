import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import gsap from "https://unpkg.com/gsap@3.14.1/index.js";
import { ScrollTrigger } from "https://unpkg.com/gsap@3.14.1/ScrollTrigger.js";
import { SplitText } from "https://unpkg.com/gsap@3.14.1/SplitText.js";
import Lenis from "https://unpkg.com/@studio-freight/lenis@1.0.39/dist/lenis.mjs";

document.addEventListener("DOMContentLoaded", () => {
    gsap.registerPlugin(ScrollTrigger, SplitText);

    const lenis = new Lenis();
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    document.fonts.ready.then(() => {
        const header1Split = new SplitText(".header-1 h1", {
            type: "words",
            wordsClass: "word",
        });

        const titleSplits = new SplitText(".tooltip .title h2", {
            type: "lines",
            linesClass: "line",
        });

        const descriptionSplits = new SplitText(".tooltip .description p", {
            type: "lines",
            linesClass: "line",
        });

        header1Split.words.forEach((word) => { word.innerHTML = `<span>${word.innerText}</span>` });
        [...titleSplits.lines, ...descriptionSplits.lines].forEach((line) => { line.innerHTML = `<span>${line.innerText}</span>` });

        ScrollTrigger.create({
            trigger: ".product-overview",
            start: "top 75%",
            onEnter: () => gsap.to(".header-1 h1 .word > span", {
                y: "0%",
                duration: 1,
                ease: "power3.out",
                stagger: 0.025,
            }),
            onLeaveBack: () => gsap.to(".header-1 h1 .word > span", {
                y: "100%",
                duration: 1,
                ease: "power3.out",
                stagger: 0.025,
            })
        });

        ScrollTrigger.refresh();
    });

    const animOptions = { duration: 1, ease: "power3.out", stagger: 0.025 };
    const tooltipSelectors = [
        {
            trigger: 0.65,
            elements: [
                ".tooltip:nth-child(1) .avatar",
                ".tooltip:nth-child(1) .title .line > span",
                ".tooltip:nth-child(1) .description .line > span",
            ]
        },
        {
            trigger: 0.85,
            elements: [
                ".tooltip:nth-child(2) .avatar",
                ".tooltip:nth-child(2) .title .line > span",
                ".tooltip:nth-child(2) .description .line > span",
            ]
        }
    ]

    let model,
        currentRotation = 0,
        modelSize;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

    renderer.setClearColor(0x000000, 0);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    document.querySelector(".model-container").appendChild(renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment()).texture;

    // Giảm bớt ánh sáng môi trường để hiệu ứng ánh đèn mờ ảo hơn
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    // Đèn trần sân khấu chiếu chéo từ trên xuống với ánh sáng vàng đồng (Gold)
    const stageLight = new THREE.SpotLight(0xffa500, 150.0);
    stageLight.position.set(15, 30, 15); // Đặt góc chéo rất cao, chiếu xéo xuống
    stageLight.angle = Math.PI / 4; // Góc chiếu rộng hơn để bao phủ toàn bộ khối vật thể
    stageLight.penumbra = 0.5; // Viền mờ cho mềm mại
    stageLight.decay = 2; // Độ suy giảm ánh sáng
    stageLight.distance = 100;
    stageLight.castShadow = true;
    stageLight.shadow.bias = -0.001;
    stageLight.shadow.mapSize.width = 1024;
    stageLight.shadow.mapSize.height = 1024;
    scene.add(stageLight);

    // Đèn phụ trợ (Fill) chiếu hắt nhẹ từ bên trái để tạo luồng ven (Rim light) màu cam đỏ
    const fillLight = new THREE.DirectionalLight(0xff6600, 10.0);
    fillLight.position.set(-5, 0, -2);
    scene.add(fillLight);

    // Đèn hắt mũi nhẹ từ góc chéo dưới lên để mặt trước không bị chìm hoàn toàn vào bóng tối
    const bounceLight = new THREE.DirectionalLight(0xffccaa, 5.0);
    bounceLight.position.set(2, -4, 4);
    scene.add(bounceLight);

    // Đèn rọi thẳng mặt chính diện để mảng chữ T không bao giờ bị đen kịt sẫm màu
    const frontLight = new THREE.SpotLight(0xffffff, 40.0);
    frontLight.position.set(0, 0, 15);
    frontLight.angle = Math.PI / 4;
    frontLight.penumbra = 0.8; // Làm viền sáng thật mềm để không cướp spotlight ánh vàng
    scene.add(frontLight);

    function setupModel() {
        if (!model || !modelSize) return;

        const isMobile = window.innerWidth < 1000;
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());

        model.position.set(
            isMobile ? center.x + modelSize.x * 1 : -center.x - modelSize.x * 0.4,
            -center.y + modelSize.y * 0.085,
            -center.z
        )

        model.rotation.z = isMobile ? 0 : THREE.MathUtils.degToRad(-35);

        const cameraDistance = isMobile ? 2 : 1.25;
        camera.position.set(
            0,
            0,
            Math.max(modelSize.x, modelSize.y, modelSize.z) * cameraDistance,
        )
        camera.lookAt(0, 0, 0);
    }

    new GLTFLoader().load("./tiktokaward.glb", (gltf) => {
        model = gltf.scene;

        model.traverse((node) => {
            if (node.isMesh && node.material instanceof THREE.MeshStandardMaterial) {
                Object.assign(node.material, {
                    metalness: 1,
                    roughness: 0.2,
                    color: new THREE.Color(0xffd700), // Phủ màu vàng kim để nhuộm màu tia sáng phản chiếu
                });
            }
        })

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        modelSize = size;

        scene.add(model);
        setupModel();
    });

    function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
    }

    animate();

    window.addEventListener("resize", () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        setupModel();
    });

    ScrollTrigger.create({
        trigger: ".product-overview",
        start: "top top",
        end: `+=${window.innerHeight * 10}px`,
        pin: true,
        pinSpacing: true,
        scrub: 1,
        onUpdate: ({ progress }) => {
            const headerProgress = Math.max(0, Math.min(1, (progress - 0.05) / 0.3));
            gsap.to(".header-1", {
                xPercent:
                    progress < 0.05 ? 0 : progress > 0.35 ? -100 : -100 * headerProgress,
            });

            const maskSize = progress < 0.2 ? 0 : progress > 0.3 ? 100 : 100 * ((progress - 0.2) / 0.1);
            gsap.to(".circular-mask", {
                clipPath: `circle(${maskSize}% at 50% 50%)`,
            });

            const header2Progress = (progress - 0.15) / 0.35;
            const header2XPercent = progress < 0.15 ? 100 : progress > 0.5 ? -250 : 100 - 350 * header2Progress;
            gsap.to(".header-2", {
                xPercent: header2XPercent,
            });

            const scaleX = progress < 0.45 ? 0 : progress > 0.65 ? 100 : 100 * ((progress - 0.45) / 0.2);
            gsap.to(".tooltips .divider", { scaleX: `${scaleX}%`, ...animOptions });

            tooltipSelectors.forEach(({ trigger, elements }) => {
                gsap.to(elements, {
                    y: progress > trigger ? 0 : "125%",
                    ...animOptions,
                });
            });

            if (model && progress > 0.05) {
                const rotationProgress = (progress - 0.05) / 0.95;
                const targetRotation = Math.PI * 3 * 4 * rotationProgress;
                const rotationDiff = targetRotation - currentRotation;
                if (Math.abs(rotationDiff) > 0.001) {
                    model.rotateOnAxis(new THREE.Vector3(0, 1, 0), rotationDiff);
                    currentRotation = targetRotation;
                }

                // --- MỚI: Đèn xoay trượt theo Scroll ---
                // Ánh đèn quay vòng quanh vật thể nhiều góc độ
                const lightAngle = progress * Math.PI * 4; // Xoay 2 vòng trong suốt quá trình cuộn
                stageLight.position.x = Math.sin(lightAngle) * 20; // Quỹ đạo X
                stageLight.position.z = Math.cos(lightAngle) * 20; // Quỹ đạo Z
                stageLight.position.y = 30 + Math.sin(progress * Math.PI * 2) * 5; // Độ cao đèn hơi nhấp nhô nhưng vẫn giữ góc chiếu chéo từ trên cao

                // Tính toán thay đổi ánh sáng mờ dần hoặc đổi màu phông nền
                // progress < 0.2: nền trắng #ffffff, progress > 0.4: nền đen #0d0d0d
                const bgProgress = Math.max(0, Math.min(1, (progress - 0.2) / 0.3));
                // Công thức mix màu cơ bản: r, g, b từ 255 -> 13
                const whiteToBlackVal = Math.floor(255 - (242 * bgProgress));
                gsap.to(".product-overview", {
                    backgroundColor: `rgb(${whiteToBlackVal}, ${whiteToBlackVal}, ${whiteToBlackVal})`,
                    duration: 0.1
                });
            }
        }
    });
});

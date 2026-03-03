// Import các thư viện qua CDN ESM vì đang chạy trực tiếp trên trình duyệt (không dùng bundler)
import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { GLTFLoader } from "https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";
import gsap from "https://unpkg.com/gsap@3.12.2/index.js";
import { ScrollTrigger } from "https://unpkg.com/gsap@3.12.2/ScrollTrigger.js";
// SplitText là plugin trả phí, tạm thời bỏ import nếu bạn không có file/plugin riêng
// import { SplitText } from "https://unpkg.com/gsap@3.12.2/SplitText.js";
// Để code còn chạy, mình tạo 1 class giả thay thế SplitText với API tối thiểu bạn đang dùng
class SplitText {
    constructor(selector, options) {
        this.elements = Array.from(document.querySelectorAll(selector));
        this.chars = [];
        this.lines = [];
        // Chỉ xử lý rất đơn giản cho demo
        if (options?.type === "chars") {
            this.chars = this.elements
                .flatMap(el => el.textContent.split(""))
                .map(c => {
                    const span = document.createElement("span");
                    span.textContent = c;
                    return span;
                });
        }
    }
}
import Lenis from "https://unpkg.com/@studio-freight/lenis@1.0.39/dist/lenis.mjs";

document.addEventListener("DOMContentLoaded", () => {
    gsap.registerPlugin(ScrollTrigger, SplitText);
    
    const lenis = new Lenis();
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    const header1Split = new SplitText(".header-1 h1", {
        type: "chars",
        charsClass: "char",
    });

    const titleSplits = new SplitText(".tooltip .title h2", {
        type: "lines",
        charsClass: "line",
    });

    const descriptionSplits = new SplitText(".tooltip .description p", {
        type: "lines",
        charsClass: "line",
    });
    
    header1Split.chars.forEach((char) => {char.innerHTML = `<span>${char.innerHTML}</span>`});
    [...titleSplits.lines, ...descriptionSplits.lines].forEach((line) => {line.innerHTML = `<span>${line.innerHTML}</span>`});
    
    const animOptions = {duration: 1, ease: "power3.out", stagger: 0.025};
    const tooltipSelectors = [
        {
            trigger: 0.65,
            elements: [
                ".tooltip:nth-child(1) .icon ion-icon",
                ".tooltip:nth-child(1) .title .line",
                ".tooltip:nth-child(1) .description .line > span",
            ]
        },
        {
            trigger: 0.85,
            elements: [
                ".tooltip:nth-child(2) .icon ion-icon",
                ".tooltip:nth-child(2) .title .line > span",
                ".tooltip:nth-child(2) .description .line > span",
            ]
        }
    ]

    ScrollTrigger.create({
        trigger: ".product-overview",
        start: "75% bottom",
        onEnter: () => {
            gsap.to(".header-1 h1 .char > span", {
                y: "0%",
            duration: 1,
            ease: "power3.out",
            stagger: 0.025,
            })
        },
        onLeaveBack: () => {
            gsap.to(".header-1 h1 .char > span", {
                y: "100%",
                duration: 1,
                ease: "power3.out",
                stagger: 0.025,
            })
        }
    })

    let model,
    currentRotation = 0,
    modelSize;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});

    renderer.setClearColor(0x000000, 0);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.LinearEncoding;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.toneMappingExposure = 1.0;
    document.querySelector(".model-container").appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
    mainLight.position.set(1, 2, 3);
    mainLight.castShadow = true;
    mainLight.shadow.bias = -0.001;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(-2, 0, -2);
    scene.add(fillLight);

    function setupModel(){
        if(!model || !modelSize) return;

        const isMobile = window.innerWidth < 1000;
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());

        model.position.set(
            isMobile ? center.x + modelSize.x * 1 : -center.x - modelSize.x * 0.4,
            -center.y + modelSize.y * 0.005,
            -center.z
        )

        model.rotation.z = isMobile ? 0 : THREE.MathUtils.degToRad(-25);

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
            if(node.isMesh && node.material instanceof THREE.MeshStandardMaterial){
                Object.assign(node.material, {
                    metalness: 0.05,
                    roughness: 0.9,
                });
            }
        })
        
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        modelSize = size;

        scene.add(model);
        setupModel();
    });

    function animate(){
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
        scrub: true,
        onUpdate: (self) => {
            const progress = self.progress;

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
            const header2XPercent = progress < 0.15 ? 100 : progress > 0.5 ? -200 : 100 - 300 * header2Progress;
            gsap.to(".header-2", {
                xPercent: header2XPercent,
            });

            const scaleX = progress < 0.45 ? 0 : progress > 0.65 ? 100 : 100 * ((progress - 0.45) / 0.2);
            gsap.to(".tooltips .divider", {scaleX: `${scaleX}%`, ...animOptions});

            tooltipSelectors.forEach(({trigger, elements}) => {
                gsap.to(elements, {
                    y: progress > trigger ? 0 : "100%",
                    ...animOptions,
                });
            });

            if(model && progress > 0.05){
                const rotationProgress = (progress - 0.05) / 0.95;
                const targetRotation = Math.PI * 3 * 4 * rotationProgress;
                const rotationDiff = targetRotation - currentRotation;
                if(Math.abs(rotationDiff) > 0.001){
                    model.rotateOnAxis(new THREE.Vector3(0, 1, 0), rotationDiff);
                    currentRotation = targetRotation;
                }
            }
        }
    });
});

import { abs, attribute, dot, float, floor, Fn, fwidth, hash, hue, If, instancedArray, instanceIndex, max, min, mix, mx_noise_float, mx_noise_vec3, normalLocal, normalView, PI, positionLocal, pow, sin, smoothstep, step, time, transformedNormalView, uniform, uv, varying, vec3, vec4 } from "three/tsl"
import * as THREE from "three/webgpu"

import {renderer, scene} from '@/world/scene'
import { modelLoader } from "@/utils/loadModel"
import { MeshSurfaceSampler } from "three/examples/jsm/Addons.js"
import { gui } from "@/utils/guiPane"
import { emitter } from "@/utils/emitter"


function pointSample(mesh: THREE.Mesh, count: number, scale: number){
  const sampler = new MeshSurfaceSampler(mesh).setWeightAttribute(null).build()
  const points: THREE.Vector3[] = []
  const tempPos = new THREE.Vector3()
  const tempNor = new THREE.Vector3()
  mesh.updateMatrixWorld()
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld)
  for(let i=0;i<count;i++){
    sampler.sample(tempPos, tempNor)
    tempPos.applyMatrix4(mesh.matrixWorld)

    tempNor.applyMatrix3(normalMatrix).normalize()
    tempPos.addScaledVector(tempNor, scale)

    points.push(tempPos.clone())
  }
  return points
}

const colOuter = uniform(new THREE.Color(0x167947))
const colInner = uniform(new THREE.Color(0x00ff00))
const hueOffset = uniform(0)

async function model(tex: THREE.Texture) {
  const gltf = await modelLoader.loadAsync(import.meta.env.BASE_URL + 'model/human_body-transformed.glb')
  const mesh = gltf.scene.children[0] as THREE.Mesh
  const s = 5.
  mesh.scale.set(s,s,s)
  // scene.add(mesh)

  const sampleCount = 20000
  const COUNT = sampleCount * 2



  const offsetScale = uniform(.3)
  const offsetSpeed = uniform(.5)
  const offsetAmp = uniform(.2)

  const scaleScale = uniform(2.2)
  const scaleSpeed = uniform(1)
  const scaleAmp = uniform(2)



  const points: THREE.Vector3[] = []
  const points1 = pointSample(mesh, sampleCount, 0)
  points.push(...points1)
  const points2 = pointSample(mesh, sampleCount, -.1)
  points.push(...points2)

  const posArr = new Float32Array(COUNT*3)
  for(let i=0;i<points.length;i++){
    posArr[i*3+0] = points[i].x
    posArr[i*3+1] = points[i].y
    posArr[i*3+2] = points[i].z
  }
  const posBuffer = instancedArray(posArr, 'vec3')
  const posRawBuffer = instancedArray(posArr, 'vec3')
  const scaleBuffer = instancedArray(COUNT, 'vec3')


  const mat = new THREE.MeshMatcapNodeMaterial()
  mat.matcap = tex


  const update = Fn(() => {
    const idx = float(instanceIndex)
    const pos = posRawBuffer.element(idx)
    let offset = mx_noise_vec3(pos.mul(offsetScale).add(time.mul(offsetSpeed)))
    const maxOffset = max(offset.x, max(offset.y, offset.z))
    offset = vec3(step(maxOffset, offset.x), step(maxOffset, offset.y), step(maxOffset, offset.z)).mul(offsetAmp)
    posBuffer.element(idx).assign(pos.add(offset))

    let scale = mx_noise_vec3(pos.mul(scaleScale).add(vec3(11.23,34.25,67.32)).add(time.mul(scaleSpeed)))
    const maxScale = max(scale.x, max(scale.y, scale.z))
    scale = vec3(step(maxScale, scale.x), step(maxScale, scale.y), step(maxScale, scale.z)).mul(scaleAmp).add(.5)
    scaleBuffer.element(idx).assign(scale)
  })().compute(COUNT)

  emitter.on('animate', () => {
    renderer.compute(update)
  })


  const vInner = varying(float(0))
  mat.positionNode = Fn(() => {
    const idx = float(instanceIndex)
    const pos = posBuffer.element(idx).toVar()
    const scale = scaleBuffer.element(idx).toVar()

    vInner.assign(floor(idx.div(sampleCount)))
    
    return positionLocal.mul(scale).add(pos)
  })()

  mat.colorNode = Fn(() => {
    const col = mix(hue(colOuter, hueOffset), hue(colInner, hueOffset), vInner)
    const str = vInner.mul(2).add(1)
    return col.mul(str)
  })()

  const ins = new THREE.InstancedMesh(
    new THREE.BoxGeometry(.1,.1,.1,1,1,1),
    mat,
    COUNT
  )
  ins.frustumCulled = false
  scene.add(ins)

  const f1 = gui.addFolder('offsetNoise')
  f1.add(offsetScale, 'value', 0.01, 3).name('scale')
  f1.add(offsetSpeed, 'value', 0.01, 3).name('speed')
  f1.add(offsetAmp, 'value', 0.01, 3).name('amp')

  const f2 = gui.addFolder('scaleNoise')
  f2.add(scaleScale, 'value', 0.01, 3).name('scale')
  f2.add(scaleSpeed, 'value', 0.01, 3).name('speed')
  f2.add(scaleAmp, 'value', 0.01, 3).name('amp')
}


function Cube(tex: THREE.Texture){
  const Size = 24
  const N = 40
  const geo = new THREE.BoxGeometry(Size,Size,Size,N,N,N)
  geo.translate(0,5,0)
  const posAttr = geo.getAttribute('position')
  const count = posAttr.count
  const posArr = posAttr.array as Float32Array

  const posBuffer = instancedArray(posArr, 'vec3')
  const mat = new THREE.MeshBasicNodeMaterial()

  const vColMixer = varying(float(0))
  mat.positionNode = Fn(() => {
    const idx = float(instanceIndex)
    const pos = posBuffer.element(idx).toVar()


    const mx = sin(abs(pos.x).mul(.5).sub(time.mul(2)))
    const my = sin(abs(pos.y).mul(.5).sub(time.mul(2)))
    const mz = sin(abs(pos.z).mul(.5).sub(time.mul(2)))
    const m = max(mx, max(my, mz))

    vColMixer.assign(step(.97, m))


    return positionLocal.add(pos)
  })()

  mat.colorNode = Fn(() => {
    const col = mix(hue(colOuter, hueOffset.add(.5)).mul(.1), hue(colInner, hueOffset.add(.5)).mul(.8), vColMixer)
    return col
  })()

  const s = Size / N * .8
  const ins = new THREE.InstancedMesh(
    new THREE.BoxGeometry(s,s,s,1,1,1),
    mat,
    count
  )
  ins.frustumCulled = false
  scene.add(ins)
}


export async function DigitalBody() {
  
  const texLoader = new THREE.TextureLoader()
  const tex = await texLoader.loadAsync(import.meta.env.BASE_URL + 'img/2D2D2F_C6C2C5_727176_94949B.png')

  await model(tex)

  gui.add(hueOffset, 'value', 0, 6.29, .01).name('theme')

  // Cube(tex)
}
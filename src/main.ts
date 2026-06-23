import './style.css'
import { initScene, scene, camera, control } from './world/scene'
import * as THREE from 'three'
import {setEnv} from './world/envMap'
import GlowCrystal from './world/glowCrystal'
import { setLight } from './world/light'
import { DigitalBody } from './world/DigitalBody'



(async() => {
  await initScene()
  camera.position.set(-2.5, 8.5, 5.5)
  control.target.set(2.5, 6, -1.25)

  // const axesHelper = new THREE.AxesHelper(10)
  // scene.add(axesHelper)

  setLight()
  setEnv()

  // GlowCrystal()
  await DigitalBody()
})()
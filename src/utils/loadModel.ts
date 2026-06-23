import { DRACOLoader, GLTFLoader } from "three/examples/jsm/Addons.js"

export const modelLoader = new GLTFLoader()


const decoderLoader = new DRACOLoader()
decoderLoader.setDecoderPath( import.meta.env.BASE_URL + 'draco/' )
modelLoader.setDRACOLoader(decoderLoader)

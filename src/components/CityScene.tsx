import { Canvas, type ThreeEvent, useFrame, useThree } from '@react-three/fiber'
import { Float, OrbitControls } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { CityLayout } from '../core/layout'
import type { ComparisonKind } from '../core/compare'
import type { Contributor, HistorySnapshot } from '../core/types'

const languageColors: Record<string, string> = {
  TypeScript: '#4b9fcf', JavaScript: '#ddc85a', Rust: '#df744f', Go: '#56c5d0', Python: '#6f9ec4',
  Ruby: '#c95050', Java: '#da7857', Kotlin: '#9b76df', Swift: '#ec775d', CSS: '#b36ed1',
  HTML: '#dd7149', Vue: '#5abf91', Svelte: '#ef6a50', Docs: '#d7c9a5', Data: '#8da38c',
  SQL: '#759bc2', Shell: '#7fbe77', Docker: '#5597d1', Other: '#8f938d',
}

interface CitySceneProps {
  snapshot: HistorySnapshot
  layout: CityLayout
  contributors: Contributor[]
  selectedPath?: string
  onSelect: (path?: string) => void
  playing: boolean
  cinematicProgress?: number
  renderWidth?: number
  comparison?: Map<string, ComparisonKind>
  onCanvas: (canvas: HTMLCanvasElement) => void
}

function DistrictLabel({ name, width }: { name: string; width: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 72
    const context = canvas.getContext('2d')
    if (context) {
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.fillStyle = 'rgba(8, 12, 10, .72)'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.strokeStyle = 'rgba(116, 153, 134, .55)'
      context.strokeRect(1, 1, canvas.width - 2, canvas.height - 2)
      context.fillStyle = '#9db2a7'
      context.font = '600 24px ui-monospace, SFMono-Regular, monospace'
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      const label = name.length > 26 ? `${name.slice(0, 24)}…` : name
      context.fillText(label.toUpperCase(), canvas.width / 2, canvas.height / 2)
    }
    const result = new THREE.CanvasTexture(canvas)
    result.colorSpace = THREE.SRGBColorSpace
    result.minFilter = THREE.LinearFilter
    return result
  }, [name])
  useEffect(() => () => texture.dispose(), [texture])
  return (
    <sprite position={[0, 0.55, -width / 2 + 0.72]} scale={[Math.min(7, Math.max(3.4, width * 0.42)), 0.74, 1]}>
      <spriteMaterial map={texture} transparent depthWrite={false} />
    </sprite>
  )
}

function CityGround({ layout }: { layout: CityLayout }) {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.08, 0]} receiveShadow>
        <planeGeometry args={[layout.span * 2.4, layout.span * 2.4]} />
        <meshStandardMaterial color="#080b0a" roughness={0.96} metalness={0.08} />
      </mesh>
      <gridHelper args={[layout.span * 2, Math.max(20, Math.round(layout.span / 2)), '#25312c', '#151d1a']} position={[0, 0.01, 0]} />
      {layout.districts.map((district) => (
        <group key={district.name} position={[district.x, 0, district.z]}>
          <mesh position={[0, 0.06, 0]} receiveShadow>
            <boxGeometry args={[district.width, 0.12, district.depth]} />
            <meshStandardMaterial color="#101713" roughness={0.9} metalness={0.2} />
          </mesh>
          <lineSegments position={[0, 0.14, 0]}>
            <edgesGeometry args={[new THREE.BoxGeometry(district.width, 0.14, district.depth)]} />
            <lineBasicMaterial color="#34483e" transparent opacity={0.6} />
          </lineSegments>
          <DistrictLabel name={district.name} width={district.width} />
        </group>
      ))}
    </group>
  )
}

interface BuildingsProps {
  snapshot: HistorySnapshot
  layout: CityLayout
  selectedPath?: string
  onSelect: (path?: string) => void
  comparison?: Map<string, ComparisonKind>
}

const comparisonColors: Record<ComparisonKind, string> = {
  added: '#63d8bd',
  deleted: '#ed6f5d',
  modified: '#ffb45c',
  renamed: '#82aaff',
}

function Buildings({ snapshot, layout, selectedPath, onSelect, comparison }: BuildingsProps) {
  const livingRef = useRef<THREE.InstancedMesh>(null)
  const ruinsRef = useRef<THREE.InstancedMesh>(null)
  const living = snapshot.files.filter((entry) => entry.alive)
  const ruins = snapshot.files.filter((entry) => !entry.alive)
  const touchedPaths = useMemo(() => new Set(snapshot.commit.files.map((entry) => entry.path)), [snapshot.commit])
  const scratch = useMemo(() => new THREE.Object3D(), [])
  const livingPaths = useRef<string[]>([])
  const ruinPaths = useRef<string[]>([])

  useEffect(() => {
    if (livingRef.current) {
      livingPaths.current = living.map((entry) => entry.path)
      living.forEach((entry, index) => {
        const placement = layout.buildings.get(entry.path)
        if (!placement) return
        const height = Math.min(15, Math.max(0.7, Math.log2(entry.lines + 1) * 1.16))
        scratch.position.set(placement.x, height / 2 + 0.18, placement.z)
        scratch.scale.set(placement.width, height, placement.depth)
        scratch.rotation.set(0, 0, 0)
        scratch.updateMatrix()
        livingRef.current?.setMatrixAt(index, scratch.matrix)
        const base = new THREE.Color(languageColors[entry.language] ?? languageColors.Other)
        const comparisonKind = comparison?.get(entry.path)
        if (comparisonKind) base.lerp(new THREE.Color(comparisonColors[comparisonKind]), 0.76)
        if (touchedPaths.has(entry.path)) base.lerp(new THREE.Color('#ffe0a3'), 0.52)
        livingRef.current?.setColorAt(index, base)
      })
      livingRef.current.instanceMatrix.needsUpdate = true
      if (livingRef.current.instanceColor) livingRef.current.instanceColor.needsUpdate = true
    }
    if (ruinsRef.current) {
      ruinPaths.current = ruins.map((entry) => entry.path)
      ruins.forEach((entry, index) => {
        const placement = layout.buildings.get(entry.path)
        if (!placement) return
        const height = Math.min(1.1, Math.max(0.25, Math.log2(entry.lines + 1) * 0.09))
        scratch.position.set(placement.x, height / 2 + 0.14, placement.z)
        scratch.scale.set(placement.width * 0.92, height, placement.depth * 0.92)
        scratch.rotation.set(0, ((index % 5) - 2) * 0.025, 0)
        scratch.updateMatrix()
        ruinsRef.current?.setMatrixAt(index, scratch.matrix)
        const comparisonKind = comparison?.get(entry.path)
        ruinsRef.current?.setColorAt(index, new THREE.Color(comparisonKind ? comparisonColors[comparisonKind] : index % 2 ? '#57382f' : '#493830'))
      })
      ruinsRef.current.instanceMatrix.needsUpdate = true
      if (ruinsRef.current.instanceColor) ruinsRef.current.instanceColor.needsUpdate = true
    }
  }, [living, ruins, layout, scratch, touchedPaths, comparison])

  const selectInstance = (event: ThreeEvent<MouseEvent>, paths: React.MutableRefObject<string[]>) => {
    event.stopPropagation()
    if (event.instanceId !== undefined) onSelect(paths.current[event.instanceId])
  }

  const selected = selectedPath ? snapshot.files.find((entry) => entry.path === selectedPath) : undefined
  const selectedLayout = selected ? layout.buildings.get(selected.path) : undefined
  const selectedHeight = selected ? Math.min(15, Math.max(0.7, Math.log2(selected.lines + 1) * 1.16)) : 0

  return (
    <group>
      {living.length > 0 && (
        <instancedMesh ref={livingRef} args={[undefined, undefined, living.length]} castShadow receiveShadow onClick={(event) => selectInstance(event, livingPaths)}>
          <boxGeometry />
          <meshStandardMaterial vertexColors roughness={0.58} metalness={0.35} emissive="#07100d" emissiveIntensity={0.2} />
        </instancedMesh>
      )}
      {ruins.length > 0 && (
        <instancedMesh ref={ruinsRef} args={[undefined, undefined, ruins.length]} receiveShadow onClick={(event) => selectInstance(event, ruinPaths)}>
          <boxGeometry />
          <meshStandardMaterial vertexColors roughness={1} metalness={0.05} />
        </instancedMesh>
      )}
      {selected && selectedLayout && (
        <mesh rotation-x={Math.PI / 2} position={[selectedLayout.x, (selected.alive ? selectedHeight : 0.5) + 0.35, selectedLayout.z]}>
          <torusGeometry args={[Math.max(selectedLayout.width, selectedLayout.depth) * 0.72, 0.055, 8, 32]} />
          <meshBasicMaterial color="#ffd28c" toneMapped={false} />
        </mesh>
      )}
    </group>
  )
}

function ChangeSignals({ snapshot, layout }: Pick<CitySceneProps, 'snapshot' | 'layout'>) {
  const signalsRef = useRef<THREE.InstancedMesh>(null)
  const changes = useMemo(() => snapshot.commit.files.filter((change) => layout.buildings.has(change.path)), [layout, snapshot.commit])
  const scratch = useMemo(() => new THREE.Object3D(), [])
  useEffect(() => {
    if (!signalsRef.current) return
    changes.forEach((change, index) => {
      const placement = layout.buildings.get(change.path)
      if (!placement) return
      const radius = Math.max(0.7, Math.min(2.2, Math.max(placement.width, placement.depth) * 0.85))
      scratch.position.set(placement.x, 0.34 + (index % 5) * 0.012, placement.z)
      scratch.rotation.set(Math.PI / 2, 0, 0)
      scratch.scale.setScalar(radius)
      scratch.updateMatrix()
      signalsRef.current?.setMatrixAt(index, scratch.matrix)
      signalsRef.current?.setColorAt(index, new THREE.Color(change.status === 'deleted' ? '#ed6f5d' : '#ffd08a'))
    })
    signalsRef.current.instanceMatrix.needsUpdate = true
    if (signalsRef.current.instanceColor) signalsRef.current.instanceColor.needsUpdate = true
  }, [changes, layout, scratch])
  if (changes.length === 0) return null
  return (
    <instancedMesh ref={signalsRef} args={[undefined, undefined, changes.length]}>
      <ringGeometry args={[0.72, 0.88, 24]} />
      <meshBasicMaterial vertexColors transparent opacity={0.82} side={THREE.DoubleSide} toneMapped={false} />
    </instancedMesh>
  )
}

function Travelers({ snapshot, layout, contributors, cinematicProgress }: Pick<CitySceneProps, 'snapshot' | 'layout' | 'contributors' | 'cinematicProgress'>) {
  const travelersRef = useRef<THREE.InstancedMesh>(null)
  const peopleById = useMemo(() => new Map(contributors.map((person) => [person.id, person])), [contributors])
  const travelers = useMemo(() => snapshot.travelers.filter((traveler) => layout.buildings.has(traveler.path)), [layout, snapshot.travelers])
  const scratch = useMemo(() => new THREE.Object3D(), [])
  useEffect(() => {
    if (!travelersRef.current) return
    travelers.forEach((traveler, index) => {
      const placement = layout.buildings.get(traveler.path)
      if (!placement) return
      const active = snapshot.commit.authorId === traveler.authorId
      scratch.position.set(placement.x + placement.width * 0.6, active ? 1.48 : 0.72, placement.z + placement.depth * 0.5)
      scratch.scale.setScalar(active ? 1.38 : 0.9)
      scratch.rotation.set(0, 0, 0)
      scratch.updateMatrix()
      travelersRef.current?.setMatrixAt(index, scratch.matrix)
      travelersRef.current?.setColorAt(index, new THREE.Color(peopleById.get(traveler.authorId)?.color ?? '#fff2d4'))
    })
    travelersRef.current.instanceMatrix.needsUpdate = true
    if (travelersRef.current.instanceColor) travelersRef.current.instanceColor.needsUpdate = true
  }, [layout, peopleById, scratch, snapshot.commit.authorId, travelers])

  const activeTraveler = travelers.find((traveler) => traveler.authorId === snapshot.commit.authorId)
  const activePlacement = activeTraveler ? layout.buildings.get(activeTraveler.path) : undefined
  const activePerson = activeTraveler ? peopleById.get(activeTraveler.authorId) : undefined
  return (
    <group>
      {travelers.length > 0 && (
        <instancedMesh ref={travelersRef} args={[undefined, undefined, travelers.length]} castShadow>
          <sphereGeometry args={[0.16, 12, 12]} />
          <meshBasicMaterial vertexColors toneMapped={false} />
        </instancedMesh>
      )}
      {activePlacement && cinematicProgress === undefined && (
        <Float speed={3} rotationIntensity={0} floatIntensity={0.5}>
          <pointLight position={[activePlacement.x + activePlacement.width * 0.6, 1.48, activePlacement.z + activePlacement.depth * 0.5]} color={activePerson?.color ?? '#ffcb85'} intensity={8} distance={5} decay={2} />
        </Float>
      )}
      {activePlacement && cinematicProgress !== undefined && (
        <pointLight
          position={[
            activePlacement.x + activePlacement.width * 0.6,
            1.48 + Math.sin(cinematicProgress * Math.PI * 24) * 0.08,
            activePlacement.z + activePlacement.depth * 0.5,
          ]}
          color={activePerson?.color ?? '#ffcb85'}
          intensity={8}
          distance={5}
          decay={2}
        />
      )}
    </group>
  )
}

function ReleaseEvent({ snapshot, span, cinematicProgress }: { snapshot: HistorySnapshot; span: number; cinematicProgress?: number }) {
  const ring = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (!ring.current) return
    const time = cinematicProgress === undefined ? clock.elapsedTime : cinematicProgress * 18
    const pulse = 1 + Math.sin(time * 2.6) * 0.06
    ring.current.scale.setScalar(pulse)
    ring.current.rotation.z = time * 0.08
  })
  if (!snapshot.isRelease) return null
  return (
    <mesh ref={ring} rotation-x={Math.PI / 2} position={[0, 0.38, 0]}>
      <torusGeometry args={[span * 0.42, 0.12, 10, 96]} />
      <meshBasicMaterial color="#ffdca2" transparent opacity={0.56} toneMapped={false} />
    </mesh>
  )
}

function MergeConfluence({ snapshot, span, cinematicProgress }: { snapshot: HistorySnapshot; span: number; cinematicProgress?: number }) {
  const confluence = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!confluence.current) return
    const time = cinematicProgress === undefined ? clock.elapsedTime : cinematicProgress * 18
    confluence.current.rotation.y = Math.sin(time * 0.45) * 0.08
    const pulse = 1 + Math.sin(time * 3) * 0.035
    confluence.current.scale.setScalar(pulse)
  })
  if (!snapshot.isMerge) return null
  const radius = Math.max(3, span * 0.16)
  return (
    <group ref={confluence} position={[0, 0.42, 0]}>
      <mesh rotation={[Math.PI / 2, 0, -0.56]} position={[-radius * 0.58, 0, 0]}>
        <torusGeometry args={[radius, 0.075, 8, 64, Math.PI * 1.42]} />
        <meshBasicMaterial color="#82aaff" transparent opacity={0.64} toneMapped={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, Math.PI + 0.56]} position={[radius * 0.58, 0.02, 0]}>
        <torusGeometry args={[radius, 0.075, 8, 64, Math.PI * 1.42]} />
        <meshBasicMaterial color="#63d8bd" transparent opacity={0.58} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 2.3, 0]} color="#9ebdff" intensity={32} distance={radius * 2.5} decay={2} />
    </group>
  )
}

function CinematicCamera({ progress, span }: { progress?: number; span: number }) {
  const { camera } = useThree()
  const target = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    if (progress === undefined) return
    const chapter = progress * Math.PI * 2
    const radius = span * (0.55 - Math.sin(progress * Math.PI) * 0.1)
    const height = span * (0.3 + Math.sin(progress * Math.PI * 1.3) * 0.08)
    target.set(
      Math.cos(chapter - 0.7) * radius,
      Math.max(7, height),
      Math.sin(chapter - 0.7) * radius,
    )
    camera.position.copy(target)
    camera.lookAt(0, Math.max(1.2, span * 0.025), 0)
  })
  return null
}

function SceneContents(props: Omit<CitySceneProps, 'onCanvas'>) {
  return (
    <>
      <fog attach="fog" args={['#080b0a', props.layout.span * 0.72, props.layout.span * 2.1]} />
      <ambientLight intensity={0.8} color="#9cb4a8" />
      <hemisphereLight args={['#afc8c2', '#130e0b', 1.2]} />
      <directionalLight position={[16, 28, -12]} intensity={3.4} color="#ffd6a0" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-far={120} />
      <pointLight position={[-18, 8, 12]} intensity={120} distance={48} color="#316b66" decay={2} />
      <CityGround layout={props.layout} />
      <Buildings snapshot={props.snapshot} layout={props.layout} selectedPath={props.selectedPath} onSelect={props.onSelect} comparison={props.comparison} />
      <ChangeSignals snapshot={props.snapshot} layout={props.layout} />
      <Travelers snapshot={props.snapshot} layout={props.layout} contributors={props.contributors} cinematicProgress={props.cinematicProgress} />
      <ReleaseEvent snapshot={props.snapshot} span={props.layout.span} cinematicProgress={props.cinematicProgress} />
      <MergeConfluence snapshot={props.snapshot} span={props.layout.span} cinematicProgress={props.cinematicProgress} />
      <CinematicCamera progress={props.cinematicProgress} span={props.layout.span} />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.06}
        minDistance={10}
        maxDistance={props.layout.span * 1.7}
        maxPolarAngle={Math.PI * 0.48}
        enabled={props.cinematicProgress === undefined}
        autoRotate={props.playing && props.cinematicProgress === undefined}
        autoRotateSpeed={0.22}
        target={[0, 1.5, 0]}
      />
    </>
  )
}

export function CityScene({ onCanvas, ...props }: CitySceneProps) {
  const renderDpr = props.renderWidth
    ? Math.max(1.65, Math.min(4, props.renderWidth / Math.max(1, window.innerWidth)))
    : [1, 1.65] as [number, number]
  return (
    <Canvas
      camera={{ position: [props.layout.span * 0.45, props.layout.span * 0.42, props.layout.span * 0.5], fov: 40, near: 0.1, far: 500 }}
      dpr={renderDpr}
      shadows
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true }}
      onCreated={({ gl }) => {
        gl.setClearColor('#080a09')
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.05
        onCanvas(gl.domElement)
      }}
      onPointerMissed={() => props.onSelect(undefined)}
    >
      <SceneContents {...props} />
    </Canvas>
  )
}

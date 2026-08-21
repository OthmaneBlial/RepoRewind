import type { FileSnapshot, RepositoryHistory } from './types'

export interface BuildingLayout {
  path: string
  district: string
  x: number
  z: number
  width: number
  depth: number
}

export interface DistrictLayout {
  name: string
  x: number
  z: number
  width: number
  depth: number
}

export interface CityLayout {
  buildings: Map<string, BuildingLayout>
  districts: DistrictLayout[]
  span: number
}

function hash(value: string): number {
  let result = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index)
    result = Math.imul(result, 16777619)
  }
  return result >>> 0
}

export interface CityLayoutOptions {
  finalFiles?: FileSnapshot[]
  paths?: Iterable<string>
}

export function buildCityLayout(history: RepositoryHistory, options: CityLayoutOptions = {}): CityLayout {
  const allPaths = new Set(options.paths ?? options.finalFiles?.map((file) => file.path) ?? [])
  if (!options.paths) {
    history.commits.forEach((commit) => commit.files.forEach((file) => {
      allPaths.add(file.path)
      if (file.previousPath) allPaths.add(file.previousPath)
    }))
  }

  const districtPaths = new Map<string, string[]>()
  allPaths.forEach((path) => {
    const district = path.includes('/') ? path.split('/')[0] : 'root'
    const paths = districtPaths.get(district) ?? []
    paths.push(path)
    districtPaths.set(district, paths)
  })

  const entries = Array.from(districtPaths.entries()).sort(([a], [b]) => a.localeCompare(b))
  const columns = Math.max(1, Math.ceil(Math.sqrt(entries.length)))
  const districtSize = Math.max(14, Math.ceil(Math.sqrt(Math.max(...entries.map(([, paths]) => paths.length), 1))) * 4.2)
  const avenue = 5
  const buildings = new Map<string, BuildingLayout>()
  const districts: DistrictLayout[] = []

  entries.forEach(([name, paths], districtIndex) => {
    const column = districtIndex % columns
    const row = Math.floor(districtIndex / columns)
    const districtX = (column - (columns - 1) / 2) * (districtSize + avenue)
    const rows = Math.ceil(entries.length / columns)
    const districtZ = (row - (rows - 1) / 2) * (districtSize + avenue)
    districts.push({ name, x: districtX, z: districtZ, width: districtSize, depth: districtSize })

    const grid = Math.ceil(Math.sqrt(paths.length))
    const cell = districtSize / Math.max(grid, 1)
    paths.sort((a, b) => hash(a) - hash(b)).forEach((path, pathIndex) => {
      const localColumn = pathIndex % grid
      const localRow = Math.floor(pathIndex / grid)
      const jitterX = ((hash(`${path}:x`) % 100) / 100 - 0.5) * cell * 0.12
      const jitterZ = ((hash(`${path}:z`) % 100) / 100 - 0.5) * cell * 0.12
      buildings.set(path, {
        path,
        district: name,
        x: districtX - districtSize / 2 + cell * (localColumn + 0.5) + jitterX,
        z: districtZ - districtSize / 2 + cell * (localRow + 0.5) + jitterZ,
        width: Math.max(0.8, cell * 0.58),
        depth: Math.max(0.8, cell * 0.58),
      })
    })
  })

  return {
    buildings,
    districts,
    span: columns * (districtSize + avenue),
  }
}

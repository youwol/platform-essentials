import { Json } from "../../..";


type Url = string


export interface LoadingGraph {

    graphType: string
    lock: { id: string, name: string, version: string }[]
    definition: Url[][] | [string, Url][][]
}


export interface Requirements {

    fluxPacks: string[]
    libraries: { [key: string]: string }
    loadingGraph: LoadingGraph
}


export interface FactoryId {

    module: string
    pack: string
}


export interface Module {

    configuration: Json
    moduleId: string
    factoryId: FactoryId
}


export interface Plugin {

    configuration: Json
    moduleId: string
    parentModuleId: string
    factoryId: FactoryId
}


export interface Slot {

    slotId: string
    moduleId: string
}


export interface Adaptor {

    mappingFunction: string
    adaptorId: string
}


export interface Connection {

    start: Slot
    end: Slot
    adaptor?: Adaptor
}


export interface Workflow {

    modules: Module[]
    plugins: Plugin[]
    connections: Connection[]
}


export interface ModuleView {

    moduleId: string
    xWorld: number
    yWorld: number
}


export interface ConnectionView {

    connectionId: string
    wireless: boolean
}


export interface BuilderRendering {

    modulesView: ModuleView[]
    connectionsView: ConnectionView[]
}


export interface RunnerRendering {

    layout: string
    css: string
}


export interface Project {

    name: string
    schemaVersion: string
    description: string
    requirements: Requirements
    workflow: Workflow
    builderRendering: BuilderRendering
    runnerRendering: RunnerRendering
}

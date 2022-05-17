import { ExplorerState, AnyFolderNode, AnyItemNode } from '../explorer'
import { AssetsBackend, AssetsGateway } from '@youwol/http-clients'
import { VirtualDOM } from '@youwol/flux-view'
import { install } from '@youwol/cdn-client'
import * as cdnClient from '@youwol/cdn-client'
import { forkJoin, from, Observable, of, ReplaySubject } from 'rxjs'
import { RequestsExecutor } from './requests-executot'
import { map, mergeMap, shareReplay, take } from 'rxjs/operators'
import { ChildApplicationAPI } from './platform.state'

type Json = any

export interface CdnClient {
    install: unknown
}

export interface FluxView {
    child$
    children$
    attr$
}

export interface ContextMenuAction {
    icon: string
    name: string
    authorized: boolean
    exe: () => void | Promise<void>
    applicable: () => boolean | Promise<boolean>
}

export interface AssetPreview {
    icon: string
    name: string
    exe: () => VirtualDOM | Promise<VirtualDOM>
    applicable: () => boolean | Promise<boolean>
}

export interface OpeningApplication {
    cdnPackage: string
    parameters: { [k: string]: string }
    applicable: () => boolean | Promise<boolean>
}

export interface Application {
    cdnPackage: string
    version: string
    name: string
    standalone: boolean
    disabled?: boolean
    graphics?: {
        background?: VirtualDOM
        iconFile?: VirtualDOM
        iconApp?: VirtualDOM
    }
}

type ApplicationDataValue = { [k: string]: Json[] }

export interface Manifest {
    id: string | string[]

    contextMenuActions?: (params: {
        node: AnyItemNode | AnyFolderNode
        explorer: ExplorerState
        cdnClient: CdnClient
        assetsGtwClient: AssetsGateway.AssetsGatewayClient
    }) => ContextMenuAction[]

    assetPreviews?: (params: {
        asset: AssetsBackend.GetAssetResponse
        cdnClient: CdnClient
        assetsGtwClient: AssetsGateway.AssetsGatewayClient
        fluxView: FluxView
    }) => AssetPreview[]

    openWithApps?: (params: {
        node: AnyItemNode | AnyFolderNode
    }) => OpeningApplication[]

    applications?: string[]

    applicationsData?: {
        [k: string]: ApplicationDataValue
    }
}

export interface OpenWithParametrization {
    name?: string
    match: { [k: string]: string } | string
    parameters: { [k: string]: string } | string
}

export interface AppExecutionInfo {
    standalone: boolean
    parametrized: OpenWithParametrization[]
}

export interface ApplicationInfo {
    cdnPackage: string
    displayName: string
    graphics?: {
        background?: VirtualDOM
        fileIcon?: VirtualDOM
        appIcon?: VirtualDOM
    }
    execution: AppExecutionInfo
}

type TInstaller = (installer: Installer) => Promise<Installer>

export function evaluateMatch(
    node: AnyItemNode,
    parametrization: OpenWithParametrization,
) {
    if (typeof parametrization.match == 'string') {
        return new Function(parametrization.match)()(node)
    }
    return Object.entries(parametrization.match).reduce((acc, [k, v]) => {
        return acc && node[k] == v
    }, true)
}

export function evaluateParameters(
    node: AnyItemNode,
    parametrization: OpenWithParametrization,
) {
    if (typeof parametrization.parameters == 'string') {
        return new Function(parametrization.parameters)()(node)
    }
    return Object.entries(parametrization.parameters).reduce((acc, [k, v]) => {
        return { ...acc, [k]: node[v] }
    }, {})
}

export class Installer {
    public readonly libraryManifests = new Set<string>()
    public readonly generatorManifests = new Set<TInstaller>()
    public readonly resolvedManifests = new Set<Manifest>()
    public readonly cdnClient = cdnClient

    static installManifest$: ReplaySubject<Manifest>
    static applicationsInfo$: ReplaySubject<ApplicationInfo[]>

    static defaultInstallJsScript = `
async function install(installer){
    return installer.with({
        fromLibraries:["@youwol/installer-youwol-dev"]
    })
}
return install
`
    static setInstallerScript({
        tsSrc,
        jsSrc,
    }: {
        tsSrc: string
        jsSrc: string
    }) {
        RequestsExecutor.saveInstallerScript({ tsSrc, jsSrc }).subscribe()
        new Function(jsSrc)()(new Installer())
            .then((installer) => installer.resolve())
            .then((manifest: Manifest) => {
                Installer.getInstallManifest$().next(manifest)
            })
    }

    static getInstallManifest$() {
        if (Installer.installManifest$) {
            return Installer.installManifest$
        }
        Installer.installManifest$ = new ReplaySubject<Manifest>(1)

        RequestsExecutor.getInstallerScript()
            .pipe(
                map(({ jsSrc }) =>
                    jsSrc
                        ? { jsSrc }
                        : { jsSrc: Installer.defaultInstallJsScript },
                ),
                mergeMap(({ jsSrc }) =>
                    from(Function(jsSrc)()(new Installer())),
                ),
                mergeMap((installer: Installer) => from(installer.resolve())),
            )
            .subscribe((manifest: Manifest) => {
                console.log('Manifest install', manifest)
                Installer.installManifest$.next(manifest)
            })
        return Installer.installManifest$
    }

    static getApplicationsInfo$() {
        if (Installer.applicationsInfo$) {
            return Installer.applicationsInfo$
        }
        Installer.applicationsInfo$ = new ReplaySubject<ApplicationInfo[]>(1)
        this.getInstallManifest$()
            .pipe(
                mergeMap((manifest) => {
                    const client = new AssetsGateway.AssetsGatewayClient().cdn
                    console.log('Installed Applications', manifest.applications)
                    if (manifest.applications.length == 0) {
                        return of([])
                    }
                    return forkJoin(
                        manifest.applications.map((cdnPackage) => {
                            return client
                                .getResource$({
                                    libraryId: btoa(cdnPackage),
                                    version: 'latest',
                                    restOfPath: '.yw_metadata.json',
                                })
                                .pipe(
                                    map((resp: any) => {
                                        return {
                                            ...resp,
                                            cdnPackage,
                                        } as unknown as ApplicationInfo
                                    }),
                                )
                        }),
                    )
                }),
            )
            .subscribe((d) => {
                Installer.applicationsInfo$.next(d)
            })
        return Installer.applicationsInfo$
    }

    constructor(
        params: {
            libraryManifests?
            generatorManifests?
            resolvedManifests?
        } = {},
    ) {
        Object.assign(this, params)
    }

    with(resolvableManifests: {
        fromLibraries?: string[]
        fromInstallingFunctions?: TInstaller[]
        fromManifests?: Manifest[]
    }) {
        const libraries = resolvableManifests.fromLibraries || []
        const generators = resolvableManifests.fromInstallingFunctions || []
        const manifests = resolvableManifests.fromManifests || []

        return new Installer({
            libraryManifests: new Set([...this.libraryManifests, ...libraries]),
            generatorManifests: new Set([
                ...this.generatorManifests,
                ...generators,
            ]),
            resolvedManifests: new Set([
                ...this.resolvedManifests,
                ...manifests,
            ]),
        })
    }

    async resolve(
        depth = 0,
        installed: unknown[] = [],
    ): Promise<Manifest | Manifest[]> {
        if (depth == 100) {
            throw Error(
                "Maximum recursion depth reached during installer's resolution",
            )
        }
        // we need to install only first layer => all inner dependencies are fetched by design
        if (depth == 0)
            await install({
                modules: [...this.libraryManifests].map(
                    (path) => path.split('.')[0],
                ),
            })

        const generatorsFromLibs = await Promise.all(
            [...this.libraryManifests].map((libraryPath) => {
                const libraryName = libraryPath.split('.')[0]
                const parent = libraryPath
                    .split('.')
                    .slice(1)
                    .reduce((acc, e) => acc[e], window[libraryName])
                return parent.install
            }),
        )
        const allGenerators = [
            ...this.generatorManifests,
            ...generatorsFromLibs,
        ]
        const generatorManifests = await Promise.all(
            [...new Set(allGenerators)].map((generator) => {
                if (installed.includes(generator)) {
                    return Promise.resolve(undefined)
                }
                installed.push(generator)
                return generator(new Installer()).then((installer) =>
                    installer.resolve(depth + 1, installed),
                )
            }),
        )
        const resolved = [...this.resolvedManifests, ...generatorManifests]
            .filter((g) => g != undefined)
            .flat()

        if (depth != 0) {
            return resolved
        }
        const resolvedSet = [...new Set(resolved)].filter(
            (value, index, self) =>
                self.map((s) => s.id).indexOf(value.id) === index,
        )
        const id = resolvedSet.map((r) => r.id)
        return {
            id,
            contextMenuActions: (p) =>
                resolvedSet
                    .filter((s) => s.contextMenuActions)
                    .map((s) => s.contextMenuActions(p))
                    .flat(),
            assetPreviews: (p) =>
                resolvedSet
                    .filter((s) => s.assetPreviews)
                    .map((s) => s.assetPreviews(p))
                    .flat(),
            applications: resolvedSet
                .filter((s) => s.applications)
                .map((s) => s.applications)
                .flat(),
            openWithApps: (p) =>
                resolvedSet
                    .filter((s) => s.openWithApps)
                    .map((s) => s.openWithApps(p))
                    .flat(),
            applicationsData: mergeApplicationsData(
                resolvedSet
                    .filter((s) => s.applicationsData)
                    .map((s) => s.applicationsData),
            ),
        }
    }
}

function mergeApplicationsData(data: { [k: string]: ApplicationDataValue }[]) {
    type PackageId = string
    const allPackages = data.map((d) => Object.keys(d)).flat()

    return allPackages.reduce((acc, id: PackageId) => {
        const matchingPackageValues = data
            .filter((d) => d[id] != undefined)
            .map((d) => d[id])
        const allKeys = matchingPackageValues.map((d) => Object.keys(d)).flat()
        const uniques = (d) => {
            return [
                ...new Map(d.map((obj) => [JSON.stringify(obj), obj])).values(),
            ]
        }
        const mergedPackageData = allKeys.reduce((acc2, key) => {
            return {
                ...acc2,
                [key]: uniques(
                    matchingPackageValues
                        .map((pack) => pack[key])
                        .filter((value) => value != undefined)
                        .reduce((acc3, e) => [...acc3, ...e], []),
                ),
            }
        }, {})
        return { ...acc, [id]: mergedPackageData }
    }, {})
}

function getFlatParametrizationList(appsInfo: ApplicationInfo[]) {
    return appsInfo
        .map((appInfo) =>
            appInfo.execution.parametrized.map((parametrization) => {
                return { appInfo, parametrization }
            }),
        )
        .flat()
}

export function defaultOpeningApp$<T>(assetNode: AnyItemNode): Observable<
    | {
          appInfo: ApplicationInfo
          parametrization: OpenWithParametrization
      }
    | undefined
> {
    return Installer.getApplicationsInfo$().pipe(
        map((appsInfo) => {
            return getFlatParametrizationList(appsInfo).find(
                ({ appInfo, parametrization }) =>
                    evaluateMatch(assetNode, parametrization),
            )
        }),
        shareReplay({ bufferSize: 1, refCount: true }),
    )
}

export function openingApps$<T>(assetNode: AnyItemNode): Observable<
    {
        appInfo: ApplicationInfo
        parametrization: OpenWithParametrization
    }[]
> {
    return Installer.getApplicationsInfo$().pipe(
        map((appsInfo) => {
            return getFlatParametrizationList(appsInfo).filter(
                ({ appInfo, parametrization }) =>
                    evaluateMatch(assetNode, parametrization),
            )
        }),
        shareReplay({ bufferSize: 1, refCount: true }),
    )
}

export function tryOpenWithDefault$(assetNode: AnyItemNode) {
    return defaultOpeningApp$(assetNode).pipe(
        take(1),
        mergeMap((info: { appInfo; parametrization } | undefined) => {
            return info
                ? ChildApplicationAPI.getOsInstance().createInstance$({
                      cdnPackage: info.appInfo.cdnPackage,
                      parameters: evaluateParameters(
                          assetNode,
                          info.parametrization,
                      ),
                      focus: true,
                      version: 'latest',
                  })
                : of(undefined)
        }),
    )
}

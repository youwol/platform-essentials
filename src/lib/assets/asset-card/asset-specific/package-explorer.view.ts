import { BehaviorSubject, Observable } from 'rxjs'
import {
    AssetsGateway,
    CdnBackend,
    raiseHTTPErrors,
} from '@youwol/http-clients'
import { mergeMap, share } from 'rxjs/operators'

import { child$, VirtualDOM } from '@youwol/flux-view'
import { getUrlBase } from '@youwol/cdn-client'

export class ExplorerState {
    public readonly asset: AssetsGateway.Asset
    public readonly version: string
    public readonly items$: Observable<CdnBackend.QueryExplorerResponse>
    public readonly selectedFolder$ = new BehaviorSubject<string>('')

    public readonly client = new AssetsGateway.Client().cdn

    constructor(params: { asset: AssetsGateway.Asset; version: string }) {
        Object.assign(this, params)

        this.items$ = this.selectedFolder$.pipe(
            mergeMap((folder) => {
                return this.client.queryExplorer$({
                    libraryId: this.asset.rawId,
                    version: this.version,
                    restOfPath: folder,
                })
            }),
            raiseHTTPErrors(),
            share(),
        )
    }

    openFolder(path: string) {
        this.selectedFolder$.next(path)
    }
}

export class FolderView {
    static ClassSelector = 'folder-view'
    public readonly class = `${FolderView.ClassSelector} d-flex align-items-center fv-pointer fv-hover-text-focus`
    public readonly children: VirtualDOM[]
    public readonly folder: CdnBackend.FolderResponse
    public readonly state: ExplorerState
    public readonly ondblclick: () => void

    constructor(params: {
        state: ExplorerState
        folder: CdnBackend.FolderResponse
    }) {
        Object.assign(this, params)
        this.children = [
            {
                class: 'w-25 d-flex align-items-center',
                children: [
                    { class: 'fas fa-folder px-2' },
                    { innerText: this.folder.name },
                ],
            },
            { class: 'w-25 text-center', innerText: this.folder.size / 1000 },
            { class: 'w-25 text-center', innerText: '-' },
        ]

        this.ondblclick = () => {
            this.state.openFolder(this.folder.path)
        }
    }
}

export class FileView {
    static ClassSelector = 'file-view'
    public readonly class = `${FileView.ClassSelector} d-flex align-items-center fv-pointer fv-hover-text-focus`
    public readonly children: VirtualDOM[]
    public readonly file: CdnBackend.FileResponse
    public readonly state: ExplorerState

    constructor(params: {
        file: CdnBackend.FileResponse
        state: ExplorerState
    }) {
        Object.assign(this, params)
        const url = `${getUrlBase(
            this.state.asset.name,
            this.state.version,
        )}/${this.state.selectedFolder$.getValue()}/${this.file.name}`
        this.children = [
            {
                class: 'w-25 d-flex align-items-center',
                children: [
                    { class: 'fas fa-file px-2' },
                    { innerText: this.file.name },
                ],
            },
            { class: 'w-25 text-center', innerText: this.file.size / 1000 },
            { class: 'w-25 text-center', innerText: this.file.encoding },
            {
                class: 'w-25 text-center fas fa-link',
                onclick: () => window.open(url, '_blank'),
            },
        ]
    }
}

export class ExplorerView {
    static ClassSelector = 'explorer-view'
    public readonly class = `${ExplorerView.ClassSelector} border rounded p-3 h-100 overflow-auto`
    public readonly state: ExplorerState
    public readonly children: VirtualDOM[]

    constructor(params: { asset: AssetsGateway.Asset; version: string }) {
        Object.assign(this, params)
        this.state = new ExplorerState(params)

        this.children = [
            child$(
                this.state.selectedFolder$,
                (path) => new PathView({ state: this.state, folderPath: path }),
            ),
            {
                class: 'd-flex align-items-center',
                style: {
                    fontWeight: 'bolder',
                },
                children: [
                    {
                        class: 'w-25 text-center',
                        innerText: 'Name',
                    },
                    {
                        class: 'w-25 text-center',
                        innerText: 'Size (kB)',
                    },
                    {
                        class: 'w-25 text-center',
                        innerText: 'Encoding',
                    },
                ],
            },
            child$(this.state.items$, ({ files, folders }) => {
                return {
                    class: 'd-flex flex-column',
                    children: [
                        ...folders.map(
                            (folder) =>
                                new FolderView({ state: this.state, folder }),
                        ),
                        ...files.map(
                            (file) => new FileView({ file, state: this.state }),
                        ),
                    ],
                }
            }),
        ]
    }
}

export class PathElementView {
    static ClassSelector = 'path-element-view'
    public readonly class = `${PathElementView.ClassSelector} d-flex align-items-center`
    public readonly state: ExplorerState
    public readonly name: string
    public readonly folderPath: string
    public readonly children: VirtualDOM[]
    public readonly onclick: () => void
    constructor(params: {
        folderPath: string
        name: string
        state: ExplorerState
    }) {
        Object.assign(this, params)

        this.children = [
            {
                class: 'border rounded p-1 mx-1 fv-pointer fv-hover-text-focus',
                innerText: this.name,
            },
            {
                innerText: '/',
            },
        ]

        this.onclick = () => {
            this.state.openFolder(this.folderPath)
        }
    }
}

export class PathView {
    static ClassSelector = 'path-view'
    public readonly class = `${PathView.ClassSelector} d-flex align-items-center my-2`
    public readonly children: VirtualDOM[]
    public readonly folderPath: string
    public readonly state: ExplorerState
    constructor(params: { state: ExplorerState; folderPath: string }) {
        Object.assign(this, params)
        const parts = this.folderPath.split('/')
        const elems = [
            {
                path: '',
                name: `${this.state.asset.name}@${this.state.version}`,
            },
            ...this.folderPath
                .split('/')
                .map((name, i) => {
                    return {
                        path: parts.slice(0, i + 1).join('/'),
                        name,
                    }
                })
                .filter(({ name }) => name != ''),
        ]

        this.children = elems.map((part) => {
            return new PathElementView({
                state: this.state,
                name: part.name,
                folderPath: part.path,
            })
        })
    }
}

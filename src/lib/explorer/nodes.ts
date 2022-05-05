import { ImmutableTree } from '@youwol/fv-tree'
import { BehaviorSubject, Observable, Subject } from 'rxjs'
import { delay, tap } from 'rxjs/operators'
import { AssetsGateway, RequestEvent } from '@youwol/http-clients'
import { v4 as uuidv4 } from 'uuid'
import { debugDelay } from './requests-executor'

type NodeEventType = 'item-added'

export class BrowserNode extends ImmutableTree.Node {
    name: string
    events$ = new Subject<{ type: NodeEventType }>()
    status$ = new BehaviorSubject<Array<{ type: string; id: string }>>([])
    icon: string

    origin?: AssetsGateway.Origin

    constructor(params: {
        id: string
        name: string
        icon?: string
        children?: Array<BrowserNode> | Observable<Array<BrowserNode>>
        origin?: AssetsGateway.Origin
    }) {
        super(params)
        Object.assign(this, params)
    }

    addStatus({ type, id }: { type: string; id?: string }) {
        id = id || this.id
        const newStatus = this.status$.getValue().concat({ type, id })
        this.status$.next(newStatus)
        return { type, id }
    }

    removeStatus({ type, id }: { type: string; id?: string }) {
        id = id || this.id
        const newStatus = this.status$
            .getValue()
            .filter((s) => s.type != type && s.id != id)
        this.status$.next(newStatus)
    }
    resolveChildren(): Observable<Array<BrowserNode>> {
        if (!this.children) {
            return
        }

        const uid = uuidv4()
        this.addStatus({ type: 'request-pending', id: uid })
        return super.resolveChildren().pipe(
            delay(debugDelay),
            tap(() => {
                this.removeStatus({ type: 'request-pending', id: uid })
            }),
        ) as Observable<Array<BrowserNode>>
    }
}

export function serialize(node: BrowserNode) {
    return JSON.stringify({
        id: node.id,
        name: node.name,
        origin: node.origin,
        icon: node.icon,
        children: Array.isArray(node.children)
            ? node.children.map((n) => serialize(n as BrowserNode))
            : [],
    })
}

type GroupKind = 'user' | 'users'

export class GroupNode extends BrowserNode {
    static iconsFactory: Record<GroupKind, string> = {
        user: 'fas fa-user',
        users: 'fas fa-users',
    }

    groupId: string
    kind: GroupKind

    constructor(params: {
        id: string
        name: string
        kind: GroupKind
        children?: Array<BrowserNode> | Observable<Array<BrowserNode>>
    }) {
        super({ ...params, icon: GroupNode.iconsFactory[params.kind] })
        Object.assign(this, params)
        this.groupId = params.id
    }
}

export class DriveNode extends BrowserNode {
    groupId: string
    driveId: string
    icon = 'fas fa-hdd'

    constructor(params: {
        groupId: string
        driveId: string
        name: string
        children?: Array<BrowserNode> | Observable<Array<BrowserNode>>
    }) {
        super({ ...params, id: params.driveId })
        Object.assign(this, params)
    }
}

type FolderKind = 'regular' | 'home' | 'download' | 'trash' | 'system'

export class FolderNode<T extends FolderKind> extends BrowserNode {
    static iconsFactory: Record<FolderKind, string> = {
        regular: 'fas fa-folder',
        home: 'fas fa-home',
        download: 'fas fa-shopping-cart',
        trash: 'fas fa-trash',
        system: 'fas fa-cogs',
    }

    folderId: string
    groupId: string
    driveId: string
    parentFolderId: string
    type: string
    metadata: string
    kind: T

    constructor(params: {
        folderId: string
        driveId: string
        groupId: string
        parentFolderId: string
        name: string
        type: string
        metadata: string
        children?: Array<BrowserNode> | Observable<Array<BrowserNode>>
        kind: T
        origin?: AssetsGateway.Origin
    }) {
        super({
            ...params,
            id: params.folderId,
            icon: FolderNode.iconsFactory[params.kind],
        })
        Object.assign(this, params)
    }
}

export type RegularFolderNode = FolderNode<'regular'>
export type HomeNode = FolderNode<'home'>
export type DownloadNode = FolderNode<'download'>
export type TrashNode = FolderNode<'trash'>
export type SystemNode = FolderNode<'system'>
export type AnyFolderNode = FolderNode<FolderKind>

export function instanceOfTrashFolder(folder: BrowserNode) {
    return folder instanceof FolderNode && folder.kind == 'trash'
}

export function instanceOfStandardFolder(folder: BrowserNode) {
    return (
        folder instanceof FolderNode &&
        (folder.kind == 'regular' ||
            folder.kind == 'home' ||
            folder.kind == 'download')
    )
}

export type ItemKind = 'data' | 'story' | 'flux-project' | 'package'

export class ItemNode<T extends ItemKind> extends BrowserNode {
    static iconsFactory: Record<ItemKind, string> = {
        data: 'fas fa-database',
        story: 'fas fa-book',
        'flux-project': 'fas fa-play',
        package: 'fas fa-box',
    }
    id: string
    name: string
    groupId: string
    driveId: string
    rawId: string
    assetId: string
    treeId: string
    borrowed: boolean
    kind: T
    icon: string

    constructor(params: {
        name: string
        groupId: string
        driveId: string
        assetId: string
        rawId: string
        treeId: string
        borrowed: boolean
        kind: T
        origin?: AssetsGateway.Origin
    }) {
        super({ ...params, children: undefined, id: params.treeId })

        Object.assign(this, params)
        this.icon = ItemNode.iconsFactory[this.kind]
    }
}

export type DataNode = ItemNode<'data'>
export type FluxProjectNode = ItemNode<'flux-project'>
export type StoryNode = ItemNode<'story'>
export type AnyItemNode = ItemNode<ItemKind>

export class FutureNode extends BrowserNode {
    onResponse: (unknown, BrowserNode) => void
    request: Observable<unknown>

    constructor(params: {
        icon: string
        name: string
        onResponse: (unknown, BrowserNode) => void
        request: Observable<unknown>
    }) {
        super({ ...params, id: uuidv4() })
        Object.assign(this, params)
    }
}

export class FutureItemNode extends FutureNode {}
export class FutureFolderNode extends FutureNode {}

export class DeletedNode extends BrowserNode {
    name: string
    driveId: string

    constructor({ id, name, driveId }) {
        super({ id, name, children: undefined })
        this.name = name
        this.driveId = driveId
    }
}

export class DeletedFolderNode extends DeletedNode {
    name: string
    driveId: string

    constructor({
        id,
        driveId,
        name,
    }: {
        id: string
        driveId: string
        name: string
    }) {
        super({ id, name, driveId })
    }
}
export class DeletedItemNode extends DeletedNode {
    name: string
    driveId: string
    type: string

    constructor({
        id,
        driveId,
        name,
        type,
    }: {
        id: string
        driveId: string
        name: string
        type: string
    }) {
        super({ id, name, driveId })
        this.type = type
    }
}

export class ProgressNode extends BrowserNode {
    public readonly progress$: Observable<RequestEvent>
    public readonly direction: 'upload' | 'download'
    constructor({
        id,
        name,
        progress$,
        direction,
    }: {
        id: string
        name: string
        progress$: Observable<RequestEvent>
        direction: 'upload' | 'download'
    }) {
        super({ id, name })
        this.progress$ = progress$
        this.direction = direction
    }
}

import { DockableTabs } from '@youwol/fv-tabs'
import { attr$, child$, VirtualDOM } from '@youwol/flux-view'
import { ImmutableTree } from '@youwol/fv-tree'
import { filter, map, mergeMap, take } from 'rxjs/operators'
import { AssetsGateway, TreedbBackend } from '@youwol/http-clients'
import { BehaviorSubject, Observable } from 'rxjs'
import { Select } from '@youwol/fv-input'

import {
    AnyFolderNode,
    AnyItemNode,
    BrowserNode,
    DeletedItemNode,
    ExplorerState,
    FutureItemNode,
    GroupNode,
    installContextMenu,
    ItemNode,
    RegularFolderNode,
    TreeGroup,
} from '../..'
import { Favorite, Favorites, GetGroupResponse } from '../../../core'

const leftNavClasses = 'fv-bg-background fv-x-lighter h-100 overflow-auto'
const leftNavStyle = {
    width: '300px',
}

export class SideNavTab extends DockableTabs.Tab {
    protected constructor(params: {
        id: string
        state: ExplorerState
        content: () => VirtualDOM
        title: string
        icon: string
    }) {
        super({ ...params, id: params.id })
    }
}

export class MySpaceTab extends SideNavTab {
    constructor(params: {
        state: ExplorerState
        selectedTab$: Observable<string>
    }) {
        super({
            id: 'MySpace',
            title: 'My space',
            icon: 'fas fa-user',
            state: params.state,
            content: () => {
                return child$(
                    params.selectedTab$.pipe(
                        filter((id) => id == 'MySpace'),
                        mergeMap(() => {
                            return params.state.defaultUserDrive$
                        }),
                        take(1),
                    ),
                    (defaultUserDrive) => {
                        return new GroupView({
                            explorerState: params.state,
                            treeGroup:
                                params.state.groupsTree[
                                    defaultUserDrive.groupId
                                ],
                        })
                    },
                )
            },
        })
        Object.assign(this, params)
    }
}

export class GroupTab extends SideNavTab {
    constructor(params: {
        state: ExplorerState
        group: GetGroupResponse
        selectedTab$: Observable<string>
    }) {
        super({
            id: `Group#${params.group.id}`,
            title: params.group.path.split('/').slice(-1)[0],
            icon: 'fas fa-map-pin',
            state: params.state,
            content: () => {
                return child$(
                    params.selectedTab$.pipe(
                        filter((id) => id == `Group#${params.group.id}`),
                        mergeMap(() => {
                            return params.state.selectGroup$(params.group.id)
                        }),
                        take(1),
                    ),
                    (treeGroup): VirtualDOM => {
                        return new GroupView({
                            explorerState: params.state,
                            treeGroup:
                                params.state.groupsTree[treeGroup.groupId],
                        })
                    },
                    {
                        untilFirst: {
                            class: 'fas fa-spinner fa-spin text-center',
                            style: leftNavStyle,
                        },
                    },
                )
            },
        })
        Object.assign(this, params)
    }
}

export class GroupsTab extends SideNavTab {
    constructor(params: {
        state: ExplorerState
        selectedTab$: Observable<string>
    }) {
        super({
            id: 'Groups',
            title: 'Groups',
            icon: 'fas fa-users',
            state: params.state,
            content: () => {
                return child$(
                    params.selectedTab$.pipe(
                        filter((id) => id == 'Groups'),
                        mergeMap(() => {
                            return params.state.userInfo$
                        }),
                        take(1),
                    ),
                    (userInfo: AssetsGateway.UserInfoResponse) => {
                        return new GroupsTabView({
                            explorerState: params.state,
                            userInfo,
                        })
                    },
                )
            },
        })
        Object.assign(this, params)
    }
}

export class GroupView implements VirtualDOM {
    public readonly class = leftNavClasses
    public readonly style = leftNavStyle

    public readonly children: VirtualDOM[]
    public readonly explorerState: ExplorerState
    public readonly treeGroup: TreeGroup

    constructor(params: {
        explorerState: ExplorerState
        treeGroup: TreeGroup
    }) {
        Object.assign(this, params)
        this.children = [
            child$(Favorites.getFolders$(), (favoritesFolder) => {
                return new FavoritesView({
                    explorerState: this.explorerState,
                    favoritesFolder: favoritesFolder.filter(
                        (f) => f.groupId == this.treeGroup.groupId,
                    ),
                })
            }),
            new TreeViewDrive({
                explorerState: this.explorerState,
                treeGroup: this.treeGroup,
            }),
        ]
    }
}
export class TreeViewDrive extends ImmutableTree.View<BrowserNode> {
    public readonly explorerState: ExplorerState
    public readonly treeGroup: TreeGroup
    static baseWrapperHeaderClass =
        'align-items-baseline fv-tree-header fv-hover-bg-background-alt rounded'
    static wrapperHeaderClassFct = (node) =>
        `${TreeViewDrive.baseWrapperHeaderClass} ${
            node instanceof GroupNode ? 'd-none' : 'd-flex '
        }`

    constructor(params: {
        explorerState: ExplorerState
        treeGroup: TreeGroup
    }) {
        super({
            state: params.treeGroup, //params.explorerState.groupsTree[params.groupId], //new TreeViewState(params),
            headerView: (_state, node: AnyFolderNode | AnyItemNode) => {
                if (
                    node instanceof ItemNode ||
                    node instanceof FutureItemNode ||
                    node instanceof DeletedItemNode
                ) {
                    return undefined
                }
                return new ExplorerFolderView({
                    treeGroup: this.treeGroup,
                    folderNode: node,
                })
            },
            options: {
                classes: {
                    header: TreeViewDrive.wrapperHeaderClassFct,
                    headerSelected: 'd-flex fv-text-focus',
                },
            },
            dropAreaView: () => ({ class: 'w-100 my-1' }),
        })
        Object.assign(this, params)
        this.treeGroup.expandedNodes$.next([
            this.treeGroup.groupId,
            this.treeGroup.defaultDriveId,
            this.treeGroup.homeFolderId,
        ])
        this.explorerState.openFolder$
            .pipe(
                take(1),
                filter(({ tree }) => tree == this.treeGroup),
            )
            .subscribe((d) => {
                this.treeGroup.selectNodeAndExpand(d.folder)
            })
    }
}

class GroupSelectItemData extends Select.ItemData {
    constructor(public readonly group: AssetsGateway.GroupResponse) {
        super(group.path, group.path.split('/').slice(-1)[0])
    }
}

export class GroupsTabView implements VirtualDOM {
    public readonly class = 'w-100'

    public readonly children: VirtualDOM[]
    public readonly explorerState: ExplorerState
    public readonly userInfo: AssetsGateway.UserInfoResponse
    public readonly group$: BehaviorSubject<AssetsGateway.GroupResponse>
    constructor(params: {
        explorerState: ExplorerState
        userInfo: AssetsGateway.UserInfoResponse
    }) {
        Object.assign(this, params)
        let sortGroup = (a, b) => (a.path.length < b.path.length ? -1 : 1)

        const displayedGroups = this.userInfo.groups
            .filter((g) => g.path != 'private')
            .sort(sortGroup)

        this.group$ = new BehaviorSubject<AssetsGateway.GroupResponse>(
            displayedGroups[0],
        )
        const itemsData = displayedGroups.map((g) => new GroupSelectItemData(g))

        const selectState = new Select.State(itemsData, itemsData[0].id)
        this.children = [
            {
                class: 'd-flex align-items-center',
                children: [
                    new Select.View({
                        state: selectState,
                        class: 'w-100',
                    } as any),
                    child$(
                        selectState.selection$.pipe(
                            map((s: GroupSelectItemData) => s.group),
                        ),
                        (group) =>
                            new GroupPinBtn({
                                explorerState: this.explorerState,
                                groupId: group.id,
                            }),
                    ),
                ],
            },
            child$(
                selectState.selection$.pipe(
                    mergeMap((item: GroupSelectItemData) =>
                        this.explorerState.selectGroup$(item.group.id),
                    ),
                ),
                (treeGroup) => {
                    return new GroupView({
                        explorerState: this.explorerState,
                        treeGroup,
                    })
                },
            ),
        ]
    }
}

export class GroupPinBtn implements VirtualDOM {
    public readonly children: VirtualDOM[]
    public readonly activated$ = new BehaviorSubject(true)
    public readonly explorerState: ExplorerState
    public readonly groupId: string

    public readonly onclick = () => {
        Favorites.toggleFavoriteGroup(this.groupId)
    }
    constructor(params: { explorerState: ExplorerState; groupId: string }) {
        Object.assign(this, params)
        console.log('GroupId', this.groupId)
        const baseClass =
            'fas fa-map-pin p-1 m-1 fv-hover-bg-background-alt rounded fv-pointer'
        this.children = [
            {
                class: attr$(
                    Favorites.getGroups$().pipe(
                        map(
                            (groups: Favorite[]) =>
                                groups.find(
                                    (group) => group.id == this.groupId,
                                ) != undefined,
                        ),
                    ),
                    (activated): string => (activated ? 'fv-text-focus' : ''),
                    { wrapper: (d) => `${d} ${baseClass}` },
                ),
            },
        ]
    }
}

export class FavoriteItemView implements VirtualDOM {
    public readonly class =
        'rounded fv-pointer px-1 m-1 fv-bg-background-alt fv-hover-xx-lighter'
    public readonly children: VirtualDOM[]
    public readonly explorerState: ExplorerState
    public readonly favoriteFolder: TreedbBackend.GetFolderResponse
    public readonly loadingFolder$ = new BehaviorSubject(false)
    constructor(params: {
        explorerState: ExplorerState
        favoriteFolder: TreedbBackend.GetFolderResponse
    }) {
        Object.assign(this, params)

        this.children = [
            {
                class: 'd-flex align-items-center',
                children: [
                    {
                        class: 'fas fa-map-pin mr-2',
                    },
                    {
                        innerText: this.favoriteFolder.name,
                    },
                    child$(this.loadingFolder$, (isLoading) => {
                        return isLoading
                            ? { class: 'fas fa-folder-open fv-blink px-1' }
                            : {}
                    }),
                ],
                onclick: () => {
                    this.loadingFolder$.next(true)
                    this.explorerState
                        .navigateTo$(this.favoriteFolder.folderId)
                        .subscribe(() => this.loadingFolder$.next(false))
                },
            },
        ]
    }
}

export class FavoritesView implements VirtualDOM {
    public readonly class = 'w-100 d-flex flex-wrap overflow-auto'
    public readonly style = {
        maxHeight: '25%',
    }
    public readonly children
    public readonly explorerState: ExplorerState
    public readonly favoritesFolder: TreedbBackend.GetFolderResponse[]

    constructor(params: {
        explorerState: ExplorerState
        favoritesFolder: TreedbBackend.GetFolderResponse[]
    }) {
        Object.assign(this, params)
        this.children = this.favoritesFolder.map((folder) => {
            return new FavoriteItemView({
                explorerState: this.explorerState,
                favoriteFolder: folder,
            })
        })
    }
}

export class ExplorerFolderView implements VirtualDOM {
    public readonly class = 'align-items-center fv-pointer w-100 d-flex'
    public readonly treeGroup: TreeGroup
    public readonly folderNode: AnyFolderNode

    public readonly onclick = () => {
        this.treeGroup.explorerState.openFolder(this.folderNode)
    }
    public readonly children: VirtualDOM[]

    public readonly connectedCallback = (elem: HTMLElement) => {
        installContextMenu({
            node: this.folderNode,
            div: elem,
            state: this.treeGroup.explorerState,
        })
    }
    constructor(params: { treeGroup: TreeGroup; folderNode: AnyFolderNode }) {
        Object.assign(this, params)

        this.children = [
            {
                class: `${this.folderNode.icon} mr-2`,
            },
            child$(
                this.folderNode.status$.pipe(
                    filter((status) =>
                        status.map((s) => s.type).includes('renaming'),
                    ),
                ),
                (): VirtualDOM => {
                    return this.headerRenamed()
                },
                {
                    untilFirst: {
                        innerText: this.folderNode.name,
                    },
                },
            ),
        ]
    }

    headerRenamed() {
        return {
            tag: 'input',
            type: 'text',
            autofocus: true,
            style: {
                zIndex: 200,
            },
            class: 'mx-2',
            value: this.folderNode.name,
            onclick: (ev) => ev.stopPropagation(),
            onkeydown: (ev) => {
                if (ev.key === 'Enter' && this.folderNode.kind == 'regular') {
                    this.treeGroup.explorerState.rename(
                        this.folderNode as RegularFolderNode,
                        ev.target.value,
                    )
                }
            },
            connectedCallback: (elem: HTMLElement) => {
                elem.focus()
            },
        }
    }
}

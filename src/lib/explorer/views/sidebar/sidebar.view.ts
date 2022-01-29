import {attr$, child$, children$, Stream$, VirtualDOM} from "@youwol/flux-view"
import {BehaviorSubject, merge, Observable} from "rxjs"
import {ExplorerState} from "../../explorer.state"
import {delay, mapTo, take} from "rxjs/operators"
import {AnyFolderNode, DownloadNode, DriveNode, HomeNode, TrashNode} from "../../nodes"
import {GroupResponse} from "../../../clients/assets-gateway"


class PredefinedFolderView implements VirtualDOM {

    class = 'd-flex align-items-center w-100 fv-text-primary'
    children: VirtualDOM[]

    constructor(
        state: ExplorerState,
        node: HomeNode | DownloadNode | TrashNode,
        extended$: BehaviorSubject<boolean>) {

        let faClass = node.icon
        let title = node.name
        let defaultClasses = `d-flex align-items-center fv-pointer my-3 flex-grow-1 rounded`
        this.children = [{
            class: attr$(
                state.currentFolder$,
                ({ folder }) => folder.kind == node.kind && folder.groupId == node.groupId
                    ? 'fv-text-focus fv-hover-text-primary'
                    : 'fv-text-primary'
                ,
                {
                    wrapper: (d) => `${d} ${defaultClasses} fv-hover-bg-secondary`,
                    untilFirst: `${defaultClasses} fv-text-primary fv-hover-bg-secondary`
                }
            ),
            children: [
                {
                    class: attr$(
                        extended$,
                        (extended) => extended ? 'px-2 flex-grow-1 ' : 'd-none'
                    ),
                    innerText: title
                },
                {
                    class: 'd-flex flex-column align-items-center',
                    children: [
                        child$(
                            merge(node.events$, node.events$.pipe(delay(10000), mapTo(undefined))),
                            (event) => event ? {
                                class: 'far fa-dot-circle fv-text-focus pb-1'
                            } : {}
                        ),
                        {
                            class: faClass + " ml-auto text-center",
                            style: { width: '30px' }
                        }
                    ]
                }
            ],
            onclick: () => {
                state.openFolder(node)
            }
        }
        ]
    }
}

export class PredefinedFoldersView implements VirtualDOM {

    children: Stream$<{ folder: AnyFolderNode | DriveNode }, VirtualDOM[]>

    constructor({ state, extended$ }: {
        state: ExplorerState,
        extended$: BehaviorSubject<boolean>
    }) {
        this.children = children$(
            state.openFolder$.pipe(take(1)),
            ({ folder }: { folder: DriveNode }) => {
                let tree = state.groupsTree[folder.groupId]
                let nodes = [
                    tree.getHomeNode(),
                    tree.getDownloadNode(),
                    tree.getTrashNode()
                ]
                return nodes
                    .map(node => new PredefinedFolderView(state, node as any, extended$))
            }
        )
    }
}

function formatGroups(groups: GroupResponse[]) {

    let isDirectParent = (child, maybeParent) => {
        return child.elements.slice(0, -1).reduce((acc, element, i) => acc && element == maybeParent.elements[i], true)
    }
    let formatted = groups.map((group) => {
        let elements = group.path.split('/')
        return { name: elements.slice(-1)[0], level: elements.length - 1, elements, id: group.id }
    }).sort((a, b) => a.level - b.level)
    let sorted = []
    formatted.forEach(group => {
        let index = sorted.findIndex((maybeParent) => isDirectParent(group, maybeParent))
        if (index) {
            sorted.splice(index + 1, 0, group)
        }
        else {
            sorted.push(group)
        }
    })
    return sorted
}

export class GroupView implements VirtualDOM {

    static ClassSelector = 'group-view'

    public readonly class = `${GroupView.ClassSelector} my-1 fv-pointer fv-hover-bg-secondary rounded`
    public readonly innerText: string
    public readonly style: { [key: string]: string }

    public readonly group
    public readonly state: ExplorerState

    public readonly onclick = () => this.state.selectGroup(this.group)

    constructor(params: { group: any, state: ExplorerState }) {
        Object.assign(this, params)

        this.innerText = this.group.name
        this.style = { paddingLeft: `${this.group.level * 15}px` }
    }
}


export class GroupsView implements VirtualDOM {

    static ClassSelector = 'groups-view'
    public readonly class = `${GroupsView.ClassSelector} pl-2 w-100 my-4`

    public readonly children: Array<VirtualDOM>

    public readonly groupsExpanded$ = new BehaviorSubject(false)
    public readonly extended$: Observable<boolean>
    public readonly groups: GroupResponse[]
    public readonly state: ExplorerState

    constructor(params: {
        state: ExplorerState,
        groups: GroupResponse[],
        extended$: Observable<boolean>
    }) {
        Object.assign(this, params)
        this.children = [
            {
                class: attr$(
                    this.extended$,
                    (extended) => extended ? 'd-flex flex-column' : 'd-none',
                    { wrapper: (d) => `${d} fv-text-primary w-100` }
                ),
                children: [
                    this.headerView(),
                    child$(
                        this.groupsExpanded$,
                        (expanded) => expanded ? this.groupsView() : {}
                    )
                ]
            }
        ]
    }

    groupsView(): VirtualDOM {

        return {
            class: 'border-left ml-2',
            children: formatGroups(this.groups)
                .filter(({ name }) => name != 'private')
                .map(group => new GroupView({ group, state: this.state }))
        }
    }

    headerView(): VirtualDOM {
        return {
            class: 'd-flex align-items-center fv-text-primary w-100',
            children: [
                {
                    class: 'd-flex align-items-center fv-pointer',
                    onclick: () => this.groupsExpanded$.next(!this.groupsExpanded$.getValue()),
                    children: [{
                        class: attr$(
                            this.groupsExpanded$,
                            (expanded) => expanded ? 'fa-chevron-circle-down' : 'fa-chevron-circle-right',
                            {wrapper: (d) => `${d} fas mr-2`}
                        )
                    },
                        {
                            innerText: 'Groups'
                        }
                    ]
                },
                {
                    class: 'fas fa-users text-center ml-auto ',
                    style: { width: '30px' }
                }
            ]
        }
    }
}

export class SideBarView implements VirtualDOM {

    static ClassSelector = "side-bar-view"
    public readonly class = `${SideBarView.ClassSelector} fv-bg-background  pt-1 px-2 border-right h-100`

    public readonly style: any
    public readonly children: VirtualDOM[]

    constructor(
        public readonly state: ExplorerState,
        public readonly extended$: BehaviorSubject<boolean>
    ) {

        this.style = attr$(
            extended$,
            (extended) => extended
                ? {
                    width: '250px'
                } : {width: 'auto'}
        )

        this.children = [
            {
                class: "w-100 fv-text-primary text-right mb-3",
                children: [
                    {
                        class: 'ml-auto fas fa-bars fv-pointer fv-hover-text-focus',
                        onclick: () => {
                            extended$.next(!extended$.getValue())
                        }
                    }
                ]
            },
            child$(
                state.currentFolder$.pipe(take(1)),
                () => new PredefinedFoldersView({state, extended$})
            ),
            child$(
                state.userInfo$,
                (userInfo) => new GroupsView({state, groups: userInfo.groups, extended$})
            )
        ]
    }
}
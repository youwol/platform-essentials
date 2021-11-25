
import { Observable, of } from 'rxjs'
import { map } from 'rxjs/operators'
import { AssetsGatewayClient } from '..'
import { PlatformState, SelectedItem } from './platform.state'
import {
    AnyFolderNode, AnyItemNode, DataNode, DeletedNode, DriveNode, FolderNode, FutureNode,
    GroupNode, ItemNode, ProgressNode, RegularFolderNode, TrashNode
} from './nodes'

export interface Action {
    icon: string
    name: string,
    enable: boolean,
    exe: () => void,
    applicable: () => boolean
}
export type ActionConstructor = (state: PlatformState, { node, selection }: SelectedItem, permissions) => Action


export let GENERIC_ACTIONS = {
    rename: (state: PlatformState, { node, selection }: SelectedItem, permissions) => ({
        icon: 'fas fa-pen',
        name: 'rename',
        enable: true,
        applicable: () => {

            if (selection == 'indirect' || !permissions.write)
                return false
            if (node instanceof FolderNode && node.kind != 'regular')
                return false
            if (node instanceof ItemNode && node.borrowed)
                return false

            return node instanceof FolderNode || node instanceof DriveNode
        },
        exe: () => { node.addStatus({ type: 'renaming' }) }
    }),
    newFolder: (state: PlatformState, { node, selection }: SelectedItem, permissions) => ({
        icon: 'fas fa-folder',
        name: 'new folder',
        enable: permissions.write,
        applicable: () => {
            return selection == 'indirect' && (node instanceof FolderNode || node instanceof DriveNode)
        },
        exe: () => { state.newFolder(node as any) }
    }),
    download: (state: PlatformState, { node, selection }: SelectedItem, permissions) => ({
        icon: 'fas fa-download', name: 'download file',
        enable: true,
        applicable: () => node instanceof ItemNode && node.kind == 'data' && permissions.write,
        exe: () => {
            let nodeData = node as DataNode
            let anchor = document.createElement('a') as HTMLAnchorElement
            anchor.setAttribute("href", `/api/assets-gateway/raw/data/${nodeData.rawId}`)
            anchor.setAttribute("download", nodeData.name)
            anchor.dispatchEvent(new MouseEvent('click'))
            anchor.remove()
        }
    }),
    deleteFolder: (state: PlatformState, { node, selection }: SelectedItem, permissions) => ({
        icon: 'fas fa-trash',
        name: 'delete',
        enable: permissions.write,
        applicable: () => node instanceof FolderNode && selection == 'direct',
        exe: () => { state.deleteFolder(node as any) }
    }),
    clearTrash: (state: PlatformState, { node, selection }: SelectedItem, permissions) => ({
        icon: 'fas fa-times',
        name: 'clear trash',
        enable: permissions.write,
        applicable: () => node instanceof FolderNode && node.kind == 'trash',
        exe: () => { state.purgeDrive(node as TrashNode) }
    }),
    newFluxProject: (state: PlatformState, { node, selection }: SelectedItem, permissions) => ({
        icon: 'fas fa-sitemap',
        name: 'new app',
        enable: permissions.write,
        applicable: () => selection == 'indirect' && node instanceof FolderNode,
        exe: () => { state.flux.new(node as any) }
    }),
    newStory: (state: PlatformState, { node, selection }: SelectedItem, permissions) => ({
        icon: 'fas fa-book',
        name: 'new story',
        enable: permissions.write,
        applicable: () => selection == 'indirect' && node instanceof FolderNode,
        exe: () => { state.story.new(node as any) }
    }),
    paste: (state: PlatformState, { node, selection }: SelectedItem, permissions) => ({
        icon: 'fas fa-paste',
        name: 'paste',
        enable: permissions.write && state.itemCut != undefined,
        applicable: () => selection == 'indirect' && node instanceof FolderNode && permissions.write,
        exe: () => { state.pasteItem(node as AnyFolderNode) }
    }),
    cut: (state: PlatformState, { node, selection }: SelectedItem, permissions) => ({
        icon: 'fas fa-cut',
        name: 'cut',
        enable: true,
        applicable: () => {
            if (!permissions.write || selection == 'indirect')
                return false
            if (node instanceof ItemNode)
                return !node.borrowed

            return node instanceof FolderNode
        },
        exe: () => { state.cutItem(node as (AnyItemNode | RegularFolderNode)) }
    }),
    borrowItem: (state: PlatformState, { node, selection }: SelectedItem, permissions) => ({
        icon: 'fas fa-link',
        name: 'borrow item',
        enable: permissions.share,
        applicable: () => node instanceof ItemNode,
        exe: () => {
            state.borrowItem(node as AnyItemNode)
        }
    }),
    importData: (state: PlatformState, { node, selection }: SelectedItem, permissions) => ({
        icon: 'fas fa-file-import',
        name: 'import data',
        enable: permissions.write,
        applicable: () => selection == 'indirect' && node instanceof FolderNode,
        exe: () => {
            let input = document.createElement('input') as HTMLInputElement
            input.setAttribute("type", "file")
            input.setAttribute("multiple", "true")
            input.dispatchEvent(new MouseEvent('click'))
            input.onchange = (ev) => {
                state.data.import(node as AnyFolderNode, input)
                input.remove()
            }
        }
    }),
    deleteItem: (state: PlatformState, { node, selection }: SelectedItem, permissions) => ({
        icon: 'fas fa-trash',
        name: 'delete',
        enable: permissions.write,
        applicable: () => node instanceof ItemNode,
        exe: () => { state.deleteItem(node as AnyItemNode) }
    })
}


export function getActions$(
    state: PlatformState,
    item: SelectedItem,
    actionsList: ActionConstructor[]
): Observable<Array<Action>> {

    if (item.node instanceof FutureNode || item.node instanceof ProgressNode) {
        return of([])
    }
    if (item.node instanceof DeletedNode)
        return of([]) // restore at some point

    if (item.node instanceof GroupNode) {
        // a service should return permissions of the current user for the group
        // for now, everybody can do everything
        let actions = actionsList.map(
            action => action(state, item, { read: true, write: true, share: true })
        )
            .filter(a => a.applicable())
        return of(actions)
    }

    let id = (item.node instanceof FolderNode && item.node.kind == 'trash')
        ? item.node.driveId
        : item.node.id

    return new AssetsGatewayClient().permissions$(id)
        .pipe(
            map(permissions => ({ state, item: item, permissions })),
            map(({ state, item, permissions }) => {

                return actionsList.map(
                    action => action(state, item, permissions)
                )
                    .filter(a => a.applicable())
            })
        )
}

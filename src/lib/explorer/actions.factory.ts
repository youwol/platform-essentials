import { attr$, child$ } from '@youwol/flux-view'
import { Observable, of } from 'rxjs'
import { map } from 'rxjs/operators'
import { ChildApplicationAPI, Executable } from '../core'
import { ExplorerState, SelectedItem } from './explorer.state'
import { AssetsGateway as Gtw } from '@youwol/http-clients'
import {
    AnyFolderNode,
    AnyItemNode,
    BrowserNode,
    DataNode,
    DeletedNode,
    DriveNode,
    instanceOfStandardFolder,
    FolderNode,
    FutureNode,
    GroupNode,
    ItemNode,
    ProgressNode,
    RegularFolderNode,
    TrashNode,
} from './nodes'
import { isLocalYouwol } from './utils'

export interface Action {
    sourceEventNode: BrowserNode
    icon: string
    name: string
    enable: boolean
    exe: () => void
    applicable: () => boolean
}

export type ActionConstructor = (
    state: ExplorerState,
    { node, selection }: SelectedItem,
    permissions,
) => Action

export const GENERIC_ACTIONS = {
    rename: (
        state: ExplorerState,
        { node, selection }: SelectedItem,
        permissions,
    ) => ({
        sourceEventNode: node,
        icon: 'fas fa-pen',
        name: 'rename',
        enable: true,
        applicable: () => {
            if (selection == 'indirect' || !permissions.write) {
                return false
            }
            if (node instanceof FolderNode && node.kind != 'regular') {
                return false
            }
            if (node instanceof ItemNode && node.borrowed) {
                return false
            }

            return (
                node instanceof FolderNode ||
                node instanceof ItemNode ||
                node instanceof DriveNode
            )
        },
        exe: () => {
            node.addStatus({ type: 'renaming' })
        },
    }),
    newFolder: (
        state: ExplorerState,
        { node, selection }: SelectedItem,
        permissions,
    ) => ({
        sourceEventNode: node,
        icon: 'fas fa-folder',
        name: 'new folder',
        enable: permissions.write,
        applicable: () => {
            return (
                selection == 'indirect' &&
                (instanceOfStandardFolder(node) || node instanceof DriveNode)
            )
        },
        exe: () => {
            state.newFolder(node as AnyFolderNode | DriveNode)
        },
    }),
    download: (state: ExplorerState, { node }: SelectedItem, permissions) => ({
        sourceEventNode: node,
        icon: 'fas fa-download',
        name: 'download file',
        enable: true,
        applicable: () =>
            node instanceof ItemNode &&
            node.kind == 'data' &&
            permissions.write,
        exe: () => {
            const nodeData = node as DataNode
            const anchor = document.createElement('a')
            anchor.setAttribute(
                'href',
                `/api/assets-gateway/raw/data/${nodeData.rawId}`,
            )
            anchor.setAttribute('download', nodeData.name)
            anchor.dispatchEvent(new MouseEvent('click'))
            anchor.remove()
        },
    }),
    upload: (state: ExplorerState, { node }: SelectedItem) => ({
        sourceEventNode: node,
        icon: 'fas fa-upload',
        name: 'upload asset',
        enable: true,
        applicable: () => {
            return (
                isLocalYouwol() &&
                node instanceof ItemNode &&
                node.origin &&
                node.origin.local
            )
        },
        exe: () => {
            state.uploadAsset(node as AnyItemNode)
        },
    }),
    deleteFolder: (
        state: ExplorerState,
        { node, selection }: SelectedItem,
    ) => ({
        sourceEventNode: node,
        icon: 'fas fa-trash',
        name: 'delete',
        enable: true /*permissions.write*/,
        applicable: () =>
            node instanceof FolderNode &&
            selection == 'direct' /*&& node.kind == 'regular'*/,
        exe: () => {
            state.deleteFolder(node as RegularFolderNode)
        },
    }),
    deleteDrive: (state: ExplorerState, { node, selection }: SelectedItem) => ({
        sourceEventNode: node,
        icon: 'fas fa-trash',
        name: 'delete drive',
        enable: true /*permissions.write*/,
        applicable: () => node instanceof DriveNode && selection == 'direct',
        exe: () => {
            state.deleteDrive(node as DriveNode)
        },
    }),
    clearTrash: (state: ExplorerState, { node }: SelectedItem) => ({
        sourceEventNode: node,
        icon: 'fas fa-times',
        name: 'clear trash',
        enable: true /*permissions.write*/,
        applicable: () => node instanceof FolderNode && node.kind == 'trash',
        exe: () => {
            state.purgeDrive(node as TrashNode)
        },
    }),
    newFluxProject: (
        state: ExplorerState,
        { node, selection }: SelectedItem,
        permissions,
    ) => ({
        sourceEventNode: node,
        icon: 'fas fa-sitemap',
        name: 'new app',
        enable: permissions.write,
        applicable: () =>
            selection == 'indirect' && instanceOfStandardFolder(node),
        exe: () => {
            state.flux.new(node as AnyFolderNode)
        },
    }),
    newStory: (
        state: ExplorerState,
        { node, selection }: SelectedItem,
        permissions,
    ) => ({
        sourceEventNode: node,
        icon: 'fas fa-book',
        name: 'new story',
        enable: permissions.write,
        applicable: () =>
            selection == 'indirect' && instanceOfStandardFolder(node),
        exe: () => {
            state.story.new(node as AnyFolderNode)
        },
    }),
    paste: (
        state: ExplorerState,
        { node, selection }: SelectedItem,
        permissions,
    ) => ({
        sourceEventNode: node,
        icon: 'fas fa-paste',
        name: 'paste',
        enable: permissions.write && state.itemCut != undefined,
        applicable: () =>
            selection == 'indirect' &&
            instanceOfStandardFolder(node) &&
            permissions.write,
        exe: () => {
            state.pasteItem(node as AnyFolderNode)
        },
    }),
    cut: (
        state: ExplorerState,
        { node, selection }: SelectedItem,
        permissions,
    ) => ({
        sourceEventNode: node,
        icon: 'fas fa-cut',
        name: 'cut',
        enable: true,
        applicable: () => {
            if (!permissions.write || selection == 'indirect') {
                return false
            }
            if (node instanceof ItemNode) {
                return !node.borrowed
            }

            return instanceOfStandardFolder(node)
        },
        exe: () => {
            state.cutItem(node as AnyItemNode | RegularFolderNode)
        },
    }),
    borrowItem: (
        state: ExplorerState,
        { node }: SelectedItem,
        permissions,
    ) => ({
        sourceEventNode: node,
        icon: 'fas fa-link',
        name: 'borrow item',
        enable: permissions.share,
        applicable: () => node instanceof ItemNode,
        exe: () => {
            state.borrowItem(node as AnyItemNode)
        },
    }),
    importData: (
        state: ExplorerState,
        { node, selection }: SelectedItem,
        permissions,
    ) => ({
        sourceEventNode: node,
        icon: 'fas fa-file-import',
        name: 'import data',
        enable: permissions.write,
        applicable: () =>
            selection == 'indirect' && instanceOfStandardFolder(node),
        exe: () => {
            const input = document.createElement('input')
            input.setAttribute('type', 'file')
            input.setAttribute('multiple', 'true')
            input.dispatchEvent(new MouseEvent('click'))
            input.onchange = () => {
                state.data.import(node as AnyFolderNode, input)
                input.remove()
            }
        },
    }),
    deleteItem: (
        state: ExplorerState,
        { node }: SelectedItem,
        permissions,
    ) => ({
        sourceEventNode: node,
        icon: 'fas fa-trash',
        name: 'delete',
        enable: permissions.write,
        applicable: () => node instanceof ItemNode,
        exe: () => {
            state.deleteItemOrFolder(node as AnyItemNode)
        },
    }),
    refresh: (state: ExplorerState, { node }: SelectedItem, permissions) => ({
        sourceEventNode: node,
        icon: 'fas fa-sync-alt',
        name: 'refresh',
        enable: permissions.read,
        applicable: () => node instanceof FolderNode,
        exe: () => {
            state.refresh(node as AnyFolderNode)
        },
    }),
}

export function getActions$(
    state: ExplorerState,
    selectedItem: SelectedItem,
    actionsList: ActionConstructor[],
): Observable<Array<Action>> {
    if (
        selectedItem.node instanceof FutureNode ||
        selectedItem.node instanceof ProgressNode
    ) {
        return of([])
    }
    if (selectedItem.node instanceof DeletedNode) {
        return of([])
    } // restore at some point

    if (selectedItem.node instanceof GroupNode) {
        // a service should return permissions of the current user for the group
        // for now, everybody can do everything
        const actions = actionsList
            .map((action) =>
                action(state, selectedItem, {
                    read: true,
                    write: true,
                    share: true,
                }),
            )
            .filter((a) => a.applicable())
        return of(actions)
    }

    const id =
        selectedItem.node instanceof FolderNode &&
        selectedItem.node.kind == 'trash'
            ? selectedItem.node.driveId
            : selectedItem.node.id

    return new Gtw.AssetsGatewayClient().explorerDeprecated
        .getPermissions$(id)
        .pipe(
            map((permissions) => ({ item: selectedItem, permissions })),
            map(({ item, permissions }) => {
                return actionsList
                    .map((action) => action(state, item, permissions))
                    .filter((a) => a.applicable())
            }),
        )
}

export function openWithActionFromExe(app: Executable) {
    return {
        icon: child$(app.appMetadata$, ({ icon }) => icon),
        name: attr$(app.appMetadata$, ({ name }) => name), //app.name,
        enable: true,
        exe: () => {
            ChildApplicationAPI.getOsInstance()
                .createInstance$({
                    cdnPackage: app.cdnPackage,
                    parameters: app.parameters,
                    focus: true,
                    version: app.version,
                })
                .subscribe()
        },
        applicable: () => true,
    }
}

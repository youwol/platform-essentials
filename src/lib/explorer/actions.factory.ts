import { attr$, child$ } from '@youwol/flux-view'
import { forkJoin, Observable, of } from 'rxjs'
import { map } from 'rxjs/operators'
import { ChildApplicationAPI, Executable } from '../core'
import { ExplorerState } from './explorer.state'
import {
    AssetsGateway,
    AssetsGateway as Gtw,
    raiseHTTPErrors,
} from '@youwol/http-clients'
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
    ItemNode,
    ProgressNode,
    RegularFolderNode,
    TrashNode,
} from './nodes'
import { isLocalYouwol, popupAssetCardView } from './utils'

export type Section = 'Modify' | 'Move' | 'New' | 'IO' | 'Disposition' | 'Info'
export interface Action {
    sourceEventNode: BrowserNode
    icon: string
    name: string
    authorized: boolean
    exe: () => void
    applicable: () => boolean
    section: Section
}

export interface GroupPermissions {
    write: boolean
}

export interface OverallPermissions {
    group: GroupPermissions
    item?: AssetsGateway.PermissionsResp
}

export type ActionConstructor = (
    state: ExplorerState,
    node: BrowserNode,
    permissions: OverallPermissions,
) => Action

/**
 * fetch the permissions of the current user regarding a group management
 */
function fetchGroupPermissions$(_groupId: string) {
    return of({
        write: true,
    })
}

/**
 * fetch the permissions of the current user regarding an asset
 */
function fetchItemPermissions$(node: AnyItemNode) {
    if (node.origin && !node.origin.local) {
        return of({
            write: false,
            read: true,
            share: false,
        })
    }
    return new Gtw.AssetsGatewayClient().assets
        .getPermissions$({
            assetId: node.assetId,
        })
        .pipe(raiseHTTPErrors())
}

function hasItemModifyPermission(
    node: BrowserNode,
    permissions: OverallPermissions,
) {
    if (!permissions.item) return false

    if (!permissions.item.write || !permissions.group.write) {
        return false
    }
    return !(node.origin && !node.origin.local)
}

function hasItemSharePermission(
    node: BrowserNode,
    permissions: OverallPermissions,
) {
    return permissions.item && permissions.item.share
}

function hasGroupModifyPermissions(permissions: OverallPermissions) {
    return permissions.group.write
}

export const GENERIC_ACTIONS: { [k: string]: ActionConstructor } = {
    renameItem: (
        state: ExplorerState,
        node: BrowserNode,
        permissions: OverallPermissions,
    ) => ({
        sourceEventNode: node,
        icon: 'fas fa-pen',
        name: 'rename',
        section: 'Modify',
        authorized: hasItemModifyPermission(node, permissions),
        applicable: () => {
            return node instanceof ItemNode
        },
        exe: () => {
            node.addStatus({ type: 'renaming' })
        },
    }),
    renameFolder: (
        state: ExplorerState,
        node: BrowserNode,
        permissions: OverallPermissions,
    ) => ({
        sourceEventNode: node,
        icon: 'fas fa-pen',
        name: 'rename',
        section: 'Modify',
        authorized: hasGroupModifyPermissions(permissions),
        applicable: () => {
            return node instanceof FolderNode && node.kind == 'regular'
        },
        exe: () => {
            node.addStatus({ type: 'renaming' })
        },
    }),
    newFolder: (
        state: ExplorerState,
        node: BrowserNode,
        permissions: OverallPermissions,
    ) => ({
        sourceEventNode: node,
        icon: 'fas fa-folder',
        name: 'new folder',
        section: 'New',
        authorized: hasGroupModifyPermissions(permissions),
        applicable: () => {
            return instanceOfStandardFolder(node) || node instanceof DriveNode
        },
        exe: () => {
            state.newFolder(node as AnyFolderNode | DriveNode)
        },
    }),
    download: (state: ExplorerState, node: BrowserNode) => ({
        sourceEventNode: node,
        icon: 'fas fa-download',
        name: 'download file',
        section: 'IO',
        authorized: true,
        applicable: () => node instanceof ItemNode && node.kind == 'data',
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
    upload: (state: ExplorerState, node: BrowserNode) => ({
        sourceEventNode: node,
        icon: 'fas fa-upload',
        name: 'upload asset',
        section: 'IO',
        authorized: true,
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
        node: BrowserNode,
        permissions: OverallPermissions,
    ) => ({
        sourceEventNode: node,
        icon: 'fas fa-trash',
        name: 'delete',
        section: 'Modify',
        authorized: hasGroupModifyPermissions(permissions),
        applicable: () => {
            return node instanceof FolderNode && node.kind == 'regular'
        },
        exe: () => {
            state.deleteItemOrFolder(node as RegularFolderNode)
        },
    }),
    deleteDrive: (
        state: ExplorerState,
        node: BrowserNode,
        permissions: OverallPermissions,
    ) => ({
        sourceEventNode: node,
        icon: 'fas fa-trash',
        name: 'delete drive',
        section: 'Modify',
        authorized: hasGroupModifyPermissions(permissions),
        applicable: () => {
            return node instanceof DriveNode
        },
        exe: () => {
            state.deleteDrive(node as DriveNode)
        },
    }),
    clearTrash: (
        state: ExplorerState,
        node: BrowserNode,
        permissions: OverallPermissions,
    ) => ({
        sourceEventNode: node,
        icon: 'fas fa-times',
        name: 'clear trash',
        section: 'Modify',
        authorized: hasGroupModifyPermissions(permissions),
        applicable: () => node instanceof FolderNode && node.kind == 'trash',
        exe: () => {
            state.purgeDrive(node as TrashNode)
        },
    }),
    newFluxProject: (
        state: ExplorerState,
        node: BrowserNode,
        permissions: OverallPermissions,
    ) => ({
        sourceEventNode: node,
        icon: 'fas fa-sitemap',
        name: 'new app',
        section: 'New',
        authorized: hasGroupModifyPermissions(permissions),
        applicable: () => instanceOfStandardFolder(node),
        exe: () => {
            state.flux.new(node as AnyFolderNode)
        },
    }),
    newStory: (
        state: ExplorerState,
        node: BrowserNode,
        permissions: OverallPermissions,
    ) => ({
        sourceEventNode: node,
        icon: 'fas fa-book',
        name: 'new story',
        section: 'New',
        authorized: hasGroupModifyPermissions(permissions),
        applicable: () => instanceOfStandardFolder(node),
        exe: () => {
            state.story.new(node as AnyFolderNode)
        },
    }),
    paste: (
        state: ExplorerState,
        node: BrowserNode,
        permissions: OverallPermissions,
    ) => ({
        sourceEventNode: node,
        icon: 'fas fa-paste',
        name: 'paste',
        section: 'Move',
        authorized: hasGroupModifyPermissions(permissions),
        applicable: () => {
            return instanceOfStandardFolder(node) && state.itemCut != undefined
        },
        exe: () => {
            state.pasteItem(node as AnyFolderNode)
        },
    }),
    cut: (
        state: ExplorerState,
        node: BrowserNode,
        permissions: OverallPermissions,
    ) => ({
        sourceEventNode: node,
        icon: 'fas fa-cut',
        name: 'cut',
        section: 'Move',
        authorized: hasItemModifyPermission(node, permissions),
        applicable: () => {
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
        node: BrowserNode,
        permissions: OverallPermissions,
    ) => ({
        sourceEventNode: node,
        icon: 'fas fa-link',
        name: 'borrow item',
        section: 'Move',
        authorized: hasItemSharePermission(node, permissions),
        applicable: () => node instanceof ItemNode,
        exe: () => {
            state.borrowItem(node as AnyItemNode)
        },
    }),
    importData: (
        state: ExplorerState,
        node: BrowserNode,
        permissions: OverallPermissions,
    ) => ({
        sourceEventNode: node,
        icon: 'fas fa-file-import',
        name: 'import data',
        section: 'IO',
        authorized: hasGroupModifyPermissions(permissions),
        applicable: () => instanceOfStandardFolder(node),
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
        node: BrowserNode,
        permissions: OverallPermissions,
    ) => ({
        sourceEventNode: node,
        icon: 'fas fa-trash',
        name: 'delete',
        section: 'Modify',
        authorized: hasItemModifyPermission(node, permissions),
        applicable: () => {
            return node instanceof ItemNode
        },
        exe: () => {
            state.deleteItemOrFolder(node as AnyItemNode)
        },
    }),
    refresh: (state: ExplorerState, node: BrowserNode) => ({
        sourceEventNode: node,
        icon: 'fas fa-sync-alt',
        name: 'refresh',
        section: 'Disposition',
        authorized: true,
        applicable: () => node instanceof FolderNode,
        exe: () => {
            state.refresh(node as AnyFolderNode)
        },
    }),
    info: (state: ExplorerState, node: BrowserNode) => ({
        sourceEventNode: node,
        icon: 'fas fa-info-circle',
        name: 'info',
        section: 'Info',
        authorized: true,
        applicable: () => node instanceof ItemNode,
        exe: () => {
            popupAssetCardView(node as AnyItemNode)
        },
    }),
    favoriteFolder: (state: ExplorerState, node: BrowserNode) => ({
        sourceEventNode: node,
        icon: 'fas fa-map-pin',
        name: 'add to favorite',
        section: 'Disposition',
        authorized: true,
        applicable: () => {
            const favorites = state.favoriteFolders$.getValue()
            return (
                node instanceof FolderNode &&
                favorites.find((f) => f.folderId == node.id) == undefined
            )
        },
        exe: () => {
            state.toggleFavoriteFolder(node as AnyFolderNode)
        },
    }),
    unFavoriteFolder: (state: ExplorerState, node: BrowserNode) => ({
        sourceEventNode: node,
        icon: 'fas fa-unlink',
        name: 'remove favorite',
        section: 'Disposition',
        authorized: true,
        applicable: () => {
            const favorites = state.favoriteFolders$.getValue()
            return (
                node instanceof FolderNode &&
                favorites.find((f) => f.folderId == node.id) != undefined
            )
        },
        exe: () => {
            state.toggleFavoriteFolder(node as AnyFolderNode)
        },
    }),
}

export function getActions$(
    state: ExplorerState,
    node: BrowserNode,
    actionsList: ActionConstructor[] = Object.values(GENERIC_ACTIONS),
): Observable<Array<Action>> {
    if (node instanceof FutureNode || node instanceof ProgressNode) {
        return of([])
    }
    if (node instanceof DeletedNode) {
        return of([])
    } // restore at some point

    if (!(node instanceof ItemNode) && !(node instanceof FolderNode))
        return of([])

    const permissions$ =
        node instanceof ItemNode
            ? forkJoin([
                  fetchItemPermissions$(node),
                  fetchGroupPermissions$(node.groupId),
              ]).pipe(
                  map(([item, group]) => {
                      return { group, item }
                  }),
              )
            : fetchGroupPermissions$(node.groupId).pipe(
                  raiseHTTPErrors(),
                  map((group) => {
                      return { group }
                  }),
              )

    return permissions$.pipe(
        map((permissions) => {
            return actionsList
                .map((action) => action(state, node, permissions))
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

import { forkJoin, Observable, of } from 'rxjs'
import { map, take } from 'rxjs/operators'
import { ExplorerState } from './explorer.state'
import {
    AssetsGateway,
    AssetsGateway as Gtw,
    raiseHTTPErrors,
} from '@youwol/http-clients'
import * as cdnClient from '@youwol/cdn-client'

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

import { isLocalYouwol } from '../core/requests-executot'
import {
    Installer,
    evaluateMatch,
    evaluateParameters,
    openingApps$,
    getFavoritesSingleton,
} from '../core'

export type Section =
    | 'Modify'
    | 'Move'
    | 'New'
    | 'IO'
    | 'Disposition'
    | 'Info'
    | 'CustomActions'
    | 'Open'

export interface Action {
    sourceEventNode: BrowserNode
    icon: string
    name: string
    authorized: boolean
    exe: () => void | Promise<void>
    applicable: () => boolean | Promise<boolean>
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
    return new Gtw.Client().assets
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
    copyFileId: (state: ExplorerState, node: DataNode) => ({
        sourceEventNode: node,
        icon: 'fas fa-clipboard',
        name: "copy file's id",
        section: 'Info',
        authorized: true,
        applicable: () => node instanceof ItemNode && node.kind == 'data',
        exe: () => {
            navigator.clipboard.writeText(node.rawId).then()
        },
    }),
    copyExplorerId: (state: ExplorerState, node: DataNode) => ({
        sourceEventNode: node,
        icon: 'fas fa-clipboard',
        name: "copy explorer's id",
        section: 'Info',
        authorized: true,
        applicable: () => node instanceof ItemNode && node.kind == 'data',
        exe: () => {
            navigator.clipboard.writeText(node.treeId).then()
        },
    }),
    copyFileUrl: (state: ExplorerState, node: DataNode) => ({
        sourceEventNode: node,
        icon: 'fas fa-clipboard',
        name: "copy file's url",
        section: 'Info',
        authorized: true,
        applicable: () => node instanceof ItemNode && node.kind == 'data',
        exe: () => {
            navigator.clipboard
                .writeText(
                    `${window.location.host}/api/assets-gateway/files-backend/files/${node.rawId}`,
                )
                .then()
        },
    }),
    favoriteFolder: (state: ExplorerState, node: BrowserNode) => ({
        sourceEventNode: node,
        icon: 'fas fa-map-pin',
        name: 'add to favorites',
        section: 'Disposition',
        authorized: true,
        applicable: () => {
            const favorites = getFavoritesSingleton().latest.folders$
            return (
                node instanceof FolderNode &&
                favorites.find((f) => f.id == node.id) == undefined
            )
        },
        exe: () => {
            getFavoritesSingleton().toggleFavoriteFolder(node.id)
        },
    }),
    unFavoriteFolder: (state: ExplorerState, node: BrowserNode) => ({
        sourceEventNode: node,
        icon: 'fas fa-unlink',
        name: 'un-favorite',
        section: 'Disposition',
        authorized: true,
        applicable: () => {
            const favorites = getFavoritesSingleton().latest.folders$
            return (
                node instanceof FolderNode &&
                favorites.find((f) => f.id == node.id) != undefined
            )
        },
        exe: () => {
            getFavoritesSingleton().toggleFavoriteFolder(node.id)
        },
    }),
    favoriteDesktopItem: (state: ExplorerState, node: BrowserNode) => ({
        sourceEventNode: node,
        icon: 'fas fa-map-pin',
        name: 'add to desktop',
        section: 'Disposition',
        authorized: true,
        applicable: () => {
            const favorites = getFavoritesSingleton().latest.desktopItems$
            return (
                node instanceof ItemNode &&
                favorites.find((i) => i.id == node.id) == undefined
            )
        },
        exe: () => {
            getFavoritesSingleton().toggleFavoriteDesktopItem(node.id)
        },
    }),
    unFavoriteDesktopItem: (state: ExplorerState, node: BrowserNode) => ({
        sourceEventNode: node,
        icon: 'fas fa-unlink',
        name: 'remove from desktop',
        section: 'Disposition',
        authorized: true,
        applicable: () => {
            const favorites = getFavoritesSingleton().latest.desktopItems$
            return (
                node instanceof ItemNode &&
                favorites.find((i) => i.id == node.id) != undefined
            )
        },
        exe: () => {
            getFavoritesSingleton().toggleFavoriteDesktopItem(node.id)
        },
    }),
}

export function getActions$(
    state: ExplorerState,
    node: BrowserNode,
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

    return forkJoin([
        permissions$,
        Installer.getInstallManifest$().pipe(take(1)),
        node instanceof ItemNode ? openingApps$(node).pipe(take(1)) : of([]),
    ]).pipe(
        map(([permissions, installManifest, openingApps]) => {
            const customActions: Action[] = installManifest
                .contextMenuActions({
                    node,
                    explorer: state,
                    cdnClient,
                    assetsGtwClient: new AssetsGateway.Client(),
                })
                .map((action) => {
                    return {
                        ...action,
                        sourceEventNode: node,
                        section: 'CustomActions',
                    }
                })
            const openWithActions: Action[] = openingApps.map(
                ({ appInfo, parametrization }) => ({
                    sourceEventNode: node,
                    icon: 'fas fa-folder-open',
                    name: `${appInfo.displayName} (${parametrization.name})`,
                    section: 'Open',
                    authorized: true,
                    applicable: () => {
                        return evaluateMatch(
                            node as AnyItemNode,
                            parametrization,
                        )
                    },
                    exe: () => {
                        state.launchApplication({
                            cdnPackage: appInfo.cdnPackage,
                            parameters: evaluateParameters(
                                node as AnyItemNode,
                                parametrization,
                            ),
                        })
                    },
                }),
            )

            const nativeActions = Object.values(GENERIC_ACTIONS).map((action) =>
                action(state, node, permissions),
            )
            return [
                ...nativeActions,
                ...customActions,
                ...openWithActions,
            ].filter((a) => a.applicable())
        }),
    )
}

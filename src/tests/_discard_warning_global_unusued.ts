import { GENERIC_ACTIONS } from '../lib/explorer/actions.factory'
import { RowView } from '../lib/explorer/views/main-panel/folder-content/details.view'
import { ExplorerState, TreeGroup } from '../lib/explorer/explorer.state'
import { PlatformState } from '../lib/core'
import { ActionsMenuView } from '../lib/explorer/views/main-panel/header-path.view'
import { ItemView } from '../lib/explorer/views/main-panel/folder-content/item.view'
import { FolderNode } from '../lib/explorer/nodes'
import { NotificationCenter } from '../lib/notifications'
import { ImplYouwolNotification } from '../lib/notifications/models/notification'
import { PlatformEvent } from '../lib/core/platform.events'
import { databaseActionsFactory } from '../lib/explorer/requests-executor'
import { UserMenuView } from '../lib/top-banner'

const marked_unused_but_used = [
    GENERIC_ACTIONS.deleteFolder,
    GENERIC_ACTIONS.deleteDrive,
    GENERIC_ACTIONS.clearTrash,
    GENERIC_ACTIONS.newFluxProject,
    GENERIC_ACTIONS.borrowItem,
    GENERIC_ACTIONS.deleteItem,
    new RowView(undefined).onmouseleave,
    new RowView(undefined).ondblclick,
    new TreeGroup(undefined, undefined).drivesId,
    new PlatformState().topBannerState,
    new ExplorerState().topBannerState,
    new ActionsMenuView(undefined).onmouseleave,
    new ItemView(undefined).editView().onkeydown,
    new FolderNode(undefined).parentFolderId,
    NotificationCenter.get().createRunningNotification,
    new ImplYouwolNotification(undefined).dismiss,
    new PlatformEvent(undefined).originId,
    databaseActionsFactory.renameFolder(undefined).when,
    databaseActionsFactory.renameItem(undefined).when,
    databaseActionsFactory.deleteFolder(undefined).when,
    databaseActionsFactory.deleteDrive(undefined).when,
    databaseActionsFactory.deleteItem(undefined).when,
    databaseActionsFactory.newAsset(undefined).when,
    databaseActionsFactory.newAsset(undefined).when,
    new UserMenuView(undefined).showMenu$,
]
console.log(marked_unused_but_used)

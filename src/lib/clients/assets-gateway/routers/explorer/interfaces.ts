
export type ItemId = string
export type FolderId = string
export type DriveId = string


export interface Origin {
    local: boolean
    remote: boolean
}

export interface DefaultDriveResponse {

    driveId: string
    driveName: string
    downloadFolderId: string
    downloadFolderName: string
    homeFolderId: string
    homeFolderName: string
    groupId: string
}

export interface DriveResponse {

    driveId: string
    name: string
}


export interface DrivesResponse {

    drives: Array<{
        driveId: string
        name: string
    }>
}

export interface FolderResponse {

    folderId: string
    parentFolderId: string
    name: string
    driveId: string
    origin?: Origin
}

export interface ChildrenFolderResponse {

    folders: FolderResponse[]
    items: ItemResponse[]
}

export interface ItemResponse {

    name: string
    treeId: string
    rawId: string
    assetId: string
    groupId: string
    driveId: string
    kind: string
    folderId: string
    borrowed: boolean
    origin?: Origin
}

export interface PermissionsResponse {

    read: boolean
    share: boolean
    write: boolean
    expiration?: Origin
}

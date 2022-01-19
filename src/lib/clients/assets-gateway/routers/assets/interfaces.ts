


export interface Asset {

    readonly assetId: string
    readonly rawId: string
    readonly treeId: string
    readonly kind: string
    readonly name: string
    readonly groupId: string
    readonly description: string
    readonly images: Array<string>
    readonly thumbnails: Array<string>
    readonly tags: Array<string>
    readonly permissions: PermissionsResp
}


export interface GroupAccess {
    read: "forbidden" | "authorized" | "owning" | "expiration-date"
    share: "forbidden" | "authorized"
    parameters: { [key: string]: any }
    expiration: number | null
}

export interface ExposingGroup {
    name: string
    groupId: string
    access: GroupAccess
}

export interface OwnerInfo {
    exposingGroups: Array<ExposingGroup>
    defaultAccess: GroupAccess
}

export interface PermissionsResp {

    write: boolean
    read: boolean
    share: boolean
    expiration?: boolean
}

export interface ConsumerInfo {
    permissions: PermissionsResp
}


export interface AccessInfo {
    owningGroup: { name: string },
    consumerInfo: ConsumerInfo,
    ownerInfo?: OwnerInfo
}


export interface UpdateAssetBody {
    name?: string
    tags?: string[]
    description?: string
}

export interface AccessPolicyBody {
    read: 'forbidden' | 'authorized' | 'expiration-date' | 'owning'
    share: 'forbidden' | 'authorized'
    parameters?: { [key: string]: any }
}





export type Json = any
export type RawId = string

export interface HealthzResponse {

    status: 'assets-gateway ok'
}

export interface UserInfoResponse {

    name: string
    groups: GroupResponse[]

}

export interface GroupResponse {

    id: string
    path: string
}


export interface GroupsResponse {

    groups: Array<GroupResponse>
}


export interface DeletedEntityResponse {

    type: string
    author: string
    driveId: string
    entityId: string
    timestamp: string

}


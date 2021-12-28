



export type Json = any


export interface HealthzResponse {

    status: string
}


export interface GroupResponse {

    id: string
    path: string
}


export interface GroupsResponse {

    groups: Array<GroupResponse>
}


export class DeletedEntityResponse {

    type: string
    author: string
    driveId: string
    entityId: string
    timestamp: string

    constructor({ driveId, type, author, entityId, timestamp }:
        { driveId: string, type: string, author: string, entityId: string, timestamp: string }) {
        this.driveId = driveId
        this.type = type
        this.author = author
        this.entityId = entityId
        this.timestamp = timestamp
    }
}



type EventType = "FileAddedEvent"

export class PlatformEvent {

    public readonly originId: string
    public readonly type: EventType

    constructor(origin: { originId: string, type: EventType }) {
        Object.assign(this, origin)
    }
}

export class FileAddedEvent extends PlatformEvent {

    public readonly treeId: string
    public readonly folderId?: string
    public readonly groupId?: string
    public readonly driveId?: string

    static isInstance(instance: PlatformEvent): instance is FileAddedEvent {
        return instance.type && instance.type == "FileAddedEvent"
    }

    constructor(data: {
        treeId: string,
        folderId?: string,
        groupId?: string,
        driveId?: string
    }, meta: {
        originId: string
    }) {
        super({ originId: meta.originId, type: "FileAddedEvent" })
        Object.assign(this, data)
    }
}

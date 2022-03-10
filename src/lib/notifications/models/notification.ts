import { VirtualDOM } from '@youwol/flux-view'
import { v4 } from 'uuid'
import { NotificationState } from './running-state'

export type NotificationLevel = 'notice' | 'error'

export type NotificationReference = string

export type NotificationMessage = string | VirtualDOM

export interface NotificationProperties {
    level?: NotificationLevel
    readonly title: string
    message: NotificationMessage
}

export interface YouwolNotification extends NotificationProperties {
    readonly ref: NotificationReference
    readonly creationDate: Date
    readonly state: NotificationState
    read: boolean
}

export type DismissibleNotification = YouwolNotification

export function factoryYouwolNotification(args: NotificationProperties) {
    return new ImplYouwolNotification(args)
}

export abstract class AbstractNotification implements YouwolNotification {
    public readonly ref: NotificationReference
    public readonly creationDate: Date
    public level: NotificationLevel
    public readonly title: string
    public message: VirtualDOM
    public read: boolean

    protected constructor(args: NotificationProperties) {
        this.ref = v4()
        this.creationDate = new Date()
        this.level = args.level ?? 'notice'
        this.title = args.title
        this.message = getMessageAsVirtualDom(args)
        this.read = false
    }

    public abstract get state(): NotificationState
}

export function getMessageAsVirtualDom({
    message,
}: {
    message: NotificationMessage
}): VirtualDOM {
    if (typeof message === 'string') {
        return {
            innerText: message,
        }
    } else {
        return message
    }
}

export class ImplYouwolNotification
    extends AbstractNotification
    implements DismissibleNotification
{
    private _dismissed: boolean

    constructor(args: NotificationProperties) {
        super(args)
    }

    public get state(): NotificationState {
        return 'immutable'
    }

    public dismiss() {
        this._dismissed = true
    }

    public get dismissed(): boolean {
        return this._dismissed
    }
}

import { attr$, Stream$, VirtualDOM } from "@youwol/flux-view"
import { Observable } from "rxjs"


/**
 * Base class for badges in the [[YouwolBannerView]]
 */
export class BadgeView implements VirtualDOM {

    static ClassSelector = "LockerBadge"

    constructor() {
    }
}

/**
 * A badge illustrating a closed or opened locker
 */
export class LockerBadge extends BadgeView {

    static ClassSelector = "LockerBadge"
    public readonly tag: 'i'
    public readonly class: Stream$<boolean, string>

    public readonly locked$: Observable<boolean>

    /** 
    * @param parameters Constructor's parameters
    * @param parameters.locked$ Observable on the lock (true) or unlocked (false) attribute
    */
    constructor(parameters: {
        locked$: Observable<boolean>
    }) {
        super()
        Object.assign(this, parameters)

        this.class = attr$(
            this.locked$,
            (locked) => locked ? 'fa-lock-open unlocked' : 'fa-lock locked',
            {
                wrapper: (d) => `fas fv-text-focus ${d} ${LockerBadge.ClassSelector} ${BadgeView.ClassSelector}`,
                untilFirst: LockerBadge.ClassSelector
            }
        )
    }
}

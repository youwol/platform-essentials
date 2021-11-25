
import { attr$, VirtualDOM } from "@youwol/flux-view"
import { BehaviorSubject } from "rxjs"

/**
 * A toggle button based on a font-awesome class for icon generation
 * 
 * Can be grouped in [ComboTogglesView]
 * @template TEnum the type of enum
 */
export class FaIconToggleView<TEnum> implements VirtualDOM {

    static ClassSelector = "fa-icon-toggle-view"

    public readonly tag: 'i'
    public readonly class: any

    public readonly onclick: () => void

    public readonly value: TEnum
    public readonly selection$: BehaviorSubject<TEnum>
    public readonly classes: string

    /**
     * @param params parameters
     * @param params.value enum's value corresponding to the button
     * @param params.selection$ current selection
     * @param params.classes classes to add to the view (usually describe an icon from font-awesome)
     */
    constructor(params: {
        value: TEnum,
        selection$: BehaviorSubject<TEnum>,
        classes: string
    }) {
        Object.assign(this, params)
        this.value = this.value
        this.class = attr$(
            this.selection$,
            (selection: TEnum) => {
                let selectionClass = selection == this.value
                    ? " fv-text-focus"
                    : " fv-text-primary"
                return `fas ${this.classes} fv-pointer p-2 ${FaIconToggleView.ClassSelector}` + selectionClass
            }
        )
        this.onclick = () => this.selection$.next(this.value)
    }
}

/**
 * A group of toggle buttons.
 *
 * @template TEnum enum from which the combo is constructed
 * @template TState optional: a state that can be forwarded to individual toggle view factory
 */
export class ComboTogglesView<TEnum, TState = {}> implements VirtualDOM {

    public readonly class = 'd-flex'
    public readonly children: VirtualDOM[]
    public readonly selected$: BehaviorSubject<TEnum>
    public readonly state: TState

    /**
     * 
     * @param params parameters
     * @param params.selection$ current selection
     * @param params.viewFactory factory of the individual combo's view
     * @param params.state optional: if provided, the viewFactory lambda get it a second parameter
     */
    constructor(params: {
        values: TEnum[],
        selection$: BehaviorSubject<TEnum>,
        viewFactory: (value: TEnum, state: TState) => VirtualDOM,
        state?: TState
    }) {
        Object.assign(this, params)
        this.children = params.values.map((mode: TEnum) => {
            return params.viewFactory(mode, this.state)
        })
    }
}


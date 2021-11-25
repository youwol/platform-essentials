import { attr$, child$, VirtualDOM } from "@youwol/flux-view"
import { Button } from "@youwol/fv-button"
import { BehaviorSubject } from "rxjs"

export class IconButtonView {

    static ClassSelector = "icon-button-view"
    public readonly baseClass = `${IconButtonView.ClassSelector} fas fv-pointer fv-text-primary fv-bg-secondary fv-hover-x-lighter border rounded p-1`
    public readonly class: string
    public readonly onclick: (ev: MouseEvent) => void
    public readonly style: { [key: string]: string }
    public readonly icon: string

    constructor(params: {
        onclick: (ev: MouseEvent) => any,
        icon: string,
        withClasses?: string,
        style?: { [key: string]: string }
    }) {
        Object.assign(this, params)
        this.class = `${this.baseClass} ${this.icon} ${params.withClasses || ""}`
    }
}


export class ButtonView extends Button.View {

    class = 'fv-btn fv-bg-secondary fv-hover-x-lighter'

    constructor({ name, icon, withClass, enabled }: { name: string, icon: string, withClass: string, enabled: boolean }) {
        super({
            state: new Button.State(),
            contentView: () => ({
                class: 'd-flex align-items-center',
                children: [
                    { class: icon },
                    {
                        class: 'ml-1',
                        innerText: name
                    }
                ]
            }),
            disabled: !enabled
        } as any)
        this.class = `${this.class} ${withClass}`
    }
}

export function sectionTitleView(title: string): VirtualDOM {
    return {
        tag: 'h3',
        class: 'border-bottom w-100 mt-5',
        innerText: title
    }
}

export class TextEditableView implements VirtualDOM {

    static ClassSelector = "text-editable-view"
    public readonly class = `${TextEditableView.ClassSelector} d-flex justify-content-center align-items-center`
    public readonly children: VirtualDOM[]
    public readonly editionMode$ = new BehaviorSubject(false)

    public readonly text$: BehaviorSubject<string>
    public readonly attrText$: any
    public readonly regularView: (text$) => VirtualDOM
    public readonly templateEditionView: VirtualDOM

    constructor(params: {
        text$: BehaviorSubject<string>,
        regularView: (text$) => VirtualDOM,
        templateEditionView?: VirtualDOM
    }) {

        Object.assign(this, params)
        this.templateEditionView = this.templateEditionView || { tag: 'input', type: 'text' }
        this.attrText$ = attr$(this.text$, (text) => text)
        this.children = [
            child$(
                this.editionMode$,
                (isEditing) => isEditing
                    ? this.editionView()
                    : this.regularView(this.text$)
            ),
            child$(
                this.editionMode$,
                (isEditing) => isEditing
                    ? {}
                    : new IconButtonView({
                        onclick: () => this.editionMode$.next(true),
                        icon: 'fa-edit',
                        withClasses: "mx-2"
                    })
            )
        ]
    }

    editionView() {
        return {
            ...(this.templateEditionView as any),
            placeholder: this.attrText$,
            value: this.attrText$,
            onkeypress: (ev: KeyboardEvent) => {
                if (ev.key == 'Enter' && !ev.shiftKey) {
                    console.log(ev)
                    this.editionMode$.next(false)
                    this.text$.next(ev.target['value'])
                }
            }
        }
    }
}

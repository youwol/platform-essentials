import { attr$, child$, children$, HTMLElement$, VirtualDOM } from "@youwol/flux-view";
import { BehaviorSubject, Observable, of } from "rxjs";
import { IconButtonView, TextEditableView } from "../misc.view";
import { skip } from "rxjs/operators";
import { Asset } from "../../..";


export class AssetTagsView implements VirtualDOM {

    static ClassSelector = "asset-tags-view"

    public readonly class = `${AssetTagsView.ClassSelector} w-100`
    public readonly asset: Asset
    public readonly children: VirtualDOM[]
    public readonly tags$: BehaviorSubject<string[]>
    public readonly forceReadonly: boolean
    constructor(params: {
        tags$: BehaviorSubject<string[]>,
        asset: Asset,
        forceReadonly?: boolean
    }) {

        Object.assign(this, params)
        this.children = [
            child$(this.tags$,
                (tags) => tags.length == 0
                    ? {
                        style: {
                            fontStyle: 'italic'
                        },
                        innerText: "No tag has been provided yet."
                    }
                    : {}),
            this.asset.permissions.write && !this.forceReadonly
                ? new TagsEditableView({ tags$: this.tags$ })
                : AssetTagsView.readOnlyView(this.tags$)
        ]
    }

    static readOnlyView(tags$: BehaviorSubject<string[]>) {
        return {
            class: 'd-flex flex-wrap align-items-center',
            children: children$(
                tags$,
                (tags) => tags.map(tag => AssetTagsView.tagView(of(tag)))
            )
        }
    }

    static tagView(tag$: Observable<string>) {
        return {
            class: 'border rounded p-2 mx-2',
            innerText: attr$(tag$, tag => tag)
        }
    }
}

class TagsEditableView implements VirtualDOM {

    static ClassSelector = "tags-editable-view"
    public readonly class = `${TagsEditableView.ClassSelector}`
    public readonly children: VirtualDOM[]
    public readonly editionMode$ = new BehaviorSubject(false)

    public readonly tags$: BehaviorSubject<string[]>

    constructor(params: { tags$: BehaviorSubject<string[]> }) {

        Object.assign(this, params)

        this.children = [
            new IconButtonView({
                onclick: () => this.tags$.next([...this.tags$.getValue(), 'new tag']),
                icon: "fa-plus-circle",
                withClasses: 'p-1'
            }),
            {
                class: 'd-flex flex-align-center  flex-wrap',
                children: children$(
                    this.tags$,
                    (tags) => tags.map((tag, i) => new EditableTagView({ tags$: this.tags$, index: i }))
                )
            }
        ]
    }
}

class EditableTagView implements VirtualDOM {

    public readonly class = 'd-flex flex-align-center'
    public readonly tag: string
    public readonly children: VirtualDOM[]

    public readonly tags$: BehaviorSubject<string[]>
    public readonly index: number

    connectedCallback: (elem: HTMLElement$ & HTMLDivElement) => void

    constructor(params: { index: number, tags$: BehaviorSubject<string[]> }) {

        Object.assign(this, params)
        let text$ = new BehaviorSubject(this.tags$.getValue()[this.index])

        this.children = [
            child$(
                this.tags$,
                (tags) => ({
                    class: 'd-flex flex-align-center mr-5 my-2',
                    children: [
                        new TextEditableView({
                            text$,
                            regularView: (text$) => ({ innerText: attr$(text$, t => t) }),
                            class: 'border rounded p-2 d-flex flex-align-center'
                        } as any),
                        {
                            tag: 'i',
                            style: { height: 'fit-content' },
                            class: 'fas fa-times mx-1 fv-text-error fv-pointer fv-hover-xx-lighter',
                            onclick: () => {
                                let newTags = this.tags$.getValue().filter((_, i) => i != this.index);
                                this.tags$.next(newTags)
                            }
                        }]
                })
            )
        ]
        this.connectedCallback = (elem) => {
            elem.ownSubscriptions(
                text$.pipe(skip(1)).subscribe((text) => {
                    let newTags = this.tags$.getValue()
                    newTags[this.index] = text
                    this.tags$.next(newTags)
                })
            )
        }
    }
}

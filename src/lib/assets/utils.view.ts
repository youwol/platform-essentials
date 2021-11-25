import { child$, Stream$, VirtualDOM } from "@youwol/flux-view"
import { Button } from "@youwol/fv-button"
import { BehaviorSubject } from "rxjs"



export class ButtonView extends Button.View {

    class = 'fv-btn fv-bg-secondary-alt fv-hover-bg-secondary'

    constructor({ name, withClass, enabled }: { name: string, withClass: string, enabled: boolean }) {
        super({ state: new Button.State(), contentView: () => ({ innerText: name }), disabled: !enabled } as any)
        this.class = `${this.class} ${withClass}`
    }
}


export class ImagesCarouselView implements VirtualDOM {

    static ClassSelector = "images-carousel-view"
    public class: string
    public readonly style: Record<string, string>

    public readonly children: Stream$<number, VirtualDOM>[]
    public readonly selectedSnippet$ = new BehaviorSubject(0)
    public readonly imagesURL: string[]

    constructor(parameters: { imagesURL: string[], class, style }) {

        Object.assign(this, parameters)
        this.class = `${ImagesCarouselView.ClassSelector} ${this.class}`
        this.children = [
            child$(
                this.selectedSnippet$,
                (index) => this.handleView(index, 'fa-chevron-left ml-auto', -1)
            ),
            child$(
                this.selectedSnippet$,
                (index) => ({
                    class: "px-2 w-100 h-100",
                    tag: 'img',
                    style: {
                        height: 'auto'
                    },
                    src: this.imagesURL[index]
                })
            ),
            child$(
                this.selectedSnippet$,
                (index) => this.handleView(index, 'fa-chevron-right mr-auto', 1)
            ),
        ]
    }

    handleView(index, icon, increment) {
        return (increment == -1 && index > 0) || (increment == 1 && index < this.imagesURL.length - 1)
            ? {
                class: `fas ${icon} my-auto fa-2x fv-pointer fv-text-primary fv-hover-text-focus handle-${increment > 0 ? 'next' : 'previous'}`,
                onclick: () => this.selectedSnippet$.next(this.selectedSnippet$.getValue() + increment)
            }
            : { class: increment > 0 ? 'handle-right-none mr-auto' : 'handle-left-none ml-auto' }
    }
}

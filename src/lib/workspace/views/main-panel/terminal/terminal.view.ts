import { attr$, child$, childrenAppendOnly$, VirtualDOM } from "@youwol/flux-view";
import { BehaviorSubject } from "rxjs";
import { delay } from "rxjs/operators";



let invite = `
                    *@@@@@@,         
                    *@@@@@@,                
          /@@@@@@%  *@@@@@@,  %@@@@@@(      
        ,&@@@@@@@@@@@@@@@@@@@@@@@@@@@@&*    
             %@@@@@@@@@@@@@@@@@@@@%         
    (            /@@@@@@@@@@@@/            /
    @@@@#.           ,&@@&*           .#@@@@
    @@@@@@@@@.                    .@@@@@@@@@
    #@@@@@@@@@@@@(            (@@@@@@@@@@@@#
        /@@@@@@@@@@@#      #@@@@@@@@@@@(    
        *@@@@@@@@@@@#      #@@@@@@@@@@@/    
    (@@@@@@@@@@@@@@@#      #@@@@@@@@@@@@@@@#
    @@@@@@@@@*&@@@@@#      #@@@@@&,@@@@@@@@@
     .#@%.    &@@@@@#      #@@@@@&    .#@%. 
              &@@@@@#      #@@@@@&          
              ,@@@@@#      #@@@@@,          
                  .##      ##.
`
export class TerminalView implements VirtualDOM {

    expanded$ = new BehaviorSubject(false)
    commands$ = new BehaviorSubject([invite, "Read more about the available commands <a href=''>here</a>"])
    command$ = new BehaviorSubject(">")
    contentElement: HTMLDivElement
    class = attr$(
        this.expanded$,
        (expanded) => expanded ? "w-100 h-25" : "w-100",
        {
            wrapper: (d) => `${d} w-100 d-flex flex-column`
        }
    )
    children: VirtualDOM[]
    constructor() {
        this.children = [
            this.headerView(),
            child$(
                this.expanded$,
                (expanded) => expanded ? this.contentView() : {}
            )
        ]
        this.commands$.pipe(delay(0)).subscribe(() => {
            if (!this.contentElement)
                return
            this.contentElement.scrollTop = this.contentElement.scrollHeight
        })
    }

    headerView() {
        return {
            class: 'd-flex align-items-center fv-bg-background-alt border fv-pointer',
            children: [
                {
                    class: attr$(
                        this.expanded$,
                        (expanded) => expanded ? "fa-caret-down" : "fa-caret-right",
                        { wrapper: (d) => `fas ${d} p-2 fv-pointer` }
                    )
                },
                {
                    innerText: 'TERMINAL'
                }
            ],
            onclick: () => this.expanded$.next(!this.expanded$.getValue())
        }
    }

    contentView() {
        return {
            class: 'd-flex flex-column flex-grow-1 w-100 overflow-auto p-2',
            children: [
                {
                    children: childrenAppendOnly$(
                        this.commands$,
                        (command) => {
                            return {
                                tag: 'pre',
                                class: 'fv-text-success mx-auto w-100',
                                innerHTML: command
                            }
                        })
                },
                child$(
                    this.command$,
                    (command) => this.inputView(command)
                )
            ],
            connectedCallback: (elem) => {
                this.contentElement = elem
                this.contentElement.scrollTop = this.contentElement.scrollHeight
            }
        }
    }

    inputView(command) {
        return {
            class: 'd-flex align-items-center w-100',
            children: [
                {
                    innerText: command
                },
                {
                    class: 'flex-grow-1 px-2 ',
                    spellcheck: false,
                    contentEditable: true,
                    onkeypress: (ev) => {
                        if (ev.key == 'Enter') {
                            let command = ev.target.innerText
                            let r = this.interpretCommand(command)
                            this.commands$.next([">" + command, r].filter(d => d));
                            this.command$.next(">")
                        }
                    }
                }
            ]
        }
    }

    interpretCommand(command) {
        if (command == 'youwol') {
            return 'Hello YouWol'
        }

    }
}

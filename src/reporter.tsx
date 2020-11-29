const EVENT_RUN_BEGIN = "start"
const EVENT_RUN_END = "end"
const EVENT_SUITE_BEGIN = "suite"
const EVENT_SUITE_END = "suite end"
const EVENT_TEST_FAIL = "fail"
const EVENT_TEST_PASS = "pass"
const EVENT_TEST_PENDING = "pending"

declare global {
    namespace JSX {
        interface IntrinsicElements {
            // [elemName: string]: any
            h1: { id?: string, class?: string, bind?: string }
            h2: { id?: string, class?: string, bind?: string }
            ul: { id?: string, class?: string, bind?: string, tweak?: (element: HTMLElement) => void }
            li: { id?: string, class?: string, bind?: string }
            a: { id?: string, class?: string, bind?: string, href?: string }
            em: { id?: string, class?: string, bind?: string }
            br: { id?: string, class?: string, bind?: string }
            div: {id?: string, class?: string, bind?: string, onmousedown?: (ev: MouseEvent) => boolean }
            span: { id?: string, class?: string, bind?: string, onmousedown?: (ev: MouseEvent) => boolean }
            pre: { id?: string, class?: string, bind?: string }
            code: { id?: string, class?: string, bind?: string }

        }
        function createElement(name: string, props: any, ...children: any): HTML
    }
}

interface HTML {
    tag: HTMLElement
    bind: Map<string, HTMLElement>
}

export class MochaHtmlAnnotationsReporter extends Mocha.reporters.Base {

    // static playIcon = '&#x2023;'
    // static playIcon = { __html: '&#x2023;' } // ‣
    static playIcon = "▶" // ‣ ▶ ►

    passes: HTMLElement
    failuresEl: HTMLElement
    duration: HTMLElement

    stack: Array<HTMLElement>

    constructor(runner: Mocha.Runner, options: Mocha.MochaOptions) {
        super(runner, options)

        console.log("=========> MochaHtmlAnnotationsReporter created")

        var self = this

        // <li class="progress"><canvas bind="canvas" width="40" height="40"></canvas></li>

        const statHTML =
            <ul id="mocha-stats">
                <li class="passes"><a bind="passesLink" href="javascript:void(0);">passes:</a> <em bind="passes">0</em></li>
                <li class="failures"><a bind="failuresLink" href="javascript:void(0);">failures:</a> <em bind="failures">0</em></li>
                <li class="duration">duration: <em bind="duration">0</em>s</li>
            </ul>
        const canvas = statHTML.bind.get("canvas")
        this.passes = statHTML.bind.get("passes")
        this.failuresEl = statHTML.bind.get("failures")
        this.duration = statHTML.bind.get("duration")
        const passesLink = statHTML.bind.get("passesLink")
        const failuresLink = statHTML.bind.get("failuresLink")

        const reportHTML = <ul id="mocha-report"></ul>
        const report = reportHTML.tag

        var stack = [report]
        this.stack = stack
        var progress
        var ctx
        var root = document.getElementById('mocha')
        /*
                if (canvas.getContext) {
                    var ratio = window.devicePixelRatio || 1;
                    canvas.style.width = canvas.width;
                    canvas.style.height = canvas.height;
                    canvas.width *= ratio;
                    canvas.height *= ratio;
                    ctx = canvas.getContext('2d');
                    ctx.scale(ratio, ratio);
                    progress = new Progress();
                }
        */
        if (!root) {
            root = document.createElement('div')
            root.id = "mocha"
            document.body.appendChild(root)
        }
        root.appendChild(statHTML.tag)
        root.appendChild(report)

        runner.on(EVENT_SUITE_BEGIN, (suite) => {
            // console.log(`EVENT_SUITE_BEGIN ${suite.title}`)
            if (suite.root === undefined) {
                return
            }
            this.addHTML(
                <li class="suite">
                    <h1>
                        <a href={self.suiteURL(suite)}>{suite.title}</a>
                    </h1>
                    <ul bind="child"/>
                </li>)
        })

        runner.on(EVENT_SUITE_END, (suite: Mocha.Suite) => {
            // console.log(`EVENT_SUITE_END ${suite.title}`)
            if (suite.root) {
                this.updateStats()
                return
            }
            this.up()
        })

        runner.on(EVENT_TEST_PASS, (test: any) => {
            // console.log(`EVENT_TEST_PASS ${test.title} ${test.context}`)
            try {
                var url = this.testURL(test)

                const markup =
                    <li class={`test pass ${test.speed === undefined ? "fast" : test.speed}`}>
                        <h2 bind="b">
                            <span onmousedown={MochaHtmlAnnotationsReporter.openPopup}>
                                {test.title}
                            </span>
                            <span class="duration">{test.duration}</span>
                            <a href={url} class="icon replay">{MochaHtmlAnnotationsReporter.playIcon}</a>
                            <br />
                        </h2>
                        <div class="popup" onmousedown={MochaHtmlAnnotationsReporter.closePopup}>
                            <pre>
                                <code>{MochaHtmlAnnotationsReporter.clean(test.body)}</code>
                            </pre>
                        </div>
                    </li>

                var context = ""
                if (test.context !== undefined) {  
                    this.stack[0].classList.add("visual")
                    if (typeof test.context === "string")
                        markup.bind.get("b").appendChild(document.createTextNode(test.context))
                    else
                        markup.bind.get("b").appendChild(test.context)
                }

                // something is adding syntax highlightning using <span class="number|comment">
                // node_modules/mocha/lib/browser/highlight-tags.js
                // is adding syntax highlightning using <span class="number|comment|...">
                // which can be enabled|disabled via options.noHighlighting

                this.addHTML(markup)
                this.updateStats()
            }
            catch (error) {
                console.log("IN EVENT_TEST_PASS")
                console.log(error)
            }
        })

        runner.on(EVENT_TEST_FAIL, (test: any) => {
            // console.log(`EVENT_TEST_FAIL ${test.title} ${test.context}`)
            try {

                // MESSAGE
                let message
                if (test.err.htmlMessage) {
                    message = test.err.htmlMessage
                } else {
                    message = test.err.toString()
                    // <=IE7 stringifies to [Object Error]. Since it can be overloaded, we
                    // check for the result of the stringifying.
                    if (message === '[object Error]') {
                        message = test.err.message
                    }
                }

                // CALCULATE STACKSTRING
                let stackString // Note: Includes leading newline

                if (test.err.stack) {
                    let indexOfMessage = test.err.stack.indexOf(test.err.message)
                    if (indexOfMessage === -1) {
                        stackString = test.err.stack
                    } else {
                        stackString = test.err.stack.substr(
                            test.err.message.length + indexOfMessage
                        )
                    }
                } else if (test.err.sourceURL && test.err.line !== undefined) {
                    // Safari doesn't give you a stack. Let's at least provide a source line.
                    stackString = '\n(' + test.err.sourceURL + ':' + test.err.line + ')'
                }

                stackString = stackString || ''

                var url = this.testURL(test)
                const markup =
                    <li class={`test fail ${test.speed === undefined ? "fast" : test.speed}`}>
                        <h2 bind="b">
                            <span onmousedown={MochaHtmlAnnotationsReporter.openPopup}>
                                {test.title}
                            </span>
                            <a href={url} class="icon replay">{MochaHtmlAnnotationsReporter.playIcon}</a>
                            <br />
                        </h2>
                        <div class="popup" onmousedown={MochaHtmlAnnotationsReporter.closePopup}>
                            <pre>
                                <code>{MochaHtmlAnnotationsReporter.clean(test.body)}</code>
                            </pre>
                            <pre class="error">
                                {message}{stackString}
                            </pre>
                        </div>
                    </li>

                var context = ""
                if (test.context !== undefined) {
                    this.stack[0].classList.add("visual")
                    if (typeof test.context === "string")
                        markup.bind.get("b").appendChild(document.createTextNode(test.context))
                    else
                        markup.bind.get("b").appendChild(test.context)
                }

                this.addHTML(markup)
                this.updateStats()
            }
            catch (error) {
                console.log("IN EVENT_TEST_FAIL")
                console.log(error)
            }
        })

        runner.on(EVENT_TEST_PENDING, (test: any) => {
            let markup = <li class="test pass pending"><h2>{test.title}</h2></li>
            this.addHTML(markup)
            this.updateStats()
        })
    }

    addHTML(html: HTML) {
        this.addElement(html.tag)
        const child = html.bind.get("child")
        if (child !== undefined)
            this.downElement(child)
    }

    addElement(e: HTMLElement) {
        this.stack[0].appendChild(e)
    }

    downElement(e: HTMLElement) {
        this.stack.unshift(e)
    }

    up() {
        this.stack.shift()
    }

    static appendToStack(stack: HTMLElement[], el: HTMLElement) {
        // Don't call .appendChild if #mocha-report was already .shift()'ed off the stack.
        if (stack[0]) {
            stack[0].appendChild(el)
        }
    }

    updateStats() {
        // // // TODO: add to stats
        // var percent = ((this.stats.tests / this.runner.total) * 100) | 0
        // // if (progress) {
        // //   progress.update(percent).draw(ctx);
        // // }

        // // update stats
        // var ms = new Date().getTime() - this.stats.start!!.getTime()!
        // MochaHtmlAnnotationsReporter.text(this.passes, `${this.stats.passes}`)
        // MochaHtmlAnnotationsReporter.text(this.failuresEl, `${this.stats.failures}`)
        // MochaHtmlAnnotationsReporter.text(this.duration, `${(ms / 1000).toFixed(2)}`)
    }

    /**
     * Makes a URL, preserving querystring ("search") parameters.
     *
     * @param {string} s
     * @return {string} A new URL.
     */
    static makeUrl(s: string): string {
        var search = window.location.search

        // Remove previous grep query parameter if present
        if (search) {
            search = search.replace(/[?&]grep=[^&\s]*/g, '').replace(/^&/, '?')
        }

        return (
            window.location.pathname +
            (search ? search + '&' : '?') +
            'grep=' +
            encodeURIComponent(MochaHtmlAnnotationsReporter.escapeRe(s))
        )
    }

    suiteURL(suite: Mocha.Suite) {
        return MochaHtmlAnnotationsReporter.makeUrl(suite.fullTitle())
    }

    testURL(test: Mocha.Test) {
        return MochaHtmlAnnotationsReporter.makeUrl(test.fullTitle())
    }

    static escape(s: string) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    }

    static escapeRe(s: string) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    }

    // prepare test body for html rendering
    static clean(str: string) {
        str = str
            .replace(/\r\n?|[\n\u2028\u2029]/g, '\n') // normalize line breaks
            .replace(/^\uFEFF/, '')
            // (traditional)->  space/name     parameters    body     (lambda)-> parameters       body   multi-statement/single          keep body content
            .replace(
                /^function(?:\s*|\s+[^(]*)\([^)]*\)\s*\{((?:.|\n)*?)\s*\}$|^\([^)]*\)\s*=>\s*(?:\{((?:.|\n)*?)\s*\}|((?:.|\n)*))$/,
                '$1$2$3'
            )

        var spaces = str.match(/^\n?( *)/)!![1].length
        var tabs = str.match(/^\n?(\t*)/)!![1].length
        var re = new RegExp(
            '^\n?' + (tabs ? '\t' : ' ') + '{' + (tabs || spaces) + '}',
            'gm'
        )

        str = str.replace(re, '')

        return str.trim()
    };

    /**
     * Set an element's text contents.
     */
    static text(el: HTMLElement, contents: string) {
        if (el.textContent) {
            el.textContent = contents
        } else {
            el.innerText = contents
        }
    }

    static openPopup(event: MouseEvent) {
        let x = (event.target as HTMLElement).parentElement as HTMLElement
        // console.log(`>>> OPENPOPUP ${x}`)
        for (let p = x; p !== null; p = p.nextElementSibling as HTMLElement) {
            // console.log(p)
            if (p.classList !== undefined && p.classList.contains("popup")) {
                p.style.display = "block"
                return false
            }
        }
        throw Error("MochaHtmlAnnotationsReporter.openPopup failed to find popup")
    }
    
    static closePopup(event: MouseEvent) {
        let element = event.currentTarget as HTMLElement
        // console.log(`>>> CLOSEPOPUP ${element}`)
        element.style.display = ""
        return false
    }
    
    static jsx(name: string, props: any, ...children: any): HTML {
        let bind = new Map<string, HTMLElement>()
        let tag: HTMLElement
        switch (name) {
            case "a":
                let a = document.createElement("a")
                tag = a
                if (props === null) break
                if ('href' in props) a.href = props.href
                break
            case "canvas":
                let canvas = document.createElement("canvas")
                tag = canvas
                if (props === null) break
                if ('width' in props) canvas.width = props.width
                if ('height' in props) canvas.height = props.height
                break
            default:
                tag = document.createElement(name)
        }
        if (props !== null) {
            if ('class' in props) {
                for (let c of props.class.split(' '))
                    tag.classList.add(c)
            }
            if ('style' in props) {
                // console.log(`*** GOT STYLE ${props.style}`)
                tag.style.cssText = props.style
            }
            if ('onmousedown' in props) {
                // console.log(`*** GOT ONMOUSEDOWN ${props.onmousedown}`)
                tag.onmousedown = (mouseEvent) => {
                    // console.log("### CALLED ONMOUSE DOWN")
                    props.onmousedown(mouseEvent)
                }
            }
            if ('id' in props) {
                tag.id = props.id
            }
            if ('tweak' in props) {
                props.tweak(tag)
            }
            if ('bind' in props) {
                bind.set(props.bind, tag)
            }
        }
        for (let child of children) {
            if (typeof child === "string") {
                tag.appendChild(document.createTextNode(child))
            } else
                if (child.tag === undefined) {
                    if (child.__html) {
                        const node = document.createElement("div")
                        node.innerHTML = child.__html
                        tag.appendChild(node.firstChild!!)
                    } else {
                        tag.appendChild(document.createTextNode(child))
                    }
                } else {
                    tag.appendChild(child.tag)
                    for (const [key, value] of child.bind) {
                        bind.set(key, value)
                    }
                }
        }
        return { tag, bind }
    }

}

// mocha['_reporter'] = MochaHtmlAnnotationsReporter;

console.log("=========> MochaHtmlAnnotationsReporter registered")
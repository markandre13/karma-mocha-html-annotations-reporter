// load mocha reporter into karma
// based on @netatwork/mocha-utils

import { FilePattern, ConfigOptions } from 'karma'

class KarmaMochaHtmlAnnotationsReporter {
    public static readonly $inject = ['baseReporterDecorator', 'config', 'logger', 'helper', 'formatError'] as const
    public constructor(
        baseReporterDecorator: Function,
        config: ConfigOptions,
        logger: any,
        helper: any,
        formatError: any
    ) {
        const MOCHA_CORE_PATTERN = /([\\/]karma-mocha[\\/])/i

        // console.log("=========> KarmaMochaHtmlAnnotationsReporter created")

        baseReporterDecorator(this)
        const files = config.files!
        let index = Math.max(
            files.findIndex((file) => MOCHA_CORE_PATTERN.test((file as FilePattern).pattern)),
            0
        )
        KarmaMochaHtmlAnnotationsReporter.addFile(files, ++index, '/style.css')
        KarmaMochaHtmlAnnotationsReporter.addFile(files, ++index, '/reporter.js')
    }

    static addFile(files: any, index: number, file: string) {
        files.splice(index, 0, this.createPattern(file))
    }

    static createPattern(pattern: string): FilePattern {
        return { pattern: __dirname + pattern, included: true, served: true, watched: false }
    }

    static annotate(test: any, context: string|Element) {
        // console.log("KarmaMochaHtmlAnnotationsReporter.annotate()")
        const currentTest = test.currentTest
        const activeTest = test.test
        const isEachHook = currentTest && /^"(?:before|after)\seach"/.test(activeTest.title);
        const t = isEachHook ? currentTest : activeTest;
        t.context = context
    }

}

module.exports = {
    'reporter:karma-mocha-html-annotations-reporter': ['type', KarmaMochaHtmlAnnotationsReporter],
    'annotate': KarmaMochaHtmlAnnotationsReporter.annotate
}

// console.log("=========> KarmaMochaHtmlAnnotationsReporter registered")

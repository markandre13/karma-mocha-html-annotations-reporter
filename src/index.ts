// load mocha reporter into karma
// based on @netatwork/mocha-utils

import { FilePattern, ConfigOptions } from 'karma'

class KarmaMochaHtmlAnnotationsReporter {
    public static readonly $inject = ['baseReporterDecorator', 'config', 'logger', 'helper', 'formatError'] as const
    public constructor(
        decorator: Function,
        config: ConfigOptions,
    ) {
        const MOCHA_CORE_PATTERN = /([\\/]karma-mocha[\\/])/i

        console.log("=========> KarmaMochaHtmlAnnotationsReporter created")

        decorator(this)

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
}

module.exports = {
    'reporter:karma-mocha-html-annotations-reporter': ['type', KarmaMochaHtmlAnnotationsReporter]
}

console.log("=========> KarmaMochaHtmlAnnotationsReporter registered")

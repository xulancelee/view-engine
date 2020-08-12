import path from 'path';
import fs from 'fs';

const bladePath = path.resolve('./blade');
const reExt = /^[\s]*?@extend/;
const reBrackets = /[()]/g;
const __view_cache = {};
const __translate_cache = {};

function getBlade(blade) {
    if (!__view_cache[blade]) {
        let modulePath = path.join(bladePath, blade.replace(/\./g, '/') + '.html');
        if (fs.existsSync(modulePath))
            __view_cache[blade] = fs.readFileSync(modulePath, 'utf-8').replace(/\r?\n/g, '@n').replace(/'/g, '@p');
        else __view_cache[blade] = "";
    }
    return __view_cache[blade];
}

function parser(blade, inner, section) {
    function parserExt() {
        const reExtend = /@(extend|section|show)(\([^)]*\))?/g;
        let matchExt = reExtend.exec(blade);
        let cursor = matchExt.index + matchExt[0].length;
        let current = '';
        let section = {};

        let match = reExtend.exec(blade);
        while (match) {
            if (match[1] === 'section') {
                current = match[2].replace(reBrackets, '');
            } else if (match[1]) {
                let snippet = blade.slice(cursor, match.index);
                section[current] = parser(snippet, true);
            }
            cursor = match.index + match[0].length;
            match = reExtend.exec(blade);
        }

        let layout = parser(getBlade(matchExt[2].replace(reBrackets, '')), true, section);

        fn.push(...layout);
    }

    function parserTemp() {
        function handleCondition(condition, statement) {
            statement = statement ? statement.replace(/&lt;|&gt;|&amp;/g, ((substring) => {
                switch (substring) {
                    case '&lt;':
                        return '<';
                    case '&gt;':
                        return '>';
                    case '&amp;':
                        return '&';
                }
            })) : statement;

            switch (condition) {
                case 'section':
                    let name = statement.replace(reBrackets, '');
                    if (section[name]) fn.push(...section[name]);
                    break;
                case 'import':
                    fn.push(...parser(getBlade(statement.replace(reBrackets, '')), true));
                    break;
                case 'if':
                    fn.push('if ' + statement + ' {\n');
                    break;
                case 'elseif':
                    fn.push('} else if ' + statement + ' {\n');
                    break;
                case 'else':
                    fn.push('} else {\n');
                    break;
                case 'endif':
                    fn.push('}\n');
                    break;
                case 'for':
                    fn.push('for ' + statement + ' {\n');
                    break;
                case 'endfor':
                    fn.push('}\n');
                    break;
                case 'define':
                    cursor = match.index + match[0].length;
                    match = reCondition.exec(blade);
                    fn.push(blade.slice(cursor, match.index).replace(/@n/g, '\n').replace(/@p/g, "\'"));
                    break;
            }
        }

        function handleVariable(snippet) {
            snippet = snippet.trim().replace(/'/g, "\\'");
            snippet = snippet.replace(reVariable, (substring, statement) => {
                return "' + " + statement + " + '"
            });
            fn.push("temp.push('" + snippet + "');\n");
        }

        const reCondition = /@(section|import|if|elseif|else|endif|for|endfor|defined|define)(\([^)]*\))?/g;
        const reVariable = /{{([^}]+)}}/g;

        let match = reCondition.exec(blade);
        let cursor = 0;

        while (match) {
            handleVariable(blade.slice(cursor, match.index));
            handleCondition(match[1], match[2]);
            cursor = match.index + match[0].length;
            match = reCondition.exec(blade);
        }
        handleVariable(blade.slice(cursor));
    }

    blade = blade.trim();
    section = section || {};
    let isExt = reExt.test(blade);
    let fn = [];
    !inner && fn.push('let temp = [];');
    isExt ? parserExt() : parserTemp();
    !inner && fn.push('return temp.join("")');
    return fn;
}

function translate(parser) {
    return new Function('props', parser.join('').replace(/@n/g, '\\n').replace(/@p/g, "\\'"));
}

function compile(page, scope, props) {
    try {
        if (!__translate_cache[page]) {
            let fnParser = parser(getBlade(page));
            __translate_cache[page] = translate(fnParser);
        }
        return __translate_cache[page].call(scope, props);
    } catch (e) {
        console.log(e);
        return "Page Engine Error!";
    }
}

export async function render(page, scope, props) {
    return compile(page, scope, props);
}

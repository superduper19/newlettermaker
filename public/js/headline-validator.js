const BAD_FORMAT = 0;
const WARN_FORMAT = 1;
const GOOD_FORMAT = 2;

const WORD_EXCLUSIONS = [
    'a',
    'an',
    'and',
    'as',
    'at',
    'but',
    'by',
    'en',
    'for',
    'if',
    'in',
    'into',
    'is',
    'of',
    'on',
    'onto',
    'or',
    'the',
    'to',
    'v',
    'v.',
    'versus',
    'via',
    'vs',
    'vs.',
    'with',
];

function collectHeadlineViolations(headlines) {
    let color;
    let symbol;
    let message;
    const violations = [];
    for (const headline of headlines) {
        if (validateHeadline(headline) === BAD_FORMAT) {
            if (color === undefined) {
                color = '#d32f2f';
                symbol = '&cross;';
                message = 'Remove space padding or double-spacing:';
            }
            violations.push(headline);
            continue;
        }
        if (!violations.length && validateHeadline(headline) === WARN_FORMAT) {
            if (color === undefined) {
                color = '#f57c00';
                symbol = '&cross;';
                message = 'Headlines should be in title case:';
            }
            violations.push(headline);
        }
    }
    if (color === undefined) {
        return {
            color: '#666',
            symbol: '&check;',
            message:
                'Uses the email template, then fills in summary, articles and an inspirational ' +
                'image.',
        };
    }
    for (const violation of violations) {
        message += `<br>&bull; ${violation}`;
    }
    return {
        color: color,
        symbol: symbol,
        message: message,
    };
}

function validateHeadline(headline) {
    if (headline.startsWith(' ') ||
        headline.endsWith(' ') ||
        headline.includes('  ')) {
        return BAD_FORMAT;
    }
    if ((headline.includes('"') && headline.split('"').length % 2 !== 0) ||
        headline
            .split(' ')
            .some(s => !WORD_EXCLUSIONS.includes(s) && /^[a-z]/.test(s))) {
        return WARN_FORMAT;
    }
    return GOOD_FORMAT;
}

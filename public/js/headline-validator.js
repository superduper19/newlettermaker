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
    'via',
    'vs',
    'vs.',
    'with',
]

function validateHeadlines(headlines) {
    if (headlines.some(s => validateHeadline(s) === BAD_FORMAT)) {
        return [
            '#d32f2f',
            'Remove space padding or double-spacing.',
            '&cross;',
        ]
    }
    if (headlines.some(s => validateHeadline(s) === WARN_FORMAT)) {
        return [
            '#f57c00',
            'Headlines should be in title case.',
            '&#9888;',
        ]
    }
    return [
        '#666',
        'Uses the email template, then fills in summary, articles and an inspirational image.',
        '&check;',
    ]
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

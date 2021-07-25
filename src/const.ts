


const LANG_PREFIX = './i18n/';
const DIR_ADAPTOR = '/i18n/';
const I18N_GLOB = `${LANG_PREFIX}**/*.ts`;
const DOUBLE_BYTE_REGEX = /[^\x00-\xff]/g;

export { LANG_PREFIX, I18N_GLOB, DOUBLE_BYTE_REGEX, DIR_ADAPTOR };

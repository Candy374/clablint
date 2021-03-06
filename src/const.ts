const LANG_PREFIX = "src/i18n/";
const DIR_ADAPTOR = "src/i18n/";
const I18N_GLOB = `${LANG_PREFIX}**/*.ts`;
const DOUBLE_BYTE_REGEX = /[\u4e00-\u9fa5]/g;

export { LANG_PREFIX, I18N_GLOB, DOUBLE_BYTE_REGEX, DIR_ADAPTOR };

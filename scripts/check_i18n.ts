import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

type TranslationObject = Record<string, unknown>;
type KeyValueMap = Map<string, string>;
type KeyReference = {
  file: string;
  line: number;
  key: string;
};

const SOURCE_LANG = 'zh-CN';
const TARGET_LANGS = ['en-US', 'ja-JP', 'ko-KR', 'zh-Hant'] as const;
const CHECK_EXTENSIONS = new Set(['.ts', '.vue']);

function isPlainObject(value: unknown): value is TranslationObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function flattenTranslations(
  input: TranslationObject,
  prefix = '',
  output: KeyValueMap = new Map()
): KeyValueMap {
  Object.entries(input).forEach(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (isPlainObject(value)) {
      flattenTranslations(value, fullKey, output);
      return;
    }
    output.set(fullKey, String(value ?? ''));
  });
  return output;
}

async function loadTranslationFile(filePath: string): Promise<TranslationObject | null> {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const moduleUrl = pathToFileURL(filePath).href;
  const loaded = await import(moduleUrl);
  const payload = loaded.default;

  if (!isPlainObject(payload)) {
    throw new Error(`翻译文件默认导出必须是对象: ${filePath}`);
  }

  return payload;
}

function walkFiles(dirPath: string): string[] {
  const results: string[] = [];

  if (!fs.existsSync(dirPath)) {
    return results;
  }

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(fullPath));
      continue;
    }

    if (entry.isFile() && CHECK_EXTENSIONS.has(path.extname(entry.name))) {
      results.push(fullPath);
    }
  }

  return results;
}

function getLineNumber(content: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (content[i] === '\n') {
      line += 1;
    }
  }
  return line;
}

function collectReferencesFromContent(content: string, file: string): KeyReference[] {
  const references: KeyReference[] = [];
  const patterns = [
    /\bt\(\s*['"`]([^'"`$]+)['"`]\s*[,)]/g,
    /\bi18n\.global\.t\(\s*['"`]([^'"`$]+)['"`]\s*[,)]/g,
    /\$t\(\s*['"`]([^'"`$]+)['"`]\s*[,)]/g
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null = pattern.exec(content);
    while (match) {
      references.push({
        file,
        line: getLineNumber(content, match.index),
        key: match[1]
      });
      match = pattern.exec(content);
    }
  }

  return references;
}

function collectTranslationReferences(projectRoot: string): KeyReference[] {
  const scanDirs = ['src/renderer', 'src/main', 'src/preload'];
  const references: KeyReference[] = [];

  for (const scanDir of scanDirs) {
    const absoluteDir = path.join(projectRoot, scanDir);
    const files = walkFiles(absoluteDir);

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      references.push(...collectReferencesFromContent(content, path.relative(projectRoot, file)));
    }
  }

  return references;
}

async function main() {
  const projectRoot = process.cwd();
  const langDir = path.join(projectRoot, 'src/i18n/lang');
  const sourceDir = path.join(langDir, SOURCE_LANG);
  const fileNames = fs
    .readdirSync(sourceDir)
    .filter((file) => file.endsWith('.ts'))
    .sort();

  const missingByLang: Record<string, Record<string, string[]>> = {};
  const extraByLang: Record<string, Record<string, string[]>> = {};
  const sourceKeys = new Set<string>();
  const sourceValues = new Map<string, string>();
  let hasBlockingIssue = false;
  const strictMode = process.env.I18N_STRICT === '1';

  for (const fileName of fileNames) {
    const moduleName = fileName.replace(/\.ts$/, '');
    const sourcePath = path.join(sourceDir, fileName);
    const sourceObject = await loadTranslationFile(sourcePath);
    if (!sourceObject) {
      continue;
    }

    const sourceMap = flattenTranslations(sourceObject, moduleName);
    const sourceMapKeys = new Set(sourceMap.keys());

    sourceMap.forEach((value, key) => {
      sourceKeys.add(key);
      sourceValues.set(key, value);
    });

    for (const lang of TARGET_LANGS) {
      if (!missingByLang[lang]) {
        missingByLang[lang] = {};
      }
      if (!extraByLang[lang]) {
        extraByLang[lang] = {};
      }

      const targetPath = path.join(langDir, lang, fileName);
      const targetObject = await loadTranslationFile(targetPath);
      const targetMap = targetObject
        ? flattenTranslations(targetObject, moduleName)
        : new Map<string, string>();
      const targetMapKeys = new Set(targetMap.keys());

      const missing = Array.from(sourceMapKeys).filter((key) => !targetMapKeys.has(key));
      const extra = Array.from(targetMapKeys).filter((key) => !sourceMapKeys.has(key));

      if (missing.length > 0) {
        missingByLang[lang][fileName] = missing;
        hasBlockingIssue = true;
      }

      if (extra.length > 0) {
        extraByLang[lang][fileName] = extra;
      }
    }
  }

  const allReferences = collectTranslationReferences(projectRoot);
  const invalidReferences = allReferences.filter((item) => !sourceKeys.has(item.key));

  const hasWarningIssue =
    invalidReferences.length > 0 ||
    Object.values(extraByLang).some((item) => Object.keys(item).length > 0);
  const shouldFail = hasBlockingIssue || (strictMode && hasWarningIssue);

  if (hasBlockingIssue || hasWarningIssue) {
    console.error('发现国际化问题:');

    for (const lang of TARGET_LANGS) {
      const missingFiles = missingByLang[lang];
      const extraFiles = extraByLang[lang];
      const hasLangIssue =
        Object.keys(missingFiles).length > 0 || Object.keys(extraFiles).length > 0;

      if (!hasLangIssue) {
        continue;
      }

      console.error(`\n语言: ${lang}`);
      for (const fileName of Object.keys(missingFiles)) {
        console.error(`  文件: ${fileName}`);
        for (const key of missingFiles[fileName]) {
          const sourceValue = sourceValues.get(key) ?? '';
          console.error(`    - 缺失键 [${key}]：${sourceValue}`);
        }
      }

      for (const fileName of Object.keys(extraFiles)) {
        console.error(`  文件: ${fileName}`);
        for (const key of extraFiles[fileName]) {
          console.error(`    - 多余键 [${key}]`);
        }
      }
    }

    if (invalidReferences.length > 0) {
      console.error('\n代码中引用了不存在的 i18n key:');
      for (const item of invalidReferences) {
        console.error(`  - ${item.file}:${item.line} -> ${item.key}`);
      }
    }

    if (strictMode && hasWarningIssue && !hasBlockingIssue) {
      console.error('\n当前为严格模式，告警将导致失败（I18N_STRICT=1）。');
    }
  }

  if (shouldFail) {
    process.exit(1);
  }

  if (!hasBlockingIssue && !hasWarningIssue) {
    console.log('所有国际化键值检查通过！');
    return;
  }

  console.log('国际化检查通过（含告警，建议尽快修复）');
}

main().catch((error) => {
  console.error('国际化检查执行失败:', error);
  process.exit(1);
});

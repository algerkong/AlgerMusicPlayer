import fs from 'fs';
import path from 'path';

async function main() {
  const langDir = path.join(process.cwd(), 'src/i18n/lang');
  const sourceLang = 'zh-CN';
  const targetLangs = ['en-US', 'ja-JP', 'ko-KR', 'zh-Hant'];

  const sourcePath = path.join(langDir, sourceLang);
  const files = fs.readdirSync(sourcePath).filter((f) => f.endsWith('.ts'));

  function getFlatObject(obj: any, prefix = ''): Record<string, string> {
    const result: Record<string, string> = {};
    for (const key in obj) {
      const val = obj[key];
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        Object.assign(result, getFlatObject(val, fullKey));
      } else {
        result[fullKey] = String(val);
      }
    }
    return result;
  }

  const report: any = {};
  let hasMissing = false;

  for (const fileName of files) {
    // Dynamic import might be tricky with ESM/TS in Bun without proper setup
    // We'll read the file and extract the export default object using a simple regex/eval approach
    // or just use Bun.file and eval if it's safe enough for this tool.

    const getContent = async (filePath: string) => {
      if (!fs.existsSync(filePath)) return null;
      const content = fs.readFileSync(filePath, 'utf-8');
      // Simple extraction of the default export object
      const match = content.match(/export\s+default\s+([\s\S]+);/);
      if (!match) return null;
      try {
        // This is a bit hacky but works for simple object literals in i18n files
        // We replace potential comments and import statements if they existed,
        // but here it's mostly just a JS object.
        const objStr = match[1].trim();
        // Remove trailing comma if it exists before closing brace
        // objStr = objStr.replace(/,\s*}/g, '}');

        // Use a more robust way: wrap in () and eval
        // Note: this assumes the i18n files don't have complex logic or external imports
        return eval(`(${objStr})`);
      } catch (e) {
        console.error(`Error parsing ${filePath}:`, e);
        return null;
      }
    };

    const sourceObj = await getContent(path.join(sourcePath, fileName));
    if (!sourceObj) continue;
    const sourceKeysMap = getFlatObject(sourceObj);
    const sourceKeys = Object.keys(sourceKeysMap);

    for (const lang of targetLangs) {
      if (!report[lang]) report[lang] = {};

      const targetFilePath = path.join(langDir, lang, fileName);
      const targetObj = await getContent(targetFilePath);

      const targetKeysMap = targetObj ? getFlatObject(targetObj) : {};
      const targetKeys = Object.keys(targetKeysMap);

      const missing = sourceKeys.filter((k) => !targetKeys.includes(k));

      if (missing.length > 0) {
        hasMissing = true;
        report[lang][fileName] = missing.map((k) => ({
          key: k,
          zh: sourceKeysMap[k]
        }));
      }
    }
  }

  if (hasMissing) {
    console.error('发现国际化键值缺失:');
    for (const lang in report) {
      const files = report[lang];
      if (Object.keys(files).length === 0) continue;
      console.error(`\n语言: ${lang}`);
      for (const fileName in files) {
        console.error(`  文件: ${fileName}`);
        files[fileName].forEach((item: any) => {
          console.error(`    - [${item.key}]: ${item.zh}`);
        });
      }
    }
    process.exit(1);
  } else {
    console.log('所有国际化键值检查通过！');
    process.exit(0);
  }
}

main();

import fs from 'fs';
import path from 'path';

async function main() {
  const rootDir = process.cwd();
  const langDir = path.join(rootDir, 'src/i18n/lang/zh-CN');

  const definedKeys = new Set<string>();
  const langFiles = fs.readdirSync(langDir).filter((f) => f.endsWith('.ts'));

  function getKeys(obj: any, prefix = '') {
    for (const key in obj) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        getKeys(obj[key], fullKey);
      } else {
        definedKeys.add(fullKey);
      }
    }
  }

  for (const file of langFiles) {
    const content = fs.readFileSync(path.join(langDir, file), 'utf-8');
    const match = content.match(/export\s+default\s+([\s\S]+);/);
    if (match) {
      try {
        const obj = eval(`(${match[1]})`);
        getKeys(obj, file.replace('.ts', ''));
      } catch (error) {
        console.warn('Failed to parse i18n file:', file, error);
      }
    }
  }

  // @ts-ignore
  const glob = new Bun.Glob('src/renderer/**/*.{vue,ts,js}');
  // @ts-ignore
  const files = Array.from(
    glob.scanSync({
      cwd: rootDir,
      onlyFiles: true
    })
  );

  const report = {
    hardcodedChinese: [] as any[],
    missingKeys: [] as any[]
  };

  const chineseMatchRegex = /[\u4e00-\u9fa5]+/g;
  const i18nRegex = /\bt\(['"]([^'"]+)['"]\)/g;

  for (const relativeFile of files) {
    const rel = relativeFile as string;
    if (
      rel.includes('node_modules') ||
      rel.includes('android/') ||
      rel.includes('resources/') ||
      rel.includes('scripts/') ||
      rel.endsWith('.d.ts')
    )
      continue;

    const file = path.join(rootDir, rel);
    let content = fs.readFileSync(file, 'utf-8');

    content = content.replace(/\/\*[\s\S]*?\*\//g, (match) => {
      const lines = match.split('\n').length - 1;
      return '\n'.repeat(lines);
    });

    content = content.replace(/<!--[\s\S]*?-->/g, (match) => {
      const lines = match.split('\n').length - 1;
      return '\n'.repeat(lines);
    });

    const lines = content.split('\n');
    let isInConsole = false;

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const cleanLine = line.split('//')[0];

      if (cleanLine.includes('console.')) {
        isInConsole = true;
      }

      if (!isInConsole && !cleanLine.includes('import')) {
        const chineseMatches = cleanLine.match(chineseMatchRegex);
        if (chineseMatches) {
          chineseMatches.forEach((text) => {
            report.hardcodedChinese.push({
              file: rel,
              line: lineNumber,
              text: text.trim(),
              context: line.trim()
            });
          });
        }
      }

      if (isInConsole && cleanLine.includes(');')) {
        isInConsole = false;
      }

      let i18nMatch;
      while ((i18nMatch = i18nRegex.exec(cleanLine)) !== null) {
        const key = i18nMatch[1];
        if (!definedKeys.has(key)) {
          report.missingKeys.push({
            file: rel,
            line: lineNumber,
            key: key,
            context: line.trim()
          });
        }
      }
    });
  }

  const outputPath = path.join(rootDir, 'i18n_report.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

  console.log(`\n报告生成成功！`);
  console.log(`- 硬编码中文: ${report.hardcodedChinese.length} 处`);
  console.log(`- 缺失的 Key: ${report.missingKeys.length} 处`);
  console.log(`- 报告路径: ${outputPath}\n`);
}

main();

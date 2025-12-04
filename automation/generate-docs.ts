import * as fs from "fs";
import * as path from "path";

/**
 * Documentation Generator for FHEVM Examples
 *
 * This tool automatically generates GitBook-compatible documentation from
 * JSDoc/TSDoc annotations in test files and smart contracts.
 *
 * Features:
 * - Extracts @chapter, @concept, @pattern, @antipattern tags
 * - Generates structured markdown documentation
 * - Creates navigation structure for GitBook
 * - Includes code examples and explanations
 *
 * @usage
 * ts-node automation/generate-docs.ts
 */

interface DocSection {
  title: string;
  chapter: string;
  content: string;
  codeExamples: string[];
  concepts: string[];
  patterns: string[];
  antipatterns: string[];
}

interface DocumentationStructure {
  title: string;
  description: string;
  sections: DocSection[];
  chapters: Map<string, DocSection[]>;
}

/**
 * Parse test file and extract documentation annotations
 */
function parseTestFile(filePath: string): DocSection[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const sections: DocSection[] = [];

  // Regular expressions for extracting documentation
  const describeBlockRegex = /\/\*\*([\s\S]*?)\*\/[\s\n]*describe\((.*?),\s*function/g;
  const testBlockRegex = /\/\*\*([\s\S]*?)\*\/[\s\n]*it\((.*?),\s*async\s*function/g;

  // Extract describe blocks (main sections)
  let match;
  while ((match = describeBlockRegex.exec(content)) !== null) {
    const [, docComment, describeTitle] = match;
    const section = parseDocComment(docComment, describeTitle);
    if (section) {
      sections.push(section);
    }
  }

  // Extract individual test cases
  while ((match = testBlockRegex.exec(content)) !== null) {
    const [, docComment, testTitle] = match;
    const section = parseDocComment(docComment, testTitle);
    if (section) {
      sections.push(section);
    }
  }

  return sections;
}

/**
 * Parse JSDoc comment and extract structured information
 */
function parseDocComment(comment: string, title: string): DocSection | null {
  const lines = comment.split("\n").map((line) => line.trim());

  const section: DocSection = {
    title: cleanTitle(title),
    chapter: "",
    content: "",
    codeExamples: [],
    concepts: [],
    patterns: [],
    antipatterns: [],
  };

  let currentContent = "";

  for (const line of lines) {
    if (line.startsWith("* @chapter")) {
      section.chapter = line.replace("* @chapter", "").trim();
    } else if (line.startsWith("* @concept")) {
      const concept = line.replace("* @concept", "").trim();
      section.concepts.push(concept);
    } else if (line.startsWith("* @pattern")) {
      const pattern = line.replace("* @pattern", "").trim();
      section.patterns.push(pattern);
    } else if (line.startsWith("* @antipattern")) {
      const antipattern = line.replace("* @antipattern", "").trim();
      section.antipatterns.push(antipattern);
    } else if (line.startsWith("* @description")) {
      currentContent += line.replace("* @description", "").trim() + "\n";
    } else if (line.startsWith("*") && !line.startsWith("/**") && !line.startsWith("*/")) {
      const textLine = line.replace(/^\*\s?/, "");
      if (textLine && !textLine.startsWith("@")) {
        currentContent += textLine + "\n";
      }
    }
  }

  section.content = currentContent.trim();

  return section.title ? section : null;
}

/**
 * Clean title by removing quotes and extra characters
 */
function cleanTitle(title: string): string {
  return title.replace(/["']/g, "").trim();
}

/**
 * Generate markdown documentation from sections
 */
function generateMarkdown(docs: DocumentationStructure): string {
  let markdown = `# ${docs.title}\n\n`;
  markdown += `${docs.description}\n\n`;

  markdown += `## Table of Contents\n\n`;

  // Generate table of contents by chapter
  const chapters = Array.from(docs.chapters.keys());
  chapters.forEach((chapter) => {
    markdown += `- [${formatChapterTitle(chapter)}](#${slugify(chapter)})\n`;
  });

  markdown += `\n---\n\n`;

  // Generate content by chapter
  chapters.forEach((chapter) => {
    markdown += `## ${formatChapterTitle(chapter)}\n\n`;

    const sections = docs.chapters.get(chapter) || [];
    sections.forEach((section) => {
      markdown += `### ${section.title}\n\n`;

      if (section.content) {
        markdown += `${section.content}\n\n`;
      }

      if (section.concepts.length > 0) {
        markdown += `#### Key Concepts\n\n`;
        section.concepts.forEach((concept) => {
          markdown += `- **${concept}**\n`;
        });
        markdown += `\n`;
      }

      if (section.patterns.length > 0) {
        markdown += `#### Recommended Patterns\n\n`;
        section.patterns.forEach((pattern) => {
          markdown += `✅ **${pattern}**\n\n`;
        });
      }

      if (section.antipatterns.length > 0) {
        markdown += `#### Common Mistakes (Antipatterns)\n\n`;
        section.antipatterns.forEach((antipattern) => {
          markdown += `❌ **${antipattern}**\n\n`;
        });
      }

      markdown += `---\n\n`;
    });
  });

  return markdown;
}

/**
 * Format chapter title for display
 */
function formatChapterTitle(chapter: string): string {
  return chapter
    .split(",")[0]
    .trim()
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Convert text to URL-friendly slug
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

/**
 * Organize sections by chapter
 */
function organizeSectionsByChapter(sections: DocSection[]): Map<string, DocSection[]> {
  const chapters = new Map<string, DocSection[]>();

  sections.forEach((section) => {
    const chapterKey = section.chapter || "general";

    if (!chapters.has(chapterKey)) {
      chapters.set(chapterKey, []);
    }

    chapters.get(chapterKey)!.push(section);
  });

  return chapters;
}

/**
 * Generate GitBook SUMMARY.md
 */
function generateSummary(docs: DocumentationStructure): string {
  let summary = `# Summary\n\n`;
  summary += `* [Introduction](README.md)\n\n`;

  const chapters = Array.from(docs.chapters.keys());
  chapters.forEach((chapter) => {
    const chapterTitle = formatChapterTitle(chapter);
    const fileName = `${slugify(chapter)}.md`;

    summary += `* [${chapterTitle}](${fileName})\n`;

    const sections = docs.chapters.get(chapter) || [];
    sections.forEach((section) => {
      summary += `  * [${section.title}](${fileName}#${slugify(section.title)})\n`;
    });
  });

  return summary;
}

/**
 * Generate comprehensive README
 */
function generateReadme(projectName: string, description: string): string {
  return `# ${projectName} Documentation

${description}

## Overview

This documentation is automatically generated from code annotations in the test suite.
It provides comprehensive examples and explanations of FHEVM concepts.

## Structure

The documentation is organized by the following chapters:

- **Access Control**: Managing permissions for encrypted data
- **Encryption**: Converting plaintext to encrypted values
- **Public Decryption**: Revealing encrypted data through oracles
- **Time Restrictions**: Implementing time-based logic
- **Best Practices**: Recommended patterns and antipatterns

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- MetaMask or compatible Web3 wallet

### Installation

\`\`\`bash
npm install
\`\`\`

### Compile

\`\`\`bash
npm run compile
\`\`\`

### Test

\`\`\`bash
npm test
\`\`\`

### Deploy

\`\`\`bash
npm run deploy:local
\`\`\`

## Resources

- [FHEVM Documentation](https://docs.zama.ai/fhevm)
- [Zama GitHub](https://github.com/zama-ai)
- [Hardhat Documentation](https://hardhat.org)

## Contributing

Contributions are welcome! Please ensure:

1. All tests pass: \`npm test\`
2. Code is properly documented with JSDoc annotations
3. Documentation is regenerated: \`npm run generate:docs\`

## License

MIT
`;
}

/**
 * Main execution function
 */
async function main() {
  console.log("╔════════════════════════════════════════╗");
  console.log("║  FHEVM Documentation Generator         ║");
  console.log("║  Automated from Code Annotations       ║");
  console.log("╚════════════════════════════════════════╝\n");

  const projectRoot = process.cwd();
  const testDir = path.join(projectRoot, "test");
  const docsDir = path.join(projectRoot, "docs");

  // Create docs directory if it doesn't exist
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
    console.log("📁 Created docs directory\n");
  }

  // Find all test files
  console.log("🔍 Scanning test files...\n");
  const testFiles = fs
    .readdirSync(testDir)
    .filter((file) => file.endsWith(".test.ts") || file.endsWith(".test.js"));

  if (testFiles.length === 0) {
    console.error("❌ No test files found in test directory");
    process.exit(1);
  }

  console.log(`   Found ${testFiles.length} test file(s):`);
  testFiles.forEach((file) => console.log(`   - ${file}`));
  console.log();

  // Parse all test files
  console.log("📖 Parsing documentation annotations...\n");
  const allSections: DocSection[] = [];

  testFiles.forEach((file) => {
    const filePath = path.join(testDir, file);
    const sections = parseTestFile(filePath);
    allSections.push(...sections);
    console.log(`   ✓ Parsed ${sections.length} sections from ${file}`);
  });

  console.log();

  // Organize sections by chapter
  const chapters = organizeSectionsByChapter(allSections);

  const documentation: DocumentationStructure = {
    title: "FHEVM Confidential Risk Assessment",
    description:
      "Privacy-preserving risk assessment system demonstrating key FHEVM patterns and best practices.",
    sections: allSections,
    chapters,
  };

  // Generate main documentation
  console.log("📝 Generating documentation...\n");
  const mainDoc = generateMarkdown(documentation);
  fs.writeFileSync(path.join(docsDir, "GUIDE.md"), mainDoc);
  console.log("   ✓ Generated GUIDE.md");

  // Generate GitBook summary
  const summary = generateSummary(documentation);
  fs.writeFileSync(path.join(docsDir, "SUMMARY.md"), summary);
  console.log("   ✓ Generated SUMMARY.md");

  // Generate README
  const readme = generateReadme(documentation.title, documentation.description);
  fs.writeFileSync(path.join(docsDir, "README.md"), readme);
  console.log("   ✓ Generated README.md");

  // Generate chapter-specific pages
  console.log("\n📚 Generating chapter pages...\n");
  chapters.forEach((sections, chapter) => {
    const chapterDoc = `# ${formatChapterTitle(chapter)}\n\n`;
    let content = chapterDoc;

    sections.forEach((section) => {
      content += `## ${section.title}\n\n`;
      content += section.content + "\n\n";

      if (section.patterns.length > 0) {
        content += `### Recommended Patterns\n\n`;
        section.patterns.forEach((pattern) => {
          content += `✅ ${pattern}\n\n`;
        });
      }

      if (section.antipatterns.length > 0) {
        content += `### Antipatterns to Avoid\n\n`;
        section.antipatterns.forEach((antipattern) => {
          content += `❌ ${antipattern}\n\n`;
        });
      }

      content += `---\n\n`;
    });

    const fileName = `${slugify(chapter)}.md`;
    fs.writeFileSync(path.join(docsDir, fileName), content);
    console.log(`   ✓ Generated ${fileName}`);
  });

  // Generate statistics
  console.log("\n📊 Documentation Statistics:\n");
  console.log(`   Total Sections: ${allSections.length}`);
  console.log(`   Total Chapters: ${chapters.size}`);
  console.log(`   Total Concepts: ${allSections.reduce((sum, s) => sum + s.concepts.length, 0)}`);
  console.log(`   Total Patterns: ${allSections.reduce((sum, s) => sum + s.patterns.length, 0)}`);
  console.log(
    `   Total Antipatterns: ${allSections.reduce((sum, s) => sum + s.antipatterns.length, 0)}`
  );

  console.log("\n✨ Documentation generated successfully!");
  console.log(`\n📂 Output location: ${docsDir}`);
  console.log("\n📖 View your documentation:");
  console.log(`   ${path.join(docsDir, "README.md")}`);
  console.log(`   ${path.join(docsDir, "GUIDE.md")}`);
  console.log("\n🎉 Done!\n");
}

// Execute the generator
main().catch((error) => {
  console.error("❌ Error generating documentation:", error);
  process.exit(1);
});
